# User Authentication System
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Multi-Step Registration Flow](#multi-step-registration-flow)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [OTP System](#otp-system)
6. [Session Management](#session-management)
7. [API Endpoints](#api-endpoints)

---

## Overview

The User Authentication System provides a comprehensive, multi-step registration process with:
- Mobile number verification via OTP
- NID (National ID) validation
- Face capture for identity verification
- Hierarchical address selection (Division → District → Police Station → Union → Village)
- Secure password creation

---

## Multi-Step Registration Flow

### Registration Steps (7 Steps)

```
Step 1: Mobile Number Entry
        ↓
Step 2: OTP Verification
        ↓
Step 3: NID Verification (Date of Birth + NID Number)
        ↓
Step 4: Face Capture (Webcam)
        ↓
Step 5: Address Selection (Cascading Dropdowns)
        ↓
Step 6: Account Creation (Username, Email, Password)
        ↓
Step 7: Success / Login Redirect
```

---

## Backend Implementation

### File: `backend/src/controllers/auth/userAuth.js`

#### User Signup Function

This is the main registration handler that processes the final step of user registration:

```javascript
const pool = require('../../db');
const { hashPassword, comparePassword } = require('../../utils/passwordUtils');
const { sendEmail } = require('../../utils/emailUtils');
const {
    sendError,
    sendSuccess,
    isValidEmail,
    isValidUsername,
    calculateAge,
    EmailTemplates,
    otpStore,
    registrationSessions,
    buildLocationString
} = require('./common');

// User Signup
exports.signup = async (req, res) => {
    try {
        // Extract all user data from request body
        const { 
            username, email, password, sessionId, 
            phone, nid, dob, nameEn, nameBn, 
            fatherName, motherName, faceImage, 
            division, district, policeStation, union, village, placeDetails 
        } = req.body;

        // VALIDATION: Check required fields
        if (!username || !email || !password) {
            return sendError(res, 400, 'Username, email and password are required');
        }
        
        // VALIDATION: Username format (3-50 chars, letters, numbers, underscores)
        if (!isValidUsername(username)) {
            return sendError(res, 400, 'Username must be 3-50 characters (letters, numbers, underscores only)');
        }
        
        // VALIDATION: Email format
        if (!isValidEmail(email)) {
            return sendError(res, 400, 'Invalid email format');
        }
        
        // VALIDATION: Password length
        if (password.length < 8) {
            return sendError(res, 400, 'Password must be at least 8 characters');
        }

        // CHECK DUPLICATES: Username
        const [existingUsername] = await pool.query(
            'SELECT userid FROM users WHERE username = ?', 
            [username]
        );
        if (existingUsername.length > 0) {
            return sendError(res, 400, 'This username is already taken');
        }
        
        // CHECK DUPLICATES: Email
        const [existingEmail] = await pool.query(
            'SELECT userid FROM users WHERE email = ?', 
            [email]
        );
        if (existingEmail.length > 0) {
            return sendError(res, 400, 'This email is already registered');
        }

        // RETRIEVE SESSION DATA: Get data from multi-step registration session
        let userData = {};
        if (sessionId && registrationSessions.has(sessionId)) {
            // Session exists - get stored data from previous steps
            const session = registrationSessions.get(sessionId);
            userData = { ...session.data, phone: session.phone };
        } else {
            // No session - use data from request body directly
            const location = buildLocationString({ 
                village, union, policeStation, district, division 
            });
            userData = { 
                phone, nid, dob, 
                fullName: nameEn, nameBn, 
                fatherName, motherName, faceImage, 
                division, district, policeStation, 
                unionName: union, village, placeDetails, location 
            };
        }

        // HASH PASSWORD: Use bcrypt for secure password storage
        const hashedPassword = await hashPassword(password);
        
        // CALCULATE AGE: From date of birth
        const age = calculateAge(userData.dob);

        // INSERT USER: Store in database
        const [result] = await pool.query(
            `INSERT INTO users (
                username, email, password, fullName, name_bn, phone, nid, 
                dob, age, father_name, mother_name, face_image, location, 
                division, district, police_station, union_name, village, 
                place_details, is_verified, is_nid_verified, is_face_verified, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                username, email, hashedPassword, 
                userData.fullName || null, userData.nameBn || null, 
                userData.phone || null, userData.nid || null, 
                userData.dob || null, age, 
                userData.fatherName || null, userData.motherName || null, 
                userData.faceImage || null, userData.location || null, 
                userData.division || null, userData.district || null, 
                userData.policeStation || null, userData.unionName || null, 
                userData.village || null, userData.placeDetails || null, 
                1,                              // is_verified
                userData.nid ? 1 : 0,           // is_nid_verified
                userData.faceImage ? 1 : 0      // is_face_verified
            ]
        );

        // SET SESSION: Auto-login after registration
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;

        // CLEANUP: Remove temporary session data
        if (sessionId) registrationSessions.delete(sessionId);
        if (userData.phone) otpStore.delete(userData.phone);
        otpStore.delete(email);

        // SEND WELCOME EMAIL
        try {
            await sendEmail(email, 'Welcome to SecureVoice!', EmailTemplates.welcome());
        } catch (e) {
            console.error('Welcome email error:', e);
            // Don't fail registration if email fails
        }

        // SUCCESS RESPONSE
        sendSuccess(res, 'Registration successful!', { 
            user: { 
                id: result.insertId, 
                username, 
                email, 
                name: userData.fullName 
            } 
        });
        
    } catch (err) {
        console.error('Signup error:', err);
        
        // Handle duplicate entry errors
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('username')) {
                return sendError(res, 400, 'Username already taken');
            }
            if (err.message.includes('email')) {
                return sendError(res, 400, 'Email already registered');
            }
            if (err.message.includes('nid')) {
                return sendError(res, 400, 'NID already registered');
            }
        }
        sendError(res, 500, 'Registration failed. Please try again.');
    }
};
```

**Key Logic Explanation:**

1. **Input Extraction**: Destructures all required fields from `req.body`
2. **Validation Chain**: Validates username format, email format, password length
3. **Duplicate Checking**: Queries database for existing username/email
4. **Session Retrieval**: Uses `registrationSessions` Map to get data from previous steps
5. **Password Hashing**: Uses bcrypt via `hashPassword()` utility
6. **Database Insert**: Stores user with all collected information
7. **Auto-Login**: Sets session variables for immediate access
8. **Cleanup**: Removes temporary OTP and session data

---

#### User Login Function

```javascript
// User Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // VALIDATION: Check required fields
        if (!username || !password) {
            return sendError(res, 400, 'Username and password are required');
        }

        // QUERY USER: Find user by username
        const [results] = await pool.query(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );
        
        // CHECK EXISTS: Return same error for security (don't reveal if user exists)
        if (results.length === 0) {
            return sendError(res, 401, 'Invalid username or password');
        }
        
        const user = results[0];
        
        // VERIFY PASSWORD: Compare with stored hash
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return sendError(res, 401, 'Invalid username or password');
        }

        // SET SESSION: Store user info in session
        req.session.userId = user.userid;
        req.session.username = user.username;
        req.session.email = user.email;
        
        // SUCCESS RESPONSE with redirect
        sendSuccess(res, 'Login successful', { redirect: '/profile' });
        
    } catch (err) {
        console.error('Login error:', err);
        sendError(res, 500, 'Server error');
    }
};
```

**Security Notes:**
- Same error message for "user not found" and "wrong password" to prevent username enumeration
- Password comparison uses bcrypt's timing-safe comparison
- Session stores minimal user information

---

## OTP System

### File: `backend/src/controllers/auth/otp.js`

#### Send OTP Function

```javascript
const pool = require('../../db');
const { sendEmail } = require('../../utils/emailUtils');
const { 
    sendError, 
    sendSuccess, 
    generateOTP, 
    otpStore, 
    EmailTemplates, 
    CONFIG 
} = require('./common');

