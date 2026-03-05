@echo off
echo ========================================
echo   SapioCode Unified - Stopping Services
echo ========================================
echo.

echo Stopping all Python servers (uvicorn)...
taskkill /f /im python.exe 2>nul
if errorlevel 1 (
    echo   No Python processes found
) else (
    echo   Python processes stopped
)

echo.
echo Stopping all Node.js servers...
taskkill /f /im node.exe 2>nul
if errorlevel 1 (
    echo   No Node.js processes found
) else (
    echo   Node.js processes stopped
)

echo.
echo ========================================
echo   All services stopped!
echo ========================================
echo.
pause
