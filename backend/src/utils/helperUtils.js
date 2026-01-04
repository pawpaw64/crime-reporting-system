const pool = require('../db');
const https = require('https');

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
    calculateAge,
    findAdminByLocation,
    getOrCreateLocation,
    getCategoryId,
    geocodeAddress
};