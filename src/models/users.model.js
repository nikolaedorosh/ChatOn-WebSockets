const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 3,
  },
  email: {
    type: String,
    required: true,
    min: 5,
    unique: true,
  },
  pass: {
    type: String,
    required: true,
    min: 8,
  },
})

const User = mongoose.model('User', userSchema)

module.exports = User
