const pool = require('../db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { sendEmail } = require('../utils/emailUtils');
const { logAdminAction } = require('../utils/auditUtils');
const crypto = require('crypto');

// Store OTPs and registration sessions temporarily (Use Redis in production)
const otpStore = new Map();
const registrationSessions = new Map();

// Helper: Generate unique session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// Helper: Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Cleanup expired sessions every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
        if (value.expires < now) otpStore.delete(key);
    }
    for (const [key, value] of registrationSessions.entries()) {
        if (value.expires < now) registrationSessions.delete(key);
    }
}, 5 * 60 * 1000);

// ========== DISTRICT ADMIN REGISTRATION REQUEST (NEW SECURE SYSTEM) ==========
// Admin submits registration request - goes to Super Admin for approval
exports.adminRegistrationRequest = async (req, res) => {
    try {
        const { 
            username, email, fullName, phone, designation, official_id, 
            district_name, documents 
        } = req.body;

        // Validation
        if (!username || !email || !fullName || !phone || !district_name || !designation) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        // Check if username or email already exists
        const [existing] = await pool.query(
            'SELECT * FROM admins WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        // Insert admin (core identity data)
        const [result] = await pool.query(
            `INSERT INTO admins(
                username, email, fullName, phone, designation, official_id, 
                district_name, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [username, email, fullName, phone, designation, official_id, district_name]
        );

        // Insert into admin_approval_workflow table (workflow data)
        await pool.query(
            `INSERT INTO admin_approval_workflow(
                admin_username, status, request_date
            ) VALUES (?, 'pending', NOW())`,
            [username]
        );

        // Send notification email to Super Admin
        try {
            await sendEmail(
                process.env.SUPER_ADMIN_EMAIL || 'superadmin@crime.gov.bd',
                'New District Admin Registration Request',
                `
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
                `
            );
        } catch (emailErr) {
            console.error('Error sending notification to Super Admin:', emailErr);
        }

        res.json({
            success: true,
            message: "Registration request submitted successfully. You will receive an email once approved by the Super Admin.",
            adminId: result.insertId
        });

    } catch (err) {
        console.error("Admin registration request error:", err);
        res.status(500).json({
            success: false,
            message: "Server error while processing registration request"
        });
    }
};

// ========== ADMIN LOGIN (SECURE WITH OTP) ==========
// Step 1: Verify credentials and send OTP
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // Check if admin exists
        const [results] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (results.length === 0) {
            // Log failed attempt
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: 'User not found',
                ipAddress: req.ip
            });

            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const admin = results[0];

        // Check workflow status from admin_approval_workflow table
        const [workflowResults] = await pool.query(
            'SELECT status FROM admin_approval_workflow WHERE admin_username = ?',
            [username]
        );

        if (workflowResults.length === 0 || workflowResults[0].status !== 'approved') {
            const status = workflowResults.length > 0 ? workflowResults[0].status : 'pending';
            
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: `Account status: ${status}`,
                ipAddress: req.ip
            });

            let message = 'Your registration request is pending Super Admin approval.';
            if (status === 'rejected') {
                message = 'Your registration request was rejected. Please contact the Super Admin.';
            } else if (status === 'suspended') {
                message = 'Your account has been suspended. Please contact the Super Admin.';
            }

            return res.status(403).json({
                success: false,
                message: message
            });
        }

        if (!admin.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive. Please contact support."
            });
        }

        // Check if password is set (not null)
        if (!admin.password) {
            return res.status(403).json({
                success: false,
                message: "Please complete your password setup using the link sent to your email."
            });
        }

        // Verify password
        const isMatch = await comparePassword(password, admin.password);
        if (!isMatch) {
            await logAdminAction(username, 'login_attempt', {
                result: 'failure',
                actionDetails: 'Invalid password',
                ipAddress: req.ip
            });

            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // Check if email is verified (using admin_verification_tokens table)
        const [verificationResults] = await pool.query(
            `SELECT is_used FROM admin_verification_tokens 
             WHERE admin_username = ? AND token_type = 'email_verification' 
             ORDER BY created_at DESC LIMIT 1`,
            [username]
        );

        // If no verification token exists or it hasn't been used, email is not verified
        if (verificationResults.length === 0 || verificationResults[0].is_used !== 1) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in."
            });
        }

        // Generate and send OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await pool.query(
            'INSERT INTO admin_otp_verification (admin_username, otp_code, expires_at) VALUES (?, ?, ?)',
            [username, otp, expiresAt]
        );

        // Send OTP via email
        try {
            await sendEmail(
                admin.email,
                'Your Admin Login OTP',
                `
                <h2>Admin Login Verification</h2>
                <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not attempt to login, please contact Super Admin immediately.</p>
                `
            );
        } catch (emailErr) {
            console.error('Error sending OTP email:', emailErr);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again."
            });
        }

        // Log OTP sent
        await logAdminAction(username, 'otp_sent', {
            result: 'success',
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: "OTP sent to your registered email",
            requireOTP: true,
            username: username
        });

    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Step 2: Verify OTP and complete login
exports.adminVerifyOTP = async (req, res) => {
    try {
        const { username, otp } = req.body;

        if (!username || !otp) {
            return res.status(400).json({
                success: false,
                message: "Username and OTP are required"
            });
        }

        // Verify OTP
        const [otpResults] = await pool.query(
            'SELECT * FROM admin_otp_verification WHERE admin_username = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [username, otp]
        );

        if (otpResults.length === 0) {
            await logAdminAction(username, 'otp_verification', {
                result: 'failure',
                actionDetails: 'Invalid or expired OTP',
                ipAddress: req.ip
            });

            return res.status(401).json({
                success: false,
                message: "Invalid or expired OTP"
            });
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

        // Set session
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

        res.json({
            success: true,
            message: "Login successful",
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
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== PASSWORD SETUP (AFTER APPROVAL) ==========
// Super Admin approves request and sends password setup link
exports.setupAdminPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!token || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        // Find admin with valid token (using admin_verification_tokens table)
        const [tokenResults] = await pool.query(
            `SELECT admin_username FROM admin_verification_tokens 
             WHERE token_value = ? AND token_type = 'password_setup' 
             AND expires_at > NOW() AND is_used = 0`,
            [token]
        );

        if (tokenResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password setup link"
            });
        }

        const username = tokenResults[0].admin_username;

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Update password and activate account
        await pool.query(
            `UPDATE admins 
            SET password = ?, is_active = 1
            WHERE username = ?`,
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
        try {
            await sendEmail(
                admin.email,
                'Password Setup Successful',
                `
                <h2>Password Setup Complete</h2>
                <p>Your password has been set successfully.</p>
                <p>You can now login to the District Admin Dashboard.</p>
                <p><a href="${process.env.FRONTEND_URL}/adminLogin">Login Now</a></p>
                `
            );
        } catch (emailErr) {
            console.error('Error sending confirmation email:', emailErr);
        }

        res.json({
            success: true,
            message: "Password setup successful! Please verify your email to complete activation.",
            redirect: "/adminLogin"
        });

    } catch (err) {
        console.error("Password setup error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ========== EMAIL VERIFICATION ==========
exports.verifyAdminEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required"
            });
        }

        // Find admin with token (using admin_verification_tokens table)
        const [tokenResults] = await pool.query(
            `SELECT admin_username FROM admin_verification_tokens 
             WHERE token_value = ? AND token_type = 'email_verification' 
             AND is_used = 0`,
            [token]
        );

        if (tokenResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token"
            });
        }

        const username = tokenResults[0].admin_username;

        // Mark token as used (email verified)
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

        res.json({
            success: true,
            message: "Email verified successfully! You can now login."
        });

    } catch (err) {
        console.error("Email verification error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Admin Logout
exports.adminLogout = async (req, res) => {
    try {
        const adminUsername = req.session.adminUsername;

        if (adminUsername) {
            // Log logout action
            await logAdminAction(adminUsername, 'logout', {
                result: 'success',
                ipAddress: req.ip
            });
        }

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Error logging out"
                });
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: "Logged out successfully"
            });
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Check Admin Authentication
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

// ========== OLD ADMIN LOGIN/SIGNUP - REMOVED FOR SECURITY ==========
// The old adminLogin function that allowed self-registration has been removed
// and replaced with the secure registration request + approval workflow above

// User Signup - Complete Registration (Step 6)
exports.signup = async (req, res) => {
    try {
        const { 
            username, email, password, sessionId,
            phone, nid, dob, nameEn, nameBn, fatherName, motherName,
            faceImage, division, district, policeStation, union, village, placeDetails
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "Username, email and password are required" });
        }

        // Username validation
        const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ success: false, message: "Username must be 3-50 characters (letters, numbers, underscores only)" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        // Check if username exists
        const [existingUsername] = await pool.query('SELECT userid FROM users WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ success: false, message: "This username is already taken" });
        }

        // Check if email exists
        const [existingEmail] = await pool.query('SELECT userid FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ success: false, message: "This email is already registered" });
        }

        // Get session data or use direct data
        let userData = {};
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            userData = session.data;
            userData.phone = session.phone;
        } else {
            const location = [village, union, district, division].filter(Boolean).join(', ');
            userData = { phone, nid, dob, fullName: nameEn, nameBn, fatherName, motherName, faceImage, division, district, policeStation, unionName: union, village, placeDetails, location };
        }

        const hashedPassword = await hashPassword(password);

        // Calculate age from DOB
        let age = null;
        if (userData.dob) {
            const birthDate = new Date(userData.dob);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        }

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

        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;

        // Cleanup
        if (sessionId) registrationSessions.delete(sessionId);
        if (userData.phone) otpStore.delete(userData.phone);
        otpStore.delete(email);

        // Send welcome email
        try {
            await sendEmail(email, 'Welcome to SecureVoice!', '<h2>Welcome!</h2><p>Your account has been created successfully.</p>');
        } catch (e) { console.error('Welcome email error:', e); }

        res.json({
            success: true,
            message: "Registration successful!",
            user: { id: result.insertId, username, email, name: userData.fullName }
        });
    } catch (err) {
        console.error("Signup error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('username')) return res.status(400).json({ success: false, message: "Username already taken" });
            if (err.message.includes('email')) return res.status(400).json({ success: false, message: "Email already registered" });
            if (err.message.includes('nid')) return res.status(400).json({ success: false, message: "NID already registered" });
        }
        res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
};

// User Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const [results] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const user = results[0];
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        req.session.userId = user.userid;
        req.session.username = user.username;
        req.session.email = user.email;

        res.json({
            success: true,
            message: "Login successful",
            redirect: "/profile"
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Send OTP (Step 1)
exports.sendOTP = async (req, res) => {
    console.log('[DEBUG] Backend sendOTP: Request received');
    console.log('[DEBUG] Backend sendOTP: Request body:', JSON.stringify(req.body));
    
    try {
        const { phone, email } = req.body;
        const identifier = phone || email;
        
        console.log('[DEBUG] Backend sendOTP: Identifier:', identifier);

        if (!identifier) {
            console.log('[DEBUG] Backend sendOTP: FAILED - No identifier provided');
            return res.status(400).json({ success: false, message: "Phone number or email is required" });
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
            return res.status(400).json({ success: false, message: phone ? "Phone already registered" : "Email already registered" });
        }

        const otp = generateOTP();
        console.log('[DEBUG] Backend sendOTP: Generated OTP:', otp);
        
        const expires = Date.now() + 5 * 60 * 1000;
        otpStore.set(identifier, { otp, expires, verified: false });
        console.log('[DEBUG] Backend sendOTP: OTP stored in otpStore, expires at:', new Date(expires).toISOString());

        // Create registration session
        const sessionId = generateSessionId();
        console.log('[DEBUG] Backend sendOTP: Generated sessionId:', sessionId);
        
        registrationSessions.set(sessionId, {
            phone: phone || null,
            email: email || null,
            step: 1,
            otpVerified: false,
            nidVerified: false,
            faceVerified: false,
            data: {},
            expires: Date.now() + 30 * 60 * 1000
        });
        console.log('[DEBUG] Backend sendOTP: Registration session created');

        // Send OTP via email
        if (email) {
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>SecureVoice - Verification Code</h2>
                    <p>Your OTP code is:</p>
                    <h1 style="background-color: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 5 minutes.</p>
                </div>
            `;
            try {
                await sendEmail(email, 'SecureVoice - Verification Code', html);
            } catch (emailError) {
                console.error('Email send error:', emailError);
            }
        }

        const response = { success: true, message: email ? "OTP sent to email" : "OTP sent to mobile", sessionId };
        if (process.env.NODE_ENV !== 'production') {
            response.devOTP = otp;
            console.log(`[DEV] OTP for ${identifier}: ${otp}`);
        }
        console.log('[DEBUG] Backend sendOTP: SUCCESS - Sending response:', JSON.stringify(response));
        res.json(response);
    } catch (err) {
        console.error('[DEBUG] Backend sendOTP: ERROR:', err.message);
        console.error("Send OTP error:", err);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

// Verify OTP (Step 2)
exports.verifyOTP = (req, res) => {
    try {
        const { phone, email, otp, sessionId } = req.body;
        const identifier = phone || email;

        if (!identifier || !otp) {
            return res.status(400).json({ success: false, message: "Phone/Email and OTP are required" });
        }

        const storedData = otpStore.get(identifier);
        if (!storedData) {
            return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
        }

        if (Date.now() > storedData.expires) {
            otpStore.delete(identifier);
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        storedData.verified = true;
        otpStore.set(identifier, storedData);

        // Update registration session
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            session.otpVerified = true;
            session.step = 2;
            registrationSessions.set(sessionId, session);
        }

        res.json({ success: true, message: "OTP verified successfully" });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};

// Admin Logout
exports.adminLogout = (req, res) => {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: "Error logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
    });
};

// User Logout
exports.userLogout = (req, res) => {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: "Error logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logout successful" });
    });
};

