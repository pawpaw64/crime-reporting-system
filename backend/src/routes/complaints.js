const express = require('express');
const router = express.Router();

const userAuth = require('../controllers/auth/userAuth');
const sessionController = require('../controllers/auth/session');
const otpController = require('../controllers/auth/otp');
const userController = require('../controllers/userController');
const complaintController = require('../controllers/complaintController');
const { requireUser } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ========== USER AUTH ROUTES ==========
router.post('/signup', userAuth.signup);
router.post('/login', userAuth.login);
router.post('/logout', sessionController.userLogout);
router.get('/check-auth', sessionController.checkAuth);

// ========== OTP ROUTES ==========
router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTP);

// ========== USER PROFILE ROUTES ==========
router.get('/profile', requireUser, userController.getProfile);
router.post('/update-profile', requireUser, userController.updateProfile);
router.get('/get-user-data', requireUser, userController.getUserData);
router.get('/user-notifications', requireUser, userController.getAllUserNotifications);
router.post('/mark-all-notifications-read', requireUser, userController.markAllUserNotificationsRead);

// ========== COMPLAINT ROUTES ==========
router.get('/complain', requireUser, (req, res) => {
    res.redirect('/profile?tab=new-report');
});
router.post('/submit-complaint', requireUser, upload.array('evidence', 10), complaintController.submitComplaint);
router.post('/notify-admin', complaintController.notifyAdmin);
router.get('/my-complaints', requireUser, complaintController.getUserComplaints);
router.get('/complaint-notifications/:complaint_id', requireUser, complaintController.getComplaintNotifications);
router.post('/mark-notifications-read/:complaint_id', requireUser, complaintController.markNotificationsRead);
router.get('/complaint-chat/:complaintId', requireUser, complaintController.getComplaintChat);
router.post('/send-chat-message', requireUser, complaintController.sendChatMessage);
router.delete('/delete-complaint/:id', requireUser, complaintController.deleteComplaint);
router.get('/dashboard-stats', requireUser, complaintController.getDashboardStats);
router.get('/complaint-heatmap-data', complaintController.getComplaintHeatmapData);

module.exports = router;
