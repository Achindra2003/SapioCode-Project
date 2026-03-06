@echo off
echo ========================================
echo   SapioCode Unified - Starting Services
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/6] Installing Python dependencies for Auth Backend...
cd backend\auth
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] Failed to install auth backend dependencies
    pause
    exit /b 1
)
echo       Done!

echo [2/6] Installing Python dependencies for AI Backend...
cd ..\ai
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] Failed to install AI backend dependencies
    pause
    exit /b 1
)
echo       Done!

echo [3/6] Installing Node.js dependencies for Frontend...
cd ..\..\frontend
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo       Done!

cd ..

echo.
echo ========================================
echo   Starting Services (3 terminals)
echo ========================================
echo.

:: Start Auth Backend
echo [4/6] Starting Auth Backend on port 8000...
start "SapioCode - Auth Backend (Port 8000)" cmd /k "cd /d %~dp0backend\auth && python -m uvicorn main:app --reload --port 8000"
timeout /t 2 /nobreak >nul

:: Start AI Backend
echo [5/6] Starting AI Backend on port 8003...
start "SapioCode - AI Backend (Port 8003)" cmd /k "cd /d %~dp0backend\ai && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8003"
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [6/6] Starting Frontend on port 3000...
start "SapioCode - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Auth Backend:  http://localhost:8000
echo   AI Backend:    http://localhost:8003
echo   Frontend:      http://localhost:3000
echo.
echo   Press any key to open the app in browser...
pause >nul

start http://localhost:3000

echo.
echo Press any key to close this window (services will keep running)...
pause >nul
