const router = require('express').Router()
const {
  createOrder, getMyOrders, getOrder, cancelOrder,
  getAllOrders, updateOrderStatus,
} = require('../controllers/orderController')
const { protect, admin } = require('../middleware/auth')

router.use(protect)
router.post('/', createOrder)
router.get('/my', getMyOrders)
router.get('/:id', getOrder)
router.put('/:id/cancel', cancelOrder)
router.get('/', admin, getAllOrders)
router.put('/:id/status', admin, updateOrderStatus)

module.exports = router
