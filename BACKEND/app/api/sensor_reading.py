from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingCreate

router = APIRouter(
    prefix="/sensor-readings",
    tags=["Sensor Readings"]
)

@router.get("/")
def get_sensor_readings(
    db: Session = Depends(get_db)
):
    return db.query(SensorReading).all()

@router.post("/")
def create_sensor_reading(
    reading: SensorReadingCreate,
    db: Session = Depends(get_db)
):
    db_reading = SensorReading(
        site_id=reading.site_id,
        mpd_uptime=reading.mpd_uptime,
        tank_uptime=reading.tank_uptime,
        ro_online_percent=reading.ro_online_percent,
        avg_mpd_online=reading.avg_mpd_online
    )

    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)

    return db_reading