// Send OTP to email or phone during registration
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        
        // VALIDATION: Require either email or phone
        if (!email && !phone) {
            return sendError(res, 400, 'Email or phone is required');
        }

        // GENERATE OTP: Random 6-digit code
        const otp = generateOTP();
        
        // STORE OTP: Save with timestamp for expiry check
        if (phone) {
            otpStore.set(phone, { otp, createdAt: Date.now() });
        }
        if (email) {
            otpStore.set(email, { otp, createdAt: Date.now() });
        }

        // LOG OTP: For development debugging
        console.log('Generated OTP for', email || phone, otp);
        
        // SEND EMAIL: If email provided
        if (email) {
            try {
                await sendEmail(email, 'Your OTP Code', EmailTemplates.otp(otp));
            } catch (e) {
                console.error('OTP email error:', e);
            }
        }

        // RESPONSE: Include OTP in dev mode only
        sendSuccess(res, 'OTP sent', { 
            otp: process.env.NODE_ENV === 'development' ? otp : undefined 
        });
        
    } catch (err) {
        console.error('sendOTP error', err);
        sendError(res, 500, 'Failed to send OTP');
    }
};
```

**OTP Generation (from common.js):**
```javascript
// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
```

#### Verify OTP Function

```javascript
// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { key, otp } = req.body; // key can be email or phone
        
        // VALIDATION
        if (!key || !otp) {
            return sendError(res, 400, 'Key and OTP are required');
        }
        
        // RETRIEVE STORED OTP
        const entry = otpStore.get(key);
        if (!entry) {
            return sendError(res, 400, 'No OTP found for this key');
        }
        
        // VERIFY OTP MATCH
        if (entry.otp !== otp) {
            return sendError(res, 400, 'Invalid OTP');
        }
        
        // CHECK EXPIRY: 5 minutes validity
        if (Date.now() - entry.createdAt > (5 * 60 * 1000)) {
            return sendError(res, 400, 'OTP expired');
        }

        // CLEANUP: Remove used OTP
        otpStore.delete(key);
        
        sendSuccess(res, 'OTP verified');
        
    } catch (err) {
        console.error('verifyOTP error', err);
        sendError(res, 500, 'OTP verification failed');
    }
};
```

#### Resend OTP with Rate Limiting

```javascript
// Resend OTP with rate limiting
exports.resendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const identifier = phone || email;
        
        if (!identifier) {
            return sendError(res, 400, 'Phone or email required');
        }

        // RATE LIMITING: Check previous attempts
        const existingOTP = otpStore.get(identifier);
        if (existingOTP && (existingOTP.resendCount || 0) >= CONFIG.MAX_RESEND_ATTEMPTS) {
            // Check cooldown period
            if (Date.now() - (existingOTP.firstSentAt || 0) < CONFIG.RESEND_COOLDOWN_MS) {
                return sendError(res, 429, 'Too many requests. Try again later.');
            }
        }

        // GENERATE NEW OTP
        const otp = generateOTP();
        
        // STORE with tracking info
        otpStore.set(identifier, {
            otp,
            expires: Date.now() + CONFIG.OTP_EXPIRY_MS,
            verified: false,
            resendCount: (existingOTP?.resendCount || 0) + 1,
            firstSentAt: existingOTP?.firstSentAt || Date.now()
        });

        // SEND EMAIL
        if (email) {
            try {
                await sendEmail(email, 'SecureVoice - New Code', EmailTemplates.resendOtp(otp));
            } catch (e) {
                console.error('Email error:', e);
            }
        }

        const response = { success: true, message: 'New OTP sent' };
        if (process.env.NODE_ENV !== 'production') {
            response.devOTP = otp;
        }
        
        sendSuccess(res, response.message, { devOTP: response.devOTP });
        
    } catch (err) {
        console.error('Resend OTP error', err);
        sendError(res, 500, 'Failed to resend OTP');
    }
};
```

---

## Frontend Implementation

### File: `frontend/src/js/register.js`

#### Global State Management

```javascript
// Global State
let currentStep = 1;            // Track current registration step
const totalSteps = 7;           // Total number of steps
let otpTimer = null;            // Timer for OTP countdown
let cameraStream = null;        // Webcam stream reference
let capturedImageData = null;   // Base64 captured face image
let registrationSessionId = null; // Backend session tracking

