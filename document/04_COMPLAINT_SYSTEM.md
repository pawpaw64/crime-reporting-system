# Complaint Management System
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Complaint Submission Flow](#complaint-submission-flow)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Evidence Upload System](#evidence-upload-system)
6. [Location & Map Integration](#location--map-integration)
7. [Status Tracking](#status-tracking)
8. [Notification System](#notification-system)
9. [API Endpoints](#api-endpoints)

---

## Overview

The Complaint Management System enables users to:
- File crime complaints with detailed information
- Upload evidence (images, videos, audio)
- Select precise location via interactive map
- Track complaint status in real-time
- Communicate with assigned admin via chat
- Receive notifications on status updates

---

## Complaint Submission Flow

```
User Logs In
     ↓
Navigates to "File New Complaint"
     ↓
Fills Complaint Form:
  - Crime Type (dropdown)
  - Description (text)
  - Incident Date (date picker)
  - Location (map + text)
     ↓
Uploads Evidence (optional):
  - Images (max 50MB each)
  - Videos (max 50MB each)
  - Audio (max 50MB each)
     ↓
Submit Complaint
     ↓
System Processing:
  ├── Extract district from location
  ├── Find available admin for district
  ├── Get/Create location record
  ├── Get/Create category record
  └── Store complaint with evidence
     ↓
Return Complaint ID
     ↓
User Can Track Status
```

---

## Backend Implementation

### File: `backend/src/controllers/complaintController.js`

#### Submit Complaint Function

```javascript
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const {
    findAdminByLocation,      // Find admin for the district
    getOrCreateLocation,      // Get or create location record
    getCategoryIdNormalized   // Get or create category record
} = require('../utils/helperUtils');

exports.submitComplaint = async (req, res) => {
    try {
        // ============ AUTHENTICATION CHECK ============
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        // ============ EXTRACT REQUEST DATA ============
        const { 
            complaintType,     // Crime category (e.g., "theft", "assault")
            description,       // Detailed description
            incidentDate,      // When the incident occurred
            location,          // Text address
            latitude,          // GPS latitude (optional)
            longitude,         // GPS longitude (optional)
            accuracyRadius     // Location accuracy in meters (optional)
        } = req.body;
        
        const username = req.session.username;

        // ============ INPUT VALIDATION ============
        if (!complaintType || !description || !incidentDate || !location) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        // ============ FIND ADMIN FOR LOCATION ============
        // This function extracts district from location text and finds assigned admin
        const adminData = await findAdminByLocation(location);

        if (!adminData) {
            return res.status(400).json({
                success: false,
                message: "No authority from this district is available right now"
            });
        }

        const { adminUsername, districtName } = adminData;

        // ============ GET OR CREATE LOCATION RECORD ============
        // Uses 3NF normalized location table
        const locationId = await getOrCreateLocation(location, districtName);

        // ============ GET OR CREATE CATEGORY RECORD ============
        // Finds existing category or creates new one
        const categoryId = await getCategoryIdNormalized(complaintType);

        // ============ FORMAT DATES ============
        const formattedDate = new Date(incidentDate)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');
        const createdAt = new Date()
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');

        // ============ PARSE COORDINATES ============
        let lat = null, lng = null, radius = null;
        
        if (latitude && longitude) {
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);
            
            // Validate coordinate ranges
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid coordinate values"
                });
            }
            
            // Parse accuracy radius if provided
            if (accuracyRadius) {
                radius = parseInt(accuracyRadius);
                if (radius <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid accuracy radius"
                    });
                }
            }
        }

        // ============ INSERT COMPLAINT ============
        const [complaintResult] = await pool.query(
            `INSERT INTO complaint (
                description, created_at, status, username, admin_username, 
                location_id, complaint_type, location_address, category_id,
                latitude, longitude, location_accuracy_radius
            ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                description,        // User's description
                formattedDate,      // Incident date
                username,           // Complainant
                adminUsername,      // Assigned admin
                locationId,         // FK to location table
                complaintType,      // Crime type text
                location,           // Full address text
                categoryId,         // FK to category table
                lat,                // Latitude (nullable)
                lng,                // Longitude (nullable)
                radius              // Accuracy radius (nullable)
            ]
        );

        const complaintId = complaintResult.insertId;

        // ============ HANDLE FILE UPLOADS ============
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Determine file type from MIME type
                let fileType;
                if (file.mimetype.startsWith('image/')) {
                    fileType = 'image';
                } else if (file.mimetype.startsWith('video/')) {
                    fileType = 'video';
                } else if (file.mimetype.startsWith('audio/')) {
                    fileType = 'audio';
                }

                // Build relative path based on file type
                let relativePath;
                if (file.mimetype.startsWith('image/')) {
                    relativePath = `images/${file.filename}`;
                } else if (file.mimetype.startsWith('video/')) {
                    relativePath = `videos/${file.filename}`;
                } else if (file.mimetype.startsWith('audio/')) {
                    relativePath = `audio/${file.filename}`;
                } else {
                    relativePath = file.filename;
                }

                // Insert evidence record
                await pool.query(
                    `INSERT INTO evidence (uploaded_at, file_type, file_path, complaint_id)
                     VALUES (?, ?, ?, ?)`,
                    [createdAt, fileType, relativePath, complaintId]
                );
            }
        }

        // ============ SUCCESS RESPONSE ============
        res.json({
            success: true,
            message: "Complaint submitted successfully!",
            complaintId: complaintId,
            complaint: {
                id: complaintId,
                type: complaintType,
                status: 'pending',
                location: location,
                latitude: latitude,
                longitude: longitude,
                accuracyRadius: accuracyRadius,
                createdAt: formattedDate
            }
        });

    } catch (err) {
        console.error("Submit complaint error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error submitting complaint" 
        });
    }
};
```

### Helper Functions (helperUtils.js)

#### Find Admin by Location

```javascript
/**
 * Find an available admin for a given location
 * Extracts district from location text and finds assigned admin
 */
