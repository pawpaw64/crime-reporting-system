document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const successModal = document.getElementById("successModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const mapBtn = document.querySelector(".map-btn");
    const locationInput = document.getElementById("location");
    const mapContainer = document.querySelector(".map-placeholder");
    let map;
    let marker;
    let selectedFiles = {
        image: null,
        video: null,
        audio: null
    };

    // Handle Cancel button click
    cancelBtn.addEventListener("click", () => {
        // Optional: Show confirmation dialog
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

    // Function to update location input and marker popup
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
                locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            });
    }

    mapBtn.addEventListener("click", () => {
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
                    draggable: true  // Make marker draggable
                }).addTo(map);
                
                // Add drag event listener
                marker.on('dragend', function(e) {
                    const position = e.target.getLatLng();
                    updateLocation(position.lat, position.lng);
                });
                
                // Add click event listener to map for placing marker
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

    // Update the submit form section in complainForm.js


    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Create FormData object
        const formData = new FormData();

        // Add form fields
        formData.append('complaintType', document.getElementById('complaintType').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('incidentDate', document.getElementById('incidentDate').value);
        formData.append('location', document.getElementById('location').value);

        // Add files
        if (selectedFiles.image) formData.append('evidence', selectedFiles.image);
        if (selectedFiles.video) formData.append('evidence', selectedFiles.video);
        if (selectedFiles.audio) formData.append('evidence', selectedFiles.audio);

        // Submit form
        fetch('/submit-complaint', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Notify admin about new complaint
                    if (data.complaint && data.complaint.id) {
                        fetch('/notify-admin', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                complaintId: data.complaint.id
                            })
                        })
                            .then(notifyResponse => notifyResponse.json())
                            .then(notifyData => {
                                console.log('Notification response:', notifyData);
                                if (notifyData.success && notifyData.complaint && notifyData.adminEmail) {
                                    sendEmailToAdmin(notifyData.adminEmail, notifyData.complaint);
                                } else {
                                    console.error('Failed to get admin email or complaint data');
                                }
                            })
                            .catch(error => {
                                console.error('Error notifying admin:', error);
                            });
                    }

                    successModal.classList.remove("hidden");
                    form.reset();
                    selectedFiles = { image: null, video: null, audio: null };
                    resetUploadDisplays();
                } else {
                    alert(data.message || 'Error submitting complaint');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error submitting complaint');
            });
    });



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
        // Redirect to profile page
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
