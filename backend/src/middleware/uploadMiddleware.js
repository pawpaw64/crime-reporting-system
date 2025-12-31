const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

module.exports = upload;