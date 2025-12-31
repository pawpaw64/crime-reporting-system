const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const userController = require('./controllers/userController');
const complaintController = require('./controllers/complaintController');
const pageController = require('./controllers/pageController');

// Import middleware
const { requireUserAuth } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

// ========== PAGE ROUTES ==========
router.get('/homepage', pageController.serveHomepage);
router.get('/contact-us', pageController.serveContactUs);
router.get('/adminLogin', pageController.serveAdminLogin);
router.get('/signup', pageController.serveSignup);
router.get('/login', pageController.serveLogin);
router.get('/test-email', pageController.testEmail);

// ========== AUTH ROUTES ==========
// Admin Auth
router.post('/adminLogin', authController.adminLogin);
router.post('/admin-logout', authController.adminLogout);
router.get('/check-admin-auth', authController.checkAdminAuth);

// User Auth
router.post('/signup', authController.userSignup);
router.post('/login', authController.userLogin);
router.post('/logout', authController.userLogout);

// OTP Routes
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// ========== ADMIN ROUTES ==========
router.get('/admin-dashboard', adminController.getAdminDashboard);
router.get('/get-admin-settings', adminController.getAdminSettings);
router.post('/update-admin-settings', adminController.updateAdminSettings);
router.post('/update-admin-profile', adminController.updateAdminProfile);
router.get('/admin-chat/:complaintId', adminController.getAdminChat);
router.post('/admin-send-chat-message', adminController.sendAdminChatMessage);
router.get('/get-complaint-evidence/:complaintId', adminController.getComplaintEvidence);
router.get('/get-admin-cases', adminController.getAdminCases);
router.post('/update-complaint-status', adminController.updateComplaintStatus);

// ========== USER ROUTES ==========
router.get('/profile', requireUserAuth, userController.getUserProfile);
router.post('/update-profile', requireUserAuth, userController.updateUserProfile);
router.get('/get-user-data', requireUserAuth, userController.getUserData);

// ========== COMPLAINT ROUTES ==========
router.get('/complain', requireUserAuth, complaintController.serveComplaintForm);
router.post('/submit-complaint', requireUserAuth, upload.array('evidence', 10), complaintController.submitComplaint);
router.post('/notify-admin', complaintController.notifyAdmin);
router.get('/my-complaints', requireUserAuth, complaintController.getUserComplaints);
router.get('/complaint-notifications/:complaint_id', requireUserAuth, complaintController.getComplaintNotifications);
router.post('/mark-notifications-read/:complaint_id', requireUserAuth, complaintController.markNotificationsRead);
router.get('/complaint-chat/:complaintId', requireUserAuth, complaintController.getComplaintChat);
router.post('/send-chat-message', requireUserAuth, complaintController.sendChatMessage);
router.delete('/delete-complaint/:id', requireUserAuth, complaintController.deleteComplaint);
router.get('/dashboard-stats', requireUserAuth, complaintController.getDashboardStats);

module.exports = router;