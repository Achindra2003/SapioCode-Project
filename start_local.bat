@echo off
title SapioCode — Local Test Launcher
color 0A
echo.
echo  ============================================
echo    SapioCode — Local Development Launcher
echo  ============================================
echo.

:: ── Resolve script directory ──
set "ROOT=%~dp0"
set "AUTH=%ROOT%backend\auth"
set "AI=%ROOT%backend\ai"
set "FE=%ROOT%frontend"

:: ── Pre-flight checks ──
echo  [CHECK] Verifying tools...

python --version >nul 2>&1
if errorlevel 1 (
    echo  [FAIL]  Python not found in PATH
    pause & exit /b 1
)
echo          Python ... OK

node --version >nul 2>&1
if errorlevel 1 (
    echo  [FAIL]  Node.js not found in PATH
    pause & exit /b 1
)
echo          Node.js ... OK

:: ── Kill any lingering processes on our ports ──
echo.
echo  [CLEAN] Freeing ports 8000, 8003, 3001 ...
for %%P in (8000 8003 3001) do (
    for /f "tokens=5" %%A in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING 2^>nul') do (
        taskkill /PID %%A /F >nul 2>&1
    )
)
echo          Done.

:: ── Ensure .env.local points to localhost ──
echo.
echo  [ENV]   Checking frontend\.env.local ...
if not exist "%FE%\.env.local" (
    echo          .env.local not found — copying from .env.example
    echo          IMPORTANT: Edit frontend\.env.local and fill in your API keys!
    copy "%FE%\.env.example" "%FE%\.env.local" >nul
    echo.
    echo # Local dev overrides >> "%FE%\.env.local"
    echo NEXT_PUBLIC_AUTH_API_URL=http://localhost:8000 >> "%FE%\.env.local"
    echo NEXT_PUBLIC_AI_API_URL=http://localhost:8003/api >> "%FE%\.env.local"
    echo AI_API_URL=http://localhost:8003/api >> "%FE%\.env.local"
) else (
    echo          OK — using existing .env.local
)

:: ── Check backend .env files ──
if not exist "%AUTH%\.env" (
    echo  [WARN]  backend\auth\.env not found — copy .env.example and fill in values!
    copy "%AUTH%\.env.example" "%AUTH%\.env" >nul
)
if not exist "%AI%\.env" (
    echo  [WARN]  backend\ai\.env not found — copy .env.example and fill in values!
    copy "%AI%\.env.example" "%AI%\.env" >nul
)

:: ── Install dependencies (quick / quiet) ──
echo.
echo  [DEPS]  Installing Python deps — Auth Backend...
pip install -r "%AUTH%\requirements.txt" -q 2>nul
echo          Done.

echo  [DEPS]  Installing Python deps — AI Backend...
pip install -r "%AI%\requirements.txt" -q 2>nul
echo          Done.

echo  [DEPS]  Installing Node deps — Frontend...
cd /d "%FE%"
call npm install --silent 2>nul
echo          Done.
cd /d "%ROOT%"

:: ── Start services in separate windows ──
echo.
echo  ============================================
echo    Launching 3 services...
echo  ============================================
echo.

:: 1) Auth Backend — port 8000
echo  [1/3]  Auth Backend  →  http://localhost:8000
start "SapioCode — Auth (8000)" cmd /k "title Auth Backend & color 0B & cd /d %AUTH% & echo. & echo  Auth Backend starting on port 8000... & echo. & python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Give auth a head-start (frontend may call it on load)
timeout /t 3 /nobreak >nul

:: 2) AI Backend — port 8003
echo  [2/3]  AI Backend    →  http://localhost:8003
start "SapioCode — AI (8003)" cmd /k "title AI Backend & color 0D & cd /d %AI% & echo. & echo  AI Backend starting on port 8003... & echo. & python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload"

timeout /t 3 /nobreak >nul

:: 3) Frontend — port 3001
echo  [3/3]  Frontend      →  http://localhost:3001
start "SapioCode — Frontend (3001)" cmd /k "title Frontend & color 0E & cd /d %FE% & echo. & echo  Frontend starting on port 3001... & echo. & npx next dev -p 3001"

:: ── Wait for services to be ready ──
echo.
echo  Waiting for services to boot...
timeout /t 6 /nobreak >nul

:: ── Health checks ──
echo.
echo  ============================================
echo    Health Checks
echo  ============================================

:: Auth health
curl -s -o nul -w "  Auth Backend (8000):  HTTP %%{http_code}\n" http://localhost:8000/docs 2>nul || echo   Auth Backend (8000):  starting...

:: AI health
curl -s -o nul -w "  AI Backend   (8003):  HTTP %%{http_code}\n" http://localhost:8003/health 2>nul || echo   AI Backend   (8003):  starting...

echo.
echo  ============================================
echo    All services launched!
echo  ============================================
echo.
echo    Auth Backend:  http://localhost:8000
echo    AI Backend:    http://localhost:8003
echo    Frontend:      http://localhost:3001
echo.
echo    API Docs:      http://localhost:8000/docs
echo    AI Health:     http://localhost:8003/health
echo.
echo  ────────────────────────────────────────────
echo    Press any key to open the app in browser.
echo    Close this window anytime — services
echo    keep running in their own terminals.
echo  ────────────────────────────────────────────
pause >nul

start http://localhost:3001

echo.
echo  Browser opened. You can close this window.
timeout /t 3 /nobreak >nul
