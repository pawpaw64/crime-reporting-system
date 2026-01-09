/**
 * Anonymous Report Controller
 * Handles anonymous crime report submissions without requiring authentication
 */

const pool = require('../db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { findAdminByLocation, geocodeAddress } = require('../utils/helperUtils');

// Configuration
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'securevoice-anonymous-salt-2026';
const CONTENT_HASH_SALT = process.env.CONTENT_HASH_SALT || 'securevoice-content-salt-2026';
const MAX_SUBMISSIONS_PER_DAY = parseInt(process.env.MAX_ANONYMOUS_SUBMISSIONS) || 3;
const RATE_LIMIT_WINDOW_HOURS = 24;

// Valid crime types for anonymous reports
const VALID_CRIME_TYPES = [
    'theft', 'assault', 'fraud', 'vandalism', 'harassment',
    'drug_related', 'cybercrime', 'domestic_violence', 'corruption',
    'human_trafficking', 'environmental', 'organized_crime', 
    'threat', 'public_safety', 'traffic_violation', 'other'
];

/**
 * Hash an IP address using SHA-256 with salt
 * Result cannot be reversed to original IP
 */
function hashIP(ip) {
    if (!ip) return null;
    const normalizedIP = ip.replace(/^::ffff:/, '');
    return crypto
        .createHash('sha256')
        .update(normalizedIP + IP_HASH_SALT)
        .digest('hex');
}

/**
 * Hash content for duplicate detection
 */
function hashContent(content) {
    if (!content) return null;
    const normalized = content
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    return crypto
        .createHash('sha256')
        .update(normalized + CONTENT_HASH_SALT)
        .digest('hex');
}

/**
 * Generate unique report ID
 * Format: SV-XXXXXXXX
 */
function generateReportId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SV-${timestamp.slice(-4)}${random}`;
}

/**
 * Generate random file ID for evidence storage
 */
function generateFileId(extension = '') {
    const random = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${timestamp}-${random}${extension}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
}

/**
 * Check rate limit for an IP
 */
async function checkRateLimit(ipHash) {
    const [results] = await pool.query(
        `SELECT COUNT(*) as count FROM anonymous_rate_limits 
         WHERE ip_hash = ? AND expires_at > NOW()`,
        [ipHash]
    );
    return results[0].count < MAX_SUBMISSIONS_PER_DAY;
}

/**
 * Record a submission for rate limiting
 */
async function recordSubmission(ipHash) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RATE_LIMIT_WINDOW_HOURS);
    
    await pool.query(
        `INSERT INTO anonymous_rate_limits (ip_hash, expires_at) VALUES (?, ?)`,
        [ipHash, expiresAt]
    );
}

/**
 * Check for duplicate submission
 */
async function checkDuplicate(contentHash, ipHash) {
    const [results] = await pool.query(
        `SELECT id FROM anonymous_submission_hashes 
         WHERE content_hash = ? AND ip_hash = ? AND expires_at > NOW()`,
        [contentHash, ipHash]
    );
    return results.length > 0;
}

/**
 * Record submission hash for duplicate detection
 */
async function recordSubmissionHash(contentHash, ipHash) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await pool.query(
        `INSERT INTO anonymous_submission_hashes (content_hash, ip_hash, expires_at) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE expires_at = ?`,
        [contentHash, ipHash, expiresAt, expiresAt]
    );
}

/**
 * Validate report data
 */
function validateReportData(data) {
    const errors = [];
    
    // Crime type validation
    if (!data.crimeType) {
        errors.push('Crime type is required');
    } else if (!VALID_CRIME_TYPES.includes(data.crimeType.toLowerCase())) {
        errors.push('Invalid crime type selected');
    }
    
    // Description validation
    if (!data.description) {
        errors.push('Description is required');
    } else if (data.description.length < 50) {
        errors.push('Description must be at least 50 characters');
    } else if (data.description.length > 5000) {
        errors.push('Description must be less than 5000 characters');
    }
    
    // Date validation
    if (!data.incidentDate) {
        errors.push('Incident date is required');
    } else {
        const date = new Date(data.incidentDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (isNaN(date.getTime())) {
            errors.push('Invalid date format');
        } else if (date > today) {
            errors.push('Incident date cannot be in the future');
        } else {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (date < oneYearAgo) {
                errors.push('Incident date cannot be more than 1 year ago');
            }
        }
    }
    
    // Time validation
    if (!data.incidentTime) {
        errors.push('Incident time is required');
    } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.incidentTime)) {
        errors.push('Invalid time format');
    }
    
    // Location validation
    if (!data.location) {
        errors.push('Location is required');
    } else if (data.location.length < 10) {
        errors.push('Please provide a more detailed location (minimum 10 characters)');
    } else if (data.location.length > 500) {
        errors.push('Location description too long');
    }
    
    // Optional fields validation
    if (data.suspectDescription && data.suspectDescription.length > 2000) {
        errors.push('Suspect description too long (max 2000 characters)');
    }
    
    if (data.additionalNotes && data.additionalNotes.length > 2000) {
        errors.push('Additional notes too long (max 2000 characters)');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize text input
 */
function sanitizeText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[<>'"]/g, '')
        .trim();
}

/**
 * Submit anonymous report
 */
exports.submitAnonymousReport = async (req, res) => {
    let uploadedFiles = [];
    
    try {
        const clientIP = getClientIP(req);
        const ipHash = hashIP(clientIP);
        
        // Check rate limit
        const withinLimit = await checkRateLimit(ipHash);
        if (!withinLimit) {
            return res.status(429).json({
                success: false,
                error: 'rate_limit_exceeded',
                message: `You have reached the maximum number of anonymous reports (${MAX_SUBMISSIONS_PER_DAY}) for today. Please try again in 24 hours.`
            });
        }
        
        // Parse form data
        const {
            crimeType,
            description,
            incidentDate,
            incidentTime,
            location,
            suspectDescription,
            additionalNotes,
            captchaAnswer,
            captchaExpected,
            latitude: frontendLat,
            longitude: frontendLng
        } = req.body;
        
        // Validate CAPTCHA
        if (!captchaAnswer || !captchaExpected || captchaAnswer.trim() !== captchaExpected.trim()) {
            return res.status(400).json({
                success: false,
                error: 'captcha_failed',
                message: 'Incorrect CAPTCHA answer. Please try again.'
            });
        }
        
        // Validate report data
        const validation = validateReportData({
            crimeType,
            description,
            incidentDate,
            incidentTime,
            location,
            suspectDescription,
            additionalNotes
        });
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                message: validation.errors.join(', ')
            });
        }
        
        // Check for evidence files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'no_evidence',
                message: 'At least one evidence file is required for anonymous reports'
            });
        }
        
        uploadedFiles = req.files;
        
        // Create content hash for duplicate detection
        const contentHash = hashContent(`${crimeType}${description}${incidentDate}${location}`);
        
        // Check for duplicate
        const isDuplicate = await checkDuplicate(contentHash, ipHash);
        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                error: 'duplicate_submission',
                message: 'A similar report has already been submitted from your location. If this is a new incident, please provide more details.'
            });
        }
        
        // Generate report ID
        const reportId = generateReportId();
        
        // Sanitize inputs
        const sanitizedDescription = sanitizeText(description);
        const sanitizedLocation = sanitizeText(location);
        const sanitizedSuspect = sanitizeText(suspectDescription || '');
        const sanitizedNotes = sanitizeText(additionalNotes || '');
        
        // Try to find district from location
        let districtName = null;
        let latitude = null;
        let longitude = null;
        
        // Use frontend coordinates if provided, otherwise try to geocode
        if (frontendLat && frontendLng) {
            latitude = parseFloat(frontendLat);
            longitude = parseFloat(frontendLng);
        }
        
        try {
            const adminData = await findAdminByLocation(sanitizedLocation);
            if (adminData) {
                districtName = adminData.districtName;
            }
            
            // Only geocode if coordinates not already provided from frontend
            if (!latitude || !longitude) {
                const coords = await geocodeAddress(sanitizedLocation);
                if (coords) {
                    latitude = coords.latitude;
                    longitude = coords.longitude;
                }
            }
        } catch (geoError) {
            console.error('Geocoding error:', geoError);
        }
        
        // Find admin for this location (same as regular complaints)
        let assignedAdmin = null;
        try {
            const adminData = await findAdminByLocation(sanitizedLocation);
            if (adminData) {
                assignedAdmin = adminData.adminUsername;
                if (!districtName) {
                    districtName = adminData.districtName;
                }
            }
        } catch (adminError) {
            console.error('Admin lookup error:', adminError);
        }
        
        // Insert anonymous report with assigned admin
        const [result] = await pool.query(
            `INSERT INTO anonymous_reports (
                report_id, crime_type, description, incident_date, incident_time,
                location_address, latitude, longitude, district_name, assigned_admin,
                suspect_description, additional_notes, ip_hash, content_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reportId,
                crimeType.toLowerCase(),
                sanitizedDescription,
                incidentDate,
                incidentTime,
                sanitizedLocation,
                latitude,
                longitude,
                districtName,
                assignedAdmin,
                sanitizedSuspect || null,
                sanitizedNotes || null,
                ipHash,
                contentHash
            ]
        );
        
        // Process and save evidence files
        const evidenceDir = path.join(__dirname, '../../uploads/anonymous');
        await fs.mkdir(evidenceDir, { recursive: true });
        
        for (const file of uploadedFiles) {
            const ext = path.extname(file.originalname);
            const storedName = generateFileId(ext);
            const storedPath = path.join(evidenceDir, storedName);
            
            // Move file to anonymous evidence directory
            await fs.rename(file.path, storedPath);
            
            // Get file type category
            let fileType = 'document';
            if (file.mimetype.startsWith('image/')) fileType = 'image';
            else if (file.mimetype.startsWith('video/')) fileType = 'video';
            else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
            
            // Insert evidence record
            await pool.query(
                `INSERT INTO anonymous_evidence (
                    report_id, original_name, stored_name, file_path, 
                    file_type, file_size, mime_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    reportId,
                    file.originalname,
                    storedName,
                    `uploads/anonymous/${storedName}`,
                    fileType,
                    file.size,
                    file.mimetype
                ]
            );
        }
        
        // Record for rate limiting and duplicate detection
        await recordSubmission(ipHash);
        await recordSubmissionHash(contentHash, ipHash);
        
        console.log(`Anonymous report submitted: ${reportId}`);
        
        res.status(201).json({
            success: true,
            reportId: reportId,
            message: 'Your anonymous report has been submitted successfully.',
            evidenceCount: uploadedFiles.length
        });
        
    } catch (error) {
        console.error('Anonymous report submission error:', error);
        
        // Clean up uploaded files on error
        for (const file of uploadedFiles) {
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                // Ignore cleanup errors
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'An unexpected error occurred. Please try again later.'
        });
    }
};

/**
 * Check anonymous report status by report ID
 */
exports.checkAnonymousReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        
        if (!reportId || !reportId.match(/^SV-[A-Z0-9]+$/)) {
            return res.status(400).json({
                success: false,
                error: 'invalid_report_id',
                message: 'Invalid report ID format'
            });
        }
        
        const [results] = await pool.query(
            `SELECT 
                report_id,
                crime_type,
                status,
                submitted_at,
                reviewed_at,
                district_name,
                (SELECT COUNT(*) FROM anonymous_evidence ae WHERE ae.report_id = ar.report_id) as evidence_count
            FROM anonymous_reports ar
            WHERE report_id = ?`,
            [reportId]
        );
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'not_found',
                message: 'Report not found. Please check your report ID.'
            });
        }
        
        const report = results[0];
        
        // Status messages
        const statusMessages = {
            'pending': 'Your report is awaiting review by authorities.',
            'reviewing': 'Your report is currently being reviewed.',
            'reviewed': 'Your report has been reviewed and noted.',
            'investigating': 'Authorities are investigating this matter.',
            'resolved': 'This case has been resolved.',
            'dismissed': 'This report could not be verified or processed.'
        };
        
        res.json({
            success: true,
            report: {
                reportId: report.report_id,
                crimeType: report.crime_type,
                status: report.status,
                statusMessage: statusMessages[report.status] || 'Status unknown',
                submittedAt: report.submitted_at,
                reviewedAt: report.reviewed_at,
                district: report.district_name,
                evidenceCount: report.evidence_count
            }
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Unable to check report status. Please try again later.'
        });
    }
};

/**
 * Get anonymous reports for admin dashboard
 * Filters by admin's district (location-based) just like normal complaints
 */
exports.getAnonymousReports = async (req, res) => {
    try {
        // Check if admin is authenticated
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }
        
        const adminUsername = req.session.adminUsername;
        
        // Get admin's district
        const [adminResult] = await pool.query(
            'SELECT district_name FROM admins WHERE username = ?',
            [adminUsername]
        );
        
        if (adminResult.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        const adminDistrict = adminResult[0].district_name;
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status || null;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                ar.report_id,
                ar.crime_type,
                ar.description,
                ar.incident_date,
                ar.incident_time,
                ar.location_address,
                ar.latitude,
                ar.longitude,
                ar.district_name,
                ar.assigned_admin,
                ar.status,
                ar.is_flagged,
                ar.submitted_at,
                ar.reviewed_at,
                ar.reviewed_by,
                (SELECT COUNT(*) FROM anonymous_evidence ae WHERE ae.report_id = ar.report_id) as evidence_count
            FROM anonymous_reports ar
            WHERE (ar.assigned_admin = ? OR ar.district_name = ? OR (ar.assigned_admin IS NULL AND ar.district_name IS NULL))
        `;
        
        const params = [adminUsername, adminDistrict];
        
        if (status) {
            query += ' AND ar.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY ar.submitted_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [reports] = await pool.query(query, params);
        
        // Get total count with same filtering
        let countQuery = `
            SELECT COUNT(*) as total FROM anonymous_reports 
            WHERE (assigned_admin = ? OR district_name = ? OR (assigned_admin IS NULL AND district_name IS NULL))
        `;
        const countParams = [adminUsername, adminDistrict];
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        const [countResult] = await pool.query(countQuery, countParams);
        
        res.json({
            success: true,
            reports,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
        
    } catch (error) {
        console.error('Get anonymous reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve reports'
        });
    }
};

/**
 * Get single anonymous report details (admin only)
 */
exports.getAnonymousReportDetails = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }
        
        const { reportId } = req.params;
        const adminUsername = req.session.adminUsername;
        const adminDistrict = req.session.adminDistrict || '';
        
        const [reports] = await pool.query(
            `SELECT * FROM anonymous_reports 
             WHERE report_id = ? 
             AND (assigned_admin = ? OR district_name = ? OR (assigned_admin IS NULL AND district_name IS NULL))`,
            [reportId, adminUsername, adminDistrict]
        );
        
        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }
        
        const report = reports[0];
        
        // Get evidence
        const [evidence] = await pool.query(
            `SELECT id, original_name, stored_name, file_path, file_type, file_size, uploaded_at 
             FROM anonymous_evidence WHERE report_id = ?`,
            [reportId]
        );
        
        res.json({
            success: true,
            report: {
                ...report,
                ip_hash: undefined // Never expose IP hash
            },
            evidence
        });
        
    } catch (error) {
        console.error('Get anonymous report details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve report details'
        });
    }
};