// API Base URL - Dynamic detection
const API_BASE_URL = typeof Config !== 'undefined' ? Config.API_BASE_URL : (() => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    // If running from backend server, use same origin
    if (['3000', '3001', '5000'].includes(port)) {
        return window.location.origin + '/api';
    }
    // Default to port 3000 for development
    return `http://${hostname}:3000/api`;
})();

// User Data Object - Collects data across all steps
const userData = {
    mobile: '',
    otp: '',
    nid: '',
    dob: '',
    nameEn: '',
    nameBn: '',
    fatherName: '',
    motherName: '',
    faceImage: '',
    division: '',
    district: '',
    policeStation: '',
    union: '',
    village: '',
    placeDetails: '',
    username: '',
    email: '',
    password: ''
};
```

#### Initialization and Event Listeners

```javascript
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded: Initializing event listeners');
    
    initializeOTPInputs();          // Setup OTP input auto-focus
    initializePasswordValidation(); // Setup password strength checker
    initializeEventListeners();     // Attach all button handlers
});

// Initialize all event listeners
function initializeEventListeners() {
    // Step 1: Mobile submit
    const step1Submit = document.getElementById('step1-submit');
    if (step1Submit) {
        step1Submit.addEventListener('click', validateStep1);
    }
    
    // Step 2: OTP submit and resend
    const step2Submit = document.getElementById('step2-submit');
    if (step2Submit) {
        step2Submit.addEventListener('click', validateStep2);
    }
    
    // ... more button handlers for each step
    
    // Step 5: Address dropdown cascading
    const divisionSelect = document.getElementById('division');
    if (divisionSelect) {
        divisionSelect.addEventListener('change', loadDistricts);
    }
    
    const districtSelect = document.getElementById('district');
    if (districtSelect) {
        districtSelect.addEventListener('change', loadPoliceStations);
    }
    
    // ... more cascading handlers
}
```

#### OTP Input Handler (Auto-Focus)

```javascript
// OTP Input Auto-Focus Implementation
function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-digit');
    
    otpInputs.forEach((input, index) => {
        // Handle single digit input
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow digits
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Auto-focus next input when digit entered
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        // Handle backspace navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste (paste full OTP at once)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6);
            
            if (/^\d+$/.test(pastedData)) {
                pastedData.split('').forEach((digit, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = digit;
                    }
                });
            }
        });
    });
}
```

**Logic Explanation:**
1. Each OTP digit has its own input field
2. When a digit is entered, focus automatically moves to next field
3. Backspace on empty field moves focus to previous field
4. Pasting a full OTP code auto-fills all fields

---

## Session Management

### In-Memory Stores (common.js)

```javascript
// OTP Storage (Map: key -> {otp, createdAt, ...})
const otpStore = new Map();

