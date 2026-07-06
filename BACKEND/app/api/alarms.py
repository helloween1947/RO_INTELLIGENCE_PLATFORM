from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, List

from app.database.db import get_db
from app.models.alarm import Alarm
from app.schemas.alarm import AlarmCreate, AlarmResponse

router = APIRouter(
    prefix="/alarms",
    tags=["Alarms"]
)


@router.get("/stats")
def get_alarm_stats(db: Session = Depends(get_db)):
    total_active = db.query(Alarm).filter(Alarm.is_active == True).count()
    critical = db.query(Alarm).filter(Alarm.is_active == True, Alarm.severity == "critical").count()
    high = db.query(Alarm).filter(Alarm.is_active == True, Alarm.severity == "high").count()
    medium = db.query(Alarm).filter(Alarm.is_active == True, Alarm.severity == "medium").count()
    low = db.query(Alarm).filter(Alarm.is_active == True, Alarm.severity == "low").count()
    return {
        "total_active": total_active,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
    }


@router.get("/", response_model=List[AlarmResponse])
def list_alarms(
    site_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Alarm)
    if site_id is not None:
        q = q.filter(Alarm.site_id == site_id)
    if severity is not None:
        q = q.filter(Alarm.severity == severity)
    if status is not None:
        q = q.filter(Alarm.status == status)
    return q.order_by(Alarm.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{alarm_id}", response_model=AlarmResponse)
def get_alarm(alarm_id: int, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm


@router.post("/", response_model=AlarmResponse, status_code=201)
def create_alarm(payload: AlarmCreate, db: Session = Depends(get_db)):
    alarm = Alarm(
        site_id=payload.site_id,
        device_id=payload.device_id,
        severity=payload.severity,
        message=payload.message,
        parameter=payload.parameter,
        value=payload.value,
        threshold=payload.threshold,
        status="active",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm


@router.put("/{alarm_id}/acknowledge", response_model=AlarmResponse)
def acknowledge_alarm(
    alarm_id: int,
    user: str = Query(..., description="Username acknowledging the alarm"),
    db: Session = Depends(get_db),
):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    alarm.acknowledged_at = datetime.utcnow()
    alarm.acknowledged_by = user
    alarm.status = "acknowledged"
    db.commit()
    db.refresh(alarm)
    return alarm


@router.put("/{alarm_id}/resolve", response_model=AlarmResponse)
def resolve_alarm(alarm_id: int, db: Session = Depends(get_db)):
    alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    alarm.resolved_at = datetime.utcnow()
    alarm.status = "resolved"
    alarm.is_active = False
    db.commit()
    db.refresh(alarm)
    return alarm
