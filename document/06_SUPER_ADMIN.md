# Super Admin System
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Super Admin vs Admin](#super-admin-vs-admin)
3. [Backend Implementation](#backend-implementation)
4. [Admin Approval Workflow](#admin-approval-workflow)
5. [Suspend & Reactivate](#suspend--reactivate)
6. [System Statistics](#system-statistics)
7. [Frontend Implementation](#frontend-implementation)
8. [API Endpoints](#api-endpoints)

---

## Overview

The Super Admin is the highest authority in the system with exclusive privileges to:
- Approve or reject admin registration requests
- Suspend or reactivate admin accounts
- View system-wide statistics
- Manage all aspects of the platform

### Key Features

| Feature | Description |
|---------|-------------|
| **Admin Approval** | Review and approve/reject pending admin registrations |
| **Account Management** | Suspend or reactivate admin accounts |
| **System Overview** | View platform-wide statistics |
| **Audit Trail** | All actions are logged for accountability |

---

## Super Admin vs Admin

| Capability | Regular Admin | Super Admin |
|------------|---------------|-------------|
| View assigned cases | ✅ | ✅ |
| Update case status | ✅ | ✅ |
| Chat with users | ✅ | ✅ |
| View audit logs | Own only | All admins |
| Approve admins | ❌ | ✅ |
| Suspend admins | ❌ | ✅ |
| View all statistics | ❌ | ✅ |
| Manage districts | ❌ | ✅ |

---

## Backend Implementation

### File: `backend/src/controllers/superAdminController.js`

#### Dependencies & Setup

```javascript
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { logAdminAction } = require('../utils/auditUtils');

/**
 * Super Admin Controller
 * Handles all super-admin specific operations
 */
```

#### Super Admin Login

```javascript
/**
 * Super Admin Login
 * Separate authentication from regular admins
 */
exports.superAdminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // ============ VALIDATION ============
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        // ============ FIND SUPER ADMIN ============
        const [admins] = await pool.query(
            `SELECT * FROM admin 
             WHERE admin_username = ? AND role = 'super_admin'`,
            [username]
        );
        
        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        const admin = admins[0];
        
        // ============ VERIFY PASSWORD ============
        const isMatch = await bcrypt.compare(password, admin.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // ============ CHECK ACCOUNT STATUS ============
        if (admin.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }
        
        // ============ SET SESSION ============
        req.session.admin = {
            username: admin.admin_username,
            role: 'super_admin',
            districtId: admin.district_id
        };
        
        // ============ LOG ACTION ============
        await logAdminAction(
            admin.admin_username,
            'SUPER_ADMIN_LOGIN',
            `Super admin logged in from IP: ${req.ip}`
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            admin: {
                username: admin.admin_username,
                role: 'super_admin'
            }
        });
        
    } catch (error) {
        console.error('Super admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};
```

---

## Admin Approval Workflow

### Registration Flow

```
1. Admin registers → status = 'pending_approval'
2. Super Admin sees pending list
3. Super Admin reviews documentation
4. Super Admin approves/rejects
5. Email notification sent to admin
```

### Get Pending Admins

```javascript
/**
 * Get all pending admin registrations
 * Returns admins awaiting approval
 */
exports.getPendingAdmins = async (req, res) => {
    try {
        // ============ VERIFY SUPER ADMIN ============
        if (!req.session.admin || req.session.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ FETCH PENDING ADMINS ============
        const [admins] = await pool.query(
            `SELECT 
                a.admin_username,
                a.email,
                a.full_name,
                a.phone_number,
                a.badge_number,
                a.department,
                a.rank,
                d.district_name,
                a.created_at,
                a.verification_document
             FROM admin a
             LEFT JOIN district d ON a.district_id = d.district_id
             WHERE a.status = 'pending_approval'
             ORDER BY a.created_at ASC`
        );
        
        res.json({
            success: true,
            pendingAdmins: admins
        });
        
    } catch (error) {
        console.error('Get pending admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve pending admins'
        });
    }
};
```

### Approve Admin

```javascript
/**
 * Approve admin registration
 * Changes status from 'pending_approval' to 'active'
 */
exports.approveAdmin = async (req, res) => {
    try {
        const { adminUsername } = req.params;
        const superAdmin = req.session.admin;
        
        // ============ VERIFY SUPER ADMIN ============
        if (!superAdmin || superAdmin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ CHECK ADMIN EXISTS ============
        const [admin] = await pool.query(
            'SELECT * FROM admin WHERE admin_username = ?',
            [adminUsername]
        );
        
        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        // ============ CHECK STATUS ============
        if (admin[0].status !== 'pending_approval') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve admin with status: ${admin[0].status}`
            });
        }
        
        // ============ UPDATE STATUS ============
        await pool.query(
            `UPDATE admin 
             SET status = 'active', 
                 approved_at = NOW(), 
                 approved_by = ?
             WHERE admin_username = ?`,
            [superAdmin.username, adminUsername]
        );
        
        // ============ LOG ACTION ============
        await logAdminAction(
            superAdmin.username,
            'ADMIN_APPROVED',
            `Approved admin registration: ${adminUsername}`
        );
        
        // ============ SEND EMAIL NOTIFICATION ============
        const { sendEmail } = require('../utils/emailUtils');
        
        await sendEmail({
            to: admin[0].email,
            subject: 'SecureVoice Admin Registration Approved',
            html: `
                <h2>Registration Approved</h2>
                <p>Dear ${admin[0].full_name},</p>
                <p>Your admin registration has been approved. You can now log in to the admin dashboard.</p>
                <p>Username: <strong>${adminUsername}</strong></p>
                <p>Dashboard: <a href="${process.env.BASE_URL}/admin/login">Login Here</a></p>
                <p>Best regards,<br>SecureVoice Team</p>
            `
        });
        
        res.json({
            success: true,
            message: `Admin ${adminUsername} approved successfully`
        });
        
    } catch (error) {
        console.error('Approve admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve admin'
        });
    }
};
```

### Reject Admin

```javascript
/**
 * Reject admin registration
 * Changes status from 'pending_approval' to 'rejected'
 */
exports.rejectAdmin = async (req, res) => {
    try {
        const { adminUsername } = req.params;
        const { reason } = req.body;
        const superAdmin = req.session.admin;
        
        // ============ VERIFY SUPER ADMIN ============
        if (!superAdmin || superAdmin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ VALIDATE REASON ============
        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required (minimum 10 characters)'
            });
        }
        
        // ============ CHECK ADMIN EXISTS ============
        const [admin] = await pool.query(
            'SELECT * FROM admin WHERE admin_username = ?',
            [adminUsername]
        );
        
        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        // ============ UPDATE STATUS ============
        await pool.query(
            `UPDATE admin 
             SET status = 'rejected', 
                 rejection_reason = ?,
                 rejected_at = NOW(), 
                 rejected_by = ?
             WHERE admin_username = ?`,
            [reason, superAdmin.username, adminUsername]
        );
        
        // ============ LOG ACTION ============
        await logAdminAction(
            superAdmin.username,
            'ADMIN_REJECTED',
            `Rejected admin registration: ${adminUsername}. Reason: ${reason}`
        );
        
        // ============ SEND EMAIL NOTIFICATION ============
        const { sendEmail } = require('../utils/emailUtils');
        
        await sendEmail({
            to: admin[0].email,
            subject: 'SecureVoice Admin Registration Status',
            html: `
                <h2>Registration Not Approved</h2>
                <p>Dear ${admin[0].full_name},</p>
                <p>We regret to inform you that your admin registration was not approved.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>If you believe this is an error, please contact support.</p>
                <p>Best regards,<br>SecureVoice Team</p>
            `
        });
        
        res.json({
            success: true,
            message: `Admin ${adminUsername} registration rejected`
        });
        
    } catch (error) {
        console.error('Reject admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject admin'
        });
    }
};
```

---

## Suspend & Reactivate

### Suspend Admin

```javascript
/**
 * Suspend an active admin account
 * Admin can no longer access the system
 */
