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
            complaintId: complaintId
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

// Serve Complaint Form
exports.serveComplaintForm = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        res.json({ success: true, authenticated: true });
    } catch (err) {
        console.error("Serve complaint form error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get User Complaints
exports.getUserComplaints = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const userId = req.session.userId;

        const [complaints] = await pool.query(
            `SELECT c.complaint_id, c.complaint_type, c.description, c.created_at, 
                    c.status, c.location_address, c.admin_username
             FROM complaint c
             JOIN users u ON c.username = u.username
             WHERE u.userid = ?
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json({ success: true, complaints });
    } catch (err) {
        console.error("Get user complaints error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Get Complaint Notifications
exports.getComplaintNotifications = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const complaintId = req.params.complaint_id;

        const [notifications] = await pool.query(
            `SELECT * FROM notifications 
             WHERE complaint_id = ?
             ORDER BY created_at DESC`,
            [complaintId]
        );

        res.json({ success: true, notifications });
    } catch (err) {
        console.error("Get complaint notifications error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Mark Notifications as Read
exports.markNotificationsRead = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const complaintId = req.params.complaint_id;

        await pool.query(
            `UPDATE notifications SET is_read = 1 WHERE complaint_id = ?`,
            [complaintId]
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
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const complaintId = req.params.complaintId;

        const [messages] = await pool.query(
            `SELECT * FROM chat_messages 
             WHERE complaint_id = ?
             ORDER BY created_at ASC`,
            [complaintId]
        );

        res.json({ success: true, messages });
    } catch (err) {
        console.error("Get complaint chat error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Send Chat Message
exports.sendChatMessage = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { complaintId, message } = req.body;
        const username = req.session.username;

        if (!complaintId || !message) {
            return res.status(400).json({ success: false, message: "Complaint ID and message are required" });
        }

        await pool.query(
            `INSERT INTO chat_messages (complaint_id, sender_username, message, created_at)
             VALUES (?, ?, ?, NOW())`,
            [complaintId, username, message]
        );

        res.json({ success: true, message: "Message sent successfully" });
    } catch (err) {
        console.error("Send chat message error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const userId = req.session.userId;

        const [totalComplaints] = await pool.query(
            `SELECT COUNT(*) as count FROM complaint c
             JOIN users u ON c.username = u.username
             WHERE u.userid = ?`,
            [userId]
        );

        const [pendingComplaints] = await pool.query(
            `SELECT COUNT(*) as count FROM complaint c
             JOIN users u ON c.username = u.username
             WHERE u.userid = ? AND c.status = 'pending'`,
            [userId]
        );

        const [resolvedComplaints] = await pool.query(
            `SELECT COUNT(*) as count FROM complaint c
             JOIN users u ON c.username = u.username
             WHERE u.userid = ? AND c.status = 'resolved'`,
            [userId]
        );

        res.json({
            success: true,
            stats: {
                total: totalComplaints[0].count,
                pending: pendingComplaints[0].count,
                resolved: resolvedComplaints[0].count
            }
        });
    } catch (err) {
        console.error("Get dashboard stats error:", err);
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