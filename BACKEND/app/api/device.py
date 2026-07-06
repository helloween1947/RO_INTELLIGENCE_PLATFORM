from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.device import Device
from app.schemas.device import DeviceCreate

router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)

@router.get("/")
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()

@router.post("/")
def create_device(
    device: DeviceCreate,
    db: Session = Depends(get_db)
):
    db_device = Device(
        device_name=device.device_name,
        device_type=device.device_type,
        site_id=device.site_id
    )

    db.add(db_device)
    db.commit()
    db.refresh(db_device)

    return db_device