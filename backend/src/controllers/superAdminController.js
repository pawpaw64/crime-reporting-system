const pool = require('../db');
const { hashPassword } = require('../utils/passwordUtils');
const { sendEmail } = require('../utils/emailUtils');
const { logAdminAction, getAllAuditLogs } = require('../utils/auditUtils');
const crypto = require('crypto');

// ========== SUPER ADMIN LOGIN ==========
exports.superAdminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // Check if super admin exists
        const [results] = await pool.query(
            'SELECT * FROM super_admins WHERE username = ? AND is_active = 1',
            [username]
        );

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const superAdmin = results[0];
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, superAdmin.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Update last login
        await pool.query(
            'UPDATE super_admins SET last_login = NOW() WHERE super_admin_id = ?',
            [superAdmin.super_admin_id]
        );

        // Set session
        req.session.superAdminId = superAdmin.super_admin_id;
        req.session.superAdminUsername = superAdmin.username;
        req.session.isSuperAdmin = true;

        res.json({
            success: true,
            message: "Login successful",
            redirect: "/super-admin-dashboard"
        });

    } catch (err) {
        console.error("Super admin login error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET PENDING ADMIN REQUESTS ==========
exports.getPendingAdminRequests = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const [requests] = await pool.query(
            `SELECT 
                a.adminid as admin_id, a.username, a.email, a.fullName as full_name, a.phone, a.designation, 
                a.official_id, a.district_name, 
                aw.status, aw.request_date, aw.approval_date, aw.approved_by, aw.rejection_reason
            FROM admins a
            JOIN admin_approval_workflow aw ON a.username = aw.admin_username
            WHERE aw.status = 'pending'
            ORDER BY aw.request_date DESC`
        );

        res.json({
            success: true,
            requests: requests
        });

    } catch (err) {
        console.error("Error fetching pending requests:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET ALL ADMIN REQUESTS (WITH FILTERS) ==========
exports.getAllAdminRequests = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { status, district } = req.query;
        
        let query = `SELECT 
            a.adminid as admin_id, a.username, a.email, a.fullName as full_name, a.phone, a.designation, 
            a.official_id, a.district_name, a.is_active, a.last_login,
            aw.status as approval_status, aw.request_date, aw.approval_date, aw.approved_by, aw.rejection_reason
        FROM admins a
        JOIN admin_approval_workflow aw ON a.username = aw.admin_username
        WHERE 1=1`;
        
        const params = [];

        if (status) {
            query += ' AND aw.status = ?';
            params.push(status);
        }

        if (district) {
            query += ' AND a.district_name = ?';
            params.push(district);
        }

        query += ' ORDER BY aw.request_date DESC';

        const [requests] = await pool.query(query, params);

        res.json({
            success: true,
            admins: requests
        });

    } catch (err) {
        console.error("Error fetching admin requests:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== APPROVE ADMIN REQUEST ==========
exports.approveAdminRequest = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        // Get admin details by ID
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE adminid = ?',
            [adminId]
        );

        if (adminResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const admin = adminResults[0];

        // Check workflow status
        const [workflowResults] = await pool.query(
            'SELECT status FROM admin_approval_workflow WHERE admin_username = ?',
            [admin.username]
        );

        if (workflowResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin workflow not found"
            });
        }

        if (workflowResults[0].status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Admin is already ${workflowResults[0].status}`
            });
        }

        // Check if email is verified
        const [verificationResults] = await pool.query(
            `SELECT is_used FROM admin_verification_tokens 
             WHERE admin_username = ? AND token_type = 'email_verification' 
             ORDER BY created_at DESC LIMIT 1`,
            [admin.username]
        );

        const emailVerified = verificationResults.length > 0 && verificationResults[0].is_used === 1;

        // Update workflow status to approved and activate account
        await pool.query(
            `UPDATE admin_approval_workflow 
            SET status = 'approved',
                approval_date = NOW(),
                approved_by = ?
            WHERE admin_username = ?`,
            [req.session.superAdminUsername, admin.username]
        );

        // Activate admin account (password already set at registration)
        await pool.query(
            `UPDATE admins SET is_active = 1 WHERE username = ?`,
            [admin.username]
        );

        // Log action
        await logAdminAction(admin.username, 'account_approved', {
            result: 'success',
            approvedBy: req.session.superAdminUsername,
            emailVerified: emailVerified
        });

        // Send approval notification email
        try {
            await sendEmail(
                admin.email,
                'District Admin Account Approved - You Can Now Login!',
                `
                <h2>🎉 Your District Admin Account Has Been Approved!</h2>
                <p>Dear ${admin.fullName || admin.username},</p>
                <p>Great news! Your registration request for District Admin access has been approved by the Super Administrator.</p>
                
                ${!emailVerified ? `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <strong>⚠️ Important:</strong> Please verify your email before logging in if you haven't already.
                </div>
                ` : ''}
                
                <h3>Your Account Details:</h3>
                <ul>
                    <li><strong>Username:</strong> ${admin.username}</li>
                    <li><strong>Email:</strong> ${admin.email}</li>
                    <li><strong>District:</strong> ${admin.district_name}</li>
                    <li><strong>Designation:</strong> ${admin.designation}</li>
                    <li><strong>Email Verified:</strong> ${emailVerified ? '✅ Yes' : '❌ Not yet'}</li>
                </ul>
                
                <p>You can now login to the Admin Dashboard:</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/adminLogin" style="display: inline-block; margin: 15px 0; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Login to Dashboard
                </a>
                
                <p><strong>Note:</strong> Two-factor authentication (OTP) will be required for each login for enhanced security.</p>
                
                <hr>
                <p style="color: #666; font-size: 12px;">
                    This is an official notification from the SecureVoice Crime Reporting System.<br>
                    If you did not request this account, please contact the Super Administrator immediately.
                </p>
                `
            );
        } catch (emailErr) {
            console.error('Error sending approval email:', emailErr);
            return res.status(500).json({
                success: false,
                message: "Admin approved but failed to send email notification"
            });
        }

        res.json({
            success: true,
            message: `Admin ${admin.username} has been approved and can now login.`,
            emailVerified: emailVerified
        });

    } catch (err) {
        console.error("Error approving admin:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== REJECT ADMIN REQUEST ==========
exports.rejectAdminRequest = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { adminId, rejectionReason } = req.body;

        if (!adminId || !rejectionReason) {
            return res.status(400).json({
                success: false,
                message: "Admin ID and rejection reason are required"
            });
        }

        // Get admin details by ID
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE adminid = ?',
            [adminId]
        );

        if (adminResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const admin = adminResults[0];

        // Update workflow status to rejected
        await pool.query(
            `UPDATE admin_approval_workflow 
            SET status = 'rejected',
                rejection_reason = ?,
                approval_date = NOW(),
                approved_by = ?
            WHERE admin_username = ?`,
            [rejectionReason, req.session.superAdminUsername, admin.username]
        );

        // Send rejection email
        try {
            await sendEmail(
                admin.email,
                'District Admin Registration Request Rejected',
                `
                <h2>Registration Request Update</h2>
                <p>Dear ${admin.fullName || admin.username},</p>
                <p>We regret to inform you that your registration request for District Admin access has been rejected.</p>
                
                <h3>Reason for Rejection:</h3>
                <p style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #f44336;">
                    ${rejectionReason}
                </p>
                
                <p>If you believe this is an error or have additional documentation to support your request, 
                please contact the Super Administrator at ${process.env.SUPER_ADMIN_EMAIL || 'superadmin@crime.gov.bd'}.</p>
                
                <hr>
                <p style="color: #666; font-size: 12px;">
                    This is an official notification from the SecureVoice Crime Reporting System.
                </p>
                `
            );
        } catch (emailErr) {
            console.error('Error sending rejection email:', emailErr);
        }

        res.json({
            success: true,
            message: `Admin has been rejected.`
        });

    } catch (err) {
        console.error("Error rejecting admin:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== SUSPEND ADMIN ACCOUNT ==========
exports.suspendAdminAccount = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { adminId, reason } = req.body;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        // Get admin username
        const [adminResults] = await pool.query(
            'SELECT username FROM admins WHERE adminid = ?',
            [adminId]
        );

        if (adminResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const username = adminResults[0].username;

        // Update workflow status
        await pool.query(
            `UPDATE admin_approval_workflow 
            SET status = 'suspended',
                rejection_reason = ?
            WHERE admin_username = ?`,
            [reason || 'Account suspended by Super Admin', username]
        );

        // Deactivate admin account
        await pool.query(
            `UPDATE admins 
            SET is_active = 0
            WHERE username = ?`,
            [username]
        );

        res.json({
            success: true,
            message: `Admin has been suspended.`
        });

    } catch (err) {
        console.error("Error suspending admin:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== REACTIVATE ADMIN ACCOUNT ==========
exports.reactivateAdminAccount = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        // Get admin username
        const [adminResults] = await pool.query(
            'SELECT username FROM admins WHERE adminid = ?',
            [adminId]
        );

        if (adminResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const username = adminResults[0].username;

        // Update workflow status
        await pool.query(
            `UPDATE admin_approval_workflow 
            SET status = 'approved',
                rejection_reason = NULL
            WHERE admin_username = ?`,
            [username]
        );

        // Activate admin account
        await pool.query(
            `UPDATE admins 
            SET is_active = 1
            WHERE username = ?`,
            [username]
        );

        res.json({
            success: true,
            message: `Admin has been reactivated.`
        });

    } catch (err) {
        console.error("Error reactivating admin:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET AUDIT LOGS ==========
exports.getAuditLogs = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { username, dateFrom, dateTo, limit } = req.query;

        let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
        const params = [];

        if (username) {
            query += ' AND admin_username = ?';
            params.push(username);
        }

        if (dateFrom) {
            query += ' AND DATE(timestamp) >= ?';
            params.push(dateFrom);
        }

        if (dateTo) {
            query += ' AND DATE(timestamp) <= ?';
            params.push(dateTo);
        }

        query += ' ORDER BY timestamp DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        } else {
            query += ' LIMIT 500';
        }

        const [logs] = await pool.query(query, params);

        res.json({
            success: true,
            logs: logs
        });

    } catch (err) {
        console.error("Error fetching audit logs:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET DASHBOARD STATISTICS ==========
exports.getSuperAdminStats = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        // Get counts from admin_approval_workflow table
        const [pendingCount] = await pool.query('SELECT COUNT(*) as count FROM admin_approval_workflow WHERE status = "pending"');
        const [approvedCount] = await pool.query('SELECT COUNT(*) as count FROM admin_approval_workflow WHERE status = "approved"');
        const [rejectedCount] = await pool.query('SELECT COUNT(*) as count FROM admin_approval_workflow WHERE status = "rejected"');
        const [suspendedCount] = await pool.query('SELECT COUNT(*) as count FROM admin_approval_workflow WHERE status = "suspended"');
        const [activeCount] = await pool.query('SELECT COUNT(*) as count FROM admins WHERE is_active = 1');

        // Get average approval time (in hours)
        const [avgApprovalTime] = await pool.query(`
            SELECT AVG(TIMESTAMPDIFF(HOUR, request_date, approval_date)) as avg_hours
            FROM admin_approval_workflow
            WHERE approval_date IS NOT NULL AND status = 'approved'
        `);

        // Get total actions from audit logs
        const [totalActions] = await pool.query('SELECT COUNT(*) as count FROM admin_audit_logs');

        // Get district distribution
        const [districtStats] = await pool.query(`
            SELECT 
                a.district_name as district,
                SUM(CASE WHEN aw.status = 'approved' AND a.is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN aw.status = 'suspended' THEN 1 ELSE 0 END) as suspended,
                COUNT(*) as total
            FROM admins a
            JOIN admin_approval_workflow aw ON a.username = aw.admin_username
            WHERE aw.status IN ('approved', 'active', 'suspended')
            GROUP BY a.district_name
            ORDER BY a.district_name
        `);

        res.json({
            success: true,
            pendingRequests: pendingCount[0].count,
            approvedAdmins: approvedCount[0].count,
            activeAdmins: activeCount[0].count,
            suspendedAdmins: suspendedCount[0].count,
            rejectedAdmins: rejectedCount[0].count,
            avgApprovalTime: Math.round(avgApprovalTime[0].avg_hours || 0),
            totalActions: totalActions[0].count,
            districtStats: districtStats
        });

    } catch (err) {
        console.error("Error fetching super admin stats:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET ADMIN DETAILS ==========
exports.getAdminDetails = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { adminId } = req.params;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        // Get admin details with workflow information
        const [adminResults] = await pool.query(`
            SELECT 
                a.adminid as admin_id,
                a.username,
                a.email,
                a.fullName as full_name,
                a.phone,
                a.designation,
                a.official_id,
                a.district_name,
                a.dob,
                a.is_active,
                a.created_at,
                a.last_login,
                aw.status as approval_status,
                aw.request_date,
                aw.approval_date as approved_at,
                aw.approved_by,
                aw.rejection_reason,
                sa.username as approved_by_username
            FROM admins a
            JOIN admin_approval_workflow aw ON a.username = aw.admin_username
            LEFT JOIN super_admins sa ON aw.approved_by = sa.username
            WHERE a.adminid = ?
        `, [adminId]);

        if (adminResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.json({
            success: true,
            admin: adminResults[0]
        });

    } catch (err) {
        console.error("Error fetching admin details:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== CHECK SUPER ADMIN AUTH ==========
exports.checkSuperAdminAuth = async (req, res) => {
    try {
        if (req.session.superAdminId && req.session.isSuperAdmin) {
            return res.json({
                success: true,
                authenticated: true,
                superAdmin: {
                    id: req.session.superAdminId,
                    username: req.session.superAdminUsername
                }
            });
        }
        res.status(401).json({
            success: false,
            authenticated: false
        });
    } catch (err) {
        console.error("Check auth error:", err);
        res.status(500).json({
            success: false,
            authenticated: false,
            message: "Server error"
        });
    }
};

// ========== SUPER ADMIN LOGOUT ==========
exports.superAdminLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Error logging out"
                });
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: "Logged out successfully"
            });
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== GET SUPER ADMIN SETTINGS ==========
exports.getSuperAdminSettings = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        // Get settings from session or database (for now using session)
        const settings = req.session.superAdminSettings || {
            notifyNewRegistration: true,
            notifyEmail: true,
            notifyBrowser: false,
            autoLogout: true
        };

        res.json({
            success: true,
            settings: settings
        });
    } catch (err) {
        console.error("Error fetching settings:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== SAVE SUPER ADMIN SETTINGS ==========
exports.saveSuperAdminSettings = async (req, res) => {
    try {
        if (!req.session.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const { notifyNewRegistration, notifyEmail, notifyBrowser, autoLogout } = req.body;

        // Save to session (could be extended to save to database)
        req.session.superAdminSettings = {
            notifyNewRegistration: notifyNewRegistration !== false,
            notifyEmail: notifyEmail !== false,
            notifyBrowser: notifyBrowser === true,
            autoLogout: autoLogout !== false
        };

        res.json({
            success: true,
            message: "Settings saved successfully"
        });
    } catch (err) {
        console.error("Error saving settings:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = exports;
