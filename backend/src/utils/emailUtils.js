const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: config.email.auth,
    tls: {
        rejectUnauthorized: false
    }
});

// Verify on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('📧 Please check your EMAIL_USER and EMAIL_PASS in the .env file');
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Export transporter and utility functions
module.exports = {
    transporter,
    
    sendEmail: async (to, subject, html, attachments = []) => {
        const mailOptions = {
            from: config.email.auth.user,
            to,
            subject,
            html,
            attachments
        };
        
        return transporter.sendMail(mailOptions);
    }
};