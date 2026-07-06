from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from app.database.base import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(255))
    device_type = Column(String(100))  # ro_unit, pump, sensor, tank, valve, filter
    site_id = Column(Integer, ForeignKey("sites.id"))
    status = Column(String(50), default="online")
    last_heartbeat = Column(DateTime, nullable=True)
    feed_pressure = Column(Float, nullable=True)
    permeate_flow = Column(Float, nullable=True)
    tds_level = Column(Float, nullable=True)
    recovery_rate = Column(Float, nullable=True)
    energy_kwh = Column(Float, nullable=True)
    uptime_pct = Column(Float, nullable=True)

    site = relationship("Site", back_populates="devices")
    alarms = relationship("Alarm", back_populates="device")
    readings = relationship("SensorReading", back_populates="device")
