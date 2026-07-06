from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database.db import get_db
from app.models.site import Site
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("/")
def list_sites(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    sites = db.query(Site).offset(skip).limit(limit).all()
    result = []
    for s in sites:
        device_count = db.query(Device).filter(Device.site_id == s.id).count()
        alarm_count = db.query(Alarm).filter(
            Alarm.site_id == s.id, Alarm.is_active == True
        ).count()
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        result.append({
            "id": s.id,
            "ro_id": s.ro_id,
            "ro_name": s.ro_name,
            "city": s.city,
            "country": s.country,
            "status": s.status,
            "capacity_m3_day": s.capacity_m3_day,
            "device_count": device_count,
            "active_alarm_count": alarm_count,
            "last_ro_online_pct": latest.ro_online_percent if latest else None,
            "last_reading_at": latest.timestamp if latest else None,
        })
    return result


@router.get("/{site_id}")
def get_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return {
        "id": site.id,
        "ro_id": site.ro_id,
        "ro_name": site.ro_name,
        "city": site.city,
        "country": site.country,
        "location": site.location,
        "status": site.status,
        "capacity_m3_day": site.capacity_m3_day,
        "company_id": site.company_id,
    }


@router.get("/{site_id}/devices")
def get_site_devices(site_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    devices = db.query(Device).filter(Device.site_id == site_id).all()
    return [
        {
            "id": d.id,
            "device_name": d.device_name,
            "device_type": d.device_type,
            "status": d.status,
            "feed_pressure": d.feed_pressure,
            "permeate_flow": d.permeate_flow,
            "tds_level": d.tds_level,
            "recovery_rate": d.recovery_rate,
            "energy_kwh": d.energy_kwh,
            "uptime_pct": d.uptime_pct,
            "last_heartbeat": d.last_heartbeat,
        }
        for d in devices
    ]


@router.get("/{site_id}/readings")
def get_site_readings(
    site_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.site_id == site_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp,
            "ro_online_percent": r.ro_online_percent,
            "mpd_uptime": r.mpd_uptime,
            "tank_uptime": r.tank_uptime,
            "avg_mpd_online": r.avg_mpd_online,
            "feed_pressure": r.feed_pressure,
            "permeate_tds": r.permeate_tds,
            "flow_rate": r.flow_rate,
            "recovery_rate": r.recovery_rate,
            "energy_kwh": r.energy_kwh,
            "temperature": r.temperature,
            "ph": r.ph,
        }
        for r in readings
    ]


@router.get("/{site_id}/alarms")
def get_site_alarms(
    site_id: int,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    q = db.query(Alarm).filter(Alarm.site_id == site_id)
    if status:
        q = q.filter(Alarm.status == status)
    alarms = q.order_by(Alarm.created_at.desc()).limit(100).all()
    return [
        {
            "id": a.id,
            "severity": a.severity,
            "message": a.message,
            "parameter": a.parameter,
            "value": a.value,
            "threshold": a.threshold,
            "status": a.status,
            "is_active": a.is_active,
            "created_at": a.created_at,
            "acknowledged_at": a.acknowledged_at,
            "acknowledged_by": a.acknowledged_by,
            "resolved_at": a.resolved_at,
            "device_id": a.device_id,
        }
        for a in alarms
    ]
