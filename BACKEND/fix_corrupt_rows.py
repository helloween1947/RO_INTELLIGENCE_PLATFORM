"""
Fix corrupt rows where online_mpds > onboarded_mpds or online_tanks > onboarded_tanks.
Clamps both to min(online, onboarded).
"""
import sys
sys.path.insert(0, '.')
from app.database.db import SessionLocal
from app.models.sensor_reading import SensorReading

db = SessionLocal()
try:
    all_readings = db.query(SensorReading).all()
    fixed = 0
    for r in all_readings:
        changed = False
        if r.onboarded_mpds is not None and r.online_mpds is not None:
            if r.online_mpds > r.onboarded_mpds:
                print(f"FIX mpd  site={r.site_id}: online={r.online_mpds} -> {r.onboarded_mpds} (onboarded={r.onboarded_mpds})")
                r.online_mpds = r.onboarded_mpds
                changed = True
        if r.onboarded_tanks is not None and r.online_tanks is not None:
            if r.online_tanks > r.onboarded_tanks:
                print(f"FIX tank site={r.site_id}: online={r.online_tanks} -> {r.onboarded_tanks} (onboarded={r.onboarded_tanks})")
                r.online_tanks = r.onboarded_tanks
                changed = True
        if changed:
            fixed += 1
    db.commit()
    print(f"\nFixed {fixed} rows.")
finally:
    db.close()