// Registration Session Storage (Map: sessionId -> {phone, data, step})
const registrationSessions = new Map();

// Session Cleanup (run periodically)
setInterval(() => {
    const now = Date.now();
    
    // Clean expired OTPs (5 minutes)
    for (const [key, value] of otpStore.entries()) {
        if (now - value.createdAt > 5 * 60 * 1000) {
            otpStore.delete(key);
        }
    }
    
    // Clean expired registration sessions (1 hour)
    for (const [key, value] of registrationSessions.entries()) {
        if (now - value.createdAt > 60 * 60 * 1000) {
            registrationSessions.delete(key);
        }
    }
}, 60 * 1000); // Run every minute
```

### Express Session Configuration

```javascript
// From securityMiddleware.js
const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'securevoice-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});
```

---

## API Endpoints

### User Authentication Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/signup` | User registration | `{username, email, password, sessionId, ...}` |
| POST | `/api/auth/login` | User login | `{username, password}` |
| POST | `/api/auth/logout` | User logout | - |
| GET | `/api/auth/check` | Check auth status | - |

### OTP Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/send-otp` | Send OTP | `{email}` or `{phone}` |
| POST | `/api/auth/verify-otp` | Verify OTP | `{key, otp}` |
| POST | `/api/auth/resend-otp` | Resend OTP | `{email}` or `{phone}` |