exports.suspendAdmin = async (req, res) => {
    try {
        const { adminUsername } = req.params;
        const { reason } = req.body;
        const superAdmin = req.session.admin;
        
        // ============ VERIFY SUPER ADMIN ============
        if (!superAdmin || superAdmin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ PREVENT SELF-SUSPENSION ============
        if (adminUsername === superAdmin.username) {
            return res.status(400).json({
                success: false,
                message: 'Cannot suspend your own account'
            });
        }
        
        // ============ VALIDATE REASON ============
        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Suspension reason is required'
            });
        }
        
        // ============ CHECK ADMIN EXISTS ============
        const [admin] = await pool.query(
            'SELECT * FROM admin WHERE admin_username = ?',
            [adminUsername]
        );
        
        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        // ============ CHECK IF ALREADY SUSPENDED ============
        if (admin[0].status === 'suspended') {
            return res.status(400).json({
                success: false,
                message: 'Admin is already suspended'
            });
        }
        
        // ============ UPDATE STATUS ============
        await pool.query(
            `UPDATE admin 
             SET status = 'suspended', 
                 suspension_reason = ?,
                 suspended_at = NOW(), 
                 suspended_by = ?
             WHERE admin_username = ?`,
            [reason, superAdmin.username, adminUsername]
        );
        
        // ============ REASSIGN CASES ============
        // Get count of active cases
        const [cases] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM complaint 
             WHERE admin_username = ? AND status NOT IN ('resolved', 'dismissed')`,
            [adminUsername]
        );
        
        if (cases[0].count > 0) {
            // Set cases to unassigned (will need manual reassignment)
            await pool.query(
                `UPDATE complaint 
                 SET admin_username = NULL, 
                     needs_reassignment = TRUE
                 WHERE admin_username = ? 
                   AND status NOT IN ('resolved', 'dismissed')`,
                [adminUsername]
            );
        }
        
        // ============ LOG ACTION ============
        await logAdminAction(
            superAdmin.username,
            'ADMIN_SUSPENDED',
            `Suspended admin: ${adminUsername}. Reason: ${reason}. ${cases[0].count} cases marked for reassignment.`
        );
        
        // ============ SEND EMAIL NOTIFICATION ============
        const { sendEmail } = require('../utils/emailUtils');
        
        await sendEmail({
            to: admin[0].email,
            subject: 'SecureVoice Account Suspended',
            html: `
                <h2>Account Suspended</h2>
                <p>Dear ${admin[0].full_name},</p>
                <p>Your admin account has been suspended.</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p>Please contact the system administrator if you have questions.</p>
                <p>Best regards,<br>SecureVoice Team</p>
            `
        });
        
        res.json({
            success: true,
            message: `Admin ${adminUsername} has been suspended`,
            casesReassigned: cases[0].count
        });
        
    } catch (error) {
        console.error('Suspend admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to suspend admin'
        });
    }
};
```

