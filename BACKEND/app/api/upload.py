"""
Excel / CSV Upload Router
=========================
POST /upload/excel  — accepts .xlsx, .xls, .csv
Parses the file, auto-maps columns, creates sites/devices as needed,
stores sensor readings, and returns an import summary.
"""

from __future__ import annotations

import io
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.site import Site

router = APIRouter(prefix="/upload", tags=["Upload"])


# ── Column keyword → our field name ─────────────────────────────────────────
# Keywords are matched as substrings (case-insensitive) against column names
COLUMN_KEYWORDS: dict[str, list[str]] = {
    "ro_id":            ["ro id", "ro_id", "retail id", "outlet id", "site id", "site_id", "ro no", "ro no."],
    "ro_name":          ["retail outlet", "outlet name", "ro name", "ro_name", "site name", "outlet"],
    "onboarded_mpds":   ["on-boarded mpd", "onboarded mpd", "mpd boarded", "no. of on-boarded mpd",
                         "no of on-boarded mpd", "on boarded mpd", "total mpd", "# mpd"],
    "online_mpds":      ["online mpd", "no. of online mpd", "no of online mpd", "mpd online count"],
    "onboarded_tanks":  ["on-boarded tank", "onboarded tank", "tank boarded", "no. of on-boarded tank",
                         "no of on-boarded tank", "on boarded tank", "total tank", "# tank"],
    "online_tanks":     ["online tank", "no. of online tank", "no of online tank", "tank online count"],
    "mpd_uptime":       ["mpd utilization", "mpd util", "avg uptime", "avg. uptime"],
    "ro_online_percent":["mpd online%", "mpd online %", "mpd online"],
    "avg_mpd_online":   ["avg mpd online", "avg. mpd online", "average mpd online"],
    "tank_uptime":      ["tank utilization", "tank util", "atg util"],
    "tank_online_pct":  ["tank online%", "tank online %", "tank online"],
    "avg_tank_online":  ["avg tank online", "avg. tank online", "average tank online"],
    "feed_pressure":    ["feed pressure", "pressure"],
    "permeate_tds":     ["tds", "permeate tds", "conductivity"],
    "flow_rate":        ["flow rate", "flow", "permeate flow", "production"],
    "recovery_rate":    ["recovery rate", "recovery"],
    "energy_kwh":       ["energy", "kwh", "power"],
    "temperature":      ["temp", "temperature", "\u00b0c"],
    "ph":               ["ph"],
    # BPCL Sales Area / Vendor / IoT fields
    "sales_area":       ["sales area", "sales_area", "territory", "region", "area name", "area"],
    "vendor_name":      ["vendor", "vendor name", "service provider", "iot vendor", "agency", "operator"],
    "iot_enabled":      ["iot enabled", "iot status", "iot", "connected", "iot flag"],
    "water_dispensed":  ["water dispensed", "dispensed", "water sold", "kl dispensed", "volume",
                         "total volume", "water volume", "dispensed (kl)", "water (kl)"],
    "revenue":          ["revenue", "amount", "sales value", "collection", "income",
                         "revenue (rs)", "revenue (inr)", "rev."],
    "availability_pct": ["availability", "availability%", "avail%", "ro availability",
                         "system availability", "avail"],
    "ro_status":        ["ro status", "rostatus", "ros online", "outlet status",
                         "status", "roo status"],
    "territory":        ["territory", "territories"],
    "state":            ["state"],
    "region":           ["region"],
}

# All keywords flattened — used to score rows when finding the real header row
ALL_KEYWORDS = [kw for kws in COLUMN_KEYWORDS.values() for kw in kws]


def find_header_row(raw_df: pd.DataFrame) -> int:
    """
    Scan the first 15 rows of a raw (no header) DataFrame to find which row
    is the real column header row — it will contain the most keyword matches.
    Returns the 0-based row index to use as `header=` in pd.read_excel.
    """
    best_row   = 0
    best_score = 0

    for row_idx in range(min(15, len(raw_df))):
        row_vals = [str(v).lower().strip() for v in raw_df.iloc[row_idx].values if pd.notna(v)]
        score = 0
        for cell in row_vals:
            for kw in ALL_KEYWORDS:
                if kw in cell:
                    score += 1
                    break
            # Extra points for known exact BPCL column names
            if cell in ("ro id", "retail outlet", "mpd online%", "tank online%",
                        "no. of online mpds", "no. of on-boarded mpds",
                        "no. of online tanks", "no. of on-boarded tanks"):
                score += 5
        if score > best_score:
            best_score = score
            best_row   = row_idx

    return best_row


def load_dataframe(content: bytes, ext: str) -> pd.DataFrame:
    """
    Load Excel/CSV into DataFrame, automatically detecting the real header row.
    """
    if ext == "csv":
        # Try to find the header row in CSV
        raw = pd.read_csv(io.BytesIO(content), header=None, encoding="utf-8-sig", nrows=15)
        header_row = find_header_row(raw)
        return pd.read_csv(io.BytesIO(content), header=header_row, encoding="utf-8-sig")
    else:
        # Read raw first (no header) to scan
        raw = pd.read_excel(io.BytesIO(content), header=None, engine="openpyxl", nrows=15)
        header_row = find_header_row(raw)
        return pd.read_excel(io.BytesIO(content), header=header_row, engine="openpyxl")


