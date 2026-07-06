from pydantic import BaseModel
from typing import Optional


class CompanyBase(BaseModel):
    name: str
    tier: Optional[str] = "professional"
    contact_email: Optional[str] = None
    country: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[str] = None
    contact_email: Optional[str] = None
    country: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: int

    class Config:
        from_attributes = True
