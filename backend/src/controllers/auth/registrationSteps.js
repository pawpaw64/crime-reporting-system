const pool = require('../../db');
const { sendError, sendSuccess, isValidUsername, isValidEmail, registrationSessions, createRegistrationSession, updateRegistrationSession, buildLocationString } = require('./common');

// Create or update temporary registration session (multi-step registration)
exports.startRegistrationSession = (req, res) => {
    try {
        const { phone, data } = req.body;
        if (!phone) return sendError(res, 400, 'Phone is required');
        const sessionId = createRegistrationSession(phone, data || {});
        sendSuccess(res, 'Session created', { sessionId });
    } catch (err) {
        console.error('startRegistrationSession', err);
        sendError(res, 500, 'Failed to create session');
    }
};

exports.getRegistrationSession = (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) return sendError(res, 400, 'Session id required');
        const session = registrationSessions.get(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');
        sendSuccess(res, 'Session retrieved', { session });
    } catch (err) {
        console.error('getRegistrationSession', err);
        sendError(res, 500, 'Failed to fetch session');
    }
};

exports.saveAddress = async (req, res) => {
    try {
        const { sessionId, division, district, policeStation, union, village, placeDetails } = req.body;
        if (!sessionId) return sendError(res, 400, 'Session id required');
        const session = registrationSessions.get(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');

        const location = buildLocationString({ village, union, policeStation, district, division });
        session.data = { ...session.data, division, district, policeStation, unionName: union, village, placeDetails, location };
        updateRegistrationSession(sessionId, session);
        sendSuccess(res, 'Address saved');
    } catch (err) {
        console.error('saveAddress', err);
        sendError(res, 500, 'Failed to save address');
    }
};

exports.verifyNID = async (req, res) => {
    try {
        const { sessionId, nid } = req.body;
        if (!sessionId || !nid) return sendError(res, 400, 'Session id and NID are required');
        const session = registrationSessions.get(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');

        const [exists] = await pool.query('SELECT userid FROM users WHERE nid = ?', [nid]);
        if (exists.length > 0) return sendError(res, 400, 'This NID is already registered');

        session.data = { ...session.data, nid };
        updateRegistrationSession(sessionId, session);
        sendSuccess(res, 'NID validated and saved');
    } catch (err) {
        console.error('verifyNID', err);
        sendError(res, 500, 'Failed to verify NID');
    }
};

/**
 * Save Face Image (Registration Step 4)
 */
exports.saveFaceImage = async (req, res) => {
    try {
        const { faceImage, sessionId } = req.body;

        if (!faceImage) return sendError(res, 400, 'Face image is required');
        if (!faceImage.startsWith('data:image/')) return sendError(res, 400, 'Invalid image format');

        const session = registrationSessions.get(sessionId);
        if (!session) return sendError(res, 404, 'Session not found');

        session.data = { ...session.data, faceImage };
        session.faceVerified = true;
        session.step = 4;
        updateRegistrationSession(sessionId, session);

        sendSuccess(res, 'Face image saved successfully');
    } catch (err) {
        console.error('saveFaceImage', err);
        sendError(res, 500, 'Failed to save face image');
    }
};

/**
 * Get Registration Session Status
 */
exports.getRegistrationStatus = (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId || !registrationSessions.has(sessionId)) {
        return sendError(res, 404, 'Session not found or expired');
    }

    const session = registrationSessions.get(sessionId);

    sendSuccess(res, 'Session found', {
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
