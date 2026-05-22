const router = require('express').Router()
const { protect, admin } = require('../middleware/auth')
const User = require('../models/User')
const Order = require('../models/Order')
const Product = require('../models/Product')

router.use(protect, admin)

router.get('/stats', async (req, res) => {
  try {
    const [orders, products, users, revenueData] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ])
    const revenue = revenueData[0]?.total || 0
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .lean()
    res.json({ stats: { orders, products, users, revenue }, recentOrders })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/users', async (req, res) => {
  try {
    const { search } = req.query
    const query = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] } : {}
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean()
    const usersWithCounts = await Promise.all(users.map(async u => ({
      ...u,
      orderCount: await Order.countDocuments({ user: u._id }),
    })))
    res.json({ users: usersWithCounts, total: usersWithCounts.length })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password')
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
