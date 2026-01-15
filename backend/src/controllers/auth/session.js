const { sendError, sendSuccess } = require('./common');

// User Logout
exports.userLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return sendError(res, 500, 'Error logging out');
        res.clearCookie('connect.sid');
        sendSuccess(res, 'Logout successful');
    });
};

// Check User Authentication Status
exports.checkAuth = (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({
            authenticated: true,
            user: { id: req.session.userId, username: req.session.username, email: req.session.email }
        });
    }
    return res.status(401).json({ authenticated: false });
};

// Alias for logout (keeps legacy route names working)
exports.logout = (req, res) => {
    exports.userLogout(req, res);
};