async function findAdminByLocation(locationText) {
    if (!locationText) return null;
    
    // Extract potential district name from location
    const locationParts = locationText.split(',').map(p => p.trim());
    
    for (const part of locationParts) {
        // Try to find an admin for this district
        const [admins] = await pool.query(
            `SELECT a.username, a.district_name 
             FROM admins a
             JOIN admin_approval_workflow aw ON a.username = aw.admin_username
             WHERE LOWER(a.district_name) LIKE LOWER(?)
               AND a.is_active = 1
               AND aw.status = 'approved'
             LIMIT 1`,
            [`%${part}%`]
        );
        
        if (admins.length > 0) {
            return {
                adminUsername: admins[0].username,
                districtName: admins[0].district_name
            };
        }
    }
    
    return null;
}
```

**Logic:**
1. Splits location text by commas (e.g., "Village, Union, District, Division")
2. Tries each part to find a matching admin
3. Checks admin is active and approved
4. Returns first matching admin with district

#### Get or Create Location

```javascript
/**
 * Get existing location or create new one
 * Part of 3NF normalization
 */
async function getOrCreateLocation(locationName, districtName) {
    // Try to find existing location
    const [existing] = await pool.query(
        `SELECT location_id FROM location 
         WHERE location_name = ? AND district_name = ?`,
        [locationName, districtName]
    );
    
    if (existing.length > 0) {
        return existing[0].location_id;
    }
    
    // Create new location
    const [result] = await pool.query(
        `INSERT INTO location (location_name, district_name) 
         VALUES (?, ?)`,
        [locationName, districtName]
    );
    
    return result.insertId;
}
```

#### Get Category ID (Normalized)

```javascript
/**
 * Get category ID by name or crime code
 * Creates new category if not exists (3NF normalized)
 */
async function getCategoryIdNormalized(categoryNameOrCode) {
    if (!categoryNameOrCode) return null;
    
    // Try to find existing category
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
        `INSERT INTO category (name, crime_code, description) 
         VALUES (?, ?, ?)`,
        [categoryNameOrCode, crimeCode, `Category: ${categoryNameOrCode}`]
    );
    
    return insertResult.insertId;
}
```

---

## Frontend Implementation

### File: `frontend/src/js/report-form.js`

```javascript
// Complaint Form Component
import { apiCall } from './api.js';

