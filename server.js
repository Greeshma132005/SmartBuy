const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Create express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Import routes
const productRoutes = require("./routes/productRoutes");

// Use routes
app.use("/api/products", productRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("SmartBuy Backend Running");
});

// MongoDB connection + server start
mongoose
  .connect("mongodb://127.0.0.1:27017/smartbuy")
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => console.log(err));
