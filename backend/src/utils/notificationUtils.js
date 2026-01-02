const pool = require('../db');

/**
 * Create a notification for a user
 * @param {number} complaintId - The complaint ID related to the notification
 * @param {string} message - The notification message
 * @param {string} type - The type of notification (e.g., 'status_update', 'admin_comment', etc.)
 */
async function createNotification(complaintId, message, type = 'general') {
    try {
        // Get the user ID from the complaint
        const [complaint] = await pool.query(
            'SELECT userid FROM complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (complaint.length === 0) {
            console.error('Complaint not found for notification:', complaintId);
            return false;
        }

        const userid = complaint[0].userid;

        // Insert notification into database
        await pool.query(
            `INSERT INTO notifications (userid, complaint_id, message, type, is_read, created_at) 
             VALUES (?, ?, ?, ?, 0, NOW())`,
            [userid, complaintId, message, type]
        );

        console.log(`Notification created for user ${userid}: ${message}`);
        return true;

    } catch (error) {
        console.error('Error creating notification:', error);
        return false;
    }
}

/**
 * Get all notifications for a user
 * @param {number} userid - The user ID
 * @param {boolean} unreadOnly - If true, only return unread notifications
 */
async function getUserNotifications(userid, unreadOnly = false) {
    try {
        let query = `
            SELECT n.*, c.complaint_title 
            FROM notifications n
            LEFT JOIN complaint c ON n.complaint_id = c.complaint_id
            WHERE n.userid = ?
        `;

        if (unreadOnly) {
            query += ' AND n.is_read = 0';
        }

        query += ' ORDER BY n.created_at DESC LIMIT 50';

        const [notifications] = await pool.query(query, [userid]);
        return notifications;

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 * @param {number} notificationId - The notification ID
 */
async function markNotificationAsRead(notificationId) {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE notification_id = ?',
            [notificationId]
        );
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

/**
 * Mark all notifications as read for a user
 * @param {number} userid - The user ID
 */
async function markAllNotificationsAsRead(userid) {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE userid = ? AND is_read = 0',
            [userid]
        );
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }
}

/**
 * Get unread notification count for a user
 * @param {number} userid - The user ID
 */
async function getUnreadNotificationCount(userid) {
    try {
        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE userid = ? AND is_read = 0',
            [userid]
        );
        return result[0].count;
    } catch (error) {
        console.error('Error getting unread notification count:', error);
        return 0;
    }
}

module.exports = {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
};
