from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from app.database.base import Base


class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    severity = Column(String(50))  # critical, high, medium, low
    message = Column(String(500))
    parameter = Column(String(100), nullable=True)
    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String(50), default="active")  # active, acknowledged, resolved
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    site = relationship("Site", back_populates="alarms")
    device = relationship("Device", back_populates="alarms")
