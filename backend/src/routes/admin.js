const express = require('express');
const router = express.Router();

const adminAuth = require('../controllers/auth/adminAuth');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');

// ========== ADMIN AUTH ROUTES ==========
router.post('/admin-registration-request', adminAuth.adminRegistrationRequest);
router.post('/adminLogin', adminAuth.adminLogin);
router.post('/admin-verify-otp', adminAuth.adminVerifyOTP);
router.post('/setup-admin-password', adminAuth.setupAdminPassword);
router.get('/verify-admin-email', adminAuth.verifyAdminEmail);
router.post('/admin-logout', adminAuth.adminLogout);
router.get('/check-admin-auth', adminAuth.checkAdminAuth);

// ========== ADMIN DASHBOARD ROUTES ==========
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
router.get('/get-admin-profile', adminController.getAdminProfile);
router.get('/get-admin-complaints', adminController.getAdminComplaints);
router.get('/get-district-users', adminController.getDistrictUsers);
router.get('/get-admin-dashboard-stats', adminController.getDashboardStats);

// ========== ANALYTICS ROUTES ==========
router.get('/analytics/case-analytics', analyticsController.getCaseAnalytics);
router.post('/analytics/discard-case/:id', analyticsController.discardCase);
router.post('/analytics/restore-case/:id', analyticsController.restoreCase);

module.exports = router;
