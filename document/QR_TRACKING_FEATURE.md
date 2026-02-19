# QR Code Complaint Tracking Feature

## Overview
This feature allows users to track their complaint status without logging in by scanning a QR code sent via email when they submit a complaint.

## Features

### 1. **Automatic QR Code Generation**
- When a user submits a complaint, a unique tracking token is generated
- A QR code is created containing a URL to track the complaint
- The QR code uses the project's color scheme (deep teal blue: #124E66)

### 2. **Email Notification**
- Automatically sends an email to the user after complaint submission
- Email includes:
  - Complaint details (ID, type, location, status)
  - QR code for easy tracking
  - Direct tracking link for desktop users
  - Professional HTML template matching the project theme

### 3. **Public Tracking Page**
- No authentication required
- Mobile-responsive design
- Real-time status updates
- Shows:
  - Visual status timeline (pending → verifying → investigating → resolved)
  - Complaint information
  - Location details
  - Recent updates/messages
  - Attached evidence

## Implementation Details

### Database Changes
**File:** `backend/database/010_add_tracking_token.sql`

- Added `tracking_token` column to the `complaint` table
- Column is VARCHAR(100) with UNIQUE constraint
- Indexed for fast lookups
- Existing complaints get auto-generated tokens

### Backend Changes

#### 1. QR Code Utility (`backend/src/utils/qrUtils.js`)
- **Functions:**
  - `generateTrackingToken()` - Creates unique UUID tokens
  - `generateTrackingQRCode(token)` - Generates QR code image as base64
  - `generateTrackingEmailTemplate(details, qrCode)` - Creates professional HTML email

#### 2. Complaint Controller Updates
**File:** `backend/src/controllers/complaintController.js`

