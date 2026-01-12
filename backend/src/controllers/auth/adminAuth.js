const pool = require('../../db');
const { hashPassword, comparePassword } = require('../../utils/passwordUtils');
const { sendEmail } = require('../../utils/emailUtils');
const { logAdminAction } = require('../../utils/auditUtils');
const {
    CONFIG,
    sendError,
    sendSuccess,
    generateToken,
    getFrontendUrl,
    EmailTemplates
} = require('./common');

// Admin Registration Request
exports.adminRegistrationRequest = async (req, res) => {
    try {
        const { username, email, fullName, phone, designation, official_id, district_name, password, confirmPassword } = req.body;

        if (!username || !email || !fullName || !phone || !district_name || !designation || !password) {
            return sendError(res, 400, 'All required fields must be provided');
        }

        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) return sendError(res, 400, `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
        if (password !== confirmPassword) return sendError(res, 400, 'Passwords do not match');

        const [existing] = await pool.query('SELECT * FROM admins WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) return sendError(res, 400, 'Username or email already exists');

        const hashedPassword = await hashPassword(password);
        const emailVerificationToken = generateToken();

        const [result] = await pool.query(
            `INSERT INTO admins(username, email, fullName, phone, designation, official_id, district_name, password, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [username, email, fullName, phone, designation, official_id, district_name, hashedPassword]
        );

        await pool.query(`INSERT INTO admin_approval_workflow(admin_username, status, request_date) VALUES (?, 'pending', NOW())`, [username]);

        await pool.query(`INSERT INTO admin_verification_tokens (admin_username, token_type, token_value, expires_at, is_used) VALUES (?, 'email_verification', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 0)`, [username, emailVerificationToken, CONFIG.EMAIL_VERIFICATION_EXPIRY_DAYS]);

        const verifyLink = `${getFrontendUrl()}/admin-verify?token=${emailVerificationToken}`;
        try { await sendEmail(email, 'SecureVoice - Verify Your Email Address', EmailTemplates.adminVerification(fullName, verifyLink)); } catch (e) { console.error('Email send error:', e); }

        try { await sendEmail(process.env.SUPER_ADMIN_EMAIL || 'superadmin@crime.gov.bd', 'New District Admin Registration Request', EmailTemplates.superAdminNotification({ username, fullName, email, phone, designation, official_id, district_name })); } catch (e) { console.error('Super admin notify error:', e); }

        sendSuccess(res, 'Registration request submitted successfully! Please check your email to verify your address. You will be notified once approved by the Super Admin.', { adminId: result.insertId });
    } catch (err) {
        console.error('Admin registration request error:', err);
        sendError(res, 500, 'Server error while processing registration request');
    }
};

