@echo off
echo Starting Angular Frontend...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
call npm run dev
