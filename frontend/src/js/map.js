class CrimeMap {
    constructor() {
        this.map = null;
        this.divisionMarkers = L.layerGroup();
        this.heatmapLayer = null;

        this.isHeatmapVisible = false;
        this.isDivisionMarkersVisible = true;

        this.divisions = [
            { name: "Dhaka", lat: 23.8103, lng: 90.4125 },
            { name: "Chattogram", lat: 22.3569, lng: 91.7832 },
            { name: "Rajshahi", lat: 24.3745, lng: 88.6042 },
            { name: "Khulna", lat: 22.8456, lng: 89.5403 },
            { name: "Sylhet", lat: 24.8949, lng: 91.8687 },
            { name: "Barishal", lat: 22.7010, lng: 90.3535 },
            { name: "Rangpur", lat: 25.7439, lng: 89.2752 },
            { name: "Mymensingh", lat: 24.7471, lng: 90.4203 }
        ];
        this.heatmapData = [];
        this.heatmapMeta = [];
        this.dataLoaded = false;
    }

    init() {
        this.map = L.map("map").setView([23.6850, 90.3563], 7);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(this.map);

        this.divisionMarkers.addTo(this.map);

        this.addDivisionMarkers();
        this.fetchHeatmapData();
        this.bindUI();

        console.log("CrimeMap initialized");
    }

    addDivisionMarkers() {
        this.divisionMarkers.clearLayers();

        this.divisions.forEach(div => {
            const marker = L.marker([div.lat, div.lng]).bindPopup(`
                <strong>${div.name} Division</strong>
            `);
            this.divisionMarkers.addLayer(marker);
        });
    }

    async fetchHeatmapData() {
        try {
            const response = await fetch("/complaint-heatmap-data");
            if (!response.ok) throw new Error("Failed to load heatmap data");

            const payload = await response.json();
            if (!payload.success) throw new Error(payload.message || "Heatmap data error");

            const points = payload.heatmapData || [];
            if (!points.length) {
                console.warn("Heatmap: no data returned");
                this.heatmapData = [];
                this.heatmapMeta = [];
                this.dataLoaded = true;
                return;
            }

            // Normalize intensity with a log-ish scale to emphasize dense clusters
            const rawIntensities = points.map(p => Math.max(Number(p.intensity) || 1, 1));
            const maxIncident = Math.max(...rawIntensities);
            const scaled = points.map(p => {
                const v = Math.max(Number(p.intensity) || 1, 1);
                // log compression so very dense spots stand out but small clusters still show
                return Math.max(Math.log1p(v) / Math.log1p(maxIncident || 1), 0.15);
            });

            // Prepare data for heat layer only (no point markers)
            this.heatmapData = points.map((p, idx) => [
                Number(p.lat),
                Number(p.lng),
                scaled[idx]
            ]);

            this.heatmapMeta = points;
            this.dataLoaded = true;

            // Auto-show heatmap on first load for quick feedback
            this.toggleHeatmap(true);
        } catch (err) {
            console.error("Heatmap load error:", err);
            // Allow UI toggling even if data failed to load
            this.dataLoaded = true;
            this.heatmapData = [];
            this.heatmapMeta = [];
        }
    }

    toggleHeatmap(forceOn = false) {
        // Allow toggle even if data is empty; warn but don't block
        if (!this.dataLoaded) {
            console.warn("Heatmap data is still loading; toggling anyway.");
        }

        // Recreate layer each time to apply updated data/gradient
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }

        this.heatmapLayer = L.heatLayer(this.heatmapData, {
            radius: 28,
            blur: 18,
            maxZoom: 14,
            gradient: {
                0.0: '#38bdf8',
                0.25: '#22c55e',
                0.5: '#facc15',
                0.75: '#fb923c',
                1.0: '#ef4444'
            }
        });

        if (forceOn) {
            this.heatmapLayer.addTo(this.map);
            this.isHeatmapVisible = true;
            return;
        }

        this.heatmapLayer.addTo(this.map);
        this.isHeatmapVisible = true;
    }

    toggleMarkers() {
        if (this.isDivisionMarkersVisible) {
            this.map.removeLayer(this.divisionMarkers);
        } else {
            this.map.addLayer(this.divisionMarkers);
        }

        this.isDivisionMarkersVisible = !this.isDivisionMarkersVisible;
    }

    locateMe() {
        if (!navigator.geolocation) return alert("Geolocation not supported");

        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            this.map.setView([latitude, longitude], 14);

            L.circleMarker([latitude, longitude], {
                radius: 8,
                color: "#007bff",
                fillOpacity: 0.8
            }).addTo(this.map).bindPopup("You are here").openPopup();
        });
    }

    resetView() {
        this.map.setView([23.6850, 90.3563], 7);
    }

    bindUI() {
        document.getElementById("toggleHeatmap")?.addEventListener("click", () => this.toggleHeatmap());
        document.getElementById("toggleMarkers")?.addEventListener("click", () => this.toggleMarkers());
        document.getElementById("locateMe")?.addEventListener("click", () => this.locateMe());
        document.getElementById("resetView")?.addEventListener("click", () => this.resetView());
    }
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const mapContainer = document.getElementById("map");
    
    if (!mapContainer) {
        // Map container not on this page - this is normal for non-map pages
        return;
    }

    if (typeof L === "undefined") {
        console.warn("Leaflet library not loaded. Map features will be unavailable.");
        // Show user-friendly message in map container
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; text-align: center; padding: 20px;">
                <i class="fas fa-map-marked-alt" style="font-size: 48px; margin-bottom: 15px; color: #ccc;"></i>
                <p style="margin: 0; font-size: 16px;">Map is currently unavailable</p>
                <p style="margin: 5px 0 0; font-size: 12px;">Please refresh the page or try again later</p>
            </div>
        `;
        return;
    }

    try {
        window.crimeMap = new CrimeMap();
        crimeMap.init();
    } catch (error) {
        console.error("Failed to initialize map:", error);
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #fff3f3; color: #c00; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p style="margin: 0; font-size: 16px;">Error loading map</p>
                <p style="margin: 5px 0 0; font-size: 12px;">${error.message}</p>
            </div>
        `;
    }
});
