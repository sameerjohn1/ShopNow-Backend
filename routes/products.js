const router = require('express').Router()
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  addReview, getReviews, getFeatured, getCategories,
} = require('../controllers/productController')
const { protect, admin, optionalAuth } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.get('/', getProducts)
router.get('/featured', getFeatured)
router.get('/categories', getCategories)
router.get('/:id', getProduct)
router.post('/', protect, admin, upload.array('images', 5), createProduct)
router.put('/:id', protect, admin, upload.array('images', 5), updateProduct)
router.delete('/:id', protect, admin, deleteProduct)
router.post('/:id/reviews', protect, addReview)
router.get('/:id/reviews', getReviews)

module.exports = router
