@echo off
title RO Platform — BPCL Auto Sync (Hourly)
color 0E
echo ========================================
echo  BPCL Portal — Auto Sync every 60 min
echo  Keep this window open to keep syncing.
echo ========================================
cd /d "C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM"
"C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM\BACKEND\venv\Scripts\python.exe" bpcl_scraper.py --loop --interval 3600
pause
