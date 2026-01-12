const express = require('express');
const path = require('path');
require('dotenv').config();

const { helmetConfig, corsConfig, sessionConfig, jsonParser, urlencodedParser } = require('./middleware/securityMiddleware');
const { setupStatic } = require('./middleware/staticMiddleware');

const app = express();

// Security & middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(jsonParser);
app.use(urlencodedParser);
app.use(sessionConfig);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
setupStatic(app);

// Mount all routes
const routes = require('./routes');
app.use('/', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SecureVoice API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Catch all handler - serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

module.exports = app;