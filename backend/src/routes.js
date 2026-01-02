const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const superAdminController = require('./controllers/superAdminController');
const userController = require('./controllers/userController');
const complaintController = require('./controllers/complaintController');
const pageController = require('./controllers/pageController');

// Import middleware
const { requireUser, requireAdmin } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

// ========== PAGE ROUTES ==========
router.get('/homepage', pageController.getHomepage);
router.get('/contact-us', pageController.getContactUs);
router.get('/adminLogin', pageController.getAdminLoginPage);
router.get('/signup', pageController.getSignupPage);
router.get('/login', pageController.getLoginPage);
router.get('/test-email', pageController.testEmail);

// ========== AUTH ROUTES ==========
// Admin Auth - New Secure System with OTP
router.post('/admin-registration-request', authController.adminRegistrationRequest);
router.post('/adminLogin', authController.adminLogin);
router.post('/admin-verify-otp', authController.adminVerifyOTP);
router.post('/setup-admin-password', authController.setupAdminPassword);
router.get('/verify-admin-email', authController.verifyAdminEmail);
router.post('/admin-logout', authController.adminLogout);
router.get('/check-admin-auth', authController.checkAdminAuth);

// User Auth
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.userLogout);
router.get('/check-auth', authController.checkAuth);

// OTP Routes
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// ========== SUPER ADMIN ROUTES ==========
router.post('/super-admin-login', superAdminController.superAdminLogin);
router.get('/super-admin-check-auth', superAdminController.checkSuperAdminAuth);
router.post('/super-admin-logout', superAdminController.superAdminLogout);
router.get('/super-admin-stats', superAdminController.getSuperAdminStats);
router.get('/super-admin-pending-requests', superAdminController.getPendingAdminRequests);
router.get('/super-admin-all-admins', superAdminController.getAllAdminRequests);
router.post('/super-admin-approve', superAdminController.approveAdminRequest);
router.post('/super-admin-reject', superAdminController.rejectAdminRequest);
router.post('/super-admin-suspend', superAdminController.suspendAdminAccount);
router.post('/super-admin-reactivate', superAdminController.reactivateAdminAccount);
router.get('/super-admin-audit-logs', superAdminController.getAuditLogs);

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
router.get('/get-admin-logs', adminController.getAdminLogs);

// ========== USER ROUTES ==========
router.get('/profile', requireUser, userController.getProfile);
router.post('/update-profile', requireUser, userController.updateProfile);
router.get('/get-user-data', requireUser, userController.getUserData);

// ========== COMPLAINT ROUTES ==========
router.get('/complain', requireUser, complaintController.serveComplaintForm);
router.post('/submit-complaint', requireUser, upload.array('evidence', 10), complaintController.submitComplaint);
router.post('/notify-admin', complaintController.notifyAdmin);
router.get('/my-complaints', requireUser, complaintController.getUserComplaints);
router.get('/complaint-notifications/:complaint_id', requireUser, complaintController.getComplaintNotifications);
router.post('/mark-notifications-read/:complaint_id', requireUser, complaintController.markNotificationsRead);
router.get('/complaint-chat/:complaintId', requireUser, complaintController.getComplaintChat);
router.post('/send-chat-message', requireUser, complaintController.sendChatMessage);
router.delete('/delete-complaint/:id', requireUser, complaintController.deleteComplaint);
router.get('/dashboard-stats', requireUser, complaintController.getDashboardStats);

module.exports = router;