const pool = require('../db');
const https = require('https');

// =============================================================================
// 3NF NORMALIZED DATABASE HELPER FUNCTIONS
// =============================================================================

// Get category ID by name or crime code (supports 3NF normalized structure)
async function getCategoryIdNormalized(categoryNameOrCode) {
    if (!categoryNameOrCode) return null;
    
    const [results] = await pool.query(
        `SELECT category_id FROM category 
         WHERE LOWER(name) = LOWER(?) 
         OR LOWER(crime_code) = LOWER(?)
         OR LOWER(crime_code) = LOWER(REPLACE(?, ' ', '_'))
         LIMIT 1`,
        [categoryNameOrCode, categoryNameOrCode, categoryNameOrCode]
    );
    
    if (results.length > 0) {
        return results[0].category_id;
    }
    
    // If not found, create new category
    const crimeCode = categoryNameOrCode.toUpperCase().replace(/\s+/g, '_');
    const [insertResult] = await pool.query(
        `INSERT INTO category (name, crime_code, description) VALUES (?, ?, ?)`,
        [categoryNameOrCode, crimeCode, `Category: ${categoryNameOrCode}`]
    );
    
    return insertResult.insertId;
}

// Get category name by ID
async function getCategoryName(categoryId) {
    if (!categoryId) return null;
    
    const [results] = await pool.query(
        'SELECT name FROM category WHERE category_id = ?',
        [categoryId]
    );
    
    return results.length > 0 ? results[0].name : null;
}

// Get all categories (for dropdown lists)
async function getAllCategories() {
    const [results] = await pool.query(
        'SELECT category_id, name, crime_code, description FROM category ORDER BY name ASC'
    );
    return results;
}

// Get division ID by name
async function getDivisionId(divisionName) {
    if (!divisionName) return null;
    
    const [results] = await pool.query(
        'SELECT division_id FROM divisions WHERE LOWER(division_name) = LOWER(?)',
        [divisionName]
    );
    
    return results.length > 0 ? results[0].division_id : null;
}

// Get all divisions (for dropdown lists)
async function getAllDivisions() {
    const [results] = await pool.query(
        'SELECT division_id, division_name, division_name_bn FROM divisions ORDER BY division_name ASC'
    );
    return results;
}

// Get districts by division
async function getDistrictsByDivision(divisionId) {
    const [results] = await pool.query(
        `SELECT d.district_name, d.division_id 
         FROM districts d 
         WHERE d.division_id = ? 
         ORDER BY d.district_name ASC`,
        [divisionId]
    );
    return results;
}

// Get all districts with division info
async function getAllDistricts() {
    const [results] = await pool.query(
        `SELECT d.district_name, d.division_id, dv.division_name 
         FROM districts d 
         LEFT JOIN divisions dv ON d.division_id = dv.division_id
         ORDER BY d.district_name ASC`
    );
    return results;
}

// Get police stations by district
async function getPoliceStationsByDistrict(districtName) {
    const [results] = await pool.query(
        `SELECT police_station_id, police_station_name, police_station_name_bn 
         FROM police_stations 
         WHERE district_name = ? 
         ORDER BY police_station_name ASC`,
        [districtName]
    );
    return results;
}

// Get or create police station
async function getOrCreatePoliceStation(policeStationName, districtName) {
    if (!policeStationName) return null;
    
    const [existing] = await pool.query(
        `SELECT police_station_id FROM police_stations 
         WHERE LOWER(police_station_name) = LOWER(?) AND district_name = ?`,
        [policeStationName, districtName]
    );
    
    if (existing.length > 0) {
        return existing[0].police_station_id;
    }
    
    const [result] = await pool.query(
        `INSERT INTO police_stations (police_station_name, district_name) VALUES (?, ?)`,
        [policeStationName, districtName]
    );
    
    return result.insertId;
}

// Get unions by police station
async function getUnionsByPoliceStation(policeStationId) {
    const [results] = await pool.query(
        `SELECT union_id, union_name, union_name_bn 
         FROM unions 
         WHERE police_station_id = ? 
         ORDER BY union_name ASC`,
        [policeStationId]
    );
    return results;
}

