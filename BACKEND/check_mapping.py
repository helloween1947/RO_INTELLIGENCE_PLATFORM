import sys
sys.path.insert(0, '.')
from app.api.upload import COLUMN_KEYWORDS, detect_columns

excel_cols = ['RO ID', 'Retail Outlet', 'RA Vendor', 'Sales Area', 'Territory', 'State',
              'State Office', 'Region', 'Auto RSP', 'Selling Status', 'IOT Enabled',
              'No. of On-Boarded MPDs', 'No. of Online MPDs', 'MPD Utilization %',
              'Avg MPD Utilization %', 'MPD Online%', 'Avg MPD Online%',
              'No. of On-Boarded Tanks', 'No. of Online Tanks', 'Tank Utilization %',
              'Avg Tank Utilization%', 'Tank Online%', 'Avg Tank Online%',
              'Avg RO Utilization %', 'Avg RO Online %', 'ROs Online', 'RO Status',
              'MPD configuration mismatch ', 'Tank configuration mismatch ']

mapping = detect_columns(excel_cols)
for field, col in mapping.items():
    if col:
        print(f'  {field:25s} -> "{col}"')
    else:
        print(f'  {field:25s} -> NOT MAPPED')
