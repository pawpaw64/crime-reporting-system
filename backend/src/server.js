const app = require('./app');
const pool = require('./db');
const config = require('./config/config');
const { exec } = require('child_process');
const os = require('os');
const { initializeAlertSchedulers } = require('./utils/alertScheduler');
require('dotenv').config();

// Use centralized config for port (ensure it's a number)
const PORT = parseInt(config.port, 10) || 3000;
const HOST = process.env.HOST || 'localhost';
const URL = `http://${HOST}:${PORT}`;

console.log('🚀 Starting SecureVoice Crime Reporting System...\n');

const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Access: http://localhost:${PORT}`);
    const localIP = getLocalIP();
    
    // Initialize alert schedulers
    console.log('🔔 Initializing admin alert schedulers...');
    initializeAlertSchedulers();
    
    // Auto-open browser in development
    if (process.env.NODE_ENV !== 'production') {
        autoOpenBrowser(URL);
    }
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const newPort = PORT + 1;
        console.log(`\n⚠️  Port ${PORT} is busy. Trying ${newPort}...\n`);
        app.listen(newPort, () => {
            console.log(`✅ Server running on port ${newPort}`);
            console.log(`📍 Access: http://localhost:${newPort}`);
        });
    } else {
        console.error('\n❌ Server error:', err.message);
        process.exit(1);
    }
});

// Function to get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

// Function to auto-open browser
function autoOpenBrowser(url) {
    // Don't auto-open in CI environments
    if (process.env.CI || process.env.NODE_ENV === 'test') return;
    
    let command;
    const platform = process.platform;
    
    if (platform === 'darwin') {
        command = `open "${url}"`;
    } else if (platform === 'win32') {
        command = `start "" "${url}"`;
    } else {
        command = `xdg-open "${url}"`;
    }
    
    // Wait 1.5 seconds then open browser
    setTimeout(() => {
        exec(command, (error) => {
            if (error) {
                console.log('💡 Tip: Copy any URL above and open in your browser');
            } else {
                console.log('🌐 Browser opened automatically!');
            }
        });
    }, 1500);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down server gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = server;