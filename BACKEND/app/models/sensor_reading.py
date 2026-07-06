from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database.base import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    sensor_type = Column(String(100), nullable=True)
    value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)

    # BPCL percentage uptime fields
    mpd_uptime = Column(Float, nullable=True)       # MPD Utilization%
    tank_uptime = Column(Float, nullable=True)      # Tank Utilization%
    ro_online_percent = Column(Float, nullable=True) # MPD Online%
    avg_mpd_online = Column(Float, nullable=True)   # Avg MPD Online%

    # BPCL count fields (from portal table columns)
    onboarded_mpds  = Column(Integer, nullable=True)  # No. of On-Boarded MPDs
    online_mpds     = Column(Integer, nullable=True)  # No. of Online MPDs
    offline_mpds    = Column(Integer, nullable=True)  # calculated: onboarded - online
    onboarded_tanks = Column(Integer, nullable=True)  # No. of On-Boarded Tanks
    online_tanks    = Column(Integer, nullable=True)  # No. of Online Tanks
    offline_tanks   = Column(Integer, nullable=True)  # calculated: onboarded - online
    avg_tank_online = Column(Float, nullable=True)    # Avg Tank Online%
    tank_online_pct = Column(Float, nullable=True)    # Tank Online%

    # Extended fields
    feed_pressure = Column(Float, nullable=True)
    permeate_tds = Column(Float, nullable=True)
    flow_rate = Column(Float, nullable=True)
    recovery_rate = Column(Float, nullable=True)
    energy_kwh = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)

    # BPCL business fields (Sales Area Wise Utilization, Vendor Performance sheets)
    water_dispensed = Column(Float, nullable=True)   # Water dispensed in KL
    revenue = Column(Float, nullable=True)           # Revenue generated in ₹
    availability_pct = Column(Float, nullable=True)  # RO availability %

    timestamp = Column(DateTime, index=True)

    site = relationship("Site", back_populates="readings")
    device = relationship("Device", back_populates="readings")

