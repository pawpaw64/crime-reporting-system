# Database Migration Guide

## Running the Complaint Coordinates Migration

To enable the heatmap functionality, you need to add coordinate columns to the complaint table. Follow these steps:

### Option 1: Using MySQL Command Line

```bash
mysql -u root -p securevoice < backend/database/004_add_complaint_coordinates.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin

1. Open MySQL Workbench or phpMyAdmin
2. Select the `securevoice` database
3. Go to the SQL tab
4. Copy and paste the contents of `004_add_complaint_coordinates.sql`
5. Click Execute

### Option 3: Using PowerShell (from project root)

```powershell
Get-Content "backend\database\004_add_complaint_coordinates.sql" | mysql -u root -p securevoice
```

## What This Migration Does

This migration adds three new columns to the `complaint` table:
- `latitude` (DECIMAL 10,8): Stores the latitude coordinate of the complaint location
- `longitude` (DECIMAL 11,8): Stores the longitude coordinate of the complaint location  
- `location_accuracy_radius` (INT): Stores the accuracy radius in meters for approximate locations

These fields are **optional** - if a complaint doesn't have coordinates, the system will fall back to using the coordinates from the `location` table.

## Verifying the Migration

After running the migration, verify it was successful:

```sql
DESCRIBE complaint;
```

You should see the three new columns: `latitude`, `longitude`, and `location_accuracy_radius`.

## Next Steps

After running this migration:

### 1. Geocode Existing Locations (Important!)

If you have existing complaints in your database, you need to add coordinates to the locations so they appear on the heatmap:

```powershell
# From the project root directory
cd backend
node scripts/geocode-locations.js
```

This script will:
- Find all locations in the database that don't have coordinates
- Automatically geocode them using OpenStreetMap's Nominatim API
- Update the location table with latitude/longitude values
- Respect API rate limits (1 request per second)

**Note:** The script may take a few minutes if you have many locations.

### 2. Test the Heatmap

1. Restart your backend server
2. Open the homepage (index.html)
3. Click the "Crime Heatmap" button
4. You should see:
   - Complaint locations displayed as markers
   - A heatmap overlay showing crime density
   - Division markers for major cities

### 3. How It Works Now

- **Complaints from profile.html** (user dashboard): Only have address strings, but will get coordinates from the `location` table
- **Complaints from complain.html** (with map picker): Have their own precise coordinates stored directly in the complaint table
- **The heatmap**: Uses `COALESCE(complaint.latitude, location.latitude)` to show all complaints regardless of which method was used
