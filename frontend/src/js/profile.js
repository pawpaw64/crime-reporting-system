// SecureVoice User Dashboard JavaScript
// Handles all dashboard functionality including profile, complaints, and notifications

// Determine API base URL dynamically
function getApiBase() {
    const hostname = window.location.hostname;
    const currentPort = window.location.port;
    const backendPorts = ['3000', '3001', '5000'];
    
    // If running from backend server, use relative path
    if (backendPorts.includes(currentPort)) {
        return '/api';
    }
    
    // If running from Live Server or other dev servers, connect to backend on port 3000
    return `http://${hostname}:3000/api`;
}

const API_BASE = getApiBase();

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
    initSidebarScrollIndicator();
});

// ===== SIDEBAR SCROLL INDICATOR =====
function initSidebarScrollIndicator() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Create scroll indicator
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
    navLinks.appendChild(scrollIndicator);

    // Function to check if scrolled to bottom
    function updateScrollIndicator() {
        const isScrollable = navLinks.scrollHeight > navLinks.clientHeight;
        const isAtBottom = navLinks.scrollHeight - navLinks.scrollTop - navLinks.clientHeight < 5;
        
        if (isScrollable && !isAtBottom) {
            scrollIndicator.classList.add('visible');
        } else {
            scrollIndicator.classList.remove('visible');
        }
    }

    // Check on scroll
    navLinks.addEventListener('scroll', updateScrollIndicator);

    // Check on load and resize
    updateScrollIndicator();
    window.addEventListener('resize', updateScrollIndicator);
}

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
                <p>You haven't filed any complaints yet. Use the "New Report" button above to file your first complaint.</p>
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
    const container = document.getElementById('notifications-list');
    
    try {
        const response = await fetch(`${API_BASE}/user-notifications`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        
        const data = await response.json();
        
        if (data.success) {
            notifications = data.notifications.map(n => ({
                id: n.id,
                type: getNotificationType(n.type),
                title: getNotificationTitle(n.type, n.complaint_type, n.complaint_id),
                message: n.message,
                time: new Date(n.created_at),
                read: Boolean(n.is_read),
                complaintId: n.complaint_id
            }));
        } else {
            notifications = [];
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        // Add default welcome notification if no notifications exist
        notifications = [{
            id: 0,
            type: 'info',
            title: 'Welcome to SecureVoice',
            message: 'Thank you for using our platform. File reports securely and track their status here.',
            time: new Date(),
            read: true
        }];
    }

    renderNotifications();
    updateNotificationCount();
}

function getNotificationType(type) {
    switch (type) {
        case 'status_change':
            return 'info';
        case 'admin_message':
        case 'admin_comment':
            return 'warning';
        case 'resolved':
            return 'success';
        default:
            return 'info';
    }
}

function getNotificationTitle(type, complaintType, complaintId) {
    switch (type) {
        case 'status_change':
            return `Report #${complaintId} Status Update`;
        case 'admin_message':
        case 'admin_comment':
            return `New Message - Report #${complaintId}`;
        case 'resolved':
            return `Report #${complaintId} Resolved`;
        default:
            return `Update for ${complaintType || 'Report'} #${complaintId}`;
    }
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

    container.innerHTML = `
        <div class="notifications-header">
            <button class="btn btn-sm btn-secondary" id="mark-all-read-btn">
                <i class="fas fa-check-double"></i> Mark all as read
            </button>
        </div>
        ${notifications.map(n => `
            <div class="notification-card ${n.read ? '' : 'unread'}" data-id="${n.id}" ${n.complaintId ? `data-complaint-id="${n.complaintId}"` : ''}>
                <div class="notification-card-icon ${n.type}">
                    <i class="fas fa-${n.type === 'success' ? 'check' : n.type === 'warning' ? 'comment' : 'info'}"></i>
                </div>
                <div class="notification-card-content">
                    <h4>${n.title}</h4>
                    <p>${n.message}</p>
                    <span class="notification-card-time">${formatTimeAgo(n.time)}</span>
                </div>
            </div>
        `).join('')}
    `;

    // Add event listener for mark all as read
    document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllNotificationsRead);
    
    // Add click handlers for notifications to navigate to complaint
    document.querySelectorAll('.notification-card[data-complaint-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const complaintId = card.dataset.complaintId;
            if (complaintId) {
                viewComplaint(parseInt(complaintId));
            }
        });
    });
}

