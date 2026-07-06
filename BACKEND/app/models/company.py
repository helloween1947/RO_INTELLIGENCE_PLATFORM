from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.base import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    tier = Column(String(50), default="professional")
    contact_email = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)

    sites = relationship("Site", back_populates="company")
