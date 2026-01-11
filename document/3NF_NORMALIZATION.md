# Database 3NF Normalization Guide

## Overview

This document describes the Third Normal Form (3NF) normalization applied to the SecureVoice Crime Reporting System database.

## What is 3NF?

Third Normal Form (3NF) requires that:
1. The table is in Second Normal Form (2NF)
2. No transitive dependencies exist (non-key attributes depend only on the primary key)

## Changes Made

### 1. Address Hierarchy Normalization

**Problem:** User addresses were stored as flat text fields with transitive dependencies:
- `division` → `district` → `police_station` → `union` → `village`

**Solution:** Created normalized address hierarchy tables:

```
divisions (division_id, division_name, division_name_bn)
    ↓
districts (district_name, division_id)
    ↓
police_stations (police_station_id, police_station_name, district_name)
    ↓
unions (union_id, union_name, police_station_id)
    ↓
villages (village_id, village_name, union_id)
    ↓
user_addresses (address_id, username, division_id, district_name, police_station_id, union_id, village_id, place_details)
```

### 2. Crime Type/Category Normalization

**Problem:** 
- `complaint.complaint_type` (text) duplicated `complaint.category_id` (FK)
- `anonymous_reports.crime_type` was a string, not normalized

**Solution:**
- Added `crime_code` to `category` table for standardization
- Added `category_id` FK to `anonymous_reports` table
- Both tables now reference the same normalized `category` table

### 3. Admin Workflow Normalization (Already Done in Migration 003)

The admin table was already normalized to separate:
- Core identity data → `admins`
- Verification tokens → `admin_verification_tokens`
- Approval workflow → `admin_approval_workflow`

## New Database Structure

### New Tables Created

| Table | Purpose |
|-------|---------|
| `divisions` | Bangladesh divisions (top-level administrative unit) |
| `police_stations` | Police stations linked to districts |
| `unions` | Administrative unions under police stations |
| `villages` | Villages under unions |
| `user_addresses` | Normalized user address data |

### Modified Tables

| Table | Changes |
|-------|---------|
| `districts` | Added `division_id` FK |
| `category` | Added `crime_code` column for standardization |
| `anonymous_reports` | Added `category_id` FK |

### Compatibility Views

| View | Purpose |
|------|---------|
| `v_users_with_address` | Users with full address (backward compatible) |
| `v_complaints_full` | Complaints with all related data |
| `v_anonymous_reports_full` | Anonymous reports with category names |
| `v_address_hierarchy` | Complete address hierarchy lookup |

## API Changes

### New Endpoints

```
GET /address/divisions          - Get all divisions
GET /address/districts          - Get districts (optionally by division)
GET /address/police-stations    - Get police stations by district
GET /address/unions             - Get unions by police station
GET /address/villages           - Get villages by union
GET /address/hierarchy          - Get complete address hierarchy
GET /address/search             - Search locations (autocomplete)
GET /categories                 - Get all crime categories
```

### Example Usage

```javascript
// Cascading dropdown example
const divisions = await fetch('/address/divisions').then(r => r.json());
const districts = await fetch(`/address/districts?divisionId=${divisionId}`).then(r => r.json());
const policeStations = await fetch(`/address/police-stations?district=${districtName}`).then(r => r.json());
```

## Backward Compatibility

All existing functionality is maintained through:

1. **Views**: Compatibility views provide the same data structure as before
2. **Original Columns**: Original columns in `users` table remain for gradual migration
3. **Dual Support**: Controllers support both old and new structures

## Migration Steps

### 1. Run the Migration SQL

```bash
mysql -u root -p securevoice < backend/database/009_3nf_normalization.sql
```

### 2. Verify Tables Created

```sql
SHOW TABLES LIKE 'divisions';
SHOW TABLES LIKE 'police_stations';
SHOW TABLES LIKE 'unions';
SHOW TABLES LIKE 'villages';
SHOW TABLES LIKE 'user_addresses';
```

### 3. Verify Data Migration

```sql
SELECT COUNT(*) FROM user_addresses;
SELECT COUNT(*) FROM anonymous_reports WHERE category_id IS NOT NULL;
```

## Helper Functions

New helper functions in `helperUtils.js`:

```javascript
// Address hierarchy
getAllDivisions()
getDistrictsByDivision(divisionId)
getPoliceStationsByDistrict(districtName)
getUnionsByPoliceStation(policeStationId)
getVillagesByUnion(unionId)
saveUserAddress(username, addressData)
getUserFullAddress(username)

// Categories
getCategoryIdNormalized(categoryNameOrCode)
getCategoryName(categoryId)
getAllCategories()
```

## Frontend Integration

For cascading address dropdowns, use the new API endpoints:

```html
<select id="division" onchange="loadDistricts(this.value)">
    <!-- Populated from /address/divisions -->
</select>

<select id="district" onchange="loadPoliceStations(this.value)">
    <!-- Populated from /address/districts?divisionId=X -->
</select>

<select id="policeStation" onchange="loadUnions(this.value)">
    <!-- Populated from /address/police-stations?district=X -->
</select>
```

## Benefits of 3NF

1. **Data Integrity**: No redundant data, single source of truth
2. **Update Anomalies Eliminated**: Changes only need to be made in one place
3. **Consistency**: Category names are consistent across all tables
4. **Scalability**: Easy to add new divisions, districts, etc.
5. **Query Flexibility**: Join tables for any combination of data

## Notes

- Original columns in `users` table (division, district, etc.) are kept for backward compatibility
- Gradually migrate to use `user_addresses` table for new registrations
- Use views for read operations when full backward compatibility is needed
- Use normalized tables for write operations