### Registration Step Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/verify-nid` | NID verification | `{nid, dob, nameEn, nameBn, ...}` |
| POST | `/api/auth/save-face` | Save face image | `{faceImage, sessionId}` |
| POST | `/api/auth/save-address` | Save address | `{division, district, ...}` |
| GET | `/api/auth/session-status` | Get registration session | `?sessionId=xxx` |

### Address Hierarchy Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/address/divisions` | Get all divisions |
| GET | `/api/address/districts?divisionId=x` | Get districts by division |
| GET | `/api/address/police-stations?districtName=x` | Get police stations |
| GET | `/api/address/unions?policeStationId=x` | Get unions |
| GET | `/api/address/villages?unionId=x` | Get villages |

---

## Common Utilities

### File: `backend/src/controllers/auth/common.js`

```javascript
// Configuration
const CONFIG = {
    OTP_EXPIRY_MS: 5 * 60 * 1000,       // 5 minutes
    MAX_RESEND_ATTEMPTS: 5,
    RESEND_COOLDOWN_MS: 30 * 60 * 1000  // 30 minutes
};

// Response Helpers
function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function sendSuccess(res, message, data = {}) {
    return res.json({ success: true, message, ...data });
}

// Validation Helpers
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(username);
}

// Calculate age from date of birth
function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Build location string from address components
function buildLocationString({ village, union, policeStation, district, division }) {
    const parts = [village, union, policeStation, district, division].filter(Boolean);
    return parts.join(', ');
}

// Email Templates
const EmailTemplates = {
    otp: (code) => `
        <h2>Your Verification Code</h2>
        <p>Your OTP code is: <strong>${code}</strong></p>
        <p>This code expires in 5 minutes.</p>
    `,
    welcome: () => `
        <h2>Welcome to SecureVoice!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now file crime complaints and track their status.</p>
    `,
    resendOtp: (code) => `
        <h2>New Verification Code</h2>
        <p>Your new OTP code is: <strong>${code}</strong></p>
        <p>This code expires in 5 minutes.</p>
    `
};
```

---

## Database Schema (Users Table)

```sql
CREATE TABLE IF NOT EXISTS `users` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `name_bn` varchar(100) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `mother_name` varchar(100) DEFAULT NULL,
  `face_image` longtext DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `nid` varchar(17) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `division` varchar(50) DEFAULT NULL,
  `district` varchar(50) DEFAULT NULL,
  `police_station` varchar(100) DEFAULT NULL,
  `union_name` varchar(100) DEFAULT NULL,
  `village` varchar(100) DEFAULT NULL,
  `place_details` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `is_nid_verified` tinyint(1) DEFAULT 0,
  `is_face_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `age` int DEFAULT NULL,
  PRIMARY KEY (`username`),
  UNIQUE KEY `unique_user_email` (`email`),
  UNIQUE KEY `unique_userid` (`userid`),
  UNIQUE KEY `unique_user_nid` (`nid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

*Next: [03_ADMIN_SYSTEM.md](03_ADMIN_SYSTEM.md) - Admin Authentication & Dashboard*