export function initComplaintForm() {
    document.addEventListener("DOMContentLoaded", () => {
        const form = document.querySelector("form");
        const mapContainer = document.querySelector(".map-placeholder");
        let map;
        let marker;
        
        // File storage for uploads
        let selectedFiles = {
            image: null,
            video: null,
            audio: null
        };

        // ============ FILE UPLOAD HANDLING ============
        const imageUpload = document.getElementById('imageUpload');
        const videoUpload = document.getElementById('videoUpload');
        const audioUpload = document.getElementById('audioUpload');

        if (imageUpload) {
            imageUpload.addEventListener('change', function(e) {
                selectedFiles.image = e.target.files[0];
                updateUploadDisplay('image', e.target.files[0]);
            });
        }

        if (videoUpload) {
            videoUpload.addEventListener('change', function(e) {
                selectedFiles.video = e.target.files[0];
                updateUploadDisplay('video', e.target.files[0]);
            });
        }

        if (audioUpload) {
            audioUpload.addEventListener('change', function(e) {
                selectedFiles.audio = e.target.files[0];
                updateUploadDisplay('audio', e.target.files[0]);
            });
        }

        // Update upload box visual feedback
        function updateUploadDisplay(type, file) {
            const uploadBox = document.querySelector(`#${type}Upload`)
                .closest('.upload-box');
            if (file && uploadBox) {
                uploadBox.style.backgroundColor = '#e8f5e8';
                uploadBox.style.borderColor = '#28a745';
                const span = uploadBox.querySelector('span');
                if (span) {
                    span.innerHTML = `✓ ${file.name}<br><small>File selected</small>`;
                }
            }
        }
```

#### Map Button Handler (Geolocation)

```javascript
        // ============ MAP INTEGRATION ============
        const mapBtn = document.querySelector(".map-btn");
        const locationInput = document.getElementById("location");
        
        // OpenCage API Key for reverse geocoding
        const OPENCAGE_API_KEY = 'your-api-key-here';

        // Get address from coordinates
        function getAddressFromCoords(lat, lng) {
            const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}`;
            
            return fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.results.length > 0) {
                        return data.results[0].formatted;
                    } else {
                        throw new Error("No address found");
                    }
                });
        }

        // Update location input and marker
        function updateLocation(lat, lng) {
            getAddressFromCoords(lat, lng)
                .then(formatted => {
                    locationInput.value = formatted;
                    if (marker) {
                        marker.bindPopup(`📍 ${formatted}`).openPopup();
                    }
                })
                .catch(error => {
                    console.error("Error getting address:", error);
                    // Fallback to coordinates
                    locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                });
        }

        if (mapBtn && locationInput) {
            mapBtn.addEventListener("click", () => {
                // Check geolocation support
                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser");
                    return;
                }

                navigator.geolocation.getCurrentPosition(success, error);

                function success(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    // Initialize map container
                    mapContainer.innerHTML = `<div id="map" style="height: 300px;"></div>`;

                    // Initialize Leaflet map
                    if (!map) {
                        map = L.map('map').setView([lat, lng], 16);
                        
                        // Add OpenStreetMap tiles
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; OpenStreetMap contributors'
                        }).addTo(map);
                    } else {
                        map.setView([lat, lng], 16);
                    }

                    // Create draggable marker
                    if (marker) {
                        marker.setLatLng([lat, lng]);
                    } else {
                        marker = L.marker([lat, lng], { 
                            draggable: true  // Allow user to adjust location
                        }).addTo(map);
                        
                        // Handle marker drag
                        marker.on('dragend', function(e) {
                            const position = e.target.getLatLng();
                            updateLocation(position.lat, position.lng);
                        });
                        
                        // Handle map click
                        map.on('click', function(e) {
                            const { lat, lng } = e.latlng;
                            marker.setLatLng([lat, lng]);
                            updateLocation(lat, lng);
                        });
                    }

                    // Set initial location
                    updateLocation(lat, lng);
                }

                function error() {
                    alert("Unable to retrieve your location.");
                }
            });
        }
```

**Leaflet.js Integration:**
1. Uses browser's Geolocation API to get current position
2. Creates Leaflet map centered on user's location
3. Adds draggable marker for precise location selection
4. Uses OpenCage API (or Nominatim) for reverse geocoding
5. Clicking map or dragging marker updates location

#### Form Submission

```javascript
        // ============ FORM SUBMISSION ============
        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();

                // Create FormData for multipart submission
                const formData = new FormData();

                // Add form fields
                formData.append('complaintType', 
                    document.getElementById('complaintType').value);
                formData.append('description', 
                    document.getElementById('description').value);
                formData.append('incidentDate', 
                    document.getElementById('incidentDate').value);
                formData.append('location', 
                    document.getElementById('location').value);

                // Add files (using same field name for multer array)
                if (selectedFiles.image) {
                    formData.append('evidence', selectedFiles.image);
                }
                if (selectedFiles.video) {
                    formData.append('evidence', selectedFiles.video);
                }
                if (selectedFiles.audio) {
                    formData.append('evidence', selectedFiles.audio);
                }

                // Submit using API module
                apiCall('/reports/submit', {
                    method: 'POST',
                    body: formData
                    // Note: Don't set Content-Type header for FormData
                })
                .then(data => {
                    if (data.success) {
                        // Show success modal
                        showSuccessModal(data.complaintId);
                        
                        // Notify admin
                        if (data.complaint && data.complaint.id) {
                            notifyAdmin(data.complaint.id);
                        }
                    } else {
                        alert(data.message || 'Submission failed');
                    }
                })
                .catch(error => {
                    console.error('Submission error:', error);
                    alert('Error submitting complaint');
                });
            });
        }

        // Notify admin about new complaint
        function notifyAdmin(complaintId) {
            apiCall('/admin/notify', {
                method: 'POST',
                body: JSON.stringify({ complaintId })
            })
            .then(notifyData => {
                console.log('Notification response:', notifyData);
            })
            .catch(error => {
                console.error('Error notifying admin:', error);
            });
        }

        // Show success modal
        function showSuccessModal(complaintId) {
            const modal = document.getElementById("successModal");
            const idDisplay = document.getElementById("complaintIdDisplay");
            
            if (idDisplay) {
                idDisplay.textContent = `#${complaintId}`;
            }
            
            if (modal) {
                modal.classList.remove('hidden');
            }
        }
    });
}
```

---

## Evidence Upload System

### File: `backend/src/middleware/uploadMiddleware.js`

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let uploadDir = 'uploads/';
        
        // Organize by file type
        if (file.mimetype.startsWith('image/')) {
            uploadDir += 'images/';
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir += 'videos/';
        } else if (file.mimetype.startsWith('audio/')) {
            uploadDir += 'audio/';
        }
        
        cb(null, uploadDir);
    },
    
    filename: function(req, file, cb) {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${uniqueId}${ext}`);
    }
});

