# 🚀 Quick Start - Location & Heatmap Fixes

## ⚡ TL;DR - Just Run These Commands

```powershell
# 1. Apply database migration
Get-Content "backend\database\004_add_complaint_coordinates.sql" | mysql -u root -p securevoice

# 2. Geocode existing locations
cd backend
node scripts/geocode-locations.js

# 3. Restart backend
npm start
```

That's it! Now:
- ✅ Location input in profile shows addresses (not coordinates)
- ✅ Heatmap on homepage displays all complaints

---

## 🧪 Quick Test

### Test 1: Location Input
1. Go to http://localhost:5000 (or your frontend URL)
2. Login to user dashboard
3. Click "File New Complaint"
4. Click the crosshair button next to location
5. **Expected:** Should show a readable address

### Test 2: Heatmap
1. Go to homepage (index.html)
2. Click "Crime Heatmap" button
3. **Expected:** Should see red heatmap overlay and markers

---

## ❌ If Something Goes Wrong

### Error: "command not found: mysql"
**Fix:** Use MySQL Workbench instead:
1. Open MySQL Workbench
2. Select `securevoice` database
3. File → Open SQL Script → Select `004_add_complaint_coordinates.sql`
4. Click Execute (⚡)

### Error: "Cannot find module './db'"
**Fix:** Make sure you're in the correct directory:
```powershell
cd backend
node scripts/geocode-locations.js
```

### Heatmap shows "no data"
**Fix:** You need some complaints in the database. Either:
- Create a complaint through the UI, or
- See [HEATMAP_TESTING_GUIDE.md](backend/database/HEATMAP_TESTING_GUIDE.md) for test data SQL

---

## 📖 For More Details
- Full explanation: [LOCATION_HEATMAP_FIXES.md](LOCATION_HEATMAP_FIXES.md)
- Migration details: [backend/database/MIGRATION_GUIDE.md](backend/database/MIGRATION_GUIDE.md)
- Testing & troubleshooting: [backend/database/HEATMAP_TESTING_GUIDE.md](backend/database/HEATMAP_TESTING_GUIDE.md)
