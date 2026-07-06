from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from app.database.db import get_db
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, SensorReadingIngest
from app.schemas.sensor_reading import SensorReadingResponse

router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)


@router.get("/", response_model=List[DeviceResponse])
def list_devices(
    site_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Device)
    if site_id is not None:
        q = q.filter(Device.site_id == site_id)
    if status is not None:
        q = q.filter(Device.status == status)
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=DeviceResponse, status_code=201)
def create_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    device = Device(
        device_name=payload.device_name,
        device_type=payload.device_type,
        site_id=payload.site_id,
        status=payload.status or "online",
        feed_pressure=payload.feed_pressure,
        permeate_flow=payload.permeate_flow,
        tds_level=payload.tds_level,
        recovery_rate=payload.recovery_rate,
        energy_kwh=payload.energy_kwh,
        uptime_pct=payload.uptime_pct,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, payload: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(device, field, val)
    db.commit()
    db.refresh(device)
    return device


@router.put("/{device_id}/heartbeat", response_model=DeviceResponse)
def heartbeat(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.last_heartbeat = datetime.utcnow()
    device.status = "online"
    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}/readings", response_model=List[SensorReadingResponse])
def get_device_readings(
    device_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return (
        db.query(SensorReading)
        .filter(SensorReading.device_id == device_id)
        .order_by(SensorReading.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/{device_id}/reading", status_code=201)
def ingest_reading(device_id: int, payload: SensorReadingIngest, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    reading = SensorReading(
        site_id=device.site_id,
        device_id=device_id,
        sensor_type="composite",
        feed_pressure=payload.feed_pressure,
        permeate_tds=payload.permeate_tds,
        flow_rate=payload.flow_rate,
        recovery_rate=payload.recovery_rate,
        energy_kwh=payload.energy_kwh,
        temperature=payload.temperature,
        ph=payload.ph,
        mpd_uptime=payload.mpd_uptime,
        tank_uptime=payload.tank_uptime,
        ro_online_percent=payload.ro_online_percent,
        avg_mpd_online=payload.avg_mpd_online,
        # BPCL count fields
        onboarded_mpds=payload.onboarded_mpds,
        online_mpds=payload.online_mpds,
        offline_mpds=(
            (payload.onboarded_mpds - payload.online_mpds)
            if payload.onboarded_mpds is not None and payload.online_mpds is not None
            else payload.offline_mpds
        ),
        onboarded_tanks=payload.onboarded_tanks,
        online_tanks=payload.online_tanks,
        offline_tanks=(
            (payload.onboarded_tanks - payload.online_tanks)
            if payload.onboarded_tanks is not None and payload.online_tanks is not None
            else payload.offline_tanks
        ),
        avg_tank_online=payload.avg_tank_online,
        tank_online_pct=payload.tank_online_pct,
        timestamp=datetime.utcnow(),
    )
    db.add(reading)


    # Update device live fields
    if payload.feed_pressure is not None:
        device.feed_pressure = payload.feed_pressure
    if payload.flow_rate is not None:
        device.permeate_flow = payload.flow_rate
    if payload.recovery_rate is not None:
        device.recovery_rate = payload.recovery_rate
    if payload.energy_kwh is not None:
        device.energy_kwh = payload.energy_kwh
    device.last_heartbeat = datetime.utcnow()
    device.status = "online"

    alarms_created = []

    # Threshold checks
    if payload.feed_pressure is not None and payload.feed_pressure > 80:
        alarm = Alarm(
            site_id=device.site_id,
            device_id=device_id,
            severity="critical",
            message=f"Feed pressure critical: {payload.feed_pressure:.1f} bar (threshold: 80 bar)",
            parameter="feed_pressure",
            value=payload.feed_pressure,
            threshold=80.0,
            status="active",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(alarm)
        alarms_created.append("feed_pressure")

    if payload.permeate_tds is not None and payload.permeate_tds > 500:
        alarm = Alarm(
            site_id=device.site_id,
            device_id=device_id,
            severity="high",
            message=f"TDS level high: {payload.permeate_tds:.1f} ppm (threshold: 500 ppm)",
            parameter="tds_level",
            value=payload.permeate_tds,
            threshold=500.0,
            status="active",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(alarm)
        alarms_created.append("tds_level")

    if payload.recovery_rate is not None and payload.recovery_rate < 50:
        alarm = Alarm(
            site_id=device.site_id,
            device_id=device_id,
            severity="medium",
            message=f"Recovery rate low: {payload.recovery_rate:.1f}% (threshold: 50%)",
            parameter="recovery_rate",
            value=payload.recovery_rate,
            threshold=50.0,
            status="active",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(alarm)
        alarms_created.append("recovery_rate")

    db.commit()
    db.refresh(reading)

    return {
        "reading_id": reading.id,
        "device_id": device_id,
        "site_id": device.site_id,
        "timestamp": reading.timestamp,
        "alarms_triggered": alarms_created,
    }
