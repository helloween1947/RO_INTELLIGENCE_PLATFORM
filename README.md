# BPCL RO Network Monitoring Platform
*An automated, web-based intelligence platform for Retail Outlet (RO) Multi-Product Dispenser (MPD) and Automatic Tank Gauge (ATG) network telemetry.*

---

## 🌟 Overview

The **BPCL RO Network Monitoring Platform** is a web application designed to replace manual, error-prone spreadsheet calculations with real-time database-driven analytics. It tracks, audits, and visualizes device uptime metrics across Bharat Petroleum's retail network. 

The system enables regional managers and administrative staff to drag-and-drop vendor data logs, instantly recalculating network statistics, identifying offline hotspots, and evaluating vendor Service Level Agreements (SLAs).

---

## 🚀 Key Modules & Capabilities

### 📊 Overview Dashboard
* **Real-time KPI Tiles:** Live network summaries (Total ROs, fully/partially online counts, offline hotspots, and IoT coverage).
* **Uptime Proportions:** Symmetrical donut charts visualizing active status proportions for the **MPD Network** and **Tank (ATG) Network**.
* **Interactive Network Table:** Searchable list of all retail outlets directly integrated into the dashboard views.

### 🏭 Sites Directory
* **Inline Header Filtering:** Dropdowns built directly into the table column headers to instantly filter by *Sales Area*, *Vendor*, *MPD/Tank Offline counts*, and *Uptime categories* (Healthy $\ge 90\%$, Warning $< 90\%$, Critical $< 70\%$).
* **Direct Searches:** Find sites instantly by RO ID, Retail Outlet name, or City.

### 📈 Sales Area Wise Performance
* **Regional Segmentations:** Visualizes status distributions (Fully Online, Partial, Offline) by Sales Area.
* **Overlapping Fixes:** Steeper X-axis labels rotated to $-45^\circ$ with explicit chart heights ($320\text{px}$) to prevent text collisions.
* **Detailed Drilldowns:** Click any sales area row to instantly view the performance of individual outlets in that region.

### 🏢 Vendor Wise Performance
* **Uptime Auditing:** Grouping of absolute MPD and Tank boarded vs. online stats by supplier (e.g. PINELABS, EVIDEN, GEMS, BCT).
* **Drilldown Scorecards:** Inspect vendor performance dynamically to hold suppliers accountable to uptime SLA contracts.

### 📡 IoT Enabled vs. Non-IoT Analysis
* **Operational Gap Analysis:** Automated **MPD Online Gap** and **Tank Online Gap** calculations showing the exact performance benefit of IoT upgrades.
* **Full Comparison Matrix:** Direct side-by-side geographic metrics, including dynamic gap percentages.

---

## 🛠 Tech Stack

### Backend (FastAPI)
* **Python 3.11+ / FastAPI:** High-performance asynchronous API server.
* **SQLAlchemy 2.0:** Object-Relational Mapping (ORM).
* **SQLite:** Centralized local database storing site configurations and daily sensor readings.
* **OpenPyXL / Pandas:** Highly optimized parsing of upload spreadsheets.

### Frontend (React)
* **React 18 / React Router v6:** Single Page Application (SPA) routing.
* **Recharts:** Clean, responsive, and interactive SVG charting engine.
* **TailwindCSS & Vanilla CSS:** Modern dark-themed dashboard.

---

## ⚡ Quick Start

### 1. Start the Backend API
Navigate to the `BACKEND` directory, activate the virtual environment, and run the server:
```bash
cd BACKEND
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*Docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)*

### 2. Start the Frontend Dev Server
Navigate to the `FRONTEND` directory and run the npm script:
```bash
cd FRONTEND
npm run dev
```
*Application will be available at: [http://localhost:5173](http://localhost:5173)*

### 3. Data Ingestion
1. Go to the **Upload Data** page.
2. Drag and drop your BPCL regional Excel sheet.
3. The platform will validate, populate the relational database, and immediately update all dashboards.