### Reactivate Admin

```javascript
/**
 * Reactivate a suspended admin account
 * Restores access to the system
 */
exports.reactivateAdmin = async (req, res) => {
    try {
        const { adminUsername } = req.params;
        const superAdmin = req.session.admin;
        
        // ============ VERIFY SUPER ADMIN ============
        if (!superAdmin || superAdmin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ CHECK ADMIN EXISTS ============
        const [admin] = await pool.query(
            'SELECT * FROM admin WHERE admin_username = ?',
            [adminUsername]
        );
        
        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        // ============ CHECK IF SUSPENDED ============
        if (admin[0].status !== 'suspended') {
            return res.status(400).json({
                success: false,
                message: `Cannot reactivate admin with status: ${admin[0].status}`
            });
        }
        
        // ============ UPDATE STATUS ============
        await pool.query(
            `UPDATE admin 
             SET status = 'active', 
                 suspension_reason = NULL,
                 suspended_at = NULL, 
                 suspended_by = NULL,
                 reactivated_at = NOW(),
                 reactivated_by = ?
             WHERE admin_username = ?`,
            [superAdmin.username, adminUsername]
        );
        
        // ============ LOG ACTION ============
        await logAdminAction(
            superAdmin.username,
            'ADMIN_REACTIVATED',
            `Reactivated admin: ${adminUsername}`
        );
        
        // ============ SEND EMAIL NOTIFICATION ============
        const { sendEmail } = require('../utils/emailUtils');
        
        await sendEmail({
            to: admin[0].email,
            subject: 'SecureVoice Account Reactivated',
            html: `
                <h2>Account Reactivated</h2>
                <p>Dear ${admin[0].full_name},</p>
                <p>Your admin account has been reactivated. You can now log in to the admin dashboard.</p>
                <p>Dashboard: <a href="${process.env.BASE_URL}/admin/login">Login Here</a></p>
                <p>Best regards,<br>SecureVoice Team</p>
            `
        });
        
        res.json({
            success: true,
            message: `Admin ${adminUsername} has been reactivated`
        });
        
    } catch (error) {
        console.error('Reactivate admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reactivate admin'
        });
    }
};
```

