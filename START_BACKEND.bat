@echo off
title RO Platform — Backend API (port 8000)
color 0A
echo ========================================
echo  RO Monitoring Platform — Backend API
echo  Docs: http://localhost:8000/docs
echo ========================================
cd /d "C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM\BACKEND"
"C:\Users\marka\OneDrive\Documents\BPCL\RO MONITORING PLATFORM\BACKEND\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
