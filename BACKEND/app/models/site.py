from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    ro_id = Column(String(100), index=True)
    ro_name = Column(String(255))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    location = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    capacity_m3_day = Column(Float, nullable=True)
    status = Column(String(50), default="active")

    # BPCL-specific fields
    sales_area  = Column(String(255), nullable=True, index=True)   # e.g. "Haldia Retail"
    vendor_name = Column(String(255), nullable=True, index=True)   # RA Vendor
    iot_enabled = Column(Boolean,     nullable=True, default=None) # Yes / No
    ro_status   = Column(String(100), nullable=True)               # Fully Online / Partially Online / Offline
    territory   = Column(String(255), nullable=True)               # e.g. "Calcutta"
    state       = Column(String(100), nullable=True)               # e.g. "West Bengal"
    region      = Column(String(100), nullable=True)               # e.g. "East"

    company = relationship("Company", back_populates="sites")
    devices = relationship("Device", back_populates="site")
    readings = relationship("SensorReading", back_populates="site")
    alarms = relationship("Alarm", back_populates="site")
