require("dotenv").config();
const express = require("express");
const path = require("path");
const hbs = require("hbs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const http = require("http");
const WebSocket = require("ws");
const usersRouter = require("./src/routes/userRouter");
const { dbConnect, dbConnectionURL } = require("./src/config/db");
const User = require("./src/models/users.model");
const Message = require("./src/models/message.model");

const PORT = process.env.PORT || 3000;

// create a db for websockets
const map = new Map();

const app = express();
dbConnect();

app.set("trust proxy", 1);
app.set("view engine", "hbs");
app.set("views", path.join(process.env.PWD, "src", "views"));
hbs.registerPartials(path.join(process.env.PWD, "src", "views", "partials"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.env.PWD, "public")));

const secretSession =
  "46b76110a6e9e3c9cf333f02ae8fa12e46e6dad262ef5901376d34feb7145f7323cd73dbc2161ab82e167e0b60104f98b512d277649c357a9b6bcaa70259e5c8";

// creating session
const sessionParser = session({
  name: "sid",
  secret: secretSession,
  resave: false,
  store: MongoStore.create({
    mongoUrl: dbConnectionURL,
  }),
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60e3,
  },
});
// А вот и первое место
app.use(sessionParser);

app.use(async (req, res, next) => {
  const userId = req.session.user.id;
  if (userId) {
    const currentUser = await User.findById(userId);
    if (currentUser) {
      res.locals.name = currentUser.name;
      res.locals.email = currentUser.email;
    }
  }

  next();
});

app.get("/", (req, res) => {
  res.render("index");
});

app.use("/users", usersRouter);
app.get("/chat", async (req, res) => {
  let allMessages = await Message.find().populate("user").lean();
  // We find our messages to show them to the right side of the chat
  allMessages = allMessages.map((message) => ({
    ...message,
    itself: req.session.user.id === message.user._id.toString(),
  }));
  res.render("chat", { allMessages });
});

// Different server creation than usual in order to be able to connect through web sockets and to let only auth users to use web sockets
const server = http.createServer(app);

//
// Create a WebSocket server completely detached from the HTTP server.
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

// Give permission to authenticated users to use connection
server.on("upgrade", (request, socket, head) => {
  console.log("Parsing session from request...");

  sessionParser(request, {}, () => {
    //if no user in the session then no connection
    if (!request.session.user.id) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    console.log("Session is parsed!");

    // if user is authorised, we initialise connection event
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
});

// Attaching a listener on socket connection
wss.on("connection", (ws, request) => {
  // taking user data from session
  const { id: userId, name } = request.session.user;

  // Saving connection into a web socket storage
  map.set(userId, ws);

  // Adding event listener on incoming message
  ws.on("message", (message) => {
    // My messages are coming in as Json strings so it needs to be parsed
    const parseIncomingMessage = JSON.parse(message);

    // Every message will come as an object with a type
    switch (parseIncomingMessage.type) {
      case "greeting":
        User.findById(userId).then((user) => {
          for (const [id, clientConnection] of map) {
            // checking for connections we saved in store
            if (clientConnection.readyState === WebSocket.OPEN) {
              // checking if connection is on
              const messageToUsers = {
                type: parseIncomingMessage.type,
                payload: {
                  userName: user.name,
                },
              };
              clientConnection.send(JSON.stringify(messageToUsers));
            }
          }
        });
        break;

      case "newMessage":
        Message.create({
          text: parseIncomingMessage.payload.message,
          user: userId,
        }).then((message) => {
          for (const [id, clientConnection] of map) {
            if (clientConnection.readyState === WebSocket.OPEN) {
              const messageToUsers = {
                type: parseIncomingMessage.type,
                payload: {
                  userName: name,
                  message: message.text,
                },
              };
              if (
                clientConnection === ws &&
                clientConnection.readyState === WebSocket.OPEN
              ) {
                messageToUsers.payload.itself = true;
              }
              clientConnection.send(JSON.stringify(messageToUsers));
            }
          }
        });

      default:
        break;
    }

    console.log(`Received message ${message} from user ${userId}`);
  });

  // Event listener on closing connection
  ws.on("close", () => {
    map.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log("Server started on port ", PORT);
});
