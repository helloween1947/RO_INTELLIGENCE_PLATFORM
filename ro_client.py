"""
RO Platform — Data Ingestion Client
====================================
Drop this file into your existing data collection script.
Call send_reading() whenever you have a new sensor reading.

Usage:
    from ro_client import send_reading, get_device_id

    device_id = get_device_id("Site Name", "Device Name")
    send_reading(device_id, feed_pressure=62.4, tds_level=185, flow_rate=720)
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"   # change if hosted remotely


def get_sites():
    """List all sites — use to find your site_id."""
    resp = requests.get(f"{API_BASE}/sites/")
    return resp.json()


def get_devices(site_id=None):
    """List devices — optionally filter by site."""
    params = {"site_id": site_id} if site_id else {}
    resp = requests.get(f"{API_BASE}/devices/", params=params)
    return resp.json()


def get_device_id(site_name: str, device_name: str) -> int | None:
    """
    Find a device_id by matching site name + device name.
    Run this once to discover your device IDs.
    """
    sites = get_sites()
    for site in sites:
        if site_name.lower() in site["ro_name"].lower():
            devices = get_devices(site_id=site["id"])
            for d in devices:
                if device_name.lower() in d["device_name"].lower():
                    print(f"Found: {d['device_name']} (ID={d['id']}) at {site['ro_name']}")
                    return d["id"]
    print(f"Not found: {site_name} / {device_name}")
    return None


def send_reading(
    device_id: int,
    feed_pressure: float = None,       # bar  (0–85)
    permeate_tds: float = None,        # ppm  (0–600)
    flow_rate: float = None,           # L/h
    recovery_rate: float = None,       # %    (0–100)
    energy_kwh: float = None,          # kWh
    temperature: float = None,         # °C
    ph: float = None,                  # pH
    mpd_uptime: float = None,          # %
    tank_uptime: float = None,         # %
    ro_online_percent: float = None,   # %
    avg_mpd_online: float = None,      # %
) -> dict:
    """
    Send a sensor reading to the platform.
    Only include fields you actually have — all are optional.
    Returns the API response including any alarms triggered.
    """
    payload = {k: v for k, v in {
        "feed_pressure":    feed_pressure,
        "permeate_tds":     permeate_tds,
        "flow_rate":        flow_rate,
        "recovery_rate":    recovery_rate,
        "energy_kwh":       energy_kwh,
        "temperature":      temperature,
        "ph":               ph,
        "mpd_uptime":       mpd_uptime,
        "tank_uptime":      tank_uptime,
        "ro_online_percent": ro_online_percent,
        "avg_mpd_online":   avg_mpd_online,
    }.items() if v is not None}

    resp = requests.post(f"{API_BASE}/devices/{device_id}/reading", json=payload)
    result = resp.json()

    if resp.status_code == 201:
        ts = datetime.now().strftime("%H:%M:%S")
        alarms = result.get("alarms_triggered", [])
        print(f"[{ts}] ✓ Reading sent (device {device_id})"
              + (f" — ⚠ ALARMS: {alarms}" if alarms else ""))
    else:
        print(f"Error {resp.status_code}: {result}")

    return result


def create_alarm(site_id: int, severity: str, message: str,
                 parameter: str = None, value: float = None,
                 threshold: float = None, device_id: int = None) -> dict:
    """Manually push an alarm to the platform."""
    payload = {
        "site_id": site_id,
        "severity": severity,       # critical / high / medium / low
        "message": message,
        "parameter": parameter,
        "value": value,
        "threshold": threshold,
        "device_id": device_id,
    }
    resp = requests.post(f"{API_BASE}/alarms/", json={k: v for k, v in payload.items() if v is not None})
    return resp.json()


# ─── EXAMPLE: run this file directly to test the connection ───────────────────
if __name__ == "__main__":

    # 1. List your sites
    print("=== YOUR SITES ===")
    for s in get_sites():
        print(f"  ID={s['id']}  {s['ro_name']}  ({s['city']}, {s['country']})")

    print("\n=== YOUR DEVICES (first site) ===")
    sites = get_sites()
    if sites:
        for d in get_devices(site_id=sites[0]["id"]):
            print(f"  ID={d['id']}  {d['device_name']}  [{d['device_type']}]  status={d['status']}")

    # 2. Send a test reading to device ID 1
    print("\n=== SENDING TEST READING ===")
    result = send_reading(
        device_id=1,
        feed_pressure=58.3,
        permeate_tds=210,
        flow_rate=680,
        recovery_rate=71.2,
        energy_kwh=3.1,
        temperature=29.5,
        ro_online_percent=95.0,
    )
    print(json.dumps(result, indent=2, default=str))
