const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------- TRUST PROXY (Vercel fix) ---------------- */
app.set("trust proxy", 1);

/* ---------------- SECURITY MIDDLEWARE ---------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

/* ---------------- CORS ---------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "https://shop-now-client.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

/* ---------------- BODY PARSER ---------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ---------------- LOGGER ---------------- */
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/* ---------------- RATE LIMIT ---------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
});

app.use(limiter);

/* ---------------- STATIC FILES ---------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    time: new Date(),
  });
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* ---------------- 404 ---------------- */
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* ---------------- DB ---------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    await require("./config/seed")();

    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

module.exports = app;
