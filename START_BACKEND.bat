@echo off
echo ========================================
echo Starting Python Backend API
echo ========================================
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting Flask server on http://localhost:5000
echo Press Ctrl+C to stop
echo.
python api.py
