import os
from fpdf import FPDF

class BPCLBenefitsReport(FPDF):
    def header(self):
        # Header banner only on page 2 and onwards
        if self.page_no() > 1:
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(124, 77, 255) # Purple
            self.cell(0, 5, "BPCL RO INTELLIGENCE PLATFORM", border=0, align="L", new_x="RIGHT", new_y="TOP")
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139) # Slate
            self.cell(0, 5, "Automated Analytics vs. Manual Excel Report", border=0, align="R", new_x="LMARGIN", new_y="NEXT")
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
            # Left aligned logo info
            self.cell(100, 10, "Bharat Petroleum Corporation Ltd. - Confidential", border=0, align="L", new_x="RIGHT", new_y="TOP")
            # Right aligned page number
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
    pdf = BPCLBenefitsReport(orientation="P", unit="mm", format="A4")
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
    pdf.cell(0, 10, "SYSTEM PERFORMANCE & BENEFITS REPORT", align="C", new_x="LMARGIN", new_y="NEXT")

    # Cover Subtitle
    pdf.set_y(52)
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(226, 232, 240)
    pdf.multi_cell(0, 6, "A Comparative Study of Automated Network Ingestion\nvs. Manual Excel Spreadsheet Calculations", align="C")

    # Meta Box at Bottom
    pdf.set_y(120)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(10, 22, 40)
    pdf.cell(0, 10, "Executive Summary & System Evaluation", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Draw a thin grey line
    pdf.set_draw_color(226, 232, 240)
    pdf.line(40, pdf.get_y() + 2, 170, pdf.get_y() + 2)
    pdf.ln(8)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    
    meta_text = (
        "This document provides a comprehensive breakdown of the Bharat Petroleum Corporation Limited "
        "Retail Outlet (RO) Monitoring Platform. It evaluates the capabilities of the automated, web-based "
        "analytics dashboard and details the strategic advantages of transitioning from manual spreadsheet "
        "methods to automated telemetry calculations."
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
    pdf.cell(0, 5, "Retail Business Unit, RO Systems Performance", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(124, 77, 255)
    pdf.cell(0, 6, "REPORT VERSION & DATE:", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5, "Platform Release v3.0  -  July 2026", align="C", new_x="LMARGIN", new_y="NEXT")

    # ==========================================
    # PAGE 2: BUSINESS EVALUATION
    # ==========================================
    pdf.add_page()
    pdf.page_title("1. Executive Summary & Core Challenge", "Evaluating spreadsheet limits in BPCL Retail Outlet telemetry analytics")
    
    pdf.body_para(
        "Bharat Petroleum Corporation Limited manages a massive network of retail outlets equipped with Multi-Product "
        "Dispensers (MPD) and Automatic Tank Gauges (ATG). Ingesting daily logs, auditing device heartbeats, and computing "
        "uptime ratios is critical for ensuring continuous retail operations and managing vendor service level agreements (SLAs)."
    )
    
    pdf.section_title("The Traditional Workflow: Manual Excel Spreadsheets")
    pdf.body_para(
        "Historically, administrators gathered daily device logs via CSV/Excel exports from various vendors and compiled "
        "them manually. While spreadsheets are convenient for initial data entry, they face severe operational limitations "
        "when used as an analytics engine for large-scale operations:"
    )
    
    pdf.body_bullet("Formula Fragility", "Excel cells depend on relative coordinates. A single deleted row or altered column position completely breaks VLOOKUP, SUMIFS, and AVERAGE formulas, leading to silent calculation errors.")
    pdf.body_bullet("Scalability Boundaries", "As the fleet grows to hundreds of sites, spreadsheets become sluggish, frequently crash, and are highly difficult to share securely across multiple departments.")
    pdf.body_bullet("No Single Source of Truth", "Multiple copies of spreadsheets ('v1', 'v2_edited', 'v3_final') circulate via emails, resulting in conflicting datasets, mismatched numbers, and an inability to track historical trends.")
    pdf.body_bullet("Manual Gap Analysis", "Calculating differences between IoT-enabled and Non-IoT sites requires writing complex macros, pivot tables, and custom scripts, creating a heavy burden on administrative staff every week.")
    
    pdf.ln(4)
    pdf.section_title("The Solution: BPCL RO Network Performance Platform")
    pdf.body_para(
        "The RO Performance Platform replaces this manual overhead with a robust, pre-compiled web application backed by an "
        "automated relational database. By standardizing the business logic inside the API server, the system allows BPCL "
        "operators to upload Excel sheets directly, instantly recalculating the entire network's analytics, gaps, and "
        "vendor scorecards in under a second."
    )

    # ==========================================
    # PAGE 3: PAGE-BY-PAGE CAPABILITIES
    # ==========================================
    pdf.add_page()
    pdf.page_title("2. Platform Modules & Features", "Detailed explanation of the web application pages and capabilities")
    
    pdf.section_title("1. Overview Dashboard")
    pdf.body_para(
        "The centralized command center that visualizes the current health of the entire RO network. It features "
        "live KPI summary tiles showing Total ROs, Online counts, IoT coverage, and dynamic percentage breakdowns. It hosts "
        "symmetrical donut charts for both the MPD Network and Tank (ATG) Network, letting operators visualize "
        "network status at a single glance. Below the charts, an interactive 'Network Table' tab shows the full list of ROs."
    )
    
    pdf.section_title("2. Sites Directory")
    pdf.body_para(
        "A highly searchable tabular index of all onboarded retail outlets. Unlike a spreadsheet where filtering requires "
        "creating custom views, the Sites page contains custom inline dropdown filters directly inside the column headers. "
        "Operators can filter instantly by Sales Area, Vendor Name, MPD Offline status, and performance thresholds (e.g. "
        "isolating sites where MPD Uptime is below 70%)."
    )

    pdf.section_title("3. Sales Wise & Vendor Wise RO Performance")
    pdf.body_para(
        "Dedicated intelligence modules that group data dynamically by geographic area or supplier. These pages compile "
        "absolute device counts (Boarded, Online, and Offline) and render them in vertical bar charts with steeper rotated labels "
        "for readability. Below the charts, the platform lists a full interactive scorecard. Users can click any Sales Area or "
        "Vendor row to instantly drill down into a list of specific ROs belonging to that group."
    )
    
    pdf.section_title("4. IoT Enabled vs. Non-IoT Analysis")
    pdf.body_para(
        "A specialized module designed to track the performance benefits of IoT deployments. The page calculates the "
        "MPD Online Gap and Tank Online Gap, demonstrating exactly how much better IoT-enabled sites perform compared to "
        "Non-IoT sites. It hosts a full comparison matrix by Sales Area, listing total RO counts, status distributions, "
        "MPD online ratios, Tank online ratios, and the direct percentage gap between the two groups."
    )
    
    pdf.section_title("5. Upload Data Center")
    pdf.body_para(
        "The ingestion gateway. Operators simply drag and drop vendor Excel spreadsheets. The backend automatically parses "
        "the worksheets, maps the columns, validates the telemetry values, updates the database, and immediately refreshes "
        "all metrics across the platform."
    )

    # ==========================================
    # PAGE 4: EXCEL VS PLATFORM COMPARISON
    # ==========================================
    pdf.add_page()
    pdf.page_title("3. Excel vs. RO Intelligence Platform", "Direct feature comparison showing operational benefits")
    
    pdf.ln(2)
    pdf.body_para(
        "The following matrix outlines the technical and operational differences between performing calculations manually in "
        "Microsoft Excel versus using the automated RO Intelligence Platform:"
    )
    pdf.ln(2)
    
    # Table headers and widths
    headers = ["Feature", "Manual Excel Process", "RO Intelligence Platform"]
    widths = [40, 75, 75]
    
    # Header Row
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(10, 22, 40)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
        pdf.cell(widths[i], 9, h, border=1, align="C", fill=True)
    pdf.ln()
    
    # Table Data
    data = [
        ["Data Entry", "Manual copy-pasting from emails & logs", "One-click drag-and-drop Excel file upload"],
        ["Human Error Risk", "High (formula breaks, deleted rows)", "Zero (server-validated business logic)"],
        ["Processing Speed", "15-30 minutes per log spreadsheet", "Instantaneous (< 1 second) processing"],
        ["Cross-Filtering", "Difficult to align across multiple sheets", "Custom column-heading filters & dropdowns"],
        ["Symmetrical Tracking", "Requires separate formulas for MPD vs Tank", "Nested database records tracked together"],
        ["Historical Trends", "Hard to compile without slowing workbook", "Maintained in DB for timeline trends"],
        ["Drill-Down Analytics", "Manual sheet filtering or pivot updates", "Interactive click-to-drill down by area/vendor"],
        ["Vendor Performance", "Difficult to group and rank vendors", "Live SLA charts & vendor comparison tables"]
    ]
    
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 41, 59)
    for r_idx, row in enumerate(data):
        # Alternate row backgrounds
        if r_idx % 2 == 0:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)
        for i, val in enumerate(row):
            # Check cell height by length
            pdf.cell(widths[i], 8, val, border=1, fill=True)
        pdf.ln()
        
    pdf.ln(8)
    pdf.section_title("Operational Uptime Impact")
    pdf.body_para(
        "By moving calculations to the web database, BPCL reduces its analytical overhead from hours to seconds. "
        "More importantly, it provides administrative staff with clean, structured, and filterable telemetry data "
        "that allows them to identify and resolve device outages immediately, directly translating to higher retail sales."
    )

    # ==========================================
    # PAGE 5: BUSINESS VALUE SUMMARIZATION
    # ==========================================
    pdf.add_page()
    pdf.page_title("4. Business Value & Recommendations", "Quantifying the return on using the RO Intelligence Platform")
    
    pdf.section_title("Key Value Drivers")
    pdf.body_bullet("95% Time Efficiency Improvement", "Manual spreadsheet compilation that previously took hours of weekly effort is now handled instantly upon data upload, freeing up regional managers to focus on maintenance SLAs.")
    pdf.body_bullet("Proactive Offline Hotspot Detection", "Instead of discovering outages at the end of the week, the 'Offline Hotspots' tab automatically highlights faulty MPDs and Tanks immediately, enabling prompt maintenance dispatches.")
    pdf.body_bullet("Objective Vendor SLA Auditing", "The platform groups MPD and Tank online ratios by Vendor (e.g. PINELABS, EVIDEN, GEMS, BCT). This gives BPCL procurement officers unalterable, data-backed reports to hold vendors accountable to their uptime contracts.")
    pdf.body_bullet("Centralized Security & Collaboration", "The platform runs on a local/cloud dev server. Anyone with access can view the exact same statistics simultaneously, avoiding spreadsheet version-control conflicts.")
    
    pdf.ln(4)
    pdf.section_title("Technical Architecture Highlights")
    pdf.body_para(
        "The system is built using modern, lightweight, and scalable technologies designed for maximum responsiveness:"
    )
    pdf.body_bullet("FastAPI Backend", "Asynchronous Python web server that performs rapid database queries, aggregates telemetry counts, and handles file uploads securely.")
    pdf.body_bullet("React Frontend", "Responsive UI dashboard using clean styled components and Recharts. Ticks are rotated to -45 degrees with reserved space to ensure charts are readable at any resolution.")
    pdf.body_bullet("Centralized Relational Database", "Stores site details, vendors, sales areas, and historical sensor readings, preserving a clean history for future trend forecasting.")

    pdf.ln(6)
    pdf.set_draw_color(124, 77, 255)
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(10, pdf.get_y(), 190, 25, "DF")
    
    pdf.set_y(pdf.get_y() + 3)
    pdf.set_x(15)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(10, 22, 40)
    pdf.cell(0, 5, "Recommendation:", align="L", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    rec_text = (
        "BPCL managers should deprecate local Excel trackers for daily reporting and enforce the "
        "RO Intelligence Platform as the single system of record. Weekly regional meetings should utilize "
        "the live 'IoT Enabled vs Non-IoT' analysis to drive network upgrade decisions."
    )
    pdf.set_x(15)
    pdf.multi_cell(180, 5, rec_text)

    # Save to disk
    output_filename = "C:\\Users\\marka\\OneDrive\\Documents\\BPCL\\RO MONITORING PLATFORM\\BPCL_RO_Intelligence_Benefits_Report.pdf"
    pdf.output(output_filename)
    print(f"PDF successfully generated at: {output_filename}")

if __name__ == "__main__":
    create_report()
