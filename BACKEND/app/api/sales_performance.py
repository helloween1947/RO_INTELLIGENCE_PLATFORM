"""
Sales Performance API (BPCL RO Network)
========================================
GET /sales-performance/summary   — fleet KPIs across all sales areas
GET /sales-performance/areas     — per-sales-area full breakdown
GET /sales-performance/ros       — per-RO breakdown (optionally filtered by sales_area)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database.db import get_db
from app.models.site import Site
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/sales-performance", tags=["Sales Performance"])


def _clamp(v):
    if v is None:
        return None
    return max(0.0, min(100.0, round(float(v), 2)))


def _safe(v, digits=2):
    return round(float(v), digits) if v is not None else None


# ── Core per-area aggregation ──────────────────────────────────────────────
def _area_rows(db: Session):
    """
    Aggregate latest SensorReading per site into per-sales-area summaries.
    Returns BPCL-relevant metrics: MPD/Tank counts, RO status, IoT split.
    """
    sites = db.query(Site).all()

    areas: dict[str, dict] = {}

    for s in sites:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )

        key = s.sales_area or "Unassigned"
        if key not in areas:
            areas[key] = {
                "sales_area":    key,
                "ro_count":      0,
                "fully_online":  0,
                "partial":       0,
                "offline":       0,
                "iot_count":     0,
                "non_iot_count": 0,
                # MPD
                "onb_mpd":  0,
                "onl_mpd":  0,
                "off_mpd":  0,
                # Tank
                "onb_tank": 0,
                "onl_tank": 0,
                "off_tank": 0,
                # Utilization sums (for avg)
                "mpd_util_sum":  0.0,
                "mpd_util_cnt":  0,
                "tank_util_sum": 0.0,
                "tank_util_cnt": 0,
            }

        a = areas[key]
        a["ro_count"] += 1

        # RO Status
        status = (s.ro_status or "").strip()
        if status == "Fully Online":
            a["fully_online"] += 1
        elif status == "Partially Online":
            a["partial"] += 1
        elif status == "Offline":
            a["offline"] += 1

        # IoT
        if s.iot_enabled is True:
            a["iot_count"] += 1
        else:
            a["non_iot_count"] += 1

        if latest:
            onb_m = latest.onboarded_mpds or 0
            onl_m = min(latest.online_mpds or 0, onb_m)
            off_m = max(0, onb_m - onl_m)

            onb_t = latest.onboarded_tanks or 0
            onl_t = min(latest.online_tanks or 0, onb_t)
            off_t = max(0, onb_t - onl_t)

            a["onb_mpd"]  += onb_m
            a["onl_mpd"]  += onl_m
            a["off_mpd"]  += off_m
            a["onb_tank"] += onb_t
            a["onl_tank"] += onl_t
            a["off_tank"] += off_t

            if latest.mpd_uptime is not None:
                a["mpd_util_sum"] += latest.mpd_uptime
                a["mpd_util_cnt"] += 1
            if latest.tank_uptime is not None:
                a["tank_util_sum"] += latest.tank_uptime
                a["tank_util_cnt"] += 1

    result = []
    for key, a in areas.items():
        mpd_online_pct  = _clamp(a["onl_mpd"]  / a["onb_mpd"]  * 100) if a["onb_mpd"]  > 0 else None
        tank_online_pct = _clamp(a["onl_tank"] / a["onb_tank"] * 100) if a["onb_tank"] > 0 else None
        avg_mpd_util    = _safe(a["mpd_util_sum"]  / a["mpd_util_cnt"])  if a["mpd_util_cnt"]  > 0 else None
        avg_tank_util   = _safe(a["tank_util_sum"] / a["tank_util_cnt"]) if a["tank_util_cnt"] > 0 else None
        fully_pct       = round(a["fully_online"] / a["ro_count"] * 100) if a["ro_count"] > 0 else 0

        result.append({
            "sales_area":    key,
            "ro_count":      a["ro_count"],
            # RO Status
            "fully_online":  a["fully_online"],
            "partial":       a["partial"],
            "offline_ros":   a["offline"],
            "fully_pct":     fully_pct,
            # IoT
            "iot_count":     a["iot_count"],
            "non_iot_count": a["non_iot_count"],
            # MPD
            "onb_mpd":       a["onb_mpd"],
            "onl_mpd":       a["onl_mpd"],
            "off_mpd":       a["off_mpd"],
            "mpd_online_pct": mpd_online_pct,
            "avg_mpd_util":  avg_mpd_util,
            # Tank
            "onb_tank":      a["onb_tank"],
            "onl_tank":      a["onl_tank"],
            "off_tank":      a["off_tank"],
            "tank_online_pct": tank_online_pct,
            "avg_tank_util": avg_tank_util,
        })

    return sorted(result, key=lambda x: x["ro_count"], reverse=True)


# ── Summary KPIs ──────────────────────────────────────────────────────────
@router.get("/summary")
def get_sales_summary(db: Session = Depends(get_db)):
    """Fleet-wide KPIs for the Sales Performance module."""
    area_rows    = _area_rows(db)
    total_ros    = db.query(Site).count()
    unique_areas = db.query(func.count(func.distinct(Site.sales_area))).scalar() or 0
    if unique_areas == 0:
        unique_areas = 1

    total_onb_mpd  = sum(a["onb_mpd"]  for a in area_rows)
    total_onl_mpd  = sum(a["onl_mpd"]  for a in area_rows)
    total_off_mpd  = sum(a["off_mpd"]  for a in area_rows)
    total_onb_tank = sum(a["onb_tank"] for a in area_rows)
    total_onl_tank = sum(a["onl_tank"] for a in area_rows)
    total_off_tank = sum(a["off_tank"] for a in area_rows)

    total_fully   = sum(a["fully_online"] for a in area_rows)
    total_partial = sum(a["partial"]      for a in area_rows)
    total_offline = sum(a["offline_ros"]  for a in area_rows)
    total_iot     = sum(a["iot_count"]    for a in area_rows)

    fleet_mpd_pct  = _clamp(total_onl_mpd  / total_onb_mpd  * 100) if total_onb_mpd  > 0 else None
    fleet_tank_pct = _clamp(total_onl_tank / total_onb_tank * 100) if total_onb_tank > 0 else None

    # Avg MPD utilization (area-weighted)
    utils = [a["avg_mpd_util"] for a in area_rows if a["avg_mpd_util"] is not None]
    avg_mpd_util = round(sum(utils) / len(utils), 1) if utils else None

    return {
        "total_sales_areas":  unique_areas,
        "total_ros":          total_ros,
        "total_fully_online": total_fully,
        "total_partial":      total_partial,
        "total_offline":      total_offline,
        "iot_enabled_ros":    total_iot,
        # MPD fleet
        "total_onb_mpd":   total_onb_mpd,
        "total_onl_mpd":   total_onl_mpd,
        "total_off_mpd":   total_off_mpd,
        "fleet_mpd_pct":   fleet_mpd_pct,
        # Tank fleet
        "total_onb_tank":   total_onb_tank,
        "total_onl_tank":   total_onl_tank,
        "total_off_tank":   total_off_tank,
        "fleet_tank_pct":   fleet_tank_pct,
        # Avg utilization
        "avg_mpd_util": avg_mpd_util,
    }


@router.get("/areas")
def get_areas(db: Session = Depends(get_db)):
    """Full per-sales-area breakdown."""
    return _area_rows(db)


@router.get("/ros")
def get_ro_list(
    sales_area: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Per-RO breakdown. Optionally filter by sales_area."""
    q = db.query(Site)
    if sales_area:
        q = q.filter(Site.sales_area == sales_area)
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
            "site_id":      s.id,
            "ro_id":        s.ro_id,
            "ro_name":      s.ro_name,
            "sales_area":   s.sales_area or "Unassigned",
            "vendor_name":  s.vendor_name,
            "iot_enabled":  s.iot_enabled,
            "ro_status":    s.ro_status,
            "territory":    s.territory,
            # MPD
            "onb_mpd":      onb_m,
            "onl_mpd":      onl_m,
            "off_mpd":      off_m,
            "mpd_pct":      mpd_pct,
            "mpd_util":     _safe(latest.mpd_uptime if latest else None),
            # Tank
            "onb_tank":     onb_t,
            "onl_tank":     onl_t,
            "off_tank":     off_t,
            "tank_pct":     tank_pct,
            "tank_util":    _safe(latest.tank_uptime if latest else None),
            "last_updated": latest.timestamp.isoformat() if (latest and latest.timestamp) else None,
        })

    result.sort(key=lambda x: (
        0 if x["ro_status"] == "Offline" else 1 if x["ro_status"] == "Partially Online" else 2,
        -(x["off_mpd"] or 0),
    ))
    return result
