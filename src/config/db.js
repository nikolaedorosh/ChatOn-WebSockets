const mongoose = require('mongoose')

const options = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
  autoIndex: true,
  poolSize: 10,
  bufferMaxEntries: 0,
}

const {
  NODE_ENV,
  mongoLocal,
  mongoAtlas,
} = process.env

const dbConnectionURL = NODE_ENV === 'production' ? mongoAtlas : mongoLocal

function dbConnect() {
  mongoose.connect(dbConnectionURL, options, (err) => {
    if (err) return console.log(err)
    return console.log('Success connected to mogno')
  })
}

module.exports = {
  dbConnect,
  dbConnectionURL,
}
