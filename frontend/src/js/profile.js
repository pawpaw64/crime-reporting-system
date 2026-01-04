// SecureVoice User Dashboard JavaScript
// Handles all dashboard functionality including profile, complaints, and notifications

const API_BASE = '/api';

// Global state
let currentUser = null;
let complaints = [];
let notifications = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initTabNavigation();
    initModals();
    initReportForm();
    initFilters();
    initEventDelegation();
});

// ===== EVENT DELEGATION =====
function initEventDelegation() {
    // Handle all click events via delegation for CSP compliance
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const id = target.dataset.id ? parseInt(target.dataset.id) : null;
        const tab = target.dataset.tab;
        const href = target.dataset.href;
        
        switch (action) {
            case 'viewComplaint':
                if (id) viewComplaint(id);
                break;
            case 'deleteComplaint':
                if (id) deleteComplaint(id);
                break;
            case 'deleteComplaintAndClose':
                if (id) {
                    deleteComplaint(id);
                    document.getElementById('complaint-detail-modal').style.display = 'none';
                }
                break;
            case 'openChat':
                if (id) openChatModal(id);
                break;
            case 'switchTab':
                if (tab) switchTab(tab);
                break;
            case 'navigate':
                if (href) window.location.href = href;
                break;
        }
    });
}

// ===== AUTHENTICATION =====
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        if (data.success && data.user) {
            currentUser = data.user;
            populateUserData();
            loadDashboardData();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
    }
}

// ===== POPULATE USER DATA =====
function populateUserData() {
    if (!currentUser) return;

    // Sidebar profile
    document.getElementById('user-fullname').textContent = currentUser.fullName || currentUser.username;
    document.getElementById('user-email').textContent = currentUser.email || '';
    document.getElementById('welcome-name').textContent = currentUser.fullName?.split(' ')[0] || currentUser.username;

    // Avatar (use face_image if available)
    if (currentUser.face_image) {
        document.getElementById('user-avatar').src = currentUser.face_image;
        document.getElementById('profile-avatar').src = currentUser.face_image;
    }

    // Verification badges
    if (currentUser.is_nid_verified) {
        document.getElementById('nid-badge').style.display = 'inline-flex';
        document.getElementById('profile-nid-badge').style.display = 'inline-flex';
    }
    if (currentUser.is_face_verified) {
        document.getElementById('face-badge').style.display = 'inline-flex';
        document.getElementById('profile-face-badge').style.display = 'inline-flex';
    }

    // Profile tab data
    document.getElementById('profile-fullname').textContent = currentUser.fullName || '-';
    document.getElementById('profile-username').textContent = currentUser.username || '-';
    
    // Member since
    if (currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        document.getElementById('member-since').textContent = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
        });
    }

    // Personal Information
    document.getElementById('info-fullname').textContent = currentUser.fullName || '-';
    document.getElementById('info-fullname-bn').textContent = currentUser.name_bn || '-';
    document.getElementById('info-father').textContent = currentUser.father_name || '-';
    document.getElementById('info-mother').textContent = currentUser.mother_name || '-';
    
    if (currentUser.dob) {
        const dob = new Date(currentUser.dob);
        document.getElementById('info-dob').textContent = dob.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    document.getElementById('info-age').textContent = currentUser.age ? `${currentUser.age} years` : '-';
    document.getElementById('info-nid').textContent = currentUser.nid ? maskNID(currentUser.nid) : '-';

    // Contact Information
    document.getElementById('info-email').textContent = currentUser.email || '-';
    document.getElementById('info-phone').textContent = currentUser.phone || '-';

    // Address Information
    document.getElementById('info-division').textContent = capitalizeFirst(currentUser.division) || '-';
    document.getElementById('info-district').textContent = capitalizeFirst(currentUser.district) || '-';
    document.getElementById('info-police-station').textContent = capitalizeFirst(currentUser.police_station) || '-';
    document.getElementById('info-union').textContent = capitalizeFirst(currentUser.union_name) || '-';
    document.getElementById('info-village').textContent = capitalizeFirst(currentUser.village) || '-';
    document.getElementById('info-place-details').textContent = currentUser.place_details || '-';
}

// ===== DASHBOARD DATA =====
async function loadDashboardData() {
    await Promise.all([
        loadComplaints(),
        loadNotifications()
    ]);
}

