module.exports = {
    // Check if user is logged in
    requireUser: (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in to access this resource"
            });
        }
        next();
    },

    // Check if admin is logged in
    requireAdmin: (req, res, next) => {
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required"
            });
        }
        next();
    },

    // Check cache control
    cacheControl: (req, res, next) => {
        // Only prevent caching for sensitive routes
        if (req.url.includes('/admin-dashboard') ||
            req.url.includes('/login') ||
            req.url.includes('/adminLogin') ||
            req.url.includes('/profile') ||
            req.url.endsWith('.html')) {
            
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        } else if (req.url.endsWith('.css') || req.url.endsWith('.js') || 
                   req.url.endsWith('.png') || req.url.endsWith('.jpg')) {
            // Allow caching for static assets
            res.set('Cache-Control', 'public, max-age=3600');
        }
        next();
    }
};