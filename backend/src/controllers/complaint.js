const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath;
        if (file.mimetype.startsWith('image/')) {
            uploadPath = path.join(__dirname, '../../uploads/images/');
        } else if (file.mimetype.startsWith('video/')) {
            uploadPath = path.join(__dirname, '../../uploads/videos/');
        } else if (file.mimetype.startsWith('audio/')) {
            uploadPath = path.join(__dirname, '../../uploads/audio/');
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
}).array('evidence', 10);

module.exports = {
    uploadMiddleware: upload,
    
    submitComplaint: async (req, res) => {
        try {
            // Your complaint submission logic here
            // Similar to the /submit-complaint route in insertJS.js
        } catch (error) {
            console.error("Complaint submission error:", error);
            res.status(500).json({
                success: false,
                message: "Error submitting complaint"
            });
        }
    },
    
    // Other complaint-related functions...
};