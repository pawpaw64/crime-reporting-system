// Script to geocode existing locations in the database that don't have coordinates
// Run this after adding the coordinate columns to ensure all locations have lat/lng data

const pool = require('../src/db');
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

// Add delay to respect Nominatim rate limits (1 request per second)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeExistingLocations() {
    try {
        console.log('Fetching locations without coordinates...');
        
        // Get all locations without coordinates
        const [locations] = await pool.query(
            'SELECT location_id, location_name, district_name FROM location WHERE latitude IS NULL OR longitude IS NULL'
        );
        
        if (locations.length === 0) {
            console.log('✓ All locations already have coordinates!');
            process.exit(0);
        }
        
        console.log(`Found ${locations.length} locations to geocode`);
        console.log('This will take approximately', Math.ceil(locations.length * 1.1), 'seconds (respecting rate limits)\n');
        
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < locations.length; i++) {
            const location = locations[i];
            console.log(`[${i + 1}/${locations.length}] Geocoding: ${location.location_name}, ${location.district_name}`);
            
            // Create search query with district for better results
            const searchQuery = location.district_name 
                ? `${location.location_name}, ${location.district_name}, Bangladesh`
                : `${location.location_name}, Bangladesh`;
            
            const coords = await geocodeAddress(searchQuery);
            
            if (coords) {
                await pool.query(
                    'UPDATE location SET latitude = ?, longitude = ? WHERE location_id = ?',
                    [coords.latitude, coords.longitude, location.location_id]
                );
                console.log(`  ✓ Success: ${coords.latitude}, ${coords.longitude}\n`);
                successCount++;
            } else {
                console.log(`  ✗ Failed: Could not geocode location\n`);
                failureCount++;
            }
            
            // Wait 1.1 seconds between requests to respect Nominatim rate limits
            if (i < locations.length - 1) {
                await delay(1100);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('Geocoding complete!');
        console.log(`✓ Successfully geocoded: ${successCount}`);
        console.log(`✗ Failed to geocode: ${failureCount}`);
        console.log('='.repeat(50));
        
        process.exit(0);
    } catch (error) {
        console.error('Error geocoding locations:', error);
        process.exit(1);
    }
}

// Run the script
geocodeExistingLocations();
