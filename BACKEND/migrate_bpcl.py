"""
Migration: Add BPCL-specific columns to sites and sensor_readings tables.
Run once: python migrate_bpcl.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database.db import engine

MIGRATIONS = [
    # Sites: BPCL fields
    "ALTER TABLE sites ADD COLUMN IF NOT EXISTS sales_area VARCHAR(255)",
    "ALTER TABLE sites ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255)",
    "ALTER TABLE sites ADD COLUMN IF NOT EXISTS iot_enabled BOOLEAN",
    # SensorReadings: business fields
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS water_dispensed FLOAT",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS revenue FLOAT",
    "ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS availability_pct FLOAT",
]

def run():
    with engine.connect() as conn:
        for stmt in MIGRATIONS:
            try:
                conn.execute(text(stmt))
                print(f"  OK: {stmt[:60]}...")
            except Exception as e:
                print(f"  SKIP (already exists?): {e}")
        conn.commit()
    print("\nMigration complete.")

if __name__ == "__main__":
    run()
