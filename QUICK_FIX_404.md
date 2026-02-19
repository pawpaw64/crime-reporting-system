# 🔧 Quick Fix for 404 Error

## Problem
Getting 404 error: `GET /src/pages/track-complaint.html?token=... Error (404): "Not found"`

## Root Cause
The http-server is not started from the correct directory OR it's running from the wrong folder.

## ✅ SOLUTION - Follow These Steps:

### Step 1: Stop Any Existing Server on Port 5500

Open a **NEW PowerShell terminal** and run:

```powershell
# Find process using port 5500
Get-NetTCPConnection -LocalPort 5500 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

Or simply close any terminal/process that might be running http-server.

### Step 2: Start Frontend Server Correctly

**Option A: Using the Batch Script (Easiest)**
```cmd
# Double-click this file:
frontend\start-frontend.bat
```

**Option B: Manual Start**
```powershell
# Open PowerShell
cd D:\Study\crime-reporting-system\frontend
npx http-server -p 5500 -c-1
```

You should see:
```
Starting up http-server, serving ./
Available on:
  http://127.0.0.1:5500
  http://192.168.x.x:5500
```

### Step 3: Test the Tracking URL

Open your browser and go to:
```
http://localhost:5500/src/pages/track-complaint.html?token=6f5c9919-1b51-4e45-aa07-97082ea1244d
```

**Expected Result:** ✅ Tracking page loads with complaint details

### Step 4: Verify File Structure

If still getting 404, verify the file exists:
```powershell
Test-Path D:\Study\crime-reporting-system\frontend\src\pages\track-complaint.html
```

Should return: `True`

---

## 🎨 About the QR Code in Email

**The QR code IS working!** ✅ We tested it (6790 character data URL generated successfully).

**Why you see a broken image:**
- Email clients (Gmail, Outlook, etc.) often block inline images for security
- The QR code is embedded as a data URL which some email clients don't display

**Solutions:**

### Solution 1: Use the Direct Link (RECOMMENDED)
The email also contains a "Track Complaint Status" button. Click that instead of scanning the QR code.

### Solution 2: Test if QR Works in Browser
Open the test file that was generated:
```
D:\Study\crime-reporting-system\backend\test-qr-inline.html
```

If the QR code shows there (it should), then the generation works - it's just your email client blocking it.

### Solution 3: Save QR as Image File
We can modify the system to:
1. Save QR code as a PNG file in `/uploads` folder
2. Attach it to the email instead of embedding inline
3. Host it via the backend server

Let me know if you want me to implement this!

---

## 📋 Quick Checklist

- [ ] Stopped any server on port 5500
- [ ] Started http-server from the `frontend` folder
- [ ] Server shows "Available on: http://127.0.0.1:5500"
- [ ] Tracking URL works: `http://localhost:5500/src/pages/track-complaint.html?token=...`
- [ ] Backend server is running on port 3000
- [ ] Database has the tracking token

---

## 🧪 Testing Commands

### Test if Frontend Server is Working:
```
http://localhost:5500/
```
Should show your homepage.

### Test if Tracking Page Exists:
```
http://localhost:5500/src/pages/track-complaint.html
```
Should show "No tracking token provided" error (which is correct).

### Test with Your Token:
```
http://localhost:5500/src/pages/track-complaint.html?token=6f5c9919-1b51-4e45-aa07-97082ea1244d
```
Should load complaint details.

### Test Backend API Directly:
```
http://localhost:3000/api/track/6f5c9919-1b51-4e45-aa07-97082ea1244d
```
Should return JSON with complaint data.

---

## 💡 Pro Tips

1. **Keep Both Servers Running:**
   - Backend: `npm run dev` in `/backend` folder (port 3000)
   - Frontend: `npx http-server -p 5500` in `/frontend` folder (port 5500)

2. **Use Separate Terminals:**
   - Terminal 1 → Backend
   - Terminal 2 → Frontend

3. **Bookmark Test Page:**
   ```
   http://localhost:5500/test-qr-tracking.html
   ```
   This lets you easily test QR codes and tracking.

---

## Still Having Issues?

Run the diagnostic batch file:
```cmd
backend\test-qr-tracking.bat
```

This will:
- Test QR generation
- Open test files
- Show you what to check

Or share the error message and I'll help you debug!
