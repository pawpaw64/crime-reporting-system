// Compatibility wrapper: re-export functions from modular auth controllers
// This file preserves the original import path './controllers/authController'
// while the actual implementations live in `controllers/auth/*`.

try {
    const adminAuth = require('./auth/adminAuth');
    const userAuth = require('./auth/userAuth');
    const otp = require('./auth/otp');
    const registration = require('./auth/registrationSteps');
    const session = require('./auth/session');

    module.exports = Object.assign({},
        adminAuth,
        userAuth,
        otp,
        registration,
        session
    );
} catch (e) {
    // If modular files are missing, fail fast with clear message
    console.error('Failed to load modular auth controllers:', e);
    // Export empty functions to avoid crashing imports elsewhere
    module.exports = {};
}
const pool = require('../db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { sendEmail } = require('../utils/emailUtils');
const { logAdminAction } = require('../utils/auditUtils');
const crypto = require('crypto');

// CONSTANTS & CONFIGURATION

const CONFIG = {
    OTP_EXPIRY_MS: 5 * 60 * 1000,              // 5 minutes
    SESSION_EXPIRY_MS: 30 * 60 * 1000,         // 30 minutes
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000,        // 5 minutes
    MAX_RESEND_ATTEMPTS: 3,
    RESEND_COOLDOWN_MS: 10 * 60 * 1000,        // 10 minutes
    MIN_PASSWORD_LENGTH: 8,
    EMAIL_VERIFICATION_EXPIRY_DAYS: 7
};

// IN-MEMORY STORES (Use Redis in production)

const otpStore = new Map();
const registrationSessions = new Map();

// HELPER FUNCTIONS

/**
 * Generates a cryptographically secure session ID
 * @returns {string} 64-character hex string
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a 6-digit OTP
 * @returns {string} 6-digit numeric string
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a secure token for email verification or password reset
 * @returns {string} 64-character hex string
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Sends a JSON error response
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 */
function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/**
 * Sends a JSON success response
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {object} [data={}] - Additional data to include
 */
function sendSuccess(res, message, data = {}) {
    return res.json({ success: true, message, ...data });
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates username format (3-50 chars, alphanumeric and underscores)
 * @param {string} username - Username to validate
 * @returns {boolean}
 */
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

/**
 * Validates Bangladesh NID format (10, 13, or 17 digits)
 * @param {string} nid - NID to validate
 * @returns {string|null} Cleaned NID or null if invalid
 */
function validateAndCleanNID(nid) {
    const nidClean = nid.replace(/\D/g, '');
    return [10, 13, 17].includes(nidClean.length) ? nidClean : null;
}

/**
 * Calculates age from date of birth
 * @param {string|Date} dob - Date of birth
 * @returns {number|null} Age or null if invalid
 */
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

/**
 * Gets frontend URL from environment or default
 * @returns {string}
 */
function getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Builds location string from address components
 * @param {object} params - Address components
 * @returns {string}
 */
function buildLocationString({ village, union, policeStation, district, division }) {
    return [village, union, policeStation, district, division].filter(Boolean).join(', ');
}

/**
 * Creates a new registration session
 * @param {string|null} phone - Phone number
 * @param {string|null} email - Email address
 * @returns {string} Session ID
 */
function createRegistrationSession(phone, email) {
    const sessionId = generateSessionId();
    registrationSessions.set(sessionId, {
        phone: phone || null,
        email: email || null,
        step: 1,
        otpVerified: false,
        nidVerified: false,
        faceVerified: false,
        data: {},
        expires: Date.now() + CONFIG.SESSION_EXPIRY_MS
    });
    return sessionId;
}

/**
 * Updates a registration session
 * @param {string} sessionId - Session ID
 * @param {object} updates - Updates to apply
 */
function updateRegistrationSession(sessionId, updates) {
    if (sessionId && registrationSessions.has(sessionId)) {
        const session = registrationSessions.get(sessionId);
        Object.assign(session, updates);
        if (updates.data) {
            session.data = { ...session.data, ...updates.data };
        }
        registrationSessions.set(sessionId, session);
    }
}

// ============================================================================
// SESSION CLEANUP (Runs every 5 minutes)
// ============================================================================

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
        if (value.expires < now) otpStore.delete(key);
    }
    for (const [key, value] of registrationSessions.entries()) {
        if (value.expires < now) registrationSessions.delete(key);
    }
}, CONFIG.CLEANUP_INTERVAL_MS);

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const EmailTemplates = {
    adminVerification: (fullName, verifyLink) => `
        <h2>Welcome to SecureVoice!</h2>
        <p>Dear ${fullName},</p>
        <p>Thank you for registering as a District Admin. Please verify your email address by clicking the button below:</p>
        
        <a href="${verifyLink}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
        </a>
        
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verifyLink}</p>
        
        <hr style="margin: 20px 0;">
        <p><strong>What happens next?</strong></p>
        <ol>
            <li>Verify your email (click the button above)</li>
            <li>Wait for Super Admin approval (2-3 business days)</li>
            <li>Once approved, you can login with your credentials</li>
        </ol>
        
        <p style="color: #666; font-size: 12px;">This link will expire in 7 days. If you did not create this account, please ignore this email.</p>
    `,

    superAdminNotification: ({ username, fullName, email, phone, designation, official_id, district_name }) => `
        <h2>New District Admin Registration Request</h2>
        <p>A new district admin has requested access to the system.</p>
        <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Full Name:</strong> ${fullName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone}</li>
            <li><strong>Designation:</strong> ${designation}</li>
            <li><strong>Official ID:</strong> ${official_id}</li>
            <li><strong>District:</strong> ${district_name}</li>
        </ul>
        <p>Please review and approve/reject this request from the Super Admin Dashboard.</p>
    `,

    otpVerification: (otp) => `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>SecureVoice - Verification Code</h2>
            <p>Your OTP code is:</p>
            <h1 style="background-color: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
        </div>
    `,

    passwordSetupSuccess: (loginUrl) => `
        <h2>Password Setup Complete</h2>
        <p>Your password has been set successfully.</p>
        <p>You can now login to the District Admin Dashboard.</p>
        <p><a href="${loginUrl}">Login Now</a></p>
    `,

    welcome: () => '<h2>Welcome!</h2><p>Your account has been created successfully.</p>',

    resendOtp: (otp) => `<p>Your new OTP: <strong>${otp}</strong></p>`
};

