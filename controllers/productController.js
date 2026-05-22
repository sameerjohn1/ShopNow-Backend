const Product = require('../models/Product')

exports.getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, minRating, sort, page = 1, limit = 12, featured } = req.query
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ]
    }
    if (category) query.category = category.toLowerCase()
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }
    if (minRating) query.averageRating = { $gte: Number(minRating) }
    if (featured === 'true') query.featured = true

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { averageRating: -1 },
      newest: { createdAt: -1 },
      popular: { sold: -1 },
    }
    const sortOption = sortMap[sort] || { createdAt: -1 }

    const skip = (Number(page) - 1) * Number(limit)
    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query),
    ])

    res.json({
      products,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      hasMore: skip + products.length < total,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getFeatured = async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).sort({ createdAt: -1 }).limit(12).lean()
    res.json({ products })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category')
    res.json({ categories: categories.sort() })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name avatar')
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, stock, tags, featured } = req.body
    const images = req.files?.map(f => `/uploads/${f.filename}`) || req.body.images || []
    const product = await Product.create({
      name, description, price: Number(price), originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category, stock: Number(stock),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      featured: featured === 'true' || featured === true,
      images,
    })
    res.status(201).json({ product })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, stock, tags, featured } = req.body
    const images = req.files?.length ? req.files.map(f => `/uploads/${f.filename}`) : undefined
    const update = {
      name, description,
      price: price ? Number(price) : undefined,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category,
      stock: stock !== undefined ? Number(stock) : undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      featured: featured === 'true' || featured === true,
    }
    if (images) update.images = images
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k])

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body
    if (!rating || !comment) return res.status(400).json({ message: 'Rating and comment required' })
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString())
    if (alreadyReviewed) {
      alreadyReviewed.rating = Number(rating)
      alreadyReviewed.comment = comment
    } else {
      product.reviews.push({ user: req.user._id, rating: Number(rating), comment })
    }
    product.updateRating()
    await product.save()
    res.json({ message: 'Review submitted', averageRating: product.averageRating, numReviews: product.numReviews })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name avatar')
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ reviews: product.reviews })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
