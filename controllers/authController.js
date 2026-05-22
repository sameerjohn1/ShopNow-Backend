const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRE || '30d' })

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' })
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already registered' })
    const user = await User.create({ name, email, password })
    const token = signToken(user._id)
    res.status(201).json({ token, user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    const token = signToken(user._id)
    const userObj = user.toJSON()
    res.json({ token, user: userObj })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getMe = async (req, res) => {
  res.json({ user: req.user })
}

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body
    const user = await User.findByIdAndUpdate(req.user._id, { name, email, phone }, { new: true, runValidators: true })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }
    user.password = newPassword
    await user.save()
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.forgotPassword = async (req, res) => {
  res.json({ message: 'If that email exists, a reset link has been sent.' })
}

exports.getAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' }).select('_id name email avatar').lean()
    if (!admin) return res.status(404).json({ message: 'No admin found' })
    res.json({ admin })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
