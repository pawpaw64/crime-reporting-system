const pool = require('../db');
const { createNotification } = require('../utils/notificationUtils');

// Get Admin Dashboard
exports.getAdminDashboard = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.redirect('/adminLogin');
        }

        const adminUsername = req.session.adminUsername;

        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE adminid = ?',
            [req.session.adminId]
        );

        if (adminResults.length === 0) {
            req.session.destroy();
            return res.redirect('/adminLogin');
        }

        const complaintsQuery = `
            SELECT 
                c.complaint_id,
                c.username as complainant_username,
                COALESCE(u.fullName, 'N/A') as complainant_fullname,
                COALESCE(c.complaint_type, 'General') as complaint_type,
                c.created_at,
                c.status,
                COALESCE(c.description, '') as description,
                COALESCE(c.location_address, '') as location_address,
                COALESCE(ac.last_updated, c.created_at) as last_updated
            FROM complaint c 
            INNER JOIN users u ON c.username = u.username
            LEFT JOIN admin_cases ac ON c.complaint_id = ac.complaint_id AND ac.admin_username = ?
            WHERE c.admin_username = ?
            ORDER BY c.created_at DESC
        `;

        const [complaintsResults] = await pool.query(complaintsQuery, [adminUsername, adminUsername]);

        const usersQuery = `
            SELECT DISTINCT 
                u.username,
                u.fullName,
                u.email,
                u.phone,
                u.location,
                u.age
            FROM users u 
            INNER JOIN complaint c ON u.username = c.username 
            WHERE c.admin_username = ?
            ORDER BY u.fullName ASC
        `;

        const [usersResults] = await pool.query(usersQuery, [adminUsername]);

        res.set({
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        });

        res.render('admin-page', {
            admin: adminResults[0],
            complaints: complaintsResults,
            users: usersResults
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Error loading dashboard");
    }
};

// Get Admin Settings
exports.getAdminSettings = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const [results] = await pool.query(
            'SELECT * FROM admin_settings WHERE admin_username = ?',
            [req.session.adminUsername]
        );

        if (results.length === 0) {
            const defaultSettings = { dark_mode: false, email_notifications: true };
            await pool.query(
                'INSERT INTO admin_settings (admin_username, dark_mode, email_notifications) VALUES (?, ?, ?)',
                [req.session.adminUsername, defaultSettings.dark_mode, defaultSettings.email_notifications]
            );
            return res.json({ success: true, settings: defaultSettings });
        }

        res.json({ success: true, settings: results[0] });
    } catch (err) {
        console.error("Get settings error:", err);
        res.status(500).json({ success: false, message: "Error fetching settings" });
    }
};

// Update Admin Settings
exports.updateAdminSettings = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { dark_mode, email_notifications } = req.body;

        await pool.query(
            `INSERT INTO admin_settings (admin_username, dark_mode, email_notifications) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             dark_mode = VALUES(dark_mode), 
             email_notifications = VALUES(email_notifications),
             updated_at = CURRENT_TIMESTAMP`,
            [req.session.adminUsername, dark_mode, email_notifications]
        );

        res.json({ success: true, message: "Settings updated successfully" });
    } catch (err) {
        console.error("Update settings error:", err);
        res.status(500).json({ success: false, message: "Error updating settings" });
    }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { fullName, dob } = req.body;

        const [result] = await pool.query(
            "UPDATE admins SET fullName = ?, dob = ? WHERE adminid = ?",
            [fullName, dob, req.session.adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "No admin updated" });
        }

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
};

// Get Chat Messages (Admin)
exports.getAdminChat = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Please log in as admin" });
        }

        const complaintId = req.params.complaintId;
        const adminUsername = req.session.adminUsername;

        const [results] = await pool.query(
            'SELECT admin_username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Complaint not found" });
        }

        if (results[0].admin_username !== adminUsername) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [messages] = await pool.query(
            `SELECT * FROM complaint_chat 
             WHERE complaint_id = ? 
             ORDER BY sent_at ASC`,
            [complaintId]
        );

        res.json({ success: true, messages: messages });
    } catch (err) {
        console.error("Get chat error:", err);
        res.status(500).json({ success: false, message: "Error fetching messages" });
    }
};

// Send Chat Message (Admin)
exports.sendAdminChatMessage = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Please log in as admin" });
        }

        const { complaintId, message } = req.body;
        const adminUsername = req.session.adminUsername;

        if (!complaintId || !message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Check for duplicates
        const [duplicates] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM complaint_chat 
             WHERE complaint_id = ? AND sender_username = ? AND sender_type = 'admin'
             AND message = ? AND sent_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)`,
            [complaintId, adminUsername, message.trim()]
        );

        if (duplicates[0].count > 0) {
            return res.status(429).json({ success: false, message: "Duplicate message detected" });
        }

        // Verify complaint
        const [results] = await pool.query(
            'SELECT admin_username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (results.length === 0 || results[0].admin_username !== adminUsername) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Insert message
        await pool.query(
            `INSERT INTO complaint_chat (complaint_id, sender_type, sender_username, message, sent_at) 
             VALUES (?, 'admin', ?, ?, NOW())`,
            [complaintId, adminUsername, message.trim()]
        );

        // Create notification
        await createNotification(complaintId, `New message from admin regarding complaint #${complaintId}`, 'admin_comment');

        res.json({ success: true, message: "Message sent successfully" });
    } catch (err) {
        console.error("Send chat message error:", err);
        res.status(500).json({ success: false, message: "Error sending message" });
    }
};

