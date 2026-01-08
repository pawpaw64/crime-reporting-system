// SecureVoice Admin Dashboard JavaScript
// Handles all admin dashboard functionality

// Global state
let adminData = null;
let complaintsData = [];
let usersData = [];
let currentComplaintId = null;

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
        loadDashboardStats()
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
