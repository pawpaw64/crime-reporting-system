document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const successModal = document.getElementById("successModal");
    const errorModal = document.getElementById("errorModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const closeErrorBtn = document.getElementById("closeErrorBtn");
    const viewComplaintsBtn = document.getElementById("viewComplaintsBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const mapBtn = document.getElementById("mapBtn");
    const locationInput = document.getElementById("location");
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const mapContainer = document.getElementById("mapPlaceholder");
    const statusMessage = document.getElementById("statusMessage");
    const submitBtn = document.getElementById("submitBtn");
    
    let map = null;
    let marker = null;
    let selectedFiles = {
        image: null,
        video: null,
        audio: null
    };

    // Handle Cancel button click
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to cancel? Any unsaved data will be lost.")) {
                window.location.href = '/profile';
            }
        });
    }

    // Handle file uploads
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

    function updateUploadDisplay(type, file) {
        const uploadBox = document.querySelector(`#${type}Upload`)?.closest('.upload-box');
        if (file && uploadBox) {
            uploadBox.style.backgroundColor = '#e8f5e8';
            uploadBox.style.borderColor = '#28a745';
            const span = uploadBox.querySelector('span');
            if (span) {
                span.innerHTML = `✓ ${file.name}<br><small>File selected</small>`;
            }
        }
    }

    // Show status message
    function showStatus(message, type = 'info') {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
            statusMessage.classList.remove('hidden');
            
            // Auto-hide for success/info messages after 5 seconds
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusMessage.classList.add('hidden');
                }, 5000);
            }
        }
    }

    // Hide status message
    function hideStatus() {
        if (statusMessage) {
            statusMessage.classList.add('hidden');
        }
    }

    // Set loading state on submit button
    function setLoading(isLoading) {
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            if (isLoading) {
                submitBtn.disabled = true;
                if (btnText) btnText.classList.add('hidden');
                if (btnLoading) btnLoading.classList.remove('hidden');
            } else {
                submitBtn.disabled = false;
                if (btnText) btnText.classList.remove('hidden');
                if (btnLoading) btnLoading.classList.add('hidden');
            }
        }
    }

    // Function to get address from coordinates using Nominatim (free, no API key)
    async function getAddressFromCoords(lat, lng) {
        try {
            // Check if OPENCAGE_API_KEY is defined and valid
            if (typeof OPENCAGE_API_KEY !== 'undefined' && OPENCAGE_API_KEY !== 'YOUR_OPENCAGE_API_KEY') {
                // Use OpenCage API if key is available
                const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}`;
                const response = await fetch(apiUrl);
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    return data.results[0].formatted;
                }
            }
            
            // Fallback to Nominatim (free, no API key needed)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'SecureVoice Crime Reporting System'
                    }
                }
            );
            const data = await response.json();
            if (data && data.display_name) {
                return data.display_name;
            }
            throw new Error("No address found");
        } catch (error) {
            console.error("Geocoding error:", error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    // Function to update location input and marker popup
    async function updateLocation(lat, lng) {
        // Store coordinates
        if (latitudeInput) latitudeInput.value = lat;
        if (longitudeInput) longitudeInput.value = lng;
        
        // Show loading state
        locationInput.value = "Getting address...";
        
        try {
            const address = await getAddressFromCoords(lat, lng);
            locationInput.value = address;
            if (marker) {
                marker.bindPopup(`📍 ${address}`).openPopup();
            }
            showStatus("Location selected successfully!", "success");
        } catch (error) {
            console.error("Error getting address:", error);
            locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    // Initialize map function
    function initMap(lat, lng) {
        console.log('Initializing map at:', lat, lng);
        
        // Clear previous map if exists
        if (map) {
            map.remove();
            map = null;
            marker = null;
        }
        
        // Add active class to container
        mapContainer.classList.add('map-active');
        
        // Create map container
        mapContainer.innerHTML = `
            <div id="map" style="height: 350px; width: 100%;"></div>
            <div class="map-controls">
                <button type="button" id="getCurrentLocationBtn" class="location-btn">
                    📍 Get Current Location
                </button>
                <p class="map-hint">Click on the map or drag the marker to set location</p>
            </div>
        `;
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            try {
                // Initialize Leaflet map
                map = L.map('map', {
                    center: [lat, lng],
                    zoom: 16,
                    zoomControl: true
                });
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);
                
                // Create draggable marker
                marker = L.marker([lat, lng], {
                    draggable: true
                }).addTo(map);
        
                // Add drag event listener
                marker.on('dragend', function(e) {
                    const position = e.target.getLatLng();
                    updateLocation(position.lat, position.lng);
                });
                
                // Add click event listener to map
                map.on('click', function(e) {
                    const { lat, lng } = e.latlng;
                    marker.setLatLng([lat, lng]);
                    updateLocation(lat, lng);
                });
                
                // Update initial location
                updateLocation(lat, lng);
                
                // Force map to recalculate size
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
                
                // Get current location button handler
                const getCurrentLocationBtn = document.getElementById('getCurrentLocationBtn');
                if (getCurrentLocationBtn) {
                    getCurrentLocationBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        getCurrentLocation();
                    });
                }
                
                console.log('Map initialized successfully');
            } catch (error) {
                console.error('Error initializing map:', error);
                showStatus("Error loading map. Please try again.", "error");
            }
        }, 100);
    }

    // Get current location function
    function getCurrentLocation() {
        if (!navigator.geolocation) {
            showStatus("Geolocation is not supported by your browser", "error");
            // Still show map at default location
            initMap(23.8103, 90.4125);
            return;
        }
        
        showStatus("Getting your location...", "info");
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (map && marker) {
                    map.setView([lat, lng], 16);
                    marker.setLatLng([lat, lng]);
                    updateLocation(lat, lng);
                } else {
                    initMap(lat, lng);
                }
            },
            (error) => {
                let errorMessage = "Unable to retrieve your location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Showing default map location.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location unavailable. Showing default map location.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Showing default map location.";
                        break;
                }
                showStatus(errorMessage, "info");
                
                // Initialize map with default location (Dhaka, Bangladesh)
                initMap(23.8103, 90.4125);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // Map button click handler
    if (mapBtn) {
        mapBtn.addEventListener("click", () => {
            getCurrentLocation();
        });
    }

    // Form submission handler
    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            // Validate required fields
            const complaintType = document.getElementById('complaintType').value;
            const description = document.getElementById('description').value;
            const incidentDate = document.getElementById('incidentDate').value;
            const location = document.getElementById('location').value;
            
            if (!complaintType || !description || !incidentDate || !location) {
                showStatus("Please fill in all required fields.", "error");
                return;
            }
            
            setLoading(true);
            hideStatus();
            
            try {
                // Create FormData object
                const formData = new FormData();
                formData.append('complaintType', complaintType);
                formData.append('description', description);
                formData.append('incidentDate', incidentDate);
                formData.append('location', location);
                
                // Add coordinates if available
                if (latitudeInput && latitudeInput.value) {
                    formData.append('latitude', latitudeInput.value);
                }
                if (longitudeInput && longitudeInput.value) {
                    formData.append('longitude', longitudeInput.value);
                }
                
                // Add evidence files
                if (selectedFiles.image) formData.append('evidence', selectedFiles.image);
                if (selectedFiles.video) formData.append('evidence', selectedFiles.video);
                if (selectedFiles.audio) formData.append('evidence', selectedFiles.audio);
                
                // Submit complaint
                const response = await fetch('/submit-complaint', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Show success modal with complaint ID
                    const complaintIdDisplay = document.getElementById('complaintIdDisplay');
                    if (complaintIdDisplay && data.complaintId) {
                        complaintIdDisplay.innerHTML = `
                            <div class="complaint-id-box">
                                <span class="id-label">Complaint ID:</span>
                                <span class="id-value">#${data.complaintId}</span>
                            </div>
                        `;
                    }
                    
                    successModal.classList.remove("hidden");
                    
                    // Reset form
                    form.reset();
                    selectedFiles = { image: null, video: null, audio: null };
                    resetUploadDisplays();
                    resetMap();
                    
                    // Notify admin
                    if (data.complaintId) {
                        notifyAdmin(data.complaintId);
                    }
                } else {
                    // Show error modal
                    const errorMessageEl = document.getElementById('errorMessage');
                    if (errorMessageEl) {
                        errorMessageEl.textContent = data.message || 'An error occurred while submitting your complaint.';
                    }
                    if (errorModal) errorModal.classList.remove("hidden");
                }
            } catch (error) {
                console.error('Submission error:', error);
                const errorMessageEl = document.getElementById('errorMessage');
                if (errorMessageEl) {
                    errorMessageEl.textContent = 'Network error. Please check your connection and try again.';
                }
                if (errorModal) errorModal.classList.remove("hidden");
            } finally {
                setLoading(false);
            }
        });
    }

    // Notify admin about new complaint
    async function notifyAdmin(complaintId) {
        try {
            const response = await fetch('/notify-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ complaintId }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success && data.complaint && data.adminEmail) {
                sendEmailToAdmin(data.adminEmail, data.complaint);
            }
        } catch (error) {
            console.error('Error notifying admin:', error);
        }
    }

    // Reset upload displays
    function resetUploadDisplays() {
        const uploadBoxes = document.querySelectorAll('.upload-box');
        uploadBoxes.forEach(box => {
            box.style.backgroundColor = '';
            box.style.borderColor = '';
            const span = box.querySelector('span');
            if (span) {
                const input = box.querySelector('input[type="file"]');
                if (input) {
                    if (input.id === 'imageUpload') {
                        span.innerHTML = 'Upload Images<br><small>JPG, PNG, GIF</small>';
                    } else if (input.id === 'videoUpload') {
                        span.innerHTML = 'Upload Videos<br><small>MP4, MOV, AVI</small>';
                    } else if (input.id === 'audioUpload') {
                        span.innerHTML = 'Upload Audio<br><small>MP3, WAV, OGG</small>';
                    }
                }
            }
        });
    }

    // Reset map to initial state
    function resetMap() {
        if (map) {
            map.remove();
            map = null;
            marker = null;
        }
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-instructions">
                    <i class="map-icon">🗺️</i>
                    <p>Click "Use Map" to open the map and pin your location</p>
                    <small>You can drag the marker or click anywhere on the map to set the location</small>
                </div>
            `;
        }
        if (latitudeInput) latitudeInput.value = '';
        if (longitudeInput) longitudeInput.value = '';
    }

    // Close success modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            successModal.classList.add("hidden");
        });
    }

    // View complaints button
    if (viewComplaintsBtn) {
        viewComplaintsBtn.addEventListener("click", () => {
            window.location.href = '/profile';
        });
    }

    // Close error modal
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener("click", () => {
            errorModal.classList.add("hidden");
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (successModal && e.target === successModal) {
            successModal.classList.add("hidden");
        }
        if (errorModal && e.target === errorModal) {
            errorModal.classList.add("hidden");
        }
    });
});

// Send email notification to admin using EmailJS
function sendEmailToAdmin(adminEmail, complaintData) {
    console.log('Sending email notification to:', adminEmail);
    console.log('Complaint data:', complaintData);

    const emailParams = {
        to_email: adminEmail,
        complaint_id: complaintData.id,
        complaint_type: complaintData.type,
        user_name: complaintData.username,
        user_fullname: complaintData.user_fullname,
        description: complaintData.description ? complaintData.description.substring(0, 200) + '...' : 'No description provided',
        location: complaintData.location || 'Location not specified',
        submitted_date: complaintData.submittedDate
    };

    // Use EmailJS if available
    if (typeof emailjs !== 'undefined') {
        emailjs.send('service_pl2gk4v', 'template_8k86xhk', emailParams, '1RHpGS2tq0gxGer21')
            .then(function(response) {
                console.log('Admin notification sent successfully!', response.status, response.text);
            })
            .catch(function(error) {
                console.error('Failed to send admin notification:', error);
            });
    } else {
        console.warn('EmailJS not loaded, skipping email notification');
    }
}
