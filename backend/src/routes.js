const authController = require('./controllers/auth');
const adminController = require('./controllers/admin');
const complaintController = require('./controllers/complaint');
const userController = require('./controllers/user');
const middleware = require('./middleware/auth');

module.exports = (app) => {
    // Auth routes
    app.post('/api/signup', authController.signup);
    app.post('/api/login', authController.login);
    app.post('/api/logout', (req, res) => {
        req.session.destroy();
        res.json({ success: true, message: "Logged out successfully" });
    });
    
    // User routes (require authentication)
    app.get('/api/profile', middleware.requireUser, userController.getProfile);
    app.post('/api/update-profile', middleware.requireUser, userController.updateProfile);
    app.get('/api/my-complaints', middleware.requireUser, userController.getMyComplaints);
    
    // Complaint routes
    app.post('/api/submit-complaint', 
        middleware.requireUser,
        (req, res, next) => {
            complaintController.uploadMiddleware(req, res, (err) => {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
                next();
            });
        },
        complaintController.submitComplaint
    );
    
    // Admin routes (require admin auth)
    app.post('/api/admin/login', adminController.login);
    app.get('/api/admin/dashboard', middleware.requireAdmin, adminController.getDashboard);
    app.post('/api/admin/update-status', middleware.requireAdmin, adminController.updateStatus);
    
    // Static file routes for frontend
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
    });
    
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/public/login.html'));
    });
    
    app.get('/signup', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/public/signup.html'));
    });
    
    // Add more routes as needed...
};