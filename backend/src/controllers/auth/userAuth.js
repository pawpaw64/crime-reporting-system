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
        const { username, email, password, sessionId, phone, nid, dob, nameEn, nameBn, fatherName, motherName, faceImage, division, district, policeStation, union, village, placeDetails } = req.body;

        if (!username || !email || !password) return sendError(res, 400, 'Username, email and password are required');
        if (!isValidUsername(username)) return sendError(res, 400, 'Username must be 3-50 characters (letters, numbers, underscores only)');
        if (!isValidEmail(email)) return sendError(res, 400, 'Invalid email format');
        if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters');

        const [existingUsername] = await pool.query('SELECT userid FROM users WHERE username = ?', [username]);
        if (existingUsername.length > 0) return sendError(res, 400, 'This username is already taken');
        const [existingEmail] = await pool.query('SELECT userid FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) return sendError(res, 400, 'This email is already registered');

        let userData = {};
        if (sessionId && registrationSessions.has(sessionId)) {
            const session = registrationSessions.get(sessionId);
            userData = { ...session.data, phone: session.phone };
        } else {
            const location = buildLocationString({ village, union, policeStation, district, division });
            userData = { phone, nid, dob, fullName: nameEn, nameBn, fatherName, motherName, faceImage, division, district, policeStation, unionName: union, village, placeDetails, location };
        }

        const hashedPassword = await hashPassword(password);
        const age = calculateAge(userData.dob);

        const [result] = await pool.query(
            `INSERT INTO users (username, email, password, fullName, name_bn, phone, nid, dob, age, father_name, mother_name, face_image, location, division, district, police_station, union_name, village, place_details, is_verified, is_nid_verified, is_face_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [username, email, hashedPassword, userData.fullName || null, userData.nameBn || null, userData.phone || null, userData.nid || null, userData.dob || null, age, userData.fatherName || null, userData.motherName || null, userData.faceImage || null, userData.location || null, userData.division || null, userData.district || null, userData.policeStation || null, userData.unionName || null, userData.village || null, userData.placeDetails || null, 1, userData.nid ? 1 : 0, userData.faceImage ? 1 : 0]
        );

        req.session.userId = result.insertId; req.session.username = username; req.session.email = email;

        if (sessionId) registrationSessions.delete(sessionId);
        if (userData.phone) otpStore.delete(userData.phone);
        otpStore.delete(email);

        try { await sendEmail(email, 'Welcome to SecureVoice!', EmailTemplates.welcome()); } catch (e) { console.error('Welcome email error:', e); }

        sendSuccess(res, 'Registration successful!', { user: { id: result.insertId, username, email, name: userData.fullName } });
    } catch (err) {
        console.error('Signup error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('username')) return sendError(res, 400, 'Username already taken');
            if (err.message.includes('email')) return sendError(res, 400, 'Email already registered');
            if (err.message.includes('nid')) return sendError(res, 400, 'NID already registered');
        }
        sendError(res, 500, 'Registration failed. Please try again.');
    }
};

// User Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return sendError(res, 400, 'Username and password are required');

        const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) return sendError(res, 401, 'Invalid username or password');
        const user = results[0];
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) return sendError(res, 401, 'Invalid username or password');

        req.session.userId = user.userid; req.session.username = user.username; req.session.email = user.email;
        sendSuccess(res, 'Login successful', { redirect: '/profile' });
    } catch (err) {
        console.error('Login error:', err);
        sendError(res, 500, 'Server error');
    }
};

// Exports for user auth done
