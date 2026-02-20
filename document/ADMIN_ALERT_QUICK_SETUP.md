# Admin Alert System - Quick Setup Guide

## Prerequisites
- Crime Reporting System already installed and running
- MySQL database `securevoice` exists
- Priority system (migration 012) already applied

## Installation Steps

### 1. Install Node Dependencies
```bash
cd backend
npm install
```

### 2. Run Database Migration
Open MySQL and run:
```bash
mysql -u root -p securevoice < database/013_admin_alert_system.sql
```

Or from MySQL Workbench/Command Line:
```sql
USE securevoice;
SOURCE database/013_admin_alert_system.sql;
```

### 3. Enable MySQL Event Scheduler (if not already enabled)
```sql
SET GLOBAL event_scheduler = ON;
```

To make it permanent, add to your MySQL configuration file (my.ini or my.cnf):
```ini
[mysqld]
event_scheduler = ON
```

### 4. Restart the Backend Server
```bash
cd backend
npm start
# or for development
npm run dev
```

### 5. Verify Installation

**Check Server Logs** - You should see:
```
✅ Server running on port 3000
🔔 Initializing admin alert schedulers...
Alert generation scheduler initialized - running every 15 minutes
Alert cleanup scheduler initialized - running daily at 2:00 AM
Running initial alert generation...
Initial alert generation completed
```

**Check Database**:
```sql
-- Verify tables created
SHOW TABLES LIKE '%alert%';
-- Should show: admin_alerts, alert_config

-- Verify event created
SHOW EVENTS WHERE name = 'check_admin_alerts_event';
-- Should show the event with ENABLED status

-- Verify stored procedure created
SHOW PROCEDURE STATUS WHERE db = 'securevoice' AND name = 'check_and_generate_alerts';
```

**Check Super Admin Dashboard**:
1. Login as Super Admin
2. You should see a new "Admin Alerts" tab with a bell icon
3. Navigate to the tab - should show "0" alerts initially

## Testing the System

### Quick Test - Create a Test Alert

1. **Create a high-priority complaint (or backdate an existing one)**:
```sql
-- Backdate a complaint to 3 hours ago to trigger alert
UPDATE complaint 
SET created_at = DATE_SUB(NOW(), INTERVAL 3 HOUR),
    priority = 'critical'
WHERE complaint_id = 1 -- Replace with actual complaint ID
AND admin_username IS NOT NULL
AND status IN ('pending', 'verifying');
```

2. **Generate alerts manually**:
```sql
CALL check_and_generate_alerts();
```

Or click "Generate Alerts Now" button in Super Admin Dashboard → Alerts tab

3. **Verify Alert Created**:
```sql
SELECT * FROM admin_alerts ORDER BY created_at DESC LIMIT 1;
```

4. **Check Dashboard**:
   - Go to Super Admin Dashboard → Alerts tab
   - You should see the alert listed
   - Badge count should show on the tab button
   - Go to All Admins tab
   - The admin should have a red bell icon with badge count

## What Happens Now?

### Automatic Alert Generation
- Every 15 minutes, the system checks for overdue complaints
- Creates alerts for:
  - Critical complaints with no update after 1 hour
  - High priority complaints with no update after 2 hours

### Super Admin Notifications
- Badge on "Admin Alerts" tab shows total active alerts
- Each admin in "All Admins" view shows their alert count
- Critical alerts have a pulsing red animation
- Click the bell icon to view alerts for that specific admin

### Alert Resolution
- Alerts auto-resolve when admin updates complaint status to "investigating" or "resolved"
- Super Admin can manually resolve alerts
- Old resolved alerts (30+ days) are auto-deleted daily at 2:00 AM

## Common Commands

### Check Alert Status
```sql
-- View all active alerts
SELECT * FROM admin_alert_details WHERE is_resolved = 0;

-- Count alerts per admin
SELECT * FROM admin_alert_summary;

-- View alert statistics
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN priority_level = 'critical' THEN 1 ELSE 0 END) as critical
FROM admin_alerts;
```

