const Order = require('../models/Order')
const Product = require('../models/Product')

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, subtotal, shippingCost, tax, totalAmount } = req.body
    if (!items?.length) return res.status(400).json({ message: 'Order items required' })

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) return res.status(404).json({ message: `Product ${item.product} not found` })
      if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` })
      product.stock -= item.quantity
      product.sold = (product.sold || 0) + item.quantity
      await product.save()
    }

    const order = await Order.create({
      user: req.user._id, items, shippingAddress, paymentMethod,
      subtotal, shippingCost, tax, totalAmount,
    })
    await order.populate('items.product', 'name images price')
    res.status(201).json({ order })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images price')
      .lean()
    res.json({ orders })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name images price')
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }
    res.json({ order })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' })
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order at this stage' })
    }
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, sold: -item.quantity } })
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ order })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 15, status } = req.query
    const query = status ? { status } : {}
    const skip = (Number(page) - 1) * Number(limit)
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('user', 'name email').populate('items.product', 'name images').lean(),
      Order.countDocuments(query),
    ])
    res.json({ orders, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('user', 'name email')
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ order })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
