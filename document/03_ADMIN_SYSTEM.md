# Admin System
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Admin Registration & Approval Workflow](#admin-registration--approval-workflow)
3. [Admin Authentication](#admin-authentication)
4. [Admin Dashboard](#admin-dashboard)
5. [Case Management](#case-management)
6. [Chat System](#chat-system)
7. [Audit Logging](#audit-logging)
8. [API Endpoints](#api-endpoints)

---

## Overview

The Admin System provides district-based crime case management with:
- Admin registration requiring Super Admin approval
- Email verification and password setup workflow
- District-specific case assignment
- Complaint status management
- Evidence viewing and chat functionality
- Complete audit trail logging

---

## Admin Registration & Approval Workflow

### Flow Diagram

```
Admin Submits Registration
        ↓
Email Verification Link Sent
        ↓
Admin Verifies Email
        ↓
Request Added to Pending Queue
        ↓
Super Admin Reviews Request
        ↓
    ┌───────────────┬───────────────┐
    ↓               ↓               ↓
 APPROVE         REJECT          IGNORE
    ↓               ↓
Password Setup   Rejection Email
Link Sent        Sent
    ↓
Admin Sets Password
    ↓
Account Active - Can Login
```

### Backend Implementation

#### File: `backend/src/controllers/auth/adminAuth.js`

##### Admin Registration

```javascript
const pool = require('../../db');
const crypto = require('crypto');
const { sendEmail } = require('../../utils/emailUtils');
const { hashPassword } = require('../../utils/passwordUtils');

exports.adminRegister = async (req, res) => {
    try {
        const { 
            username, email, fullName, phone, 
            designation, officialId, district 
        } = req.body;

        // VALIDATION: Check required fields
        if (!username || !email || !fullName || !district) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing'
            });
        }

        // CHECK DUPLICATES
        const [existing] = await pool.query(
            'SELECT adminid FROM admins WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already registered'
            });
        }

        // GENERATE EMAIL VERIFICATION TOKEN
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // INSERT ADMIN (without password - set during approval)
        const [result] = await pool.query(
            `INSERT INTO admins (
                username, email, fullName, phone, 
                designation, official_id, district_name, 
                is_active, password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, '')`,
            [username, email, fullName, phone, designation, officialId, district]
        );

        // CREATE VERIFICATION TOKEN
        await pool.query(
            `INSERT INTO admin_verification_tokens 
            (admin_username, token, token_type, expires_at) 
            VALUES (?, ?, 'email_verification', ?)`,
            [username, verificationToken, tokenExpiry]
        );

        // CREATE APPROVAL WORKFLOW ENTRY
        await pool.query(
            `INSERT INTO admin_approval_workflow 
            (admin_username, status, request_date) 
            VALUES (?, 'pending', NOW())`,
            [username]
        );

        // SEND VERIFICATION EMAIL
        const verifyUrl = `${process.env.BASE_URL}/verify-admin-email?token=${verificationToken}`;
        await sendEmail(email, 'Verify Your Admin Registration', `
            <h2>Email Verification Required</h2>
            <p>Hello ${fullName},</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="${verifyUrl}">Verify Email</a>
            <p>This link expires in 24 hours.</p>
            <p>After verification, your request will be reviewed by a Super Admin.</p>
        `);

        // NOTIFY SUPER ADMIN about new request
        const [superAdmins] = await pool.query(
            'SELECT email FROM super_admins WHERE is_active = 1'
        );
        for (const sa of superAdmins) {
            try {
                await sendEmail(sa.email, 'New Admin Registration Request', `
                    <h2>New Admin Registration</h2>
                    <p>A new admin registration request has been submitted:</p>
                    <ul>
                        <li><strong>Name:</strong> ${fullName}</li>
                        <li><strong>Email:</strong> ${email}</li>
                        <li><strong>District:</strong> ${district}</li>
                    </ul>
                    <p>Please review this request in the Super Admin dashboard.</p>
                `);
            } catch (e) {
                console.error('Failed to notify super admin:', e);
            }
        }

        res.json({
            success: true,
            message: 'Registration submitted. Please check your email to verify.'
        });

    } catch (err) {
        console.error('Admin registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};
```

**Key Logic:**
1. Validates required fields including district assignment
2. Generates a random verification token using `crypto.randomBytes()`
3. Creates admin record with `is_active = 0` and empty password
4. Creates workflow entry with `status = 'pending'`
5. Sends verification email to admin
6. Notifies all active super admins about new request

---

## Admin Authentication

#### Admin Login

```javascript
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // QUERY ADMIN with workflow status
        const [results] = await pool.query(
            `SELECT a.*, aw.status as approval_status 
             FROM admins a
             JOIN admin_approval_workflow aw ON a.username = aw.admin_username
             WHERE a.username = ?`,
            [username]
        );

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const admin = results[0];

        // CHECK APPROVAL STATUS
        if (admin.approval_status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Account not yet approved',
                status: admin.approval_status
            });
        }

        // CHECK ACTIVE STATUS
        if (!admin.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is suspended'
            });
        }

        // VERIFY PASSWORD
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, admin.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // UPDATE LAST LOGIN
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE adminid = ?',
            [admin.adminid]
        );

        // SET ADMIN SESSION
        req.session.adminId = admin.adminid;
        req.session.adminUsername = admin.username;
        req.session.adminDistrict = admin.district_name;
        req.session.isAdmin = true;

        // LOG ACTION for audit trail
        const { logAdminAction } = require('../../utils/auditUtils');
        await logAdminAction(admin.username, 'login', {
            result: 'success',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: 'Login successful',
            redirect: '/admin-dashboard'
        });

    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
```

**Security Checks:**
1. Validates admin exists
2. Checks approval workflow status is 'approved'
3. Checks `is_active` flag (for suspension)
4. Verifies password with bcrypt
5. Logs successful login for audit

---

## Admin Dashboard

### File: `backend/src/controllers/adminController.js`

#### Serve Dashboard

```javascript
const path = require('path');
const { logAdminAction } = require('../utils/auditUtils');

exports.getAdminDashboard = async (req, res) => {
    try {
        // CHECK SESSION
        if (!req.session.adminId) {
            return res.redirect('/adminLogin');
        }

        const adminUsername = req.session.adminUsername;

        // VERIFY ADMIN is still active
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE adminid = ? AND is_active = 1',
            [req.session.adminId]
        );

        if (adminResults.length === 0) {
            req.session.destroy();
            return res.redirect('/adminLogin');
        }

        const admin = adminResults[0];

        // CHECK WORKFLOW STATUS
        const [workflowResults] = await pool.query(
            'SELECT status FROM admin_approval_workflow WHERE admin_username = ?',
            [adminUsername]
        );

        const workflowStatus = workflowResults.length > 0 
            ? workflowResults[0].status 
            : 'pending';

        // VERIFY APPROVED AND ACTIVE
        if (workflowStatus !== 'approved' || !admin.is_active) {
            req.session.destroy();
            return res.redirect('/adminLogin?error=inactive');
        }

        // LOG DASHBOARD ACCESS
        await logAdminAction(adminUsername, 'dashboard_access', {
            result: 'success',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // SERVE DASHBOARD HTML
        res.sendFile(path.join(__dirname, '../../../frontend/src/pages/admin_dashboard.html'));
        
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Error loading dashboard");
    }
};
```

### Frontend Dashboard Implementation

#### File: `frontend/src/js/admin-dashboard-new.js`

```javascript
// ===== GLOBAL STATE =====
let adminData = null;           // Admin profile data
let complaintsData = [];        // Assigned complaints
let usersData = [];             // Users in district
let anonymousReportsData = [];  // Anonymous reports
let currentComplaintId = null;  // Currently selected complaint

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();           // Verify authentication
    initTabNavigation();        // Setup tab switching
    initEventListeners();       // Attach event handlers
    initSettings();             // Load saved settings
});

// ===== AUTHENTICATION CHECK =====
async function checkAdminAuth() {
    try {
        const response = await fetch('/check-admin-auth', {
            credentials: 'include'  // Include session cookies
        });

        if (!response.ok) {
            window.location.href = '/adminLogin';
            return;
        }

        const data = await response.json();
        if (data.success) {
            loadDashboardData();  // Load all dashboard data
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
    // Load all data in parallel for performance
    await Promise.all([
        loadAdminProfile(),
        loadComplaints(),
        loadUsers(),
        loadDashboardStats(),
        loadAnonymousReports()
    ]);
}
```

#### Loading Admin Profile

```javascript
async function loadAdminProfile() {
    try {
        const response = await fetch('/get-admin-profile', { 
            credentials: 'include' 
        });
        const data = await response.json();

        if (data.success) {
            adminData = data.admin;
            populateAdminData();  // Update UI
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

    // Update sidebar
    document.getElementById('admin-fullname').textContent = 
        adminData.fullName || adminData.username;
    document.getElementById('district-name').textContent = 
        adminData.district_name || 'N/A';
    document.getElementById('welcome-name').textContent = 
        adminData.fullName?.split(' ')[0] || adminData.username;

    // Update profile tab
    document.getElementById('profile-fullname').textContent = 
        adminData.fullName || '-';
    document.getElementById('profile-username').textContent = 
        adminData.username || '-';
    document.getElementById('profile-district').textContent = 
        adminData.district_name || '-';

    // Update info grid with all fields
    document.getElementById('info-email').textContent = adminData.email || '-';
    document.getElementById('info-phone').textContent = adminData.phone || '-';
    document.getElementById('info-designation').textContent = 
        adminData.designation || '-';
    document.getElementById('info-official-id').textContent = 
        adminData.official_id || '-';
}
```

#### Loading Dashboard Statistics

```javascript
async function loadDashboardStats() {
    try {
        const response = await fetch('/get-admin-dashboard-stats', { 
            credentials: 'include' 
        });
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsDisplay(stats) {
    // Update stat cards on dashboard
    document.getElementById('total-cases').textContent = stats.total || 0;
    document.getElementById('pending-cases').textContent = stats.pending || 0;
    document.getElementById('verifying-cases').textContent = stats.verifying || 0;
    document.getElementById('investigating-cases').textContent = stats.investigating || 0;
    document.getElementById('resolved-cases').textContent = stats.resolved || 0;
}
```

---

## Case Management

### Loading Complaints

#### Backend: Get Admin Cases

```javascript
// File: backend/src/controllers/adminController.js

exports.getAdminCases = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        const adminUsername = req.session.adminUsername;
        const { username, dateFrom, dateTo } = req.query;

        // BUILD QUERY with filters
        let casesQuery = `
            SELECT 
                c.complaint_id,
                c.username as complainant_username,
                COALESCE(u.fullName, 'N/A') as complainant_fullname,
                COALESCE(cat.name, c.complaint_type, 'General') as complaint_type,
                c.category_id,
                cat.name as category_name,
                cat.crime_code,
                c.created_at,
                c.status,
                COALESCE(c.description, '') as description,
                COALESCE(c.location_address, '') as location_address,
                COALESCE(ac.last_updated, c.created_at) as last_updated
            FROM complaint c 
            INNER JOIN users u ON c.username = u.username
            LEFT JOIN category cat ON c.category_id = cat.category_id
            LEFT JOIN admin_cases ac ON c.complaint_id = ac.complaint_id 
                AND ac.admin_username = ?
            WHERE c.admin_username = ? 
                AND (c.is_discarded IS NULL OR c.is_discarded = FALSE)
        `;

        const queryParams = [adminUsername, adminUsername];

        // ADD OPTIONAL FILTERS
        if (username && username.trim() !== '') {
            casesQuery += ' AND (LOWER(c.username) LIKE LOWER(?) OR LOWER(COALESCE(u.fullName, "")) LIKE LOWER(?))';
            const searchTerm = `%${username.trim()}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        if (dateFrom && dateFrom.trim() !== '') {
            casesQuery += ' AND DATE(c.created_at) >= ?';
            queryParams.push(dateFrom);
        }

        if (dateTo && dateTo.trim() !== '') {
            casesQuery += ' AND DATE(c.created_at) <= ?';
            queryParams.push(dateTo);
        }

        casesQuery += ' ORDER BY c.created_at DESC';

        const [cases] = await pool.query(casesQuery, queryParams);

        res.json({ success: true, cases });
        
    } catch (err) {
        console.error("Get admin cases error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching cases" 
        });
    }
};
```

**Query Logic:**
1. Joins `complaint` with `users` and `category` tables
2. Filters by `admin_username` (assigned admin)
3. Excludes discarded complaints
4. Supports optional filters: username search, date range
5. Orders by creation date (newest first)

### Update Complaint Status

```javascript
exports.updateComplaintStatus = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        const { complaintId, status } = req.body;
        const adminUsername = req.session.adminUsername;

        // VALIDATE STATUS VALUE
        const validStatuses = ['pending', 'verifying', 'investigating', 'resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // CHECK OWNERSHIP: Verify admin is assigned to this complaint
        const [complaintCheck] = await pool.query(
            'SELECT admin_username, username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (complaintCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (complaintCheck[0].admin_username !== adminUsername) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this complaint'
            });
        }

        // UPDATE STATUS
        await pool.query(
            'UPDATE complaint SET status = ? WHERE complaint_id = ?',
            [status, complaintId]
        );

        // UPDATE ADMIN_CASES tracking table
        await pool.query(
            `INSERT INTO admin_cases (complaint_id, admin_username, status, last_updated)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE status = ?, last_updated = NOW()`,
            [complaintId, adminUsername, status, status]
        );

        // CREATE NOTIFICATION for user
        const { createNotification } = require('../utils/notificationUtils');
        await createNotification(
            complaintId,
            `Your complaint #${complaintId} status has been updated to: ${status}`,
            'status_update'
        );

        // LOG AUDIT ACTION
        await logAdminAction(adminUsername, 'status_update', {
            complaintId,
            newStatus: status,
            targetUsername: complaintCheck[0].username,
            result: 'success'
        });

        res.json({
            success: true,
            message: 'Status updated successfully'
        });

    } catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
};
```

### Frontend: Rendering Complaints Table

```javascript
// File: frontend/src/js/admin-dashboard-new.js

function renderComplaints(filteredData = null) {
    const container = document.getElementById('complaints-table-container');
    const complaints = filteredData || complaintsData;

    // EMPTY STATE
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

    // RENDER TABLE
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
                                <!-- Edit Status Button -->
                                <button class="btn btn-primary btn-sm" 
                                    onclick="openStatusModal(${c.complaint_id}, '${c.status}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <!-- View Evidence Button -->
                                <button class="btn btn-secondary btn-sm" 
                                    onclick="viewEvidence(${c.complaint_id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <!-- View Description Button -->
                                <button class="btn btn-warning btn-sm" 
                                    onclick="viewDescription(${c.complaint_id}, '${escapeHtml(c.description)}')">
                                    <i class="fas fa-file-alt"></i>
                                </button>
                                <!-- Open Chat Button -->
                                <button class="btn btn-success btn-sm" 
                                    onclick="openChat(${c.complaint_id}, '${c.username}')">
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

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function to escape HTML for security
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

## Chat System

### Backend: Get and Send Messages

```javascript
// Get Chat Messages
exports.getAdminChat = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Please log in as admin" 
            });
        }

        const complaintId = req.params.complaintId;
        const adminUsername = req.session.adminUsername;

        // VERIFY OWNERSHIP
        const [results] = await pool.query(
            'SELECT admin_username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Complaint not found" 
            });
        }

        if (results[0].admin_username !== adminUsername) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied" 
            });
        }

        // FETCH MESSAGES ordered by time
        const [messages] = await pool.query(
            `SELECT * FROM complaint_chat 
             WHERE complaint_id = ? 
             ORDER BY sent_at ASC`,
            [complaintId]
        );

        res.json({ success: true, messages: messages });
        
    } catch (err) {
        console.error("Get chat error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching messages" 
        });
    }
};

// Send Chat Message
exports.sendAdminChatMessage = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ 
                success: false, 
                message: "Please log in as admin" 
            });
        }

        const { complaintId, message } = req.body;
        const adminUsername = req.session.adminUsername;

        if (!complaintId || !message || !message.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        // CHECK FOR DUPLICATE MESSAGES (prevent double-submit)
        const [duplicates] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM complaint_chat 
             WHERE complaint_id = ? 
                AND sender_username = ? 
                AND sender_type = 'admin'
                AND message = ? 
                AND sent_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)`,
            [complaintId, adminUsername, message.trim()]
        );

        if (duplicates[0].count > 0) {
            return res.status(429).json({ 
                success: false, 
                message: "Duplicate message detected" 
            });
        }

        // VERIFY OWNERSHIP
        const [results] = await pool.query(
            'SELECT admin_username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (results.length === 0 || results[0].admin_username !== adminUsername) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied" 
            });
        }

        // INSERT MESSAGE
        await pool.query(
            `INSERT INTO complaint_chat 
             (complaint_id, sender_type, sender_username, message, sent_at) 
             VALUES (?, 'admin', ?, ?, NOW())`,
            [complaintId, adminUsername, message.trim()]
        );

        // CREATE NOTIFICATION for user
        await createNotification(
            complaintId, 
            `New message from admin regarding complaint #${complaintId}`, 
            'admin_comment'
        );

        res.json({ success: true, message: "Message sent successfully" });
        
    } catch (err) {
        console.error("Send chat message error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error sending message" 
        });
    }
};
```

### Frontend: Chat Implementation

```javascript
// Open Chat Modal
async function openChat(complaintId, username) {
    currentComplaintId = complaintId;
    
    document.getElementById('chat-complaint-id').textContent = complaintId;
    document.getElementById('chat-username').textContent = username;
    
    // Load existing messages
    await loadChatMessages(complaintId);
    
    // Show modal
    document.getElementById('chat-modal').classList.remove('hidden');
}

