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
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'",  // Allow inline scripts
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
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

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Import routes
const routes = require('./routes');

// Mount API routes BEFORE static files
app.use('/', routes);

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

// User routes - Full profile data
app.get('/api/profile', authMiddleware.requireUser, async (req, res) => {
    try {
        const db = require('./db');
        const [users] = await db.query(
            'SELECT userid, username, email, fullName, name_bn, father_name, mother_name, face_image, phone, nid, dob, location, division, district, police_station, union_name, village, place_details, is_verified, is_nid_verified, is_face_verified, created_at, age FROM users WHERE username = ?',
            [req.session.username]
        );
        
        if (users.length > 0) {
            res.json({ 
                success: true, 
                user: users[0]
            });
        } else {
            res.json({ 
                success: true, 
                user: { 
                    id: req.session.userId, 
                    username: req.session.username, 
                    email: req.session.email 
                } 
            });
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.json({ 
            success: true, 
            user: { 
                id: req.session.userId, 
                username: req.session.username, 
                email: req.session.email 
            } 
        });
    }
});

// Update profile
app.put('/api/profile/update', authMiddleware.requireUser, async (req, res) => {
    try {
        const db = require('./db');
        const { email, phone, division, district, place_details } = req.body;
        
        await db.query(
            'UPDATE users SET email = ?, phone = ?, division = ?, district = ?, place_details = ? WHERE username = ?',
            [email, phone, division, district, place_details, req.session.username]
        );
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Get user complaints
app.get('/api/my-complaints', authMiddleware.requireUser, async (req, res) => {
    try {
        const db = require('./db');
        const [complaints] = await db.query(
            'SELECT * FROM complaint WHERE username = ? ORDER BY created_at DESC',
            [req.session.username]
        );
        
        res.json({ success: true, complaints });
    } catch (error) {
        console.error('Complaints fetch error:', error);
        res.json({ success: true, complaints: [] });
    }
});

// Get user complaints (alias for /api/complaints GET)
app.get('/api/complaints', authMiddleware.requireUser, async (req, res) => {
    try {
        const db = require('./db');
        const [complaints] = await db.query(
            `SELECT c.*, 
                (SELECT COUNT(*) FROM status_updates WHERE complaint_id = c.complaint_id AND is_read = 0) as unread_notifications
             FROM complaint c 
             WHERE c.username = ? 
             ORDER BY c.created_at DESC`,
            [req.session.username]
        );
        
        res.json({ success: true, complaints });
    } catch (error) {
        console.error('Complaints fetch error:', error);
        res.json({ success: true, complaints: [] });
    }
});

// Submit a new complaint
const upload = require('./middleware/uploadMiddleware');
const helperUtils = require('./utils/helperUtils');

app.post('/api/complaints', authMiddleware.requireUser, upload.array('evidence', 10), async (req, res) => {
    try {
        const db = require('./db');
        const { complaint_type, incident_date, incident_time, location_address, description, witnesses, anonymous } = req.body;
        const username = req.session.username;

        if (!complaint_type || !description || !location_address) {
            return res.status(400).json({ success: false, message: "Complaint type, description, and location are required" });
        }

        // Find admin for location
        const adminData = await helperUtils.findAdminByLocation(location_address);
        
        let adminUsername = null;
        let districtName = null;
        
        if (adminData) {
            adminUsername = adminData.adminUsername;
            districtName = adminData.districtName;
        }

        // Get or create location
        let locationId = null;
        if (districtName) {
            locationId = await helperUtils.getOrCreateLocation(location_address, districtName);
        }

        // Get category ID
        const categoryId = await helperUtils.getCategoryId(complaint_type);

        // Combine date and time
        let incidentDateTime = incident_date;
        if (incident_time) {
            incidentDateTime = `${incident_date} ${incident_time}`;
        }
        const formattedDate = new Date(incidentDateTime).toISOString().slice(0, 19).replace('T', ' ');
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Insert complaint
        const [complaintResult] = await db.query(
            `INSERT INTO complaint (
                description, created_at, status, username, admin_username, 
                location_id, complaint_type, location_address, category_id
            ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
            [description, formattedDate, username, adminUsername, locationId, complaint_type, location_address, categoryId]
        );

        const complaintId = complaintResult.insertId;

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                let fileType;
                if (file.mimetype.startsWith('image/')) fileType = 'image';
                else if (file.mimetype.startsWith('video/')) fileType = 'video';
                else if (file.mimetype.startsWith('audio/')) fileType = 'audio';

                let relativePath;
                if (file.mimetype.startsWith('image/')) {
                    relativePath = `images/${file.filename}`;
                } else if (file.mimetype.startsWith('video/')) {
                    relativePath = `videos/${file.filename}`;
                } else if (file.mimetype.startsWith('audio/')) {
                    relativePath = `audio/${file.filename}`;
                } else {
                    relativePath = file.filename;
                }

                await db.query(
                    `INSERT INTO evidence (uploaded_at, file_type, file_path, complaint_id)
                     VALUES (?, ?, ?, ?)`,
                    [createdAt, fileType, relativePath, complaintId]
                );
            }
        }

        res.json({
            success: true,
            message: "Complaint submitted successfully!",
            complaintId: complaintId,
            complaint: {
                id: complaintId,
                type: complaint_type,
                status: 'pending',
                location: location_address,
                createdAt: createdAt
            }
        });
    } catch (err) {
        console.error("Submit complaint error:", err);
        res.status(500).json({ success: false, message: "Error submitting complaint" });
    }
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

// Profile route is handled in routes.js with auth middleware

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