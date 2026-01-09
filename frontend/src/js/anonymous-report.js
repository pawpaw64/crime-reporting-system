/**
 * Anonymous Report Form Handler
 * Handles form submission, validation, CAPTCHA, and file uploads
 */

document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // ELEMENTS
    // ======================
    const disclaimerModal = document.getElementById('disclaimerModal');
    const reportContainer = document.getElementById('reportContainer');
    const successContainer = document.getElementById('successContainer');
    const statusModal = document.getElementById('statusModal');
    
    const acceptDisclaimer = document.getElementById('acceptDisclaimer');
    const cancelDisclaimer = document.getElementById('cancelDisclaimer');
    
    const form = document.getElementById('anonymousReportForm');
    const submitBtn = document.getElementById('submitBtn');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('evidenceFiles');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    
    const captchaQuestion = document.getElementById('captchaQuestion');
    const captchaExpected = document.getElementById('captchaExpected');
    const captchaAnswer = document.getElementById('captchaAnswer');
    const refreshCaptcha = document.getElementById('refreshCaptcha');
    
    const reportIdDisplay = document.getElementById('reportIdDisplay');
    const copyReportId = document.getElementById('copyReportId');
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const searchStatus = document.getElementById('searchStatus');
    const statusReportId = document.getElementById('statusReportId');
    const statusResult = document.getElementById('statusResult');
    
    // Character counters
    const descCharCount = document.getElementById('descCharCount');
    const suspectCharCount = document.getElementById('suspectCharCount');
    const notesCharCount = document.getElementById('notesCharCount');
    
    const description = document.getElementById('description');
    const suspectDescription = document.getElementById('suspectDescription');
    const additionalNotes = document.getElementById('additionalNotes');
    const incidentDate = document.getElementById('incidentDate');
    
    // Map modal elements
    const openMapBtn = document.getElementById('openMapBtn');
    const mapModal = document.getElementById('mapModal');
    const closeMapModal = document.getElementById('closeMapModal');
    const mapContainer = document.getElementById('mapContainer');
    const mapElement = document.getElementById('anonymousMap');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const locationInput = document.getElementById('location');
    const locationAccuracyInput = document.getElementById('locationAccuracy');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');
    const confirmLocationBtn = document.getElementById('confirmLocationBtn');
    const cancelLocationBtn = document.getElementById('cancelLocationBtn');
    const accurateOption = document.getElementById('accurateOption');
    const approximateOption = document.getElementById('approximateOption');
    
    // Map state
    let map = null;
    let marker = null;
    let mapInitialized = false;
    let tempLocation = { lat: null, lng: null, address: '' };
    let currentAccuracy = 'accurate';
    
    // Default location (Dhaka, Bangladesh)
    const DEFAULT_LOCATION = { lat: 23.8103, lng: 90.4125 };
    
    // ======================
    // STATE
    // ======================
    let selectedFiles = [];
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    
    // ======================
    // API CONFIGURATION
    // ======================
    const getApiUrl = () => {
        // For anonymous reports, the endpoint is mounted at root level (not under /api)
        // Return empty string for relative URL to work correctly
        if (typeof Config !== 'undefined' && Config.isBackendServer && Config.isBackendServer()) {
            return ''; // Use relative path when served from backend
        }
        const hostname = window.location.hostname;
        const port = window.location.port;
        // Common development ports
        if (['3000', '3001', '5000'].includes(port)) {
            return ''; // Relative path for backend server
        }
        // When served from Live Server (5500) or other ports, point to backend
        return `http://${hostname}:3000`;
    };
    
    // ======================
    // INITIALIZATION
    // ======================
    
    // Set max date to today
    const today = new Date().toISOString().split('T')[0];
    incidentDate.max = today;
    
    // Set min date to 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    incidentDate.min = oneYearAgo.toISOString().split('T')[0];
    
    // Generate initial CAPTCHA
    generateCaptcha();
    
    // ======================
    // CAPTCHA
    // ======================
    function generateCaptcha() {
        const operations = ['+', '-', '×'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let num1, num2, answer;
        
        switch (operation) {
            case '+':
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * 20) + 1;
                answer = num1 + num2;
                break;
            case '-':
                num1 = Math.floor(Math.random() * 20) + 10;
                num2 = Math.floor(Math.random() * 10) + 1;
                answer = num1 - num2;
                break;
            case '×':
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 10) + 1;
                answer = num1 * num2;
                break;
        }
        
        captchaQuestion.textContent = `${num1} ${operation} ${num2} = ?`;
        captchaExpected.value = answer.toString();
        captchaAnswer.value = '';
    }
    
    refreshCaptcha.addEventListener('click', generateCaptcha);
    
    // ======================
    // DISCLAIMER MODAL
    // ======================
    acceptDisclaimer.addEventListener('click', () => {
        disclaimerModal.classList.add('hidden');
        reportContainer.classList.remove('hidden');
    });
    
    cancelDisclaimer.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // ======================
    // CHARACTER COUNTERS
    // ======================
    description.addEventListener('input', () => {
        descCharCount.textContent = description.value.length;
    });
    
    suspectDescription.addEventListener('input', () => {
        suspectCharCount.textContent = suspectDescription.value.length;
    });
    
    additionalNotes.addEventListener('input', () => {
        notesCharCount.textContent = additionalNotes.value.length;
    });
    
    // ======================
    // MAP & LOCATION MODAL
    // ======================
    
    // Get address from coordinates using OpenStreetMap Nominatim (CSP-friendly)
    async function getAddressFromCoords(lat, lng) {
        // Return coordinate string as fallback - avoid external API calls that may be blocked by CSP
        const coordString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        try {
            // Try using OpenStreetMap Nominatim (free, no API key needed)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'CrimeReportingSystem/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                console.warn('Nominatim API returned non-OK status, using coordinates');
                return coordString;
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
                // For approximate location, use a less specific address
                if (currentAccuracy === 'approximate' && data.address) {
                    // Build a less precise address (area/district level)
                    const parts = [];
                    if (data.address.suburb) parts.push(data.address.suburb);
                    else if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                    if (data.address.city) parts.push(data.address.city);
                    else if (data.address.town) parts.push(data.address.town);
                    else if (data.address.village) parts.push(data.address.village);
                    if (data.address.state) parts.push(data.address.state);
                    if (data.address.country) parts.push(data.address.country);
                    
                    if (parts.length > 0) {
                        return parts.join(', ');
                    }
                }
                return data.display_name;
            }
            return coordString;
        } catch (error) {
            // Handle CSP or network errors silently and use coordinates
            console.warn('Geocoding unavailable (possibly blocked by CSP), using coordinates:', error.message);
            return coordString;
        }
    }
    
    // Update temporary location (before confirmation)
    async function updateTempLocation(lat, lng) {
        tempLocation.lat = lat;
        tempLocation.lng = lng;
        
        // Show loading state in popup
        if (marker) {
            marker.bindPopup(`📍 Getting address...`).openPopup();
        }
        
        // Get address
        const address = await getAddressFromCoords(lat, lng);
        tempLocation.address = address;
        
        // Update marker popup with actual address
        if (marker) {
            marker.bindPopup(`📍 ${address}`).openPopup();
        }
        
        // Enable confirm button
        confirmLocationBtn.disabled = false;
    }
    
    // Initialize or update map
    function initializeMap(lat, lng) {
        if (!mapInitialized) {
            try {
                // Initialize Leaflet map
                map = L.map('anonymousMap').setView([lat, lng], 16);
                
                // Use OpenStreetMap tiles (allowed by CSP)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);
                
                // Handle tile loading errors
                map.on('tileerror', function(error) {
                    console.warn('Map tile loading error:', error.error);
                });
                
                // Create draggable marker
                marker = L.marker([lat, lng], { draggable: true }).addTo(map);
                
                // Handle marker drag
                marker.on('dragend', function(e) {
                    const position = e.target.getLatLng();
                    updateTempLocation(position.lat, position.lng);
                });
                
                // Handle map click to move marker
                map.on('click', function(e) {
                    const { lat, lng } = e.latlng;
                    marker.setLatLng([lat, lng]);
                    updateTempLocation(lat, lng);
                });
            } catch (error) {
                console.error('Map initialization error:', error);
                // Show fallback message
                const mapElement = document.getElementById('anonymousMap');
                if (mapElement) {
                    mapElement.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8fafc; color: #748D92; text-align: center; padding: 20px;">
                            <div>
                                <i class="fas fa-map-marked-alt" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                                <p>Map unavailable. Please enter your location manually.</p>
                            </div>
                        </div>
                    `;
                }
                return;
            }
            
            mapInitialized = true;
        } else {
            // Update existing map
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]);
        }
        
        // Set initial location
        updateTempLocation(lat, lng);
        
        // Fix map display issues
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
    
    // Open map modal
    if (openMapBtn) {
        openMapBtn.addEventListener('click', () => {
            mapModal.classList.remove('hidden');
            
            // Initialize map with existing location or default
            setTimeout(() => {
                if (latitudeInput.value && longitudeInput.value) {
                    initializeMap(parseFloat(latitudeInput.value), parseFloat(longitudeInput.value));
                } else {
                    initializeMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
                }
            }, 100);
        });
    }
    
    // Close map modal
    if (closeMapModal) {
        closeMapModal.addEventListener('click', () => {
            mapModal.classList.add('hidden');
        });
    }
    
    // Cancel button
    if (cancelLocationBtn) {
        cancelLocationBtn.addEventListener('click', () => {
            mapModal.classList.add('hidden');
        });
    }
    
    // Click outside to close
    if (mapModal) {
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.classList.add('hidden');
            }
        });
    }
    
    // Accuracy option selection
    if (accurateOption && approximateOption) {
        const accuracyInputs = document.querySelectorAll('input[name="accuracy"]');
        accuracyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                currentAccuracy = e.target.value;
                locationAccuracyInput.value = currentAccuracy;
                
                // Update visual selection
                accurateOption.classList.toggle('selected', currentAccuracy === 'accurate');
                approximateOption.classList.toggle('selected', currentAccuracy === 'approximate');
                
                // If we have a location, update the address based on new accuracy
                if (tempLocation.lat && tempLocation.lng) {
                    updateTempLocation(tempLocation.lat, tempLocation.lng);
                }
            });
        });
    }
    
    // Use current location button
    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }
            
            // Show loading state
            useCurrentLocationBtn.disabled = true;
            useCurrentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
            
            navigator.geolocation.getCurrentPosition(
                // Success
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Update map
                    if (mapInitialized) {
                        map.setView([lat, lng], 16);
                        marker.setLatLng([lat, lng]);
                    }
                    updateTempLocation(lat, lng);
                    
                    // Reset button
                    useCurrentLocationBtn.disabled = false;
                    useCurrentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Current Location';
                },
                // Error
                (error) => {
                    console.error('Geolocation error:', error);
                    let message = 'Unable to retrieve your location.';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out.';
                            break;
                    }
                    
                    alert(message);
                    
                    // Reset button
                    useCurrentLocationBtn.disabled = false;
                    useCurrentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Current Location';
                },
                // Options
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    // Confirm location button
    if (confirmLocationBtn) {
        confirmLocationBtn.addEventListener('click', () => {
            if (tempLocation.lat && tempLocation.lng) {
                // Apply approximate offset if needed
                let finalLat = tempLocation.lat;
                let finalLng = tempLocation.lng;
                
                if (currentAccuracy === 'approximate') {
                    // Add small random offset (within ~500m) for privacy
                    const offset = 0.005; // approximately 500m
                    finalLat += (Math.random() - 0.5) * offset;
                    finalLng += (Math.random() - 0.5) * offset;
                }
                
                // Update form fields
                latitudeInput.value = finalLat;
                longitudeInput.value = finalLng;
                locationInput.value = tempLocation.address;
                locationAccuracyInput.value = currentAccuracy;
                
                // Clear any error
                clearError('locationError');
                
                // Close modal
                mapModal.classList.add('hidden');
            }
        });
    }
    
    // ======================
    // FILE UPLOAD
    // ======================
    
    // Drag and drop handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });
    
    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (selectedFiles.length >= MAX_FILES) {
                showError('evidenceError', `Maximum ${MAX_FILES} files allowed`);
                return;
            }
            
            if (file.size > MAX_FILE_SIZE) {
                showError('evidenceError', `File "${file.name}" exceeds 50MB limit`);
                return;
            }
            
            // Check for duplicates
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                return;
            }
            
            selectedFiles.push(file);
        });
        
        updateFileList();
        clearError('evidenceError');
    }
    
    function updateFileList() {
        fileList.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const icon = getFileIcon(file.type);
            const size = formatFileSize(file.size);
            
            item.innerHTML = `
                <div class="file-icon"><i class="${icon}"></i></div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-size">${size}</div>
                </div>
                <button type="button" class="file-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.appendChild(item);
        });
        
        // Update count
        fileCount.textContent = `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`;
        
        // Add remove handlers
        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }
    
    function getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fas fa-image';
        if (mimeType.startsWith('video/')) return 'fas fa-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-music';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        return 'fas fa-file';
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // ======================
    // FORM VALIDATION
    // ======================
    function validateForm() {
        let isValid = true;
        
        // Crime type
        const crimeType = document.getElementById('crimeType');
        if (!crimeType.value) {
            showError('crimeTypeError', 'Please select a crime type');
            isValid = false;
        } else {
            clearError('crimeTypeError');
        }
        
        // Description
        if (!description.value || description.value.length < 50) {
            showError('descriptionError', 'Description must be at least 50 characters');
            isValid = false;
        } else {
            clearError('descriptionError');
        }
        
        // Date
        const dateValue = incidentDate.value;
        if (!dateValue) {
            showError('incidentDateError', 'Please select the incident date');
            isValid = false;
        } else {
            const date = new Date(dateValue);
            const now = new Date();
            now.setHours(23, 59, 59, 999);
            
            if (date > now) {
                showError('incidentDateError', 'Date cannot be in the future');
                isValid = false;
            } else {
                clearError('incidentDateError');
            }
        }
        
        // Time
        const incidentTime = document.getElementById('incidentTime');
        if (!incidentTime.value) {
            showError('incidentTimeError', 'Please enter the incident time');
            isValid = false;
        } else {
            clearError('incidentTimeError');
        }
        
        // Location
        const location = document.getElementById('location');
        if (!location.value || location.value.length < 10) {
            showError('locationError', 'Please provide a detailed location (min 10 characters)');
            isValid = false;
        } else {
            clearError('locationError');
        }
        
        // Evidence
        if (selectedFiles.length === 0) {
            showError('evidenceError', 'At least one evidence file is required');
            isValid = false;
        } else {
            clearError('evidenceError');
        }
        
        // CAPTCHA
        if (!captchaAnswer.value || captchaAnswer.value.trim() !== captchaExpected.value) {
            showError('captchaError', 'Incorrect answer. Please try again.');
            generateCaptcha();
            isValid = false;
        } else {
            clearError('captchaError');
        }
        
        return isValid;
    }
    
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
        }
    }
    
    function clearError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = '';
        }
    }
    
    // ======================
    // FORM SUBMISSION
    // ======================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        
        try {
            const formData = new FormData();
            
            // Add form fields
            formData.append('crimeType', document.getElementById('crimeType').value);
            formData.append('description', description.value);
            formData.append('incidentDate', incidentDate.value);
            formData.append('incidentTime', document.getElementById('incidentTime').value);
            formData.append('location', document.getElementById('location').value);
            formData.append('suspectDescription', suspectDescription.value);
            formData.append('additionalNotes', additionalNotes.value);
            formData.append('captchaAnswer', captchaAnswer.value);
            formData.append('captchaExpected', captchaExpected.value);
            
            // Add coordinates if available (using frontendLat/frontendLng as expected by backend)
            if (latitudeInput.value && longitudeInput.value) {
                formData.append('frontendLat', latitudeInput.value);
                formData.append('frontendLng', longitudeInput.value);
                formData.append('latitude', latitudeInput.value);
                formData.append('longitude', longitudeInput.value);
            }
            
            // Add location accuracy if set
            if (locationAccuracyInput && locationAccuracyInput.value) {
                formData.append('locationAccuracy', locationAccuracyInput.value);
            }
            
            // Add files
            selectedFiles.forEach(file => {
                formData.append('evidence', file);
            });
            
            const apiUrl = getApiUrl();
            console.log('Submitting to:', `${apiUrl}/anonymous-report`);
            
            const response = await fetch(`${apiUrl}/anonymous-report`, {
                method: 'POST',
                body: formData
            });
            
            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = 'Failed to submit report.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Show success page
                reportContainer.classList.add('hidden');
                successContainer.classList.remove('hidden');
                reportIdDisplay.textContent = data.reportId;
                
                // Scroll to top
                window.scrollTo(0, 0);
            } else {
                // Show error
                showNotification(data.message || 'Failed to submit report. Please try again.', 'error');
                generateCaptcha();
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            showNotification(error.message || 'An error occurred. Please check your connection and try again.', 'error');
            generateCaptcha();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Anonymous Report';
        }
    });
    
    // ======================
    // NOTIFICATION HELPER
    // ======================
    function showNotification(message, type = 'info') {
        // Remove any existing notification
        const existingNotification = document.querySelector('.form-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `form-notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Insert at top of form
        const form = document.getElementById('anonymousReportForm');
        if (form) {
            form.insertBefore(notification, form.firstChild);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 8000);
            
            // Scroll to notification
            notification.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // ======================
    // SUCCESS PAGE ACTIONS
    // ======================
    copyReportId.addEventListener('click', async () => {
        const reportId = reportIdDisplay.textContent;
        
        try {
            await navigator.clipboard.writeText(reportId);
            copyReportId.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyReportId.innerHTML = '<i class="fas fa-copy"></i> Copy ID';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = reportId;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyReportId.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyReportId.innerHTML = '<i class="fas fa-copy"></i> Copy ID';
            }, 2000);
        }
    });
    
    // ======================
    // STATUS CHECK
    // ======================
    checkStatusBtn.addEventListener('click', () => {
        statusModal.classList.remove('hidden');
        statusReportId.value = reportIdDisplay.textContent;
    });
    
    closeStatusModal.addEventListener('click', () => {
        statusModal.classList.add('hidden');
        statusResult.classList.add('hidden');
    });
    
    // Close modal on background click
    statusModal.addEventListener('click', (e) => {
        if (e.target === statusModal) {
            statusModal.classList.add('hidden');
            statusResult.classList.add('hidden');
        }
    });
    
    searchStatus.addEventListener('click', async () => {
        const reportId = statusReportId.value.trim().toUpperCase();
        
        if (!reportId || !reportId.match(/^SV-[A-Z0-9]+$/)) {
            statusResult.innerHTML = `
                <div class="status-error">
                    <i class="fas fa-exclamation-circle"></i>
                    Please enter a valid Report ID (e.g., SV-XXXXXXXX)
                </div>
            `;
            statusResult.classList.remove('hidden');
            statusResult.classList.remove('success');
            statusResult.classList.add('error');
            return;
        }
        
        searchStatus.disabled = true;
        searchStatus.innerHTML = '<span class="spinner"></span> Searching...';
        
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/anonymous-report/${reportId}/status`);
            const data = await response.json();
            
            if (data.success) {
                const report = data.report;
                const submittedDate = new Date(report.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                statusResult.innerHTML = `
                    <div class="status-info">
                        <div class="status-row">
                            <span class="label">Report ID:</span>
                            <span class="value">${escapeHtml(report.reportId)}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Crime Type:</span>
                            <span class="value">${formatCrimeType(report.crimeType)}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Submitted:</span>
                            <span class="value">${submittedDate}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Status:</span>
                            <span class="status-badge ${report.status}">${formatStatus(report.status)}</span>
                        </div>
                        <div class="status-message">
                            <i class="fas fa-info-circle"></i>
                            ${escapeHtml(report.statusMessage)}
                        </div>
                    </div>
                `;
                statusResult.classList.remove('error');
                statusResult.classList.add('success');
            } else {
                statusResult.innerHTML = `
                    <div class="status-error">
                        <i class="fas fa-exclamation-circle"></i>
                        ${escapeHtml(data.message || 'Report not found')}
                    </div>
                `;
                statusResult.classList.remove('success');
                statusResult.classList.add('error');
            }
            
            statusResult.classList.remove('hidden');
            
        } catch (error) {
            console.error('Status check error:', error);
            statusResult.innerHTML = `
                <div class="status-error">
                    <i class="fas fa-exclamation-circle"></i>
                    Unable to check status. Please try again later.
                </div>
            `;
            statusResult.classList.remove('hidden');
            statusResult.classList.remove('success');
            statusResult.classList.add('error');
        } finally {
            searchStatus.disabled = false;
            searchStatus.innerHTML = '<i class="fas fa-search"></i> Check Status';
        }
    });
    
    // ======================
    // UTILITY FUNCTIONS
    // ======================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatCrimeType(type) {
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function formatStatus(status) {
        const statusMap = {
            'pending': 'Pending Review',
            'reviewing': 'Under Review',
            'reviewed': 'Reviewed',
            'investigating': 'Under Investigation',
            'resolved': 'Resolved',
            'dismissed': 'Dismissed'
        };
        return statusMap[status] || status;
    }
});
