/**
 * Address Hierarchy Controller
 * Handles normalized address lookups for 3NF database structure
 * Provides APIs for cascading address dropdowns (Division -> District -> Police Station -> Union -> Village)
 */

const pool = require('../db');
const {
    getAllDivisions,
    getDistrictsByDivision,
    getAllDistricts,
    getPoliceStationsByDistrict,
    getUnionsByPoliceStation,
    getVillagesByUnion,
    getAddressHierarchy,
    getAllCategories
} = require('../utils/helperUtils');

/**
 * Get all divisions
 * GET /api/address/divisions
 */
exports.getDivisions = async (req, res) => {
    try {
        const divisions = await getAllDivisions();
        res.json({
            success: true,
            divisions
        });
    } catch (error) {
        console.error('Get divisions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve divisions'
        });
    }
};

/**
 * Get all districts (optionally filtered by division)
 * GET /api/address/districts
 * GET /api/address/districts?divisionId=1
 */
exports.getDistricts = async (req, res) => {
    try {
        const { divisionId } = req.query;
        
        let districts;
        if (divisionId) {
            districts = await getDistrictsByDivision(parseInt(divisionId));
        } else {
            districts = await getAllDistricts();
        }
        
        res.json({
            success: true,
            districts
        });
    } catch (error) {
        console.error('Get districts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve districts'
        });
    }
};

/**
 * Get police stations by district
 * GET /api/address/police-stations?district=Dhaka
 */
exports.getPoliceStations = async (req, res) => {
    try {
        const { district } = req.query;
        
        if (!district) {
            return res.status(400).json({
                success: false,
                message: 'District name is required'
            });
        }
        
        const policeStations = await getPoliceStationsByDistrict(district);
        
        res.json({
            success: true,
            policeStations
        });
    } catch (error) {
        console.error('Get police stations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve police stations'
        });
    }
};

/**
 * Get unions by police station
 * GET /api/address/unions?policeStationId=1
 */
exports.getUnions = async (req, res) => {
    try {
        const { policeStationId } = req.query;
        
        if (!policeStationId) {
            return res.status(400).json({
                success: false,
                message: 'Police station ID is required'
            });
        }
        
        const unions = await getUnionsByPoliceStation(parseInt(policeStationId));
        
        res.json({
            success: true,
            unions
        });
    } catch (error) {
        console.error('Get unions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve unions'
        });
    }
};

/**
 * Get villages by union
 * GET /api/address/villages?unionId=1
 */
exports.getVillages = async (req, res) => {
    try {
        const { unionId } = req.query;
        
        if (!unionId) {
            return res.status(400).json({
                success: false,
                message: 'Union ID is required'
            });
        }
        
        const villages = await getVillagesByUnion(parseInt(unionId));
        
        res.json({
            success: true,
            villages
        });
    } catch (error) {
        console.error('Get villages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve villages'
        });
    }
};

/**
 * Get complete address hierarchy (for building cascading dropdowns)
 * GET /api/address/hierarchy
 */
exports.getFullAddressHierarchy = async (req, res) => {
    try {
        const hierarchy = await getAddressHierarchy();
        
        // Transform into nested structure for easy frontend consumption
        const nested = {};
        
        for (const row of hierarchy) {
            // Initialize division
            if (!nested[row.division_id]) {
                nested[row.division_id] = {
                    id: row.division_id,
                    name: row.division_name,
                    districts: {}
                };
            }
            
            // Initialize district
            if (row.district_name && !nested[row.division_id].districts[row.district_name]) {
                nested[row.division_id].districts[row.district_name] = {
                    name: row.district_name,
                    policeStations: {}
                };
            }
            
            // Initialize police station
            if (row.police_station_id && row.district_name) {
                const district = nested[row.division_id].districts[row.district_name];
                if (!district.policeStations[row.police_station_id]) {
                    district.policeStations[row.police_station_id] = {
                        id: row.police_station_id,
                        name: row.police_station_name,
                        unions: {}
                    };
                }
            }
            
            // Initialize union
            if (row.union_id && row.police_station_id && row.district_name) {
                const policeStation = nested[row.division_id].districts[row.district_name]
                    .policeStations[row.police_station_id];
                if (!policeStation.unions[row.union_id]) {
                    policeStation.unions[row.union_id] = {
                        id: row.union_id,
                        name: row.union_name,
                        villages: []
                    };
                }
            }
            
            // Add village
            if (row.village_id && row.union_id && row.police_station_id && row.district_name) {
                const union = nested[row.division_id].districts[row.district_name]
                    .policeStations[row.police_station_id].unions[row.union_id];
                if (!union.villages.find(v => v.id === row.village_id)) {
                    union.villages.push({
                        id: row.village_id,
                        name: row.village_name
                    });
                }
            }
        }
        
        res.json({
            success: true,
            hierarchy: nested,
            flat: hierarchy
        });
    } catch (error) {
        console.error('Get address hierarchy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve address hierarchy'
        });
    }
};

/**
 * Get all crime categories
 * GET /api/categories
 */
exports.getCategories = async (req, res) => {
    try {
        const categories = await getAllCategories();
        
        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
};

/**
 * Search locations (for autocomplete)
 * GET /api/address/search?q=dhaka
 */
exports.searchLocations = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                results: []
            });
        }
        
        const searchTerm = `%${q}%`;
        
        // Search across all address tables
        const [results] = await pool.query(`
            SELECT 'division' as type, division_id as id, division_name as name 
            FROM divisions WHERE division_name LIKE ?
            UNION ALL
            SELECT 'district' as type, NULL as id, district_name as name 
            FROM districts WHERE district_name LIKE ?
            UNION ALL
            SELECT 'police_station' as type, police_station_id as id, police_station_name as name 
            FROM police_stations WHERE police_station_name LIKE ?
            UNION ALL
            SELECT 'union' as type, union_id as id, union_name as name 
            FROM unions WHERE union_name LIKE ?
            UNION ALL
            SELECT 'village' as type, village_id as id, village_name as name 
            FROM villages WHERE village_name LIKE ?
            LIMIT 20
        `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
        
        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Search locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search locations'
        });
    }
};