/**
 * Update anonymous report status (admin only)
 */
exports.updateAnonymousReportStatus = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }
        
        const { reportId } = req.params;
        const { status, adminNotes } = req.body;
        
        const validStatuses = ['pending', 'reviewing', 'reviewed', 'investigating', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        
        const adminUsername = req.session.adminUsername;
        const adminDistrict = req.session.adminDistrict || '';
        
        // Only allow update for reports assigned to this admin's district
        const [result] = await pool.query(
            `UPDATE anonymous_reports 
             SET status = ?, admin_notes = ?, reviewed_at = NOW(), reviewed_by = ?
             WHERE report_id = ? 
             AND (assigned_admin = ? OR district_name = ? OR (assigned_admin IS NULL AND district_name IS NULL))`,
            [status, adminNotes || null, adminUsername, reportId, adminUsername, adminDistrict]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found or not authorized to update'
            });
        }
        
        res.json({
            success: true,
            message: 'Report status updated successfully'
        });
        
    } catch (error) {
        console.error('Update anonymous report status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update report status'
        });
    }
};

/**
 * Flag anonymous report (admin only)
 */
exports.flagAnonymousReport = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }
        
        const { reportId } = req.params;
        const { flagged, flagReason } = req.body;
        const adminUsername = req.session.adminUsername;
        const adminDistrict = req.session.adminDistrict || '';
        
        // Only allow flagging for reports assigned to this admin's district
        const [result] = await pool.query(
            `UPDATE anonymous_reports 
             SET is_flagged = ?, flag_reason = ?
             WHERE report_id = ?
             AND (assigned_admin = ? OR district_name = ? OR (assigned_admin IS NULL AND district_name IS NULL))`,
            [flagged ? 1 : 0, flagReason || null, reportId, adminUsername, adminDistrict]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found or not authorized to flag'
            });
        }
        
        res.json({
            success: true,
            message: flagged ? 'Report flagged' : 'Report unflagged'
        });
        
    } catch (error) {
        console.error('Flag anonymous report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to flag report'
        });
    }
};