async function markAllNotificationsRead() {
    try {
        const response = await fetch(`${API_BASE}/mark-all-notifications-read`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            notifications.forEach(n => n.read = true);
            renderNotifications();
            updateNotificationCount();
        }
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
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

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    settingsBtn?.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeSettingsBtn?.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    // Initialize Settings
    initSettings();

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === complaintModal) complaintModal.style.display = 'none';
        if (e.target === settingsModal) settingsModal.classList.remove('active');
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
let reportMap = null;
let reportMarker = null;
let radiusCircle = null;
let selectedLocationData = {
    latitude: null,
    longitude: null,
    address: '',
    isAccurate: true,
    accuracyRadius: null
};
let selectedFiles = {
    image: [],
    video: null,
    audio: null
};

function initReportForm() {
    const form = document.getElementById('report-form');
    const openMapBtn = document.getElementById('open-map');

    form?.addEventListener('submit', handleReportSubmit);
    openMapBtn?.addEventListener('click', openReportMap);

    // Set max date for incident date
    const incidentDate = document.getElementById('incident-date');
    if (incidentDate) {
        incidentDate.max = new Date().toISOString().split('T')[0];
    }

    // Initialize map controls
    initReportMapControls();
    
    // Initialize file upload handlers
    initFileUploads();
    
    // Initialize accuracy options
    initAccuracyOptions();

    // Check for tab parameter in URL
    checkUrlForTab();
}

function checkUrlForTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
        switchTab(tab);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function initAccuracyOptions() {
    document.querySelectorAll('input[name="locationAccuracy"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedLocationData.isAccurate = e.target.value === 'accurate';
            updateAccuracyDisplay();
        });
    });
}

function updateAccuracyDisplay() {
    const radiusNotice = document.getElementById('radius-notice');
    const accuracyInfo = document.getElementById('report-accuracy-info');
    
    if (selectedLocationData.isAccurate) {
        selectedLocationData.accuracyRadius = null;
        // Hide radius circle for accurate mode
        if (radiusCircle && reportMap) {
            reportMap.removeLayer(radiusCircle);
            radiusCircle = null;
        }
        radiusNotice?.classList.add('hidden');
        accuracyInfo?.classList.add('hidden');
    } else {
        selectedLocationData.accuracyRadius = 100; // Fixed 100m radius
        // Show radius circle for approximate mode
        updateRadiusCircle();
        radiusNotice?.classList.remove('hidden');
        if (selectedLocationData.latitude) {
            accuracyInfo?.classList.remove('hidden');
            if (accuracyInfo) accuracyInfo.textContent = 'Privacy radius: 100m';
        }
    }
}

function updateRadiusCircle() {
    if (!selectedLocationData.isAccurate && selectedLocationData.latitude && selectedLocationData.longitude && reportMap) {
        // Remove existing circle
        if (radiusCircle) {
            reportMap.removeLayer(radiusCircle);
        }
        
        // Create new radius circle with fixed 100m radius
        radiusCircle = L.circle([selectedLocationData.latitude, selectedLocationData.longitude], {
            color: '#ff7800',
            fillColor: '#ff7800',
            fillOpacity: 0.1,
            weight: 2,
            radius: 100
        }).addTo(reportMap);
        
        // Add popup to circle
        radiusCircle.bindPopup('🌐 Privacy Area<br>Radius: 100m');
    }
}

function initFileUploads() {
    // Image upload
    const imageUpload = document.getElementById('image-upload');
    imageUpload?.addEventListener('change', (e) => {
        selectedFiles.image = Array.from(e.target.files);
        updateUploadDisplay('image', selectedFiles.image);
    });

    // Video upload
    const videoUpload = document.getElementById('video-upload');
    videoUpload?.addEventListener('change', (e) => {
        selectedFiles.video = e.target.files[0];
        updateUploadDisplay('video', selectedFiles.video);
    });

    // Audio upload
    const audioUpload = document.getElementById('audio-upload');
    audioUpload?.addEventListener('change', (e) => {
        selectedFiles.audio = e.target.files[0];
        updateUploadDisplay('audio', selectedFiles.audio);
    });
}

