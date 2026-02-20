# Admin Alert System - Implementation Guide

## Overview
The Admin Alert System automatically monitors District Admin responsiveness to high-priority complaints and notifies the Super Admin when response time thresholds are exceeded.

## Alert Thresholds
- **Critical Priority**: 1 hour (60 minutes)
- **High Priority**: 2 hours (120 minutes)

## Database Setup

### Step 1: Run the Migration
Navigate to your MySQL client and execute the migration file:

```bash
mysql -u root -p securevoice < backend/database/013_admin_alert_system.sql
```

Or from MySQL command line:
```sql
source backend/database/013_admin_alert_system.sql;
```

### Step 2: Verify Installation
Check that the following tables and objects were created:
- `admin_alerts` table
- `alert_config` table
- `admin_alert_summary` view
- `admin_alert_details` view
- `check_and_generate_alerts()` stored procedure
- `check_admin_alerts_event` scheduled event

### Step 3: Verify Event Scheduler
Ensure MySQL event scheduler is enabled:
```sql
SHOW VARIABLES LIKE 'event_scheduler';
SET GLOBAL event_scheduler = ON;
```

## Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

This will install the new `node-cron` package required for the alert scheduler.

### Step 2: Restart Server
The alert scheduler will automatically initialize when the server starts:
```bash
npm run dev
# or
npm start
```

You should see these log messages:
```
✅ Server running on port 3000
🔔 Initializing admin alert schedulers...
Alert generation scheduler initialized - running every 15 minutes
Alert cleanup scheduler initialized - running daily at 2:00 AM
Running initial alert generation...
Initial alert generation completed
```

## Features

### 1. Automatic Alert Generation
- **Frequency**: Every 15 minutes (configurable)
- **Method**: MySQL event scheduler + Node.js cron job (dual approach)
- **Logic**: Checks all critical/high priority complaints assigned to admins
- **Criteria**: 
  - Complaint status is "pending" or "verifying"
  - Time elapsed exceeds threshold (60 min critical, 120 min high)
  - No existing unresolved alert for that complaint

### 2. Super Admin Dashboard - Alerts Tab
Features:
- **Alert Statistics**: Real-time counts of critical, high, active, and resolved alerts
- **Alert Table**: Detailed list of all alerts with:
  - Priority level (Critical/High)
  - Admin name and district
  - Complaint ID and type
  - Time elapsed and overdue duration
  - Resolution status
- **Filters**:
  - By admin username
  - By priority level (critical/high)
  - Show/hide resolved alerts

### 3. All Admins Section - Alert Badges
- **Notification Icon**: Red bell icon with badge count appears in Actions column
- **Badge Count**: Shows total number of active alerts per admin
- **Critical Pulse**: Animated pulse effect for admins with critical alerts
- **Click Action**: Opens Alerts tab filtered to that specific admin

### 4. Navigation Badge
- Alert count displayed on "Admin Alerts" tab button
- Updates in real-time when alerts are loaded

### 5. Alert Actions
- **View**: Display full alert details including complaint information
- **Acknowledge**: Mark alert as seen by Super Admin
- **Resolve**: Mark alert as resolved (or auto-resolves when complaint status changes)

## API Endpoints

All endpoints require Super Admin authentication.

### GET /super-admin-alerts
Get all alerts with optional filters
- Query params: `includeResolved`, `adminUsername`, `priorityLevel`, `limit`

### GET /super-admin-alert-summary
Get alert counts per admin

### GET /super-admin-alert-count/:adminUsername
Get alert count for specific admin

### GET /super-admin-alert-details/:alertId
Get detailed information for specific alert

### POST /super-admin-acknowledge-alert
Acknowledge an alert
- Body: `{ alertId: number }`

### POST /super-admin-acknowledge-all-alerts
Acknowledge all alerts for an admin
- Body: `{ adminUsername: string }`

### POST /super-admin-resolve-alert
Manually resolve an alert
- Body: `{ alertId: number }`

### POST /super-admin-generate-alerts
Manually trigger alert generation

### GET /super-admin-alert-config
Get alert configuration (thresholds)

### POST /super-admin-alert-config
Update alert configuration
- Body: `{ priorityLevel: string, thresholdMinutes: number, isActive: boolean }`

### GET /super-admin-alert-statistics
Get comprehensive alert statistics

## Alert Lifecycle

1. **Creation**: 
   - Complaint priority set during submission (based on keywords)
   - Complaint assigned to District Admin
   - Time tracking begins

