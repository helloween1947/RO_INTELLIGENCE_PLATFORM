import os
from fpdf import FPDF

class BPCLCodeReport(FPDF):
    def header(self):
        # Header banner only on page 2 and onwards
        if self.page_no() > 1:
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(124, 77, 255) # Purple
            self.cell(0, 5, "BPCL RO INTELLIGENCE PLATFORM - TECHNICAL DOCUMENT", border=0, align="L", new_x="RIGHT", new_y="TOP")
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139) # Slate
            self.cell(0, 5, "Backend & Frontend Code Walkthrough", border=0, align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(226, 232, 240)
            self.set_line_width(0.5)
            self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
            self.ln(6)

    def footer(self):
        # Footer on all pages except the cover page
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(148, 163, 184)
            self.cell(100, 10, "BPCL RO Network Performance Project - Technical Documentation", border=0, align="L", new_x="RIGHT", new_y="TOP")
            self.cell(0, 10, f"Page {self.page_no()}", border=0, align="R", new_x="LMARGIN", new_y="NEXT")

    def page_title(self, text, subtitle=None):
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(10, 22, 40) # Primary Deep Navy
        self.cell(0, 10, text, align="L", new_x="LMARGIN", new_y="NEXT")
        if subtitle:
            self.set_font("Helvetica", "I", 10)
            self.set_text_color(100, 116, 139) # Slate
            self.cell(0, 6, subtitle, align="L", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 229, 255) # Cyan Accent
        self.set_line_width(1.2)
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(8)

    def section_title(self, text):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(124, 77, 255) # Purple Secondary
        self.cell(0, 8, text, align="L", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_para(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59) # Slate-800
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def body_bullet(self, title, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(15, 23, 42)
        self.write(6, f"  *  {title}: ")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.write(6, f"{text}\n")
        self.ln(1)

def create_report():
    pdf = BPCLCodeReport(orientation="P", unit="mm", format="A4")
    pdf.set_margins(10, 15, 10)
    pdf.set_auto_page_break(auto=True, margin=15)

    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    pdf.add_page()
    
    # Large Decorative top bar
    pdf.set_fill_color(10, 22, 40) # Primary Navy
    pdf.rect(0, 0, 210, 85, "F")
    
    # Cyan accent bar
    pdf.set_fill_color(0, 229, 255) # Cyan
    pdf.rect(0, 85, 210, 5, "F")

    # Cover Title
    pdf.set_y(25)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, "BPCL RO NETWORK PLATFORM", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(0, 229, 255)
    pdf.cell(0, 10, "CODEBASE & ARCHITECTURE REPORT", align="C", new_x="LMARGIN", new_y="NEXT")

    # Cover Subtitle
    pdf.set_y(52)
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(226, 232, 240)
    pdf.multi_cell(0, 6, "A Technical Walkthrough of key code blocks\nin the FastAPI Backend and React Frontend", align="C")

    # Meta Box at Bottom
    pdf.set_y(120)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(10, 22, 40)
    pdf.cell(0, 10, "System Architecture & Core Source Code Analysis", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Draw a thin grey line
    pdf.set_draw_color(226, 232, 240)
    pdf.line(40, pdf.get_y() + 2, 170, pdf.get_y() + 2)
    pdf.ln(8)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    
    meta_text = (
        "This report delivers a deep technical breakdown of the source code powering the BPCL Retail Outlet "
        "Monitoring Platform. It covers database configurations, REST API endpoints, analytical computation "
        "logic in Python, React routing structures, dynamic inline filters, and chart rendering modules."
    )
    pdf.set_x(25)
    pdf.multi_cell(160, 6, meta_text, align="C")

    # Metadata Panel
    pdf.set_y(230)
    pdf.set_fill_color(248, 250, 252) # Light blue-grey
    pdf.rect(20, 225, 170, 45, "F")
    
    pdf.set_y(228)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(124, 77, 255)
    pdf.cell(0, 6, "ORGANIZATION:", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5, "Bharat Petroleum Corporation Limited (BPCL)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, "RO Monitoring Platform Software Development Team", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(124, 77, 255)
    pdf.cell(0, 6, "DOCUMENT RELEASE & DATE:", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5, "Developer Reference Guide v1.0  -  July 2026", align="C", new_x="LMARGIN", new_y="NEXT")

    # ==========================================
    # PAGE 2: BACKEND ARCHITECTURE & MODELS
    # ==========================================
    pdf.add_page()
    pdf.page_title("1. Backend Architecture & Database Models", "Evaluating database schema mapping and REST API core structures")
    
    pdf.section_title("Database Connection (app/database/db.py)")
    pdf.body_para(
        "The application configures a centralized SQLite engine (which can be seamlessly swapped to PostgreSQL for production). "
        "It sets up a SQLAlchemy declarative base and local session generator: \n"
        "  - engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})\n"
        "  - SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)\n"
        "  - Base = declarative_base()"
    )
    
    pdf.section_title("Data Models (app/models/)")
    pdf.body_para(
        "Four primary models are mapped to the relational database tables to track the BPCL retail structure: \n"
        "  - Site (models/site.py): Represents individual retail outlets. Contains fields for ro_id (unique string code, "
        "e.g., '110023'), ro_name, sales_area, vendor_name, location coordinates, capacity, and active status.\n"
        "  - Device (models/device.py): Represents hardware modules (e.g. pumps, ATGs, sensors) associated with a site. "
        "Maps device status (online, offline, maintenance), feed pressure, permeate flow, and energy stats.\n"
        "  - SensorReading (models/sensor_reading.py): Stores telemetry metrics. It holds onboarded_mpds, online_mpds, "
        "onboarded_tanks, online_tanks, and historical percentages. The database indexes this table by timestamp to ensure fast queries."
    )
    
    pdf.section_title("Backend Routing (app/main.py)")
    pdf.body_para(
        "The API server initializes a FastAPI app with cross-origin resource sharing (CORS) enabled so the React dev "
        "server can request data. It mounts routers for sites, devices, sensor readings, and IoT comparison: \n"
        "  - app.include_router(sites.router, prefix='/sites', tags=['Sites'])\n"
        "  - app.include_router(iot_comparison.router, prefix='/iot-comparison', tags=['IoT Comparison'])"
    )

    # ==========================================
    # PAGE 3: BACKEND TELEMETRY CALCULATION
    # ==========================================
    pdf.add_page()
    pdf.page_title("2. Backend Telemetry & Comparison Logic", "Source code review of the core analytical calculations")
    
    pdf.section_title("Dynamic Area Grouping (app/api/iot_comparison.py)")
    pdf.body_para(
        "The /iot-comparison/by-area endpoint calculates device percentages and gaps across all geographic areas. "
        "For each site, the code loads the latest sensor telemetry, aggregates MPD and Tank counts, and updates the group stats:"
    )
    
    pdf.body_para(
        "  # Aggregation loop in Python:\n"
        "  for s in sites:\n"
        "      key = s.sales_area or 'Unassigned'\n"
        "      if key not in areas:\n"
        "          areas[key] = { ... }\n"
        "      pfx = 'iot' if s.iot_enabled is True else 'non'\n"
        "      # Fetch latest reading\n"
        "      r = db.query(SensorReading).filter(SensorReading.site_id == s.id).order_by(SensorReading.timestamp.desc()).first()\n"
        "      if r:\n"
        "          areas[key][f'{pfx}_onb_mpd'] += r.onboarded_mpds or 0\n"
        "          areas[key][f'{pfx}_onl_mpd'] += r.online_mpds or 0\n"
        "          areas[key][f'{pfx}_onb_tank'] += r.onboarded_tanks or 0\n"
        "          areas[key][f'{pfx}_onl_tank'] += r.online_tanks or 0"
    )
    
    pdf.section_title("Gap Calculations")
    pdf.body_para(
        "After grouping the raw telemetry numbers, the endpoint computes percentages and comparison metrics for both groups:\n"
        "  - iot_mpd_pct = (iot_onl_mpd / iot_onb_mpd) * 100\n"
        "  - non_mpd_pct = (non_onl_mpd / non_onb_mpd) * 100\n"
        "  - mpd_gap = iot_mpd_pct - non_mpd_pct\n"
        "  - tank_gap = iot_tank_pct - non_tank_pct\n"
        "The calculated data is sorted in descending order based on the total number of outlets in each area, "
        "and is sent to the frontend as a clean JSON payload."
    )

    # ==========================================
    # PAGE 4: FRONTEND PAGE ROUTING & STATE
    # ==========================================
    pdf.add_page()
    pdf.page_title("3. Frontend Architecture & Page Shell", "Technical breakdown of React routing, API services, and page layouts")
    
    pdf.section_title("React Shell & Lazy Loading (src/App.jsx)")
    pdf.body_para(
        "The App.jsx file sets up the layout shell with a persistent sidebar navigation and lazy-loads the page components "
        "within a React Suspense block. Pages are rendered dynamically based on the URL path:\n"
        "  - <Route path='/dashboard' element={<Dashboard />} />\n"
        "  - <Route path='/sites' element={<Sites />} />\n"
        "  - <Route path='/iot-comparison' element={<IoTComparison />} />"
    )
    
    pdf.section_title("API client (src/services/api.js)")
    pdf.body_para(
        "Communication with the backend uses a standardized Axios client. Endpoints return data asynchronously:\n"
        "  - export const getSites = () => axios.get(`${API_BASE}/sites/`);\n"
        "  - export const getFleetStatus = () => axios.get(`${API_BASE}/dashboard/fleet-status`);\n"
        "  - export const getIoTByArea = () => axios.get(`${API_BASE}/iot-comparison/by-area`);"
    )
    
    pdf.section_title("Shared Card Component (src/components/)")
    pdf.body_para(
        "Uptime statistics are rendered in a shared component. It takes labels, onboarded, and online props, calculates "
        "percentages, and renders a colored progress bar indicating performance: \n"
        "  - const pct = onboarded > 0 ? Math.round((online / onboarded) * 100) : 0;\n"
        "  - return (<div className='card'><div className='pct-bar' style={{ width: `${pct}%` }} /></div>)"
    )

    # ==========================================
    # PAGE 5: DYNAMIC FILTERS & GRAPH RESOLUTION
    # ==========================================
    pdf.add_page()
    pdf.page_title("4. Heading Filters & Chart Styling Code", "Implementing column filters and preventing label overlaps in Recharts")
    
    pdf.section_title("Dynamic Header Filters (src/pages/Sites.jsx)")
    pdf.body_para(
        "To allow operators to search and filter outlets right inside the table headers, the Sites page uses React state "
        "variables coupled with a useMemo filtering hook. Dropdowns are populated dynamically from unique values in the data:"
    )
    pdf.body_para(
        "  const uniqueAreas = useMemo(() => {\n"
        "    return Array.from(new Set(sites.map(s => s.sales_area).filter(Boolean))).sort();\n"
        "  }, [sites]);\n\n"
        "  const filtered = useMemo(() => {\n"
        "    return sites.filter(s => {\n"
        "      if (selectedArea && s.sales_area !== selectedArea) return false;\n"
        "      if (selectedVendor && s.vendor_name !== selectedVendor) return false;\n"
        "      const offMpd = s.onboarded_mpds - s.online_mpds;\n"
        "      if (mpdOfflineOnly && offMpd === 0) return false;\n"
        "      return true;\n"
        "    });\n"
        "  }, [sites, selectedArea, selectedVendor, mpdOfflineOnly]);"
    )
    
    pdf.section_title("Overlapping Label & Legend Fixes")
    pdf.body_para(
        "Long Sales Area names (e.g. 'Calcutta - 5 Retail') would overlap horizontally and collide with the chart legends. "
        "This is fixed in all charts using steeper rotations, reserved vertical spacing, and pushed legend alignments:\n"
        "  - ResponsiveContainer height is expanded to 320px.\n"
        "  - <XAxis dataKey='name' angle={-45} textAnchor='end' height={80} interval={0} />\n"
        "  - <Legend verticalAlign='bottom' height={36} wrapperStyle={{ paddingTop: 10 }} />\n"
        "Setting height={80} on the XAxis reserves exactly 80 pixels for the tilted labels. This forces Recharts "
        "to draw the Legend below the reserved space, resolving all overlap issues."
    )

    # Save to disk
    output_filename = "C:\\Users\\marka\\OneDrive\\Documents\\BPCL\\RO MONITORING PLATFORM\\BPCL_RO_Intelligence_Code_Report.pdf"
    pdf.output(output_filename)
    print(f"PDF successfully generated at: {output_filename}")

if __name__ == "__main__":
    create_report()
