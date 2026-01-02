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
        case 'audit-logs':
            loadAuditLogs();
            break;
        case 'statistics':
            loadStatistics();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', logout);
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
                                        <button class="action-btn-small btn-view" onclick="viewAdminDetails(${req.admin_id})">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button class="action-btn-small btn-approve" onclick="approveRequest(${req.admin_id}, '${req.username}', '${req.district_name}')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="action-btn-small btn-reject" onclick="rejectRequest(${req.admin_id}, '${req.username}')">
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
                    ${admins.map(admin => `
                        <tr>
                            <td>${admin.username}</td>
                            <td>${admin.full_name}</td>
                            <td>${admin.email}</td>
                            <td>${admin.district_name}</td>
                            <td><span class="status-badge status-${admin.approval_status}">${admin.approval_status}</span></td>
                            <td>${admin.last_login ? formatDate(admin.last_login) : 'Never'}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn-small btn-view" onclick="viewAdminDetails(${admin.admin_id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    ${admin.approval_status === 'suspended' ? 
                                        `<button class="action-btn-small btn-reactivate" onclick="reactivateAdmin(${admin.admin_id}, '${admin.username}')">
                                            <i class="fas fa-undo"></i> Reactivate
                                        </button>` :
                                        admin.approval_status === 'active' ?
                                        `<button class="action-btn-small btn-suspend" onclick="suspendAdmin(${admin.admin_id}, '${admin.username}')">
                                            <i class="fas fa-ban"></i> Suspend
                                        </button>` : ''
                                    }
                                </div>
                            </td>
                        </tr>
                    `).join('')}
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
    currentAdminId = adminId;
    document.getElementById('approve-username').textContent = username;
    document.getElementById('approve-district').textContent = district;
    openModal('approve-modal');
}

// Confirm approve
async function confirmApprove() {
    try {
        const response = await fetch('/super-admin-approve-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ adminId: currentAdminId })
        });

        const data = await response.json();

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
        const response = await fetch('/super-admin-reject-request', {
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
        const response = await fetch('/super-admin-suspend-admin', {
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
        const response = await fetch('/super-admin-reactivate-admin', {
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

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
