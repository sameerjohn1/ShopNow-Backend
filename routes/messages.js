const router = require('express').Router()
const {
  getConversations, getMessages, sendMessage, markAsRead, getAdminMessages,
} = require('../controllers/messageController')
const { protect, admin } = require('../middleware/auth')

router.use(protect)
router.get('/conversations', getConversations)
router.get('/admin/all', admin, getAdminMessages)
router.get('/:userId', getMessages)
router.post('/', sendMessage)
router.put('/:userId/read', markAsRead)

module.exports = router
