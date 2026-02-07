# Utilities, Middleware & Security
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Helper Utilities](#helper-utilities)
3. [Password Utilities](#password-utilities)
4. [Email Utilities](#email-utilities)
5. [Notification Utilities](#notification-utilities)
6. [Audit Utilities](#audit-utilities)
7. [Authentication Middleware](#authentication-middleware)
8. [Security Middleware](#security-middleware)
9. [File Upload Middleware](#file-upload-middleware)
10. [Application Configuration](#application-configuration)

---

## Overview

The SecureVoice system uses a layered utility and middleware architecture:

```
Request → Security Middleware → Auth Middleware → Route Handler → Utilities → Response
```

### Utility Categories

| Category | Purpose | File |
|----------|---------|------|
| **Helper Utils** | 3NF database operations, admin assignment | `helperUtils.js` |
| **Password Utils** | Hashing, validation, strength checking | `passwordUtils.js` |
| **Email Utils** | SMTP configuration, templates | `emailUtils.js` |
| **Notification Utils** | In-app notifications, alerts | `notificationUtils.js` |
| **Audit Utils** | Action logging, audit trail | `auditUtils.js` |

### Middleware Categories

| Category | Purpose | File |
|----------|---------|------|
| **Auth Middleware** | Session validation, role checks | `authMiddleware.js` |
| **Security Middleware** | Headers, rate limiting, CORS | `securityMiddleware.js` |
| **Upload Middleware** | File handling, validation | `uploadMiddleware.js` |
| **Static Middleware** | File serving, caching | `staticMiddleware.js` |

---

## Helper Utilities

### File: `backend/src/utils/helperUtils.js`

These utilities handle 3NF normalized database operations.

#### Get or Create Location

```javascript
const pool = require('../db');

/**
 * Get or create a location entry in normalized tables
 * Creates division, district, thana if they don't exist
 * 
 * @param {string} locationString - Format: "Thana, District, Division"
 * @returns {Object} {locationId, divisionId, districtId, thanaId}
 */
async function getOrCreateLocation(locationString) {
    if (!locationString) return { locationId: null };
    
    // Parse location string
    const parts = locationString.split(',').map(p => p.trim());
    
    let divisionName = null;
    let districtName = null;
    let thanaName = null;
    
    // Support multiple formats
    if (parts.length >= 3) {
        [thanaName, districtName, divisionName] = parts;
    } else if (parts.length === 2) {
        [districtName, divisionName] = parts;
    } else {
        divisionName = parts[0];
    }
    
    // ============ GET/CREATE DIVISION ============
    let divisionId = null;
    if (divisionName) {
        const [divisions] = await pool.query(
            'SELECT division_id FROM division WHERE division_name = ?',
            [divisionName]
        );
        
        if (divisions.length > 0) {
            divisionId = divisions[0].division_id;
        } else {
            const [result] = await pool.query(
                'INSERT INTO division (division_name) VALUES (?)',
                [divisionName]
            );
            divisionId = result.insertId;
        }
    }
    
    // ============ GET/CREATE DISTRICT ============
    let districtId = null;
    if (districtName && divisionId) {
        const [districts] = await pool.query(
            'SELECT district_id FROM district WHERE district_name = ? AND division_id = ?',
            [districtName, divisionId]
        );
        
        if (districts.length > 0) {
            districtId = districts[0].district_id;
        } else {
            const [result] = await pool.query(
                'INSERT INTO district (district_name, division_id) VALUES (?, ?)',
                [districtName, divisionId]
            );
            districtId = result.insertId;
        }
    }
    
    // ============ GET/CREATE THANA ============
    let thanaId = null;
    if (thanaName && districtId) {
        const [thanas] = await pool.query(
            'SELECT thana_id FROM thana WHERE thana_name = ? AND district_id = ?',
            [thanaName, districtId]
        );
        
        if (thanas.length > 0) {
            thanaId = thanas[0].thana_id;
        } else {
            const [result] = await pool.query(
                'INSERT INTO thana (thana_name, district_id) VALUES (?, ?)',
                [thanaName, districtId]
            );
            thanaId = result.insertId;
        }
    }
    
    // ============ GET/CREATE LOCATION ============
    let locationId = null;
    
    // Find existing location with same components
    const [locations] = await pool.query(
        `SELECT location_id FROM location 
         WHERE division_id = ? AND district_id <=> ? AND thana_id <=> ?`,
        [divisionId, districtId, thanaId]
    );
    
    if (locations.length > 0) {
        locationId = locations[0].location_id;
    } else {
        const [result] = await pool.query(
            `INSERT INTO location (division_id, district_id, thana_id) 
             VALUES (?, ?, ?)`,
            [divisionId, districtId, thanaId]
        );
        locationId = result.insertId;
    }
    
    return {
        locationId,
        divisionId,
        districtId,
        thanaId,
        divisionName,
        districtName,
        thanaName
    };
}
```

#### Find Admin by Location

```javascript
/**
 * Find admin assigned to a location
 * Prioritizes: Thana → District → Division
 * 
 * @param {string} locationString - Location to find admin for
 * @returns {Object} {adminUsername, districtName} or null
 */
async function findAdminByLocation(locationString) {
    if (!locationString) return null;
    
    const parts = locationString.split(',').map(p => p.trim());
    
    // Extract location components
    const thanaName = parts[0] || null;
    const districtName = parts[1] || null;
    const divisionName = parts[2] || null;
    
    // ============ TRY THANA-LEVEL ADMIN ============
    if (thanaName && districtName) {
        const [admins] = await pool.query(`
            SELECT a.admin_username, d.district_name
            FROM admin a
            JOIN district d ON a.district_id = d.district_id
            JOIN thana t ON t.district_id = d.district_id
            WHERE t.thana_name = ? 
              AND d.district_name = ?
              AND a.status = 'active'
              AND a.role != 'super_admin'
            LIMIT 1
        `, [thanaName, districtName]);
        
        if (admins.length > 0) {
            return {
                adminUsername: admins[0].admin_username,
                districtName: admins[0].district_name
            };
        }
    }
    
    // ============ TRY DISTRICT-LEVEL ADMIN ============
    if (districtName) {
        const [admins] = await pool.query(`
            SELECT a.admin_username, d.district_name
            FROM admin a
            JOIN district d ON a.district_id = d.district_id
            WHERE d.district_name = ?
              AND a.status = 'active'
              AND a.role != 'super_admin'
            LIMIT 1
        `, [districtName]);
        
        if (admins.length > 0) {
            return {
                adminUsername: admins[0].admin_username,
                districtName: admins[0].district_name
            };
        }
    }
    
    // ============ TRY DIVISION-LEVEL ADMIN ============
    if (divisionName) {
        const [admins] = await pool.query(`
            SELECT a.admin_username, d.district_name
            FROM admin a
            JOIN district d ON a.district_id = d.district_id
            JOIN division div ON d.division_id = div.division_id
            WHERE div.division_name = ?
              AND a.status = 'active'
              AND a.role != 'super_admin'
            LIMIT 1
        `, [divisionName]);
        
        if (admins.length > 0) {
            return {
                adminUsername: admins[0].admin_username,
                districtName: admins[0].district_name
            };
        }
    }
    
    // ============ FALLBACK: ANY ACTIVE ADMIN ============
    const [admins] = await pool.query(`
        SELECT a.admin_username, d.district_name
        FROM admin a
        LEFT JOIN district d ON a.district_id = d.district_id
        WHERE a.status = 'active'
          AND a.role != 'super_admin'
        ORDER BY 
            (SELECT COUNT(*) FROM complaint c 
             WHERE c.admin_username = a.admin_username 
               AND c.status NOT IN ('resolved', 'dismissed')) ASC
        LIMIT 1
    `);
    
    if (admins.length > 0) {
        return {
            adminUsername: admins[0].admin_username,
            districtName: admins[0].district_name || 'Unassigned'
        };
    }
    
    return null;
}
```

#### Get Category ID (Normalized)

```javascript
/**
 * Get or create category ID
 * Handles crime type normalization
 * 
 * @param {string} crimeType - Crime type name
 * @returns {number|null} Category ID
 */
async function getCategoryIdNormalized(crimeType) {
    if (!crimeType) return null;
    
    // Normalize crime type
    const normalizedType = crimeType
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    
    // Check if exists
    const [categories] = await pool.query(
        'SELECT category_id FROM category WHERE category_name = ?',
        [normalizedType]
    );
    
    if (categories.length > 0) {
        return categories[0].category_id;
    }
    
    // Create new category
    const [result] = await pool.query(
        'INSERT INTO category (category_name) VALUES (?)',
        [normalizedType]
    );
    
    return result.insertId;
}
```

#### Get Location String

```javascript
/**
 * Build location string from normalized components
 * 
 * @param {number} locationId - Location ID
 * @returns {string} "Thana, District, Division"
 */
async function getLocationString(locationId) {
    if (!locationId) return '';
    
    const [results] = await pool.query(`
        SELECT 
            t.thana_name,
            d.district_name,
            div.division_name
        FROM location l
        LEFT JOIN thana t ON l.thana_id = t.thana_id
        LEFT JOIN district d ON l.district_id = d.district_id
        LEFT JOIN division div ON l.division_id = div.division_id
        WHERE l.location_id = ?
    `, [locationId]);
    
    if (results.length === 0) return '';
    
    const { thana_name, district_name, division_name } = results[0];
    
    const parts = [];
    if (thana_name) parts.push(thana_name);
    if (district_name) parts.push(district_name);
    if (division_name) parts.push(division_name);
    
    return parts.join(', ');
}

// Export all functions
module.exports = {
    getOrCreateLocation,
    findAdminByLocation,
    getCategoryIdNormalized,
    getLocationString
};
```

---

## Password Utilities

### File: `backend/src/utils/passwordUtils.js`

```javascript
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a password using bcrypt
 * 
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 * 
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {boolean} Match result
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Check password strength
 * Returns score (0-5) and feedback
 * 
 * @param {string} password - Password to check
 * @returns {Object} {score, feedback, isStrong}
 */
function checkPasswordStrength(password) {
    const feedback = [];
    let score = 0;
    
    // ============ LENGTH CHECK ============
    if (password.length >= MIN_PASSWORD_LENGTH) {
        score += 1;
    } else {
        feedback.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    
    if (password.length >= 12) {
        score += 1;
    }
    
    // ============ COMPLEXITY CHECKS ============
    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add lowercase letters');
    }
    
    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add uppercase letters');
    }
    
    if (/[0-9]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add numbers');
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Add special characters');
    }
    
    // ============ PATTERN CHECKS ============
    // Check for common patterns
    const commonPatterns = [
        /^123/, /abc/i, /qwerty/i, /password/i, /admin/i
    ];
    
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            score -= 1;
            feedback.push('Avoid common patterns');
            break;
        }
    }
    
    // Normalize score
    score = Math.max(0, Math.min(5, score));
    
    return {
        score,
        feedback,
        isStrong: score >= 4,
        label: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score]
    };
}

/**
 * Generate random password
 * 
 * @param {number} length - Password length (default 16)
 * @returns {string} Random password
 */
function generateRandomPassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate password reset token
 * 
 * @returns {Object} {token, hash, expiresAt}
 */
async function generateResetToken() {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Set expiry (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    return { token, hash, expiresAt };
}

/**
 * Verify reset token
 * 
 * @param {string} token - Token from email
 * @param {string} storedHash - Hash from database
 * @returns {boolean} Valid or not
 */
function verifyResetToken(token, storedHash) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return hash === storedHash;
}

module.exports = {
    hashPassword,
    verifyPassword,
    checkPasswordStrength,
    generateRandomPassword,
    generateResetToken,
    verifyResetToken,
    MIN_PASSWORD_LENGTH
};
```

---

## Email Utilities

### File: `backend/src/utils/emailUtils.js`

```javascript
const nodemailer = require('nodemailer');

// ============ TRANSPORTER CONFIGURATION ============
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('Email transporter error:', error);
    } else {
        console.log('Email transporter ready');
    }
});

/**
 * Send email
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text fallback
 * @returns {Object} Send result
 */
async function sendEmail({ to, subject, html, text }) {
    try {
        const mailOptions = {
            from: `"SecureVoice" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}: ${result.messageId}`);
        
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Send email error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send OTP email
 */
async function sendOTPEmail(email, otp, name) {
    return sendEmail({
        to: email,
        subject: 'SecureVoice - Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Email Verification</h2>
                <p>Hello ${name || 'User'},</p>
                <p>Your verification code is:</p>
                <div style="background: #f0f4f8; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #2d3748; letter-spacing: 8px; margin: 0;">${otp}</h1>
                </div>
                <p>This code expires in <strong>10 minutes</strong>.</p>
                <p style="color: #718096; font-size: 14px;">
                    If you didn't request this code, please ignore this email.
                </p>
                <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #a0aec0; font-size: 12px;">
                    SecureVoice - Crime Reporting System
                </p>
            </div>
        `
    });
}

/**
 * Send complaint status update email
 */
async function sendStatusUpdateEmail(email, name, complaintId, status, message) {
    const statusColors = {
        'pending': '#F59E0B',
        'verifying': '#3B82F6',
        'investigating': '#8B5CF6',
        'resolved': '#10B981',
        'dismissed': '#EF4444'
    };
    
    const statusLabels = {
        'pending': 'Pending',
        'verifying': 'Under Verification',
        'investigating': 'Under Investigation',
        'resolved': 'Resolved',
        'dismissed': 'Dismissed'
    };
    
    return sendEmail({
        to: email,
        subject: `SecureVoice - Complaint Status Update (#${complaintId})`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Complaint Status Update</h2>
                <p>Hello ${name},</p>
                <p>Your complaint has been updated:</p>
                
                <div style="background: #f0f4f8; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <p><strong>Complaint ID:</strong> #${complaintId}</p>
                    <p><strong>New Status:</strong> 
                        <span style="background: ${statusColors[status] || '#6B7280'}; 
                                     color: white; 
                                     padding: 4px 12px; 
                                     border-radius: 4px;">
                            ${statusLabels[status] || status}
                        </span>
                    </p>
                    ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
                </div>
                
                <p>You can view full details in your dashboard.</p>
                
                <a href="${process.env.BASE_URL}/user/dashboard" 
                   style="display: inline-block; 
                          background: #2563EB; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 6px;
                          margin: 20px 0;">
                    View Dashboard
                </a>
                
                <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #a0aec0; font-size: 12px;">
                    SecureVoice - Crime Reporting System
                </p>
            </div>
        `
    });
}

/**
 * Send admin approval email
 */
async function sendAdminApprovalEmail(email, name, username) {
    return sendEmail({
        to: email,
        subject: 'SecureVoice - Admin Registration Approved',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Registration Approved!</h2>
                <p>Dear ${name},</p>
                <p>Your admin registration has been approved. You can now log in to the admin dashboard.</p>
                
                <div style="background: #f0f4f8; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <p><strong>Username:</strong> ${username}</p>
                </div>
                
                <a href="${process.env.BASE_URL}/admin/login" 
                   style="display: inline-block; 
                          background: #10B981; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 6px;">
                    Login to Dashboard
                </a>
                
                <p style="margin-top: 20px; color: #718096;">
                    Thank you for joining the SecureVoice team.
                </p>
            </div>
        `
    });
}

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendStatusUpdateEmail,
    sendAdminApprovalEmail,
    transporter
};
```

---

## Notification Utilities

### File: `backend/src/utils/notificationUtils.js`

```javascript
const pool = require('../db');

/**
 * Create in-app notification
 * 
 * @param {Object} options - Notification options
 * @param {string} options.userId - User ID or username
 * @param {string} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.link - Optional link
 * @param {Object} options.metadata - Optional metadata
 */
async function createNotification({
    userId,
    type,
    title,
    message,
    link = null,
    metadata = null
}) {
    try {
        await pool.query(
            `INSERT INTO notifications (
                user_id, type, title, message, link, metadata, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
            [userId, type, title, message, link, JSON.stringify(metadata)]
        );
        
        return { success: true };
    } catch (error) {
        console.error('Create notification error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread notifications for user
 */
async function getUnreadNotifications(userId) {
    try {
        const [notifications] = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? AND is_read = FALSE 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [userId]
        );
        
        return notifications;
    } catch (error) {
        console.error('Get notifications error:', error);
        return [];
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId) {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

/**
 * Send status update notification
 */
async function notifyStatusUpdate(userId, complaintId, status) {
    const statusMessages = {
        'verifying': 'Your complaint is now being verified by an admin.',
        'investigating': 'Investigation has started on your complaint.',
        'resolved': 'Your complaint has been resolved.',
        'dismissed': 'Your complaint has been dismissed.'
    };
    
    return createNotification({
        userId,
        type: 'status_update',
        title: 'Complaint Status Updated',
        message: statusMessages[status] || `Status changed to ${status}`,
        link: `/user/complaints/${complaintId}`,
        metadata: { complaintId, status }
    });
}

/**
 * Send new message notification
 */
async function notifyNewMessage(userId, complaintId, senderName) {
    return createNotification({
        userId,
        type: 'new_message',
        title: 'New Message',
        message: `${senderName} sent a message regarding complaint #${complaintId}`,
        link: `/user/complaints/${complaintId}#chat`,
        metadata: { complaintId }
    });
}

module.exports = {
    createNotification,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    notifyStatusUpdate,
    notifyNewMessage
};
```

---

## Audit Utilities

### File: `backend/src/utils/auditUtils.js`

```javascript
const pool = require('../db');

/**
 * Log admin action for audit trail
 * 
 * @param {string} adminUsername - Admin performing action
 * @param {string} actionType - Type of action
 * @param {string} details - Action details
 * @param {Object} metadata - Additional metadata
 */
async function logAdminAction(adminUsername, actionType, details, metadata = null) {
    try {
        await pool.query(
            `INSERT INTO admin_audit_log (
                admin_username, action_type, details, metadata, created_at
            ) VALUES (?, ?, ?, ?, NOW())`,
            [adminUsername, actionType, details, JSON.stringify(metadata)]
        );
        
        console.log(`Audit: ${adminUsername} - ${actionType}`);
    } catch (error) {
        console.error('Audit log error:', error);
        // Don't throw - audit logging should not break main flow
    }
}

/**
 * Get audit logs for an admin
 */
async function getAdminAuditLogs(adminUsername, options = {}) {
    try {
        const { limit = 50, offset = 0, actionType = null } = options;
        
        let query = `
            SELECT * FROM admin_audit_log 
            WHERE admin_username = ?
        `;
        const params = [adminUsername];
        
        if (actionType) {
            query += ' AND action_type = ?';
            params.push(actionType);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [logs] = await pool.query(query, params);
        return logs;
        
    } catch (error) {
        console.error('Get audit logs error:', error);
        return [];
    }
}

/**
 * Get all audit logs (super admin)
 */
async function getAllAuditLogs(options = {}) {
    try {
        const { limit = 100, offset = 0, actionType = null, adminUsername = null } = options;
        
        let query = 'SELECT * FROM admin_audit_log WHERE 1=1';
        const params = [];
        
        if (actionType) {
            query += ' AND action_type = ?';
            params.push(actionType);
        }
        
        if (adminUsername) {
            query += ' AND admin_username = ?';
            params.push(adminUsername);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [logs] = await pool.query(query, params);
        return logs;
        
    } catch (error) {
        console.error('Get all audit logs error:', error);
        return [];
    }
}

/**
 * Common action types
 */
const ACTION_TYPES = {
    // Authentication
    ADMIN_LOGIN: 'ADMIN_LOGIN',
    ADMIN_LOGOUT: 'ADMIN_LOGOUT',
    SUPER_ADMIN_LOGIN: 'SUPER_ADMIN_LOGIN',
    
    // Case management
    STATUS_UPDATED: 'STATUS_UPDATED',
    CASE_ASSIGNED: 'CASE_ASSIGNED',
    CASE_REASSIGNED: 'CASE_REASSIGNED',
    MESSAGE_SENT: 'MESSAGE_SENT',
    
    // Admin management
    ADMIN_APPROVED: 'ADMIN_APPROVED',
    ADMIN_REJECTED: 'ADMIN_REJECTED',
    ADMIN_SUSPENDED: 'ADMIN_SUSPENDED',
    ADMIN_REACTIVATED: 'ADMIN_REACTIVATED',
    
    // Evidence
    EVIDENCE_VIEWED: 'EVIDENCE_VIEWED',
    EVIDENCE_DOWNLOADED: 'EVIDENCE_DOWNLOADED',
    
    // Anonymous reports
    ANON_REPORT_VIEWED: 'ANON_REPORT_VIEWED',
    ANON_REPORT_FLAGGED: 'ANON_REPORT_FLAGGED'
};

module.exports = {
    logAdminAction,
    getAdminAuditLogs,
    getAllAuditLogs,
    ACTION_TYPES
};
```

---

## Authentication Middleware

### File: `backend/src/middleware/authMiddleware.js`

```javascript
/**
 * Authentication Middleware
 * Handles session validation and role-based access
 */

/**
 * Require authenticated user
 * Redirects to login if not authenticated
 */
exports.requireUser = (req, res, next) => {
    if (!req.session || !req.session.user) {
        // Check if API request
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                redirect: '/login'
            });
        }
        
        // Store intended destination
        req.session.returnTo = req.originalUrl;
        
        return res.redirect('/login');
    }
    
    // Attach user to request for convenience
    req.user = req.session.user;
    next();
};

/**
 * Require authenticated admin
 * Blocks regular users
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required',
                redirect: '/admin/login'
            });
        }
        
        return res.redirect('/admin/login');
    }
    
    // Check if admin is active
    if (req.session.admin.status && req.session.admin.status !== 'active') {
        req.session.destroy();
        return res.status(403).json({
            success: false,
            message: 'Account is not active'
        });
    }
    
    req.admin = req.session.admin;
    next();
};

/**
 * Require super admin
 * Blocks regular admins
 */
exports.requireSuperAdmin = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            redirect: '/super-admin/login'
        });
    }
    
    if (req.session.admin.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super admin access required'
        });
    }
    
    req.admin = req.session.admin;
    next();
};

