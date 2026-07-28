@echo off
REM Double-click to launch the VELOCE demo site locally (Windows).
REM Keep this window open while recording. Press Ctrl+C to stop.

cd /d "%~dp0"
set PORT=8090
set NAME=VELOCE

echo.
echo   %NAME% - local server
echo   Open in your browser:  http://localhost:%PORT%
echo   Keep this window open while recording. Ctrl+C to stop.
echo.

start "" http://localhost:%PORT%
python serve.py %PORT%
