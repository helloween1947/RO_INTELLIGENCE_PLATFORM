from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate

router = APIRouter(
    prefix="/companies",
    tags=["Companies"]
)

@router.get("/")
def get_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()

@router.post("/")
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db)
):
    db_company = Company(
        name=company.name
    )

    db.add(db_company)
    db.commit()
    db.refresh(db_company)

    return db_company