/**
 * Optional user authentication
 * Attaches user if logged in, continues if not
 */
exports.optionalUser = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};

/**
 * Cache control for authenticated pages
 * Prevents back button from showing protected pages after logout
 */
exports.noCacheOnAuth = (req, res, next) => {
    if (req.session && (req.session.user || req.session.admin)) {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
    }
    next();
};

/**
 * Check session expiry
 * Destroys expired sessions
 */
exports.checkSessionExpiry = (req, res, next) => {
    if (req.session) {
        const maxAge = req.session.cookie.maxAge;
        const createdAt = req.session.createdAt || Date.now();
        
        if (Date.now() - createdAt > maxAge) {
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
            });
            
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.',
                redirect: '/login'
            });
        }
    }
    next();
};
```

---

## Security Middleware

### File: `backend/src/middleware/securityMiddleware.js`

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

/**
 * Configure Helmet security headers
 */
exports.helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",  // Required for some inline scripts
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://*.tile.openstreetmap.org",  // Map tiles
                "https://unpkg.com"
            ],
            connectSrc: [
                "'self'",
                "https://*.openstreetmap.org"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,  // Required for external resources
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * CORS configuration
 */
exports.corsConfig = cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

/**
 * General rate limiter
 * 100 requests per 15 minutes per IP
 */
exports.generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Auth rate limiter (stricter)
 * 5 attempts per 15 minutes per IP
 */
exports.authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.'
    },
    skipSuccessfulRequests: true
});

/**
 * API rate limiter
 * 60 requests per minute per IP
 */
exports.apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: 'API rate limit exceeded. Please slow down.'
    }
});

/**
 * Sanitize input - prevent XSS
 */
exports.sanitizeInput = (req, res, next) => {
    // Recursive sanitization function
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove script tags and event handlers
            return obj
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/javascript:/gi, '');
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        
        return obj;
    };
    
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    
    next();
};

/**
 * Log suspicious activity
 */
exports.logSuspiciousActivity = (req, res, next) => {
    // Check for common attack patterns
    const suspiciousPatterns = [
        /union\s+select/i,
        /or\s+1\s*=\s*1/i,
        /<script/i,
        /\.\.\/\.\.\//,
        /etc\/passwd/
    ];
    
    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestData)) {
            console.warn(`Suspicious activity detected:`, {
                ip: req.ip,
                path: req.path,
                method: req.method,
                pattern: pattern.toString(),
                timestamp: new Date().toISOString()
            });
            break;
        }
    }
    
    next();
};
```