async function loadComplaints() {
    try {
        const response = await fetch(`${API_BASE}/my-complaints`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                complaints = data.complaints || [];
                updateStats();
                renderRecentComplaints();
                renderAllComplaints();
            }
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        renderEmptyComplaints();
    }
}

function updateStats() {
    const stats = {
        pending: 0,
        verifying: 0,
        investigating: 0,
        resolved: 0
    };

    complaints.forEach(c => {
        if (stats.hasOwnProperty(c.status)) {
            stats[c.status]++;
        }
    });

    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('verifying-count').textContent = stats.verifying;
    document.getElementById('investigating-count').textContent = stats.investigating;
    document.getElementById('resolved-count').textContent = stats.resolved;
}

function renderRecentComplaints() {
    const container = document.getElementById('recent-complaints');
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No complaints yet</h3>
                <p>File your first report to see it here</p>
            </div>
        `;
        return;
    }

    const recent = complaints.slice(0, 5);
    container.innerHTML = recent.map(c => `
        <div class="recent-item" data-action="viewComplaint" data-id="${c.complaint_id}" style="cursor: pointer;">
            <div class="recent-info">
                <h4>${c.complaint_type || 'Unknown Type'}</h4>
                <p>${formatDate(c.created_at)} - ${truncateText(c.description, 50)}</p>
            </div>
            <span class="status ${c.status}">${capitalizeFirst(c.status)}</span>
        </div>
    `).join('');
}

function renderAllComplaints() {
    const container = document.getElementById('complaints-list');
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>No complaints found</h3>
                <p>You haven't filed any complaints yet</p>
                <button class="submit-btn" data-action="switchTab" data-tab="new-report" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> File New Report
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = complaints.map(c => `
        <div class="complaint-card">
            <div class="complaint-header">
                <div>
                    <h4>${c.complaint_type || 'Unknown Type'}</h4>
                    <p style="color: var(--muted-blue); font-size: 0.9rem;">
                        <i class="fas fa-calendar"></i> ${formatDate(c.created_at)}
                        ${c.location_address ? `<span style="margin-left: 15px;"><i class="fas fa-map-marker-alt"></i> ${truncateText(c.location_address, 30)}</span>` : ''}
                    </p>
                </div>
                <span class="status ${c.status}">${capitalizeFirst(c.status)}</span>
            </div>
            <p style="margin: 15px 0; color: var(--dark-blue);">${truncateText(c.description, 150)}</p>
            <div class="complaint-actions">
                <button class="outline-btn" data-action="viewComplaint" data-id="${c.complaint_id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="chat-btn-small" data-action="openChat" data-id="${c.complaint_id}">
                    <i class="fas fa-comments"></i> Message
                </button>
                ${c.status === 'pending' ? `
                    <button class="danger-btn" data-action="deleteComplaint" data-id="${c.complaint_id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderEmptyComplaints() {
    document.getElementById('recent-complaints').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Unable to load complaints</p>
        </div>
    `;
    document.getElementById('complaints-list').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Error loading complaints</h3>
            <p>Please try again later</p>
        </div>
    `;
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    // For now, show placeholder notifications
    // This can be connected to a real notifications API later
    const container = document.getElementById('notifications-list');
    
    notifications = [
        {
            id: 1,
            type: 'info',
            title: 'Welcome to SecureVoice',
            message: 'Thank you for registering. You can now file crime reports securely.',
            time: new Date(),
            read: false
        }
    ];

    if (complaints.length > 0) {
        const latestComplaint = complaints[0];
        notifications.unshift({
            id: 2,
            type: latestComplaint.status === 'resolved' ? 'success' : 'info',
            title: `Report Status: ${capitalizeFirst(latestComplaint.status)}`,
            message: `Your ${latestComplaint.complaint_type} report is currently ${latestComplaint.status}.`,
            time: new Date(latestComplaint.created_at),
            read: true
        });
    }

    renderNotifications();
    updateNotificationCount();
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-card ${n.read ? '' : 'unread'}">
            <div class="notification-card-icon ${n.type}">
                <i class="fas fa-${n.type === 'success' ? 'check' : n.type === 'warning' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="notification-card-content">
                <h4>${n.title}</h4>
                <p>${n.message}</p>
                <span class="notification-card-time">${formatTimeAgo(n.time)}</span>
            </div>
        </div>
    `).join('');
}

