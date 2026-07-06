from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DeviceCreate(BaseModel):
    device_name: str
    device_type: Optional[str] = "ro_unit"
    site_id: int
    status: Optional[str] = "online"
    feed_pressure: Optional[float] = None
    permeate_flow: Optional[float] = None
    tds_level: Optional[float] = None
    recovery_rate: Optional[float] = None
    energy_kwh: Optional[float] = None
    uptime_pct: Optional[float] = None


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    feed_pressure: Optional[float] = None
    permeate_flow: Optional[float] = None
    tds_level: Optional[float] = None
    recovery_rate: Optional[float] = None
    energy_kwh: Optional[float] = None
    uptime_pct: Optional[float] = None


class DeviceResponse(BaseModel):
    id: int
    device_name: str
    device_type: Optional[str] = None
    site_id: int
    status: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    feed_pressure: Optional[float] = None
    permeate_flow: Optional[float] = None
    tds_level: Optional[float] = None
    recovery_rate: Optional[float] = None
    energy_kwh: Optional[float] = None
    uptime_pct: Optional[float] = None

    class Config:
        from_attributes = True


class SensorReadingIngest(BaseModel):
    # RO physical parameters
    feed_pressure: Optional[float] = None
    permeate_tds: Optional[float] = None
    flow_rate: Optional[float] = None
    recovery_rate: Optional[float] = None
    energy_kwh: Optional[float] = None
    temperature: Optional[float] = None
    ph: Optional[float] = None
    # BPCL uptime %
    mpd_uptime: Optional[float] = None
    tank_uptime: Optional[float] = None
    ro_online_percent: Optional[float] = None
    avg_mpd_online: Optional[float] = None
    # BPCL counts
    onboarded_mpds: Optional[int] = None
    online_mpds: Optional[int] = None
    offline_mpds: Optional[int] = None
    onboarded_tanks: Optional[int] = None
    online_tanks: Optional[int] = None
    offline_tanks: Optional[int] = None
    avg_tank_online: Optional[float] = None
    tank_online_pct: Optional[float] = None