// ============================================================================
// ADMIN AUTHENTICATION CONTROLLERS
// ============================================================================

/**
 * District Admin Registration Request
 * Submits a registration request for Super Admin approval
 */
exports.adminRegistrationRequest = async (req, res) => {
    try {
        const { 
            username, email, fullName, phone, designation, official_id, 
            district_name, password, confirmPassword 
        } = req.body;

        // Validate required fields
        if (!username || !email || !fullName || !phone || !district_name || !designation || !password) {
            return sendError(res, 400, "All required fields must be provided");
        }

        // Password validation
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return sendError(res, 400, `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
        }

        if (password !== confirmPassword) {
            return sendError(res, 400, "Passwords do not match");
        }

        // Check for existing username or email
        const [existing] = await pool.query(
            'SELECT * FROM admins WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return sendError(res, 400, "Username or email already exists");
        }

        // Hash password and generate verification token
        const hashedPassword = await hashPassword(password);
        const emailVerificationToken = generateToken();

        // Insert admin record
        const [result] = await pool.query(
            `INSERT INTO admins(
                username, email, fullName, phone, designation, official_id, 
                district_name, password, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [username, email, fullName, phone, designation, official_id, district_name, hashedPassword]
        );

        // Insert approval workflow record
        await pool.query(
            `INSERT INTO admin_approval_workflow(
                admin_username, status, request_date
            ) VALUES (?, 'pending', NOW())`,
            [username]
        );

        // Insert email verification token
        await pool.query(
            `INSERT INTO admin_verification_tokens 
            (admin_username, token_type, token_value, expires_at, is_used)
            VALUES (?, 'email_verification', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 0)`,
            [username, emailVerificationToken, CONFIG.EMAIL_VERIFICATION_EXPIRY_DAYS]
        );

        // Send verification email to admin
        const verifyLink = `${getFrontendUrl()}/admin-verify?token=${emailVerificationToken}`;
        
        try {
            await sendEmail(
                email,
                'SecureVoice - Verify Your Email Address',
                EmailTemplates.adminVerification(fullName, verifyLink)
            );
        } catch (emailErr) {
            console.error('Error sending verification email to admin:', emailErr);
        }

        // Notify Super Admin
        try {
            await sendEmail(
                process.env.SUPER_ADMIN_EMAIL || 'superadmin@crime.gov.bd',
                'New District Admin Registration Request',
                EmailTemplates.superAdminNotification({ username, fullName, email, phone, designation, official_id, district_name })
            );
        } catch (emailErr) {
            console.error('Error sending notification to Super Admin:', emailErr);
        }

        sendSuccess(res, 
            "Registration request submitted successfully! Please check your email to verify your address. You will be notified once approved by the Super Admin.",
            { adminId: result.insertId }
        );

    } catch (err) {
        console.error("Admin registration request error:", err);
        sendError(res, 500, "Server error while processing registration request");
    }
};

/**
 * Admin Login - Verifies credentials and creates session
 */
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return sendError(res, 400, "Username and password are required");
        }

        // Fetch admin record
        const [results] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (results.length === 0) {
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: 'User not found',
                ipAddress: req.ip
            });
            return sendError(res, 401, "Invalid username or password");
        }

        const admin = results[0];

        // Check workflow approval status
        const [workflowResults] = await pool.query(
            'SELECT status FROM admin_approval_workflow WHERE admin_username = ?',
            [username]
        );

        const status = workflowResults.length > 0 ? workflowResults[0].status : 'pending';
        
        if (status !== 'approved') {
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: `Account status: ${status}`,
                ipAddress: req.ip
            });

            const statusMessages = {
                pending: 'Your registration request is pending Super Admin approval.',
                rejected: 'Your registration request was rejected. Please contact the Super Admin.',
                suspended: 'Your account has been suspended. Please contact the Super Admin.'
            };

            return sendError(res, 403, statusMessages[status] || statusMessages.pending);
        }

        // Check if account is active
        if (!admin.is_active) {
            return sendError(res, 403, "Account is inactive. Please contact support.");
        }

        // Check if password is set
        if (!admin.password) {
            return sendError(res, 403, "Please complete your password setup using the link sent to your email.");
        }

        // Verify password
        const isMatch = await comparePassword(password, admin.password);
        if (!isMatch) {
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: 'Invalid password',
                ipAddress: req.ip
            });
            return sendError(res, 401, "Invalid username or password");
        }

        // Check email verification status
        const [verificationResults] = await pool.query(
            `SELECT is_used FROM admin_verification_tokens 
             WHERE admin_username = ? AND token_type = 'email_verification' 
             ORDER BY created_at DESC LIMIT 1`,
            [username]
        );

        if (verificationResults.length === 0 || verificationResults[0].is_used !== 1) {
            return sendError(res, 403, "Please verify your email before logging in.");
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE username = ?',
            [username]
        );

        // Create session
        req.session.adminId = admin.adminid;
        req.session.adminUsername = admin.username;
        req.session.adminEmail = admin.email;
        req.session.district = admin.district_name;
        req.session.isAdmin = true;

        // Log successful login
        await logAdminAction(username, 'login', {
            result: 'success',
            actionDetails: 'Successful login',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        sendSuccess(res, "Login successful", {
            redirect: "/admin-dashboard",
            admin: {
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                district: admin.district_name
            }
        });

    } catch (err) {
        console.error("Admin login error:", err);
        sendError(res, 500, "Server error");
    }
};

