from app.database.db import engine
from sqlalchemy import text

alters = [
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS onboarded_mpds  INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS online_mpds     INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS offline_mpds    INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS onboarded_tanks INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS online_tanks    INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS offline_tanks   INTEGER",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS avg_tank_online FLOAT",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS tank_online_pct FLOAT",
]

with engine.connect() as conn:
    for sql in alters:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"OK: {sql}")
        except Exception as e:
            print(f"SKIP: {e}")

print("\nMigration complete.")