// Get Complaint Evidence
exports.getComplaintEvidence = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const complaintId = req.params.complaintId;
        const adminUsername = req.session.adminUsername;

        const [complaintResults] = await pool.query(
            "SELECT * FROM complaint WHERE complaint_id = ? AND admin_username = ?",
            [complaintId, adminUsername]
        );

        if (complaintResults.length === 0) {
            return res.status(404).json({ success: false, message: "Complaint not found" });
        }

        const [evidenceResults] = await pool.query(
            "SELECT * FROM evidence WHERE complaint_id = ?",
            [complaintId]
        );

        res.json({
            success: true,
            evidence: evidenceResults,
            complaint: complaintResults[0]
        });
    } catch (err) {
        console.error("Get evidence error:", err);
        res.status(500).json({ success: false, message: "Error fetching evidence" });
    }
};

// Get Admin Cases (with filters)
exports.getAdminCases = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const adminUsername = req.session.adminUsername;
        const { username, dateFrom, dateTo } = req.query;

        let casesQuery = `
            SELECT 
                c.complaint_id,
                c.username as complainant_username,
                COALESCE(u.fullName, 'N/A') as complainant_fullname,
                COALESCE(c.complaint_type, 'General') as complaint_type,
                c.created_at,
                c.status,
                COALESCE(c.description, '') as description,
                COALESCE(c.location_address, '') as location_address,
                COALESCE(ac.last_updated, c.created_at) as last_updated
            FROM complaint c 
            INNER JOIN users u ON c.username = u.username
            LEFT JOIN admin_cases ac ON c.complaint_id = ac.complaint_id AND ac.admin_username = ?
            WHERE c.admin_username = ?
        `;

        const queryParams = [adminUsername, adminUsername];

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

        const [results] = await pool.query(casesQuery, queryParams);

        const analytics = {
            total: results.length,
            pending: results.filter(c => c.status === 'pending').length,
            verifying: results.filter(c => c.status === 'verifying').length,
            investigating: results.filter(c => c.status === 'investigating').length,
            resolved: results.filter(c => c.status === 'resolved').length
        };

        res.json({ success: true, cases: results, analytics: analytics });
    } catch (err) {
        console.error("Get cases error:", err);
        res.status(500).json({ success: false, message: "Error fetching cases" });
    }
};

// Update Complaint Status
exports.updateComplaintStatus = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const { complaintId, newStatus } = req.body;
        const adminUsername = req.session.adminUsername;

        if (!complaintId || !newStatus) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const complaintIdInt = parseInt(complaintId);
        if (isNaN(complaintIdInt)) {
            return res.status(400).json({ success: false, message: "Invalid complaint_id format" });
        }

        // Verify complaint
        const [results] = await pool.query(
            'SELECT admin_username FROM complaint WHERE complaint_id = ?',
            [complaintIdInt]
        );

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        if (results[0].admin_username !== adminUsername) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update complaint status
            await connection.query(
                'UPDATE complaint SET status = ? WHERE complaint_id = ?',
                [newStatus, complaintIdInt]
            );

            // Insert status update
            await connection.query(
                'INSERT INTO status_updates (complaint_id, status, updated_by, updated_at) VALUES (?, ?, ?, NOW())',
                [complaintIdInt, newStatus, adminUsername]
            );

            // Update admin cases
            await connection.query(
                `INSERT INTO admin_cases (complaint_id, admin_username, complainant_username, status, last_updated) 
                 SELECT ?, ?, c.username, ?, NOW()
                 FROM complaint c 
                 WHERE c.complaint_id = ?
                 ON DUPLICATE KEY UPDATE 
                 status = VALUES(status), 
                 last_updated = VALUES(last_updated)`,
                [complaintIdInt, adminUsername, newStatus, complaintIdInt]
            );

            // Create notification
            const notificationMessage = `Your complaint #${complaintIdInt} status has been updated to: ${newStatus.toUpperCase()}`;
            await connection.query(
                'INSERT INTO complaint_notifications (complaint_id, message, type, created_at) VALUES (?, ?, ?, NOW())',
                [complaintIdInt, notificationMessage, 'status_change']
            );

            await connection.commit();
            connection.release();

            res.json({ success: true, message: 'Complaint status updated successfully' });
        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
    } catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({ success: false, message: "Error updating status" });
    }
};