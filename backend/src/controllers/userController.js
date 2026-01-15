const pool = require('../db');
const path = require('path');
const { 
    calculateAge, 
    saveUserAddress, 
    getUserFullAddress,
    getDivisionId 
} = require('../utils/helperUtils');

// Get User Profile - Serve the HTML page
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // Send the static HTML file - data will be loaded via API
        res.sendFile(path.join(__dirname, '../../../frontend/src/pages/profile.html'));
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).send("Error loading profile page");
    }
};

// Update User Profile (supports both legacy and 3NF normalized address)
exports.updateProfile = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { 
            fullName, phone, location, dob,
            // 3NF normalized address fields
            division, district, policeStation, unionName, village, placeDetails 
        } = req.body;
        
        let age = null;
        if (dob) {
            age = calculateAge(dob);
        }

        // Update basic user info
        const [result] = await pool.query(
            "UPDATE users SET fullName = ?, phone = ?, dob = ?, location = ?, age = ? WHERE userid = ?",
            [fullName, phone, dob, location, age, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "No user updated" });
        }

        // If normalized address fields provided, save to user_addresses table (3NF)
        if (division || district || policeStation || unionName || village || placeDetails) {
            try {
                await saveUserAddress(req.session.username, {
                    divisionName: division,
                    districtName: district,
                    policeStationName: policeStation,
                    unionName: unionName,
                    villageName: village,
                    placeDetails: placeDetails
                });
            } catch (addressError) {
                console.error("Save address error:", addressError);
                // Don't fail the whole update if address save fails
            }
        }

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
};

// Get User Data (includes normalized address data)
exports.getUserData = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        // Get basic user data
        const [results] = await pool.query(
            'SELECT fullName, email, phone, location, dob, division, district, police_station, union_name, village, place_details FROM users WHERE userid = ?',
            [req.session.userId]
        );

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = results[0];

        // Try to get normalized address from user_addresses table (3NF)
        let normalizedAddress = null;
        try {
            normalizedAddress = await getUserFullAddress(req.session.username);
        } catch (addressError) {
            console.error("Get normalized address error:", addressError);
        }

        // Merge normalized address with user data (prefer normalized if available)
        if (normalizedAddress) {
            user.division = normalizedAddress.division_name || user.division;
            user.district = normalizedAddress.district_name || user.district;
            user.police_station = normalizedAddress.police_station_name || user.police_station;
            user.union_name = normalizedAddress.union_name || user.union_name;
            user.village = normalizedAddress.village_name || user.village;
            user.place_details = normalizedAddress.place_details || user.place_details;
            user.address_normalized = true;
        }

        res.json({ success: true, user });
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

// Get All User Notifications (from all complaints)
exports.getAllUserNotifications = async (req, res) => {
    try {
        if (!req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const username = req.session.username;

        // Get status change notifications from complaint_notifications table
        const [statusNotifications] = await pool.query(
            `SELECT 
                cn.notification_id as id,
                cn.complaint_id,
                cn.message,
                cn.type,
                cn.is_read,
                cn.created_at,
                c.complaint_type
             FROM complaint_notifications cn
             JOIN complaint c ON cn.complaint_id = c.complaint_id
             WHERE c.username = ?
             ORDER BY cn.created_at DESC
             LIMIT 20`,
            [username]
        );

        // Get unread chat messages from admins
        const [chatNotifications] = await pool.query(
            `SELECT 
                cc.chat_id as id,
                cc.complaint_id,
                CONCAT('New message from admin: ', SUBSTRING(cc.message, 1, 50), '...') as message,
                'admin_message' as type,
                cc.is_read,
                cc.sent_at as created_at,
                c.complaint_type
             FROM complaint_chat cc
             JOIN complaint c ON cc.complaint_id = c.complaint_id
             WHERE c.username = ? AND cc.sender_type = 'admin'
             ORDER BY cc.sent_at DESC
             LIMIT 10`,
            [username]
        );

        // Combine and sort all notifications
        const allNotifications = [...statusNotifications, ...chatNotifications]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 25);

        // Get unread count
        const unreadCount = allNotifications.filter(n => !n.is_read).length;

        res.json({
            success: true,
            notifications: allNotifications,
            unreadCount: unreadCount
        });
    } catch (err) {
        console.error("Get all notifications error:", err);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
};

// Mark All User Notifications as Read
exports.markAllUserNotificationsRead = async (req, res) => {
    try {
        if (!req.session.username) {
            return res.status(401).json({ success: false, message: "Please log in" });
        }

        const username = req.session.username;

        // Mark status notifications as read
        await pool.query(
            `UPDATE complaint_notifications cn
             JOIN complaint c ON cn.complaint_id = c.complaint_id
             SET cn.is_read = 1
             WHERE c.username = ? AND cn.is_read = 0`,
            [username]
        );

        // Mark chat messages as read
        await pool.query(
            `UPDATE complaint_chat cc
             JOIN complaint c ON cc.complaint_id = c.complaint_id
             SET cc.is_read = 1
             WHERE c.username = ? AND cc.sender_type = 'admin' AND cc.is_read = 0`,
            [username]
        );

        res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        console.error("Mark all notifications error:", err);
        res.status(500).json({ success: false, message: "Error updating notifications" });
    }
};