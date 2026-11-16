@echo off
title No Dispute Credit Repair - Startup
echo ============================================================
echo   Starting No Dispute Credit Repair Platform
echo ============================================================
echo.

echo [1/3] Starting Local PostgreSQL (Port 5432)...
start "NDC - PostgreSQL (Port 5432)" cmd /k "cd /d "%~dp0..\api-main" && node scripts/start-postgres.js"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Unified Backend & Frontend Server (Port 5001)...
start "NDC - Web & API Server (Port 5001)" cmd /k "cd /d "%~dp0..\api-main" && node src/server.js"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Cloudflare Secure Public Tunnel...
start "NDC - Cloudflare Public Tunnel" cmd /k "cd /d "%~dp0" && start-cloudflare-tunnel.bat"

echo.
echo ============================================================
echo   All services launched successfully!
echo   - Local Web App:     http://localhost:5001
echo   - Local Backend API: http://localhost:5001/api
echo   - Cloudflare Tunnel: Check the Cloudflare window for your client's secure HTTPS URL!
echo ============================================================
pause