---

## System Statistics

### Get Dashboard Statistics

```javascript
/**
 * Get system-wide statistics for super admin dashboard
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // ============ VERIFY SUPER ADMIN ============
        if (!req.session.admin || req.session.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        // ============ ADMIN STATISTICS ============
        const [adminStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
                SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END) as superAdmins
            FROM admin
        `);
        
        // ============ USER STATISTICS ============
        const [userStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
                COUNT(DISTINCT CASE 
                    WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
                    THEN user_id END) as activeThisWeek
            FROM user
        `);
        
        // ============ COMPLAINT STATISTICS ============
        const [complaintStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'verifying' THEN 1 ELSE 0 END) as verifying,
                SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last24Hours,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as lastWeek
            FROM complaint
        `);
        
        // ============ ANONYMOUS REPORT STATISTICS ============
        const [anonStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as flagged,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last24Hours
            FROM anonymous_reports
        `);
        
        // ============ TOP CATEGORIES ============
        const [topCategories] = await pool.query(`
            SELECT 
                c.category_name,
                COUNT(comp.complaint_id) as count
            FROM category c
            LEFT JOIN complaint comp ON c.category_id = comp.category_id
            GROUP BY c.category_id, c.category_name
            ORDER BY count DESC
            LIMIT 5
        `);
        
        // ============ DISTRICT STATISTICS ============
        const [districtStats] = await pool.query(`
            SELECT 
                d.district_name,
                COUNT(DISTINCT a.admin_username) as adminCount,
                COUNT(DISTINCT comp.complaint_id) as complaintCount
            FROM district d
            LEFT JOIN admin a ON d.district_id = a.district_id AND a.status = 'active'
            LEFT JOIN complaint comp ON a.admin_username = comp.admin_username
            GROUP BY d.district_id, d.district_name
            ORDER BY complaintCount DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            stats: {
                admins: adminStats[0],
                users: userStats[0],
                complaints: complaintStats[0],
                anonymousReports: anonStats[0],
                topCategories,
                districtStats
            }
        });
        
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
};
```

### Get All Admins List

```javascript
/**
 * Get all admins with their details
 */
