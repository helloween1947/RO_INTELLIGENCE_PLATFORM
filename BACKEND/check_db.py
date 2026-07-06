































import sys
sys.path.insert(0, '.')
from app.database.db import get_db
from app.models.sensor_reading import SensorReading
from app.models.site import Site

db = next(get_db())

# Check first 10 readings
readings = db.query(SensorReading).limit(20).all()
print("=== Sample SensorReadings ===")
for r in readings:
    site = db.query(Site).filter(Site.id == r.site_id).first()
    print(f"Site: {site.ro_id if site else '?':15s} | onb_mpd={r.onboarded_mpds} online_mpd={r.online_mpds} | ro_online_pct={r.ro_online_percent} | mpd_uptime={r.mpd_uptime}")

# Check if any online_mpds > onboarded_mpds
bad = db.query(SensorReading).filter(
    SensorReading.online_mpds != None,
    SensorReading.onboarded_mpds != None,
    SensorReading.online_mpds > SensorReading.onboarded_mpds
).count()
print(f"\nReadings where online_mpds > onboarded_mpds: {bad}")

# Show max ro_online_percent
from sqlalchemy import func
max_pct = db.query(func.max(SensorReading.ro_online_percent)).scalar()
min_pct = db.query(func.min(SensorReading.ro_online_percent)).scalar()
print(f"ro_online_percent range: {min_pct} to {max_pct}")

# Show mpd_uptime range
max_up = db.query(func.max(SensorReading.mpd_uptime)).scalar()
min_up = db.query(func.min(SensorReading.mpd_uptime)).scalar()
print(f"mpd_uptime range: {min_up} to {max_up}")