// Load Chat Messages
async function loadChatMessages(complaintId) {
    try {
        const response = await fetch(`/admin/chat/${complaintId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            renderChatMessages(data.messages);
        }
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

// Render Chat Messages
function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="no-messages">No messages yet</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender_type}">
            <div class="message-header">
                <span class="sender">${msg.sender_type === 'admin' ? 'You' : msg.sender_username}</span>
                <span class="time">${new Date(msg.sent_at).toLocaleString()}</span>
            </div>
            <div class="message-body">${escapeHtml(msg.message)}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send Message
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        const response = await fetch('/admin/chat/send', {
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
            await loadChatMessages(currentComplaintId);  // Reload messages
            showToast('Message sent', 'success');
        } else {
            showToast(data.message || 'Failed to send', 'error');
        }
    } catch (error) {
        console.error('Send message error:', error);
        showToast('Error sending message', 'error');
    }
}
```

---

## Audit Logging

### File: `backend/src/utils/auditUtils.js`

```javascript
const pool = require('../db');

/**
 * Log admin actions for audit trail
 * @param {string} adminUsername - Admin username performing the action
 * @param {string} action - Action type
 * @param {object} options - Additional options
 */
async function logAdminAction(adminUsername, action, options = {}) {
    try {
        const {
            actionDetails = null,
            ipAddress = null,
            userAgent = null,
            complaintId = null,
            targetUsername = null,
            result = 'success'
        } = options;

        // Convert actionDetails to JSON string if object
        const details = typeof actionDetails === 'object' 
            ? JSON.stringify(actionDetails) 
            : actionDetails;

        await pool.query(
            `INSERT INTO admin_audit_logs 
            (admin_username, action, action_details, ip_address, 
             user_agent, complaint_id, target_username, result) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminUsername, action, details, ipAddress, 
             userAgent, complaintId, targetUsername, result]
        );
    } catch (err) {
        console.error('Error logging admin action:', err);
        // Don't throw - logging failure shouldn't break main operation
    }
}