// Check admin auth
exports.checkAdminAuth = (req, res) => {
    if (req.session && req.session.adminId) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
};

// Check user auth
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

// Alias for logout
exports.logout = (req, res) => {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: "Error logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logout successful" });
    });
};

// Verify NID (Step 3)
exports.verifyNID = async (req, res) => {
    try {
        const { nid, dob, nameEn, nameBn, fatherName, motherName, sessionId } = req.body;

        if (!nid || !dob || !nameEn) {
            return res.status(400).json({ success: false, message: "NID, DOB, and name are required" });
        }

        // Validate NID format (Bangladesh: 10, 13, or 17 digits)
        const nidClean = nid.replace(/\D/g, '');
        if (![10, 13, 17].includes(nidClean.length)) {
            return res.status(400).json({ success: false, message: "Invalid NID format" });
        }

        // Check if NID already registered
        const [existingNID] = await pool.query('SELECT userid FROM users WHERE nid = ?', [nidClean]);
        if (existingNID.length > 0) {
            return res.status(400).json({ success: false, message: "This NID is already registered" });
        }

        // Update registration session
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            session.nidVerified = true;
            session.step = 3;
            session.data = { ...session.data, nid: nidClean, dob, fullName: nameEn, nameBn, fatherName, motherName };
            registrationSessions.set(sessionId, session);
        }

        res.json({ success: true, message: "NID verified successfully", data: { name: nameEn, nidLast4: nidClean.slice(-4) } });
    } catch (err) {
        console.error("Verify NID error:", err);
        res.status(500).json({ success: false, message: "NID verification failed" });
    }
};

