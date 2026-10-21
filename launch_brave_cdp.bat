@echo off
title Brave Browser CDP Launcher (Port 9222)
echo =================================================================
echo   LAUNCHING BRAVE BROWSER ON PORT 9222 (RESTORE LAST SESSION)
echo =================================================================
echo [1/3] Closing stale background Brave instances...
taskkill /F /IM brave.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Starting Brave Browser with remote debugging...
start "" "C:\Users\LENOVO\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --restore-last-session
timeout /t 3 /nobreak >nul

echo [3/3] Checking CDP Connection...
node "%~dp0scripts\ensure_brave_cdp.cjs" --check-only

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =================================================================
    echo   [SUCCESS] BRAVE BROWSER CDP IS LIVE ON PORT 9222!
    echo =================================================================
) else (
    echo.
    echo [WARNING] Port 9222 check took longer. Running verify...
    node "%~dp0scripts\ensure_brave_cdp.cjs"
)
pause
