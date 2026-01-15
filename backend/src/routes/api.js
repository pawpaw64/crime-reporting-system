const express = require('express');
const router = express.Router();

const userAuth = require('../controllers/auth/userAuth');
const otpController = require('../controllers/auth/otp');
const registrationController = require('../controllers/auth/registrationSteps');
const sessionController = require('../controllers/auth/session');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const helperUtils = require('../utils/helperUtils');

// DB helper
const db = require('../db');

// Auth routes
router.post('/signup', userAuth.signup);
router.post('/login', userAuth.login);
router.post('/logout', sessionController.logout);
router.get('/auth/check', sessionController.checkAuth);

// Registration step routes
router.post('/auth/send-otp', otpController.sendOTP);
router.post('/auth/verify-otp', otpController.verifyOTP);
router.post('/auth/verify-nid', registrationController.verifyNID);
router.post('/auth/save-face', registrationController.saveFaceImage);
router.post('/auth/save-address', registrationController.saveAddress);
router.post('/auth/resend-otp', otpController.resendOTP);
router.get('/auth/registration-status/:sessionId', registrationController.getRegistrationStatus);

// User routes - Full profile data
router.get('/profile', authMiddleware.requireUser, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT userid, username, email, fullName, name_bn, father_name, mother_name, face_image, phone, nid, dob, location, division, district, police_station, union_name, village, place_details, is_verified, is_nid_verified, is_face_verified, created_at, age FROM users WHERE username = ?',
            [req.session.username]
        );
        if (users.length > 0) return res.json({ success: true, user: users[0] });
        return res.json({ success: true, user: { id: req.session.userId, username: req.session.username, email: req.session.email } });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.json({ success: true, user: { id: req.session.userId, username: req.session.username, email: req.session.email } });
    }
});