function updateUploadDisplay(type, files) {
    const box = document.getElementById(`${type}-upload-box`);
    if (!box) return;
    
    if (files && (Array.isArray(files) ? files.length > 0 : files)) {
        box.classList.add('file-selected');
        const label = box.querySelector('label span');
        if (label) {
            if (Array.isArray(files)) {
                label.innerHTML = `✓ ${files.length} file(s)<br><small>Selected</small>`;
            } else {
                label.innerHTML = `✓ ${files.name.substring(0, 15)}...<br><small>Selected</small>`;
            }
        }
    } else {
        box.classList.remove('file-selected');
    }
}

function initReportMapControls() {
    const useCurrentBtn = document.getElementById('use-current-location-report');
    const confirmBtn = document.getElementById('confirm-location-report');
    const cancelBtn = document.getElementById('cancel-location-report');

    useCurrentBtn?.addEventListener('click', useCurrentLocationOnReportMap);
    confirmBtn?.addEventListener('click', confirmReportLocation);
    cancelBtn?.addEventListener('click', closeReportMap);
}

function openReportMap() {
    const mapContainer = document.getElementById('report-map-container');
    const placeholder = document.getElementById('map-placeholder');
    
    mapContainer?.classList.remove('hidden');
    placeholder?.classList.add('hidden');
    
    // Initialize map if not already initialized
    setTimeout(() => {
        if (!reportMap) {
            initializeReportMap();
        } else {
            reportMap.invalidateSize();
        }
    }, 100);
}

function closeReportMap() {
    const mapContainer = document.getElementById('report-map-container');
    const placeholder = document.getElementById('map-placeholder');
    
    mapContainer?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
    
    // Clean up radius circle when closing
    if (radiusCircle && reportMap) {
        reportMap.removeLayer(radiusCircle);
        radiusCircle = null;
    }
}

