const crypto = require('crypto');

// CONFIG
const CONFIG = {
    OTP_EXPIRY_MS: 5 * 60 * 1000,
    SESSION_EXPIRY_MS: 30 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
    MAX_RESEND_ATTEMPTS: 3,
    RESEND_COOLDOWN_MS: 10 * 60 * 1000,
    MIN_PASSWORD_LENGTH: 8,
    EMAIL_VERIFICATION_EXPIRY_DAYS: 7
};

// In-memory stores for OTPs and registration sessions
const otpStore = new Map();
const registrationSessions = new Map();

// Helpers
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function sendSuccess(res, message, data = {}) {
    return res.json({ success: true, message, ...data });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

function validateAndCleanNID(nid) {
    const nidClean = nid.replace(/\D/g, '');
    return [10, 13, 17].includes(nidClean.length) ? nidClean : null;
}

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

function getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function buildLocationString({ village, union, policeStation, district, division }) {
    return [village, union, policeStation, district, division].filter(Boolean).join(', ');
}

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

function updateRegistrationSession(sessionId, updates) {
    if (!sessionId || !registrationSessions.has(sessionId)) return;
    const session = registrationSessions.get(sessionId);
    Object.assign(session, updates);
    if (updates.data) session.data = { ...session.data, ...updates.data };
    registrationSessions.set(sessionId, session);
}

const EmailTemplates = {
    adminVerification: (fullName, verifyLink) => `
        <h2>Welcome to SecureVoice!</h2>
        <p>Dear ${fullName},</p>
        <p>Thank you for registering as a District Admin. Please verify your email address by clicking the button below:</p>
        <a href="${verifyLink}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
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

module.exports = {
    CONFIG,
    otpStore,
    registrationSessions,
    generateSessionId,
    generateOTP,
    generateToken,
    sendError,
    sendSuccess,
    isValidEmail,
    isValidUsername,
    validateAndCleanNID,
    calculateAge,
    getFrontendUrl,
    buildLocationString,
    createRegistrationSession,
    updateRegistrationSession,
    EmailTemplates
};
