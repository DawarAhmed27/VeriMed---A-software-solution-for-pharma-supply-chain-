@echo off
title VeriMed Runner
echo ============================================================
echo           VeriMed Full-Stack System Runner
echo ============================================================
echo.

:: Set current directory to where the script is located
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Start Backend
echo [1/2] Starting Backend (Flask)...
start "VeriMed Backend Server" cmd /k "cd verimed-backend && venv\Scripts\activate && python run.py"

:: Give backend a second to initialize
timeout /t 2 /nobreak > nul

:: Start Frontend
echo [2/2] Starting Frontend (Vite/React)...
start "VeriMed Frontend Development" cmd /k "cd verimed-frontend && npm run dev"

echo.
echo ------------------------------------------------------------
echo SUCCESS: Both services have been launched in separate windows.
echo.
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://localhost:5173 (usually)
echo ------------------------------------------------------------
echo.
echo Keep this window open or close it. The services will keep running.
pause
