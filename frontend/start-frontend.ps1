# SecureVoice Frontend Server Starter
# Run this script from PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SecureVoice Frontend Server Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location "D:\Study\crime-reporting-system\frontend"

Write-Host "Current directory: $PWD" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting HTTP server on port 5500..." -ForegroundColor Green
Write-Host ""
Write-Host "Once started, you can access:" -ForegroundColor White
Write-Host "  - Homepage: http://localhost:5500/" -ForegroundColor White
Write-Host "  - Test Page: http://localhost:5500/test-qr-tracking.html" -ForegroundColor White
Write-Host "  - Tracking: http://localhost:5500/src/pages/track-complaint.html?token=YOUR-TOKEN" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start http-server from the root directory (./)
npx http-server ./ -p 5500 -c-1 --cors