// Get or create union
async function getOrCreateUnion(unionName, policeStationId) {
    if (!unionName) return null;
    
    const [existing] = await pool.query(
        `SELECT union_id FROM unions 
         WHERE LOWER(union_name) = LOWER(?) AND police_station_id = ?`,
        [unionName, policeStationId]
    );
    
    if (existing.length > 0) {
        return existing[0].union_id;
    }
    
    const [result] = await pool.query(
        `INSERT INTO unions (union_name, police_station_id) VALUES (?, ?)`,
        [unionName, policeStationId]
    );
    
    return result.insertId;
}

// Get villages by union
async function getVillagesByUnion(unionId) {
    const [results] = await pool.query(
        `SELECT village_id, village_name, village_name_bn 
         FROM villages 
         WHERE union_id = ? 
         ORDER BY village_name ASC`,
        [unionId]
    );
    return results;
}

// Get or create village
async function getOrCreateVillage(villageName, unionId) {
    if (!villageName) return null;
    
    const [existing] = await pool.query(
        `SELECT village_id FROM villages 
         WHERE LOWER(village_name) = LOWER(?) AND union_id = ?`,
        [villageName, unionId]
    );
    
    if (existing.length > 0) {
        return existing[0].village_id;
    }
    
    const [result] = await pool.query(
        `INSERT INTO villages (village_name, union_id) VALUES (?, ?)`,
        [villageName, unionId]
    );
    
    return result.insertId;
}