/**
 * Get audit logs for a specific admin
 */
async function getAdminAuditLogs(adminUsername, filters = {}) {
    try {
        const { action = null, startDate = null, endDate = null, limit = 100 } = filters;
        
        let query = 'SELECT * FROM admin_audit_logs WHERE admin_username = ?';
        const params = [adminUsername];

        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }

        if (startDate) {
            query += ' AND timestamp >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND timestamp <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const [logs] = await pool.query(query, params);
        return logs;
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        throw err;
    }
}

module.exports = { logAdminAction, getAdminAuditLogs, getAllAuditLogs };
```

### Logged Actions

| Action | Description |
|--------|-------------|
| `login` | Admin login attempt |
| `logout` | Admin logout |
| `dashboard_access` | Dashboard page viewed |
| `status_update` | Complaint status changed |
| `complaint_viewed` | Complaint details viewed |
| `evidence_viewed` | Evidence files accessed |
| `chat_message_sent` | Chat message sent |
| `profile_updated` | Admin profile modified |

---

## API Endpoints

### Admin Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/register` | Submit registration |
| GET | `/verify-admin-email` | Verify email via token |
| POST | `/admin/login` | Admin login |
| POST | `/admin/logout` | Admin logout |
| GET | `/check-admin-auth` | Check auth status |
| POST | `/admin/setup-password` | Set password after approval |

