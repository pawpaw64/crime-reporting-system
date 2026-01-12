const express = require('express');
const router = express.Router();

// ========== IMPORT CONTROLLERS ==========
// Auth modules (modular structure)
const adminAuth = require('./controllers/auth/adminAuth');
const userAuth = require('./controllers/auth/userAuth');
const otpController = require('./controllers/auth/otp');
const sessionController = require('./controllers/auth/session');

const adminController = require('./controllers/adminController');
const superAdminController = require('./controllers/superAdminController');
const userController = require('./controllers/userController');
const complaintController = require('./controllers/complaintController');
const pageController = require('./controllers/pageController');
const anonymousReportController = require('./controllers/anonymousReportController');
const analyticsController = require('./controllers/analyticsController');
const addressController = require('./controllers/addressController');

// ========== IMPORT MIDDLEWARE ==========
const { requireUser, requireAdmin } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

// ========== PAGE ROUTES ==========
router.get('/homepage', pageController.getHomepage);
router.get('/contact-us', pageController.getContactUs);
router.get('/adminLogin', pageController.getAdminLoginPage);
router.get('/signup', pageController.getSignupPage);
router.get('/login', pageController.getLoginPage);
router.get('/anonymous-report', pageController.getAnonymousReportPage);
router.get('/test-email', pageController.testEmail);

// ========== AUTH ROUTES ==========
// Admin Auth - New Secure System with OTP
router.post('/admin-registration-request', adminAuth.adminRegistrationRequest);
router.post('/adminLogin', adminAuth.adminLogin);
router.post('/admin-verify-otp', adminAuth.adminVerifyOTP);
router.post('/setup-admin-password', adminAuth.setupAdminPassword);
router.get('/verify-admin-email', adminAuth.verifyAdminEmail);
router.post('/admin-logout', adminAuth.adminLogout);
router.get('/check-admin-auth', adminAuth.checkAdminAuth);

// User Auth
router.post('/signup', userAuth.signup);
router.post('/login', userAuth.login);
router.post('/logout', sessionController.userLogout);
router.get('/check-auth', sessionController.checkAuth);

// OTP Routes
router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTP);

// ========== SUPER ADMIN ROUTES ==========
router.post('/super-admin-login', superAdminController.superAdminLogin);
router.get('/super-admin-check-auth', superAdminController.checkSuperAdminAuth);
router.post('/super-admin-logout', superAdminController.superAdminLogout);
router.get('/super-admin-stats', superAdminController.getSuperAdminStats);
router.get('/super-admin-pending-requests', superAdminController.getPendingAdminRequests);
router.get('/super-admin-all-admins', superAdminController.getAllAdminRequests);
router.get('/super-admin-admin-details/:adminId', superAdminController.getAdminDetails);
router.post('/super-admin-approve', superAdminController.approveAdminRequest);
router.post('/super-admin-reject', superAdminController.rejectAdminRequest);
router.post('/super-admin-suspend', superAdminController.suspendAdminAccount);
router.post('/super-admin-reactivate', superAdminController.reactivateAdminAccount);
router.get('/super-admin-audit-logs', superAdminController.getAuditLogs);
router.get('/super-admin-settings', superAdminController.getSuperAdminSettings);
router.post('/super-admin-settings', superAdminController.saveSuperAdminSettings);

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
router.get('/get-admin-profile', adminController.getAdminProfile);
router.get('/get-admin-complaints', adminController.getAdminComplaints);
router.get('/get-district-users', adminController.getDistrictUsers);
router.get('/get-admin-dashboard-stats', adminController.getDashboardStats);

// ========== ANALYTICS ROUTES ==========
router.get('/analytics/case-analytics', analyticsController.getCaseAnalytics);
router.post('/analytics/discard-case/:id', analyticsController.discardCase);
router.post('/analytics/restore-case/:id', analyticsController.restoreCase);

// ========== USER ROUTES ==========
router.get('/profile', requireUser, userController.getProfile);
router.post('/update-profile', requireUser, userController.updateProfile);
router.get('/get-user-data', requireUser, userController.getUserData);
router.get('/user-notifications', requireUser, userController.getAllUserNotifications);
router.post('/mark-all-notifications-read', requireUser, userController.markAllUserNotificationsRead);

// ========== COMPLAINT ROUTES ==========
// Redirect /complain to profile page with new-report tab (requires authentication)
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
router.get('/complaint-heatmap-data', complaintController.getComplaintHeatmapData);  // Public heatmap data

// ========== ANONYMOUS REPORT ROUTES ==========
// Public routes (no authentication required)
router.post('/anonymous-report', upload.array('evidence', 10), anonymousReportController.submitAnonymousReport);
router.get('/anonymous-report/:reportId/status', anonymousReportController.checkAnonymousReportStatus);
router.get('/anonymous-heatmap-data', anonymousReportController.getAnonymousHeatmapData);
router.get('/anonymous-report-stats', anonymousReportController.getAnonymousReportStats);

// Admin routes for anonymous reports
router.get('/admin/anonymous-reports', anonymousReportController.getAnonymousReports);
router.get('/admin/anonymous-reports/:reportId', anonymousReportController.getAnonymousReportDetails);
router.put('/admin/anonymous-reports/:reportId/status', anonymousReportController.updateAnonymousReportStatus);
router.patch('/admin/anonymous-reports/:reportId/flag', anonymousReportController.flagAnonymousReport);
router.get('/admin/anonymous-reports/:reportId/evidence', anonymousReportController.getAnonymousReportEvidence);

// ========== ADDRESS & CATEGORY ROUTES (3NF Normalized) ==========
router.get('/address/divisions', addressController.getDivisions);
router.get('/address/districts', addressController.getDistricts);
router.get('/address/police-stations', addressController.getPoliceStations);
router.get('/address/unions', addressController.getUnions);
router.get('/address/villages', addressController.getVillages);
router.get('/address/hierarchy', addressController.getFullAddressHierarchy);
router.get('/address/search', addressController.searchLocations);
router.get('/categories', addressController.getCategories);

module.exports = router;