from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlarmCreate(BaseModel):
    site_id: int
    device_id: Optional[int] = None
    severity: str
    message: str
    parameter: Optional[str] = None
    value: Optional[float] = None
    threshold: Optional[float] = None


class AlarmResponse(BaseModel):
    id: int
    site_id: int
    device_id: Optional[int] = None
    severity: str
    message: str
    parameter: Optional[str] = None
    value: Optional[float] = None
    threshold: Optional[float] = None
    status: str
    is_active: bool
    created_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
