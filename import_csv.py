"""
RO Platform — CSV / Excel Data Importer
=========================================
Use this to import historical data from your existing spreadsheets.

USAGE:
    python import_csv.py --file "my_data.csv" --device 1
    python import_csv.py --file "my_data.xlsx" --device 1 --site 2

EXPECTED CSV COLUMNS (use any subset — all are optional except timestamp):
    timestamp, feed_pressure, permeate_tds, flow_rate, recovery_rate,
    energy_kwh, temperature, ph, mpd_uptime, tank_uptime,
    ro_online_percent, avg_mpd_online

    Column names are flexible — the script matches by keyword:
      "pressure" → feed_pressure
      "tds"      → permeate_tds
      "flow"     → flow_rate
      "recovery" → recovery_rate
      "energy"   → energy_kwh
      "temp"     → temperature
      "uptime"   → mpd_uptime
      "ro_online" or "ro online" → ro_online_percent
"""

import argparse
import csv
import json
import time
import sys
import requests
from datetime import datetime
from pathlib import Path

API_BASE = "http://localhost:8000"


def detect_column(headers: list[str], keywords: list[str]) -> str | None:
    """Find a column by matching keywords (case-insensitive)."""
    for h in headers:
        h_lower = h.lower().replace(" ", "_")
        for kw in keywords:
            if kw in h_lower:
                return h
    return None


def parse_float(val: str) -> float | None:
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def import_csv(filepath: str, device_id: int, delay: float = 0.05, dry_run: bool = False):
    path = Path(filepath)

    # Support Excel via openpyxl if available
    if path.suffix.lower() in (".xlsx", ".xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            headers = [str(h) for h in rows[0]]
            data_rows = [dict(zip(headers, [str(v) if v is not None else "" for v in r])) for r in rows[1:]]
        except ImportError:
            print("Install openpyxl to read Excel: pip install openpyxl")
            sys.exit(1)
    else:
        with open(filepath, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            data_rows = list(reader)

    if not headers:
        print("ERROR: Could not read headers from file")
        sys.exit(1)

    print(f"Detected columns: {headers}")

    # Auto-map columns
    col_map = {
        "feed_pressure":     detect_column(headers, ["pressure", "feed_p", "hp_"]),
        "permeate_tds":      detect_column(headers, ["tds", "salinity", "conductivity"]),
        "flow_rate":         detect_column(headers, ["flow", "permeate_flow", "production"]),
        "recovery_rate":     detect_column(headers, ["recovery", "rec_"]),
        "energy_kwh":        detect_column(headers, ["energy", "power", "kwh"]),
        "temperature":       detect_column(headers, ["temp", "°c", "celsius"]),
        "ph":                detect_column(headers, ["ph"]),
        "mpd_uptime":        detect_column(headers, ["mpd_uptime", "mpd uptime", "uptime"]),
        "tank_uptime":       detect_column(headers, ["tank_uptime", "tank uptime"]),
        "ro_online_percent": detect_column(headers, ["ro_online", "ro online", "online_pct", "ro%"]),
        "avg_mpd_online":    detect_column(headers, ["avg_mpd", "avg mpd"]),
        "timestamp":         detect_column(headers, ["timestamp", "datetime", "date", "time"]),
    }

    print("\nColumn mapping:")
    for field, col in col_map.items():
        print(f"  {field:25s} → {col or '(not found)'}")

    mapped_fields = [f for f, c in col_map.items() if c and f != "timestamp"]
    if not mapped_fields:
        print("\nERROR: No usable columns detected. Check your column names.")
        sys.exit(1)

    print(f"\nWill import {len(data_rows)} rows → device_id={device_id}")
    if dry_run:
        print("DRY RUN — no data will be sent\n")

    ok = 0
    errors = 0
    alarms = 0

    for i, row in enumerate(data_rows, 1):
        payload = {}
        for field, col in col_map.items():
            if col and field != "timestamp":
                val = parse_float(row.get(col, ""))
                if val is not None:
                    payload[field] = val

        if not payload:
            continue

        if dry_run:
            print(f"Row {i}: {json.dumps(payload)}")
            continue

        try:
            resp = requests.post(
                f"{API_BASE}/devices/{device_id}/reading",
                json=payload,
                timeout=10,
            )
            if resp.status_code == 201:
                ok += 1
                triggered = resp.json().get("alarms_triggered", [])
                if triggered:
                    alarms += len(triggered)
                    print(f"Row {i}: ✓  ⚠ alarm: {triggered}")
                elif i % 100 == 0:
                    print(f"Row {i}/{len(data_rows)}: {ok} sent, {errors} errors, {alarms} alarms")
            else:
                errors += 1
                print(f"Row {i}: ERROR {resp.status_code} — {resp.text[:80]}")
        except requests.RequestException as e:
            errors += 1
            print(f"Row {i}: CONNECTION ERROR — {e}")

        time.sleep(delay)

    print(f"\n{'='*50}")
    print(f"DONE: {ok} readings imported, {errors} errors, {alarms} alarms triggered")
    print(f"Open dashboard: http://localhost:5173")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import CSV/Excel data into RO Platform")
    parser.add_argument("--file",      required=True, help="Path to CSV or Excel file")
    parser.add_argument("--device",    required=True, type=int, help="Device ID to attach readings to")
    parser.add_argument("--delay",     type=float, default=0.02, help="Delay between requests (seconds)")
    parser.add_argument("--dry-run",   action="store_true", help="Preview only — do not send")
    args = parser.parse_args()

    import_csv(args.file, args.device, delay=args.delay, dry_run=args.dry_run)