**Modified `submitComplaint` function:**
- Generates unique tracking token
- Inserts token with complaint record
- Fetches user email from database
- Generates QR code
- Sends tracking email asynchronously (doesn't block response)

**New function `trackComplaintByToken`:**
- Public endpoint (no authentication)
- Retrieves complaint details by token
- Returns complaint info, evidence, and status updates

#### 3. New Route
**File:** `backend/src/routes/complaints.js`
```javascript
router.get('/track/:token', complaintController.trackComplaintByToken);
```
- Public route accessible at: `/api/track/{tracking-token}`

### Frontend Changes

#### 1. Tracking Page HTML
**File:** `frontend/src/pages/track-complaint.html`

Features:
- Clean, modern design
- Visual status timeline with icons
- Complaint information cards
- Recent updates section
- Evidence display
- Help section
- Fully responsive

#### 2. Tracking Page CSS
**File:** `frontend/src/css/track-complaint.css`

Styling:
- Uses project color scheme
- Gradient backgrounds
- Card-based layout
- Smooth animations
- Mobile-first responsive design
- Touch-friendly on mobile devices

#### 3. Tracking Page JavaScript
**File:** `frontend/src/js/track-complaint.js`

Functionality:
- Extracts tracking token from URL query parameter
- Fetches complaint details from API
- Updates UI dynamically
- Auto-refreshes every 30 seconds
- Handles loading, success, and error states
- Formats dates properly

### Environment Configuration

Added to `.env`:
```
FRONTEND_URL=http://localhost:5500
```
- Used to generate tracking URLs in QR codes
- Change to production URL when deploying

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install qrcode
```

### 2. Run Database Migration
```bash
node scripts/run-tracking-migration.js
```

### 3. Configure Environment
Update `backend/.env`:
```env
FRONTEND_URL=http://localhost:5500  # or your production URL
```

### 4. Start the Server
```bash
npm run dev
```

## Usage Flow

### User Perspective:
1. **Submit Complaint** - User fills complaint form and submits
2. **Receive Email** - Gets email with QR code and tracking link
3. **Scan QR Code** - Uses phone camera to scan QR code
4. **View Status** - Tracking page opens showing real-time status
5. **Check Updates** - Can recheck anytime without logging in

### Admin Perspective:
- Updates complaint status through admin dashboard
- Status changes automatically reflected on tracking page
- Can send messages that appear in tracking updates

## API Endpoints

### Track Complaint by Token
```
GET /api/track/:token
```

**Public endpoint** (no authentication required)

**Response:**
```json
{
  "success": true,
  "complaint": {
    "id": 123,
    "trackingToken": "abc-123-def-456",
    "type": "Theft",
    "category": "Property Crime",
    "description": "...",
    "status": "investigating",
    "location": {
      "address": "...",
      "name": "...",
      "district": "...",
      "latitude": 23.8103,
      "longitude": 90.4125
    },
    "submittedDate": "2026-02-19T10:30:00",
    "evidence": [...],
    "recentUpdates": [...]
  }
}
```

## Security Considerations

1. **Token Security:**
   - Tokens are UUIDs (128-bit random)
   - Very low collision probability
   - Unique constraint enforced in database

2. **Data Privacy:**
   - Only complaint submitter has the token
   - Token sent only to verified user email
   - No sensitive user info exposed on tracking page

3. **Rate Limiting:**
   - Consider adding rate limiting to tracking endpoint
   - Prevent token enumeration attacks

## Customization

### Change QR Code Colors
Edit `backend/src/utils/qrUtils.js`:
```javascript
color: {
    dark: '#124E66',  // Main color
    light: '#FFFFFF'  // Background
}
```

### Change Email Template
Edit the `generateTrackingEmailTemplate` function in `qrUtils.js` to customize:
- Email layout
- Colors
- Content
- Branding

### Change Tracking Page Theme
Edit `frontend/src/css/track-complaint.css` to customize:
- Colors
- Fonts
- Layout
- Animations

## Testing

### Test Tracking Endpoint
```bash
# Replace TOKEN with actual tracking token
curl http://localhost:3000/api/track/TOKEN
```

### Test Email Sending
1. Submit a test complaint
2. Check email inbox
3. Verify QR code appears
4. Scan QR code or click link
5. Verify tracking page loads correctly

### Test QR Code
Use any QR scanner app or:
- iPhone: Native camera app
- Android: Google Lens or camera app
- Desktop: Use phone to scan

## Troubleshooting

### Email Not Sending
1. Check `.env` file has correct EMAIL_USER and EMAIL_PASS
2. Verify email credentials in console
3. Check spam folder
4. Ensure Gmail "Less secure app access" is enabled OR use App Password

### QR Code Not Displaying
1. Check console for QR generation errors
2. Verify `qrcode` npm package is installed
3. Check email HTML rendering

### Tracking Page Not Loading
1. Verify token is in URL: `?token=...`
2. Check API endpoint is accessible
3. Check browser console for errors
4. Verify CORS settings if frontend on different domain

### Status Not Updating
1. Verify complaint status in database
2. Check auto-refresh is working (every 30 seconds)
3. Hard refresh the page (Ctrl+F5)

## Future Enhancements

Potential improvements:
1. **Push Notifications** - Real-time updates via web push
2. **Status History** - Complete timeline of all status changes
3. **Admin Messages** - Direct messaging on tracking page
4. **Multi-language** - i18n support for tracking page
5. **PDF Download** - Download complaint report as PDF
6. **SMS Tracking** - Send tracking link via SMS
7. **Tracking Analytics** - Track how often users check status

## File Structure

```
backend/
├── database/
│   └── 010_add_tracking_token.sql      # Database migration
├── scripts/
│   └── run-tracking-migration.js       # Migration runner
└── src/
    ├── controllers/
    │   └── complaintController.js      # Updated with tracking
    ├── routes/
    │   └── complaints.js               # Added tracking route
    └── utils/
        └── qrUtils.js                  # New: QR code utilities

frontend/
└── src/
    ├── css/
    │   └── track-complaint.css         # New: Tracking page styles
    ├── js/
    │   └── track-complaint.js          # New: Tracking page logic
    └── pages/
        └── track-complaint.html        # New: Tracking page
```

## Dependencies

### New Dependencies
- **qrcode** (^1.5.3) - QR code generation
  - Generates QR codes as data URLs
  - Supports customization options
  - Compatible with Node.js

### Existing Dependencies Used
- **uuid** - Token generation
- **nodemailer** - Email sending
- **mysql2** - Database operations

## Configuration Reference

### Environment Variables
```env
# Required
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5500

# Optional (with defaults)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=securevoice
```

## Notes

- QR codes work offline after initial scan (page cached)
- Tracking page auto-refreshes every 30 seconds
- Email sending is asynchronous (doesn't delay complaint submission)
- Tracking token is included in API response for testing
- No authentication required for tracking page
- Compatible with all modern browsers
- Mobile-first responsive design

## Credits

Developed for SecureVoice Crime Reporting System
© 2026 All Rights Reserved
