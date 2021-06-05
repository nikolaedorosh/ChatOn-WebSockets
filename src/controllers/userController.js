const bcrypt = require('bcrypt')
const User = require('../models/users.model')

const saltRound = 10

const userSigninRender = (req, res) => res.render('signin')

const userSignupRender = (req, res) => res.render('signup')

const userSignup = async (req, res) => {
  const { email, pass: plainPass, name } = req.body
  if (email && plainPass && name) {
    const pass = await bcrypt.hash(plainPass, saltRound)
    const newUser = await User.create({
      email,
      pass,
      name,
    })

    req.session.user = {
      id: newUser._id,
      name: newUser.name,
    }

    return res.redirect('/')
  }
  return res.status(418).redirect('/user/signup')
}

const userSignin = async (req, res) => {
  const { email, pass } = req.body
  console.log(req.body)
  if (email && pass) {
    const currentUser = await User.findOne({ email })
    console.log({ currentUser })
    if (currentUser && (await bcrypt.compare(pass, currentUser.pass))) {
      req.session.user = {
        id: currentUser._id,
        name: currentUser.name,
      }

      return res.redirect('/')
    }
    return res.status(418).redirect('/user/signin')
  }
  return res.status(418).redirect('/user/signin')
}

const userSignout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.redirect('/')

    res.clearCookie(req.app.get('cookieName'))
    return res.redirect('/')
  })
}

module.exports = {
  userSigninRender,
  userSignup,
  userSignupRender,
  userSignin,
  userSignout,
}
