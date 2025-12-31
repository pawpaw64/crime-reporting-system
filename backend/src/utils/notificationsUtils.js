const pool = require('../db');

async function createNotification(complaintId, message, type = 'system') {
    try {
        const [result] = await pool.query(
            "INSERT INTO complaint_notifications (complaint_id, message, type, created_at, is_read) VALUES (?, ?, ?, NOW(), 0)",
            [complaintId, message, type]
        );
        console.log("Notification created successfully:", result);
        return result;
    } catch (err) {
        console.error("Error creating notification:", err);
        throw err;
    }
}

module.exports = {
    createNotification
};