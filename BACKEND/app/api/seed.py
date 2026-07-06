import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.company import Company
from app.models.site import Site
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alarm import Alarm

router = APIRouter(prefix="/seed", tags=["Seed"])

SITE_NAMES = [
    "Al Jubail RO Plant", "Riyadh Desalination Unit", "Jeddah Seawater Plant",
    "Dammam Industrial RO", "Makkah Water Treatment", "Dubai Creek RO Station",
    "Abu Dhabi Coastal Unit", "Sharjah Municipal Plant", "Doha West Bay RO",
    "Muscat Seawater Facility", "Kuwait Bay Desalination", "Manama Industrial RO",
    "Yanbu Coastal Plant", "Tabuk RO Station", "Madinah Treatment Unit",
]

DEVICE_TYPES = ["ro_unit", "pump", "sensor", "tank", "valve", "filter"]
CITIES = [
    ("Al Jubail", "Saudi Arabia"), ("Riyadh", "Saudi Arabia"), ("Jeddah", "Saudi Arabia"),
    ("Dubai", "UAE"), ("Abu Dhabi", "UAE"), ("Doha", "Qatar"),
    ("Muscat", "Oman"), ("Kuwait City", "Kuwait"), ("Manama", "Bahrain"),
]

ALARM_MESSAGES = {
    "critical": [
        "Feed pump pressure exceeded 85 bar — emergency shutdown initiated",
        "High pressure pump failure — system offline",
        "RO membrane catastrophic breach detected",
        "Feed pressure sensor reading invalid — manual check required",
    ],
    "high": [
        "TDS sensor reading out of range: {val:.0f} ppm (threshold: 500 ppm)",
        "Permeate flow rate critically low: {val:.0f} L/h",
        "Feed water temperature high: {val:.1f}°C",
        "Pre-filter differential pressure high",
    ],
    "medium": [
        "Recovery rate below target: {val:.1f}% (target: 70%)",
        "Energy consumption elevated: {val:.2f} kWh/m³",
        "Concentrate flow rate deviation detected",
        "Cartridge filter scheduled replacement overdue",
    ],
    "low": [
        "Routine maintenance reminder: membrane cleaning due",
        "pH slightly out of optimal range: {val:.2f}",
        "Minor TDS increase trend detected",
        "Scheduled service approaching in 7 days",
    ],
}


def rand_reading():
    return {
        "feed_pressure": round(random.uniform(10, 82), 1),
        "permeate_tds": round(random.uniform(50, 480), 0),
        "flow_rate": round(random.uniform(200, 950), 0),
        "recovery_rate": round(random.uniform(52, 79), 1),
        "energy_kwh": round(random.uniform(2.1, 4.8), 2),
        "temperature": round(random.uniform(18, 42), 1),
        "ph": round(random.uniform(6.6, 8.3), 2),
        "mpd_uptime": round(random.uniform(75, 99), 1),
        "tank_uptime": round(random.uniform(80, 99), 1),
        "ro_online_percent": round(random.uniform(70, 99), 1),
        "avg_mpd_online": round(random.uniform(75, 98), 1),
    }


