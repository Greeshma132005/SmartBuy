// src/pages/Dashboard.js

import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaClipboardList,
  FaCopy,
  FaFire,
  FaPlus,
  FaSignOutAlt,
  FaTags,
  FaUserCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import "./Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const navigate = useNavigate();

  const [productLink, setProductLink] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setProducts([
        {
          id: 1,
          name: "iPhone 15 (128GB) Black",
          image: "https://images.unsplash.com/photo-1695638297240-2ea1126e2bd9?w=400",
          currentPrice: 74999,
          history: [
            { date: "2025-01-01", price: 89900 },
            { date: "2025-01-10", price: 84900 },
            { date: "2025-01-20", price: 79900 },
            { date: "2025-02-01", price: 76900 },
            { date: "2025-02-10", price: 74999 },
          ],
          prediction: { dropDate: "12–18 Mar", expectedPrice: 71500 },
          offers: [
            { site: "Amazon", price: 74999, total: 74999, best: true },
            { site: "Flipkart", price: 76499, total: 76499 },
            { site: "Croma", price: 77990, total: 78089 },
          ],
          coupons: [
            { code: "GET5", discount: "₹5000 off", active: true },
            { code: "BANK2000", discount: "₹2000 off (HDFC)", active: true },
          ],
        },
        {
          id: 2,
          name: "Sony WH-1000XM5",
          image: "https://images.unsplash.com/photo-1613040809024-b4ef374e73c2?w=400",
          currentPrice: 24990,
          history: [
            { date: "2025-01-01", price: 29990 },
            { date: "2025-02-01", price: 25990 },
            { date: "2025-02-10", price: 24990 },
          ],
          prediction: { dropDate: "20–25 Feb", expectedPrice: 22990 },
          offers: [
            { site: "Amazon", price: 24990, total: 24990, best: true },
            { site: "Flipkart", price: 25490, total: 25490 },
          ],
          coupons: [
            { code: "HEAD500", discount: "₹500 off", active: true },
          ],
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!productLink.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      const newItem = {
        id: products.length + 1,
        name: "New Product",
        image: "https://images.unsplash.com/photo-1523275335684-04cd461bb51e?w=400",
        currentPrice: 39999,
        history: [{ date: new Date().toISOString().split("T")[0], price: 39999 }],
        prediction: { dropDate: "Soon", expectedPrice: 36999 },
        offers: [
          { site: "Amazon", price: 39999, total: 39999, best: true },
          { site: "Flipkart", price: 40999, total: 40999 },
        ],
        coupons: [{ code: "NEW10", discount: "10% off", active: true }],
      };
      setProducts([...products, newItem]);
      setProductLink("");
      setIsLoading(false);
    }, 1200);
  };

  const copyCoupon = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied: ${code}`);
  };

  const chartData = (history) => ({
    labels: history.map((h) => h.date),
    datasets: [
      {
        label: "Price (₹)",
        data: history.map((h) => h.price),
        borderColor: "#667eea",
        backgroundColor: "rgba(102,126,234,0.18)",
        tension: 0.35,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  // Dummy featured deals (Amazon/Flipkart style)
  const featuredDeals = [
    {
      name: "Samsung Galaxy S24",
      price: 64999,
      original: 79999,
      discount: "19% off",
      image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
    },
    {
      name: "Noise ColorFit Pro 5",
      price: 2499,
      original: 4999,
      discount: "50% off",
      image: "https://images.unsplash.com/photo-1617049043598-d1d4b0a9e8f0?w=400",
    },
    {
      name: "boAt Airdopes 161",
      price: 1299,
      original: 2999,
      discount: "57% off",
      image: "https://images.unsplash.com/photo-1605640840605-14ac0ac9929f?w=400",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="bubble bubble-1"></div>
      <div className="bubble bubble-2"></div>
      <div className="bubble bubble-3"></div>

      <nav className="dashboard-nav">
        <div className="nav-left">
          <button className="back-btn" onClick={() => navigate("/")}>
            <FaArrowLeft />
          </button>
          <div className="logo">
            <span className="logo-icon">🛒</span>
            <h1>Smart<span className="logo-highlight">Buy</span></h1>
          </div>
        </div>
        <div className="nav-right">
          <button className="nav-icon-btn"><FaUserCircle /></button>
          <button className="nav-icon-btn" onClick={() => navigate("/login")}>
            <FaSignOutAlt />
          </button>
        </div>
      </nav>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="add-product-box">
            <h3>Add Product</h3>
            <form onSubmit={handleAddLink}>
              <input
                type="url"
                placeholder="Amazon / Flipkart / Meesho link"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                required
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? <span className="spinner small"></span> : <FaPlus />} Add
              </button>
            </form>
          </div>

          <h3>Your Wishlist</h3>
          <div className="wishlist-grid">
            {products.length === 0 ? (
              <p className="empty-message">No products yet. Add your first one!</p>
            ) : (
              products.map((prod) => (
                <div
                  key={prod.id}
                  className={`wishlist-card ${selectedProduct?.id === prod.id ? "selected" : ""}`}
                  onClick={() => setSelectedProduct(prod)}
                >
                  <img src={prod.image} alt={prod.name} className="card-img" />
                  <div className="card-info">
                    <h4>{prod.name}</h4>
                    <p className="price">₹{prod.currentPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : selectedProduct ? (
            // Detailed view when product is selected
            <div className="detail-view">
              <div className="product-header">
                <img src={selectedProduct.image} alt={selectedProduct.name} />
                <div>
                  <h2>{selectedProduct.name}</h2>
                  <p className="current-price">₹{selectedProduct.currentPrice.toLocaleString()}</p>
                </div>
              </div>

              <div className="chart-box">
                <h3>Price History</h3>
                <div className="chart-wrapper">
                  <Line data={chartData(selectedProduct.history)} options={chartOptions} />
                </div>
              </div>

              <div className="prediction-box">
                <h3>Price Prediction</h3>
                <p>Expected drop: <strong>{selectedProduct.prediction.dropDate}</strong></p>
                <p>Predicted price: <strong>₹{selectedProduct.prediction.expectedPrice.toLocaleString()}</strong></p>
              </div>

              <div className="coupons-box">
                <h3>Available Coupons</h3>
                <div className="coupons-list">
                  {selectedProduct.coupons.map((c, i) => (
                    <div key={i} className="coupon-item">
                      <div>
                        <strong>{c.code}</strong>
                        <span> – {c.discount}</span>
                      </div>
                      <button onClick={() => copyCoupon(c.code)}>
                        <FaCopy /> Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Default view when no product selected
            <div className="welcome-view">
              <div className="featured-deals">
                <h2><FaFire /> Hot Deals Today</h2>
                <div className="deals-grid">
                  {featuredDeals.map((deal, i) => (
                    <div key={i} className="deal-card">
                      <img src={deal.image} alt={deal.name} />
                      <div className="deal-info">
                        <h4>{deal.name}</h4>
                        <p className="deal-price">
                          <span className="current">₹{deal.price.toLocaleString()}</span>
                          <span className="original">₹{deal.original.toLocaleString()}</span>
                        </p>
                        <span className="discount">{deal.discount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="popular-coupons">
                <h2><FaTags /> Popular Coupons</h2>
                <div className="coupons-grid">
                  <div className="coupon-card">
                    <strong>GET5</strong>
                    <p>₹5000 off on iPhone & more</p>
                    <small>Amazon</small>
                    <button onClick={() => copyCoupon("GET5")}>Copy</button>
                  </div>
                  <div className="coupon-card">
                    <strong>BANK2000</strong>
                    <p>₹2000 off with HDFC/ICICI</p>
                    <small>Amazon + Flipkart</small>
                    <button onClick={() => copyCoupon("BANK2000")}>Copy</button>
                  </div>
                  <div className="coupon-card">
                    <strong>NEW10</strong>
                    <p>10% off on first order</p>
                    <small>All platforms</small>
                    <button onClick={() => copyCoupon("NEW10")}>Copy</button>
                  </div>
                </div>
              </div>

              <div className="placeholder-message">
                <FaClipboardList />
                <p>Select a product from your wishlist to see detailed price history, predictions and coupons</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;