@echo off
echo ========================================
echo   Testing QR Code & Tracking Setup
echo ========================================
echo.

cd /d "%~dp0"
cd ..

echo Step 1: Testing QR Code Generation...
node scripts\test-qr-generation.js

echo.
echo ========================================
echo Step 2: Opening test files...
echo ========================================

if exist "test-qr-code.png" (
    echo Opening QR code image...
    start test-qr-code.png
)

if exist "test-qr-inline.html" (
    echo Opening inline QR test HTML...
    start test-qr-inline.html
)

echo.
echo ========================================
echo   Setup Instructions
echo ========================================
echo.
echo 1. Make sure frontend server is running:
echo    - Open a new terminal in /frontend folder
echo    - Run: npx http-server -p 5500
echo.
echo 2. Then test your tracking URL:
echo    http://localhost:5500/src/pages/track-complaint.html?token=YOUR-TOKEN
echo.
echo 3. If QR shows in test-qr-inline.html but not in email,
echo    it's your email client blocking images. Use the direct link instead.
echo.
pause
