const express = require('express');
const router = express.Router();

const anonymousReportController = require('../controllers/anonymousReportController');
const upload = require('../middleware/uploadMiddleware');

// ========== PUBLIC ANONYMOUS REPORT ROUTES ==========
router.post('/anonymous-report', upload.array('evidence', 10), anonymousReportController.submitAnonymousReport);
router.get('/anonymous-report/:reportId/status', anonymousReportController.checkAnonymousReportStatus);
router.get('/anonymous-heatmap-data', anonymousReportController.getAnonymousHeatmapData);
router.get('/anonymous-report-stats', anonymousReportController.getAnonymousReportStats);

// ========== ADMIN ROUTES FOR ANONYMOUS REPORTS ==========
router.get('/admin/anonymous-reports', anonymousReportController.getAnonymousReports);
router.get('/admin/anonymous-reports/:reportId', anonymousReportController.getAnonymousReportDetails);
router.put('/admin/anonymous-reports/:reportId/status', anonymousReportController.updateAnonymousReportStatus);
router.patch('/admin/anonymous-reports/:reportId/flag', anonymousReportController.flagAnonymousReport);
router.get('/admin/anonymous-reports/:reportId/evidence', anonymousReportController.getAnonymousReportEvidence);

module.exports = router;
