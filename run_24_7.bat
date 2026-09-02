@echo off
title UpStore 24/7 Indestructible Promoter Engine
cls
echo ================================================================
echo    UpStore 24/7 Autonomous Promotion Engine - Auto-Supervisor
echo ================================================================
echo Mode: Indestructible 24/7 Loop (Will auto-restart if interrupted)
echo Press Ctrl+C twice if you want to permanently exit.
echo ================================================================
echo.

:loop
echo [%DATE% %TIME%] Launching Promotion Server...
python -u scripts/smart_telegram_promoter.py

echo.
echo [Supervisor Notice] Script exited or paused. Auto-recovering in 3 seconds...
timeout /t 3 /nobreak >nul
echo.
goto loop