/**
 * Get anonymous report statistics
 */
exports.getAnonymousReportStats = async (req, res) => {
    try {
        // Get admin's district for filtering
        const adminUsername = req.session?.adminUsername || '';
        const adminDistrict = req.session?.adminDistrict || '';
        
        const whereClause = `WHERE (assigned_admin = ? OR district_name = ? OR (assigned_admin IS NULL AND district_name IS NULL))`;
        const params = [adminUsername, adminDistrict];
        
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
                SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
                SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as flagged
            FROM anonymous_reports
            ${whereClause}
        `, params);
        
        const [byType] = await pool.query(`
            SELECT crime_type, COUNT(*) as count 
            FROM anonymous_reports 
            ${whereClause}
            GROUP BY crime_type 
            ORDER BY count DESC
        `, params);
        
        res.json({
            success: true,
            statistics: {
                ...stats[0],
                byType
            }
        });
        
    } catch (error) {
        console.error('Get anonymous report stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
};

/**
 * Get anonymous report heatmap data (public)
 */
exports.getAnonymousHeatmapData = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT 
                latitude, 
                longitude, 
                crime_type,
                status
            FROM anonymous_reports 
            WHERE latitude IS NOT NULL 
            AND longitude IS NOT NULL
            AND submitted_at > DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `);
        
        res.json({
            success: true,
            data: results.map(r => ({
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude),
                crimeType: r.crime_type,
                status: r.status
            }))
        });
        
    } catch (error) {
        console.error('Get anonymous heatmap data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve heatmap data'
        });
    }
};

/**
 * Get anonymous report evidence (admin only)
 */
exports.getAnonymousReportEvidence = async (req, res) => {
    try {
        if (!req.session.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required'
            });
        }
        
        const { reportId } = req.params;
        
        // Check if report exists
        const [reports] = await pool.query(
            `SELECT report_id FROM anonymous_reports WHERE report_id = ?`,
            [reportId]
        );
        
        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }
        
        // Get evidence
        const [evidence] = await pool.query(
            `SELECT 
                id, 
                original_name, 
                stored_name, 
                file_path, 
                file_type, 
                file_size, 
                mime_type,
                uploaded_at 
             FROM anonymous_evidence 
             WHERE report_id = ?
             ORDER BY uploaded_at ASC`,
            [reportId]
        );
        
        res.json({
            success: true,
            evidence
        });
        
    } catch (error) {
        console.error('Get anonymous report evidence error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve evidence'
        });
    }
};