---

## File Upload Middleware

### File: `backend/src/middleware/uploadMiddleware.js`

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ============ STORAGE CONFIGURATION ============
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine upload directory based on file type
        let uploadDir = 'uploads/documents';
        
        if (file.mimetype.startsWith('image/')) {
            uploadDir = 'uploads/images';
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir = 'uploads/videos';
        } else if (file.mimetype.startsWith('audio/')) {
            uploadDir = 'uploads/audio';
        }
        
        // Create directory if doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        const filename = `${uniqueId}${ext}`;
        
        cb(null, filename);
    }
});

// ============ FILE FILTER ============
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        
        // Videos
        'video/mp4',
        'video/webm',
        'video/mpeg',
        'video/quicktime',
        
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
};

// ============ MULTER INSTANCES ============

/**
 * Evidence upload - multiple files
 * Max 10 files, 50MB each
 */
exports.evidenceUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,  // 50MB
        files: 10
    }
}).array('evidence', 10);

/**
 * Single image upload
 * For profile pictures, ID documents
 */
exports.singleImageUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024  // 5MB
    }
}).single('image');

/**
 * Admin verification document upload
 */
exports.verificationDocUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPEG, and PNG are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024  // 10MB
    }
}).single('verificationDocument');

/**
 * Error handler for multer
 */
exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    next();
};

/**
 * Generate file ID
 */
exports.generateFileId = (extension) => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}${extension}`;
};
```

---

## Application Configuration

### File: `backend/src/app.js`

```javascript
const express = require('express');
const session = require('express-session');
const path = require('path');
const MySQLStore = require('express-mysql-session')(session);

// Import middleware
const {
    helmetConfig,
    corsConfig,
    generalRateLimiter,
    sanitizeInput,
    logSuspiciousActivity
} = require('./middleware/securityMiddleware');

const { noCacheOnAuth } = require('./middleware/authMiddleware');

// Import routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const superAdminRoutes = require('./routes/superAdmin');
const complaintsRoutes = require('./routes/complaints');
const anonymousRoutes = require('./routes/anonymous');
const pagesRoutes = require('./routes/pages');

const app = express();

// ============ TRUST PROXY (for rate limiting behind reverse proxy) ============
app.set('trust proxy', 1);

// ============ SECURITY MIDDLEWARE ============
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalRateLimiter);
app.use(sanitizeInput);
app.use(logSuspiciousActivity);

// ============ BODY PARSING ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ SESSION CONFIGURATION ============
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000,  // 15 minutes
    expiration: 86400000  // 24 hours
});

app.use(session({
    key: 'securevoice_session',
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,  // 24 hours
        sameSite: 'strict'
    }
}));

// ============ CACHE CONTROL ============
app.use(noCacheOnAuth);

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============ VIEW ENGINE (for error pages) ============
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ============ ROUTES ============
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/complaints', complaintsRoutes);
app.use('/anonymous', anonymousRoutes);
app.use('/', pagesRoutes);  // HTML pages

// ============ 404 HANDLER ============
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found'
    });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    
    res.status(err.status || 500).json({
        success: false,
        message
    });
});

module.exports = app;
```