### Admin Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin-dashboard` | Serve dashboard page |
| GET | `/get-admin-profile` | Get admin profile data |
| POST | `/update-admin-profile` | Update profile |
| GET | `/get-admin-settings` | Get settings |
| POST | `/update-admin-settings` | Update settings |
| GET | `/get-admin-dashboard-stats` | Get statistics |

### Case Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-admin-complaints` | Get assigned complaints |
| GET | `/get-admin-cases` | Get cases with filters |
| POST | `/update-complaint-status` | Update status |
| GET | `/get-complaint-evidence/:id` | Get evidence files |
| GET | `/get-district-users` | Get users in district |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/chat/:complaintId` | Get messages |
| POST | `/admin/chat/send` | Send message |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-admin-audit-logs` | Get admin's audit logs |

---

## Database Schema

### Admins Table
```sql
CREATE TABLE IF NOT EXISTS `admins` (
  `adminid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `official_id` varchar(50) DEFAULT NULL,
  `district_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`),
  FOREIGN KEY (`district_name`) REFERENCES `districts` (`district_name`)
);
```

### Admin Approval Workflow Table
```sql
CREATE TABLE IF NOT EXISTS `admin_approval_workflow` (
  `workflow_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `status` enum('pending', 'approved', 'rejected') DEFAULT 'pending',
  `request_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `approval_date` timestamp NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`workflow_id`),
  FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`)
);
```

### Admin Audit Logs Table
```sql
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `action_details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `complaint_id` int DEFAULT NULL,
  `target_username` varchar(50) DEFAULT NULL,
  `result` enum('success', 'failure', 'warning') DEFAULT 'success',
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
);
```

---

*Next: [04_COMPLAINT_SYSTEM.md](04_COMPLAINT_SYSTEM.md) - Complaint Submission & Tracking*
