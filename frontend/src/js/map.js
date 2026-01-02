// Map.js - Interactive Crime Reporting Map
class CrimeMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.divisions = [
            { name: "Dhaka Division", lat: 23.8103, lng: 90.4125, reports: 145 },
            { name: "Chattogram Division", lat: 22.3569, lng: 91.7832, reports: 98 },
            { name: "Rajshahi Division", lat: 24.3745, lng: 88.6042, reports: 67 },
            { name: "Khulna Division", lat: 22.8456, lng: 89.5403, reports: 84 },
            { name: "Barishal Division", lat: 22.7010, lng: 90.3535, reports: 45 },
            { name: "Sylhet Division", lat: 24.8949, lng: 91.8687, reports: 72 },
            { name: "Rangpur Division", lat: 25.7439, lng: 89.2752, reports: 56 },
            { name: "Mymensingh Division", lat: 24.7471, lng: 90.4203, reports: 63 }
        ];
    }

    // Initialize the map
    init() {
        try {
            // Create map with default view (will be updated with user location)
            this.map = L.map('map').setView([23.6850, 90.3563], 10);

            // Remove bounds restriction for global view
            this.map.setMinZoom(2);
            this.map.setMaxZoom(18);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            // Try to get user location first
            this.initializeUserLocation();

            // Add division markers
            this.addDivisionMarkers();

            // Setup event listeners
            this.setupEventListeners();

            console.log('Crime Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    // Initialize with user location
    initializeUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    // Center map on user location
                    this.map.setView([latitude, longitude], 14);
                    
                    // Add user location marker
                    const userMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-location',
                            html: '<div style="background: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,123,255,0.5);"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(this.map);

                    userMarker.bindPopup('<strong>Your Location</strong>');
                    console.log('Map centered on user location');
                },
                (error) => {
                    console.log('Geolocation failed, using default Bangladesh view');
                    // Keep default Bangladesh view if geolocation fails
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
            );
        } else {
            console.log('Geolocation not supported, using default view');
        }
    }

    // Add markers for all divisions
    addDivisionMarkers() {
        this.divisions.forEach(division => {
            const marker = L.marker([division.lat, division.lng])
                .addTo(this.map)
                .bindPopup(this.createPopupContent(division));
            
            this.markers.push(marker);
        });
    }

    // Create popup content for division
    createPopupContent(division) {
        return `
            <div style="min-width: 200px;">
                <strong style="color: #007bff; font-size: 1.1em;">${division.name}</strong><br>
                <div style="margin: 8px 0;">
                    <i class="fas fa-file-alt" style="color: #28a745; margin-right: 5px;"></i>
                    <strong>${division.reports}</strong> Crime Reports
                </div>
                <div style="margin: 8px 0; font-size: 0.9em; color: #666;">
                    Click to view detailed statistics
                </div>
                <button onclick="crimeMap.viewDivisionDetails('${division.name}')" 
                        style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
                    View Details
                </button>
            </div>
        `;
    }

    // Setup event listeners for map controls
    setupEventListeners() {
        // Locate me button
        const locateBtn = document.getElementById('locateMe');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => this.locateUser());
        }

        // Reset view button
        const resetBtn = document.getElementById('resetView');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetView());
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('toggleFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    // Locate user on map
    locateUser() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Add user marker
                const userMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        className: 'user-location',
                        html: '<div style="background: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,123,255,0.5);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(this.map);

                userMarker.bindPopup('<strong>Your Location</strong>').openPopup();
                this.map.setView([latitude, longitude], 14);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to retrieve your location. Please check your location settings.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Reset map view to user location or default
    resetView() {
        // Try to get current user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], 14);
                },
                (error) => {
                    // If geolocation fails, use default Bangladesh view
                    this.map.setView([23.6850, 90.3563], 10);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            // No geolocation support, use default view
            this.map.setView([23.6850, 90.3563], 10);
        }
    }

    // Toggle fullscreen mode
    toggleFullscreen() {
        const mapContainer = document.getElementById('map');
        
        if (!document.fullscreenElement) {
            if (mapContainer.requestFullscreen) {
                mapContainer.requestFullscreen();
            } else if (mapContainer.webkitRequestFullscreen) {
                mapContainer.webkitRequestFullscreen();
            } else if (mapContainer.msRequestFullscreen) {
                mapContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }

        // Invalidate map size after fullscreen change
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }

    // View division details (placeholder function)
    viewDivisionDetails(divisionName) {
        alert(`Viewing detailed crime statistics for ${divisionName}\n\nThis feature will show:\n• Crime types breakdown\n• Monthly trends\n• Resolution rates\n• Safety recommendations`);
    }

    // Add a new crime report marker
    addCrimeReport(lat, lng, reportData) {
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'crime-report-marker',
                html: '<div style="background: #dc3545; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(220,53,69,0.5);"></div>',
                iconSize: [15, 15],
                iconAnchor: [7, 7]
            })
        }).addTo(this.map);

        const popupContent = `
            <div style="min-width: 150px;">
                <strong style="color: #dc3545;">${reportData.type || 'Crime Report'}</strong><br>
                <div style="margin: 5px 0; font-size: 0.9em;">
                    <i class="fas fa-calendar" style="margin-right: 5px;"></i>
                    ${reportData.date || 'Unknown date'}
                </div>
                <div style="margin: 5px 0; font-size: 0.9em;">
                    <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                    Status: ${reportData.status || 'Under Investigation'}
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        this.markers.push(marker);
        return marker;
    }
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance
    window.crimeMap = new CrimeMap();
    
    // Initialize the map
    crimeMap.init();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrimeMap;
}