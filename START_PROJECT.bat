@echo off
title Leslie Project - Live Tunnel Runner
cd /d "%~dp0"
echo Starting Leslie Project and Permanent Ngrok Tunnel...
node start-services.js
pause
