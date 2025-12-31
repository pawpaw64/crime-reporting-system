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