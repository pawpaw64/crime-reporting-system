// Lines 8-14: Environment variables
// Lines 94-126: Session & Email config

const path = require('path');
require('dotenv').config();

module.exports = {
    // Server config
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Session config
    session: {
        secret: process.env.SESSION_SECRET || 'your_secure_random_string_here',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        }
    },
    
    // Email config
    email: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    },
    
    // Bcrypt config
    saltRounds: 10,
    
    // File paths
    paths: {
        uploads: path.join(__dirname, '../../uploads'),
        views: path.join(__dirname, '../views')
    }
};