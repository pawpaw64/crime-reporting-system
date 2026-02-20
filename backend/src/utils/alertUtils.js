const pool = require('../db');

/**
 * Get all active (unresolved) alerts with summary per admin
 * @returns {Promise<Array>} Array of alerts grouped by admin with counts
 */
async function getActiveAlertsSummary() {
    try {
        const [results] = await pool.query(`
            SELECT 
                admin_username,
                total_alerts,
                critical_alerts,
                high_alerts,
                oldest_alert,
                latest_alert
            FROM admin_alert_summary
            ORDER BY total_alerts DESC, critical_alerts DESC
        `);
        return results;
    } catch (error) {
        console.error('Error fetching active alerts summary:', error);
        throw error;
    }
}

/**
 * Get alert count for a specific admin
 * @param {string} adminUsername - The admin username
 * @returns {Promise<Object>} Alert count breakdown
 */
async function getAdminAlertCount(adminUsername) {
    try {
        const [results] = await pool.query(`
            SELECT 
                COALESCE(total_alerts, 0) as total_alerts,
                COALESCE(critical_alerts, 0) as critical_alerts,
                COALESCE(high_alerts, 0) as high_alerts
            FROM admin_alert_summary
            WHERE admin_username = ?
        `, [adminUsername]);
        
        if (results.length > 0) {
            return results[0];
        }
        
        return { total_alerts: 0, critical_alerts: 0, high_alerts: 0 };
    } catch (error) {
        console.error('Error fetching admin alert count:', error);
        throw error;
    }
}

/**
 * Get all alerts (active and resolved) for super admin view
 * @param {Object} options - Query options
 * @param {boolean} options.includeResolved - Include resolved alerts
 * @param {string} options.adminUsername - Filter by specific admin
 * @param {string} options.priorityLevel - Filter by priority (critical/high)
 * @param {number} options.limit - Limit number of results
 * @returns {Promise<Array>} Array of detailed alert information
 */
async function getAllAlerts(options = {}) {
    try {
        let query = `
            SELECT 
                alert_id,
                complaint_id,
                admin_username,
                admin_name,
                admin_email,
                district_name,
                complaint_type,
                LEFT(complaint_description, 100) as complaint_description,
                location_address,
                complaint_created_at,
                priority_level,
                alert_type,
                time_elapsed,
                threshold_minutes,
                complaint_status,
                is_resolved,
                is_acknowledged,
                alert_created_at,
                resolved_at,
                acknowledged_at,
                complainant_name,
                complainant_username
            FROM admin_alert_details
            WHERE 1=1
        `;
        
        const params = [];
        
        // Filter by resolution status
        if (!options.includeResolved) {
            query += ' AND is_resolved = 0';
        }
        
        // Filter by specific admin
        if (options.adminUsername) {
            query += ' AND admin_username = ?';
            params.push(options.adminUsername);
        }
        
        // Filter by priority level
        if (options.priorityLevel) {
            query += ' AND priority_level = ?';
            params.push(options.priorityLevel);
        }
        
        // Order by priority and time
        query += ' ORDER BY FIELD(priority_level, "critical", "high"), alert_created_at DESC';
        
        // Limit results
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(options.limit));
        }
        
        const [results] = await pool.query(query, params);
        return results;
    } catch (error) {
        console.error('Error fetching all alerts:', error);
        throw error;
    }
}

/**
 * Get detailed information for a specific alert
 * @param {number} alertId - The alert ID
 * @returns {Promise<Object>} Detailed alert information
 */
async function getAlertById(alertId) {
    try {
        const [results] = await pool.query(`
            SELECT 
                alert_id,
                complaint_id,
                admin_username,
                admin_name,
                admin_email,
                district_name,
                complaint_type,
                complaint_description,
                location_address,
                complaint_created_at,
                priority_level,
                alert_type,
                time_elapsed,
                threshold_minutes,
                complaint_status,
                is_resolved,
                is_acknowledged,
                alert_created_at,
                resolved_at,
                acknowledged_at,
                complainant_name,
                complainant_username
            FROM admin_alert_details
            WHERE alert_id = ?
        `, [alertId]);
        
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('Error fetching alert by ID:', error);
        throw error;
    }
}

/**
 * Acknowledge an alert (mark as seen by super admin)
 * @param {number} alertId - The alert ID
 * @returns {Promise<boolean>} Success status
 */
async function acknowledgeAlert(alertId) {
    try {
        const [result] = await pool.query(`
            UPDATE admin_alerts
            SET is_acknowledged = 1,
                acknowledged_at = NOW()
            WHERE alert_id = ? AND is_acknowledged = 0
        `, [alertId]);
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        throw error;
    }
}

