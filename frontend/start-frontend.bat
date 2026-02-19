@echo off
echo ========================================
echo   SecureVoice Frontend Server Starter
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.
echo Starting HTTP server on port 5500...
echo.
echo Once started, you can access:
echo   - Homepage: http://localhost:5500/
echo   - Test Page: http://localhost:5500/test-qr-tracking.html
echo   - Tracking: http://localhost:5500/src/pages/track-complaint.html?token=YOUR-TOKEN
echo.
echo Press Ctrl+C to stop the server
echo.

npx http-server ./ -p 5500 -c-1
