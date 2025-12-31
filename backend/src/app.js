const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - allow multiple origins for development
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // For development, allow all localhost origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now in dev
    },
    credentials: true
}));

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'securevoice_crime_reporting_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/src', express.static(path.join(__dirname, '../../frontend/src')));
app.use('/css', express.static(path.join(__dirname, '../../frontend/src/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/src/js')));
app.use('/images', express.static(path.join(__dirname, '../../frontend/images')));
app.use('/public', express.static(path.join(__dirname, '../../frontend/public')));

// Import controllers
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');

// Auth routes
app.post('/api/signup', authController.signup);
app.post('/api/login', authController.login);
app.post('/api/logout', authController.logout);
app.get('/api/auth/check', authController.checkAuth);

// Registration step routes
app.post('/api/auth/send-otp', authController.sendOTP);
app.post('/api/auth/verify-otp', authController.verifyOTP);
app.post('/api/auth/verify-nid', authController.verifyNID);
app.post('/api/auth/save-face', authController.saveFaceImage);
app.post('/api/auth/save-address', authController.saveAddress);
app.post('/api/auth/resend-otp', authController.resendOTP);
app.get('/api/auth/registration-status/:sessionId', authController.getRegistrationStatus);

// User routes (placeholder for now)
app.get('/api/profile', authMiddleware.requireUser, (req, res) => {
    res.json({ 
        success: true, 
        user: { 
            id: req.session.userId, 
            username: req.session.username, 
            email: req.session.email 
        } 
    });
});

// Complaint routes (placeholder for now)
app.post('/api/complaints', authMiddleware.requireUser, (req, res) => {
    res.json({ success: true, message: "Complaint submitted (placeholder)" });
});

app.get('/api/complaints', authMiddleware.requireUser, (req, res) => {
    res.json({ success: true, complaints: [] });
});

// Admin routes (placeholder for now)
app.post('/api/admin/login', (req, res) => {
    res.json({ success: false, message: "Admin login not implemented yet" });
});

app.get('/api/admin/dashboard', authMiddleware.requireAdmin, (req, res) => {
    res.json({ success: true, message: "Admin dashboard placeholder" });
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/register.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/adminLogin.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/contact-us.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/profile.html'));
});

app.get('/complain', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/src/pages/complain.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SecureVoice API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Catch all handler - serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

module.exports = app;