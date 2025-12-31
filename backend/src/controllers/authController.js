const pool = require('../db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { sendEmail } = require('../utils/emailUtils');

// Store OTPs temporarily
const otpStore = new Map();

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

// User Signup
exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const createdAT = new Date();

        const hashedPassword = await hashPassword(password);

        const [result] = await pool.query(
            "INSERT INTO users(username, email, password, created_at) VALUES (?, ?, ?, ?)",
            [username, email, hashedPassword, createdAT]
        );

        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.email = email;

        res.json({
            success: true,
            message: "Registration successful!"
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Error registering user");
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

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(email, {
            otp: otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>SecureVoice - Email Verification</h2>
                <p>Your OTP code is:</p>
                <h1 style="background-color: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 5px;">
                    ${otp}
                </h1>
                <p>This code will expire in 5 minutes.</p>
            </div>
        `;

        await sendEmail(email, 'SecureVoice - Your OTP Code', html);

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error("Send OTP error:", err);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

// Verify OTP
exports.verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
        return res.status(400).json({ success: false, message: "OTP not found or expired" });
    }

    if (Date.now() > storedData.expires) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    otpStore.delete(email);
    res.json({ success: true, message: "OTP verified successfully" });
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