/**
 * Acknowledge all alerts for a specific admin
 * @param {string} adminUsername - The admin username
 * @returns {Promise<number>} Number of alerts acknowledged
 */
async function acknowledgeAllAlertsForAdmin(adminUsername) {
    try {
        const [result] = await pool.query(`
            UPDATE admin_alerts
            SET is_acknowledged = 1,
                acknowledged_at = NOW()
            WHERE admin_username = ? AND is_acknowledged = 0 AND is_resolved = 0
        `, [adminUsername]);
        
        return result.affectedRows;
    } catch (error) {
        console.error('Error acknowledging all alerts for admin:', error);
        throw error;
    }
}

/**
 * Manually resolve an alert
 * @param {number} alertId - The alert ID
 * @returns {Promise<boolean>} Success status
 */
async function resolveAlert(alertId) {
    try {
        const [result] = await pool.query(`
            UPDATE admin_alerts
            SET is_resolved = 1,
                resolved_at = NOW()
            WHERE alert_id = ? AND is_resolved = 0
        `, [alertId]);
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error resolving alert:', error);
        throw error;
    }
}

/**
 * Check and generate new alerts manually
 * @returns {Promise<Object>} Result of alert generation
 */
async function generateAlerts() {
    try {
        await pool.query('CALL check_and_generate_alerts()');
        return { success: true, message: 'Alerts generated successfully' };
    } catch (error) {
        console.error('Error generating alerts:', error);
        throw error;
    }
}

/**
 * Get alert configuration settings
 * @returns {Promise<Array>} Alert configuration
 */
async function getAlertConfig() {
    try {
        const [results] = await pool.query(`
            SELECT 
                config_id,
                priority_level,
                threshold_minutes,
                is_active,
                created_at,
                updated_at
            FROM alert_config
            ORDER BY FIELD(priority_level, 'critical', 'high', 'medium', 'low')
        `);
        return results;
    } catch (error) {
        console.error('Error fetching alert config:', error);
        throw error;
    }
}

/**
 * Update alert configuration
 * @param {string} priorityLevel - Priority level to update
 * @param {number} thresholdMinutes - New threshold in minutes
 * @param {boolean} isActive - Whether this alert level is active
 * @returns {Promise<boolean>} Success status
 */
async function updateAlertConfig(priorityLevel, thresholdMinutes, isActive) {
    try {
        const [result] = await pool.query(`
            UPDATE alert_config
            SET threshold_minutes = ?,
                is_active = ?
            WHERE priority_level = ?
        `, [thresholdMinutes, isActive ? 1 : 0, priorityLevel]);
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error updating alert config:', error);
        throw error;
    }
}

/**
 * Get alert statistics
 * @returns {Promise<Object>} Alert statistics
 */
async function getAlertStatistics() {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_alerts,
                SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as active_alerts,
                SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as resolved_alerts,
                SUM(CASE WHEN is_acknowledged = 0 AND is_resolved = 0 THEN 1 ELSE 0 END) as unacknowledged_alerts,
                SUM(CASE WHEN priority_level = 'critical' AND is_resolved = 0 THEN 1 ELSE 0 END) as active_critical,
                SUM(CASE WHEN priority_level = 'high' AND is_resolved = 0 THEN 1 ELSE 0 END) as active_high,
                COUNT(DISTINCT admin_username) as admins_with_alerts
            FROM admin_alerts
        `);
        
        const [avgResponse] = await pool.query(`
            SELECT 
                AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_resolution_time_minutes,
                MIN(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as min_resolution_time_minutes,
                MAX(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as max_resolution_time_minutes
            FROM admin_alerts
            WHERE is_resolved = 1 AND resolved_at IS NOT NULL
        `);
        
        return {
            ...stats[0],
            avg_resolution_time_minutes: avgResponse[0].avg_resolution_time_minutes || 0,
            min_resolution_time_minutes: avgResponse[0].min_resolution_time_minutes || 0,
            max_resolution_time_minutes: avgResponse[0].max_resolution_time_minutes || 0
        };
    } catch (error) {
        console.error('Error fetching alert statistics:', error);
        throw error;
    }
}

module.exports = {
    getActiveAlertsSummary,
    getAdminAlertCount,
    getAllAlerts,
    getAlertById,
    acknowledgeAlert,
    acknowledgeAllAlertsForAdmin,
    resolveAlert,
    generateAlerts,
    getAlertConfig,
    updateAlertConfig,
    getAlertStatistics
};
