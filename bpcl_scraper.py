"""
BPCL RA Analytics Portal — Live Data Scraper v2
=================================================
PURPOSE: Scrapes the "RO Wise Equipment Hourly Performance Monitoring Report"
         and syncs every row into your RO Monitoring Platform.

WHAT IT CAPTURES (from the screenshot columns):
  RO ID, Retail Outlet, RA Vendor, Auto BSP, Selling Status, IOT Enabled,
  No. of On-Boarded MPDs, No. of Online MPDs,
  MPD Utilization%, Avg MPD Utilization%, MPD Online%, Avg MPD Online%,
  No. of On-Boarded Tanks, No. of Online Tanks,
  Tank Utilization%, Avg Tank Utilization%, Tank Online%

SETUP (one time):
    Run in your project folder (with venv active):
    pip install playwright
    playwright install chromium

RUN:
    python bpcl_scraper.py --once              → single fetch now
    python bpcl_scraper.py --loop              → fetch every hour
    python bpcl_scraper.py --once --visible    → show the browser window
"""

import argparse
import time
import requests
import sys
from datetime import datetime

# ── CONFIG — edit these ───────────────────────────────────────────────────────
PORTAL_URL  = "https://neohos.bpclcloud9.com"
REPORT_URL  = "https://neohos.bpclcloud9.com/root/reports/66c7b585aeb6-4d13-aa4b-06df8642e65a"
USERNAME    = "sakshirani"   # ← your login
PASSWORD    = ""             # ← your password
API_BASE    = "http://localhost:8000"
# ─────────────────────────────────────────────────────────────────────────────

def ts():
    return datetime.now().strftime("%H:%M:%S")

def log(msg):
    print(f"[{ts()}] {msg}")


def parse_pct(val):
    """'95%' / '95.0' / 95 → float"""
    if val is None: return None
    try: return float(str(val).replace("%","").replace(",","").strip())
    except: return None


def parse_int(val):
    try: return int(str(val).replace(",","").strip())
    except: return None


# ── Sync to API ───────────────────────────────────────────────────────────────

_site_cache   = {}   # ro_id → site_id
_device_cache = {}   # site_id → device_id

def get_or_create_site(ro_id: str, ro_name: str) -> int | None:
    if ro_id in _site_cache:
        return _site_cache[ro_id]
    try:
        sites = requests.get(f"{API_BASE}/sites/", timeout=8).json()
        for s in sites:
            if s.get("ro_id") == ro_id:
                _site_cache[ro_id] = s["id"]
                return s["id"]
        # Create new site
        r = requests.post(f"{API_BASE}/site", json={"ro_id": ro_id, "ro_name": ro_name}, timeout=8)
        if r.status_code in (200, 201):
            site_id = r.json()["id"]
            _site_cache[ro_id] = site_id
            log(f"  + Created site: {ro_name} [{ro_id}]")
            return site_id
    except Exception as e:
        log(f"  site error: {e}")
    return None


def get_device_for_site(site_id: int) -> int | None:
    if site_id in _device_cache:
        return _device_cache[site_id]
    try:
        devices = requests.get(f"{API_BASE}/devices/", params={"site_id": site_id}, timeout=8).json()
        if devices:
            _device_cache[site_id] = devices[0]["id"]
            return devices[0]["id"]
    except Exception as e:
        log(f"  device lookup error: {e}")
    return None


