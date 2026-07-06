from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.db import get_db
from app.models.site import Site
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_sites   = db.query(Site).count()
    total_devices = db.query(Device).count()

    latest = (
        db.query(SensorReading)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )

    # Fleet-wide aggregated counts from all latest readings
    fleet = db.query(
        func.sum(SensorReading.onboarded_mpds).label("total_onboarded_mpds"),
        func.sum(SensorReading.online_mpds).label("total_online_mpds"),
        func.sum(SensorReading.offline_mpds).label("total_offline_mpds"),
        func.sum(SensorReading.onboarded_tanks).label("total_onboarded_tanks"),
        func.sum(SensorReading.online_tanks).label("total_online_tanks"),
        func.sum(SensorReading.offline_tanks).label("total_offline_tanks"),
        func.avg(SensorReading.ro_online_percent).label("avg_ro_online"),
        func.avg(SensorReading.mpd_uptime).label("avg_mpd_uptime"),
        func.avg(SensorReading.tank_uptime).label("avg_tank_uptime"),
        func.avg(SensorReading.avg_mpd_online).label("avg_mpd_online"),
        func.avg(SensorReading.avg_tank_online).label("avg_tank_online"),
    ).first()

    def r(v, d=1):
        return round(float(v), d) if v is not None else 0

    # Compute offline as onboarded - online (never rely on stored offline column)
    total_onboarded_mpds  = int(fleet.total_onboarded_mpds  or 0)
    total_online_mpds     = int(fleet.total_online_mpds     or 0)
    total_onboarded_tanks = int(fleet.total_onboarded_tanks or 0)
    total_online_tanks    = int(fleet.total_online_tanks    or 0)

    return {
        # Site / device counts
        "total_sites":   total_sites,
        "total_devices": total_devices,

        # MPD counts
        "onboarded_mpds":  total_onboarded_mpds,
        "online_mpds":     total_online_mpds,
        "offline_mpds":    max(0, total_onboarded_mpds - total_online_mpds),

        # Tank counts
        "onboarded_tanks": total_onboarded_tanks,
        "online_tanks":    total_online_tanks,
        "offline_tanks":   max(0, total_onboarded_tanks - total_online_tanks),

        # Percentage KPIs
        "ro_online_percent": r(fleet.avg_ro_online),
        "mpd_uptime":        r(fleet.avg_mpd_uptime),
        "tank_uptime":       r(fleet.avg_tank_uptime),
        "avg_mpd_online":    r(fleet.avg_mpd_online),
        "avg_tank_online":   r(fleet.avg_tank_online),
    }


@router.get("/fleet")
def get_fleet_status(db: Session = Depends(get_db)):
    """Per-site latest reading with all MPD + Tank counts."""
    sites = db.query(Site).all()
    result = []
    for s in sites:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        active_alarms = db.query(Alarm).filter(
            Alarm.site_id == s.id, Alarm.is_active == True
        ).count()

        # Compute offline as onboarded - online (formula-based, not stored value)
        onboarded_mpds  = latest.onboarded_mpds  if latest else None
        online_mpds     = latest.online_mpds     if latest else None
        onboarded_tanks = latest.onboarded_tanks if latest else None
        online_tanks    = latest.online_tanks    if latest else None

        offline_mpds  = max(0, onboarded_mpds  - online_mpds)  if (onboarded_mpds  is not None and online_mpds  is not None) else None
        offline_tanks = max(0, onboarded_tanks - online_tanks) if (onboarded_tanks is not None and online_tanks is not None) else None

        result.append({
            "site_id":     s.id,
            "ro_id":       s.ro_id,
            "ro_name":     s.ro_name,
            "city":        s.city,
            "country":     s.country,
            "status":      s.status,
            "sales_area":  s.sales_area,
            "vendor_name": s.vendor_name,
            "iot_enabled": s.iot_enabled,
            "ro_status":   s.ro_status,
            "territory":   s.territory,
            "state":       s.state,
            "region":      s.region,
            # MPD
            "onboarded_mpds":  onboarded_mpds,
            "online_mpds":     online_mpds,
            "offline_mpds":    offline_mpds,
            "mpd_uptime":      latest.mpd_uptime      if latest else None,
            "ro_online_percent": latest.ro_online_percent if latest else None,
            "avg_mpd_online":  latest.avg_mpd_online  if latest else None,
            # Tank
            "onboarded_tanks": onboarded_tanks,
            "online_tanks":    online_tanks,
            "offline_tanks":   offline_tanks,
            "tank_uptime":     latest.tank_uptime     if latest else None,
            "tank_online_pct": latest.tank_online_pct if latest else None,
            "avg_tank_online": latest.avg_tank_online if latest else None,
            "last_updated":    latest.timestamp       if latest else None,
        })
    return result


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    latest = (
        db.query(SensorReading)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )
    if not latest:
        return {"ro_online_percent": 0, "mpd_uptime": 0, "tank_uptime": 0}
    return {
        "ro_online_percent": latest.ro_online_percent,
        "mpd_uptime":        latest.mpd_uptime,
        "tank_uptime":       latest.tank_uptime,
    }


@router.get("/sites")
def dashboard_sites(db: Session = Depends(get_db)):
    return [
        {"id": s.id, "ro_id": s.ro_id, "ro_name": s.ro_name}
        for s in db.query(Site).all()
    ]