// Save Face Image (Step 4)
exports.saveFaceImage = async (req, res) => {
    try {
        const { faceImage, sessionId } = req.body;

        if (!faceImage) {
            return res.status(400).json({ success: false, message: "Face image is required" });
        }

        if (!faceImage.startsWith('data:image/')) {
            return res.status(400).json({ success: false, message: "Invalid image format" });
        }

        // Update registration session
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            session.faceVerified = true;
            session.step = 4;
            session.data = { ...session.data, faceImage };
            registrationSessions.set(sessionId, session);
        }

        res.json({ success: true, message: "Face image saved successfully" });
    } catch (err) {
        console.error("Save face error:", err);
        res.status(500).json({ success: false, message: "Failed to save face image" });
    }
};

// Save Address (Step 5)
exports.saveAddress = async (req, res) => {
    try {
        const { division, district, policeStation, union, village, placeDetails, sessionId } = req.body;

        if (!division || !district) {
            return res.status(400).json({ success: false, message: "Division and district are required" });
        }

        // Update registration session
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            session.step = 5;
            const location = [village, union, policeStation, district, division].filter(Boolean).join(', ');
            session.data = { ...session.data, division, district, policeStation, unionName: union, village, placeDetails, location };
            registrationSessions.set(sessionId, session);
        }

        res.json({ success: true, message: "Address saved successfully" });
    } catch (err) {
        console.error("Save address error:", err);
        res.status(500).json({ success: false, message: "Failed to save address" });
    }
};