// File filter (validate file types)
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // Videos
        'video/mp4',
        'video/mpeg',
        'video/webm',
        'video/quicktime',
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024,  // 50MB max per file
        files: 10                     // Max 10 files per request
    },
    fileFilter: fileFilter
});

module.exports = {
    // For complaint evidence uploads
    uploadEvidence: upload.array('evidence', 10),
    
    // For single file uploads
    uploadSingle: upload.single('file'),
    
    // Error handler middleware
    handleUploadError: (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large (max 50MB)'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Too many files (max 10)'
                });
            }
        }
        
        if (err.message === 'Invalid file type') {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Allowed: images, videos, audio'
            });
        }
        
        next(err);
    }
};
```

### Usage in Routes

```javascript
// File: backend/src/routes/complaints.js
const express = require('express');
const router = express.Router();
const { uploadEvidence, handleUploadError } = require('../middleware/uploadMiddleware');
const complaintController = require('../controllers/complaintController');

// Submit complaint with evidence
router.post('/submit',
    uploadEvidence,           // Handle file uploads first
    handleUploadError,        // Handle upload errors
    complaintController.submitComplaint
);
```

---

## Location & Map Integration

### File: `frontend/src/js/map.js`

```javascript
/**
 * Crime Heatmap Visualization
 * Uses Leaflet.js with leaflet-heat plugin
 */

// Default center (Bangladesh)
const DEFAULT_CENTER = [23.8103, 90.4125];
const DEFAULT_ZOOM = 7;

// Division markers for Bangladesh
const DIVISION_MARKERS = {
    'Dhaka': [23.8103, 90.4125],
    'Chittagong': [22.3569, 91.7832],
    'Rajshahi': [24.3745, 88.6042],
    'Khulna': [22.8456, 89.5403],
    'Sylhet': [24.8949, 91.8687],
    'Barisal': [22.7010, 90.3535],
    'Rangpur': [25.7439, 89.2752],
    'Mymensingh': [24.7471, 90.4203]
};

let map = null;
let heatLayer = null;
let markers = [];

/**
 * Initialize the heatmap
 */
