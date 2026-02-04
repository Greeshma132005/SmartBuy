const express = require("express");
const router = express.Router();
const axios = require("axios");

// New /analyze route that calls Python API
router.post("/analyze", async (req, res) => {
  const { productLink } = req.body;

  if (!productLink) {
    return res.status(400).json({ error: "Product link is required" });
  }

  try {
    // Call Python Flask API
    const response = await axios.post("http://localhost:8000/scrape", {
      url: productLink
    });

    // Send Python response back to frontend
    res.json({
      message: "Product link analyzed",
      data: response.data
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch price from Python API" });
  }
});

module.exports = router;
