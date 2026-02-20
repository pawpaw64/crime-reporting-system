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

// ========== ADMIN ALERT ROUTES ==========
router.get('/super-admin-alerts', superAdminController.getAllAdminAlerts);
router.get('/super-admin-alert-summary', superAdminController.getAdminAlertSummary);
router.get('/super-admin-alert-count/:adminUsername', superAdminController.getAdminAlertCountById);
router.get('/super-admin-alert-details/:alertId', superAdminController.getAlertDetails);
router.post('/super-admin-acknowledge-alert', superAdminController.acknowledgeAlert);
router.post('/super-admin-acknowledge-all-alerts', superAdminController.acknowledgeAllAlertsForAdmin);
router.post('/super-admin-resolve-alert', superAdminController.resolveAlert);
router.post('/super-admin-generate-alerts', superAdminController.generateAlerts);
router.get('/super-admin-alert-config', superAdminController.getAlertConfig);
router.post('/super-admin-alert-config', superAdminController.updateAlertConfig);
router.get('/super-admin-alert-statistics', superAdminController.getAlertStatistics);

module.exports = router;
