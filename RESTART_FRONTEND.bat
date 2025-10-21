@echo off
echo Stopping frontend...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" 2>nul

echo Clearing Angular cache...
if exist .angular\cache rmdir /s /q .angular\cache

echo Starting frontend...
start "Frontend Server" cmd /k "npm run dev"

echo Done! Frontend restarted with cleared cache.
pause