// Admin Login
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return sendError(res, 400, 'Username and password are required');

        const [results] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (results.length === 0) {
            await logAdminAction(username, 'login_attempt', { result: 'failure', actionDetails: 'User not found', ipAddress: req.ip });
            return sendError(res, 401, 'Invalid username or password');
        }

        const admin = results[0];
        const [workflowResults] = await pool.query('SELECT status FROM admin_approval_workflow WHERE admin_username = ?', [username]);
        const status = workflowResults.length > 0 ? workflowResults[0].status : 'pending';
        if (status !== 'approved') {
            await logAdminAction(username, 'login_attempt', { result: 'failure', actionDetails: `Account status: ${status}`, ipAddress: req.ip });
            const statusMessages = { pending: 'Your registration request is pending Super Admin approval.', rejected: 'Your registration request was rejected. Please contact the Super Admin.', suspended: 'Your account has been suspended. Please contact the Super Admin.' };
            return sendError(res, 403, statusMessages[status] || statusMessages.pending);
        }

        if (!admin.is_active) return sendError(res, 403, 'Account is inactive. Please contact support.');
        if (!admin.password) return sendError(res, 403, 'Please complete your password setup using the link sent to your email.');

        const isMatch = await comparePassword(password, admin.password);
        if (!isMatch) {
            await logAdminAction(username, 'login_attempt', { result: 'failure', actionDetails: 'Invalid password', ipAddress: req.ip });
            return sendError(res, 401, 'Invalid username or password');
        }

        const [verificationResults] = await pool.query(`SELECT is_used FROM admin_verification_tokens WHERE admin_username = ? AND token_type = 'email_verification' ORDER BY created_at DESC LIMIT 1`, [username]);
        if (verificationResults.length === 0 || verificationResults[0].is_used !== 1) return sendError(res, 403, 'Please verify your email before logging in.');

        await pool.query('UPDATE admins SET last_login = NOW() WHERE username = ?', [username]);

        req.session.adminId = admin.adminid;
        req.session.adminUsername = admin.username;
        req.session.adminEmail = admin.email;
        req.session.district = admin.district_name;
        req.session.isAdmin = true;

        await logAdminAction(username, 'login', { result: 'success', actionDetails: 'Successful login', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        sendSuccess(res, 'Login successful', { redirect: '/admin-dashboard', admin: { username: admin.username, email: admin.email, fullName: admin.fullName, district: admin.district_name } });
    } catch (err) {
        console.error('Admin login error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Admin OTP (legacy)
exports.adminVerifyOTP = async (req, res) => {
    try {
        const { username, otp } = req.body;
        if (!username || !otp) return sendError(res, 400, 'Username and OTP are required');

        const [otpResults] = await pool.query(`SELECT * FROM admin_otp_verification WHERE admin_username = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, [username, otp]);
        if (otpResults.length === 0) {
            await logAdminAction(username, 'otp_verification', { result: 'failure', actionDetails: 'Invalid or expired OTP', ipAddress: req.ip });
            return sendError(res, 401, 'Invalid or expired OTP');
        }

        await pool.query('UPDATE admin_otp_verification SET is_used = 1 WHERE id = ?', [otpResults[0].id]);
        const [adminResults] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        const admin = adminResults[0];
        await pool.query('UPDATE admins SET last_login = NOW() WHERE username = ?', [username]);

        req.session.adminId = admin.adminid;
        req.session.adminUsername = admin.username;
        req.session.adminEmail = admin.email;
        req.session.district = admin.district_name;
        req.session.isAdmin = true;

        await logAdminAction(username, 'login', { result: 'success', actionDetails: 'Successful login with OTP verification', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        sendSuccess(res, 'Login successful', { redirect: '/admin-dashboard', admin: { username: admin.username, email: admin.email, fullName: admin.fullName, district: admin.district_name } });
    } catch (err) {
        console.error('OTP verification error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Setup password after approval
exports.setupAdminPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        if (!token || !password || !confirmPassword) return sendError(res, 400, 'All fields are required');
        if (password !== confirmPassword) return sendError(res, 400, 'Passwords do not match');
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) return sendError(res, 400, `Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);

        const [tokenResults] = await pool.query(`SELECT admin_username FROM admin_verification_tokens WHERE token_value = ? AND token_type = 'password_setup' AND expires_at > NOW() AND is_used = 0`, [token]);
        if (tokenResults.length === 0) return sendError(res, 400, 'Invalid or expired password setup link');

        const username = tokenResults[0].admin_username;
        const [adminResults] = await pool.query('SELECT email FROM admins WHERE username = ?', [username]);
        const hashedPassword = await hashPassword(password);

        await pool.query('UPDATE admins SET password = ?, is_active = 1 WHERE username = ?', [hashedPassword, username]);
        await pool.query(`UPDATE admin_verification_tokens SET is_used = 1 WHERE token_value = ? AND token_type = 'password_setup'`, [token]);

        await logAdminAction(username, 'password_setup', { result: 'success', actionDetails: 'Password setup completed', ipAddress: req.ip });

        if (adminResults.length > 0) {
            try { await sendEmail(adminResults[0].email, 'Password Setup Successful', EmailTemplates.passwordSetupSuccess(`${getFrontendUrl()}/adminLogin`)); } catch (e) { console.error('Password setup email error:', e); }
        }

        sendSuccess(res, 'Password setup successful! Please verify your email to complete activation.', { redirect: '/adminLogin' });
    } catch (err) {
        console.error('Password setup error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Verify admin email
exports.verifyAdminEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return sendError(res, 400, 'Verification token is required');

        const [tokenResults] = await pool.query(`SELECT admin_username FROM admin_verification_tokens WHERE token_value = ? AND token_type = 'email_verification' AND is_used = 0 AND expires_at > NOW()`, [token]);
        if (tokenResults.length === 0) {
            const [expiredCheck] = await pool.query(`SELECT admin_username, expires_at FROM admin_verification_tokens WHERE token_value = ? AND token_type = 'email_verification'`, [token]);
            if (expiredCheck.length > 0 && expiredCheck[0].expires_at < new Date()) return sendError(res, 400, 'Verification link has expired. Please register again.');
            return sendError(res, 400, 'Invalid or already used verification token');
        }

        const username = tokenResults[0].admin_username;
        await pool.query(`UPDATE admin_verification_tokens SET is_used = 1 WHERE token_value = ? AND token_type = 'email_verification'`, [token]);
        await logAdminAction(username, 'email_verified', { result: 'success', ipAddress: req.ip });
        sendSuccess(res, 'Email verified successfully! Your account is now pending Super Admin approval.');
    } catch (err) {
        console.error('Email verification error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Admin logout
exports.adminLogout = async (req, res) => {
    try {
        const adminUsername = req.session.adminUsername;
        if (adminUsername) await logAdminAction(adminUsername, 'logout', { result: 'success', ipAddress: req.ip });
        req.session.destroy((err) => {
            if (err) return sendError(res, 500, 'Error logging out');
            res.clearCookie('connect.sid');
            sendSuccess(res, 'Logged out successfully');
        });
    } catch (err) {
        console.error('Logout error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Check admin auth
exports.checkAdminAuth = async (req, res) => {
    if (req.session.adminId && req.session.adminUsername) return sendSuccess(res, 'Authenticated', { isAuthenticated: true, admin: { username: req.session.adminUsername, email: req.session.adminEmail, district: req.session.district } });
    res.status(401).json({ success: false, isAuthenticated: false });
};
