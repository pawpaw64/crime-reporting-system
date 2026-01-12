const express = require('express');
const path = require('path');
const router = express.Router();

const pageController = require('../controllers/pageController');

const frontendPages = path.join(__dirname, '../../../frontend/src/pages');
const frontendRoot = path.join(__dirname, '../../../frontend');

// Helper to send page files
const sendPage = (page) => (req, res) => res.sendFile(path.join(frontendPages, page));
const sendRoot = (page) => (req, res) => res.sendFile(path.join(frontendRoot, page));

// ========== HOMEPAGE & MAIN PAGES ==========
router.get('/', pageController.getHomepage);
router.get('/homepage', pageController.getHomepage);
router.get('/contact-us', pageController.getContactUs);
router.get('/contact', sendPage('contact-us.html'));
router.get('/dashboard', sendRoot('index.html'));

// ========== AUTH PAGES ==========
router.get('/login', sendPage('login.html'));
router.get('/signup', pageController.getSignupPage);
router.get('/register', sendPage('register.html'));

// ========== ADMIN PAGES ==========
router.get('/adminLogin', pageController.getAdminLoginPage);
router.get('/admin-login', sendPage('adminLogin.html'));
router.get('/admin-registration', sendPage('admin-registration.html'));
router.get('/admin-verify', sendPage('admin-verify.html'));

// ========== ANONYMOUS REPORT ==========
router.get('/anonymous-report', pageController.getAnonymousReportPage);

// ========== UTILITY ==========
router.get('/test-email', pageController.testEmail);

module.exports = router;
