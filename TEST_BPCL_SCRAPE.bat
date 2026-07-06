@echo off
title RO Platform — BPCL Data Sync (Test Run)
color 0E
echo ========================================
echo  BPCL Portal — Test Scrape (VISIBLE)
echo  A browser will open. Log in manually.
echo  Then press ENTER in this window.
echo ========================================
cd /d "C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM"
"C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM\BACKEND\venv\Scripts\python.exe" bpcl_scraper.py --once --visible
pause
