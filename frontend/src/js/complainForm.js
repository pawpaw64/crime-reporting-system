document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const successModal = document.getElementById("successModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    
    // Enhanced Location Picker Elements
    const mapBtn = document.getElementById("mapBtn");
    const mapContainer = document.getElementById("mapContainer");
    const locationInput = document.getElementById("location");
    const useCurrentLocationBtn = document.getElementById("useCurrentLocation");
    const confirmLocationBtn = document.getElementById("confirmLocation");
    const cancelLocationBtn = document.getElementById("cancelLocation");
    const locationInfo = document.getElementById("locationInfo");
    const selectedAddress = document.getElementById("selectedAddress");
    const selectedCoords = document.getElementById("selectedCoords");
    const accuracyInfo = document.getElementById("accuracyInfo");
    const radiusNotice = document.getElementById("radiusNotice");
    
    // Location state
    let map;
    let marker;
    let radiusCircle; // Circle to show approximate location radius
    let locationData = {
        latitude: null,
        longitude: null,
        address: '',
        isAccurate: true,
        accuracyRadius: null
    };
    
    let selectedFiles = {
        image: null,
        video: null,
        audio: null
    };

    // Initialize accuracy option listeners
    document.querySelectorAll('input[name="locationAccuracy"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            locationData.isAccurate = e.target.value === 'accurate';
            updateAccuracyDisplay();
        });
    });



    function updateAccuracyDisplay() {
        if (locationData.isAccurate) {
            locationData.accuracyRadius = null;
            // Hide radius circle for accurate mode
            if (radiusCircle && map) {
                map.removeLayer(radiusCircle);
                radiusCircle = null;
            }
        } else {
            locationData.accuracyRadius = 100; // Fixed 100m radius
            // Show radius circle for approximate mode
            updateRadiusCircle();
        }
        updateLocationDisplay();
    }

    function updateRadiusCircle() {
        if (!locationData.isAccurate && locationData.latitude && locationData.longitude && map) {
            // Remove existing circle
            if (radiusCircle) {
                map.removeLayer(radiusCircle);
            }
            
            // Create new radius circle with fixed 100m radius
            radiusCircle = L.circle([locationData.latitude, locationData.longitude], {
                color: '#ff7800',
                fillColor: '#ff7800',
                fillOpacity: 0.1,
                weight: 2,
                radius: 100
            }).addTo(map);
            
            // Add popup to circle
            radiusCircle.bindPopup(`🌐 Privacy Area<br>Radius: 100m`);
            
            // Show radius notice
            if (radiusNotice) {
                radiusNotice.classList.add('show');
            }
        } else {
            // Hide radius notice for accurate mode
            if (radiusNotice) {
                radiusNotice.classList.remove('show');
            }
        }
    }

    function updateLocationDisplay() {
        if (locationData.latitude && locationData.longitude) {
            selectedCoords.textContent = `Coordinates: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
            
            if (locationData.isAccurate) {
                accuracyInfo.classList.add('hidden');
            } else {
                accuracyInfo.classList.remove('hidden');
                accuracyInfo.textContent = `Privacy radius: 100m`;
            }
            locationInfo.classList.remove('hidden');
        }
    }

    // Handle Cancel button click
    cancelBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to cancel? Any unsaved data will be lost.")) {
            window.location.href = '/profile';
        }
    });

    // Handle file uploads
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        selectedFiles.image = e.target.files[0];
        updateUploadDisplay('image', e.target.files[0]);
    });

    document.getElementById('videoUpload').addEventListener('change', function(e) {
        selectedFiles.video = e.target.files[0];
        updateUploadDisplay('video', e.target.files[0]);
    });

    document.getElementById('audioUpload').addEventListener('change', function(e) {
        selectedFiles.audio = e.target.files[0];
        updateUploadDisplay('audio', e.target.files[0]);
    });

    function updateUploadDisplay(type, file) {
        const uploadBox = document.querySelector(`#${type}Upload`).closest('.upload-box');
        if (file) {
            uploadBox.style.backgroundColor = '#e8f5e8';
            uploadBox.style.borderColor = '#28a745';
            const span = uploadBox.querySelector('span');
            span.innerHTML = `✓ ${file.name}<br><small>File selected</small>`;
        }
    }

    // Function to get address from coordinates
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

    // Function to update location data
    function updateLocationData(lat, lng) {
        locationData.latitude = lat;
        locationData.longitude = lng;
        
        getAddressFromCoords(lat, lng)
            .then(formatted => {
                locationData.address = formatted;
                selectedAddress.textContent = formatted;
                if (marker) {
                    marker.bindPopup(`📍 ${formatted}`).openPopup();
                }
                updateLocationDisplay();
                updateRadiusCircle(); // Update radius circle when location changes
            })
            .catch(error => {
                console.error("Error getting address:", error);
                locationData.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                selectedAddress.textContent = locationData.address;
                updateLocationDisplay();
                updateRadiusCircle(); // Update radius circle even with coordinate fallback
            });
    }

    // Enhanced map functionality
    mapBtn.addEventListener("click", () => {
        mapContainer.classList.remove('hidden');
        initializeMap();
    });

    useCurrentLocationBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (map) {
                    map.setView([lat, lng], 16);
                    if (marker) {
                        marker.setLatLng([lat, lng]);
                    }
                    updateLocationData(lat, lng);
                }
            },
            () => {
                alert("Unable to retrieve your location.");
            }
        );
    });

    confirmLocationBtn.addEventListener("click", () => {
        if (locationData.latitude && locationData.longitude) {
            locationInput.value = locationData.address;
            mapContainer.classList.add('hidden');
        } else {
            alert("Please select a location on the map first.");
        }
    });

    cancelLocationBtn.addEventListener("click", () => {
        mapContainer.classList.add('hidden');
        // Clean up radius circle when canceling
        if (radiusCircle && map) {
            map.removeLayer(radiusCircle);
            radiusCircle = null;
        }
        // Reset location data if needed
    });

    function initializeMap() {
        const mapElement = document.getElementById('leafletMap');
        
        if (!map) {
            // Default to Dhaka, Bangladesh if no location available
            map = L.map('leafletMap').setView([23.8103, 90.4125], 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Create marker
            marker = L.marker([23.8103, 90.4125], { 
                draggable: true 
            }).addTo(map);
            
            // Add drag event listener
            marker.on('dragend', function(e) {
                const position = e.target.getLatLng();
                updateLocationData(position.lat, position.lng);
            });
            
            // Add click event listener to map for placing marker
            map.on('click', function(e) {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                updateLocationData(lat, lng);
            });
        } else {
            // Map already exists, just invalidate size
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }

    // Enhanced form submission with better error handling
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
        submitBtn.disabled = true;

        // Create FormData object
        const formData = new FormData();

        // Add form fields with validation
        const complaintType = document.getElementById('complaintType').value;
        const description = document.getElementById('description').value;
        const incidentDate = document.getElementById('incidentDate').value;
        const location = document.getElementById('location').value;

        // Basic validation
        if (!complaintType || !description || !incidentDate || !location) {
            showError('Please fill in all required fields');
            resetSubmitButton();
            return;
        }

        formData.append('complaintType', complaintType);
        formData.append('description', description);
        formData.append('incidentDate', incidentDate);
        formData.append('location', location);

        // Add location data if available
        if (locationData.latitude && locationData.longitude) {
            formData.append('latitude', locationData.latitude);
            formData.append('longitude', locationData.longitude);
            
            if (!locationData.isAccurate && locationData.accuracyRadius) {
                formData.append('accuracyRadius', locationData.accuracyRadius);
            }
        }

        // Add files
        if (selectedFiles.image) formData.append('evidence', selectedFiles.image);
        if (selectedFiles.video) formData.append('evidence', selectedFiles.video);
        if (selectedFiles.audio) formData.append('evidence', selectedFiles.audio);

        console.log('Submitting complaint with data:', {
            complaintType,
            description: description.substring(0, 50) + '...',
            incidentDate,
            location,
            hasCoordinates: !!(locationData.latitude && locationData.longitude),
            fileCount: Object.values(selectedFiles).filter(f => f).length
        });

        // Submit form
        fetch('/submit-complaint', {
            method: 'POST',
            body: formData,
            credentials: 'include' // Important for session cookies
        })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Please log in to submit a complaint');
                    }
                    throw new Error(`Server error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.success) {
                    // Show complaint ID in the success modal
                    const complaintIdDisplay = document.getElementById('complaintIdDisplay');
                    if (complaintIdDisplay && data.complaintId) {
                        complaintIdDisplay.innerHTML = `
                            <strong>Complaint ID: #${data.complaintId}</strong>
                            <p>Please save this ID for future reference.</p>
                        `;
                    }

                    // Notify admin about new complaint
                    if (data.complaint && data.complaint.id) {
                        fetch('/notify-admin', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                complaintId: data.complaint.id
                            }),
                            credentials: 'include'
                        })
                            .then(notifyResponse => notifyResponse.json())
                            .then(notifyData => {
                                console.log('Notification response:', notifyData);
                                if (notifyData.success && notifyData.complaint && notifyData.adminEmail) {
                                    sendEmailToAdmin(notifyData.adminEmail, notifyData.complaint);
                                }
                            })
                            .catch(error => {
                                console.error('Error notifying admin:', error);
                                // Don't show error to user as complaint was successful
                            });
                    }

                    successModal.classList.remove("hidden");
                    form.reset();
                    selectedFiles = { image: null, video: null, audio: null };
                    locationData = {
                        latitude: null,
                        longitude: null,
                        address: '',
                        isAccurate: true,
                        accuracyRadius: null
                    };
                    resetUploadDisplays();
                } else {
                    showError(data.message || 'Error submitting complaint');
                }
                resetSubmitButton();
            })
            .catch(error => {
                console.error('Submission error:', error);
                showError(error.message || 'Unable to submit complaint. Please check your connection and try again.');
                resetSubmitButton();
            });
    });

    function resetSubmitButton() {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        submitBtn.disabled = false;
    }

    function showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.classList.remove('hidden');
        } else {
            alert(message);
        }
    }

    function resetUploadDisplays() {
        const uploadBoxes = document.querySelectorAll('.upload-box');
        uploadBoxes.forEach(box => {
            box.style.backgroundColor = '';
            box.style.borderColor = '';
            const spans = box.querySelectorAll('span');
            spans.forEach(span => {
                if (span.innerHTML.includes('Images')) {
                    span.innerHTML = 'Upload Images<br><small>JPG, PNG, GIF</small>';
                } else if (span.innerHTML.includes('Videos')) {
                    span.innerHTML = 'Upload Videos<br><small>MP4, MOV, AVI</small>';
                } else if (span.innerHTML.includes('Audio')) {
                    span.innerHTML = 'Upload Audio<br><small>MP3, WAV, OGG</small>';
                }
            });
        });
    }

    closeModalBtn.addEventListener("click", () => {
        successModal.classList.add("hidden");
        window.location.href = '/profile';
    });
});

function sendEmailToAdmin(adminEmail, complaintData) {
    console.log('Sending email to:', adminEmail);
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

    // Use your existing EmailJS configuration
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

    // Modal event listeners
    const errorModal = document.getElementById('errorModal');
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', () => {
            errorModal.classList.add('hidden');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
        });
    }

    const viewComplaintsBtn = document.getElementById('viewComplaintsBtn');
    if (viewComplaintsBtn) {
        viewComplaintsBtn.addEventListener('click', () => {
            window.location.href = '/profile';
        });
    }

    // Cancel button event listener
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel? Any unsaved data will be lost.')) {
                window.location.href = '/profile';
            }
        });
    }

;