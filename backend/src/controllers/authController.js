const pool = require('../db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { sendEmail } = require('../utils/emailUtils');
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

// Admin Login/Signup
exports.adminLogin = async (req, res) => {
    try {
        const { username, email, password, district_name } = req.body;
        
        // Check if admin exists
        const [results] = await pool.query(
            'SELECT * FROM admins WHERE username = ? OR email = ?',
            [username, email]
        );

        // If admin exists, try to log in
        if (results.length > 0) {
            const admin = results[0];
            const isMatch = await comparePassword(password, admin.password);

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }

            // Set session
            req.session.adminId = admin.adminid;
            req.session.adminUsername = admin.username;
            req.session.adminEmail = admin.email;
            req.session.district = admin.district_name;

            return res.json({
                success: true,
                message: "Login successful",
                redirect: "/admin-dashboard"
            });
        }

        // Register new admin
        if (username && email && password && district_name) {
            const hashedPassword = await hashPassword(password);
            const createdAT = new Date();

            const [result] = await pool.query(
                "INSERT INTO admins(username, email, password, fullName, created_at, district_name) VALUES (?, ?, ?, NULL, ?, ?)",
                [username, email, hashedPassword, createdAT, district_name]
            );

            req.session.adminId = result.insertId;
            req.session.adminUsername = username;
            req.session.adminEmail = email;
            req.session.district = district_name;

            return res.json({
                success: true,
                message: "Admin registration successful!",
                redirect: "/admin-dashboard"
            });
        }

        return res.status(400).json({
            success: false,
            message: "Missing required fields for registration"
        });

    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

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