"""
Vendor Performance API (BPCL RO Network)
==========================================
GET /vendor-performance/summary  — fleet KPIs aggregated across vendors
GET /vendor-performance/vendors  — per-vendor full breakdown (MPD, Tank, RO Status)
GET /vendor-performance/ros      — per-RO list (optionally filtered by vendor_name)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db import get_db
from app.models.site import Site
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/vendor-performance", tags=["Vendor Performance"])


def _clamp(v):
    if v is None:
        return None
    return max(0.0, min(100.0, round(float(v), 2)))


def _safe(v, digits=2):
    return round(float(v), digits) if v is not None else None


def _vendor_rows(db: Session):
    """Aggregate latest per-site readings grouped by vendor_name."""
    sites = db.query(Site).all()

    vendors: dict[str, dict] = {}
    for s in sites:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        key = s.vendor_name or "Unknown Vendor"

        if key not in vendors:
            vendors[key] = {
                "vendor_name":   key,
                "ro_count":      0,
                "fully_online":  0,
                "partial":       0,
                "offline_ros":   0,
                "iot_count":     0,
                # MPD
                "onb_mpd":       0,
                "onl_mpd":       0,
                "off_mpd":       0,
                # Tank
                "onb_tank":      0,
                "onl_tank":      0,
                "off_tank":      0,
                # Utilization (for avg)
                "mpd_util_sum":  0.0,
                "mpd_util_cnt":  0,
                "tank_util_sum": 0.0,
                "tank_util_cnt": 0,
            }

        vd = vendors[key]
        vd["ro_count"] += 1

        # RO status
        status = (s.ro_status or "").strip()
        if status == "Fully Online":
            vd["fully_online"] += 1
        elif status == "Partially Online":
            vd["partial"] += 1
        elif status == "Offline":
            vd["offline_ros"] += 1

        if s.iot_enabled:
            vd["iot_count"] += 1

        if latest:
            onb_m = latest.onboarded_mpds or 0
            onl_m = min(latest.online_mpds or 0, onb_m)
            off_m = max(0, onb_m - onl_m)
            onb_t = latest.onboarded_tanks or 0
            onl_t = min(latest.online_tanks or 0, onb_t)
            off_t = max(0, onb_t - onl_t)

            vd["onb_mpd"]  += onb_m
            vd["onl_mpd"]  += onl_m
            vd["off_mpd"]  += off_m
            vd["onb_tank"] += onb_t
            vd["onl_tank"] += onl_t
            vd["off_tank"] += off_t

            if latest.mpd_uptime is not None:
                vd["mpd_util_sum"] += latest.mpd_uptime
                vd["mpd_util_cnt"] += 1
            if latest.tank_uptime is not None:
                vd["tank_util_sum"] += latest.tank_uptime
                vd["tank_util_cnt"] += 1

    result = []
    for key, vd in vendors.items():
        mpd_pct  = _clamp(vd["onl_mpd"]  / vd["onb_mpd"]  * 100) if vd["onb_mpd"]  > 0 else None
        tank_pct = _clamp(vd["onl_tank"] / vd["onb_tank"] * 100) if vd["onb_tank"] > 0 else None
        avg_mpd_util  = _safe(vd["mpd_util_sum"]  / vd["mpd_util_cnt"])  if vd["mpd_util_cnt"]  > 0 else None
        avg_tank_util = _safe(vd["tank_util_sum"] / vd["tank_util_cnt"]) if vd["tank_util_cnt"] > 0 else None
        fully_pct = round(vd["fully_online"] / vd["ro_count"] * 100) if vd["ro_count"] > 0 else 0

        result.append({
            "vendor_name":    key,
            "ro_count":       vd["ro_count"],
            "fully_online":   vd["fully_online"],
            "partial":        vd["partial"],
            "offline_ros":    vd["offline_ros"],
            "fully_pct":      fully_pct,
            "iot_count":      vd["iot_count"],
            # MPD
            "onb_mpd":        vd["onb_mpd"],
            "onl_mpd":        vd["onl_mpd"],
            "off_mpd":        vd["off_mpd"],
            "mpd_online_pct": mpd_pct,
            "avg_mpd_util":   avg_mpd_util,
            # Tank
            "onb_tank":       vd["onb_tank"],
            "onl_tank":       vd["onl_tank"],
            "off_tank":       vd["off_tank"],
            "tank_online_pct": tank_pct,
            "avg_tank_util":  avg_tank_util,
        })

    # Sort by RO count descending
    return sorted(result, key=lambda x: x["ro_count"], reverse=True)


@router.get("/summary")
def get_vendor_summary(db: Session = Depends(get_db)):
    rows          = _vendor_rows(db)
    total_vendors = len(rows)
    total_ros     = sum(r["ro_count"]    for r in rows)
    total_onb_mpd = sum(r["onb_mpd"]    for r in rows)
    total_onl_mpd = sum(r["onl_mpd"]    for r in rows)
    total_off_mpd = sum(r["off_mpd"]    for r in rows)
    total_onb_tank= sum(r["onb_tank"]   for r in rows)
    total_onl_tank= sum(r["onl_tank"]   for r in rows)
    total_off_tank= sum(r["off_tank"]   for r in rows)
    total_fully   = sum(r["fully_online"] for r in rows)
    total_partial = sum(r["partial"]    for r in rows)
    total_offline = sum(r["offline_ros"] for r in rows)
    total_iot     = sum(r["iot_count"]  for r in rows)

    fleet_mpd_pct  = _clamp(total_onl_mpd  / total_onb_mpd  * 100) if total_onb_mpd  > 0 else None
    fleet_tank_pct = _clamp(total_onl_tank / total_onb_tank * 100) if total_onb_tank > 0 else None

    utils = [r["avg_mpd_util"] for r in rows if r["avg_mpd_util"] is not None]
    avg_mpd_util = round(sum(utils) / len(utils), 1) if utils else None

    return {
        "total_vendors":    total_vendors,
        "total_ros":        total_ros,
        "total_fully_online": total_fully,
        "total_partial":    total_partial,
        "total_offline":    total_offline,
        "iot_enabled_ros":  total_iot,
        "total_onb_mpd":    total_onb_mpd,
        "total_onl_mpd":    total_onl_mpd,
        "total_off_mpd":    total_off_mpd,
        "fleet_mpd_pct":    fleet_mpd_pct,
        "total_onb_tank":   total_onb_tank,
        "total_onl_tank":   total_onl_tank,
        "total_off_tank":   total_off_tank,
        "fleet_tank_pct":   fleet_tank_pct,
        "avg_mpd_util":     avg_mpd_util,
    }


@router.get("/vendors")
def get_vendors(db: Session = Depends(get_db)):
    return _vendor_rows(db)


@router.get("/ros")
def get_vendor_ros(
    vendor_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Site)
    if vendor_name:
        if vendor_name == "Unknown Vendor":
            q = q.filter((Site.vendor_name == None) | (Site.vendor_name == ""))
        else:
            q = q.filter(Site.vendor_name == vendor_name)
    sites = q.all()

    result = []
    for s in sites:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )

        onb_m = (latest.onboarded_mpds  or 0) if latest else 0
        onl_m = min((latest.online_mpds  or 0), onb_m) if latest else 0
        off_m = max(0, onb_m - onl_m)
        onb_t = (latest.onboarded_tanks or 0) if latest else 0
        onl_t = min((latest.online_tanks or 0), onb_t) if latest else 0
        off_t = max(0, onb_t - onl_t)

        mpd_pct  = _clamp(onl_m / onb_m  * 100) if onb_m  > 0 else None
        tank_pct = _clamp(onl_t / onb_t * 100) if onb_t > 0 else None

        result.append({
            "site_id":     s.id,
            "ro_id":       s.ro_id,
            "ro_name":     s.ro_name,
            "sales_area":  s.sales_area or "Unassigned",
            "vendor_name": s.vendor_name or "Unknown",
            "iot_enabled": s.iot_enabled,
            "ro_status":   s.ro_status,
            "territory":   s.territory,
            # MPD
            "onb_mpd":     onb_m,
            "onl_mpd":     onl_m,
            "off_mpd":     off_m,
            "mpd_pct":     mpd_pct,
            "mpd_util":    _safe(latest.mpd_uptime    if latest else None),
            # Tank
            "onb_tank":    onb_t,
            "onl_tank":    onl_t,
            "off_tank":    off_t,
            "tank_pct":    tank_pct,
            "tank_util":   _safe(latest.tank_uptime   if latest else None),
            "last_updated": latest.timestamp.isoformat() if (latest and latest.timestamp) else None,
        })

    # Sort: Offline first, then Partial, then by most offline MPDs
    result.sort(key=lambda x: (
        0 if x["ro_status"] == "Offline" else 1 if x["ro_status"] == "Partially Online" else 2,
        -(x["off_mpd"] or 0),
    ))
    return result
