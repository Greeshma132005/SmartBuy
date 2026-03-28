from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import products, prices, coupons, alerts
from app.auth.routes import router as auth_router
from app.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()


app = FastAPI(
    title="SmartBuy API",
    description="E-commerce price comparison, tracking & prediction",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(prices.router, prefix="/api/products", tags=["Prices"])
app.include_router(coupons.router, prefix="/api/coupons", tags=["Coupons"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/")
async def root():
    return {"message": "SmartBuy Backend Running", "version": "0.1.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
