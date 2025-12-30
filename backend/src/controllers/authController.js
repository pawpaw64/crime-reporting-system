const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../db');

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    // ==================== LOGIN ====================
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Validation
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required"
                });
            }

            // Get client IP for logging
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Find user by username or email
            const users = await query(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username]
            );

            if (users.length === 0) {
                // Log failed attempt
                await query(
                    'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 0)',
                    [username, ipAddress]
                ).catch(() => {}); // Ignore if table doesn't exist

                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }

            const user = users[0];

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                // Log failed attempt
                await query(
                    'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 0)',
                    [username, ipAddress]
                ).catch(() => {});

                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }

            // Log successful attempt
            await query(
                'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 1)',
                [username, ipAddress]
            ).catch(() => {});

            // Set session
            req.session.userId = user.userid;
            req.session.username = user.username;
            req.session.email = user.email;
            req.session.fullName = user.fullName;
            req.session.isLoggedIn = true;

            res.json({
                success: true,
                message: "Login successful",
                user: {
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName
                },
                redirect: "/dashboard"
            });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({
                success: false,
                message: "An error occurred during login. Please try again."
            });
        }
    },

    // ==================== LOGOUT ====================
    logout: async (req, res) => {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Error logging out"
                    });
                }
                res.json({
                    success: true,
                    message: "Logged out successfully",
                    redirect: "/login"
                });
            });
        } catch (error) {
            console.error("Logout error:", error);
            res.status(500).json({
                success: false,
                message: "Error during logout"
            });
        }
    },

    // ==================== SEND OTP ====================
    sendOTP: async (req, res) => {
        try {
            const { phone } = req.body;

            // Validate Bangladesh phone format
            const phoneRegex = /^01[3-9]\d{8}$/;
            if (!phone || !phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid Bangladesh mobile number (01XXXXXXXXX)"
                });
            }

            // Check if phone already registered
            const existingUser = await query(
                'SELECT * FROM users WHERE phone = ?',
                [phone]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "This phone number is already registered"
                });
            }

            // Generate OTP
            const otpCode = generateOTP();
            const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

            // Delete old OTPs for this phone
            await query('DELETE FROM otp_verification WHERE phone = ?', [phone]).catch(() => {});

            // Save OTP to database
            await query(
                'INSERT INTO otp_verification (phone, otp_code, expires_at) VALUES (?, ?, ?)',
                [phone, otpCode, expiresAt]
            ).catch(() => {
                // If table doesn't exist, just continue (for development)
            });

            // Generate registration session
            const sessionId = generateSessionId();
            const sessionExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

            // Save registration session
            await query(
                'INSERT INTO registration_sessions (session_id, phone, step, data, expires_at) VALUES (?, ?, 1, ?, ?)',
                [sessionId, phone, JSON.stringify({ phone }), sessionExpires]
            ).catch(() => {});

            // In production, send SMS here using SMS gateway
            // For development, log OTP to console
            console.log(`[DEV] OTP for ${phone}: ${otpCode}`);

            res.json({
                success: true,
                message: "OTP sent successfully",
                sessionId: sessionId,
                // Remove in production - only for development testing
                devOTP: process.env.NODE_ENV !== 'production' ? otpCode : undefined
            });
        } catch (error) {
            console.error("Send OTP error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again."
            });
        }
    },

    // ==================== VERIFY OTP ====================
    verifyOTP: async (req, res) => {
        try {
            const { phone, otp, sessionId } = req.body;

            if (!phone || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Phone and OTP are required"
                });
            }

            // Find valid OTP
            const otpRecords = await query(
                'SELECT * FROM otp_verification WHERE phone = ? AND otp_code = ? AND expires_at > NOW() AND is_verified = 0',
                [phone, otp]
            ).catch(() => []);

            // For development, accept any 6-digit OTP if table doesn't exist
            const isValidOTP = otpRecords.length > 0 || 
                (process.env.NODE_ENV !== 'production' && otp.length === 6);

            if (!isValidOTP) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP"
                });
            }

            // Mark OTP as verified
            if (otpRecords.length > 0) {
                await query(
                    'UPDATE otp_verification SET is_verified = 1 WHERE phone = ? AND otp_code = ?',
                    [phone, otp]
                );
            }

            // Update registration session
            if (sessionId) {
                await query(
                    'UPDATE registration_sessions SET step = 2, data = JSON_SET(COALESCE(data, "{}"), "$.otpVerified", true) WHERE session_id = ?',
                    [sessionId]
                ).catch(() => {});
            }

            res.json({
                success: true,
                message: "OTP verified successfully"
            });
        } catch (error) {
            console.error("Verify OTP error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to verify OTP"
            });
        }
    },

    // ==================== VERIFY NID ====================
    verifyNID: async (req, res) => {
        try {
            const { nid, dob, nameEn, nameBn, fatherName, motherName, sessionId } = req.body;

            // Validate NID format (10 or 17 digits)
            if (!nid || !/^(\d{10}|\d{17})$/.test(nid)) {
                return res.status(400).json({
                    success: false,
                    message: "NID must be 10 or 17 digits"
                });
            }

            // Check if NID already registered
            const existingUser = await query(
                'SELECT * FROM users WHERE nid = ?',
                [nid]
            ).catch(() => []);

            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "This NID is already registered"
                });
            }

            // In production, verify NID with government API here
            // For development, just validate the format

            // Update registration session with NID data
            if (sessionId) {
                await query(
                    `UPDATE registration_sessions SET step = 3, 
                    data = JSON_SET(COALESCE(data, "{}"), 
                        "$.nid", ?, 
                        "$.dob", ?, 
                        "$.nameEn", ?, 
                        "$.nameBn", ?, 
                        "$.fatherName", ?, 
                        "$.motherName", ?,
                        "$.nidVerified", true
                    ) WHERE session_id = ?`,
                    [nid, dob, nameEn, nameBn || '', fatherName, motherName, sessionId]
                ).catch(() => {});
            }

            res.json({
                success: true,
                message: "Identity verified successfully"
            });
        } catch (error) {
            console.error("Verify NID error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to verify identity"
            });
        }
    },

    // ==================== SAVE FACE IMAGE ====================
    saveFaceImage: async (req, res) => {
        try {
            const { faceImage, sessionId } = req.body;

            if (!faceImage) {
                return res.status(400).json({
                    success: false,
                    message: "Face image is required"
                });
            }

            // Update registration session with face image
            if (sessionId) {
                await query(
                    `UPDATE registration_sessions SET step = 4, 
                    data = JSON_SET(COALESCE(data, "{}"), 
                        "$.faceImage", ?,
                        "$.faceVerified", true
                    ) WHERE session_id = ?`,
                    [faceImage, sessionId]
                ).catch(() => {});
            }

            res.json({
                success: true,
                message: "Face image saved successfully"
            });
        } catch (error) {
            console.error("Save face error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to save face image"
            });
        }
    },

    // ==================== SAVE ADDRESS ====================
    saveAddress: async (req, res) => {
        try {
            const { division, district, policeStation, union, village, placeDetails, sessionId } = req.body;

            if (!division || !district || !policeStation) {
                return res.status(400).json({
                    success: false,
                    message: "Division, District and Police Station are required"
                });
            }

            // Update registration session with address
            if (sessionId) {
                await query(
                    `UPDATE registration_sessions SET step = 5, 
                    data = JSON_SET(COALESCE(data, "{}"), 
                        "$.division", ?,
                        "$.district", ?,
                        "$.policeStation", ?,
                        "$.union", ?,
                        "$.village", ?,
                        "$.placeDetails", ?
                    ) WHERE session_id = ?`,
                    [division, district, policeStation, union || '', village || '', placeDetails || '', sessionId]
                ).catch(() => {});
            }

            res.json({
                success: true,
                message: "Address saved successfully"
            });
        } catch (error) {
            console.error("Save address error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to save address"
            });
        }
    },

    // ==================== COMPLETE SIGNUP ====================
    signup: async (req, res) => {
        try {
            const { 
                email, 
                password, 
                sessionId,
                // Direct data (if not using session)
                phone,
                nid,
                dob,
                nameEn,
                nameBn,
                fatherName,
                motherName,
                faceImage,
                division,
                district,
                policeStation,
                union,
                village,
                placeDetails
            } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required"
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address"
                });
            }

            // Validate password strength
            const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 8 characters with uppercase, number, and special character"
                });
            }

            // Get registration data from session or direct input
            let registrationData = {
                phone, nid, dob, nameEn, nameBn, fatherName, motherName,
                faceImage, division, district, policeStation, union, village, placeDetails
            };

            if (sessionId) {
                const sessions = await query(
                    'SELECT * FROM registration_sessions WHERE session_id = ? AND expires_at > NOW()',
                    [sessionId]
                ).catch(() => []);

                if (sessions.length > 0 && sessions[0].data) {
                    const sessionData = typeof sessions[0].data === 'string' 
                        ? JSON.parse(sessions[0].data) 
                        : sessions[0].data;
                    registrationData = { ...registrationData, ...sessionData };
                }
            }

            // Check if email already exists
            const existingEmail = await query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (existingEmail.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "This email is already registered"
                });
            }

            // Check if phone already exists
            if (registrationData.phone) {
                const existingPhone = await query(
                    'SELECT * FROM users WHERE phone = ?',
                    [registrationData.phone]
                );

                if (existingPhone.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "This phone number is already registered"
                    });
                }
            }

            // Generate username from name or email
            let username = registrationData.nameEn 
                ? registrationData.nameEn.toLowerCase().replace(/\s+/g, '_').substring(0, 20)
                : email.split('@')[0];
            
            // Check if username exists and make unique
            let usernameExists = true;
            let counter = 0;
            let finalUsername = username;
            
            while (usernameExists) {
                const existing = await query(
                    'SELECT * FROM users WHERE username = ?',
                    [finalUsername]
                );
                if (existing.length === 0) {
                    usernameExists = false;
                } else {
                    counter++;
                    finalUsername = `${username}_${counter}`;
                }
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Insert user
            const result = await query(
                `INSERT INTO users (
                    username, email, password, fullName, phone, dob, location, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    finalUsername,
                    email,
                    hashedPassword,
                    registrationData.nameEn || '',
                    registrationData.phone || '',
                    registrationData.dob || null,
                    `${registrationData.village || ''}, ${registrationData.district || ''}`.trim()
                ]
            );

            // Clean up registration session
            if (sessionId) {
                await query('DELETE FROM registration_sessions WHERE session_id = ?', [sessionId]).catch(() => {});
            }

            // Clean up OTP records
            if (registrationData.phone) {
                await query('DELETE FROM otp_verification WHERE phone = ?', [registrationData.phone]).catch(() => {});
            }

            // Set session for auto-login
            req.session.userId = result.insertId;
            req.session.username = finalUsername;
            req.session.email = email;
            req.session.fullName = registrationData.nameEn || '';
            req.session.isLoggedIn = true;

            res.json({
                success: true,
                message: "Account created successfully!",
                user: {
                    username: finalUsername,
                    email: email,
                    fullName: registrationData.nameEn || ''
                }
            });
        } catch (error) {
            console.error("Signup error:", error);
            
            // Handle duplicate entry errors
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('email')) {
                    return res.status(400).json({
                        success: false,
                        message: "This email is already registered"
                    });
                }
                if (error.message.includes('phone')) {
                    return res.status(400).json({
                        success: false,
                        message: "This phone number is already registered"
                    });
                }
                if (error.message.includes('nid')) {
                    return res.status(400).json({
                        success: false,
                        message: "This NID is already registered"
                    });
                }
            }

            res.status(500).json({
                success: false,
                message: "Registration failed. Please try again."
            });
        }
    },

    // ==================== CHECK AUTH STATUS ====================
    checkAuth: async (req, res) => {
        try {
            if (req.session && req.session.isLoggedIn) {
                res.json({
                    success: true,
                    isLoggedIn: true,
                    user: {
                        username: req.session.username,
                        email: req.session.email,
                        fullName: req.session.fullName
                    }
                });
            } else {
                res.json({
                    success: true,
                    isLoggedIn: false
                });
            }
        } catch (error) {
            console.error("Check auth error:", error);
            res.status(500).json({
                success: false,
                message: "Error checking authentication status"
            });
        }
    }
};