function updateNotificationCount() {
    const unread = notifications.filter(n => !n.read).length;
    const countEl = document.getElementById('notification-count');
    
    if (unread > 0) {
        countEl.textContent = unread;
        countEl.style.display = 'inline-flex';
    } else {
        countEl.style.display = 'none';
    }
}

// ===== TAB NAVIGATION =====
function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

// ===== MODALS =====
function initModals() {
    // Edit Profile Modal
    const editBtn = document.getElementById('edit-profile-btn');
    const editModal = document.getElementById('edit-profile-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    const editForm = document.getElementById('edit-profile-form');

    editBtn?.addEventListener('click', () => {
        populateEditForm();
        editModal.style.display = 'flex';
    });

    closeBtn?.addEventListener('click', () => editModal.style.display = 'none');
    cancelBtn?.addEventListener('click', () => editModal.style.display = 'none');

    editForm?.addEventListener('submit', handleProfileUpdate);

    // Complaint Detail Modal
    const complaintModal = document.getElementById('complaint-detail-modal');
    const closeComplaintBtn = document.getElementById('close-complaint-modal');

    closeComplaintBtn?.addEventListener('click', () => complaintModal.style.display = 'none');

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === complaintModal) complaintModal.style.display = 'none';
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Mark all notifications read
    document.getElementById('mark-all-read')?.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        renderNotifications();
        updateNotificationCount();
    });
}

function populateEditForm() {
    if (!currentUser) return;
    
    document.getElementById('edit-email').value = currentUser.email || '';
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-division').value = capitalizeFirst(currentUser.division) || '';
    document.getElementById('edit-district').value = currentUser.district || '';
    document.getElementById('edit-place-details').value = currentUser.place_details || '';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('edit-email').value,
        phone: document.getElementById('edit-phone').value,
        division: document.getElementById('edit-division').value,
        district: document.getElementById('edit-district').value,
        place_details: document.getElementById('edit-place-details').value
    };

    try {
        const response = await fetch(`${API_BASE}/profile/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Profile updated successfully!');
            document.getElementById('edit-profile-modal').style.display = 'none';
            location.reload();
        } else {
            alert(result.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        alert('Failed to update profile. Please try again.');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'login.html';
}

// ===== COMPLAINT ACTIONS =====
function viewComplaint(id) {
    const complaint = complaints.find(c => c.complaint_id === id);
    if (!complaint) return;

    const modal = document.getElementById('complaint-detail-modal');
    const content = document.getElementById('complaint-detail-content');

    content.innerHTML = `
        <div class="complaint-detail">
            <div class="detail-header">
                <span class="status ${complaint.status}">${capitalizeFirst(complaint.status)}</span>
                <span class="complaint-id">ID: #${complaint.complaint_id}</span>
            </div>
            
            <h3 style="margin: 20px 0 10px;">${complaint.complaint_type || 'Unknown Type'}</h3>
            
            <div class="detail-grid" style="display: grid; gap: 15px; margin: 20px 0;">
                <div class="detail-item">
                    <label><i class="fas fa-calendar"></i> Date Filed</label>
                    <p>${formatDate(complaint.created_at)}</p>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-map-marker-alt"></i> Location</label>
                    <p>${complaint.location_address || 'Not specified'}</p>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <label><i class="fas fa-align-left"></i> Description</label>
                    <p>${complaint.description || 'No description provided'}</p>
                </div>
            </div>
            
            <div class="detail-actions" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--light-grey); display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="primary-btn" data-action="openChat" data-id="${complaint.complaint_id}">
                    <i class="fas fa-comments"></i> Message Admin
                </button>
                ${complaint.status === 'pending' ? `
                    <button class="danger-btn" data-action="deleteComplaintAndClose" data-id="${complaint.complaint_id}">
                        <i class="fas fa-trash"></i> Delete Report
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/complaints/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Complaint deleted successfully');
            loadComplaints();
        } else {
            alert(result.message || 'Failed to delete complaint');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete complaint. Please try again.');
    }
}

// ===== REPORT FORM =====
function initReportForm() {
    const form = document.getElementById('report-form');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('evidence-files');
    const locationBtn = document.getElementById('get-location');

    form?.addEventListener('submit', handleReportSubmit);

    fileUploadArea?.addEventListener('click', () => fileInput?.click());
    
    fileUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea?.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput?.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    locationBtn?.addEventListener('click', getCurrentLocation);

    // Set max date for incident date
    const incidentDate = document.getElementById('incident-date');
    if (incidentDate) {
        incidentDate.max = new Date().toISOString().split('T')[0];
    }
}

function handleFiles(files) {
    const container = document.getElementById('uploaded-files');
    
    Array.from(files).forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }

        const fileEl = document.createElement('div');
        fileEl.className = 'uploaded-file';
        fileEl.innerHTML = `
            <i class="fas fa-${getFileIcon(file.type)}"></i>
            <span>${truncateText(file.name, 20)}</span>
            <button type="button" class="remove-file-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add event listener for remove button
        fileEl.querySelector('.remove-file-btn').addEventListener('click', () => {
            fileEl.remove();
        });
        
        container.appendChild(fileEl);
    });
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf')) return 'file-pdf';
    return 'file';
}

