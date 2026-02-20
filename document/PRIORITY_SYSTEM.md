# Priority System Documentation

## Overview

The crime reporting system now includes an intelligent priority detection system that automatically assigns priority levels to complaints and anonymous reports based on keyword analysis. This helps administrators focus on the most urgent cases first.

## Priority Levels

| Level | Description | Color | Example Keywords |
|-------|-------------|-------|------------------|
| **CRITICAL** | Life-threatening situations requiring immediate action | Red (#dc2626) | murder, kidnap, terrorism, rape, shooting |
| **HIGH** | Serious crimes requiring urgent attention | Orange (#ea580c) | assault, robbery, domestic violence, stalking |
| **MEDIUM** | Standard crimes (default level) | Yellow (#ca8a04) | theft, fraud, harassment, vandalism |
| **LOW** | Minor incidents | Green (#16a34a) | noise complaint, parking violations |

## How It Works

### 1. Automatic Detection

When a complaint or anonymous report is submitted:

1. The system analyzes the description, crime type, and any additional notes
2. Keywords are matched against the priority keywords database
3. The highest matching priority level is assigned
4. Matched keywords are stored for reference

### 2. Admin Dashboard

- **Urgent Alert Banner**: Displayed when there are critical/high priority pending cases
- **Priority Stats**: Shows count of cases by priority level
- **Priority Badges**: Visual indicators on each complaint row
- **Priority Filter**: Filter complaints by priority level
- **Sorting**: Cases are automatically sorted by priority (critical first)

### 3. Color-Coded Visual Indicators

- Critical priority rows have a red left border and subtle red background
- High priority rows also get similar highlighting
- Priority badges animate for critical cases to draw attention

## Database Schema

### New Columns in `complaint` table:
```sql
priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium'
priority_keywords_matched TEXT
```

### New Columns in `anonymous_reports` table:
```sql
priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium'
priority_keywords_matched TEXT
```

### New `priority_keywords` table:
```sql
CREATE TABLE priority_keywords (
    keyword_id INT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(100) NOT NULL UNIQUE,
    priority_level ENUM('critical', 'high', 'medium', 'low'),
    category VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1
);
```

## Migration

Run the migration file to add the priority system:

```bash
mysql -u root -p securevoice < backend/database/012_add_priority_system.sql
```

## Default Keywords

### Critical Priority Keywords
- Violence: murder, homicide, killing, shot, shooting, stabbing, stabbed
- Abduction: kidnap, kidnapping, abduction, hostage
- Terrorism: terrorism, terrorist, bomb, bombing, explosive
- Sexual Crimes: rape, sexual assault, molestation
- Trafficking: human trafficking, trafficking
- Child Safety: child abuse
- Fire: arson

### High Priority Keywords
- Physical Violence: assault, attack, beaten, beating
- Property Crime: robbery, armed robbery, burglary, home invasion
- Domestic Issues: domestic violence, abuse
- Threats: threatening, death threat
- Weapons: weapon, gun, armed, knife attack
- Financial Crimes: extortion, blackmail, ransom
- Drugs: drug dealer, drug dealing, narcotics
- Gang Activity: gang, gang violence
- Stalking: stalking, stalker

### Medium Priority Keywords
- Property: theft, stolen, vandalism, trespassing, break-in
- Financial: fraud, scam, identity theft
- Harassment: harassment
- Cyber: cybercrime, hacking
- Corruption: corruption, bribery

### Low Priority Keywords
- Nuisance: noise complaint, littering, loitering
- Traffic: parking, jaywalking
- Civil: minor dispute

## API Changes

### Admin Endpoints

The following endpoints now include priority information:

#### GET /get-admin-complaints
Response now includes:
- `priority` field in each complaint
- `priority_keywords_matched` for debugging
- `priorityStats` object with counts by priority

#### GET /get-admin-dashboard-stats
Response now includes:
- `priorityStats` object
- `urgentPending` count (critical + high priority pending)

#### GET /admin/anonymous-reports
Response now includes priority fields and stats

### Filters

Add `?priority=critical` or `?priority=urgent` to filter by priority level.

## Frontend Components

### Priority Badge Component
```javascript
function getPriorityBadge(priority) {
    // Returns HTML for priority badge with icon and label
}
```

### Urgent Alert
Automatically shown when there are urgent (critical/high) pending cases.

## Customization

### Adding New Keywords

Use the priority utility functions:

```javascript
const { addPriorityKeyword } = require('./utils/priorityUtils');

// Add a new critical keyword
await addPriorityKeyword('new_keyword', 'critical', 'category_name');
```

### Removing Keywords

```javascript
const { removePriorityKeyword } = require('./utils/priorityUtils');

await removePriorityKeyword('keyword_to_remove');
```

### Refreshing Cache

Keywords are cached for 5 minutes. To manually refresh:

```javascript
const { refreshKeywordsCache } = require('./utils/priorityUtils');

await refreshKeywordsCache();
```

## Console Logging

When urgent priority complaints are detected, the system logs:

```
🚨 URGENT: CRITICAL priority complaint detected!
   Keywords matched: murder, kidnap
```

## Best Practices for Admins

1. **Check urgent alerts first** - The dashboard prominently displays urgent cases
2. **Use priority filter** - Filter to see only critical/high priority cases
3. **Respond quickly** - Critical cases may involve immediate danger
4. **Review keywords matched** - Understanding why a case is high priority helps with investigation

## File Changes Summary

### New Files
- `backend/database/012_add_priority_system.sql` - Database migration
- `backend/src/utils/priorityUtils.js` - Priority detection utility
- `document/PRIORITY_SYSTEM.md` - This documentation

### Modified Files
- `backend/src/controllers/complaintController.js` - Added priority detection
- `backend/src/controllers/anonymousReportController.js` - Added priority detection
- `backend/src/controllers/adminController.js` - Added priority in queries
- `backend/src/routes/api.js` - Added priority to alternate submission route
- `frontend/src/js/admin-dashboard-new.js` - Added priority UI components
- `frontend/src/css/adminDashboard.css` - Added priority styles
- `frontend/src/pages/admin_dashboard.html` - Added priority filter and containers