// Save or update user address (normalized)
async function saveUserAddress(username, addressData) {
    const { 
        divisionName, districtName, policeStationName, 
        unionName, villageName, placeDetails 
    } = addressData;
    
    // Get or create IDs for each level
    const divisionId = divisionName ? await getDivisionId(divisionName) : null;
    let policeStationId = null;
    let unionId = null;
    let villageId = null;
    
    if (policeStationName && districtName) {
        policeStationId = await getOrCreatePoliceStation(policeStationName, districtName);
    }
    
    if (unionName && policeStationId) {
        unionId = await getOrCreateUnion(unionName, policeStationId);
    }
    
    if (villageName && unionId) {
        villageId = await getOrCreateVillage(villageName, unionId);
    }
    
    // Check if user already has an address
    const [existing] = await pool.query(
        'SELECT address_id FROM user_addresses WHERE username = ? AND is_primary = 1',
        [username]
    );
    
    if (existing.length > 0) {
        // Update existing address
        await pool.query(
            `UPDATE user_addresses SET 
             division_id = ?, district_name = ?, police_station_id = ?,
             union_id = ?, village_id = ?, place_details = ?, updated_at = NOW()
             WHERE address_id = ?`,
            [divisionId, districtName, policeStationId, unionId, villageId, placeDetails, existing[0].address_id]
        );
        return existing[0].address_id;
    } else {
        // Insert new address
        const [result] = await pool.query(
            `INSERT INTO user_addresses 
             (username, division_id, district_name, police_station_id, union_id, village_id, place_details, is_primary)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [username, divisionId, districtName, policeStationId, unionId, villageId, placeDetails]
        );
        return result.insertId;
    }
}

// Get user full address (from normalized tables)
async function getUserFullAddress(username) {
    const [results] = await pool.query(
        `SELECT 
            ua.address_id,
            dv.division_name,
            dv.division_name_bn,
            ua.district_name,
            ps.police_station_name,
            ps.police_station_name_bn,
            un.union_name,
            un.union_name_bn,
            v.village_name,
            v.village_name_bn,
            ua.place_details
         FROM user_addresses ua
         LEFT JOIN divisions dv ON ua.division_id = dv.division_id
         LEFT JOIN police_stations ps ON ua.police_station_id = ps.police_station_id
         LEFT JOIN unions un ON ua.union_id = un.union_id
         LEFT JOIN villages v ON ua.village_id = v.village_id
         WHERE ua.username = ? AND ua.is_primary = 1`,
        [username]
    );
    
    return results.length > 0 ? results[0] : null;
}

// Get address hierarchy (for cascading dropdowns)
async function getAddressHierarchy() {
    const [results] = await pool.query(
        `SELECT 
            d.division_id,
            d.division_name,
            dt.district_name,
            ps.police_station_id,
            ps.police_station_name,
            u.union_id,
            u.union_name,
            v.village_id,
            v.village_name
         FROM divisions d
         LEFT JOIN districts dt ON dt.division_id = d.division_id
         LEFT JOIN police_stations ps ON ps.district_name = dt.district_name
         LEFT JOIN unions u ON u.police_station_id = ps.police_station_id
         LEFT JOIN villages v ON v.union_id = u.union_id
         ORDER BY d.division_name, dt.district_name, ps.police_station_name, u.union_name, v.village_name`
    );
    return results;
}

// =============================================================================
// ORIGINAL HELPER FUNCTIONS (MAINTAINED FOR BACKWARD COMPATIBILITY)
// =============================================================================

// Geocode an address to get coordinates
async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        // Use Nominatim (OpenStreetMap) for free geocoding
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        
        https.get(url, { 
            headers: { 
                'User-Agent': 'SecureVoice Crime Reporting System' 
            } 
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.length > 0) {
                        resolve({
                            latitude: parseFloat(parsed[0].lat),
                            longitude: parseFloat(parsed[0].lon)
                        });
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Geocoding parse error:', error);
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            console.error('Geocoding request error:', error);
            resolve(null);
        });
    });
}

// Calculate age from DOB
function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Find admin by location
async function findAdminByLocation(location) {
    const query = `
        SELECT username, district_name FROM admins 
        WHERE district_name IS NOT NULL 
        AND LOWER(?) LIKE CONCAT('%', LOWER(district_name), '%')
        LIMIT 1
    `;
    
    const [results] = await pool.query(query, [location]);
    
    if (results.length > 0) {
        return {
            adminUsername: results[0].username,
            districtName: results[0].district_name
        };
    }
    return null;
}

// Get or create location
async function getOrCreateLocation(locationName, districtName) {
    // First check if location already exists
    const [existingLocation] = await pool.query(
        'SELECT location_id, latitude, longitude FROM location WHERE LOWER(location_name) = LOWER(?)',
        [locationName]
    );

    if (existingLocation.length > 0) {
        // If location exists but has no coordinates, try to geocode and update
        const location = existingLocation[0];
        if (!location.latitude || !location.longitude) {
            const coords = await geocodeAddress(locationName);
            if (coords) {
                await pool.query(
                    'UPDATE location SET latitude = ?, longitude = ? WHERE location_id = ?',
                    [coords.latitude, coords.longitude, location.location_id]
                );
            }
        }
        return location.location_id;
    }

    // Location doesn't exist, create it with coordinates
    let latitude = null;
    let longitude = null;
    
    try {
        const coords = await geocodeAddress(locationName);
        if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
        }
    } catch (error) {
        console.error('Geocoding error for new location:', error);
    }

    const [insertResult] = await pool.query(
        'INSERT INTO location (location_name, district_name, latitude, longitude) VALUES (?, ?, ?, ?)',
        [locationName, districtName, latitude, longitude]
    );

    return insertResult.insertId;
}

// Get category ID
async function getCategoryId(complaintType) {
    const [results] = await pool.query(
        'SELECT category_id FROM category WHERE LOWER(name) = LOWER(?)',
        [complaintType]
    );

    return results.length > 0 ? results[0].category_id : null;
}

module.exports = {
    // Original functions (backward compatibility)
    calculateAge,
    findAdminByLocation,
    getOrCreateLocation,
    getCategoryId,
    geocodeAddress,
    
    // 3NF Normalized helper functions
    getCategoryIdNormalized,
    getCategoryName,
    getAllCategories,
    getDivisionId,
    getAllDivisions,
    getDistrictsByDivision,
    getAllDistricts,
    getPoliceStationsByDistrict,
    getOrCreatePoliceStation,
    getUnionsByPoliceStation,
    getOrCreateUnion,
    getVillagesByUnion,
    getOrCreateVillage,
    saveUserAddress,
    getUserFullAddress,
    getAddressHierarchy
};