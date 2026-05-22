const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");

async function seed() {
  try {
    const adminExists = await User.findOne({ email: "admin@shop.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@shop.com",
        password: "admin123",
        role: "admin",
      });
      await User.create({
        name: "Demo User",
        email: "user@shop.com",
        password: "user123",
        role: "user",
      });
      console.log("✅ Demo users seeded (admin@shop.com / admin123)");
    }

    await Product.deleteMany({});
    const products = [
      {
        name: "iPhone 15 Pro",
        description:
          "Latest Apple smartphone with A17 Pro chip, titanium design, and pro camera system.",
        price: 999,
        originalPrice: 1099,
        category: "electronics",
        stock: 25,
        featured: true,
        tags: ["apple", "smartphone", "5g"],
        images: [
          "https://images.unsplash.com/photo-1695048133142-1c1f2c1e1f2c?w=600",
        ],
      },
      {
        name: 'Samsung 4K Smart TV 55"',
        description:
          "Crystal clear 4K resolution with smart features and HDR support.",
        price: 649,
        originalPrice: 799,
        category: "electronics",
        stock: 15,
        featured: true,
        tags: ["samsung", "tv", "4k"],
        images: [
          "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600",
        ],
      },
      {
        name: "Nike Air Max 270",
        description:
          "Iconic sneakers with Max Air unit for all-day comfort and bold style.",
        price: 129,
        originalPrice: 149,
        category: "shoes",
        stock: 40,
        featured: true,
        tags: ["nike", "sneakers", "sports"],
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        ],
      },
      {
        name: "Levi's 501 Original Jeans",
        description:
          "Classic straight fit jeans, the original blue jean since 1873.",
        price: 69,
        category: "clothing",
        stock: 60,
        featured: true,
        tags: ["levis", "denim", "classic"],
        images: [
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600",
        ],
      },
      {
        name: "MacBook Air M2",
        description:
          "Supercharged by M2 chip. Up to 18 hours battery life. Lightweight design.",
        price: 1099,
        originalPrice: 1299,
        category: "electronics",
        stock: 10,
        featured: true,
        tags: ["apple", "laptop", "m2"],
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
        ],
      },
      {
        name: "Sony WH-1000XM5 Headphones",
        description: "Industry-leading noise canceling wireless headphones.",
        price: 349,
        originalPrice: 399,
        category: "electronics",
        stock: 30,
        featured: true,
        tags: ["sony", "headphones", "wireless"],
        images: [
          "https://images.unsplash.com/photo-1518441902117-f0a8c7c3f2a6?w=600",
        ],
      },
      {
        name: "Adidas Ultraboost 23",
        description: "Premium running shoes with responsive Boost cushioning.",
        price: 179,
        originalPrice: 199,
        category: "shoes",
        stock: 35,
        tags: ["adidas", "running", "boost"],
        images: [
          "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?w=600",
        ],
      },
      {
        name: "The Psychology of Money",
        description:
          "Timeless lessons on wealth, greed, and happiness by Morgan Housel.",
        price: 18,
        category: "books",
        stock: 100,
        tags: ["finance", "psychology", "bestseller"],
        images: [
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600",
        ],
      },
      {
        name: "Yoga Mat Premium",
        description: "Extra thick non-slip yoga mat with alignment lines.",
        price: 45,
        originalPrice: 55,
        category: "sports",
        stock: 50,
        tags: ["yoga", "fitness", "gym"],
        images: [
          "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600",
        ],
      },
      {
        name: "Coffee Maker Deluxe",
        description:
          "Brew perfect coffee every time with programmable settings.",
        price: 89,
        originalPrice: 109,
        category: "home",
        stock: 20,
        tags: ["coffee", "kitchen", "appliance"],
        images: [
          "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600",
        ],
      },
      {
        name: "Winter Parka Jacket",
        description: "Waterproof insulated jacket for extreme cold weather.",
        price: 199,
        originalPrice: 249,
        category: "clothing",
        stock: 25,
        tags: ["winter", "jacket", "outdoor"],
        images: [
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600",
        ],
      },
      {
        name: "Gaming Chair Pro",
        description: "Ergonomic gaming chair with lumbar support and armrests.",
        price: 299,
        originalPrice: 349,
        category: "furniture",
        stock: 12,
        tags: ["gaming", "chair", "ergonomic"],
        images: [
          "https://images.unsplash.com/photo-1582582429416-efcf4f3a6b3d?w=600",
        ],
      },
    ];
    for (const p of products) await Product.create(p);
    console.log(`✅ ${products.length} sample products seeded`);
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

module.exports = seed;

if (require.main === module) {
  require("dotenv").config({
    path: require("path").join(__dirname, "..", ".env"),
  });
  mongoose
    .connect(process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce")
    .then(async () => {
      console.log("✅ MongoDB connected for seeding");
      await seed();
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      process.exit(1);
    });
}
