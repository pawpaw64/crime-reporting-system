const express = require('express');
const path = require('path');

// Configure static file serving
function setupStatic(app) {
    const frontendPath = path.join(__dirname, '../../../frontend');
    
    // Main frontend static files
    app.use(express.static(frontendPath));
    app.use('/src', express.static(path.join(frontendPath, 'src')));
    app.use('/css', express.static(path.join(frontendPath, 'src/css')));
    app.use('/js', express.static(path.join(frontendPath, 'src/js')));
    app.use('/images', express.static(path.join(frontendPath, 'images')));
    app.use('/public', express.static(path.join(frontendPath, 'public')));
    
    // Uploaded files
    app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
}

module.exports = { setupStatic };
