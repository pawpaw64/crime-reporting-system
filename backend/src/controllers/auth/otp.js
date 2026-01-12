const pool = require('../../db');
const { sendEmail } = require('../../utils/emailUtils');
const { sendError, sendSuccess, generateOTP, otpStore, EmailTemplates, CONFIG } = require('./common');

// Send OTP to email or phone during registration
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email && !phone) return sendError(res, 400, 'Email or phone is required');

        const otp = generateOTP();
        if (phone) otpStore.set(phone, { otp, createdAt: Date.now() });
        if (email) otpStore.set(email, { otp, createdAt: Date.now() });

        // In dev, log OTP. In prod, send via SMS gateway / email
        console.log('Generated OTP for', email || phone, otp);
        if (email) {
            try { await sendEmail(email, 'Your OTP Code', EmailTemplates.otp(otp)); } catch (e) { console.error('OTP email error:', e); }
        }

        sendSuccess(res, 'OTP sent', { otp: process.env.NODE_ENV === 'development' ? otp : undefined });
    } catch (err) {
        console.error('sendOTP error', err);
        sendError(res, 500, 'Failed to send OTP');
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { key, otp } = req.body; // key can be email or phone
        if (!key || !otp) return sendError(res, 400, 'Key and OTP are required');
        const entry = otpStore.get(key);
        if (!entry) return sendError(res, 400, 'No OTP found for this key');
        if (entry.otp !== otp) return sendError(res, 400, 'Invalid OTP');
        if (Date.now() - entry.createdAt > (5 * 60 * 1000)) return sendError(res, 400, 'OTP expired');

        otpStore.delete(key);
        sendSuccess(res, 'OTP verified');
    } catch (err) {
        console.error('verifyOTP error', err);
        sendError(res, 500, 'OTP verification failed');
    }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const identifier = phone || email;
        if (!identifier) return sendError(res, 400, 'Phone or email required');

        const existingOTP = otpStore.get(identifier);
        if (existingOTP && (existingOTP.resendCount || 0) >= CONFIG.MAX_RESEND_ATTEMPTS) {
            if (Date.now() - (existingOTP.firstSentAt || 0) < CONFIG.RESEND_COOLDOWN_MS) {
                return sendError(res, 429, 'Too many requests. Try again later.');
            }
        }

        const otp = generateOTP();
        otpStore.set(identifier, {
            otp,
            expires: Date.now() + CONFIG.OTP_EXPIRY_MS,
            verified: false,
            resendCount: (existingOTP?.resendCount || 0) + 1,
            firstSentAt: existingOTP?.firstSentAt || Date.now()
        });

        if (email) {
            try {
                await sendEmail(email, 'SecureVoice - New Code', EmailTemplates.resendOtp(otp));
            } catch (e) {
                console.error('Email error:', e);
            }
        }

        const response = { success: true, message: 'New OTP sent' };
        if (process.env.NODE_ENV !== 'production') response.devOTP = otp;
        sendSuccess(res, response.message, { devOTP: response.devOTP });
    } catch (err) {
        console.error('Resend OTP error', err);
        sendError(res, 500, 'Failed to resend OTP');
    }
};