exports.getAllAdmins = async (req, res) => {
    try {
        // ============ VERIFY SUPER ADMIN ============
        if (!req.session.admin || req.session.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required'
            });
        }
        
        const [admins] = await pool.query(`
            SELECT 
                a.admin_username,
                a.email,
                a.full_name,
                a.phone_number,
                a.badge_number,
                a.department,
                a.rank,
                a.role,
                a.status,
                d.district_name,
                a.created_at,
                a.approved_at,
                a.approved_by,
                a.suspended_at,
                a.suspended_by,
                a.suspension_reason,
                (SELECT COUNT(*) FROM complaint c 
                 WHERE c.admin_username = a.admin_username) as totalCases,
                (SELECT COUNT(*) FROM complaint c 
                 WHERE c.admin_username = a.admin_username 
                   AND c.status NOT IN ('resolved', 'dismissed')) as activeCases
            FROM admin a
            LEFT JOIN district d ON a.district_id = d.district_id
            ORDER BY 
                CASE a.status 
                    WHEN 'pending_approval' THEN 1 
                    WHEN 'active' THEN 2 
                    ELSE 3 
                END,
                a.created_at DESC
        `);
        
        res.json({
            success: true,
            admins
        });
        
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve admins'
        });
    }
};
```

---

## Frontend Implementation

### Super Admin Dashboard HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Super Admin Dashboard - SecureVoice</title>
    <link rel="stylesheet" href="/css/super-admin.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="super-admin-nav">
        <div class="nav-brand">
            <img src="/images/logo.png" alt="SecureVoice">
            <span>Super Admin</span>
        </div>
        <div class="nav-links">
            <a href="#dashboard" class="active">Dashboard</a>
            <a href="#pending">Pending Approvals</a>
            <a href="#admins">All Admins</a>
            <a href="#statistics">Statistics</a>
        </div>
        <button id="logoutBtn" class="btn-logout">Logout</button>
    </nav>

    <!-- Dashboard Section -->
    <section id="dashboard" class="dashboard-section">
        <h2>System Overview</h2>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon admins">👮</div>
                <div class="stat-content">
                    <span class="stat-value" id="totalAdmins">0</span>
                    <span class="stat-label">Total Admins</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon pending">⏳</div>
                <div class="stat-content">
                    <span class="stat-value" id="pendingAdmins">0</span>
                    <span class="stat-label">Pending Approvals</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon users">👥</div>
                <div class="stat-content">
                    <span class="stat-value" id="totalUsers">0</span>
                    <span class="stat-label">Registered Users</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon complaints">📋</div>
                <div class="stat-content">
                    <span class="stat-value" id="totalComplaints">0</span>
                    <span class="stat-label">Total Complaints</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Pending Approvals Section -->
    <section id="pending" class="pending-section">
        <h2>Pending Admin Approvals</h2>
        <div id="pendingList" class="pending-list">
            <!-- Populated by JavaScript -->
        </div>
    </section>

    <!-- All Admins Section -->
    <section id="admins" class="admins-section">
        <h2>All Administrators</h2>
        <div class="filter-bar">
            <select id="statusFilter">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending</option>
                <option value="suspended">Suspended</option>
            </select>
            <input type="text" id="searchAdmin" placeholder="Search by name or username...">
        </div>
        <div id="adminsList" class="admins-list">
            <!-- Populated by JavaScript -->
        </div>
    </section>

    <script src="/js/super-admin-dashboard.js"></script>
</body>
</html>
```

### Frontend JavaScript

