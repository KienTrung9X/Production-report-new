@echo off
echo Stopping backend...
taskkill /F /FI "WINDOWTITLE eq Starting Python Backend API*" 2>nul
timeout /t 2 /nobreak >nul
echo Starting backend...
start "Backend API" cmd /k "cd /d %~dp0 && python api.py"
echo Backend restarted!