function initHeatmap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create Leaflet map
    map = L.map(containerId).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add division markers
    for (const [name, coords] of Object.entries(DIVISION_MARKERS)) {
        L.marker(coords)
            .bindPopup(`<strong>${name} Division</strong>`)
            .addTo(map);
    }

    // Load heatmap data
    loadHeatmapData();
}

/**
 * Load complaint locations for heatmap
 */
async function loadHeatmapData() {
    try {
        const response = await fetch('/api/heatmap-data', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.locations) {
            updateHeatmap(data.locations);
        }
    } catch (error) {
        console.error('Error loading heatmap data:', error);
    }
}

/**
 * Update heatmap with location data
 */
function updateHeatmap(locations) {
    // Remove existing heat layer
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    // Convert locations to heat data format [lat, lng, intensity]
    const heatData = locations
        .filter(loc => loc.latitude && loc.longitude)
        .map(loc => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
            loc.count || 1  // Intensity based on complaint count
        ]);

    if (heatData.length > 0) {
        // Create heat layer using leaflet-heat plugin
        heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'lime',
                0.7: 'yellow',
                0.8: 'orange',
                1.0: 'red'
            }
        }).addTo(map);
    }
}

/**
 * Add a single location marker
 */
function addLocationMarker(lat, lng, popupContent) {
    const marker = L.marker([lat, lng])
        .bindPopup(popupContent)
        .addTo(map);
    
    markers.push(marker);
    return marker;
}

/**
 * Clear all markers
 */
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Export functions
window.MapUtils = {
    initHeatmap,
    loadHeatmapData,
    updateHeatmap,
    addLocationMarker,
    clearMarkers
};
```

---

## Status Tracking

### Get User Complaints (Backend)

```javascript
// File: backend/src/controllers/complaintController.js

exports.getUserComplaints = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        const userId = req.session.userId;

        // Fetch user's complaints with category info
        const [complaints] = await pool.query(
            `SELECT 
                c.complaint_id,
                c.complaint_type,
                c.description,
                c.created_at,
                c.status,
                c.location_address,
                c.admin_username,
                cat.name as category_name,
                cat.crime_code
             FROM complaint c
             JOIN users u ON c.username = u.username
             LEFT JOIN category cat ON c.category_id = cat.category_id
             WHERE u.userid = ?
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json({ success: true, complaints });
        
    } catch (err) {
        console.error("Get user complaints error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error" 
        });
    }
};
```

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Newly submitted, awaiting review |
| `verifying` | Admin is verifying information |
| `investigating` | Active investigation underway |
| `resolved` | Case closed/resolved |

### Frontend: My Complaints Page

```javascript
// File: frontend/src/js/myComplaints.js

document.addEventListener('DOMContentLoaded', () => {
    loadMyComplaints();
});

async function loadMyComplaints() {
    try {
        const response = await fetch('/api/user/complaints', {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.success) {
            showError('Failed to load complaints');
            return;
        }

        renderComplaints(data.complaints);
    } catch (error) {
        console.error('Error:', error);
        showError('Error loading complaints');
    }
}

function renderComplaints(complaints) {
    const container = document.getElementById('complaints-container');

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Complaints Yet</h3>
                <p>You haven't filed any complaints.</p>
                <a href="/report-form" class="btn-primary">File a Complaint</a>
            </div>
        `;
        return;
    }

    container.innerHTML = complaints.map(c => `
        <div class="complaint-card" data-id="${c.complaint_id}">
            <div class="card-header">
                <span class="complaint-id">#${c.complaint_id}</span>
                <span class="status-badge ${c.status}">${formatStatus(c.status)}</span>
            </div>
            
            <div class="card-body">
                <h4>${c.complaint_type || 'General Complaint'}</h4>
                <p class="description">${truncate(c.description, 150)}</p>
                
                <div class="meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${c.location_address || 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(c.created_at)}</span>
                </div>
            </div>
            
            <div class="card-footer">
                <button onclick="viewDetails(${c.complaint_id})" class="btn-secondary">
                    View Details
                </button>
                <button onclick="openChat(${c.complaint_id})" class="btn-primary">
                    <i class="fas fa-comments"></i> Chat
                </button>
            </div>
        </div>
    `).join('');
}

// Status formatting
function formatStatus(status) {
    const labels = {
        'pending': 'Pending',
        'verifying': 'Under Verification',
        'investigating': 'Under Investigation',
        'resolved': 'Resolved'
    };
    return labels[status] || status;
}

