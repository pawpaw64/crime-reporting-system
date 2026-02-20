// Super Admin Dashboard JavaScript

// Global variables
let currentAdminId = null;
let allAdminsData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeTabs();
    loadDashboardData();
    setupEventListeners();
});

// Check if user is authenticated as super admin
async function checkAuth() {
    try {
        const response = await fetch('/super-admin-check-auth', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = 'super-admin-login.html';
            return;
        }

        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = 'super-admin-login.html';
        } else {
            // Set super admin name
            document.getElementById('super-admin-name').textContent = data.username || 'Super Admin';
            document.getElementById('welcome-name').textContent = data.username || 'Super Administrator';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'super-admin-login.html';
    }
}

// Initialize tabs
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// Switch tabs
function switchTab(tabName) {
    // Remove active class from all buttons and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'pending-requests':
            loadPendingRequests();
            break;
        case 'all-admins':
            loadAllAdmins();
            break;
        case 'alerts':
            loadAlerts();
            break;
        case 'audit-logs':
            loadAuditLogs();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Refresh buttons
    document.getElementById('refresh-pending-btn')?.addEventListener('click', loadPendingRequests);
    document.getElementById('refresh-admins-btn')?.addEventListener('click', loadAllAdmins);
    document.getElementById('refresh-logs-btn')?.addEventListener('click', loadAuditLogs);
    document.getElementById('view-all-logs-btn')?.addEventListener('click', () => switchTab('audit-logs'));
    
    // Alert-related buttons
    document.getElementById('refresh-alerts-btn')?.addEventListener('click', loadAlerts);
    document.getElementById('generate-alerts-btn')?.addEventListener('click', generateAlerts);
    
    // Filter inputs
    document.getElementById('filter-status')?.addEventListener('change', filterAdmins);
    document.getElementById('filter-district')?.addEventListener('change', filterAdmins);
    document.getElementById('search-admin')?.addEventListener('input', filterAdmins);
    
    // Alert filter inputs
    document.getElementById('filter-alert-admin')?.addEventListener('change', filterAndDisplayAlerts);
    document.getElementById('filter-alert-priority')?.addEventListener('change', filterAndDisplayAlerts);
    document.getElementById('filter-alert-resolved')?.addEventListener('change', filterAndDisplayAlerts);

    
    // Audit log filters
    document.getElementById('filter-audit-admin')?.addEventListener('change', loadAuditLogs);
    document.getElementById('filter-date-from')?.addEventListener('change', loadAuditLogs);
    document.getElementById('filter-date-to')?.addEventListener('change', loadAuditLogs);
    
    // Settings
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
    document.getElementById('change-password-btn')?.addEventListener('click', () => {
        alert('Password change feature coming soon!');
    });
    
    // Modal confirm buttons
    document.getElementById('confirm-approve-btn')?.addEventListener('click', confirmApprove);
    document.getElementById('confirm-reject-btn')?.addEventListener('click', confirmReject);
    
    // Modal close buttons (using event delegation for data-modal)
    document.addEventListener('click', function(e) {
        // Close modal buttons
        if (e.target.closest('[data-modal]')) {
            const modalId = e.target.closest('[data-modal]').dataset.modal;
            closeModal(modalId);
            return;
        }
        
        // Action buttons (view, approve, reject, suspend, reactivate)
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const adminId = parseInt(target.dataset.adminId);
        const username = target.dataset.username;
        const district = target.dataset.district;
        
        console.log('Button clicked:', { action, adminId, username, district });
        
        switch(action) {
            case 'view':
                viewAdminDetails(adminId);
                break;
            case 'approve':
                approveRequest(adminId, username, district);
                break;
            case 'reject':
                rejectRequest(adminId, username);
                break;
            case 'suspend':
                suspendAdmin(adminId, username);
                break;
            case 'reactivate':
                reactivateAdmin(adminId, username);
                break;
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/super-admin-stats', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load dashboard data');

        const data = await response.json();

        // Update stats
        document.getElementById('stat-pending').textContent = data.pendingRequests || 0;
        document.getElementById('stat-approved').textContent = data.approvedAdmins || 0;
        document.getElementById('stat-active').textContent = data.activeAdmins || 0;
        document.getElementById('stat-suspended').textContent = data.suspendedAdmins || 0;

        // Update pending badge
        const badge = document.getElementById('pending-count-badge');
        if (data.pendingRequests > 0) {
            badge.textContent = data.pendingRequests;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        // Load recent activity
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/super-admin-audit-logs?limit=5', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load recent activity');

        const data = await response.json();
        const container = document.getElementById('recent-activity');

        if (data.logs && data.logs.length > 0) {
            container.innerHTML = data.logs.map(log => `
                <div class="audit-log-item">
                    <div class="timestamp">${formatDate(log.timestamp)}</div>
                    <div class="action">${log.admin_username} - ${log.action}</div>
                    <div class="details">${log.details || 'N/A'} • IP: ${log.ip_address || 'N/A'}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
        }

    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recent-activity').innerHTML = '<p style="color: red;">Failed to load recent activity</p>';
    }
}

// Load pending requests
async function loadPendingRequests() {
    try {
        const response = await fetch('/super-admin-pending-requests', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load pending requests');

        const data = await response.json();
        const container = document.getElementById('pending-table');

        if (data.requests && data.requests.length > 0) {
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>District</th>
                            <th>Designation</th>
                            <th>Requested Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.requests.map(req => `
                            <tr>
                                <td>${req.username}</td>
                                <td>${req.full_name}</td>
                                <td>${req.email}</td>
                                <td>${req.district_name}</td>
                                <td>${req.designation}</td>
                                <td>${formatDate(req.request_date)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="action-btn-small btn-view" data-action="view" data-admin-id="${req.admin_id}">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button class="action-btn-small btn-approve" data-action="approve" data-admin-id="${req.admin_id}" data-username="${req.username}" data-district="${req.district_name}">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="action-btn-small btn-reject" data-action="reject" data-admin-id="${req.admin_id}" data-username="${req.username}">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No pending requests</p></div>';
        }

    } catch (error) {
        console.error('Error loading pending requests:', error);
        document.getElementById('pending-table').innerHTML = '<p style="color: red;">Failed to load pending requests</p>';
    }
}

// Load all admins
async function loadAllAdmins() {
    try {
        const response = await fetch('/super-admin-all-admins', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load admins');

        const data = await response.json();
        allAdminsData = data.admins || [];
        
        // Populate filter dropdown
        const filterSelect = document.getElementById('filter-audit-admin');
        filterSelect.innerHTML = '<option value="">All Admins</option>' + 
            allAdminsData.map(admin => `<option value="${admin.username}">${admin.username} - ${admin.district_name}</option>`).join('');

        displayAdmins(allAdminsData);

    } catch (error) {
        console.error('Error loading admins:', error);
        document.getElementById('admins-table').innerHTML = '<p style="color: red;">Failed to load admins</p>';
    }
}

// Display admins in table
function displayAdmins(admins) {
    const container = document.getElementById('admins-table');

    if (admins && admins.length > 0) {
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>District</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${admins.map(admin => {
                        const alertData = alertSummaryData[admin.username] || { total: 0, critical: 0, high: 0 };
                        const hasAlerts = alertData.total > 0;
                        
                        return `
                        <tr>
                            <td>${admin.username}</td>
                            <td>${admin.full_name}</td>
                            <td>${admin.email}</td>
                            <td>${admin.district_name}</td>
                            <td><span class="status-badge status-${admin.approval_status}">${admin.approval_status}</span></td>
                            <td>${admin.last_login ? formatDate(admin.last_login) : 'Never'}</td>
                            <td>
                                <div class="action-buttons">
                                    ${hasAlerts ? `
                                        <button class="action-btn-small" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; position: relative;" 
                                                onclick="viewAdminAlerts('${admin.username}')" title="View alerts for this admin">
                                            <i class="fas fa-bell"></i>
                                            <span class="alert-badge-count">${alertData.total}</span>
                                            ${alertData.critical > 0 ? `<span class="critical-pulse"></span>` : ''}
                                        </button>
                                    ` : ''}
                                    <button class="action-btn-small btn-view" data-action="view" data-admin-id="${admin.admin_id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    ${admin.approval_status === 'suspended' ? 
                                        `<button class="action-btn-small btn-reactivate" data-action="reactivate" data-admin-id="${admin.admin_id}" data-username="${admin.username}">
                                            <i class="fas fa-undo"></i> Reactivate
                                        </button>` :
                                        admin.approval_status === 'active' ?
                                        `<button class="action-btn-small btn-suspend" data-action="suspend" data-admin-id="${admin.admin_id}" data-username="${admin.username}">
                                            <i class="fas fa-ban"></i> Suspend
                                        </button>` : ''
                                    }
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No admins found</p></div>';
    }
}

// Filter admins
function filterAdmins() {
    const statusFilter = document.getElementById('filter-status').value.toLowerCase();
    const districtFilter = document.getElementById('filter-district').value;
    const searchTerm = document.getElementById('search-admin').value.toLowerCase();

    const filtered = allAdminsData.filter(admin => {
        const matchStatus = !statusFilter || admin.approval_status === statusFilter;
        const matchDistrict = !districtFilter || admin.district_name === districtFilter;
        const matchSearch = !searchTerm || 
            admin.username.toLowerCase().includes(searchTerm) ||
            admin.full_name.toLowerCase().includes(searchTerm);

        return matchStatus && matchDistrict && matchSearch;
    });

    displayAdmins(filtered);
}

// View admin details
async function viewAdminDetails(adminId) {
    console.log('View details clicked:', adminId);
    try {
        const response = await fetch(`/super-admin-admin-details/${adminId}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load admin details');

        const data = await response.json();
        const admin = data.admin;

        document.getElementById('modal-details-content').innerHTML = `
            <div class="detail-group">
                <label>Username</label>
                <p>${admin.username}</p>
            </div>
            <div class="detail-group">
                <label>Full Name</label>
                <p>${admin.full_name}</p>
            </div>
            <div class="detail-group">
                <label>Email</label>
                <p>${admin.email}</p>
            </div>
            <div class="detail-group">
                <label>Phone</label>
                <p>${admin.phone}</p>
            </div>
            <div class="detail-group">
                <label>Designation</label>
                <p>${admin.designation}</p>
            </div>
            <div class="detail-group">
                <label>Official ID</label>
                <p>${admin.official_id}</p>
            </div>
            <div class="detail-group">
                <label>District</label>
                <p>${admin.district_name}</p>
            </div>
            <div class="detail-group">
                <label>Status</label>
                <p><span class="status-badge status-${admin.approval_status}">${admin.approval_status}</span></p>
            </div>
            <div class="detail-group">
                <label>Request Date</label>
                <p>${formatDate(admin.request_date)}</p>
            </div>
            ${admin.approved_at ? `
                <div class="detail-group">
                    <label>Approved Date</label>
                    <p>${formatDate(admin.approved_at)}</p>
                </div>
                <div class="detail-group">
                    <label>Approved By</label>
                    <p>${admin.approved_by_username || 'N/A'}</p>
                </div>
            ` : ''}
            ${admin.last_login ? `
                <div class="detail-group">
                    <label>Last Login</label>
                    <p>${formatDate(admin.last_login)}</p>
                </div>
            ` : ''}
        `;

        openModal('details-modal');

    } catch (error) {
        console.error('Error loading admin details:', error);
        alert('Failed to load admin details');
    }
}

// Approve request
function approveRequest(adminId, username, district) {
    console.log('Approve clicked:', { adminId, username, district });
    currentAdminId = adminId;
    document.getElementById('approve-username').textContent = username;
    document.getElementById('approve-district').textContent = district;
    openModal('approve-modal');
}

// Confirm approve
async function confirmApprove() {
    console.log('Confirming approve for admin ID:', currentAdminId);
    try {
        const response = await fetch('/super-admin-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ adminId: currentAdminId })
        });

        const data = await response.json();
        console.log('Approve response:', data);

        if (data.success) {
            alert('Admin request approved successfully! Notification email sent.');
            closeModal('approve-modal');
            loadPendingRequests();
            loadDashboardData();
        } else {
            alert('Failed to approve request: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error approving request:', error);
        alert('Network error. Please try again.');
    }
}

// Reject request
function rejectRequest(adminId, username) {
    console.log('Reject clicked:', { adminId, username });
    currentAdminId = adminId;
    document.getElementById('reject-username').textContent = username;
    document.getElementById('rejection-reason').value = '';
    openModal('reject-modal');
}

// Confirm reject
async function confirmReject() {
    const reason = document.getElementById('rejection-reason').value.trim();

    if (!reason) {
        alert('Please provide a rejection reason');
        return;
    }

    try {
        const response = await fetch('/super-admin-reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                adminId: currentAdminId,
                rejectionReason: reason 
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Admin request rejected. Notification email sent.');
            closeModal('reject-modal');
            loadPendingRequests();
            loadDashboardData();
        } else {
            alert('Failed to reject request: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Network error. Please try again.');
    }
}

// Suspend admin
async function suspendAdmin(adminId, username) {
    if (!confirm(`Are you sure you want to suspend ${username}?`)) return;

    try {
        const response = await fetch('/super-admin-suspend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ adminId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Admin suspended successfully');
            loadAllAdmins();
            loadDashboardData();
        } else {
            alert('Failed to suspend admin: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error suspending admin:', error);
        alert('Network error. Please try again.');
    }
}

// Reactivate admin
async function reactivateAdmin(adminId, username) {
    if (!confirm(`Are you sure you want to reactivate ${username}?`)) return;

    try {
        const response = await fetch('/super-admin-reactivate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ adminId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Admin reactivated successfully');
            loadAllAdmins();
            loadDashboardData();
        } else {
            alert('Failed to reactivate admin: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error reactivating admin:', error);
        alert('Network error. Please try again.');
    }
}

// Load audit logs
async function loadAuditLogs() {
    const adminFilter = document.getElementById('filter-audit-admin').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let url = '/super-admin-audit-logs?';
    if (adminFilter) url += `username=${adminFilter}&`;
    if (dateFrom) url += `dateFrom=${dateFrom}&`;
    if (dateTo) url += `dateTo=${dateTo}&`;

    try {
        const response = await fetch(url, { credentials: 'include' });

        if (!response.ok) throw new Error('Failed to load audit logs');

        const data = await response.json();
        const container = document.getElementById('audit-logs-container');

        if (data.logs && data.logs.length > 0) {
            container.innerHTML = data.logs.map(log => `
                <div class="audit-log-item">
                    <div class="timestamp">${formatDate(log.timestamp)}</div>
                    <div class="action"><strong>${log.admin_username}</strong> - ${log.action}</div>
                    <div class="details">
                        ${log.details || 'N/A'}<br>
                        <small>IP: ${log.ip_address || 'N/A'} • User Agent: ${log.user_agent || 'N/A'}</small>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No audit logs found</p></div>';
        }

    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('audit-logs-container').innerHTML = '<p style="color: red;">Failed to load audit logs</p>';
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/super-admin-stats', { credentials: 'include' });

        if (!response.ok) throw new Error('Failed to load statistics');

        const data = await response.json();

        // Update stats
        document.getElementById('total-admins').textContent = (data.approvedAdmins + data.activeAdmins + data.suspendedAdmins) || 0;
        document.getElementById('avg-approval-time').textContent = data.avgApprovalTime || '0';
        document.getElementById('total-actions').textContent = data.totalActions || '0';

        // Display district distribution
        if (data.districtStats) {
            const container = document.getElementById('district-stats');
            container.innerHTML = `
                <table style="width: 100%; margin-top: 20px;">
                    <thead>
                        <tr>
                            <th>District</th>
                            <th>Active Admins</th>
                            <th>Suspended Admins</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.districtStats.map(stat => `
                            <tr>
                                <td>${stat.district}</td>
                                <td>${stat.active}</td>
                                <td>${stat.suspended}</td>
                                <td><strong>${stat.total}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Logout function
async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
        const response = await fetch('/super-admin-logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = 'super-admin-login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'super-admin-login.html';
    }
}

// Utility function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/super-admin-settings', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.settings) {
                document.getElementById('notify-new-registration').checked = data.settings.notifyNewRegistration !== false;
                document.getElementById('notify-email').checked = data.settings.notifyEmail !== false;
                document.getElementById('notify-browser').checked = data.settings.notifyBrowser === true;
                document.getElementById('auto-logout').checked = data.settings.autoLogout !== false;
            }
        }

        // Set system admin ID
        if (req.session && req.session.superAdminUsername) {
            document.getElementById('system-admin-id').textContent = req.session.superAdminUsername;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Use defaults if error
        document.getElementById('notify-new-registration').checked = true;
        document.getElementById('notify-email').checked = true;
        document.getElementById('notify-browser').checked = false;
        document.getElementById('auto-logout').checked = true;
    }

    // Request browser notification permission if enabled
    if (document.getElementById('notify-browser').checked && 'Notification' in window) {
        Notification.requestPermission();
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            notifyNewRegistration: document.getElementById('notify-new-registration').checked,
            notifyEmail: document.getElementById('notify-email').checked,
            notifyBrowser: document.getElementById('notify-browser').checked,
            autoLogout: document.getElementById('auto-logout').checked
        };

        const response = await fetch('/super-admin-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (data.success) {
            alert('Settings saved successfully!');

            // Request browser notification permission if enabled
            if (settings.notifyBrowser && 'Notification' in window) {
                if (Notification.permission !== 'granted') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification('SecureVoice Notifications Enabled', {
                                body: 'You will now receive browser notifications for new admin requests.',
                                icon: '../../images/auth/secureVOICE.png'
                            });
                        }
                    });
                }
            }
        } else {
            alert('Failed to save settings: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Network error. Please try again.');
    }
}

// Check for new pending requests periodically (if notifications enabled)
let notificationCheckInterval;
function startNotificationCheck() {
    // Check every 2 minutes
    notificationCheckInterval = setInterval(async () => {
        try {
            const notifyEnabled = document.getElementById('notify-browser')?.checked;
            if (!notifyEnabled) return;

            const response = await fetch('/super-admin-stats', { credentials: 'include' });
            if (!response.ok) return;

            const data = await response.json();
            const pendingCount = data.pendingRequests || 0;
            const previousCount = parseInt(localStorage.getItem('previousPendingCount') || '0');

            if (pendingCount > previousCount) {
                // New pending requests
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('New Admin Registration Request', {
                        body: `You have ${pendingCount} pending admin registration request(s).`,
                        icon: '../../images/auth/secureVOICE.png',
                        tag: 'admin-request'
                    });
                }
            }

            localStorage.setItem('previousPendingCount', pendingCount.toString());
        } catch (error) {
            console.error('Error checking for notifications:', error);
        }
    }, 120000); // 2 minutes
}

// Start notification check on page load
if ('Notification' in window) {
    startNotificationCheck();
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ========== ADMIN ALERT SYSTEM ==========

let allAlertsData = [];
let alertSummaryData = {};

// Load all alerts
async function loadAlerts() {
    try {
        // Load alert summary for All Admins view
        await loadAlertSummary();
        
        // Load detailed alerts for Alerts tab
        const includeResolved = document.getElementById('filter-alert-resolved')?.value === 'true';
        const response = await fetch(`/super-admin-alerts?includeResolved=${includeResolved}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load alerts');

        const data = await response.json();
        allAlertsData = data.alerts || [];
        
        // Load alert statistics
        await loadAlertStatistics();
        
        // Populate admin filter dropdown
        const filterSelect = document.getElementById('filter-alert-admin');
        if (filterSelect) {
            const uniqueAdmins = [...new Set(allAlertsData.map(a => a.admin_username))];
            filterSelect.innerHTML = '<option value="">All Admins</option>' + 
                uniqueAdmins.map(admin => `<option value="${admin}">${admin}</option>`).join('');
        }

        displayAlerts(allAlertsData);
        
        // Update badge count
        updateAlertBadgeCount();

    } catch (error) {
        console.error('Error loading alerts:', error);
        const alertsTable = document.getElementById('alerts-table');
        if (alertsTable) {
            alertsTable.innerHTML = '<p style="color: red; padding: 20px;">Failed to load alerts</p>';
        }
    }
}

// Load alert summary (counts per admin)
async function loadAlertSummary() {
    try {
        const response = await fetch('/super-admin-alert-summary', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load alert summary');

        const data = await response.json();
        const summary = data.summary || [];
        
        // Convert array to object keyed by admin_username
        alertSummaryData = {};
        summary.forEach(item => {
            alertSummaryData[item.admin_username] = {
                total: item.total_alerts,
                critical: item.critical_alerts,
                high: item.high_alerts
            };
        });
        
        // Refresh All Admins view if it's displayed
        if (allAdminsData.length > 0) {
            displayAdmins(allAdminsData);
        }

    } catch (error) {
        console.error('Error loading alert summary:', error);
    }
}

// Load alert statistics
async function loadAlertStatistics() {
    try {
        const response = await fetch('/super-admin-alert-statistics', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load alert statistics');

        const data = await response.json();
        const stats = data.statistics;
        
        // Update statistics display
        document.getElementById('stat-critical-alerts').textContent = stats.active_critical || 0;
        document.getElementById('stat-high-alerts').textContent = stats.active_high || 0;
        document.getElementById('stat-total-active-alerts').textContent = stats.active_alerts || 0;
        document.getElementById('stat-resolved-alerts').textContent = stats.resolved_alerts || 0;

    } catch (error) {
        console.error('Error loading alert statistics:', error);
    }
}

// Display alerts in table
function displayAlerts(alerts) {
    const container = document.getElementById('alerts-table');

    if (alerts && alerts.length > 0) {
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Admin</th>
                        <th>District</th>
                        <th>Complaint ID</th>
                        <th>Complaint Type</th>
                        <th>Location</th>
                        <th>Time Elapsed</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${alerts.map(alert => {
                        const priorityClass = alert.priority_level === 'critical' ? 'status-rejected' : 'status-suspended';
                        const statusClass = alert.is_resolved ? 'status-approved' : 'status-pending';
                        const timeElapsed = Math.floor(alert.time_elapsed);
                        const thresholdMinutes = alert.threshold_minutes;
                        const overdueBy = timeElapsed - thresholdMinutes;
                        
                        return `
                        <tr class="${alert.is_acknowledged ? 'acknowledged-alert' : ''}">
                            <td>
                                <span class="status-badge ${priorityClass}">
                                    <i class="fas fa-exclamation-${alert.priority_level === 'critical' ? 'triangle' : 'circle'}"></i>
                                    ${alert.priority_level.toUpperCase()}
                                </span>
                            </td>
                            <td>${alert.admin_name || alert.admin_username}</td>
                            <td>${alert.district_name || 'N/A'}</td>
                            <td>#${alert.complaint_id}</td>
                            <td>${alert.complaint_type || 'N/A'}</td>
                            <td>${alert.location_address ? alert.location_address.substring(0, 30) + '...' : 'N/A'}</td>
                            <td>
                                <strong>${timeElapsed} min</strong><br>
                                <small style="color: #dc3545;">Overdue by ${overdueBy} min</small>
                            </td>
                            <td>
                                <span class="status-badge ${statusClass}">
                                    ${alert.is_resolved ? 'Resolved' : 'Active'}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn-small btn-view" onclick="viewAlertDetails(${alert.alert_id})">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    ${!alert.is_acknowledged && !alert.is_resolved ? `
                                        <button class="action-btn-small btn-approve" onclick="acknowledgeAlert(${alert.alert_id})">
                                            <i class="fas fa-check"></i> Ack
                                        </button>
                                    ` : ''}
                                    ${!alert.is_resolved ? `
                                        <button class="action-btn-small btn-reactivate" onclick="resolveAlert(${alert.alert_id})">
                                            <i class="fas fa-check-circle"></i> Resolve
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else {
        container.innerHTML = `
            <div class="empty-state" style="padding: 50px; text-align: center;">
                <i class="fas fa-bell-slash" style="font-size: 64px; color: #ccc; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; color: #666;">No active alerts found</p>
                <p style="color: #999;">All admins are responding to complaints within the required timeframe.</p>
            </div>
        `;
    }
}

// Filter and display alerts
function filterAndDisplayAlerts() {
    const adminFilter = document.getElementById('filter-alert-admin')?.value;
    const priorityFilter = document.getElementById('filter-alert-priority')?.value;

    const filtered = allAlertsData.filter(alert => {
        const matchAdmin = !adminFilter || alert.admin_username === adminFilter;
        const matchPriority = !priorityFilter || alert.priority_level === priorityFilter;
        return matchAdmin && matchPriority;
    });

    displayAlerts(filtered);
}

// View alert details
async function viewAlertDetails(alertId) {
    try {
        const response = await fetch(`/super-admin-alert-details/${alertId}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load alert details');

        const data = await response.json();
        const alert = data.alert;

        const modalBody = document.getElementById('details-modal-body');
        modalBody.innerHTML = `
            <div class="detail-group">
                <label>Alert ID</label>
                <p>#${alert.alert_id}</p>
            </div>
            <div class="detail-group">
                <label>Priority Level</label>
                <p><span class="status-badge status-${alert.priority_level === 'critical' ? 'rejected' : 'suspended'}">
                    ${alert.priority_level.toUpperCase()}
                </span></p>
            </div>
            <div class="detail-group">
                <label>Admin Name</label>
                <p>${alert.admin_name} (${alert.admin_username})</p>
            </div>
            <div class="detail-group">
                <label>District</label>
                <p>${alert.district_name}</p>
            </div>
            <div class="detail-group">
                <label>Complaint ID</label>
                <p>#${alert.complaint_id}</p>
            </div>
            <div class="detail-group">
                <label>Complaint Type</label>
                <p>${alert.complaint_type || 'N/A'}</p>
            </div>
            <div class="detail-group">
                <label>Complaint Description</label>
                <p>${alert.complaint_description || 'N/A'}</p>
            </div>
            <div class="detail-group">
                <label>Location</label>
                <p>${alert.location_address || 'N/A'}</p>
            </div>
            <div class="detail-group">
                <label>Complainant</label>
                <p>${alert.complainant_name || 'Anonymous'} ${alert.complainant_username ? `(${alert.complainant_username})` : ''}</p>
            </div>
            <div class="detail-group">
                <label>Complaint Created</label>
                <p>${formatDate(alert.complaint_created_at)}</p>
            </div>
            <div class="detail-group">
                <label>Time Elapsed</label>
                <p>${Math.floor(alert.time_elapsed)} minutes (Threshold: ${alert.threshold_minutes} minutes)</p>
            </div>
            <div class="detail-group">
                <label>Alert Created</label>
                <p>${formatDate(alert.alert_created_at)}</p>
            </div>
            <div class="detail-group">
                <label>Status</label>
                <p><span class="status-badge status-${alert.is_resolved ? 'approved' : 'pending'}">
                    ${alert.is_resolved ? 'Resolved' : 'Active'}
                </span></p>
            </div>
            ${alert.is_acknowledged ? `
                <div class="detail-group">
                    <label>Acknowledged</label>
                    <p>${formatDate(alert.acknowledged_at)}</p>
                </div>
            ` : ''}
            ${alert.is_resolved ? `
                <div class="detail-group">
                    <label>Resolved</label>
                    <p>${formatDate(alert.resolved_at)}</p>
                </div>
            ` : ''}
        `;

        openModal('details-modal');

    } catch (error) {
        console.error('Error loading alert details:', error);
        alert('Failed to load alert details');
    }
}

// Acknowledge alert
async function acknowledgeAlert(alertId) {
    if (!confirm('Mark this alert as acknowledged?')) return;
    
    try {
        const response = await fetch('/super-admin-acknowledge-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ alertId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Alert acknowledged successfully');
            loadAlerts();
        } else {
            alert('Failed to acknowledge alert: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error acknowledging alert:', error);
        alert('Network error. Please try again.');
    }
}

// Resolve alert
async function resolveAlert(alertId) {
    if (!confirm('Mark this alert as resolved?')) return;
    
    try {
        const response = await fetch('/super-admin-resolve-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ alertId })
        });

        const data = await response.json();

        if (data.success) {
            alert('Alert resolved successfully');
            loadAlerts();
        } else {
            alert('Failed to resolve alert: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error resolving alert:', error);
        alert('Network error. Please try again.');
    }
}

// Generate alerts manually
async function generateAlerts() {
    const button = document.getElementById('generate-alerts-btn');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
        const response = await fetch('/super-admin-generate-alerts', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            alert('Alerts generated successfully');
            loadAlerts();
        } else {
            alert('Failed to generate alerts: ' + (data.message || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error generating alerts:', error);
        alert('Network error. Please try again.');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-bolt"></i> Generate Alerts Now';
    }
}

// Update alert badge count in navigation
function updateAlertBadgeCount() {
    const badge = document.getElementById('alerts-count-badge');
    const activeAlerts = allAlertsData.filter(a => !a.is_resolved).length;
    
    if (badge) {
        if (activeAlerts > 0) {
            badge.textContent = activeAlerts;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// View alerts for specific admin (from All Admins view)
function viewAdminAlerts(adminUsername) {
    // Switch to alerts tab
    switchTab('alerts');
    
    // Set filter to show only this admin's alerts
    setTimeout(() => {
        const filterSelect = document.getElementById('filter-alert-admin');
        if (filterSelect) {
            filterSelect.value = adminUsername;
            filterAndDisplayAlerts();
        }
    }, 100);
}