function getCurrentLocation() {
    const locationInput = document.getElementById('incident-location');
    
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Please enter the location manually.');
        return;
    }

    // Show loading state
    locationInput.value = 'Getting your location...';
    locationInput.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                // Try OpenCage first, then fallback to Nominatim
                let address = null;
                
                try {
                    const response = await fetch(
                        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=2caa6cd327404e8a8881300f50f2d21c`
                    );
                    const data = await response.json();
                    if (data.results?.length > 0) {
                        address = data.results[0].formatted;
                    }
                } catch (e) {
                    console.log('OpenCage failed, trying Nominatim');
                }
                
                // Fallback to Nominatim (free, no API key)
                if (!address) {
                    const nominatimResponse = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        {
                            headers: {
                                'Accept-Language': 'en',
                                'User-Agent': 'SecureVoice Crime Reporting System'
                            }
                        }
                    );
                    const nominatimData = await nominatimResponse.json();
                    if (nominatimData?.display_name) {
                        address = nominatimData.display_name;
                    }
                }
                
                locationInput.value = address || `${latitude}, ${longitude}`;
            } catch (error) {
                console.error('Geocoding error:', error);
                locationInput.value = `${latitude}, ${longitude}`;
            } finally {
                locationInput.disabled = false;
            }
        },
        (error) => {
            locationInput.value = '';
            locationInput.disabled = false;
            
            let message = 'Unable to get your location. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Location access was denied. Please enable location permissions or enter the address manually.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information is unavailable. Please enter the address manually.';
                    break;
                case error.TIMEOUT:
                    message += 'Location request timed out. Please try again or enter the address manually.';
                    break;
                default:
                    message += 'Please enter the address manually.';
            }
            alert(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function handleReportSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('complaint_type', document.getElementById('crime-type').value);
    formData.append('incident_date', document.getElementById('incident-date').value);
    formData.append('incident_time', document.getElementById('incident-time').value || '');
    formData.append('location_address', document.getElementById('incident-location').value);
    formData.append('description', document.getElementById('incident-description').value);
    formData.append('witnesses', document.getElementById('witnesses').value || '');
    formData.append('anonymous', document.getElementById('anonymous-report').checked);

    // Add files
    const fileInput = document.getElementById('evidence-files');
    if (fileInput?.files) {
        Array.from(fileInput.files).forEach(file => {
            formData.append('evidence', file);
        });
    }

    try {
        const response = await fetch(`${API_BASE}/complaints`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Report submitted successfully!');
            document.getElementById('report-form').reset();
            document.getElementById('uploaded-files').innerHTML = '';
            switchTab('complaints');
            loadComplaints();
        } else {
            alert(result.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error('Submit error:', error);
        alert('Failed to submit report. Please try again.');
    }
}

// ===== FILTERS =====
function initFilters() {
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('clear-filters')?.addEventListener('click', clearFilters);
}

function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const category = document.getElementById('filter-category').value;
    const date = document.getElementById('filter-date').value;

    let filtered = [...complaints];

    if (status) {
        filtered = filtered.filter(c => c.status === status);
    }
    if (category) {
        filtered = filtered.filter(c => c.complaint_type === category);
    }
    if (date) {
        filtered = filtered.filter(c => {
            const complaintDate = new Date(c.created_at).toISOString().split('T')[0];
            return complaintDate === date;
        });
    }

    renderFilteredComplaints(filtered);
}

function clearFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-date').value = '';
    renderAllComplaints();
}

function renderFilteredComplaints(filtered) {
    const container = document.getElementById('complaints-list');
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `;
        return;
    }

    // Reuse the same render logic
    container.innerHTML = filtered.map(c => `
        <div class="complaint-card">
            <div class="complaint-header">
                <div>
                    <h4>${c.complaint_type || 'Unknown Type'}</h4>
                    <p style="color: var(--muted-blue); font-size: 0.9rem;">
                        <i class="fas fa-calendar"></i> ${formatDate(c.created_at)}
                    </p>
                </div>
                <span class="status ${c.status}">${capitalizeFirst(c.status)}</span>
            </div>
            <p style="margin: 15px 0; color: var(--dark-blue);">${truncateText(c.description, 150)}</p>
            <div class="complaint-actions">
                <button class="outline-btn" data-action="viewComplaint" data-id="${c.complaint_id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `).join('');
}