@router.post("/run")
def seed_database(db: Session = Depends(get_db)):
    # Clear existing demo data
    db.query(Alarm).delete()
    db.query(SensorReading).delete()
    db.query(Device).delete()
    db.query(Site).delete()
    db.query(Company).delete()
    db.commit()

    companies_created = []
    sites_created = []
    devices_created = []
    readings_created = []
    alarms_created = []

    # --- Companies ---
    company_names = ["AquaTech Solutions", "Gulf Water Systems", "Desert Pure Industries"]
    for name in company_names:
        c = Company(name=name, tier="enterprise", country="Saudi Arabia", contact_email=f"ops@{name.lower().replace(' ', '')}.com")
        db.add(c)
        db.flush()
        companies_created.append(c.id)

        # --- Sites per company ---
        for i in range(5):
            city, country = random.choice(CITIES)
            site_name = random.choice(SITE_NAMES) + f" {i+1}"
            s = Site(
                ro_id=f"RO-{c.id:02d}-{i+1:03d}",
                ro_name=site_name,
                company_id=c.id,
                city=city,
                country=country,
                capacity_m3_day=round(random.uniform(500, 5000), 0),
                status=random.choice(["active", "active", "active", "maintenance"]),
            )
            db.add(s)
            db.flush()
            sites_created.append(s.id)

            # --- Devices per site ---
            for j in range(6):
                dtype = DEVICE_TYPES[j % len(DEVICE_TYPES)]
                r = rand_reading()
                d = Device(
                    device_name=f"{dtype.replace('_', ' ').title()} {j+1}",
                    device_type=dtype,
                    site_id=s.id,
                    status=random.choice(["online", "online", "online", "offline", "maintenance"]),
                    last_heartbeat=datetime.utcnow() - timedelta(minutes=random.randint(0, 30)),
                    feed_pressure=r["feed_pressure"],
                    permeate_flow=r["flow_rate"],
                    tds_level=r["permeate_tds"],
                    recovery_rate=r["recovery_rate"],
                    energy_kwh=r["energy_kwh"],
                    uptime_pct=r["ro_online_percent"],
                )
                db.add(d)
                db.flush()
                devices_created.append(d.id)

                # --- Sensor readings (60 readings over last 30 days) ---
                for k in range(60):
                    rv = rand_reading()
                    ts = datetime.utcnow() - timedelta(hours=k * 12)
                    reading = SensorReading(
                        site_id=s.id,
                        device_id=d.id,
                        sensor_type="composite",
                        feed_pressure=rv["feed_pressure"],
                        permeate_tds=rv["permeate_tds"],
                        flow_rate=rv["flow_rate"],
                        recovery_rate=rv["recovery_rate"],
                        energy_kwh=rv["energy_kwh"],
                        temperature=rv["temperature"],
                        ph=rv["ph"],
                        mpd_uptime=rv["mpd_uptime"],
                        tank_uptime=rv["tank_uptime"],
                        ro_online_percent=rv["ro_online_percent"],
                        avg_mpd_online=rv["avg_mpd_online"],
                        timestamp=ts,
                    )
                    db.add(reading)
                    readings_created.append(1)

            # --- Alarms per site ---
            for sev in ["critical", "high", "medium", "low"]:
                count = {"critical": 1, "high": 2, "medium": 3, "low": 2}[sev]
                for _ in range(count):
                    val = random.uniform(50, 600)
                    msg_template = random.choice(ALARM_MESSAGES[sev])
                    try:
                        msg = msg_template.format(val=val)
                    except Exception:
                        msg = msg_template
                    status = random.choice(["active", "active", "acknowledged", "resolved"])
                    alarm = Alarm(
                        site_id=s.id,
                        severity=sev,
                        message=msg,
                        parameter=random.choice(["feed_pressure", "tds_level", "recovery_rate", "flow_rate"]),
                        value=round(val, 1),
                        threshold=random.choice([80.0, 500.0, 50.0, 200.0]),
                        status=status,
                        is_active=(status == "active"),
                        created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                        acknowledged_at=datetime.utcnow() - timedelta(hours=1) if status in ("acknowledged", "resolved") else None,
                        acknowledged_by="operator" if status in ("acknowledged", "resolved") else None,
                        resolved_at=datetime.utcnow() - timedelta(minutes=30) if status == "resolved" else None,
                    )
                    db.add(alarm)
                    alarms_created.append(1)

    db.commit()

    return {
        "success": True,
        "companies": len(companies_created),
        "sites": len(sites_created),
        "devices": len(devices_created),
        "readings": len(readings_created),
        "alarms": len(alarms_created),
        "message": "Database seeded with demo data successfully",
    }


@router.delete("/clear")
def clear_all_data(db: Session = Depends(get_db)):
    """Wipe ALL sites, devices, sensor readings, and alarms from the database."""
    alarms   = db.query(Alarm).delete()
    readings = db.query(SensorReading).delete()
    devices  = db.query(Device).delete()
    sites    = db.query(Site).delete()
    companies = db.query(Company).delete()
    db.commit()
    return {
        "success": True,
        "deleted": {
            "alarms":    alarms,
            "readings":  readings,
            "devices":   devices,
            "sites":     sites,
            "companies": companies,
        },
        "message": "All data cleared. Database is empty and ready for real data.",
    }