// Get Registration Session Status
exports.getRegistrationStatus = (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId || !registrationSessions.has(sessionId)) {
        return res.status(404).json({ success: false, message: "Session not found or expired" });
    }
    const session = registrationSessions.get(sessionId);
    res.json({
        success: true,
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

// Resend OTP
exports.resendOTP = async (req, res) => {
    try {
        const { phone, email } = req.body;
        const identifier = phone || email;

        if (!identifier) {
            return res.status(400).json({ success: false, message: "Phone or email required" });
        }

        const existingOTP = otpStore.get(identifier);
        if (existingOTP && existingOTP.resendCount >= 3) {
            if (Date.now() - existingOTP.firstSentAt < 10 * 60 * 1000) {
                return res.status(429).json({ success: false, message: "Too many requests. Try again later." });
            }
        }

        const otp = generateOTP();
        otpStore.set(identifier, {
            otp,
            expires: Date.now() + 5 * 60 * 1000,
            verified: false,
            resendCount: (existingOTP?.resendCount || 0) + 1,
            firstSentAt: existingOTP?.firstSentAt || Date.now()
        });

        if (email) {
            try {
                await sendEmail(email, 'SecureVoice - New Code', `<p>Your new OTP: <strong>${otp}</strong></p>`);
            } catch (e) { console.error('Email error:', e); }
        }

        const response = { success: true, message: "New OTP sent" };
        if (process.env.NODE_ENV !== 'production') {
            response.devOTP = otp;
            console.log(`[DEV] New OTP: ${otp}`);
        }
        res.json(response);
    } catch (err) {
        console.error("Resend OTP error:", err);
        res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
};