```javascript
// super-admin-dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // ============ INITIALIZATION ============
    loadDashboardStats();
    loadPendingAdmins();
    loadAllAdmins();
    
    // ============ NAVIGATION ============
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active nav
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section
            sections.forEach(s => s.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
    
    // ============ LOAD DASHBOARD STATS ============
    async function loadDashboardStats() {
        try {
            const response = await fetch('/super-admin/stats');
            const data = await response.json();
            
            if (data.success) {
                const { admins, users, complaints, anonymousReports } = data.stats;
                
                document.getElementById('totalAdmins').textContent = admins.total;
                document.getElementById('pendingAdmins').textContent = admins.pending;
                document.getElementById('totalUsers').textContent = users.total;
                document.getElementById('totalComplaints').textContent = complaints.total;
                
                // Update charts if using Chart.js
                updateCharts(data.stats);
            }
        } catch (error) {
            console.error('Load stats error:', error);
            showToast('Failed to load statistics', 'error');
        }
    }
    
    // ============ LOAD PENDING ADMINS ============
    async function loadPendingAdmins() {
        try {
            const response = await fetch('/super-admin/pending');
            const data = await response.json();
            
            if (data.success) {
                renderPendingAdmins(data.pendingAdmins);
            }
        } catch (error) {
            console.error('Load pending error:', error);
        }
    }
    
    function renderPendingAdmins(admins) {
        const container = document.getElementById('pendingList');
        
        if (admins.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No pending approvals</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = admins.map(admin => `
            <div class="pending-card" data-username="${admin.admin_username}">
                <div class="admin-info">
                    <h3>${admin.full_name}</h3>
                    <p class="username">@${admin.admin_username}</p>
                    <p class="email">${admin.email}</p>
                    <p class="details">
                        <span>${admin.department}</span> • 
                        <span>${admin.rank}</span> • 
                        <span>${admin.district_name}</span>
                    </p>
                    <p class="badge">Badge: ${admin.badge_number}</p>
                    <p class="submitted">Submitted: ${formatDate(admin.created_at)}</p>
                </div>
                <div class="admin-actions">
                    ${admin.verification_document ? `
                        <button class="btn-view-doc" 
                                onclick="viewDocument('${admin.verification_document}')">
                            View Document
                        </button>
                    ` : ''}
                    <button class="btn-approve" 
                            onclick="approveAdmin('${admin.admin_username}')">
                        Approve
                    </button>
                    <button class="btn-reject" 
                            onclick="showRejectModal('${admin.admin_username}')">
                        Reject
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // ============ APPROVE ADMIN ============
    window.approveAdmin = async function(username) {
        if (!confirm(`Approve admin: ${username}?`)) return;
        
        try {
            const response = await fetch(`/super-admin/approve/${username}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                showToast('Admin approved successfully', 'success');
                loadPendingAdmins();
                loadDashboardStats();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Approve error:', error);
            showToast('Failed to approve admin', 'error');
        }
    };
    
    // ============ REJECT ADMIN ============
    window.showRejectModal = function(username) {
        const reason = prompt('Enter rejection reason (min 10 characters):');
        
        if (!reason || reason.length < 10) {
            showToast('Please provide a valid reason', 'error');
            return;
        }
        
        rejectAdmin(username, reason);
    };
    
    async function rejectAdmin(username, reason) {
        try {
            const response = await fetch(`/super-admin/reject/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            
            if (data.success) {
                showToast('Admin registration rejected', 'success');
                loadPendingAdmins();
                loadDashboardStats();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Reject error:', error);
            showToast('Failed to reject admin', 'error');
        }
    }
    
    // ============ SUSPEND ADMIN ============
    window.suspendAdmin = async function(username) {
        const reason = prompt('Enter suspension reason:');
        
        if (!reason || reason.length < 10) {
            showToast('Please provide a valid reason', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/super-admin/suspend/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            
            if (data.success) {
                showToast(`Admin suspended. ${data.casesReassigned} cases need reassignment.`, 'success');
                loadAllAdmins();
                loadDashboardStats();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Suspend error:', error);
            showToast('Failed to suspend admin', 'error');
        }
    };
    
    // ============ REACTIVATE ADMIN ============
    window.reactivateAdmin = async function(username) {
        if (!confirm(`Reactivate admin: ${username}?`)) return;
        
        try {
            const response = await fetch(`/super-admin/reactivate/${username}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                showToast('Admin reactivated successfully', 'success');
                loadAllAdmins();
                loadDashboardStats();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Reactivate error:', error);
            showToast('Failed to reactivate admin', 'error');
        }
    };
    
    // ============ LOGOUT ============
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/super-admin/logout', { method: 'POST' });
            window.location.href = '/super-admin/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
    
    // ============ HELPERS ============
    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function showToast(message, type) {
        // Toast notification implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
});
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/super-admin/login` | Super admin login |
| POST | `/super-admin/logout` | Super admin logout |
| GET | `/super-admin/check-auth` | Verify super admin session |

### Admin Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/super-admin/pending` | Get pending admin registrations |
| POST | `/super-admin/approve/:username` | Approve admin registration |
| POST | `/super-admin/reject/:username` | Reject admin registration |
| POST | `/super-admin/suspend/:username` | Suspend admin account |
| POST | `/super-admin/reactivate/:username` | Reactivate admin account |
| GET | `/super-admin/admins` | Get all admins list |

### Statistics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/super-admin/stats` | Get dashboard statistics |
| GET | `/super-admin/audit-logs` | Get all admin audit logs |

---

## Create Super Admin Script

### File: `backend/scripts/create-super-admin.js`

```javascript
/**
 * Script to create initial super admin account
 * Run: node scripts/create-super-admin.js
 */

const pool = require('../src/db');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createSuperAdmin() {
    console.log('\n=== Create Super Admin Account ===\n');
    
    try {
        // Get input
        const username = await prompt('Username: ');
        const email = await prompt('Email: ');
        const fullName = await prompt('Full Name: ');
        const password = await prompt('Password (min 8 chars): ');
        
        // Validate
        if (!username || !email || !fullName || password.length < 8) {
            console.error('All fields are required. Password must be at least 8 characters.');
            process.exit(1);
        }
        
        // Check if exists
        const [existing] = await pool.query(
            'SELECT admin_username FROM admin WHERE admin_username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            console.error('Username or email already exists.');
            process.exit(1);
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Insert super admin
        await pool.query(
            `INSERT INTO admin (
                admin_username, email, password, full_name,
                role, status, created_at
            ) VALUES (?, ?, ?, ?, 'super_admin', 'active', NOW())`,
            [username, email, hashedPassword, fullName]
        );
        
        console.log('\n✅ Super admin created successfully!');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Role: super_admin`);
        console.log('\nYou can now login at /super-admin/login\n');
        
    } catch (error) {
        console.error('Error creating super admin:', error.message);
    } finally {
        rl.close();
        process.exit(0);
    }
}

createSuperAdmin();
```

---

## Middleware: Require Super Admin

```javascript
// In authMiddleware.js

/**
 * Require super admin authentication
 * Blocks regular admins
 */
exports.requireSuperAdmin = (req, res, next) => {
    // Check session exists
    if (!req.session || !req.session.admin) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            redirect: '/super-admin/login'
        });
    }
    
    // Check role
    if (req.session.admin.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super admin access required'
        });
    }
    
    next();
};
```

---

## Routes Setup

### File: `backend/src/routes/superAdmin.js`

```javascript
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { requireSuperAdmin } = require('../middleware/authMiddleware');

// ============ PUBLIC ROUTES ============
router.post('/login', superAdminController.superAdminLogin);

// ============ PROTECTED ROUTES ============
router.use(requireSuperAdmin);

router.post('/logout', superAdminController.logout);
router.get('/check-auth', superAdminController.checkAuth);

// Admin Management
router.get('/pending', superAdminController.getPendingAdmins);
router.post('/approve/:adminUsername', superAdminController.approveAdmin);
router.post('/reject/:adminUsername', superAdminController.rejectAdmin);
router.post('/suspend/:adminUsername', superAdminController.suspendAdmin);
router.post('/reactivate/:adminUsername', superAdminController.reactivateAdmin);
router.get('/admins', superAdminController.getAllAdmins);

// Statistics
router.get('/stats', superAdminController.getDashboardStats);
router.get('/audit-logs', superAdminController.getAuditLogs);

module.exports = router;
```

---

*Next: [07_UTILITIES_AND_SECURITY.md](07_UTILITIES_AND_SECURITY.md) - Helper Functions, Middleware & Security*