// ===== UTILITY FUNCTIONS =====
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return formatDate(date);
}

function maskNID(nid) {
    if (!nid || nid.length < 8) return nid;
    return nid.substring(0, 4) + '****' + nid.substring(nid.length - 4);
}

// ===== CHAT SYSTEM =====
let currentChatComplaintId = null;
let chatRefreshInterval = null;

function openChatModal(complaintId) {
    currentChatComplaintId = complaintId;
    const complaint = complaints.find(c => c.complaint_id === complaintId);
    
    const chatModal = document.getElementById('chat-modal');
    if (!chatModal) {
        createChatModal();
    }
    
    document.getElementById('chat-complaint-id').textContent = `#${complaintId}`;
    document.getElementById('chat-complaint-type').textContent = complaint ? complaint.complaint_type : 'Complaint';
    document.getElementById('chat-modal').style.display = 'flex';
    
    loadChatMessages(complaintId);
    
    // Auto-refresh messages every 5 seconds
    if (chatRefreshInterval) clearInterval(chatRefreshInterval);
    chatRefreshInterval = setInterval(() => loadChatMessages(complaintId), 5000);
}

function closeChatModal() {
    document.getElementById('chat-modal').style.display = 'none';
    currentChatComplaintId = null;
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
        chatRefreshInterval = null;
    }
}

function createChatModal() {
    const modalHTML = `
        <div class="modal-overlay" id="chat-modal">
            <div class="modal chat-modal-container">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <h3><i class="fas fa-comments"></i> Chat with Admin</h3>
                        <span class="chat-complaint-badge">
                            <span id="chat-complaint-type">Complaint</span> 
                            <span id="chat-complaint-id">#0</span>
                        </span>
                    </div>
                    <button class="modal-close" id="close-chat-modal">&times;</button>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="chat-loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading messages...
                    </div>
                </div>
                <div class="chat-input-container">
                    <form id="chat-form" class="chat-form">
                        <input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off" required>
                        <button type="submit" class="chat-send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('close-chat-modal').addEventListener('click', closeChatModal);
    document.getElementById('chat-modal').addEventListener('click', (e) => {
        if (e.target.id === 'chat-modal') closeChatModal();
    });
    document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
}

async function loadChatMessages(complaintId) {
    try {
        const response = await fetch(`/complaint-chat/${complaintId}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderChatMessages(data.messages);
        } else {
            console.error('Failed to load messages:', data.message);
        }
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <i class="fas fa-comment-slash"></i>
                <p>No messages yet</p>
                <span>Start a conversation with the admin about your complaint</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.sender_type === 'user' ? 'sent' : 'received'}">
            <div class="message-bubble">
                <p>${escapeHtml(msg.message)}</p>
                <span class="message-time">${formatChatTime(msg.sent_at)}</span>
            </div>
            <span class="message-sender">${msg.sender_type === 'user' ? 'You' : 'Admin'}</span>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function handleSendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !currentChatComplaintId) return;
    
    const sendBtn = document.querySelector('.chat-send-btn');
    sendBtn.disabled = true;
    
    try {
        const response = await fetch(`/send-chat-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                complaintId: currentChatComplaintId,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            loadChatMessages(currentChatComplaintId);
        } else {
            alert(data.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Send message error:', error);
        alert('Failed to send message. Please try again.');
    } finally {
        sendBtn.disabled = false;
    }
}

function formatChatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.switchTab = switchTab;
window.viewComplaint = viewComplaint;
window.deleteComplaint = deleteComplaint;
window.openChatModal = openChatModal;
window.closeChatModal = closeChatModal;
