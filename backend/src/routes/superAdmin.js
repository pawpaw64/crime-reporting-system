const express = require('express');
const router = express.Router();

const superAdminController = require('../controllers/superAdminController');

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

module.exports = router;
