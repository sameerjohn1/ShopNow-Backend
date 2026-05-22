const Order = require("../models/Order");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
    } = req.body;

    if (!items?.length) {
      return res.status(400).json({ message: "Order items required" });
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.product} not found` });
      }
      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }
      product.stock -= item.quantity;
      product.sold = (product.sold || 0) + item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
    });

    await order.populate("items.product", "name images price");
    res.status(201).json({ order });
  } catch (err) {
    console.error("❌ createOrder error:", err.message);
    res.status(400).json({ message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "name images price")
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    res.json({ orders });
  } catch (err) {
    console.error("❌ getMyOrders error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Order ID required" });
    }

    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product", "name images price")
      .maxTimeMS(5000); // 5 second timeout

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ order });
  } catch (err) {
    console.error("❌ getOrder error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id).maxTimeMS(5000);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!["pending", "processing"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel order at this stage" });
    }

    // ✅ Stock restore + sold fix
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.sold = Math.max(0, (product.sold || 0) - item.quantity);
        await product.save();
      }
    }

    order.status = "cancelled";
    await order.save();
    await order.populate("items.product", "name images price"); // ✅
    res.json({ order });
  } catch (err) {
    console.error("❌ cancelOrder error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 15, status } = req.query;

    // Validate inputs
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = status ? { status } : {};

    console.log(
      `📋 Fetching orders: page=${pageNum}, limit=${limitNum}, status=${status || "all"}`,
    );

    // Use timeout to prevent Vercel serverless timeout
    const [orders, total] = await Promise.race([
      Promise.all([
        Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("user", "name email")
          .populate("items.product", "name images")
          .lean(),
        Order.countDocuments(query),
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 10000),
      ),
    ]);

    res.json({
      orders,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("❌ getAllOrders error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status required" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "Order ID required" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("user", "name email")
      .maxTimeMS(5000);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order });
  } catch (err) {
    console.error("❌ updateOrderStatus error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