function initializeReportMap() {
    const mapElement = document.getElementById('report-leaflet-map');
    
    if (!mapElement) return;
    
    // Default to Dhaka, Bangladesh
    reportMap = L.map('report-leaflet-map').setView([23.8103, 90.4125], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(reportMap);

    // Create draggable marker
    reportMarker = L.marker([23.8103, 90.4125], { 
        draggable: true 
    }).addTo(reportMap);
    
    reportMarker.bindPopup('📍 Drag me to your location!').openPopup();
    
    // Update location when marker is dragged
    reportMarker.on('dragend', function(e) {
        const position = e.target.getLatLng();
        updateReportMapLocation(position.lat, position.lng);
    });
    
    // Update location when map is clicked
    reportMap.on('click', function(e) {
        const { lat, lng } = e.latlng;
        reportMarker.setLatLng([lat, lng]);
        updateReportMapLocation(lat, lng);
    });
}

async function updateReportMapLocation(lat, lng) {
    selectedLocationData.latitude = lat;
    selectedLocationData.longitude = lng;
    
    // Show coordinates immediately
    const coordsElement = document.getElementById('report-selected-coords');
    const addressElement = document.getElementById('report-selected-address');
    const infoElement = document.getElementById('report-location-info');
    
    if (coordsElement) coordsElement.textContent = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (addressElement) addressElement.textContent = 'Getting address...';
    infoElement?.classList.remove('hidden');
    
    // Update radius circle if in approximate mode
    updateRadiusCircle();
    updateAccuracyDisplay();
    
    // Geocode to get address
    try {
        let address = await geocodeCoordinates(lat, lng);
        
        if (address) {
            selectedLocationData.address = address;
            if (addressElement) addressElement.textContent = address;
            reportMarker?.bindPopup(`📍 ${address}`).openPopup();
        } else {
            selectedLocationData.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            if (addressElement) addressElement.textContent = 'Could not get address';
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        selectedLocationData.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (addressElement) addressElement.textContent = 'Error getting address';
    }
}

async function geocodeCoordinates(lat, lng) {
    let address = null;
    
    // Try Nominatim first
    try {
        const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'SecureVoice Crime Reporting System'
                }
            }
        );
        
        if (nominatimResponse.ok) {
            const nominatimData = await nominatimResponse.json();
            if (nominatimData?.display_name) {
                address = nominatimData.display_name;
            }
        }
    } catch (e) {
        console.log('Nominatim failed:', e);
    }
    
    // Fallback to OpenCage
    if (!address) {
        try {
            const response = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=2caa6cd327404e8a8881300f50f2d21c`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.results?.length > 0) {
                    address = data.results[0].formatted;
                }
            }
        } catch (e) {
            console.log('OpenCage failed:', e);
        }
    }
    
    return address;
}

function useCurrentLocationOnReportMap() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const btn = document.getElementById('use-current-location-report');
    const originalHTML = btn?.innerHTML;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
        btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            if (reportMap && reportMarker) {
                reportMap.setView([latitude, longitude], 16);
                reportMarker.setLatLng([latitude, longitude]);
                updateReportMapLocation(latitude, longitude);
            }
            
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        },
        (error) => {
            alert('Unable to get your location. Please select manually on the map.');
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function confirmReportLocation() {
    if (!selectedLocationData.latitude || !selectedLocationData.longitude) {
        alert('Please select a location on the map first');
        return;
    }
    
    const locationInput = document.getElementById('incident-location');
    const latInput = document.getElementById('incident-latitude');
    const lngInput = document.getElementById('incident-longitude');
    const radiusInput = document.getElementById('incident-accuracy-radius');
    
    if (locationInput) locationInput.value = selectedLocationData.address;
    if (latInput) latInput.value = selectedLocationData.latitude;
    if (lngInput) lngInput.value = selectedLocationData.longitude;
    if (radiusInput && !selectedLocationData.isAccurate) {
        radiusInput.value = selectedLocationData.accuracyRadius;
    }
    
    closeReportMap();
}

async function handleReportSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-report-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');

    // Show loading state
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    
    // Get form values
    const complaintType = document.getElementById('crime-type').value;
    const incidentDate = document.getElementById('incident-date').value;
    const incidentTime = document.getElementById('incident-time').value;
    const location = document.getElementById('incident-location').value;
    const description = document.getElementById('incident-description').value;
    const witnesses = document.getElementById('witnesses').value;
    const anonymous = document.getElementById('anonymous-report').checked;

    // Validation
    if (!complaintType || !incidentDate || !location || !description) {
        showReportError('Please fill in all required fields');
        resetSubmitButton();
        return;
    }

    // Combine date and time
    let incidentDateTime = incidentDate;
    if (incidentTime) {
        incidentDateTime = `${incidentDate}T${incidentTime}`;
    }

    formData.append('complaintType', complaintType);
    formData.append('incidentDate', incidentDateTime);
    formData.append('location', location);
    formData.append('description', description);
    formData.append('witnesses', witnesses || '');
    formData.append('anonymous', anonymous);

    // Add location coordinates if available
    const latInput = document.getElementById('incident-latitude');
    const lngInput = document.getElementById('incident-longitude');
    const radiusInput = document.getElementById('incident-accuracy-radius');
    
    if (latInput?.value && lngInput?.value) {
        formData.append('latitude', latInput.value);
        formData.append('longitude', lngInput.value);
        
        if (radiusInput?.value) {
            formData.append('accuracyRadius', radiusInput.value);
        }
    }

    // Add files
    if (selectedFiles.image && selectedFiles.image.length > 0) {
        selectedFiles.image.forEach(file => {
            formData.append('evidence', file);
        });
    }
    if (selectedFiles.video) {
        formData.append('evidence', selectedFiles.video);
    }
    if (selectedFiles.audio) {
        formData.append('evidence', selectedFiles.audio);
    }

    console.log('Submitting complaint with data:', {
        complaintType,
        incidentDate: incidentDateTime,
        location,
        hasCoordinates: !!(latInput?.value && lngInput?.value),
        fileCount: (selectedFiles.image?.length || 0) + (selectedFiles.video ? 1 : 0) + (selectedFiles.audio ? 1 : 0)
    });

    try {
        const response = await fetch('/submit-complaint', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Please log in to submit a complaint');
            }
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            // Show success modal
            showReportSuccess(data.complaintId);
            
            // Reset form
            document.getElementById('report-form').reset();
            selectedFiles = { image: [], video: null, audio: null };
            selectedLocationData = {
                latitude: null,
                longitude: null,
                address: '',
                isAccurate: true,
                accuracyRadius: null
            };
            resetUploadDisplays();
            
            // Reload complaints
            loadComplaints();
        } else {
            showReportError(data.message || 'Error submitting complaint');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showReportError(error.message || 'Unable to submit complaint. Please check your connection and try again.');
    } finally {
        resetSubmitButton();
    }
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submit-report-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');
    
    if (btnText) btnText.classList.remove('hidden');
    if (btnLoading) btnLoading.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
}

function showReportSuccess(complaintId) {
    const modal = document.getElementById('report-success-modal');
    const idDisplay = document.getElementById('complaint-id-display');
    
    if (idDisplay && complaintId) {
        idDisplay.innerHTML = `
            <strong>Complaint ID: #${complaintId}</strong>
            <p>Please save this ID for future reference.</p>
        `;
    }
    
    modal?.classList.remove('hidden');
    
    // Close modal handlers
    document.getElementById('close-success-modal')?.addEventListener('click', () => {
        modal?.classList.add('hidden');
        switchTab('dashboard');
    });
    
    document.getElementById('view-complaints-btn')?.addEventListener('click', () => {
        modal?.classList.add('hidden');
        switchTab('complaints');
    });
}

function showReportError(message) {
    const modal = document.getElementById('report-error-modal');
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) errorMessage.textContent = message;
    modal?.classList.remove('hidden');
    
    // Close modal handler
    document.getElementById('close-error-modal')?.addEventListener('click', () => {
        modal?.classList.add('hidden');
    });
}

function resetUploadDisplays() {
    const types = ['image', 'video', 'audio'];
    types.forEach(type => {
        const box = document.getElementById(`${type}-upload-box`);
        if (box) {
            box.classList.remove('file-selected');
            const label = box.querySelector('label span');
            if (label) {
                const labels = {
                    image: 'Upload Images<br><small>JPG, PNG, GIF</small>',
                    video: 'Upload Video<br><small>MP4, MOV, AVI</small>',
                    audio: 'Upload Audio<br><small>MP3, WAV, OGG</small>'
                };
                label.innerHTML = labels[type];
            }
        }
    });
    
    // Clear uploaded files display
    const uploadedFiles = document.getElementById('uploaded-files');
    if (uploadedFiles) uploadedFiles.innerHTML = '';
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

// ===== SETTINGS FUNCTIONALITY =====
function initSettings() {
    // Load saved settings from localStorage
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const emailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    const pushNotifications = localStorage.getItem('pushNotifications') !== 'false';
    const profileVisibility = localStorage.getItem('profileVisibility') !== 'false';
    const anonymousReporting = localStorage.getItem('anonymousReporting') === 'true';
    const language = localStorage.getItem('language') || 'en';

    // Apply saved settings
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }

    document.getElementById('email-notifications-toggle').checked = emailNotifications;
    document.getElementById('push-notifications-toggle').checked = pushNotifications;
    document.getElementById('profile-visibility-toggle').checked = profileVisibility;
    document.getElementById('anonymous-reporting-toggle').checked = anonymousReporting;
    document.getElementById('language-select').value = language;

    // Dark Mode Toggle
    document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    });

    // Email Notifications Toggle
    document.getElementById('email-notifications-toggle')?.addEventListener('change', (e) => {
        localStorage.setItem('emailNotifications', e.target.checked);
        console.log('Email notifications:', e.target.checked ? 'enabled' : 'disabled');
    });

    // Push Notifications Toggle
    document.getElementById('push-notifications-toggle')?.addEventListener('change', (e) => {
        localStorage.setItem('pushNotifications', e.target.checked);
        if (e.target.checked && 'Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Push notifications enabled');
                }
            });
        }
    });

    // Profile Visibility Toggle
    document.getElementById('profile-visibility-toggle')?.addEventListener('change', (e) => {
        localStorage.setItem('profileVisibility', e.target.checked);
        console.log('Profile visibility:', e.target.checked ? 'public' : 'private');
    });

    // Anonymous Reporting Toggle
    document.getElementById('anonymous-reporting-toggle')?.addEventListener('change', (e) => {
        localStorage.setItem('anonymousReporting', e.target.checked);
        console.log('Anonymous reporting:', e.target.checked ? 'enabled' : 'disabled');
    });

    // Language Select
    document.getElementById('language-select')?.addEventListener('change', (e) => {
        localStorage.setItem('language', e.target.value);
        console.log('Language changed to:', e.target.value);
        // You can add actual language switching logic here
        alert('Language preference saved. Feature will be implemented soon.');
    });
}

// Make functions globally available
window.switchTab = switchTab;
window.viewComplaint = viewComplaint;
window.deleteComplaint = deleteComplaint;
window.openChatModal = openChatModal;
window.closeChatModal = closeChatModal;

