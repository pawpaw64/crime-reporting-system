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
                a.adminid, a.username, a.email, a.fullName, a.phone, a.designation, 
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
            a.adminid, a.username, a.email, a.fullName, a.phone, a.designation, 
            a.official_id, a.district_name, a.is_active, a.last_login,
            aw.status, aw.request_date, aw.approval_date, aw.approved_by, aw.rejection_reason
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
            requests: requests
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

        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Admin username is required"
            });
        }

        // Get admin details
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
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
            [username]
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

        // Generate password setup token
        const passwordToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Generate email verification token
        const emailToken = crypto.randomBytes(32).toString('hex');

        // Update workflow status to approved
        await pool.query(
            `UPDATE admin_approval_workflow 
            SET status = 'approved',
                approval_date = NOW(),
                approved_by = ?
            WHERE admin_username = ?`,
            [req.session.superAdminUsername, username]
        );

        // Insert password setup token
        await pool.query(
            `INSERT INTO admin_verification_tokens 
            (admin_username, token_type, token_value, expires_at, is_used)
            VALUES (?, 'password_setup', ?, ?, 0)`,
            [username, passwordToken, tokenExpiry]
        );

        // Insert email verification token
        await pool.query(
            `INSERT INTO admin_verification_tokens 
            (admin_username, token_type, token_value, expires_at, is_used)
            VALUES (?, 'email_verification', ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 0)`,
            [username, emailToken]
        );

        // Send approval email with password setup link
        const passwordSetupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-password-setup?token=${passwordToken}`;
        const emailVerifyLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-admin-email?token=${emailToken}`;

        try {
            await sendEmail(
                admin.email,
                'District Admin Account Approved',
                `
                <h2>Your District Admin Account Has Been Approved!</h2>
                <p>Dear ${admin.fullName || admin.username},</p>
                <p>Your registration request for District Admin access has been approved by the Super Administrator.</p>
                
                <h3>Next Steps:</h3>
                <ol>
                    <li><strong>Set Your Password:</strong> Click the link below to create your secure password:
                        <br><a href="${passwordSetupLink}" style="display: inline-block; margin: 10px 0; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Set Password</a>
                        <br><small>This link will expire in 24 hours.</small>
                    </li>
                    <li><strong>Verify Your Email:</strong> Click here to verify your email address:
                        <br><a href="${emailVerifyLink}" style="display: inline-block; margin: 10px 0; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    </li>
                </ol>
                
                <h3>Your Account Details:</h3>
                <ul>
                    <li><strong>Username:</strong> ${admin.username}</li>
                    <li><strong>Email:</strong> ${admin.email}</li>
                    <li><strong>District:</strong> ${admin.district_name}</li>
                    <li><strong>Designation:</strong> ${admin.designation}</li>
                </ul>
                
                <p>After completing password setup and email verification, you can login at:</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/adminLogin">Admin Login Page</a></p>
                
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
            message: `Admin ${username} has been approved. Password setup email sent.`
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

        const { username, reason } = req.body;

        if (!username || !reason) {
            return res.status(400).json({
                success: false,
                message: "Username and rejection reason are required"
            });
        }

        // Get admin details
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
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
            [reason, req.session.superAdminUsername, username]
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
                    ${reason}
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
            message: `Admin ${username} has been rejected.`
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

        const { username, reason } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Admin username is required"
            });
        }

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
            message: `Admin ${username} has been suspended.`
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

        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Admin username is required"
            });
        }

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
            message: `Admin ${username} has been reactivated.`
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

        const { adminUsername, action, startDate, endDate, limit } = req.query;

        const filters = {
            adminUsername,
            action,
            startDate,
            endDate,
            limit: parseInt(limit) || 500
        };

        const logs = await getAllAuditLogs(filters);

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

        // Get recent activity
        const [recentActivity] = await pool.query(
            'SELECT * FROM admin_audit_logs ORDER BY timestamp DESC LIMIT 20'
        );

        res.json({
            success: true,
            stats: {
                pending: pendingCount[0].count,
                approved: approvedCount[0].count,
                rejected: rejectedCount[0].count,
                suspended: suspendedCount[0].count,
                active: activeCount[0].count
            },
            recentActivity: recentActivity
        });

    } catch (err) {
        console.error("Error fetching super admin stats:", err);
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

module.exports = exports;