### Manually Trigger Alert Generation
```sql
CALL check_and_generate_alerts();
```

### Change Alert Thresholds
```sql
-- Change critical threshold to 45 minutes
UPDATE alert_config SET threshold_minutes = 45 WHERE priority_level = 'critical';

-- Change high priority threshold to 3 hours (180 minutes)
UPDATE alert_config SET threshold_minutes = 180 WHERE priority_level = 'high';

-- Disable alerts for medium priority
UPDATE alert_config SET is_active = 0 WHERE priority_level = 'medium';
```

### Clear All Alerts (for testing)
```sql
-- Delete all alerts
TRUNCATE TABLE admin_alerts;
```

## Troubleshooting

### Problem: No alerts are being generated

**Solution 1**: Check event scheduler
```sql
SHOW VARIABLES LIKE 'event_scheduler';
-- If OFF, run:
SET GLOBAL event_scheduler = ON;
```

**Solution 2**: Check if complaints exist
```sql
SELECT 
    complaint_id, 
    priority, 
    status, 
    admin_username,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_old,
    created_at
FROM complaint 
WHERE priority IN ('critical', 'high')
AND admin_username IS NOT NULL
AND status IN ('pending', 'verifying')
ORDER BY created_at;
```

**Solution 3**: Manually run stored procedure
```sql
CALL check_and_generate_alerts();
SELECT * FROM admin_alerts ORDER BY created_at DESC;
```

### Problem: Badge not showing in dashboard

**Solution 1**: Clear browser cache and refresh

**Solution 2**: Check browser console for errors (F12)

**Solution 3**: Verify API endpoints are working:
- Open browser console
- Go to Network tab
- Navigate to Alerts tab
- Check if `/super-admin-alerts` request succeeds

### Problem: Server not starting

**Solution**: Check if node-cron was installed
```bash
cd backend
npm list node-cron
# If not found:
npm install node-cron
```

## API Testing (Optional)

Test endpoints using curl or Postman:

```bash
# Get all alerts (must be logged in as super admin)
curl -X GET http://localhost:3000/super-admin-alerts \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Generate alerts manually
curl -X POST http://localhost:3000/super-admin-generate-alerts \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Get alert summary
curl -X GET http://localhost:3000/super-admin-alert-summary \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## Files Modified/Created

### Backend
- ✅ `backend/database/013_admin_alert_system.sql` - Database migration
- ✅ `backend/src/utils/alertUtils.js` - Alert utility functions
- ✅ `backend/src/utils/alertScheduler.js` - Cron job scheduler
- ✅ `backend/src/controllers/superAdminController.js` - Alert endpoints (added)
- ✅ `backend/src/routes/superAdmin.js` - Alert routes (added)
- ✅ `backend/src/server.js` - Initialize scheduler (modified)
- ✅ `backend/package.json` - Added node-cron dependency

### Frontend
- ✅ `frontend/src/pages/super-admin-dashboard.html` - Added Alerts tab and styling
- ✅ `frontend/src/js/super-admin-dashboard.js` - Added alert handling functions

### Documentation
- ✅ `document/ADMIN_ALERT_SYSTEM.md` - Complete system documentation
- ✅ `document/ADMIN_ALERT_QUICK_SETUP.md` - This file

## Next Steps

1. ✅ Complete installation steps above
2. ✅ Test with sample data
3. ✅ Monitor server logs for alert generation
4. ✅ Train Super Admin on new features
5. ⏭️ (Optional) Configure email notifications
6. ⏭️ (Optional) Customize alert thresholds per district

## Support

If you encounter issues:
1. Check this guide for troubleshooting steps
2. Review `ADMIN_ALERT_SYSTEM.md` for detailed documentation
3. Check server console logs
4. Verify MySQL error log
5. Check browser console (F12) for frontend errors

---

**Need Help?** Refer to the complete documentation in `ADMIN_ALERT_SYSTEM.md`
