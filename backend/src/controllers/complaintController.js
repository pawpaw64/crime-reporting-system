const pool = require('../db');
const path = require('path');
const fs = require('fs');
const {
    findAdminByLocation,
    getOrCreateLocation,
    getCategoryId
} = require('../utils/helperUtils');

// Submit Complaint
exports.submitComplaint = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { complaintType, description, incidentDate, location } = req.body;
        const username = req.session.username;

        if (!complaintType || !description || !incidentDate || !location) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Find admin for location
        const adminData = await findAdminByLocation(location);

        if (!adminData) {
            return res.status(400).json({
                success: false,
                message: "No authority from this district is available right now"
            });
        }

        const { adminUsername, districtName } = adminData;

        // Get or create location
        const locationId = await getOrCreateLocation(location, districtName);

        // Get category ID
        const categoryId = await getCategoryId(complaintType);

        const formattedDate = new Date(incidentDate).toISOString().slice(0, 19).replace('T', ' ');
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Insert complaint
        const [complaintResult] = await pool.query(
            `INSERT INTO complaint (
                description, created_at, status, username, admin_username, 
                location_id, complaint_type, location_address, category_id
            ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
            [description, formattedDate, username, adminUsername, locationId, complaintType, location, categoryId]
        );

        const complaintId = complaintResult.insertId;

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                let fileType;
                if (file.mimetype.startsWith('image/')) fileType = 'image';
                else if (file.mimetype.startsWith('video/')) fileType = 'video';
                else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

                let relativePath;
                if (file.mimetype.startsWith('image/')) {
                    relativePath = `images/${file.filename}`;
                } else if (file.mimetype.startsWith('video/')) {
                    relativePath = `videos/${file.filename}`;
                } else if (file.mimetype.startsWith('audio/')) {
                    relativePath = `audio/${file.filename}`;
                } else {
                    relativePath = file.filename;
                }

                await pool.query(
                    `INSERT INTO evidence (uploaded_at, file_type, file_path, complaint_id)
                     VALUES (?, ?, ?, ?)`,
                    [createdAt, fileType, relativePath, complaintId]
                );
            }
        }

        res.json({
            success: true,
            message: "Complaint submitted successfully!",
            complaintId: complaintId,
            complaint: {
                id: complaintId,
                type: complaintType,
                status: 'pending',
                location: location,
                createdAt: createdAt
            }
        });
    } catch (err) {
        console.error("Submit complaint error:", err);
        res.status(500).json({ success: false, message: "Error submitting complaint" });
    }
};

// Notify Admin
exports.notifyAdmin = async (req, res) => {
    try {
        const { complaintId } = req.body;

        if (!complaintId) {
            return res.status(400).json({ success: false, message: "Complaint ID is required" });
        }

        const [results] = await pool.query(
            `SELECT c.*, u.fullName as user_fullname, a.email as admin_email 
             FROM complaint c 
             JOIN users u ON c.username = u.username 
             LEFT JOIN admins a ON c.admin_username = a.username
             WHERE c.complaint_id = ?`,
            [complaintId]
        );

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Complaint not found" });
        }

        const complaint = results[0];

        res.json({
            success: true,
            message: "Admin notified successfully",
            complaint: {
                id: complaint.complaint_id,
                type: complaint.complaint_type,
                username: complaint.username,
                user_fullname: complaint.user_fullname,
                description: complaint.description,
                location: complaint.location_address,
                submittedDate: complaint.created_at
            },
            adminEmail: complaint.admin_email
        });
    } catch (err) {
        console.error("Notify admin error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Delete Complaint
exports.deleteComplaint = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const complaintId = req.params.id;
        const userId = req.session.userId;

        // Check if complaint exists
        const [results] = await pool.query(
            'SELECT * FROM complaint WHERE complaint_id = ? AND username = (SELECT username FROM users WHERE userid = ?) AND status = "pending"',
            [complaintId, userId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found or cannot be deleted (must be in pending status)"
            });
        }

        // Get evidence files
        const [evidenceFiles] = await pool.query(
            'SELECT file_path FROM evidence WHERE complaint_id = ?',
            [complaintId]
        );

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Delete evidence from DB
            await connection.query('DELETE FROM evidence WHERE complaint_id = ?', [complaintId]);

            // Delete status updates
            await connection.query('DELETE FROM status_updates WHERE complaint_id = ?', [complaintId]);

            // Delete complaint
            const [deleteResult] = await connection.query(
                'DELETE FROM complaint WHERE complaint_id = ? AND username = (SELECT username FROM users WHERE userid = ?)',
                [complaintId, userId]
            );

            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: "Complaint not found" });
            }

            await connection.commit();
            connection.release();

            // Delete physical files
            evidenceFiles.forEach(file => {
                if (file.file_path) {
                    const rootDir = path.join(__dirname, '../..');
                    const filePath = path.join(rootDir, 'uploads', file.file_path);
                    fs.unlink(filePath, (err) => {
                        if (err) console.error(`Error deleting file ${filePath}:`, err);
                    });
                }
            });

            res.json({ success: true, message: "Complaint deleted successfully" });
        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
    } catch (err) {
        console.error("Delete complaint error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Serve Complaint Form
exports.serveComplaintForm = (req, res) => {
    res.sendFile(path.join(__dirname, '../../../frontend/src/pages/complain.html'));
};

// Get User Complaints
exports.getUserComplaints = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const username = req.session.username;

        const [complaints] = await pool.query(
            `SELECT c.*, 
                    l.location_name, l.district_name,
                    cat.name as category_name
             FROM complaint c
             LEFT JOIN location l ON c.location_id = l.location_id
             LEFT JOIN category cat ON c.category_id = cat.category_id
             WHERE c.username = ?
             ORDER BY c.created_at DESC`,
            [username]
        );

        // Get evidence for each complaint
        for (let complaint of complaints) {
            const [evidence] = await pool.query(
                'SELECT * FROM evidence WHERE complaint_id = ?',
                [complaint.complaint_id]
            );
            complaint.evidence = evidence;
        }

        res.json({
            success: true,
            complaints: complaints
        });
    } catch (err) {
        console.error("Get user complaints error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Get Complaint Notifications
exports.getComplaintNotifications = async (req, res) => {
    try {
        const { complaint_id } = req.params;
        const username = req.session.username;

        // Check if user owns this complaint
        const [ownership] = await pool.query(
            'SELECT complaint_id FROM complaint WHERE complaint_id = ? AND username = ?',
            [complaint_id, username]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Get unread messages from admin
        const [notifications] = await pool.query(
            `SELECT * FROM complaint_chat 
             WHERE complaint_id = ? AND sender_type = 'admin' AND is_read = 0
             ORDER BY sent_at DESC`,
            [complaint_id]
        );

        res.json({
            success: true,
            notifications: notifications,
            unreadCount: notifications.length
        });
    } catch (err) {
        console.error("Get complaint notifications error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Mark Notifications as Read
exports.markNotificationsRead = async (req, res) => {
    try {
        const { complaint_id } = req.params;
        const username = req.session.username;

        // Check ownership
        const [ownership] = await pool.query(
            'SELECT complaint_id FROM complaint WHERE complaint_id = ? AND username = ?',
            [complaint_id, username]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        await pool.query(
            `UPDATE complaint_chat SET is_read = 1 
             WHERE complaint_id = ? AND sender_type = 'admin'`,
            [complaint_id]
        );

        res.json({ success: true, message: "Notifications marked as read" });
    } catch (err) {
        console.error("Mark notifications read error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Get Complaint Chat
exports.getComplaintChat = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const username = req.session.username;

        // Check ownership
        const [ownership] = await pool.query(
            'SELECT complaint_id FROM complaint WHERE complaint_id = ? AND username = ?',
            [complaintId, username]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [messages] = await pool.query(
            `SELECT * FROM complaint_chat 
             WHERE complaint_id = ?
             ORDER BY sent_at ASC`,
            [complaintId]
        );

        res.json({
            success: true,
            messages: messages
        });
    } catch (err) {
        console.error("Get complaint chat error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Send Chat Message
exports.sendChatMessage = async (req, res) => {
    try {
        const { complaintId, message } = req.body;
        const username = req.session.username;

        // Check ownership
        const [ownership] = await pool.query(
            'SELECT complaint_id FROM complaint WHERE complaint_id = ? AND username = ?',
            [complaintId, username]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [result] = await pool.query(
            `INSERT INTO complaint_chat (complaint_id, sender_type, sender_username, message)
             VALUES (?, 'user', ?, ?)`,
            [complaintId, username, message]
        );

        res.json({
            success: true,
            message: "Message sent successfully",
            chatId: result.insertId
        });
    } catch (err) {
        console.error("Send chat message error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const username = req.session.username;

        // Get total complaints
        const [totalResult] = await pool.query(
            'SELECT COUNT(*) as total FROM complaint WHERE username = ?',
            [username]
        );

        // Get complaints by status
        const [statusResult] = await pool.query(
            `SELECT status, COUNT(*) as count FROM complaint 
             WHERE username = ? GROUP BY status`,
            [username]
        );

        // Get recent complaints
        const [recentComplaints] = await pool.query(
            `SELECT complaint_id, complaint_type, status, created_at 
             FROM complaint WHERE username = ? 
             ORDER BY created_at DESC LIMIT 5`,
            [username]
        );

        const stats = {
            total: totalResult[0].total,
            pending: 0,
            verifying: 0,
            investigating: 0,
            resolved: 0
        };

        statusResult.forEach(row => {
            stats[row.status] = row.count;
        });

        res.json({
            success: true,
            stats: stats,
            recentComplaints: recentComplaints
        });
    } catch (err) {
        console.error("Get dashboard stats error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};