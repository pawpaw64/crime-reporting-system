// SecureVoice Admin Dashboard JavaScript
// Handles all admin dashboard functionality

// Global state
let adminData = null;
let complaintsData = [];
let usersData = [];
let anonymousReportsData = [];
let currentComplaintId = null;
let currentAnonReportId = null;
let anonDetailMap = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initTabNavigation();
    initEventListeners();
    initSettings();
});

// ===== AUTHENTICATION =====
async function checkAdminAuth() {
    try {
        const response = await fetch('/check-admin-auth', {
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/adminLogin';
            return;
        }

        const data = await response.json();
        if (data.success) {
            loadDashboardData();
        } else {
            window.location.href = '/adminLogin';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/adminLogin';
    }
}

// ===== LOAD ALL DATA =====
async function loadDashboardData() {
    await Promise.all([
        loadAdminProfile(),
        loadComplaints(),
        loadUsers(),
        loadDashboardStats(),
        loadAnonymousReports()
    ]);
}

// ===== ADMIN PROFILE =====
async function loadAdminProfile() {
    try {
        const response = await fetch('/get-admin-profile', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            adminData = data.admin;
            populateAdminData();
        } else {
            showToast('Error loading profile', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error loading profile', 'error');
    }
}

function populateAdminData() {
    if (!adminData) return;

    // Sidebar
    document.getElementById('admin-fullname').textContent = adminData.fullName || adminData.username;
    document.getElementById('district-name').textContent = adminData.district_name || 'N/A';
    document.getElementById('welcome-name').textContent = adminData.fullName?.split(' ')[0] || adminData.username;

    // Profile tab
    document.getElementById('profile-fullname').textContent = adminData.fullName || '-';
    document.getElementById('profile-username').textContent = adminData.username || '-';
    document.getElementById('profile-district').textContent = adminData.district_name || '-';

    // Info grid
    document.getElementById('info-fullname').textContent = adminData.fullName || '-';
    document.getElementById('info-username').textContent = adminData.username || '-';
    document.getElementById('info-email').textContent = adminData.email || '-';
    document.getElementById('info-phone').textContent = adminData.phone || '-';
    document.getElementById('info-designation').textContent = adminData.designation || '-';
    document.getElementById('info-official-id').textContent = adminData.official_id || '-';
    document.getElementById('info-district').textContent = adminData.district_name || '-';
    document.getElementById('info-dob').textContent = adminData.dob ? new Date(adminData.dob).toLocaleDateString() : '-';
    document.getElementById('info-created').textContent = adminData.created_at ? new Date(adminData.created_at).toLocaleDateString() : '-';

    // Edit form
    document.getElementById('edit-fullname').value = adminData.fullName || '';
    document.getElementById('edit-dob').value = adminData.dob || '';
}

// ===== DASHBOARD STATS =====
async function loadDashboardStats() {
    try {
        const response = await fetch('/get-admin-dashboard-stats', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsDisplay(stats) {
    // Dashboard tab stats
    document.getElementById('total-cases').textContent = stats.total || 0;
    document.getElementById('pending-cases').textContent = stats.pending || 0;
    document.getElementById('verifying-cases').textContent = stats.verifying || 0;
    document.getElementById('investigating-cases').textContent = stats.investigating || 0;
    document.getElementById('resolved-cases').textContent = stats.resolved || 0;

    // Cases tab stats
    document.getElementById('cases-total').textContent = stats.total || 0;
    document.getElementById('cases-pending').textContent = stats.pending || 0;
    document.getElementById('cases-verifying').textContent = stats.verifying || 0;
    document.getElementById('cases-investigating').textContent = stats.investigating || 0;
    document.getElementById('cases-resolved').textContent = stats.resolved || 0;
}

// ===== COMPLAINTS =====
async function loadComplaints() {
    try {
        const response = await fetch('/get-admin-complaints', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            complaintsData = data.complaints;
            renderComplaints();
            renderRecentComplaints();
            document.getElementById('complaints-count').textContent = `Total: ${complaintsData.length} complaints`;
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        document.getElementById('complaints-table-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Complaints</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function renderRecentComplaints() {
    const container = document.getElementById('recent-complaints');

    if (complaintsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No complaints yet</h3>
                <p>No complaints have been assigned to your district</p>
            </div>
        `;
        return;
    }

    const recent = complaintsData.slice(0, 5);
    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(c => `
                        <tr style="cursor: pointer;" onclick="switchTab('complaints')">
                            <td>#${c.complaint_id}</td>
                            <td>${c.username}</td>
                            <td>${c.complaint_type || 'General'}</td>
                            <td><span class="status ${c.status}">${c.status}</span></td>
                            <td>${new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderComplaints(filteredData = null) {
    const container = document.getElementById('complaints-table-container');
    const complaints = filteredData || complaintsData;

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Complaints Found</h3>
                <p>There are no complaints matching your criteria</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${complaints.map(c => `
                    <tr>
                        <td>#${c.complaint_id}</td>
                        <td>${c.username}</td>
                        <td>${c.complaint_type || 'General'}</td>
                        <td>${new Date(c.created_at).toLocaleDateString()}</td>
                        <td>${truncateText(c.location_address || 'Not specified', 25)}</td>
                        <td><span class="status ${c.status}">${c.status}</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="btn btn-primary btn-sm" onclick="openStatusModal(${c.complaint_id}, '${c.status}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="viewEvidence(${c.complaint_id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="viewDescription(${c.complaint_id}, '${escapeHtml(c.description || 'No description')}')">
                                    <i class="fas fa-file-alt"></i>
                                </button>
                                <button class="btn btn-success btn-sm" onclick="openChat(${c.complaint_id}, '${c.username}')">
                                    <i class="fas fa-comments"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ===== USERS =====
async function loadUsers() {
    try {
        const response = await fetch('/get-district-users', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            usersData = data.users;
            renderUsers();
            document.getElementById('users-count').textContent = `Total: ${usersData.length} users`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers() {
    const container = document.getElementById('users-table-container');

    if (usersData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <h3>No Users Found</h3>
                <p>No users have filed complaints in your district yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Age</th>
                </tr>
            </thead>
            <tbody>
                ${usersData.map(u => `
                    <tr>
                        <td>${u.fullName || 'Not provided'}</td>
                        <td>@${u.username}</td>
                        <td>${u.email}</td>
                        <td>${u.phone || '-'}</td>
                        <td>${u.location || '-'}</td>
                        <td>${u.age || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ===== CASES =====
async function refreshCases() {
    try {
        const response = await fetch('/get-admin-cases', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderCasesTable(data.cases);
            if (data.analytics) {
                updateStatsDisplay(data.analytics);
            }
            showToast('Cases refreshed', 'success');
        }
    } catch (error) {
        console.error('Error refreshing cases:', error);
        showToast('Error refreshing cases', 'error');
    }
}

function renderCasesTable(cases) {
    const container = document.getElementById('cases-table-container');

    if (!cases || cases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <h3>No Cases Found</h3>
                <p>No cases match the current filters</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Case ID</th>
                    <th>Complainant</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${cases.map(c => `
                    <tr>
                        <td>#${c.complaint_id}</td>
                        <td>
                            <strong>${c.complainant_fullname || c.complainant_username}</strong>
                            ${c.complainant_fullname ? `<br><small>@${c.complainant_username}</small>` : ''}
                        </td>
                        <td>${c.complaint_type || 'General'}</td>
                        <td><span class="status ${c.status}">${c.status}</span></td>
                        <td>${new Date(c.created_at).toLocaleDateString()}</td>
                        <td>${c.last_updated ? new Date(c.last_updated).toLocaleDateString() : '-'}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="openStatusModal(${c.complaint_id}, '${c.status}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ===== FILTERS =====
function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('filter-search').value.toLowerCase();

    let filtered = complaintsData;

    if (status) {
        filtered = filtered.filter(c => c.status === status);
    }

    if (search) {
        filtered = filtered.filter(c =>
            c.username.toLowerCase().includes(search) ||
            (c.complaint_type && c.complaint_type.toLowerCase().includes(search))
        );
    }

    renderComplaints(filtered);
}

function clearFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-search').value = '';
    renderComplaints();
}

async function applyCaseFilters() {
    const username = document.getElementById('case-filter-user').value;
    const dateFrom = document.getElementById('case-filter-from').value;
    const dateTo = document.getElementById('case-filter-to').value;

    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    try {
        const response = await fetch('/get-admin-cases?' + params.toString(), { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderCasesTable(data.cases);
            if (data.analytics) {
                updateStatsDisplay(data.analytics);
            }
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        showToast('Error applying filters', 'error');
    }
}

function clearCaseFilters() {
    document.getElementById('case-filter-user').value = '';
    document.getElementById('case-filter-from').value = '';
    document.getElementById('case-filter-to').value = '';
    refreshCases();
}

// ===== MODALS =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openStatusModal(complaintId, currentStatus) {
    currentComplaintId = complaintId;
    document.getElementById('modal-complaint-id').textContent = complaintId;
    document.getElementById('modal-current-status').textContent = currentStatus;
    document.getElementById('modal-new-status').value = currentStatus;
    openModal('statusModal');
}

async function updateComplaintStatus() {
    const newStatus = document.getElementById('modal-new-status').value;

    try {
        const response = await fetch('/update-complaint-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                complaintId: currentComplaintId,
                newStatus: newStatus
            })
        });

        const data = await response.json();

        if (data.success) {
            closeModal('statusModal');
            showToast('Status updated successfully', 'success');
            await loadComplaints();
            await loadDashboardStats();
        } else {
            showToast(data.message || 'Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
    }
}

function viewDescription(complaintId, description) {
    document.getElementById('desc-complaint-id').textContent = complaintId;
    document.getElementById('desc-content').textContent = description;
    openModal('descriptionModal');
}

async function viewEvidence(complaintId) {
    document.getElementById('evidence-complaint-id').textContent = complaintId;
    document.getElementById('evidence-content').innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading evidence...
        </div>
    `;
    openModal('evidenceModal');

    try {
        const response = await fetch(`/get-complaint-evidence/${complaintId}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderEvidence(data.evidence);
        } else {
            document.getElementById('evidence-content').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('evidence-content').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Evidence</h3>
            </div>
        `;
    }
}

function renderEvidence(evidence) {
    const container = document.getElementById('evidence-content');

    if (!evidence || evidence.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-image"></i>
                <h3>No Evidence</h3>
                <p>No evidence files attached to this complaint</p>
            </div>
        `;
        return;
    }

    container.innerHTML = evidence.map((e, i) => {
        const ext = e.file_path.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
        const isAudio = ['mp3', 'wav', 'ogg'].includes(ext);

        let filePath = e.file_path.includes('/') ? `/uploads/${e.file_path}` :
            isImage ? `/uploads/images/${e.file_path}` :
                isVideo ? `/uploads/videos/${e.file_path}` :
                    isAudio ? `/uploads/audio/${e.file_path}` : `/uploads/${e.file_path}`;

        let mediaHtml = '';
        if (isImage) {
            mediaHtml = `<img src="${filePath}" alt="Evidence" style="max-width: 100%; border-radius: 8px;">`;
        } else if (isVideo) {
            mediaHtml = `<video controls style="max-width: 100%;"><source src="${filePath}"></video>`;
        } else if (isAudio) {
            mediaHtml = `<audio controls style="width: 100%;"><source src="${filePath}"></audio>`;
        } else {
            mediaHtml = `<a href="${filePath}" target="_blank" class="btn btn-primary"><i class="fas fa-download"></i> Download File</a>`;
        }

        return `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--light-grey); border-radius: 8px;">
                <p style="margin-bottom: 10px;"><strong>Evidence ${i + 1}</strong> - ${e.file_type}</p>
                <p style="font-size: 0.85rem; color: var(--muted-blue); margin-bottom: 10px;">
                    <i class="fas fa-calendar"></i> ${new Date(e.uploaded_at).toLocaleString()}
                </p>
                ${mediaHtml}
            </div>
        `;
    }).join('');
}

// ===== CHAT =====
function openChat(complaintId, username) {
    currentComplaintId = complaintId;
    document.getElementById('chat-complaint-id').textContent = complaintId;
    openModal('chatModal');
    loadChatMessages(complaintId);
}

async function loadChatMessages(complaintId) {
    const container = document.getElementById('chat-messages');

    try {
        const response = await fetch(`/admin-chat/${complaintId}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            renderMessages(data.messages);
        } else {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <i class="fas fa-comments"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading messages</h3>
            </div>
        `;
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chat-messages');

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fas fa-comments"></i>
                <h3>No messages yet</h3>
                <p>Start the conversation</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div class="message ${m.sender_type}">
            ${m.message}
            <div class="message-time">${new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || !currentComplaintId) return;

    const sendBtn = document.getElementById('chat-send');
    sendBtn.disabled = true;

    try {
        const response = await fetch('/admin-send-chat-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                complaintId: currentComplaintId,
                message: message
            })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            await loadChatMessages(currentComplaintId);
        } else {
            showToast(data.message || 'Error sending message', 'error');
        }
    } catch (error) {
        showToast('Error sending message', 'error');
    } finally {
        sendBtn.disabled = false;
    }
}

// ===== PROFILE =====
async function saveProfile() {
    const fullName = document.getElementById('edit-fullname').value;
    const dob = document.getElementById('edit-dob').value;

    try {
        const response = await fetch('/update-admin-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullName, dob })
        });

        const data = await response.json();

        if (data.success) {
            closeModal('editProfileModal');
            showToast('Profile updated successfully', 'success');
            await loadAdminProfile();
        } else {
            showToast(data.message || 'Error updating profile', 'error');
        }
    } catch (error) {
        showToast('Error updating profile', 'error');
    }
}

// ===== SETTINGS =====
function initSettings() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const emailToggle = document.getElementById('emailNotificationsToggle');

    // Load settings
    loadSettings();

    darkModeToggle?.addEventListener('change', function () {
        document.body.classList.toggle('dark-mode', this.checked);
        localStorage.setItem('darkMode', this.checked);
        saveSettings();
    });

    emailToggle?.addEventListener('change', saveSettings);
}

async function loadSettings() {
    // Load from localStorage first
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
    document.body.classList.toggle('dark-mode', darkMode);

    try {
        const response = await fetch('/get-admin-settings', { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.settings) {
            document.getElementById('darkModeToggle').checked = data.settings.dark_mode;
            document.getElementById('emailNotificationsToggle').checked = data.settings.email_notifications;
            document.body.classList.toggle('dark-mode', data.settings.dark_mode);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        dark_mode: document.getElementById('darkModeToggle').checked,
        email_notifications: document.getElementById('emailNotificationsToggle').checked
    };

    try {
        await fetch('/update-admin-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(settings)
        });
    } catch (error) {
        console.error('Error saving settings:', error);
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

    // Load data for cases tab
    if (tabId === 'cases') {
        refreshCases();
    }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Edit profile
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => openModal('editProfileModal'));

    // Chat send
    document.getElementById('chat-send')?.addEventListener('click', sendChatMessage);

    // Chat input enter key
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Event delegation for data-action
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const tab = target.dataset.tab;

        if (action === 'switchTab' && tab) {
            switchTab(tab);
        }
    });
}

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
        const response = await fetch('/admin-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/homepage';
        } else {
            showToast('Error logging out', 'error');
        }
    } catch (error) {
        showToast('Error logging out', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ===== ANONYMOUS REPORTS =====
async function loadAnonymousReports() {
    try {
        const response = await fetch('/admin/anonymous-reports', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            anonymousReportsData = data.reports || [];
            renderAnonymousReports();
            updateAnonymousStats();
            document.getElementById('anonymous-reports-count').textContent = `Total: ${anonymousReportsData.length} reports`;
        }
    } catch (error) {
        console.error('Error loading anonymous reports:', error);
        document.getElementById('anonymous-reports-table-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Reports</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function updateAnonymousStats() {
    const pending = anonymousReportsData.filter(r => r.status === 'pending' || r.status === 'reviewing').length;
    const investigating = anonymousReportsData.filter(r => r.status === 'investigating').length;
    const resolved = anonymousReportsData.filter(r => r.status === 'resolved').length;

    document.getElementById('anon-total').textContent = anonymousReportsData.length;
    document.getElementById('anon-pending').textContent = pending;
    document.getElementById('anon-investigating').textContent = investigating;
    document.getElementById('anon-resolved').textContent = resolved;
}

function renderAnonymousReports(filteredData = null) {
    const container = document.getElementById('anonymous-reports-table-container');
    const reports = filteredData || anonymousReportsData;

    if (reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-secret"></i>
                <h3>No Anonymous Reports</h3>
                <p>There are no anonymous reports assigned to your district</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Report ID</th>
                    <th>Crime Type</th>
                    <th>Incident Date</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(r => `
                    <tr>
                        <td><strong>${r.report_id}</strong></td>
                        <td>${formatCrimeType(r.crime_type)}</td>
                        <td>${new Date(r.incident_date).toLocaleDateString()}</td>
                        <td>${truncateText(r.location_address || 'Not specified', 30)}</td>
                        <td><span class="status ${r.status}">${formatStatus(r.status)}</span></td>
                        <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn btn-primary btn-sm" onclick="viewAnonReport('${r.report_id}')" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="openAnonStatusModal('${r.report_id}', '${r.status}')" title="Update Status">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${r.latitude && r.longitude ? `
                                    <button class="btn btn-warning btn-sm" onclick="viewAnonLocation('${r.report_id}', ${r.latitude}, ${r.longitude}, '${escapeHtml(r.location_address || '')}')" title="View on Map">
                                        <i class="fas fa-map-marker-alt"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-success btn-sm" onclick="viewAnonEvidence('${r.report_id}')" title="View Evidence">
                                    <i class="fas fa-images"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function formatCrimeType(type) {
    if (!type) return 'Unknown';
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'reviewing': 'Reviewing',
        'investigated': 'Investigated',
        'investigating': 'Investigating',
        'resolved': 'Resolved',
        'dismissed': 'Dismissed'
    };
    return statusMap[status] || status;
}

async function viewAnonReport(reportId) {
    currentAnonReportId = reportId;
    const modal = document.getElementById('anonReportModal');
    const content = document.getElementById('anon-report-content');
    
    modal.classList.add('active');
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const response = await fetch(`/admin/anonymous-reports/${reportId}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            const r = data.report;
            content.innerHTML = `
                <div class="report-details-grid">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Report Information</h4>
                        <div class="detail-row">
                            <span class="label">Report ID:</span>
                            <span class="value"><strong>${r.report_id}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value"><span class="status ${r.status}">${formatStatus(r.status)}</span></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Submitted:</span>
                            <span class="value">${new Date(r.submitted_at).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-tag"></i> Crime Details</h4>
                        <div class="detail-row">
                            <span class="label">Crime Type:</span>
                            <span class="value">${formatCrimeType(r.crime_type)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Incident Date:</span>
                            <span class="value">${new Date(r.incident_date).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Incident Time:</span>
                            <span class="value">${r.incident_time || 'Not specified'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section full-width">
                        <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
                        <p>${r.location_address || 'Not specified'}</p>
                        ${r.latitude && r.longitude ? `
                            <p class="coords"><small>Coordinates: ${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}</small></p>
                            <button class="btn btn-outline btn-sm" onclick="viewAnonLocation('${r.report_id}', ${r.latitude}, ${r.longitude}, '${escapeHtml(r.location_address || '')}')">
                                <i class="fas fa-map"></i> View on Map
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section full-width">
                        <h4><i class="fas fa-file-alt"></i> Description</h4>
                        <div class="description-box">${escapeHtml(r.description)}</div>
                    </div>
                    
                    ${r.suspect_description ? `
                        <div class="detail-section full-width">
                            <h4><i class="fas fa-user"></i> Suspect Description</h4>
                            <div class="description-box">${escapeHtml(r.suspect_description)}</div>
                        </div>
                    ` : ''}
                    
                    ${r.additional_notes ? `
                        <div class="detail-section full-width">
                            <h4><i class="fas fa-sticky-note"></i> Additional Notes</h4>
                            <div class="description-box">${escapeHtml(r.additional_notes)}</div>
                        </div>
                    ` : ''}
                    
                    ${r.admin_notes ? `
                        <div class="detail-section full-width">
                            <h4><i class="fas fa-clipboard"></i> Admin Notes</h4>
                            <div class="description-box admin-notes">${escapeHtml(r.admin_notes)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load report</div>`;
        }
    } catch (error) {
        console.error('Error loading report:', error);
        content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Error loading report</div>`;
    }
}

function openAnonStatusModal(reportId, currentStatus) {
    currentAnonReportId = reportId;
    document.getElementById('anon-modal-report-id').textContent = reportId;
    document.getElementById('anon-modal-current-status').textContent = formatStatus(currentStatus);
    document.getElementById('anon-modal-new-status').value = currentStatus;
    document.getElementById('anon-modal-notes').value = '';
    document.getElementById('anonStatusModal').classList.add('active');
}

async function updateAnonReportStatus() {
    const newStatus = document.getElementById('anon-modal-new-status').value;
    const notes = document.getElementById('anon-modal-notes').value;

    try {
        const response = await fetch(`/admin/anonymous-reports/${currentAnonReportId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus, adminNotes: notes })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Status updated successfully', 'success');
            closeModal('anonStatusModal');
            loadAnonymousReports();
        } else {
            showToast(data.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
    }
}

function viewAnonLocation(reportId, lat, lng, address) {
    document.getElementById('anon-map-report-id').textContent = reportId;
    document.getElementById('anon-map-address').textContent = address || 'Location not specified';
    document.getElementById('anonMapModal').classList.add('active');

    setTimeout(() => {
        const mapContainer = document.getElementById('anon-detail-map');
        
        if (anonDetailMap) {
            anonDetailMap.remove();
        }
        
        anonDetailMap = L.map('anon-detail-map').setView([lat, lng], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(anonDetailMap);
        
        L.marker([lat, lng])
            .addTo(anonDetailMap)
            .bindPopup(`📍 ${address || 'Incident Location'}`)
            .openPopup();
    }, 100);
}

function closeAnonMapModal() {
    document.getElementById('anonMapModal').classList.remove('active');
    if (anonDetailMap) {
        anonDetailMap.remove();
        anonDetailMap = null;
    }
}

async function viewAnonEvidence(reportId) {
    document.getElementById('anon-evidence-report-id').textContent = reportId;
    const modal = document.getElementById('anonEvidenceModal');
    const content = document.getElementById('anon-evidence-content');
    
    modal.classList.add('active');
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading evidence...</div>';

    try {
        const response = await fetch(`/admin/anonymous-reports/${reportId}/evidence`, { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.evidence && data.evidence.length > 0) {
            content.innerHTML = `
                <div class="evidence-grid">
                    ${data.evidence.map(e => `
                        <div class="evidence-item">
                            ${getEvidencePreview(e)}
                            <div class="evidence-info">
                                <p class="file-name">${escapeHtml(e.original_name)}</p>
                                <p class="file-meta">${formatFileSize(e.file_size)} • ${e.file_type}</p>
                            </div>
                            <a href="/${e.file_path}" target="_blank" class="btn btn-sm btn-outline">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Evidence</h3>
                    <p>No evidence files found for this report</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading evidence:', error);
        content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Error loading evidence</div>`;
    }
}

function getEvidencePreview(evidence) {
    const fileType = evidence.file_type || '';
    const filePath = `/${evidence.file_path}`;
    
    if (fileType === 'image') {
        return `<img src="${filePath}" alt="${escapeHtml(evidence.original_name)}" class="evidence-preview">`;
    } else if (fileType === 'video') {
        return `<video src="${filePath}" controls class="evidence-preview"></video>`;
    } else if (fileType === 'audio') {
        return `<div class="evidence-icon"><i class="fas fa-music"></i></div><audio src="${filePath}" controls></audio>`;
    } else {
        return `<div class="evidence-icon"><i class="fas fa-file"></i></div>`;
    }
}

function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function applyAnonFilters() {
    const status = document.getElementById('anon-filter-status').value;
    const type = document.getElementById('anon-filter-type').value;

    let filtered = anonymousReportsData;

    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }

    if (type) {
        filtered = filtered.filter(r => r.crime_type === type);
    }

    renderAnonymousReports(filtered);
}

function clearAnonFilters() {
    document.getElementById('anon-filter-status').value = '';
    document.getElementById('anon-filter-type').value = '';
    renderAnonymousReports();
}
