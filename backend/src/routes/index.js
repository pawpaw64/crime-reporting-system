const express = require('express');
const router = express.Router();

// Import sub-routers
const apiRoutes = require('./api');
const pageRoutes = require('./pages');
const adminRoutes = require('./admin');
const superAdminRoutes = require('./superAdmin');
const complaintRoutes = require('./complaints');
const anonymousRoutes = require('./anonymous');
const addressRoutes = require('./address');

// Mount routes - Order matters! API/action routes before page routes
router.use('/api', apiRoutes);         // API routes (/api/*)
router.use('/', adminRoutes);          // Admin routes (POST handlers)
router.use('/', superAdminRoutes);     // Super admin routes
router.use('/', complaintRoutes);      // Complaint routes
router.use('/', anonymousRoutes);      // Anonymous report routes
router.use('/', addressRoutes);        // Address & category routes
router.use('/', pageRoutes);           // Page routes (GET handlers - must be last)

module.exports = router;