def push_row(row: dict) -> bool:
    """Take one BPCL table row and push it as a sensor reading."""
    ro_id   = str(row.get("RO ID", "")).strip()
    ro_name = str(row.get("Retail Outlet", "Unknown Outlet")).strip()

    if not ro_id or ro_id.lower() in ("", "total", "grand total"):
        return False

    site_id = get_or_create_site(ro_id, ro_name)
    if not site_id:
        return False

    device_id = get_device_for_site(site_id)
    if not device_id:
        return False

    def pct(val):
        if val is None: return None
        try: return float(str(val).replace("%","").replace(",","").strip())
        except: return None

    def cnt(val):
        if val is None: return None
        try: return int(str(val).replace(",","").strip())
        except: return None

    # Integer counts from BPCL table
    onboarded_mpds  = cnt(row.get("No. of On-Boarded MPDs"))
    online_mpds     = cnt(row.get("No. of Online MPDs"))
    onboarded_tanks = cnt(row.get("No. of On-Boarded Tanks"))
    online_tanks    = cnt(row.get("No. of Online Tanks"))

    payload = {
        # Counts
        "onboarded_mpds":  onboarded_mpds,
        "online_mpds":     online_mpds,
        "offline_mpds":    (onboarded_mpds - online_mpds) if onboarded_mpds is not None and online_mpds is not None else None,
        "onboarded_tanks": onboarded_tanks,
        "online_tanks":    online_tanks,
        "offline_tanks":   (onboarded_tanks - online_tanks) if onboarded_tanks is not None and online_tanks is not None else None,
        # Percentages
        "mpd_uptime":        pct(row.get("MPD Utilization%")),
        "ro_online_percent": pct(row.get("MPD Online%")),
        "avg_mpd_online":    pct(row.get("Avg MPD Online%")) or pct(row.get("Avg MPD Utilization%")),
        "tank_uptime":       pct(row.get("Tank Utilization%")),
        "tank_online_pct":   pct(row.get("Tank Online%")),
        "avg_tank_online":   pct(row.get("Avg Tank Online%")) or pct(row.get("Avg Tank Utilization%")),
    }

    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    if not payload:
        return False

    try:
        r = requests.post(f"{API_BASE}/devices/{device_id}/reading", json=payload, timeout=8)
        return r.status_code == 201
    except Exception as e:
        log(f"  push error: {e}")
        return False


