const Message = require('../models/Message')
const User = require('../models/User')
const mongoose = require('mongoose')

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id
    const messages = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] }, 1, 0] },
          },
        },
      },
    ])

    const populated = await Promise.all(
      messages.map(async (m) => {
        const other = await User.findById(m._id).select('name email avatar').lean()
        return { _id: m._id, participants: [req.user, other], lastMessage: m.lastMessage, unreadCount: m.unreadCount }
      })
    )
    res.json({ conversations: populated })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.json({ messages: [] })
    }
    const otherId = req.params.userId
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherId },
        { sender: otherId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .lean()
    res.json({ messages })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body
    if (!receiverId || !content?.trim()) return res.status(400).json({ message: 'receiverId and content required' })
    let actualReceiverId = receiverId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      const admin = await User.findOne({ role: 'admin' }).select('_id').lean()
      if (!admin) return res.status(404).json({ message: 'No admin found' })
      actualReceiverId = admin._id
    }
    const receiver = await User.findById(actualReceiverId)
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' })
    const message = await Message.create({ sender: req.user._id, receiver: actualReceiverId, content: content.trim() })
    await message.populate('sender', 'name avatar')
    res.status(201).json({ message })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.markAsRead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.json({ message: 'Skipped - invalid user ID' })
    }
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, read: false },
      { read: true }
    )
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getAdminMessages = async (req, res) => {
  try {
    const messages = await Message.find().populate('sender', 'name').populate('receiver', 'name').sort({ createdAt: -1 }).limit(100).lean()
    res.json({ messages })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
