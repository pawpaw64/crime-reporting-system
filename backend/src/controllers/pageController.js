const fs = require('fs');
const path = require('path');

// Get Homepage
exports.getHomepage = (req, res) => {
    const isUserAuthenticated = req.session && req.session.userId ? true : false;
    const isAdminAuthenticated = req.session && req.session.adminId ? true : false;
    const username = req.session && req.session.username ? req.session.username : null;
    const adminUsername = req.session && req.session.adminUsername ? req.session.adminUsername : null;

    const homepagePath = path.join(__dirname, '../../../frontend/src/pages/homepage.html');

    if (!fs.existsSync(homepagePath)) {
        return res.status(404).send("Homepage file not found");
    }

    fs.readFile(homepagePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send("Error loading homepage");
        }

        const authScript = `
        <script>
            window.isAuthenticated = ${isUserAuthenticated};
            window.currentUser = ${JSON.stringify(username)};
            window.isAdmin = ${isAdminAuthenticated};
            window.adminUsername = ${JSON.stringify(adminUsername)};
        </script>
        `;

        let modifiedData = data.replace('</head>', authScript + '</head>');

        if (isAdminAuthenticated) {
            modifiedData = modifiedData.replace(
                '</head>',
                '<link rel="stylesheet" href="../css/adminAuth-header.css">\n<script src="../js/adminAuth-handler.js"></script>\n</head>'
            );
        } else if (isUserAuthenticated) {
            modifiedData = modifiedData.replace(
                '</head>',
                '<script src="../js/auth-handler.js"></script>\n</head>'
            );
        }

        res.send(modifiedData);
    });
};

// Get Contact Us
exports.getContactUs = (req, res) => {
    const isAuthenticated = req.session && req.session.userId ? true : false;
    const username = req.session && req.session.username ? req.session.username : null;

    const contactUsPath = path.join(__dirname, '../../../frontend/src/pages/contact-us.html');

    if (!fs.existsSync(contactUsPath)) {
        return res.status(404).send("Contact Us page not found");
    }

    fs.readFile(contactUsPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send("Error loading contact-us page");
        }

        const authScript = `
        <script>
            window.isAuthenticated = ${isAuthenticated};
            window.currentUser = ${JSON.stringify(username)};
        </script>
        `;

        const modifiedData = data.replace('</head>', authScript + '</head>');
        res.send(modifiedData);
    });
};

// Get Admin Login Page
exports.getAdminLoginPage = (req, res) => {
    const adminLoginPath = path.join(__dirname, '../../../frontend/src/pages/adminLogin.html');

    if (!fs.existsSync(adminLoginPath)) {
        return res.status(404).send("Admin login page not found");
    }

    res.sendFile(adminLoginPath);
};

// Get Login Page
exports.getLoginPage = (req, res) => {
    const loginPath = path.join(__dirname, '../../../frontend/src/pages/login.html');

    if (!fs.existsSync(loginPath)) {
        return res.status(404).send("Login page not found");
    }

    res.sendFile(loginPath);
};

// Get Signup Page
exports.getSignupPage = (req, res) => {
    const signupPath = path.join(__dirname, '../../../frontend/src/pages/login.html');
    res.sendFile(signupPath);
};

// Get Complain Page
exports.getComplainPage = (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/signup');
    }

    const complainPath = path.join(__dirname, '../../../frontend/src/pages/complain.html');

    if (!fs.existsSync(complainPath)) {
        return res.status(404).send("Complaint form not found");
    }

    fs.readFile(complainPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send("Error loading complaint form");
        }

        const authScript = `
        <script>
            window.currentUser = ${JSON.stringify(req.session.username)};
            window.isAuthenticated = true;
        </script>
        `;

        const modifiedData = data.replace('</head>', authScript + '</head>');
        res.send(modifiedData);
    });
};

// Test Email
exports.testEmail = async (req, res) => {
    const { sendEmail } = require('../utils/emailUtils');

    try {
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #28a745;">🎉 Success!</h2>
                <p>Your email configuration is working correctly!</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `;

        await sendEmail(process.env.EMAIL_USER, '✅ SecureVoice - Email Test Successful!', html);

        res.json({
            success: true,
            message: 'Test email sent successfully!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};