// Update profile
router.put('/profile/update', authMiddleware.requireUser, async (req, res) => {
    try {
        const { email, phone, division, district, place_details } = req.body;
        await db.query(
            'UPDATE users SET email = ?, phone = ?, division = ?, district = ?, place_details = ? WHERE username = ?',
            [email, phone, division, district, place_details, req.session.username]
        );
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Get all user notifications
router.get('/user-notifications', authMiddleware.requireUser, async (req, res) => {
    try {
        const username = req.session.username;
        const [statusNotifications] = await db.query(
            `SELECT cn.notification_id as id, cn.complaint_id, cn.message, cn.type, cn.is_read, cn.created_at, c.complaint_type FROM complaint_notifications cn JOIN complaint c ON cn.complaint_id = c.complaint_id WHERE c.username = ? ORDER BY cn.created_at DESC LIMIT 20`,
            [username]
        );
        const [chatNotifications] = await db.query(
            `SELECT cc.chat_id as id, cc.complaint_id, CONCAT('New message from admin: ', SUBSTRING(cc.message, 1, 50), IF(LENGTH(cc.message) > 50, '...', '')) as message, 'admin_message' as type, cc.is_read, cc.sent_at as created_at, c.complaint_type FROM complaint_chat cc JOIN complaint c ON cc.complaint_id = c.complaint_id WHERE c.username = ? AND cc.sender_type = 'admin' ORDER BY cc.sent_at DESC LIMIT 10`,
            [username]
        );
        const allNotifications = [...statusNotifications, ...chatNotifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 25);
        const unreadCount = allNotifications.filter(n => !n.is_read).length;
        res.json({ success: true, notifications: allNotifications, unreadCount });
    } catch (err) {
        console.error('Get all notifications error:', err);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

// Mark all user notifications as read
router.post('/mark-all-notifications-read', authMiddleware.requireUser, async (req, res) => {
    try {
        const username = req.session.username;
        await db.query(`UPDATE complaint_notifications cn JOIN complaint c ON cn.complaint_id = c.complaint_id SET cn.is_read = 1 WHERE c.username = ? AND cn.is_read = 0`, [username]);
        await db.query(`UPDATE complaint_chat cc JOIN complaint c ON cc.complaint_id = c.complaint_id SET cc.is_read = 1 WHERE c.username = ? AND cc.sender_type = 'admin' AND cc.is_read = 0`, [username]);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all notifications error:', err);
        res.status(500).json({ success: false, message: 'Error updating notifications' });
    }
});

// Get complaints
router.get('/my-complaints', authMiddleware.requireUser, async (req, res) => {
    try {
        const [complaints] = await db.query('SELECT * FROM complaint WHERE username = ? ORDER BY created_at DESC', [req.session.username]);
        res.json({ success: true, complaints });
    } catch (error) {
        console.error('Complaints fetch error:', error);
        res.json({ success: true, complaints: [] });
    }
});

router.get('/complaints', authMiddleware.requireUser, async (req, res) => {
    try {
        const [complaints] = await db.query(`SELECT c.*, (SELECT COUNT(*) FROM status_updates WHERE complaint_id = c.complaint_id AND is_read = 0) as unread_notifications FROM complaint c WHERE c.username = ? ORDER BY c.created_at DESC`, [req.session.username]);
        res.json({ success: true, complaints });
    } catch (error) {
        console.error('Complaints fetch error:', error);
        res.json({ success: true, complaints: [] });
    }
});

// Submit a new complaint
router.post('/complaints', authMiddleware.requireUser, upload.array('evidence', 10), async (req, res) => {
    try {
        const { complaint_type, incident_date, incident_time, location_address, description, witnesses, anonymous } = req.body;
        const username = req.session.username;
        if (!complaint_type || !description || !location_address) return res.status(400).json({ success: false, message: 'Complaint type, description, and location are required' });
        const adminData = await helperUtils.findAdminByLocation(location_address);
        let adminUsername = null; let locationId = null; let districtName = null;
        if (adminData) { adminUsername = adminData.adminUsername; districtName = adminData.districtName; }
        if (districtName) locationId = await helperUtils.getOrCreateLocation(location_address, districtName);
        const categoryId = await helperUtils.getCategoryId(complaint_type);
        let incidentDateTime = incident_date;
        if (incident_time) incidentDateTime = `${incident_date} ${incident_time}`;
        const formattedDate = new Date(incidentDateTime).toISOString().slice(0, 19).replace('T', ' ');
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [complaintResult] = await db.query(`INSERT INTO complaint (description, created_at, status, username, admin_username, location_id, complaint_type, location_address, category_id) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)`, [description, formattedDate, username, adminUsername, locationId, complaint_type, location_address, categoryId]);
        const complaintId = complaintResult.insertId;
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                let fileType;
                if (file.mimetype.startsWith('image/')) fileType = 'image';
                else if (file.mimetype.startsWith('video/')) fileType = 'video';
                else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
                let relativePath;
                if (file.mimetype.startsWith('image/')) relativePath = `images/${file.filename}`;
                else if (file.mimetype.startsWith('video/')) relativePath = `videos/${file.filename}`;
                else if (file.mimetype.startsWith('audio/')) relativePath = `audio/${file.filename}`;
                else relativePath = file.filename;
                await db.query(`INSERT INTO evidence (uploaded_at, file_type, file_path, complaint_id) VALUES (?, ?, ?, ?)`, [createdAt, fileType, relativePath, complaintId]);
            }
        }
        res.json({ success: true, message: 'Complaint submitted successfully!', complaintId, complaint: { id: complaintId, type: complaint_type, status: 'pending', location: location_address, createdAt } });
    } catch (err) {
        console.error('Submit complaint error:', err);
        res.status(500).json({ success: false, message: 'Error submitting complaint' });
    }
});

// Admin routes (placeholder)
router.post('/admin/login', (req, res) => res.json({ success: false, message: 'Admin login not implemented yet' }));
router.get('/admin/dashboard', authMiddleware.requireAdmin, (req, res) => res.json({ success: true, message: 'Admin dashboard placeholder' }));

module.exports = router;
