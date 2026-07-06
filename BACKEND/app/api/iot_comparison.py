"""
IoT Comparison API (BPCL RO Network)
======================================
GET /iot-comparison/summary     — KPIs: IoT vs Non-IoT counts, MPD/Tank fleet split
GET /iot-comparison/by-area     — per-sales-area IoT penetration + MPD/Tank comparison
GET /iot-comparison/by-vendor   — per-vendor IoT penetration + MPD/Tank comparison
GET /iot-comparison/performance — side-by-side IoT vs Non-IoT MPD/Tank/Status metrics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.site import Site
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/iot-comparison", tags=["IoT Comparison"])


def _clamp(v):
    if v is None:
        return None
    return max(0.0, min(100.0, round(float(v), 2)))


def _safe(v, digits=2):
    return round(float(v), digits) if v is not None else None


def _split_sites(db: Session):
    """Return (iot_sites, non_iot_sites) tuples with latest readings."""
    sites = db.query(Site).all()
    iot, non_iot = [], []
    for s in sites:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        record = {"site": s, "reading": latest}
        if s.iot_enabled is True:
            iot.append(record)
        else:
            non_iot.append(record)
    return iot, non_iot


def _fleet_metrics(records):
    """Compute MPD/Tank/RO status metrics for a list of {site, reading} records."""
    fully, partial, offline = 0, 0, 0
    onb_mpd = onl_mpd = 0
    onb_tank = onl_tank = 0
    mpd_util_sum, mpd_util_cnt = 0.0, 0
    tank_util_sum, tank_util_cnt = 0.0, 0

    for rec in records:
        s = rec["site"]
        r = rec["reading"]
        status = (s.ro_status or "").strip()
        if status == "Fully Online":
            fully += 1
        elif status == "Partially Online":
            partial += 1
        elif status == "Offline":
            offline += 1

        if r:
            om = r.onboarded_mpds or 0
            lm = min(r.online_mpds or 0, om)
            ot = r.onboarded_tanks or 0
            lt = min(r.online_tanks or 0, ot)

            onb_mpd  += om
            onl_mpd  += lm
            onb_tank += ot
            onl_tank += lt

            if r.mpd_uptime is not None:
                mpd_util_sum += r.mpd_uptime
                mpd_util_cnt += 1
            if r.tank_uptime is not None:
                tank_util_sum += r.tank_uptime
                tank_util_cnt += 1

    total = len(records)
    off_mpd  = max(0, onb_mpd  - onl_mpd)
    off_tank = max(0, onb_tank - onl_tank)

    return {
        "ro_count":      total,
        "fully_online":  fully,
        "partial":       partial,
        "offline_ros":   offline,
        "fully_pct":     round(fully  / total * 100) if total > 0 else 0,
        "partial_pct":   round(partial / total * 100) if total > 0 else 0,
        "offline_pct":   round(offline / total * 100) if total > 0 else 0,
        # MPD
        "onb_mpd":       onb_mpd,
        "onl_mpd":       onl_mpd,
        "off_mpd":       off_mpd,
        "mpd_online_pct": _clamp(onl_mpd / onb_mpd * 100) if onb_mpd > 0 else None,
        "avg_mpd_util":  _safe(mpd_util_sum / mpd_util_cnt) if mpd_util_cnt > 0 else None,
        # Tank
        "onb_tank":      onb_tank,
        "onl_tank":      onl_tank,
        "off_tank":      off_tank,
        "tank_online_pct": _clamp(onl_tank / onb_tank * 100) if onb_tank > 0 else None,
        "avg_tank_util": _safe(tank_util_sum / tank_util_cnt) if tank_util_cnt > 0 else None,
    }


@router.get("/summary")
def get_iot_summary(db: Session = Depends(get_db)):
    iot_recs, non_recs = _split_sites(db)
    total = len(iot_recs) + len(non_recs)

    im = _fleet_metrics(iot_recs)
    nm = _fleet_metrics(non_recs)

    iot_pct = round(len(iot_recs) / total * 100, 1) if total > 0 else 0

    # MPD Online% gap: IoT vs Non-IoT
    mpd_gap = None
    if im["mpd_online_pct"] is not None and nm["mpd_online_pct"] is not None:
        mpd_gap = round(im["mpd_online_pct"] - nm["mpd_online_pct"], 1)

    return {
        "total_ros":          total,
        "iot_count":          len(iot_recs),
        "non_iot_count":      len(non_recs),
        "iot_coverage_pct":   iot_pct,
        # Fleet totals
        "total_onb_mpd":      im["onb_mpd"]  + nm["onb_mpd"],
        "total_onl_mpd":      im["onl_mpd"]  + nm["onl_mpd"],
        "total_onb_tank":     im["onb_tank"] + nm["onb_tank"],
        "total_onl_tank":     im["onl_tank"] + nm["onl_tank"],
        # IoT metrics
        "iot_fully_online":   im["fully_online"],
        "iot_partial":        im["partial"],
        "iot_offline":        im["offline_ros"],
        "iot_mpd_online_pct": im["mpd_online_pct"],
        "iot_onb_mpd":        im["onb_mpd"],
        "iot_onl_mpd":        im["onl_mpd"],
        "iot_off_mpd":        im["off_mpd"],
        "iot_onb_tank":       im["onb_tank"],
        "iot_onl_tank":       im["onl_tank"],
        "iot_off_tank":       im["off_tank"],
        "iot_tank_online_pct": im["tank_online_pct"],
        # Non-IoT metrics
        "non_fully_online":   nm["fully_online"],
        "non_partial":        nm["partial"],
        "non_offline":        nm["offline_ros"],
        "non_mpd_online_pct": nm["mpd_online_pct"],
        "non_onb_mpd":        nm["onb_mpd"],
        "non_onl_mpd":        nm["onl_mpd"],
        "non_off_mpd":        nm["off_mpd"],
        "non_onb_tank":       nm["onb_tank"],
        "non_onl_tank":       nm["onl_tank"],
        "non_off_tank":       nm["off_tank"],
        "non_tank_online_pct": nm["tank_online_pct"],
        # Gap
        "mpd_online_gap":     mpd_gap,
    }


@router.get("/by-area")
def get_by_area(db: Session = Depends(get_db)):
    """Per-sales-area IoT vs Non-IoT breakdown with MPD/Tank/RO status."""
    sites = db.query(Site).all()
    areas: dict[str, dict] = {}

    for s in sites:
        key = s.sales_area or "Unassigned"
        if key not in areas:
            areas[key] = {
                "sales_area": key, "total": 0,
                "iot": 0, "non_iot": 0,
                # IoT
                "iot_fully": 0, "iot_partial": 0, "iot_offline": 0,
                "iot_onb_mpd": 0, "iot_onl_mpd": 0,
                "iot_onb_tank": 0, "iot_onl_tank": 0,
                "iot_util_sum": 0.0, "iot_util_cnt": 0,
                # Non-IoT
                "non_fully": 0, "non_partial": 0, "non_offline": 0,
                "non_onb_mpd": 0, "non_onl_mpd": 0,
                "non_onb_tank": 0, "non_onl_tank": 0,
                "non_util_sum": 0.0, "non_util_cnt": 0,
            }

        a = areas[key]
        a["total"] += 1
        is_iot = s.iot_enabled is True
        pfx = "iot" if is_iot else "non"

        a["iot" if is_iot else "non_iot"] += 1   # ← correct counter key
        status = (s.ro_status or "").strip()
        if status == "Fully Online":       a[f"{pfx}_fully"]   += 1
        elif status == "Partially Online": a[f"{pfx}_partial"]  += 1
        elif status == "Offline":          a[f"{pfx}_offline"]  += 1


        r = (
            db.query(SensorReading)
            .filter(SensorReading.site_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        if r:
            om = r.onboarded_mpds or 0
            lm = min(r.online_mpds or 0, om)
            ot = r.onboarded_tanks or 0
            lt = min(r.online_tanks or 0, ot)
            a[f"{pfx}_onb_mpd"] += om
            a[f"{pfx}_onl_mpd"] += lm
            a[f"{pfx}_onb_tank"] += ot
            a[f"{pfx}_onl_tank"] += lt
            if r.mpd_uptime is not None:
                a[f"{pfx}_util_sum"] += r.mpd_uptime
                a[f"{pfx}_util_cnt"] += 1

    result = []
    for key, a in areas.items():
        iot_pct = round(a["iot"] / a["total"] * 100) if a["total"] > 0 else 0
        iot_mpd_pct = _clamp(a["iot_onl_mpd"] / a["iot_onb_mpd"] * 100) if a["iot_onb_mpd"] > 0 else None
        non_mpd_pct = _clamp(a["non_onl_mpd"] / a["non_onb_mpd"] * 100) if a["non_onb_mpd"] > 0 else None
        iot_tank_pct = _clamp(a["iot_onl_tank"] / a["iot_onb_tank"] * 100) if a["iot_onb_tank"] > 0 else None
        non_tank_pct = _clamp(a["non_onl_tank"] / a["non_onb_tank"] * 100) if a["non_onb_tank"] > 0 else None
        iot_util    = _safe(a["iot_util_sum"] / a["iot_util_cnt"]) if a["iot_util_cnt"] > 0 else None
        non_util    = _safe(a["non_util_sum"] / a["non_util_cnt"]) if a["non_util_cnt"] > 0 else None

        result.append({
            "sales_area":     key,
            "total_ros":      a["total"],
            "iot_ros":        a["iot"],
            "non_iot_ros":    a["non_iot"],
            "iot_pct":        iot_pct,
            # IoT status
            "iot_fully":      a["iot_fully"],
            "iot_partial":    a["iot_partial"],
            "iot_offline":    a["iot_offline"],
            # Non-IoT status
            "non_fully":      a["non_fully"],
            "non_partial":    a["non_partial"],
            "non_offline":    a["non_offline"],
            # MPD
            "iot_onb_mpd":    a["iot_onb_mpd"],
            "iot_onl_mpd":    a["iot_onl_mpd"],
            "iot_off_mpd":    max(0, a["iot_onb_mpd"] - a["iot_onl_mpd"]),
            "iot_mpd_pct":    iot_mpd_pct,
            "non_onb_mpd":    a["non_onb_mpd"],
            "non_onl_mpd":    a["non_onl_mpd"],
            "non_off_mpd":    max(0, a["non_onb_mpd"] - a["non_onl_mpd"]),
            "non_mpd_pct":    non_mpd_pct,
            # Tank
            "iot_onb_tank":   a["iot_onb_tank"],
            "iot_onl_tank":   a["iot_onl_tank"],
            "iot_off_tank":   max(0, a["iot_onb_tank"] - a["iot_onl_tank"]),
            "iot_tank_pct":   iot_tank_pct,
            "non_onb_tank":   a["non_onb_tank"],
            "non_onl_tank":   a["non_onl_tank"],
            "non_off_tank":   max(0, a["non_onb_tank"] - a["non_onl_tank"]),
            "non_tank_pct":   non_tank_pct,
            # Utilization
            "iot_avg_util":   iot_util,
            "non_avg_util":   non_util,
            "mpd_gap":        round(iot_mpd_pct - non_mpd_pct, 1) if (iot_mpd_pct is not None and non_mpd_pct is not None) else None,
            "tank_gap":       round(iot_tank_pct - non_tank_pct, 1) if (iot_tank_pct is not None and non_tank_pct is not None) else None,
        })

    return sorted(result, key=lambda x: x["total_ros"], reverse=True)


@router.get("/by-vendor")
def get_by_vendor(db: Session = Depends(get_db)):
    """Per-vendor IoT vs Non-IoT count breakdown."""
    sites = db.query(Site).all()
    vendors: dict[str, dict] = {}

    for s in sites:
        key = s.vendor_name or "Unknown"
        if key not in vendors:
            vendors[key] = {"vendor": key, "total": 0, "iot": 0, "non_iot": 0}
        vendors[key]["total"] += 1
        if s.iot_enabled is True:
            vendors[key]["iot"] += 1
        else:
            vendors[key]["non_iot"] += 1

    result = []
    for key, v in vendors.items():
        result.append({
            "vendor":    key,
            "total_ros": v["total"],
            "iot_ros":   v["iot"],
            "non_iot_ros": v["non_iot"],
            "iot_pct":   round(v["iot"] / v["total"] * 100) if v["total"] > 0 else 0,
        })
    return sorted(result, key=lambda x: x["total_ros"], reverse=True)


@router.get("/performance")
def get_performance_comparison(db: Session = Depends(get_db)):
    """Side-by-side BPCL-relevant metrics: IoT vs Non-IoT."""
    iot_recs, non_recs = _split_sites(db)
    return {
        "iot":           _fleet_metrics(iot_recs),
        "non_iot":       _fleet_metrics(non_recs),
    }
