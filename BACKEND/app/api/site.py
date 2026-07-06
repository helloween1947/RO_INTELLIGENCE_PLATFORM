from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.site import Site
from app.schemas.site import SiteCreate

router = APIRouter(
    prefix="/sites",
    tags=["Sites"]
)

@router.get("/")
def get_sites(db: Session = Depends(get_db)):
    return db.query(Site).all()

@router.post("/")
def create_site(
    site: SiteCreate,
    db: Session = Depends(get_db)
):
    db_site = Site(
        ro_id=site.ro_id,
        ro_name=site.ro_name,
        company_id=site.company_id
    )

    db.add(db_site)
    db.commit()
    db.refresh(db_site)

    return db_site