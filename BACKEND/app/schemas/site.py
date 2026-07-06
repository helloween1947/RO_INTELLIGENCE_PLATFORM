from pydantic import BaseModel
from typing import Optional


class SiteBase(BaseModel):
    ro_id: str
    ro_name: str
    company_id: int
    location: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    capacity_m3_day: Optional[float] = None
    status: Optional[str] = "active"


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    ro_id: Optional[str] = None
    ro_name: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    capacity_m3_day: Optional[float] = None
    status: Optional[str] = None


class SiteResponse(SiteBase):
    id: int

    class Config:
        from_attributes = True