### Server Entry Point

### File: `backend/src/server.js`

```javascript
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     SecureVoice Crime Reporting System     ║
╠════════════════════════════════════════════╣
║  Server running on port ${PORT}              ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  Database: ${process.env.DB_NAME || 'securevoice'}                  ║
╚════════════════════════════════════════════╝
    `);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});
```

---

## Database Connection

### File: `backend/src/db.js`

```javascript
const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'securevoice',
    
    // Pool configuration
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    
    // Enable support for JSON
    typeCast: function (field, next) {
        if (field.type === 'JSON') {
            return JSON.parse(field.string());
        }
        return next();
    }
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

module.exports = pool;
```

---

## Environment Variables

### File: `.env.example`

```bash
# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=securevoice

# Session
SESSION_SECRET=your-super-secret-key-change-in-production

# Email (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Security
ALLOWED_ORIGINS=http://localhost:3000
IP_HASH_SALT=your-random-salt-for-ip-hashing
CONTENT_HASH_SALT=your-random-salt-for-content-hashing

# Rate Limiting
MAX_ANONYMOUS_SUBMISSIONS=3
```

---

## Summary

This document covered all the utility functions, middleware, and configuration that power the SecureVoice system:

### Utilities
- **Helper Utils**: 3NF database operations, location management, admin assignment
- **Password Utils**: Bcrypt hashing, strength checking, reset tokens
- **Email Utils**: Nodemailer configuration, templated emails
- **Notification Utils**: In-app notifications, status updates
- **Audit Utils**: Action logging, audit trail

### Middleware
- **Auth Middleware**: Session validation, role-based access, cache control
- **Security Middleware**: Helmet headers, CORS, rate limiting, input sanitization
- **Upload Middleware**: Multer configuration, file validation

### Configuration
- **app.js**: Express application setup
- **server.js**: Server entry point
- **db.js**: MySQL connection pool

---

*Back to: [01_PROJECT_OVERVIEW.md](01_PROJECT_OVERVIEW.md) - Project Overview*
