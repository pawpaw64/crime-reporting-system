const pool = require('../db');

/**
 * Case Analytics Controller
 * Provides case statistics and analytics for admin dashboard
 */

// Get trend analysis data
exports.getTrendAnalysis = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const adminUsername = req.session.adminUsername;
        const { period = '30' } = req.query;

        // Get complaints over time
        const [trends] = await pool.query(
            `SELECT 
                DATE(created_at) as date,
                status,
                COUNT(*) as count
            FROM complaint
            WHERE admin_username = ? 
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND (is_discarded IS NULL OR is_discarded = FALSE)
            GROUP BY DATE(created_at), status
            ORDER BY date ASC`,
            [adminUsername, parseInt(period)]
        );

        // Process trends for chart data
        const chartData = processTrendData(trends, parseInt(period));

        res.json({
            success: true,
            trends: chartData
        });

    } catch (err) {
        console.error("Get trend analysis error:", err);
        res.status(500).json({ success: false, message: "Error fetching trend analysis" });
    }
};

// Get crime type distribution
exports.getCrimeDistribution = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const adminUsername = req.session.adminUsername;

        const [distribution] = await pool.query(
            `SELECT 
                COALESCE(cat.name, c.complaint_type, 'Other') as crime_type,
                COUNT(*) as count,
                SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
                AVG(DATEDIFF(
                    IFNULL(
                        (SELECT MIN(updated_at) FROM status_updates su 
                         WHERE su.complaint_id = c.complaint_id AND su.status = 'resolved'),
                        NOW()
                    ),
                    c.created_at
                )) as avg_resolution_days
            FROM complaint c
            LEFT JOIN category cat ON c.category_id = cat.category_id
            WHERE c.admin_username = ? AND (c.is_discarded IS NULL OR c.is_discarded = FALSE)
            GROUP BY COALESCE(cat.name, c.complaint_type, 'Other')
            ORDER BY count DESC`,
            [adminUsername]
        );

        res.json({
            success: true,
            distribution: distribution
        });

    } catch (err) {
        console.error("Get crime distribution error:", err);
        res.status(500).json({ success: false, message: "Error fetching crime distribution" });
    }
};

// Get performance metrics
exports.getPerformanceMetrics = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const adminUsername = req.session.adminUsername;

        // Get resolution time metrics
        const [metrics] = await pool.query(
            `SELECT 
                COUNT(*) as total_cases,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_cases,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_cases,
                SUM(CASE WHEN status = 'verifying' THEN 1 ELSE 0 END) as verifying_cases,
                SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating_cases,
                AVG(CASE 
                    WHEN status = 'resolved' THEN 
                        DATEDIFF(
                            (SELECT MIN(updated_at) FROM status_updates su 
                             WHERE su.complaint_id = c.complaint_id AND su.status = 'resolved'),
                            c.created_at
                        )
                    ELSE NULL
                END) as avg_resolution_time,
                COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as cases_this_week,
                COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as cases_this_month
            FROM complaint c
            WHERE c.admin_username = ? AND (c.is_discarded IS NULL OR c.is_discarded = FALSE)`,
            [adminUsername]
        );

        // Calculate resolution rate
        const performanceData = metrics[0];
        const resolutionRate = performanceData.total_cases > 0 
            ? (performanceData.resolved_cases / performanceData.total_cases * 100) 
            : 0;

        const performance = {
            ...performanceData,
            resolution_rate: Math.round(resolutionRate * 10) / 10
        };

        res.json({
            success: true,
            performance: performance
        });

    } catch (err) {
        console.error("Get performance metrics error:", err);
        res.status(500).json({ success: false, message: "Error fetching performance metrics" });
    }
};

// Helper function to process trend data for charts
function processTrendData(trends, days) {
    const dateMap = {};
    const statusTotals = { pending: 0, verifying: 0, investigating: 0, resolved: 0 };

    // Initialize all dates in range
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap[dateStr] = { date: dateStr, total: 0, pending: 0, verifying: 0, investigating: 0, resolved: 0 };
    }

    // Fill in actual data
    trends.forEach(trend => {
        const dateStr = trend.date instanceof Date 
            ? trend.date.toISOString().split('T')[0] 
            : trend.date;
        
        if (dateMap[dateStr]) {
            dateMap[dateStr].total += trend.count;
            if (statusTotals.hasOwnProperty(trend.status)) {
                dateMap[dateStr][trend.status] += trend.count;
                statusTotals[trend.status] += trend.count;
            }
        }
    });

    return {
        daily: Object.values(dateMap),
        totals: statusTotals
    };
}

module.exports = exports;
