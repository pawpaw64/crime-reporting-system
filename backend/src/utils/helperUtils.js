const pool = require('../db');

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
    const [existingLocation] = await pool.query(
        'SELECT location_id FROM location WHERE LOWER(location_name) = LOWER(?)',
        [locationName]
    );

    if (existingLocation.length > 0) {
        return existingLocation[0].location_id;
    }

    const [insertResult] = await pool.query(
        'INSERT INTO location (location_name, district_name) VALUES (?, ?)',
        [locationName, districtName]
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
    getCategoryId
};