def detect_columns(df_columns: list[str]) -> dict[str, str | None]:
    """Map our field names to actual Excel column names."""
    cols_lower = {c.lower().strip(): c for c in df_columns}
    mapping: dict[str, str | None] = {}
    for field, keywords in COLUMN_KEYWORDS.items():
        found = None
        for kw in keywords:
            for col_lower, col_original in cols_lower.items():
                if kw in col_lower:
                    found = col_original
                    break
            if found:
                break
        mapping[field] = found
    return mapping


def parse_num(val, as_int: bool = False) -> float | int | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        v = float(str(val).replace("%", "").replace(",", "").strip())
        return int(v) if as_int else v
    except (ValueError, TypeError):
        return None


def parse_pct(val) -> float | None:
    """Parse a percentage value.
    Handles both:
      - Already-percentage format: 88.4  → 88.4
      - Decimal-fraction format:   0.884 → 88.4  (Excel stores % as 0-1 decimal)
    """
    v = parse_num(val)
    if v is None:
        return None
    # If value is in 0-1 range it is a decimal fraction — scale to 0-100
    if 0.0 <= v <= 1.0:
        return round(v * 100, 2)
    return v


def get_or_create_site(db: Session, ro_id: str, ro_name: str) -> Site:
    ro_id = str(ro_id).strip()
    ro_name = str(ro_name).strip() if ro_name else ro_id

    site = db.query(Site).filter(Site.ro_id == ro_id).first()
    if not site:
        site = Site(ro_id=ro_id, ro_name=ro_name, status="active")
        db.add(site)
        db.flush()
    return site


def get_or_create_device(db: Session, site: Site) -> Device:
    device = db.query(Device).filter(Device.site_id == site.id).first()
    if not device:
        device = Device(
            site_id=site.id,
            device_name=f"{site.ro_name} — Main Unit",
            device_type="ro_unit",
            status="online",
            last_heartbeat=datetime.utcnow(),
        )
        db.add(device)
        db.flush()
    return device


