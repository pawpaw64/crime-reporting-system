const bcrypt = require('bcrypt');
const { query } = require('../db');

module.exports = {
    signup: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert user
            const result = await query(
                'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
                [username, email, hashedPassword]
            );
            
            // Set session
            req.session.userId = result.insertId;
            req.session.username = username;
            req.session.email = email;
            
            res.json({
                success: true,
                message: "Registration successful!"
            });
        } catch (error) {
            console.error("Signup error:", error);
            res.status(500).json({
                success: false,
                message: "Error during registration"
            });
        }
    },

    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Find user
            const users = await query(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );
            
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }
            
            const user = users[0];
            
            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }
            
            // Set session
            req.session.userId = user.userid;
            req.session.username = user.username;
            req.session.email = user.email;
            
            res.json({
                success: true,
                message: "Login successful",
                redirect: "/profile"
            });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({
                success: false,
                message: "Error during login"
            });
        }
    }
};