from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Optional

from app.database.db import get_db
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm
from app.models.device import Device
from app.models.site import Site

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/production")
def get_production_trend(
    days: int = Query(7, ge=1, le=90),
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(
        func.date(SensorReading.timestamp).label("day"),
        func.avg(SensorReading.flow_rate).label("avg_flow_rate"),
        func.count(SensorReading.id).label("reading_count"),
    ).filter(SensorReading.timestamp >= since)
    if site_id is not None:
        q = q.filter(SensorReading.site_id == site_id)
    rows = q.group_by(func.date(SensorReading.timestamp)).order_by(func.date(SensorReading.timestamp)).all()
    return [
        {"day": str(r.day), "avg_flow_rate": r.avg_flow_rate, "reading_count": r.reading_count}
        for r in rows
    ]


@router.get("/energy")
def get_energy_trend(
    days: int = Query(7, ge=1, le=90),
    site_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(
        func.date(SensorReading.timestamp).label("day"),
        func.sum(SensorReading.energy_kwh).label("total_energy_kwh"),
        func.avg(SensorReading.energy_kwh).label("avg_energy_kwh"),
    ).filter(SensorReading.timestamp >= since)
    if site_id is not None:
        q = q.filter(SensorReading.site_id == site_id)
    rows = q.group_by(func.date(SensorReading.timestamp)).order_by(func.date(SensorReading.timestamp)).all()
    return [
        {"day": str(r.day), "total_energy_kwh": r.total_energy_kwh, "avg_energy_kwh": r.avg_energy_kwh}
        for r in rows
    ]


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    avg_recovery = db.query(func.avg(SensorReading.recovery_rate)).scalar()
    avg_tds = db.query(func.avg(SensorReading.permeate_tds)).scalar()
    avg_uptime = db.query(func.avg(SensorReading.ro_online_percent)).scalar()
    total_sites = db.query(Site).count()
    online_sites = db.query(Site).filter(Site.status == "active").count()
    return {
        "avg_recovery_rate": round(avg_recovery, 2) if avg_recovery else None,
        "avg_tds": round(avg_tds, 2) if avg_tds else None,
        "avg_uptime": round(avg_uptime, 2) if avg_uptime else None,
        "total_sites": total_sites,
        "total_sites_online": online_sites,
    }


@router.get("/site/{site_id}/trend")
def get_site_trend(site_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(SensorReading)
        .filter(SensorReading.site_id == site_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp,
            "ro_online_percent": r.ro_online_percent,
            "mpd_uptime": r.mpd_uptime,
            "tank_uptime": r.tank_uptime,
            "flow_rate": r.flow_rate,
            "feed_pressure": r.feed_pressure,
            "recovery_rate": r.recovery_rate,
        }
        for r in rows
    ]


@router.get("/alarms/frequency")
def get_alarm_frequency(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=14)
    rows = (
        db.query(
            func.date(Alarm.created_at).label("day"),
            Alarm.severity,
            func.count(Alarm.id).label("count"),
        )
        .filter(Alarm.created_at >= since)
        .group_by(func.date(Alarm.created_at), Alarm.severity)
        .order_by(func.date(Alarm.created_at))
        .all()
    )
    return [{"day": str(r.day), "severity": r.severity, "count": r.count} for r in rows]
