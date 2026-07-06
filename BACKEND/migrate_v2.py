"""Add ro_status, territory, state, region columns to sites table."""
import sys
sys.path.insert(0, '.')
from app.database.db import engine
from sqlalchemy import text

new_cols = [
    ("ro_status",   "VARCHAR(100)"),
    ("territory",   "VARCHAR(255)"),
    ("state",       "VARCHAR(100)"),
    ("region",      "VARCHAR(100)"),
]

with engine.connect() as conn:
    for col, typ in new_cols:
        try:
            conn.execute(text(f"ALTER TABLE sites ADD COLUMN {col} {typ}"))
            print(f"  Added: sites.{col}")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  Skip (exists): sites.{col}")
            else:
                print(f"  ERROR on {col}: {e}")
    conn.commit()
print("Migration complete.")
