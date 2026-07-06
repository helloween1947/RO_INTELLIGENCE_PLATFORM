from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.base import Base
from app.database.db import engine

# Import ALL models so SQLAlchemy registers their tables
from app.models.company import Company
from app.models.site import Site
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm

# Import all routers
from app.api.company import router as company_router
from app.api.site import router as site_router_legacy
from app.api.device import router as device_router_legacy
from app.api.sensor_reading import router as sensor_reading_router
from app.api.dashboard import router as dashboard_router
from app.api.alarms import router as alarms_router
from app.api.analytics import router as analytics_router
from app.api.devices import router as devices_router
from app.api.sites import router as sites_router
from app.api.seed import router as seed_router
from app.api.upload import router as upload_router
from app.api.sales_performance import router as sales_performance_router
from app.api.vendor_performance import router as vendor_performance_router
from app.api.iot_comparison import router as iot_comparison_router

# Create all tables (safe — won't drop existing data)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BPCL RO Network Performance Intelligence Platform",
    description="BPCL RO Network — Sales Area | Vendor | IoT Analytics",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(company_router)
app.include_router(site_router_legacy)
app.include_router(device_router_legacy)
app.include_router(sensor_reading_router)
app.include_router(dashboard_router)

# New industrial IoT routers
app.include_router(alarms_router)
app.include_router(analytics_router)
app.include_router(devices_router)
app.include_router(sites_router)
app.include_router(seed_router)
app.include_router(upload_router)

# BPCL Intelligence modules
app.include_router(sales_performance_router)
app.include_router(vendor_performance_router)
app.include_router(iot_comparison_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "RO Monitoring Platform v2.0",
        "docs": "/docs",
        "status": "online",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": "2.0.0"}