2. **Alert Trigger**:
   - Scheduled job runs every 15 minutes
   - Checks if time elapsed exceeds threshold
   - Creates alert record if criteria met

3. **Notification**:
   - Alert appears in Super Admin Dashboard
   - Badge count updates on Alerts tab and All Admins view
   - Badge includes critical pulse animation if applicable

4. **Acknowledgment** (Optional):
   - Super Admin reviews alert
   - Marks as acknowledged
   - Visual indication (reduced opacity) in alert list

5. **Resolution**:
   - **Automatic**: Alert auto-resolves when:
     - Complaint status changes to "investigating" or "resolved"
     - Complaint is discarded
   - **Manual**: Super Admin manually resolves from dashboard

6. **Cleanup**:
   - Resolved alerts older than 30 days are automatically deleted
   - Runs daily at 2:00 AM

## Configuration

### Alert Thresholds
Modify in `alert_config` table:
```sql
UPDATE alert_config 
SET threshold_minutes = 90, is_active = 1 
WHERE priority_level = 'high';
```

### Scheduler Frequency
Edit `backend/src/utils/alertScheduler.js`:
```javascript
// Change '*/15 * * * *' to desired cron expression
cron.schedule('*/15 * * * *', async () => { ... });
```

### Event Scheduler Frequency
Edit migration file `013_admin_alert_system.sql`:
```sql
ON SCHEDULE EVERY 15 MINUTE
```

## Troubleshooting

### Alerts Not Generating

1. **Check Event Scheduler**:
```sql
SHOW VARIABLES LIKE 'event_scheduler';
-- Should show ON
```

2. **Check Event Status**:
```sql
SHOW EVENTS WHERE name = 'check_admin_alerts_event';
```

3. **Check Node.js Scheduler**:
Look for log messages in server console every 15 minutes

4. **Manually Trigger**:
```sql
CALL check_and_generate_alerts();
```
Or use "Generate Alerts Now" button in dashboard

### No Alerts Showing

1. **Verify Complaints Exist**:
```sql
SELECT * FROM complaint 
WHERE priority IN ('critical', 'high') 
AND status IN ('pending', 'verifying')
AND admin_username IS NOT NULL;
```

2. **Check Alert Records**:
```sql
SELECT * FROM admin_alerts ORDER BY created_at DESC LIMIT 10;
```

3. **Check Browser Console**: Look for JavaScript errors

### Badge Not Updating

1. Clear browser cache
2. Check browser console for API errors
3. Verify Super Admin session is active

## Testing

### Create Test Scenario

1. **Create a Critical Complaint**:
   - Submit complaint with keywords like "murder", "kidnap", or "terrorism"
   - Assign to a District Admin

2. **Backdate Complaint** (for testing):
```sql
UPDATE complaint 
SET created_at = DATE_SUB(NOW(), INTERVAL 2 HOUR)
WHERE complaint_id = YOUR_COMPLAINT_ID;
```

3. **Generate Alerts**:
```sql
CALL check_and_generate_alerts();
```

4. **Verify**:
   - Check Super Admin Dashboard → Alerts tab
   - Check All Admins view for notification badge
   - Verify badge count on tab button

## Performance Considerations

- **Indexes**: Created on key columns for efficient queries
  - `complaint` table: (priority, admin_username, status, created_at)
  - `admin_alerts` table: (admin_username, is_resolved, priority_level)

- **Views**: Optimized views for common queries
  - `admin_alert_summary`: Aggregate counts per admin
  - `admin_alert_details`: Comprehensive alert information

- **Auto-cleanup**: Prevents table bloat by removing old resolved alerts

## Security

- All endpoints protected by Super Admin authentication
- SQL injection prevention through parameterized queries
- Rate limiting applied (inherited from server configuration)

## Future Enhancements

1. **Email Notifications**: Send email alerts to Super Admin
2. **SMS Notifications**: Critical alert notifications via SMS
3. **Escalation**: Auto-escalate to higher authority if unresolved
4. **Analytics**: Detailed admin response time analytics
5. **Custom Thresholds**: Per-district or per-admin thresholds
6. **Push Notifications**: Browser push notifications for real-time alerts

## Support

For issues or questions:
1. Check server logs: `backend/logs/`
2. Check database logs: MySQL error log
3. Verify all migration steps completed
4. Ensure event scheduler is enabled
5. Check browser console for frontend errors
