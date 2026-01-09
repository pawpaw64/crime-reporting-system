const db = require('../db');

/**
 * Get comprehensive case analytics for admin dashboard
 * Includes all cases handled by the admin (active and discarded)
 */
const getCaseAnalytics = async (req, res) => {
    try {
        const adminUsername = req.session.adminUser;

        if (!adminUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get admin's district
        const [adminData] = await db.query(
            'SELECT district_name FROM admins WHERE username = ?',
            [adminUsername]
        );

        if (adminData.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const districtName = adminData[0].district_name;

        // Get comprehensive statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_cases,
                SUM(CASE WHEN status = 'pending' AND is_discarded = FALSE THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'verifying' AND is_discarded = FALSE THEN 1 ELSE 0 END) as verifying,
                SUM(CASE WHEN status = 'investigating' AND is_discarded = FALSE THEN 1 ELSE 0 END) as investigating,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN is_discarded = TRUE THEN 1 ELSE 0 END) as discarded,
                SUM(CASE WHEN is_discarded = FALSE THEN 1 ELSE 0 END) as active_cases
            FROM complaint 
            WHERE district_name = ?
        `, [districtName]);

        // Get monthly trend data (last 12 months)
        const [monthlyTrend] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN is_discarded = TRUE THEN 1 ELSE 0 END) as discarded
            FROM complaint 
            WHERE district_name = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `, [districtName]);

        // Get complaint type distribution
        const [typeDistribution] = await db.query(`
            SELECT 
                complaint_type,
                COUNT(*) as count
            FROM complaint 
            WHERE district_name = ?
            GROUP BY complaint_type
            ORDER BY count DESC
        `, [districtName]);

        // Get status distribution (excluding discarded)
        const [statusDistribution] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM complaint 
            WHERE district_name = ? AND is_discarded = FALSE
            GROUP BY status
        `, [districtName]);

        // Get all cases including discarded for analytics table
        const [allCases] = await db.query(`
            SELECT 
                c.complaint_id,
                c.username,
                c.complaint_type,
                c.status,
                c.created_at,
                c.updated_at,
                c.location_address,
                c.is_discarded,
                c.discarded_at,
                c.discarded_by,
                u.fullName as complainant_fullname
            FROM complaint c
            LEFT JOIN users u ON c.username = u.username
            WHERE c.district_name = ?
            ORDER BY c.created_at DESC
        `, [districtName]);

        res.json({
            success: true,
            stats: stats[0],
            monthlyTrend,
            typeDistribution,
            statusDistribution,
            allCases
        });

    } catch (error) {
        console.error('Error fetching case analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

/**
 * Discard/Delete a case
 * Marks the case as discarded but keeps it in database for analytics
 */
const discardCase = async (req, res) => {
    try {
        const adminUsername = req.session.adminUser;
        const complaintId = req.params.id;

        if (!adminUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if complaint exists and belongs to admin's district
        const [complaint] = await db.query(`
            SELECT c.complaint_id, c.district_name, a.district_name as admin_district
            FROM complaint c
            CROSS JOIN admins a
            WHERE c.complaint_id = ? AND a.username = ?
        `, [complaintId, adminUsername]);

        if (complaint.length === 0 || complaint[0].district_name !== complaint[0].admin_district) {
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        // Mark as discarded
        await db.query(`
            UPDATE complaint 
            SET is_discarded = TRUE, 
                discarded_at = NOW(), 
                discarded_by = ?
            WHERE complaint_id = ?
        `, [adminUsername, complaintId]);

        res.json({ 
            success: true, 
            message: 'Case discarded successfully' 
        });

    } catch (error) {
        console.error('Error discarding case:', error);
        res.status(500).json({ error: 'Failed to discard case' });
    }
};

/**
 * Restore a discarded case
 */
const restoreCase = async (req, res) => {
    try {
        const adminUsername = req.session.adminUser;
        const complaintId = req.params.id;

        if (!adminUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await db.query(`
            UPDATE complaint 
            SET is_discarded = FALSE, 
                discarded_at = NULL, 
                discarded_by = NULL
            WHERE complaint_id = ?
        `, [complaintId]);

        res.json({ 
            success: true, 
            message: 'Case restored successfully' 
        });

    } catch (error) {
        console.error('Error restoring case:', error);
        res.status(500).json({ error: 'Failed to restore case' });
    }
};

module.exports = {
    getCaseAnalytics,
    discardCase,
    restoreCase
};
