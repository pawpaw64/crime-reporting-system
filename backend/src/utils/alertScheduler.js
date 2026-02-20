const cron = require('node-cron');
const pool = require('../db');
const { generateAlerts } = require('../utils/alertUtils');

/**
 * Alert Generation Scheduler
 * Runs every 15 minutes to check for overdue complaints and generate alerts
 */

// Schedule the alert generation task
const scheduleAlertGeneration = () => {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running alert generation task...`);
        
        try {
            await generateAlerts();
            console.log(`[${new Date().toISOString()}] Alert generation completed successfully`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error generating alerts:`, error);
        }
    });

    console.log('Alert generation scheduler initialized - running every 15 minutes');
};

// Optional: Schedule a daily cleanup of old resolved alerts (keep last 30 days)
const scheduleAlertCleanup = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running alert cleanup task...`);
        
        try {
            const [result] = await pool.query(`
                DELETE FROM admin_alerts
                WHERE is_resolved = 1
                AND resolved_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);
            
            console.log(`[${new Date().toISOString()}] Cleaned up ${result.affectedRows} old resolved alerts`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error cleaning up alerts:`, error);
        }
    });

    console.log('Alert cleanup scheduler initialized - running daily at 2:00 AM');
};

// Initialize all schedulers
const initializeAlertSchedulers = () => {
    scheduleAlertGeneration();
    scheduleAlertCleanup();
    
    // Run alert generation immediately on startup
    console.log('Running initial alert generation...');
    generateAlerts()
        .then(() => console.log('Initial alert generation completed'))
        .catch(err => console.error('Initial alert generation error:', err));
};

module.exports = {
    initializeAlertSchedulers,
    scheduleAlertGeneration,
    scheduleAlertCleanup
};
