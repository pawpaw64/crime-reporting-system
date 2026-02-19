# QR Code Tracking - Troubleshooting Guide

## Issues Fixed

### 1. ❌ "This site can't be reached" Error
**Problem:** The tracking page URL `http://localhost:5500/src/pages/track-complaint.html` is not accessible.

**Root Cause:** The frontend is not being served on port 5500.

**Solutions:**

#### Option A: Use Live Server (VS Code Extension) - RECOMMENDED
1. Install **Live Server** extension in VS Code
2. Right-click on `frontend/index.html` or any HTML file
3. Select **"Open with Live Server"**
4. This will start a server on port 5500 (default)

#### Option B: Use Python HTTP Server
```bash
cd frontend
python -m http.server 5500
```

#### Option C: Use Node.js HTTP Server
```bash
cd frontend
npx http-server -p 5500
```

#### Option D: Change Frontend URL in Backend
If you want to use a different port, update `backend/.env`:
```env
FRONTEND_URL=http://localhost:YOUR_PORT
```
Then restart the backend server.

### 2. ❌ QR Code Not Showing in Email
**Problem:** Email shows PNG icon instead of actual QR code.

**Possible Causes:**
1. Email client blocking inline images
2. QR code data URL not generated properly
3. Email HTML rendering issues

**Solutions:**

#### Solution 1: Check Backend Logs
When you submit a complaint, check the backend console for:
```
📧 Generating tracking QR code for complaint #X, token: xxx
✅ QR code generated successfully (data:image/png;base64,...)
✅ Tracking QR code email sent to user@email.com
```

If you don't see these logs, the QR code generation failed.

#### Solution 2: Test QR Code Generation
Open the test page in your browser:
```
http://localhost:5500/test-qr-tracking.html
```

This page lets you:
- Generate QR codes with any token
- Test the tracking API
- Open tracking pages directly

#### Solution 3: Check Email Client Settings
- **Gmail Web:** Images are auto-loaded usually
- **Outlook:** Check "Show Images" option
- **Apple Mail:** Auto-displays images from trusted senders
- **Mobile:** Some email apps block images by default

#### Solution 4: View Email Source
1. Open the email
2. View source/raw HTML
3. Look for: `<img src="data:image/png;base64,..."`
4. If it's there, the QR code was sent - it's just an email client issue

## Testing Procedure

### Step 1: Start Frontend Server
```bash
# In frontend folder
# Use VS Code Live Server OR:
npx http-server -p 5500
```

Verify: Open `http://localhost:5500` in browser - should show your homepage

### Step 2: Start Backend Server
```bash
# In backend folder
npm run dev
```

Verify: Backend should show:
```
✅ Database connected successfully
✅ Email server is ready to send messages
Server running on port 3000
```

### Step 3: Test QR Code Generation
Open: `http://localhost:5500/test-qr-tracking.html`

This test page will:
- Generate a QR code with your token
- Test if the tracking API works
- Let you open the tracking page directly

### Step 4: Test With Real Complaint
1. Go to your app and login
2. Submit a new complaint
3. Check backend console for:
   - "📧 Generating tracking QR code..."
   - "✅ QR code generated successfully..."
   - "✅ Tracking QR code email sent..."
4. Check your email inbox
5. If QR code doesn't show, use the tracking link directly

### Step 5: Test Tracking Page
Using the token from Step 4 (or from backend logs):
```
http://localhost:5500/src/pages/track-complaint.html?token=YOUR-TOKEN-HERE
```

Should show:
- Loading spinner briefly
- Complaint details
- Status timeline
- Location info

## Common Errors & Fixes

### Error: "Cannot GET /src/pages/track-complaint.html"
**Cause:** Frontend server not running OR wrong path
**Fix:** 
- Start Live Server from the `frontend` folder
- URL should be: `http://localhost:5500/src/pages/track-complaint.html`

### Error: "Complaint not found"
**Cause:** Invalid token OR backend not running OR database issue
**Fix:**
- Check backend is running on port 3000
- Verify token exists in database:
  ```sql
  SELECT complaint_id, tracking_token FROM complaint WHERE tracking_token = 'YOUR-TOKEN';
  ```
- Test API directly: `http://localhost:3000/api/track/YOUR-TOKEN`

### Error: "Failed to fetch"
**Cause:** CORS issue OR backend not running
**Fix:**
- Ensure backend is running
- Check browser console for CORS errors
- Backend should allow requests from `localhost:5500`

### QR Code Shows Broken Image in Email
**Cause:** Email client security OR data URL too long
**Fix:**
- Use the direct tracking link provided in the email
- Try different email client (Gmail web usually works best)
- Check backend console to confirm QR was generated

### Email Not Received
**Cause:** Wrong email configuration OR email blocked
**Fix:**
1. Check `.env` file:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```
2. For Gmail, use App Password (not regular password):
   - Go to Google Account → Security
   - Enable 2FA
   - Generate App Password
   - Use that password in `.env`
3. Check backend console for email errors
4. Check spam folder

## Quick Test URLs

Replace `YOUR-TOKEN` with actual tracking token:

### Frontend URLs (Port 5500)
- Homepage: `http://localhost:5500/`
- Test Page: `http://localhost:5500/test-qr-tracking.html`
- Tracking Page: `http://localhost:5500/src/pages/track-complaint.html?token=YOUR-TOKEN`

### Backend URLs (Port 3000)
- Health Check: `http://localhost:3000/check-auth`
- Track API: `http://localhost:3000/api/track/YOUR-TOKEN`

## Verification Checklist

- [ ] Frontend server running on port 5500
- [ ] Backend server running on port 3000
- [ ] Database connection successful
- [ ] Email server ready
- [ ] Test page loads: `http://localhost:5500/test-qr-tracking.html`
- [ ] QR code generates on test page
- [ ] Tracking API responds: `http://localhost:3000/api/track/TOKEN`
- [ ] Tracking page loads with token
- [ ] Email received with QR code (check spam if not in inbox)

## Getting Your Tracking Token

### Method 1: From Database
```sql
USE securevoice;
SELECT complaint_id, tracking_token, status, created_at 
FROM complaint 
ORDER BY created_at DESC 
LIMIT 5;
```

### Method 2: From Backend Console
After submitting a complaint, backend logs show:
```
📧 Generating tracking QR code for complaint #X, token: abc-123-def-456
```

### Method 3: From API Response
When you submit a complaint, the response includes:
```json
{
  "success": true,
  "complaintId": 123,
  "trackingToken": "abc-123-def-456"
}
```

## Production Deployment

When deploying to production:

1. Update `backend/.env`:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

2. Ensure frontend is served over HTTPS

3. Update tracking page API call to use production URL

4. Test QR codes work with production URLs

## Need More Help?

1. Check backend console logs for errors
2. Check browser console (F12) for frontend errors
3. Use the test page to isolate issues
4. Verify all servers are running
5. Check database for tracking tokens

## File Locations

- Email Template: `backend/src/utils/qrUtils.js`
- Tracking Page: `frontend/src/pages/track-complaint.html`
- Tracking JS: `frontend/src/js/track-complaint.js`
- Test Page: `frontend/test-qr-tracking.html`
- Migration: `backend/database/010_add_tracking_token.sql`