# ── Playwright Scraper ─────────────────────────────────────────────────�        # ─── Step 1: Open portal or go straight to report ───────────────
        log(f"Opening report: {REPORT_URL}")
        page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2000)

        # ─── Step 2: Login if needed ─────────────────────────────────────
        needs_login = "login" in page.url.lower() or bool(page.query_selector('input[type="password"]'))

        if needs_login and not headless:
            log(">>> BROWSER OPEN — Please log in to the BPCL portal now.")
            log(">>> Navigate to the report if needed, then come back here.")
            input("    Press ENTER once the report table is VISIBLE → ")
            # Don't navigate — user is already on the report. Just wait for it to stabilise.
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                pass
            page.wait_for_timeout(3000)
            log(f"Current URL: {page.url}")

        elif needs_login and headless:
            log("Logging in automatically...")
            for sel in ['input[name="username"]', '#username', 'input[placeholder*="user" i]']:
                try:
                    page.fill(sel, USERNAME, timeout=2000)
                    break
                except: pass
            try:
                page.fill('input[type="password"]', PASSWORD, timeout=5000)
            except: pass
            for sel in ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")']:
                try:
                    page.click(sel, timeout=2000)
                    break
                except: pass
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                pass
            # Navigate to report after login
            log(f"Navigating to report after login...")
            page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(5000)
            log(f"After login — URL: {page.url}")
        else:
            # Already on the right page (session still active)
            log(f"Already authenticated — URL: {page.url}")
            page.wait_for_timeout(3000)pt: pass
            try:
                page.fill('input[type="password"]', PASSWORD, timeout=5000)
            except: pass
            for sel in ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")']:
                try:
                    page.click(sel, timeout=2000)
                    break
                except: pass
            page.wait_for_load_state("networkidle", timeout=20000)
            log(f"After login — URL: {page.url}")

        # ─── Step 3: Navigate to report ─────────────────────────────────
        log(f"Loading report...")
        page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(4000)  # let JS render the table

        # ─── Step 4: Wait for table ──────────────────────────────────────
        table_selectors = ["table", ".ag-root", '[role="grid"]', ".tabulator-table"]
        table_found = False
        for sel in table_selectors:
            try:
                page.wait_for_selector(sel, timeout=8000)
                table_found = True
                log(f"Table found with selector: {sel}")
                break
            except PWTimeout:
                pass

        if not table_found:
            log("Table not found — saving debug screenshot + HTML")
            page.screenshot(path="bpcl_debug.png")
            with open("bpcl_debug.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            log("Saved bpcl_debug.png and bpcl_debug.html — open them to inspect")
            browser.close()
            return []

        # ─── Step 5: Scroll to load all rows (virtual scroll) ───────────
        log("Loading all rows (scrolling)...")
        table_el = page.query_selector("table, .ag-root, [role='grid']")
        if table_el:
            for _ in range(10):
                page.keyboard.press("End")
                page.wait_for_timeout(500)

        # ─── Step 6: Extract headers ─────────────────────────────────────
        headers = page.evaluate("""() => {
            // Try standard HTML table
            const ths = document.querySelectorAll('table th');
            if (ths.length > 0) return Array.from(ths).map(t => t.innerText.trim());
            // Try AG-Grid
            const agCols = document.querySelectorAll('.ag-header-cell-text');
            if (agCols.length > 0) return Array.from(agCols).map(t => t.innerText.trim());
            // Try any columnheader role
            const roles = document.querySelectorAll('[role="columnheader"]');
            if (roles.length > 0) return Array.from(roles).map(t => t.innerText.trim());
            return [];
        }""")
        headers = [h for h in headers if h]
        log(f"Headers ({len(headers)}): {headers}")

        # ─── Step 7: Extract rows ─────────────────────────────────────────
        raw_rows = page.evaluate("""() => {
            // Standard HTML table
            const trs = document.querySelectorAll('table tbody tr');
            if (trs.length > 0) {
                return Array.from(trs).map(tr =>
                    Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
                );
            }
            // AG-Grid rows
            const agRows = document.querySelectorAll('.ag-row');
            if (agRows.length > 0) {
                return Array.from(agRows).map(row =>
                    Array.from(row.querySelectorAll('.ag-cell')).map(c => c.innerText.trim())
                );
            }
            return [];
        }""")

        log(f"Raw rows extracted: {len(raw_rows)}")
        for row_cells in raw_rows:
            if len(row_cells) >= 2 and headers:
                row = {headers[i]: row_cells[i]
                       for i in range(min(len(headers), len(row_cells)))}
                rows.append(row)

        # Take a screenshot for confirmation
        page.screenshot(path="bpcl_success.png")
        log(f"Screenshot saved: bpcl_success.png")
        browser.close()

    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def run_once(headless: bool = True):
    log("=" * 55)
    log("BPCL → RO Platform sync started")

    rows = scrape(headless=headless)

    if not rows:
        log("No rows extracted. Check bpcl_debug.html / bpcl_debug.png")
        return 0

    # Show sample
    if rows:
        log(f"\nSample first row: {rows[0]}\n")

    pushed = 0
    failed = 0
    for row in rows:
        ok = push_row(row)
        if ok:
            pushed += 1
        else:
            failed += 1

    log(f"\n✓ DONE: {pushed} readings pushed to platform, {failed} skipped/failed")
    log(f"  Dashboard → http://localhost:5173")
    return pushed


def run_loop(interval: int = 3600, headless: bool = True):
    log(f"Scheduler started — running every {interval//60} minutes")
    run = 0
    while True:
        run += 1
        log(f"\n{'='*55}\nRun #{run}")
        run_once(headless=headless)
        log(f"Sleeping {interval}s until next run...")
        time.sleep(interval)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--once",    action="store_true", help="Fetch once and exit")
    g.add_argument("--loop",    action="store_true", help="Fetch on repeat")
    ap.add_argument("--interval", type=int, default=3600, help="Seconds between runs (default 3600)")
    ap.add_argument("--visible",  action="store_true",   help="Show browser window (for debugging)")
    args = ap.parse_args()

    headless = not args.visible

    if args.once:
        run_once(headless=headless)
    else:
        run_loop(interval=args.interval, headless=headless)