/**
 * Admin OTP Verification (Legacy - kept for backward compatibility)
 */
exports.adminVerifyOTP = async (req, res) => {
    try {
        const { username, otp } = req.body;

        if (!username || !otp) {
            return sendError(res, 400, "Username and OTP are required");
        }

        // Verify OTP from database
        const [otpResults] = await pool.query(
            `SELECT * FROM admin_otp_verification 
             WHERE admin_username = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW() 
             ORDER BY created_at DESC LIMIT 1`,
            [username, otp]
        );

        if (otpResults.length === 0) {
            await logAdminAction(username, 'otp_verification', {
                result: 'failure',
                actionDetails: 'Invalid or expired OTP',
                ipAddress: req.ip
            });
            return sendError(res, 401, "Invalid or expired OTP");
        }

        // Mark OTP as used
        await pool.query(
            'UPDATE admin_otp_verification SET is_used = 1 WHERE id = ?',
            [otpResults[0].id]
        );

        // Get admin details
        const [adminResults] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        const admin = adminResults[0];

        // Update last login
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE username = ?',
            [username]
        );

        // Create session
        req.session.adminId = admin.adminid;
        req.session.adminUsername = admin.username;
        req.session.adminEmail = admin.email;
        req.session.district = admin.district_name;
        req.session.isAdmin = true;

        // Log successful login
        await logAdminAction(username, 'login', {
            result: 'success',
            actionDetails: 'Successful login with OTP verification',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        sendSuccess(res, "Login successful", {
            redirect: "/admin-dashboard",
            admin: {
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                district: admin.district_name
            }
        });

    } catch (err) {
        console.error("OTP verification error:", err);
        sendError(res, 500, "Server error");
    }
};

/**
 * Setup Admin Password (After Approval)
 */
exports.setupAdminPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!token || !password || !confirmPassword) {
            return sendError(res, 400, "All fields are required");
        }

        if (password !== confirmPassword) {
            return sendError(res, 400, "Passwords do not match");
        }

        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return sendError(res, 400, `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
        }

        // Find admin with valid token
        const [tokenResults] = await pool.query(
            `SELECT admin_username FROM admin_verification_tokens 
             WHERE token_value = ? AND token_type = 'password_setup' 
             AND expires_at > NOW() AND is_used = 0`,
            [token]
        );

        if (tokenResults.length === 0) {
            return sendError(res, 400, "Invalid or expired password setup link");
        }

        const username = tokenResults[0].admin_username;

        // Get admin email for confirmation
        const [adminResults] = await pool.query(
            'SELECT email FROM admins WHERE username = ?',
            [username]
        );

        // Hash and update password
        const hashedPassword = await hashPassword(password);

        await pool.query(
            `UPDATE admins SET password = ?, is_active = 1 WHERE username = ?`,
            [hashedPassword, username]
        );

        // Mark token as used
        await pool.query(
            `UPDATE admin_verification_tokens 
             SET is_used = 1 
             WHERE token_value = ? AND token_type = 'password_setup'`,
            [token]
        );

        // Log action
        await logAdminAction(username, 'password_setup', {
            result: 'success',
            actionDetails: 'Password setup completed',
            ipAddress: req.ip
        });

        // Send confirmation email
        if (adminResults.length > 0) {
            try {
                await sendEmail(
                    adminResults[0].email,
                    'Password Setup Successful',
                    EmailTemplates.passwordSetupSuccess(`${getFrontendUrl()}/adminLogin`)
                );
            } catch (emailErr) {
                console.error('Error sending confirmation email:', emailErr);
            }
        }

        sendSuccess(res, "Password setup successful! Please verify your email to complete activation.", {
            redirect: "/adminLogin"
        });

    } catch (err) {
        console.error("Password setup error:", err);
        sendError(res, 500, "Server error");
    }
};

/**
 * Verify Admin Email
 */
exports.verifyAdminEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return sendError(res, 400, "Verification token is required");
        }

        // Find valid token
        const [tokenResults] = await pool.query(
            `SELECT admin_username FROM admin_verification_tokens 
             WHERE token_value = ? AND token_type = 'email_verification' 
             AND is_used = 0 AND expires_at > NOW()`,
            [token]
        );

        if (tokenResults.length === 0) {
            // Check if token exists but is expired
            const [expiredCheck] = await pool.query(
                `SELECT admin_username, expires_at FROM admin_verification_tokens 
                 WHERE token_value = ? AND token_type = 'email_verification'`,
                [token]
            );
            
            if (expiredCheck.length > 0 && expiredCheck[0].expires_at < new Date()) {
                return sendError(res, 400, "Verification link has expired. Please register again.");
            }
            
            return sendError(res, 400, "Invalid or already used verification token");
        }

        const username = tokenResults[0].admin_username;

        // Mark token as used
        await pool.query(
            `UPDATE admin_verification_tokens 
             SET is_used = 1 
             WHERE token_value = ? AND token_type = 'email_verification'`,
            [token]
        );

        // Log action
        await logAdminAction(username, 'email_verified', {
            result: 'success',
            ipAddress: req.ip
        });

        sendSuccess(res, "Email verified successfully! Your account is now pending Super Admin approval.");

    } catch (err) {
        console.error("Email verification error:", err);
        sendError(res, 500, "Server error");
    }
};

/**
 * Admin Logout
 */
exports.adminLogout = async (req, res) => {
    try {
        const adminUsername = req.session.adminUsername;

        if (adminUsername) {
            await logAdminAction(adminUsername, 'logout', {
                result: 'success',
                ipAddress: req.ip
            });
        }

        req.session.destroy((err) => {
            if (err) {
                return sendError(res, 500, "Error logging out");
            }
            res.clearCookie('connect.sid');
            sendSuccess(res, "Logged out successfully");
        });
    } catch (err) {
        console.error("Logout error:", err);
        sendError(res, 500, "Server error");
    }
};

/**
 * Check Admin Authentication Status
 */
exports.checkAdminAuth = async (req, res) => {
    if (req.session.adminId && req.session.adminUsername) {
        return res.json({
            success: true,
            isAuthenticated: true,
            admin: {
                username: req.session.adminUsername,
                email: req.session.adminEmail,
                district: req.session.district
            }
        });
    }
    res.status(401).json({
        success: false,
        isAuthenticated: false
    });
};

// ============================================================================
// USER AUTHENTICATION CONTROLLERS
// ============================================================================

/**
 * User Signup - Complete Registration (Step 6)
 */
exports.signup = async (req, res) => {
    try {
        const { 
            username, email, password, sessionId,
            phone, nid, dob, nameEn, nameBn, fatherName, motherName,
            faceImage, division, district, policeStation, union, village, placeDetails
        } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return sendError(res, 400, "Username, email and password are required");
        }

        // Validate username format
        if (!isValidUsername(username)) {
            return sendError(res, 400, "Username must be 3-50 characters (letters, numbers, underscores only)");
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return sendError(res, 400, "Invalid email format");
        }

        // Validate password length
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            return sendError(res, 400, `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
        }

        // Check for existing username
        const [existingUsername] = await pool.query(
            'SELECT userid FROM users WHERE username = ?', 
            [username]
        );
        if (existingUsername.length > 0) {
            return sendError(res, 400, "This username is already taken");
        }

        // Check for existing email
        const [existingEmail] = await pool.query(
            'SELECT userid FROM users WHERE email = ?', 
            [email]
        );
        if (existingEmail.length > 0) {
            return sendError(res, 400, "This email is already registered");
        }

        // Get session data or use direct data
        let userData = {};
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            userData = { ...session.data, phone: session.phone };
        } else {
            const location = [village, union, district, division].filter(Boolean).join(', ');
            userData = { 
                phone, nid, dob, 
                fullName: nameEn, nameBn, fatherName, motherName, 
                faceImage, division, district, policeStation, 
                unionName: union, village, placeDetails, location 
            };
        }

        // Hash password and calculate age
        const hashedPassword = await hashPassword(password);
        const age = calculateAge(userData.dob);

        // Insert user into database
        const [result] = await pool.query(
            `INSERT INTO users (
                username, email, password, fullName, name_bn, phone, nid, dob, age,
                father_name, mother_name, face_image, location, division, district,
                police_station, union_name, village, place_details,
                is_verified, is_nid_verified, is_face_verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                username, email, hashedPassword,
                userData.fullName || null, userData.nameBn || null, userData.phone || null,
                userData.nid || null, userData.dob || null, age,
                userData.fatherName || null, userData.motherName || null, userData.faceImage || null,
                userData.location || null, userData.division || null, userData.district || null,
                userData.policeStation || null, userData.unionName || null, userData.village || null,
                userData.placeDetails || null,
                1, userData.nid ? 1 : 0, userData.faceImage ? 1 : 0
            ]
        );

        // Create session
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;

        // Cleanup temporary stores
        if (sessionId) registrationSessions.delete(sessionId);
        if (userData.phone) otpStore.delete(userData.phone);
        otpStore.delete(email);

        // Send welcome email
        try {
            await sendEmail(email, 'Welcome to SecureVoice!', EmailTemplates.welcome());
        } catch (e) { 
            console.error('Welcome email error:', e); 
        }

        sendSuccess(res, "Registration successful!", {
            user: { id: result.insertId, username, email, name: userData.fullName }
        });

    } catch (err) {
        console.error("Signup error:", err);
        
        // Handle duplicate entry errors
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('username')) {
                return sendError(res, 400, "Username already taken");
            }
            if (err.message.includes('email')) {
                return sendError(res, 400, "Email already registered");
            }
            if (err.message.includes('nid')) {
                return sendError(res, 400, "NID already registered");
            }
        }
        sendError(res, 500, "Registration failed. Please try again.");
    }
};

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return sendError(res, 400, "Username and password are required");
        }

        // Fetch user
        const [results] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (results.length === 0) {
            return sendError(res, 401, "Invalid username or password");
        }

        const user = results[0];

        // Verify password
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return sendError(res, 401, "Invalid username or password");
        }

        // Create session
        req.session.userId = user.userid;
        req.session.username = user.username;
        req.session.email = user.email;

        sendSuccess(res, "Login successful", { redirect: "/profile" });

    } catch (err) {
        console.error("Login error:", err);
        sendError(res, 500, "Server error");
    }
};

// ============================================================================
// OTP CONTROLLERS
// ============================================================================

/**
 * Send OTP (Registration Step 1)
 */
exports.sendOTP = async (req, res) => {
    console.log('[DEBUG] Backend sendOTP: Request received');
    console.log('[DEBUG] Backend sendOTP: Request body:', JSON.stringify(req.body));
    
    try {
        const { phone, email } = req.body;
        const identifier = phone || email;
        
        console.log('[DEBUG] Backend sendOTP: Identifier:', identifier);

        if (!identifier) {
            console.log('[DEBUG] Backend sendOTP: FAILED - No identifier provided');
            return sendError(res, 400, "Phone number or email is required");
        }

        // Check if already registered
        console.log('[DEBUG] Backend sendOTP: Checking database for existing user...');
        const [existingUsers] = await pool.query(
            'SELECT userid FROM users WHERE phone = ? OR email = ?',
            [phone || '', email || '']
        );
        console.log('[DEBUG] Backend sendOTP: Existing users found:', existingUsers.length);
        
        if (existingUsers.length > 0) {
            console.log('[DEBUG] Backend sendOTP: FAILED - User already registered');
            return sendError(res, 400, phone ? "Phone already registered" : "Email already registered");
        }

        // Generate and store OTP
        const otp = generateOTP();
        console.log('[DEBUG] Backend sendOTP: Generated OTP:', otp);
        
        const expires = Date.now() + CONFIG.OTP_EXPIRY_MS;
        otpStore.set(identifier, { otp, expires, verified: false });
        console.log('[DEBUG] Backend sendOTP: OTP stored in otpStore, expires at:', new Date(expires).toISOString());

        // Create registration session
        const sessionId = createRegistrationSession(phone, email);
        console.log('[DEBUG] Backend sendOTP: Generated sessionId:', sessionId);
        console.log('[DEBUG] Backend sendOTP: Registration session created');

        // Send OTP via email
        if (email) {
            try {
                await sendEmail(email, 'SecureVoice - Verification Code', EmailTemplates.otpVerification(otp));
            } catch (emailError) {
                console.error('Email send error:', emailError);
            }
        }

        // Build response
        const response = { 
            success: true, 
            message: email ? "OTP sent to email" : "OTP sent to mobile", 
            sessionId 
        };
        
        // Include OTP in development mode
        if (process.env.NODE_ENV !== 'production') {
            response.devOTP = otp;
            console.log(`[DEV] OTP for ${identifier}: ${otp}`);
        }
        
        console.log('[DEBUG] Backend sendOTP: SUCCESS - Sending response:', JSON.stringify(response));
        res.json(response);

    } catch (err) {
        console.error('[DEBUG] Backend sendOTP: ERROR:', err.message);
        console.error("Send OTP error:", err);
        sendError(res, 500, "Failed to send OTP");
    }
};

/**
 * Verify OTP (Registration Step 2)
 */
exports.verifyOTP = (req, res) => {
    try {
        const { phone, email, otp, sessionId } = req.body;
        const identifier = phone || email;

        if (!identifier || !otp) {
            return sendError(res, 400, "Phone/Email and OTP are required");
        }

        const storedData = otpStore.get(identifier);
        if (!storedData) {
            return sendError(res, 400, "OTP not found. Please request a new one.");
        }

        if (Date.now() > storedData.expires) {
            otpStore.delete(identifier);
            return sendError(res, 400, "OTP has expired");
        }

        if (storedData.otp !== otp) {
            return sendError(res, 400, "Invalid OTP");
        }

        // Mark as verified
        storedData.verified = true;
        otpStore.set(identifier, storedData);

        // Update registration session
        updateRegistrationSession(sessionId, { otpVerified: true, step: 2 });

        sendSuccess(res, "OTP verified successfully");

    } catch (err) {
        console.error("Verify OTP error:", err);
        sendError(res, 500, "Verification failed");
    }
};

/**
 * Resend OTP
 */
exports.resendOTP = async (req, res) => {
    try {
        const { phone, email } = req.body;
        const identifier = phone || email;

        if (!identifier) {
            return sendError(res, 400, "Phone or email required");
        }

        // Check rate limiting
        const existingOTP = otpStore.get(identifier);
        if (existingOTP && existingOTP.resendCount >= CONFIG.MAX_RESEND_ATTEMPTS) {
            if (Date.now() - existingOTP.firstSentAt < CONFIG.RESEND_COOLDOWN_MS) {
                return sendError(res, 429, "Too many requests. Try again later.");
            }
        }

        // Generate new OTP
        const otp = generateOTP();
        
        otpStore.set(identifier, {
            otp,
            expires: Date.now() + CONFIG.OTP_EXPIRY_MS,
            verified: false,
            resendCount: (existingOTP?.resendCount || 0) + 1,
            firstSentAt: existingOTP?.firstSentAt || Date.now()
        });

        // Send via email
        if (email) {
            try {
                await sendEmail(email, 'SecureVoice - New Code', EmailTemplates.resendOtp(otp));
            } catch (e) { 
                console.error('Email error:', e); 
            }
        }

        // Build response
        const response = { success: true, message: "New OTP sent" };
        if (process.env.NODE_ENV !== 'production') {
            response.devOTP = otp;
            console.log(`[DEV] New OTP: ${otp}`);
        }
        res.json(response);

    } catch (err) {
        console.error("Resend OTP error:", err);
        sendError(res, 500, "Failed to resend OTP");
    }
};

// ============================================================================
// USER SESSION CONTROLLERS
// ============================================================================

/**
 * User Logout
 */
exports.userLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return sendError(res, 500, "Error logging out");
        }
        res.clearCookie('connect.sid');
        sendSuccess(res, "Logout successful");
    });
};

/**
 * Check User Authentication Status
 */
exports.checkAuth = (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ 
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                email: req.session.email
            }
        });
    } else {
        res.status(401).json({ authenticated: false });
    }
};

/**
 * Logout (Alias for userLogout)
 */
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return sendError(res, 500, "Error logging out");
        }
        res.clearCookie('connect.sid');
        sendSuccess(res, "Logout successful");
    });
};

// ============================================================================
// REGISTRATION STEP CONTROLLERS
// ============================================================================

/**
 * Verify NID (Registration Step 3)
 */
exports.verifyNID = async (req, res) => {
    try {
        const { nid, dob, nameEn, nameBn, fatherName, motherName, sessionId } = req.body;

        if (!nid || !dob || !nameEn) {
            return sendError(res, 400, "NID, DOB, and name are required");
        }

        // Validate NID format
        const nidClean = validateAndCleanNID(nid);
        if (!nidClean) {
            return sendError(res, 400, "Invalid NID format");
        }

        // Check if NID already registered
        const [existingNID] = await pool.query(
            'SELECT userid FROM users WHERE nid = ?', 
            [nidClean]
        );
        if (existingNID.length > 0) {
            return sendError(res, 400, "This NID is already registered");
        }

        // Update registration session
        updateRegistrationSession(sessionId, {
            nidVerified: true,
            step: 3,
            data: { nid: nidClean, dob, fullName: nameEn, nameBn, fatherName, motherName }
        });

        sendSuccess(res, "NID verified successfully", { 
            data: { name: nameEn, nidLast4: nidClean.slice(-4) } 
        });

    } catch (err) {
        console.error("Verify NID error:", err);
        sendError(res, 500, "NID verification failed");
    }
};

/**
 * Save Face Image (Registration Step 4)
 */
exports.saveFaceImage = async (req, res) => {
    try {
        const { faceImage, sessionId } = req.body;

        if (!faceImage) {
            return sendError(res, 400, "Face image is required");
        }

        if (!faceImage.startsWith('data:image/')) {
            return sendError(res, 400, "Invalid image format");
        }

        // Update registration session
        updateRegistrationSession(sessionId, {
            faceVerified: true,
            step: 4,
            data: { faceImage }
        });

        sendSuccess(res, "Face image saved successfully");

    } catch (err) {
        console.error("Save face error:", err);
        sendError(res, 500, "Failed to save face image");
    }
};

/**
 * Save Address (Registration Step 5)
 */
exports.saveAddress = async (req, res) => {
    try {
        const { division, district, policeStation, union, village, placeDetails, sessionId } = req.body;

        if (!division || !district) {
            return sendError(res, 400, "Division and district are required");
        }

        // Build location string
        const location = buildLocationString({ village, union, policeStation, district, division });

        // Update registration session
        updateRegistrationSession(sessionId, {
            step: 5,
            data: { division, district, policeStation, unionName: union, village, placeDetails, location }
        });

        sendSuccess(res, "Address saved successfully");

    } catch (err) {
        console.error("Save address error:", err);
        sendError(res, 500, "Failed to save address");
    }
};

/**
 * Get Registration Session Status
 */
exports.getRegistrationStatus = (req, res) => {
    const { sessionId } = req.params;
    
    if (!sessionId || !registrationSessions.has(sessionId)) {
        return sendError(res, 404, "Session not found or expired");
    }
    
    const session = registrationSessions.get(sessionId);
    
    sendSuccess(res, "Session found", {
        session: {
            step: session.step,
            otpVerified: session.otpVerified,
            nidVerified: session.nidVerified,
            faceVerified: session.faceVerified,
            phone: session.phone,
            hasData: Object.keys(session.data).length > 0
        }
    });
};

// === Module re-exports (modular controllers override legacy implementations) ===
try {
    const adminAuth = require('./auth/adminAuth');
    const userAuth = require('./auth/userAuth');
    const otpModule = require('./auth/otp');
    const registrationSteps = require('./auth/registrationSteps');
    const sessionModule = require('./auth/session');

    Object.assign(exports, {
        adminRegistrationRequest: adminAuth.adminRegistrationRequest || exports.adminRegistrationRequest,
        adminLogin: adminAuth.adminLogin || exports.adminLogin,
        adminVerifyOTP: adminAuth.adminVerifyOTP || exports.adminVerifyOTP,
        setupAdminPassword: adminAuth.setupAdminPassword || exports.setupAdminPassword,
        verifyAdminEmail: adminAuth.verifyAdminEmail || exports.verifyAdminEmail,
        adminLogout: adminAuth.adminLogout || exports.adminLogout,
        checkAdminAuth: adminAuth.checkAdminAuth || exports.checkAdminAuth,

        signup: userAuth.signup || exports.signup,
        login: userAuth.login || exports.login,

        sendOTP: otpModule.sendOTP || exports.sendOTP,
        verifyOTP: otpModule.verifyOTP || exports.verifyOTP,
        resendOTP: otpModule.resendOTP || exports.resendOTP,

        startRegistrationSession: registrationSteps.startRegistrationSession || exports.startRegistrationSession,
        getRegistrationSession: registrationSteps.getRegistrationSession || exports.getRegistrationSession,
        saveAddress: registrationSteps.saveAddress || exports.saveAddress,
        saveFaceImage: registrationSteps.saveFaceImage || exports.saveFaceImage,
        verifyNID: registrationSteps.verifyNID || exports.verifyNID,

        userLogout: sessionModule.userLogout || exports.userLogout,
        checkAuth: sessionModule.checkAuth || exports.checkAuth,
        logout: sessionModule.logout || exports.logout
    });
} catch (e) {
    console.error('Auth module re-export warning:', e);
}