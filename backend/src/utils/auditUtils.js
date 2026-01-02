const pool = require('../db');

/**
 * Log admin actions for audit trail
 * @param {string} adminUsername - Admin username performing the action
 * @param {string} action - Action type (e.g., 'login', 'status_update', 'complaint_viewed')
 * @param {object} options - Additional options
 * @param {string} options.actionDetails - JSON or text with details
 * @param {string} options.ipAddress - IP address
 * @param {string} options.userAgent - Browser user agent
 * @param {number} options.complaintId - Related complaint ID
 * @param {string} options.targetUsername - Affected user
 * @param {string} options.result - 'success', 'failure', or 'warning'
 */
async function logAdminAction(adminUsername, action, options = {}) {
    try {
        const {
            actionDetails = null,
            ipAddress = null,
            userAgent = null,
            complaintId = null,
            targetUsername = null,
            result = 'success'
        } = options;

        // Convert actionDetails to JSON string if it's an object
        const details = typeof actionDetails === 'object' 
            ? JSON.stringify(actionDetails) 
            : actionDetails;

        await pool.query(
            `INSERT INTO admin_audit_logs 
            (admin_username, action, action_details, ip_address, user_agent, complaint_id, target_username, result) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminUsername, action, details, ipAddress, userAgent, complaintId, targetUsername, result]
        );
    } catch (err) {
        console.error('Error logging admin action:', err);
        // Don't throw error - logging failure shouldn't break the main operation
    }
}

/**
 * Get audit logs for a specific admin
 * @param {string} adminUsername - Admin username
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} - Array of log entries
 */
async function getAdminAuditLogs(adminUsername, filters = {}) {
    try {
        const { action = null, startDate = null, endDate = null, limit = 100 } = filters;
        
        let query = 'SELECT * FROM admin_audit_logs WHERE admin_username = ?';
        const params = [adminUsername];

        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }

        if (startDate) {
            query += ' AND timestamp >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND timestamp <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const [logs] = await pool.query(query, params);
        return logs;
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        throw err;
    }
}

/**
 * Get all audit logs (Super Admin only)
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} - Array of log entries
 */
async function getAllAuditLogs(filters = {}) {
    try {
        const { adminUsername = null, action = null, startDate = null, endDate = null, limit = 500 } = filters;
        
        let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
        const params = [];

        if (adminUsername) {
            query += ' AND admin_username = ?';
            params.push(adminUsername);
        }

        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }

        if (startDate) {
            query += ' AND timestamp >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND timestamp <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const [logs] = await pool.query(query, params);
        return logs;
    } catch (err) {
        console.error('Error fetching all audit logs:', err);
        throw err;
    }
}

module.exports = {
    logAdminAction,
    getAdminAuditLogs,
    getAllAuditLogs
};
