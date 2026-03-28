# SmartBuy

**E-commerce Price Comparison, Tracking & Prediction Platform**

Compare prices across Amazon, Flipkart, and Croma. Track price history, get ML-powered drop predictions, and discover coupons — all in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts |
| Backend | Python 3.11+, FastAPI, Poetry |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| Scraping | httpx, BeautifulSoup4, selectolax |
| ML | Pandas, NumPy, Scikit-learn (Random Forest) |
| Scheduling | APScheduler |

---

## Project Structure

```
SmartBuy/
├── smartbuy-backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Settings & env vars
│   │   ├── database.py         # Supabase client
│   │   ├── auth/               # JWT verification & auth routes
│   │   ├── scrapers/           # Platform scrapers (Amazon, Flipkart, Croma)
│   │   ├── ml/                 # Price prediction & trend analysis
│   │   ├── routes/             # API endpoints
│   │   ├── models/             # Pydantic schemas
│   │   ├── services/           # Business logic & DB operations
│   │   └── scheduler.py        # Periodic scraping jobs
│   ├── seed_data.py            # Sample data seeder
│   ├── schema.sql              # Database schema
│   └── pyproject.toml          # Poetry dependencies
├── smartbuy-frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/                # Pages (Home, Product, Dashboard, Auth)
│   │   ├── components/         # UI & feature components
│   │   ├── hooks/              # useAuth, useProducts
│   │   ├── lib/                # Supabase clients, API wrapper, utils
│   │   └── types/              # TypeScript types
│   └── package.json
└── .env.example
```

---

## Setup

### Prerequisites

- Python 3.11+ with Poetry
- Node.js 18+
- Supabase account (free tier works)

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `smartbuy-backend/schema.sql`
3. Enable Google OAuth in Authentication > Providers (optional)
4. Copy your project URL and keys from Settings > API

### 2. Environment Variables

```bash
# Root level
cp .env.example .env

# Backend
cp smartbuy-backend/.env.example smartbuy-backend/.env

# Frontend
cp smartbuy-frontend/.env.example smartbuy-frontend/.env.local
```

Fill in your Supabase credentials in each `.env` file.

### 3. Backend

```bash
cd smartbuy-backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd smartbuy-frontend
npm install
npm run dev
```

### 5. Seed Data (optional)

```bash
cd smartbuy-backend
poetry run python seed_data.py
```

To reset and re-seed:
```bash
poetry run python seed_data.py --reset
```

---

## Features

- **Multi-platform search** — Search products across Amazon, Flipkart, and Croma simultaneously
- **Price comparison** — Side-by-side comparison table with lowest price highlighted
- **Price history** — Interactive charts showing price trends over time
- **Price prediction** — ML-powered predictions for future price drops using Random Forest
- **Coupon aggregation** — Discover and copy coupon codes matched to your products
- **Price alerts** — Set target prices and get notified when prices drop
- **User dashboard** — Track alerts, view history, and manage preferences
- **Auth** — Email/password and Google OAuth via Supabase

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/search?q=` | Search & scrape products |
| GET | `/api/products/{id}` | Product details |
| GET | `/api/products/{id}/prices` | Price history |
| GET | `/api/products/{id}/prices/predict` | Price predictions |
| GET | `/api/products/{id}/coupons` | Product coupons |
| GET | `/api/coupons` | All coupons |
| POST | `/api/alerts` | Create price alert |
| GET | `/api/alerts` | List user alerts |
| DELETE | `/api/alerts/{id}` | Delete alert |
| GET | `/api/alerts/dashboard/summary` | Dashboard stats |
| GET | `/api/alerts/dashboard/history` | Search history |

---

## Currency

All prices are in **INR (₹)**, targeting Indian e-commerce platforms.