// Date formatting
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Text truncation
function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
```

---

## Notification System

### File: `backend/src/utils/notificationUtils.js`

```javascript
const pool = require('../db');

/**
 * Create a notification for a complaint
 * @param {number} complaintId - Complaint ID
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
async function createNotification(complaintId, message, type = 'general') {
    try {
        await pool.query(
            `INSERT INTO complaint_notifications 
             (complaint_id, message, notification_type, is_read, created_at)
             VALUES (?, ?, ?, 0, NOW())`,
            [complaintId, message, type]
        );
    } catch (err) {
        console.error('Error creating notification:', err);
    }
}

/**
 * Get notifications for a complaint
 */
async function getNotifications(complaintId) {
    const [notifications] = await pool.query(
        `SELECT * FROM complaint_notifications 
         WHERE complaint_id = ?
         ORDER BY created_at DESC`,
        [complaintId]
    );
    return notifications;
}

/**
 * Mark notifications as read
 */
async function markAsRead(complaintId) {
    await pool.query(
        `UPDATE complaint_notifications 
         SET is_read = 1 
         WHERE complaint_id = ?`,
        [complaintId]
    );
}

/**
 * Get unread notification count for user
 */
async function getUnreadCount(username) {
    const [result] = await pool.query(
        `SELECT COUNT(*) as count 
         FROM complaint_notifications cn
         JOIN complaint c ON cn.complaint_id = c.complaint_id
         WHERE c.username = ? AND cn.is_read = 0`,
        [username]
    );
    return result[0].count;
}

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    getUnreadCount
};
```

### Notification Types

| Type | Triggered By |
|------|--------------|
| `status_update` | Admin changes complaint status |
| `admin_comment` | Admin sends chat message |
| `evidence_viewed` | Admin views evidence |
| `resolved` | Complaint marked as resolved |

---

## API Endpoints

### Complaint Submission

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/reports/submit` | Submit complaint with evidence | Yes |
| POST | `/reports/submit-complaint` | Alternative submit endpoint | Yes |

### Complaint Retrieval

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/complaints` | Get user's complaints | Yes |
| GET | `/api/complaints/:id` | Get specific complaint | Yes |
| GET | `/api/heatmap-data` | Get complaint locations for heatmap | No |

### Notifications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Get all user notifications | Yes |
| GET | `/api/notifications/:complaintId` | Get complaint notifications | Yes |
| POST | `/api/notifications/:complaintId/read` | Mark as read | Yes |

### Chat

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/chat/:complaintId` | Get chat messages | Yes |
| POST | `/api/chat/send` | Send chat message | Yes |

---

## Database Schema

### Complaint Table
```sql
CREATE TABLE IF NOT EXISTS `complaint` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `status` enum('pending','verifying','investigating','resolved') DEFAULT 'pending',
  `username` varchar(100) DEFAULT NULL,
  `admin_username` varchar(100) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `complaint_type` varchar(100) DEFAULT NULL,
  `location_address` text,
  `category_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `location_accuracy_radius` int DEFAULT NULL,
  `is_discarded` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`complaint_id`),
  FOREIGN KEY (`username`) REFERENCES `users` (`username`),
  FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`),
  FOREIGN KEY (`location_id`) REFERENCES `location` (`location_id`),
  FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`)
);
```

### Evidence Table
```sql
CREATE TABLE IF NOT EXISTS `evidence` (
  `evidence_id` int NOT NULL AUTO_INCREMENT,
  `uploaded_at` datetime DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `complaint_id` int DEFAULT NULL,
  PRIMARY KEY (`evidence_id`),
  FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`)
);
```

### Category Table
```sql
CREATE TABLE IF NOT EXISTS `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `crime_code` varchar(50) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `unique_category_name` (`name`)
);
```

### Location Table
```sql
CREATE TABLE IF NOT EXISTS `location` (
  `location_id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(100) DEFAULT NULL,
  `district_name` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `accuracy_radius` int DEFAULT NULL,
  PRIMARY KEY (`location_id`),
  FOREIGN KEY (`district_name`) REFERENCES `districts` (`district_name`)
);
```

---

*Next: [05_ANONYMOUS_REPORTS.md](05_ANONYMOUS_REPORTS.md) - Anonymous Reporting System*
