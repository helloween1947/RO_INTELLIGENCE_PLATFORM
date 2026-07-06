import sys
sys.path.insert(0, '.')
from app.database.db import get_db
from app.models.sensor_reading import SensorReading
from app.models.site import Site

db = next(get_db())

bad = db.query(SensorReading).filter(
    SensorReading.online_mpds != None,
    SensorReading.onboarded_mpds != None,
    SensorReading.online_mpds > SensorReading.onboarded_mpds
).all()

print(f"Bad rows: {len(bad)}")
for r in bad:
    site = db.query(Site).filter(Site.id == r.site_id).first()
    print(f"  ro_id={site.ro_id if site else '?'} | onb_mpd={r.onboarded_mpds} online_mpd={r.online_mpds} | ro_pct={r.ro_online_percent} mpd_up={r.mpd_uptime}")
    print(f"    onb_tank={r.onboarded_tanks} online_tank={r.online_tanks}")