@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    site_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload an Excel (.xlsx/.xls) or CSV file.
    Columns are auto-detected by keyword matching.
    Each row becomes a sensor reading. Sites/devices are created if not found.
    """
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(status_code=400, detail="Only .xlsx, .xls, and .csv files are supported.")

    content = await file.read()

    # Parse into DataFrame — auto-detects real header row
    try:
        df = load_dataframe(content, ext)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if df.empty:
        raise HTTPException(status_code=422, detail="File is empty or has no data rows.")

    # Auto-detect column mapping
    col_map = detect_columns(list(df.columns))
    mapped_fields = [f for f, c in col_map.items() if c]

    # Must have at least ro_id to identify which site each row belongs to
    if not col_map.get("ro_id"):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Could not find an 'RO ID' column. "
                f"Columns found: {', '.join(str(c) for c in df.columns[:10])}. "
                f"Make sure your Excel has a column named 'RO ID' or 'Retail ID'."
            ),
        )

    inserted   = 0
    skipped    = 0
    sites_created   = 0
    devices_created = 0

    # Cache existing sites and devices in memory to prevent N+1 queries
    existing_sites = {s.ro_id: s for s in db.query(Site).all()}
    existing_devices = {d.site_id: d for d in db.query(Device).all()}

    for _, row in df.iterrows():
        try:
            # ── Resolve site ──────────────────────────────────────────────
            if site_id:
                site = db.query(Site).filter(Site.id == site_id).first()
                if not site:
                    skipped += 1
                    continue
            else:
                raw_ro_id   = row.get(col_map.get("ro_id"),   None)  if col_map.get("ro_id")   else None
                raw_ro_name = row.get(col_map.get("ro_name"), None)  if col_map.get("ro_name") else None

                if raw_ro_id is None or pd.isna(raw_ro_id):
                    skipped += 1
                    continue

                ro_id_str = str(raw_ro_id).strip()
                if ro_id_str.lower() in ("", "total", "grand total", "nan"):
                    continue

                ro_name_str = str(raw_ro_name).strip() if raw_ro_name and not pd.isna(raw_ro_name) else ro_id_str

                if ro_id_str in existing_sites:
                    site = existing_sites[ro_id_str]
                else:
                    site = Site(ro_id=ro_id_str, ro_name=ro_name_str, status="active")
                    db.add(site)
                    db.flush()
                    existing_sites[ro_id_str] = site
                    sites_created += 1

            # ── Enrich site with BPCL metadata fields ─────────────────────
            def str_val(field: str) -> Optional[str]:
                col = col_map.get(field)
                if not col:
                    return None
                raw = row.get(col)
                if raw is None or (isinstance(raw, float) and pd.isna(raw)):
                    return None
                return str(raw).strip() or None

            # Update site-level BPCL fields if present in this file
            sales_area_val = str_val("sales_area")
            if sales_area_val and not site.sales_area:
                site.sales_area = sales_area_val

            vendor_val = str_val("vendor_name")
            if vendor_val and not site.vendor_name:
                site.vendor_name = vendor_val

            iot_col = col_map.get("iot_enabled")
            if iot_col and site.iot_enabled is None:
                raw_iot = row.get(iot_col)
                if raw_iot is not None and not (isinstance(raw_iot, float) and pd.isna(raw_iot)):
                    s = str(raw_iot).strip().lower()
                    site.iot_enabled = s in ("yes", "true", "1", "enabled", "y", "iot")

            # Always update these from the latest file
            if sales_area_val:
                site.sales_area = sales_area_val
            if vendor_val:
                site.vendor_name = vendor_val

            # RO Status (Fully Online / Partially Online / Offline)
            ro_status_col = col_map.get("ro_status")
            if ro_status_col:
                raw_status = row.get(ro_status_col)
                if raw_status and not (isinstance(raw_status, float) and pd.isna(raw_status)):
                    site.ro_status = str(raw_status).strip()

            # Territory / State / Region
            for field in ("territory", "state", "region"):
                col = col_map.get(field)
                if col:
                    raw = row.get(col)
                    if raw and not (isinstance(raw, float) and pd.isna(raw)):
                        setattr(site, field, str(raw).strip())

            # ── Resolve device ────────────────────────────────────────────
            if site.id in existing_devices:
                device = existing_devices[site.id]
            else:
                device = Device(
                    site_id=site.id,
                    device_name=f"{site.ro_name} - Main Unit",
                    device_type="ro_unit",
                    status="online",
                    last_heartbeat=datetime.utcnow(),
                )
                db.add(device)
                db.flush()
                existing_devices[site.id] = device
                devices_created += 1

            # ── Build reading payload ─────────────────────────────────────
            def v(field: str, as_int: bool = False):
                col = col_map.get(field)
                return parse_num(row.get(col) if col else None, as_int=as_int) if col else None

            def p(field: str):
                """Use parse_pct: handles both 88.4 and 0.884 → 88.4"""
                col = col_map.get(field)
                return parse_pct(row.get(col) if col else None) if col else None

            onboarded_mpds  = v("onboarded_mpds",  as_int=True)
            online_mpds     = v("online_mpds",      as_int=True)
            onboarded_tanks = v("onboarded_tanks",  as_int=True)
            online_tanks    = v("online_tanks",     as_int=True)

            # Clamp online ≤ onboarded — source data can sometimes have mismatches
            if onboarded_mpds is not None and online_mpds is not None:
                online_mpds = min(online_mpds, onboarded_mpds)
            if onboarded_tanks is not None and online_tanks is not None:
                online_tanks = min(online_tanks, onboarded_tanks)

            reading = SensorReading(
                site_id=site.id,
                device_id=device.id,
                sensor_type="excel_import",
                timestamp=datetime.utcnow(),
                # Counts
                onboarded_mpds=onboarded_mpds,
                online_mpds=online_mpds,
                offline_mpds=(
                    max(0, onboarded_mpds - online_mpds)
                    if onboarded_mpds is not None and online_mpds is not None
                    else None
                ),
                onboarded_tanks=onboarded_tanks,
                online_tanks=online_tanks,
                offline_tanks=(
                    max(0, onboarded_tanks - online_tanks)
                    if onboarded_tanks is not None and online_tanks is not None
                    else None
                ),
                # Percentages — use p() to handle decimal-fraction Excel values
                mpd_uptime=p("mpd_uptime"),
                ro_online_percent=p("ro_online_percent"),
                avg_mpd_online=p("avg_mpd_online"),
                tank_uptime=p("tank_uptime"),
                tank_online_pct=p("tank_online_pct"),
                avg_tank_online=p("avg_tank_online"),
                # Physical sensors
                feed_pressure=v("feed_pressure"),
                permeate_tds=v("permeate_tds"),
                flow_rate=v("flow_rate"),
                recovery_rate=v("recovery_rate"),
                energy_kwh=v("energy_kwh"),
                temperature=v("temperature"),
                ph=v("ph"),
                # BPCL business fields
                water_dispensed=v("water_dispensed"),
                revenue=v("revenue"),
                availability_pct=p("availability_pct"),
            )
            db.add(reading)
            inserted += 1

        except Exception:
            skipped += 1

    db.commit()

    return {
        "success": True,
        "filename": filename,
        "total_rows": len(df),
        "imported": inserted,
        "skipped": skipped,
        "sites_created": sites_created,
        "devices_created": devices_created,
        "columns_detected": {f: c for f, c in col_map.items() if c},
        "message": f"Successfully imported {inserted} readings from {filename}",
    }


@router.post("/columns-preview")
async def preview_columns(file: UploadFile = File(...)):
    """Return column names and first 3 rows without importing."""
    content = await file.read()
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    try:
        df = load_dataframe(content, ext)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    col_map = detect_columns(list(df.columns))
    return {
        "columns": list(df.columns),
        "detected_mapping": {f: c for f, c in col_map.items() if c},
        "row_count": len(df),
        "preview": df.head(3).fillna("").astype(str).to_dict(orient="records"),
    }
