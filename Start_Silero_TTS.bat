@echo off

REM === Encoding Fixes ===
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set PYTHONLEGACYWINDOWSSTDIO=utf-8

title Silero TTS Studio - Diagnostic Mode

echo ============================================================
echo   Silero TTS Studio - Starting...
echo ============================================================
echo.

cd /d "E:\Project\silero"

echo Starting Flask server...
echo.
echo URL: http://localhost:5000
echo.
echo Press Ctrl+C to stop.
echo ============================================================
echo.

python app.py

pause
