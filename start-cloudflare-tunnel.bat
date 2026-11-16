@echo off
title Cloudflare Live Link Runner
echo ========================================================
echo   Starting Cloudflare Live Link for Local PC Services
echo ========================================================
echo.
node "%~dp0bin\cli.js" -p 5001
pause
