const mongoose = require('mongoose')
const slugify = require('slugify')

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true })

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true },
  description: { type: String, required: true, maxlength: 5000 },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  discount: { type: Number, default: 0 },
  category: { type: String, required: true, lowercase: true, trim: true },
  images: [{ type: String }],
  stock: { type: Number, required: true, min: 0, default: 0 },
  tags: [{ type: String, lowercase: true }],
  featured: { type: Boolean, default: false },
  reviews: [reviewSchema],
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  specifications: { type: Map, of: String },
  sold: { type: Number, default: 0 },
}, { timestamps: true })

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true }) + '-' + Date.now()
  }
  if (this.originalPrice && this.price) {
    this.discount = Math.round((1 - this.price / this.originalPrice) * 100)
  }
  next()
})

productSchema.methods.updateRating = function () {
  if (this.reviews.length === 0) { this.averageRating = 0; this.numReviews = 0 }
  else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0)
    this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10
    this.numReviews = this.reviews.length
  }
}

productSchema.index({ name: 'text', description: 'text', tags: 'text' })
productSchema.index({ category: 1 })
productSchema.index({ price: 1 })
productSchema.index({ featured: 1 })

module.exports = mongoose.model('Product', productSchema)
