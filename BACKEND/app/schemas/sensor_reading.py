from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SensorReadingBase(BaseModel):
    site_id: int
    device_id: Optional[int] = None
    sensor_type: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    mpd_uptime: Optional[float] = None
    tank_uptime: Optional[float] = None
    ro_online_percent: Optional[float] = None
    avg_mpd_online: Optional[float] = None
    feed_pressure: Optional[float] = None
    permeate_tds: Optional[float] = None
    flow_rate: Optional[float] = None
    recovery_rate: Optional[float] = None
    energy_kwh: Optional[float] = None
    temperature: Optional[float] = None
    ph: Optional[float] = None


class SensorReadingCreate(SensorReadingBase):
    pass


class SensorReadingResponse(SensorReadingBase):
    id: int
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True
