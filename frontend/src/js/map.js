class CrimeMap {
    constructor() {
        this.map = null;
        this.markersLayer = L.layerGroup();
        this.heatmapLayer = null;

        this.isHeatmapVisible = false;
        this.isMarkersVisible = true;

        this.heatmapData = [];
        this.heatmapMeta = [];
        this.dataLoaded = false;
    }

    init() {
        this.map = L.map("map").setView([23.6850, 90.3563], 7);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(this.map);

        this.markersLayer.addTo(this.map);

        this.fetchHeatmapData();
        this.bindUI();

        console.log("CrimeMap initialized");
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
                return;
            }

            const maxIncident = Math.max(...points.map(p => Number(p.intensity) || 1));
            const scale = maxIncident > 0 ? maxIncident : 1;

            // Prepare data for heat layer and markers
            this.heatmapData = points.map(p => [
                Number(p.lat),
                Number(p.lng),
                Math.max((Number(p.intensity) || 1) / scale, 0.1)
            ]);

            this.heatmapMeta = points;
            this.addComplaintMarkers();
            this.dataLoaded = true;

            // Auto-show heatmap on first load for quick feedback
            this.toggleHeatmap(true);
        } catch (err) {
            console.error("Heatmap load error:", err);
        }
    }

    addComplaintMarkers() {
        this.markersLayer.clearLayers();

        if (!this.heatmapMeta.length) return;

        this.heatmapMeta.forEach(point => {
            const marker = L.marker([Number(point.lat), Number(point.lng)]).bindPopup(`
                <strong>${point.location || "Unknown Location"}</strong><br>
                District: ${point.district || "N/A"}<br>
                Type: ${point.type || "N/A"}<br>
                Category: ${point.category || "N/A"}<br>
                Status: ${point.status || "N/A"}<br>
                Reports: ${point.intensity}
            `);
            this.markersLayer.addLayer(marker);
        });
    }

    toggleHeatmap(forceOn = false) {
        if (!this.dataLoaded) {
            alert("Heatmap data is still loading or unavailable.");
            return;
        }

        if (!this.heatmapLayer) {
            this.heatmapLayer = L.heatLayer(this.heatmapData, {
                radius: 30,
                blur: 20,
                maxZoom: 12
            });
        }

        if (forceOn) {
            this.heatmapLayer.addTo(this.map);
            this.isHeatmapVisible = true;
            return;
        }

        if (this.isHeatmapVisible) {
            this.map.removeLayer(this.heatmapLayer);
        } else {
            this.heatmapLayer.addTo(this.map);
        }

        this.isHeatmapVisible = !this.isHeatmapVisible;
    }

    toggleMarkers() {
        if (this.isMarkersVisible) {
            this.map.removeLayer(this.markersLayer);
        } else {
            this.map.addLayer(this.markersLayer);
        }

        this.isMarkersVisible = !this.isMarkersVisible;
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
    if (!document.getElementById("map")) {
        console.error("Map container missing");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet not loaded");
        return;
    }

    window.crimeMap = new CrimeMap();
    crimeMap.init();
});
