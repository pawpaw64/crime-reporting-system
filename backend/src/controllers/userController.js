const pool = require('../db');
const { calculateAge } = require('../utils/helperUtils');

// Get User Profile
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/signup');
        }

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        const [results] = await pool.query(
            'SELECT * FROM users WHERE userid = ?',
            [req.session.userId]
        );

        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        res.render('profile', {
            user: results[0],
            calculateAge: calculateAge
        });
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).send("Error fetching user data");
    }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { fullName, phone, location, dob } = req.body;
        let age = null;

        if (dob) {
            age = calculateAge(dob);
        }

        const [result] = await pool.query(
            "UPDATE users SET fullName = ?, phone = ?, dob = ?, location = ?, age = ? WHERE userid = ?",
            [fullName, phone, dob, location, age, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "No user updated" });
        }

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
};

// Get User Data
exports.getUserData = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const [results] = await pool.query(
            'SELECT fullName, email, phone, location, dob FROM users WHERE userid = ?',
            [req.session.userId]
        );

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user: results[0] });
    } catch (err) {
        console.error("Get user data error:", err);
        res.status(500).json({ success: false, message: "Error fetching user data" });
    }
};

// Get My Complaints
exports.getMyComplaints = async (req, res) => {
    try {
        if (!req.session.userId && !req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const [complaints] = await pool.query(
            `SELECT 
                c.complaint_id,
                c.description,
                c.created_at,
                c.status,
                c.complaint_type,
                c.location_address,
                COALESCE(evidence_count.count, 0) as evidence_count,
                COALESCE(notification_count.unread_notifications, 0) as unread_notifications
            FROM complaint c
            LEFT JOIN (
                SELECT complaint_id, COUNT(*) as count
                FROM evidence
                GROUP BY complaint_id
            ) evidence_count ON c.complaint_id = evidence_count.complaint_id
            LEFT JOIN (
                SELECT complaint_id, COUNT(*) as unread_notifications
                FROM complaint_notifications
                WHERE is_read = 0
                GROUP BY complaint_id
            ) notification_count ON c.complaint_id = notification_count.complaint_id
            WHERE c.username = ?
            ORDER BY c.created_at DESC`,
            [req.session.username]
        );

        res.json({ success: true, complaints: complaints });
    } catch (err) {
        console.error("Get complaints error:", err);
        res.status(500).json({ success: false, message: "Error fetching complaints" });
    }
};

// Get Complaint Notifications
exports.getComplaintNotifications = async (req, res) => {
    try {
        if (!req.session.userId && !req.session.username) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const complaint_id = req.params.complaint_id;
        const username = req.session.username;

        // Verify ownership
        const [verifyResult] = await pool.query(
            'SELECT username FROM complaint WHERE complaint_id = ?',
            [complaint_id]
        );

        if (verifyResult.length === 0 || verifyResult[0].username !== username) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [notifications] = await pool.query(
            `SELECT notification_id, message, type, is_read, created_at
             FROM complaint_notifications 
             WHERE complaint_id = ? 
             ORDER BY created_at DESC`,
            [complaint_id]
        );

        res.json({ success: true, notifications: notifications });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
};

// Mark Notifications as Read
exports.markNotificationsRead = async (req, res) => {
    try {
        if (!req.session.userId && !req.session.username) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const complaint_id = req.params.complaint_id;
        const username = req.session.username;

        // Verify ownership
        const [verifyResult] = await pool.query(
            'SELECT username FROM complaint WHERE complaint_id = ?',
            [complaint_id]
        );

        if (verifyResult.length === 0 || verifyResult[0].username !== username) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        await pool.query(
            'UPDATE complaint_notifications SET is_read = 1 WHERE complaint_id = ? AND is_read = 0',
            [complaint_id]
        );

        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (err) {
        console.error("Mark notifications error:", err);
        res.status(500).json({ success: false, message: "Error updating notifications" });
    }
};

// Get Complaint Chat
exports.getComplaintChat = async (req, res) => {
    try {
        if (!req.session.userId && !req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const complaintId = req.params.complaintId;
        const username = req.session.username;

        // Verify ownership
        const [results] = await pool.query(
            'SELECT username FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (results.length === 0 || results[0].username !== username) {
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

// Send Chat Message
exports.sendChatMessage = async (req, res) => {
    try {
        if (!req.session.userId && !req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const { complaint_id, message } = req.body;
        const username = req.session.username;

        if (!complaint_id || !message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Verify ownership
        const [results] = await pool.query(
            'SELECT username FROM complaint WHERE complaint_id = ?',
            [complaint_id]
        );

        if (results.length === 0 || results[0].username !== username) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        await pool.query(
            `INSERT INTO complaint_chat (complaint_id, sender_type, sender_username, message, sent_at) 
             VALUES (?, 'user', ?, ?, NOW())`,
            [complaint_id, username, message.trim()]
        );

        res.json({ success: true, message: "Message sent successfully" });
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ success: false, message: "Error sending message" });
    }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        if (!req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const [results] = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM complaint 
             WHERE username = ?
             GROUP BY status`,
            [req.session.username]
        );

        const stats = {
            pending: 0,
            verifying: 0,
            investigating: 0,
            resolved: 0,
            total: 0
        };

        results.forEach(row => {
            stats[row.status] = row.count;
            stats.total += row.count;
        });

        res.json({ success: true, stats: stats });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ success: false, message: "Error fetching stats" });
    }
};