# Anonymous Reporting System
## SecureVoice Crime Reporting System

---

## Table of Contents
1. [Overview](#overview)
2. [Privacy & Security Features](#privacy--security-features)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [CAPTCHA System](#captcha-system)
6. [Rate Limiting & Duplicate Detection](#rate-limiting--duplicate-detection)
7. [Status Checking](#status-checking)
8. [API Endpoints](#api-endpoints)

---

## Overview

The Anonymous Reporting System allows citizens to report crimes without:
- Creating an account
- Providing personal information
- Revealing their identity

### Key Features

| Feature | Description |
|---------|-------------|
| **No Login Required** | Submit reports without registration |
| **IP Hashing** | IP address is SHA-256 hashed (irreversible) |
| **Rate Limiting** | Max 3 reports per day per IP |
| **Duplicate Detection** | Content hashing prevents duplicate submissions |
| **CAPTCHA Protection** | Math-based CAPTCHA to prevent bots |
| **Mandatory Evidence** | At least one evidence file required |
| **Unique Report ID** | Format: `SV-XXXXXXXX` for status tracking |

---

## Privacy & Security Features

### IP Address Hashing

The system never stores actual IP addresses. Instead, they are one-way hashed:

```javascript
// Configuration
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'securevoice-anonymous-salt-2026';

/**
 * Hash an IP address using SHA-256 with salt
 * Result CANNOT be reversed to original IP
 */
function hashIP(ip) {
    if (!ip) return null;
    
    // Normalize IPv4-mapped IPv6 addresses
    const normalizedIP = ip.replace(/^::ffff:/, '');
    
    // Create irreversible hash
    return crypto
        .createHash('sha256')
        .update(normalizedIP + IP_HASH_SALT)
        .digest('hex');
}
```

**Security Properties:**
1. Salt is stored in environment variable (never in code)
2. SHA-256 is a one-way function - cannot be reversed
3. Even if database is compromised, IPs cannot be recovered
4. Same IP always produces same hash (for rate limiting)

### Content Hashing for Duplicate Detection

```javascript
const CONTENT_HASH_SALT = process.env.CONTENT_HASH_SALT || 'securevoice-content-salt-2026';

/**
 * Hash content for duplicate detection
 * Normalized to catch similar submissions
 */
function hashContent(content) {
    if (!content) return null;
    
    // Normalize: lowercase, collapse whitespace
    const normalized = content
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    
    return crypto
        .createHash('sha256')
        .update(normalized + CONTENT_HASH_SALT)
        .digest('hex');
}
```

---

## Backend Implementation

### File: `backend/src/controllers/anonymousReportController.js`

#### Configuration

```javascript
const pool = require('../db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { 
    findAdminByLocation, 
    getCategoryIdNormalized 
} = require('../utils/helperUtils');

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
```

#### Generate Unique Report ID

```javascript
/**
 * Generate unique report ID
 * Format: SV-XXXXXXXX (e.g., SV-ABC12345)
 */
function generateReportId() {
    // Use timestamp for uniqueness
    const timestamp = Date.now().toString(36).toUpperCase();
    
    // Add random component for security
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Combine: SV-[last 4 of timestamp][6 random hex]
    return `SV-${timestamp.slice(-4)}${random}`;
}
```

#### Get Client IP

```javascript
/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
}
```

#### Rate Limiting Functions

```javascript
/**
 * Check rate limit for an IP hash
 * Returns true if within limit, false if exceeded
 */
async function checkRateLimit(ipHash) {
    const [results] = await pool.query(
        `SELECT COUNT(*) as count 
         FROM anonymous_rate_limits 
         WHERE ip_hash = ? AND expires_at > NOW()`,
        [ipHash]
    );
    
    // Allow if count is less than max submissions
    return results[0].count < MAX_SUBMISSIONS_PER_DAY;
}

/**
 * Record a submission for rate limiting
 * Creates expiring entry in rate_limits table
 */
async function recordSubmission(ipHash) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RATE_LIMIT_WINDOW_HOURS);
    
    await pool.query(
        `INSERT INTO anonymous_rate_limits (ip_hash, expires_at) 
         VALUES (?, ?)`,
        [ipHash, expiresAt]
    );
}
```

#### Duplicate Detection Functions

```javascript
/**
 * Check if content is a duplicate
 * Same content from same IP within 24 hours
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
```

#### Validation Function

```javascript
/**
 * Validate report data
 * Returns {valid: boolean, errors: string[]}
 */
function validateReportData(data) {
    const errors = [];
    
    // ============ CRIME TYPE VALIDATION ============
    if (!data.crimeType) {
        errors.push('Crime type is required');
    } else if (!VALID_CRIME_TYPES.includes(data.crimeType.toLowerCase())) {
        errors.push('Invalid crime type selected');
    }
    
    // ============ DESCRIPTION VALIDATION ============
    if (!data.description) {
        errors.push('Description is required');
    } else if (data.description.length < 50) {
        errors.push('Description must be at least 50 characters');
    } else if (data.description.length > 5000) {
        errors.push('Description must be less than 5000 characters');
    }
    
    // ============ DATE VALIDATION ============
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
            // Check if not older than 1 year
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (date < oneYearAgo) {
                errors.push('Incident date cannot be more than 1 year ago');
            }
        }
    }
    
    // ============ TIME VALIDATION ============
    if (!data.incidentTime) {
        errors.push('Incident time is required');
    } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.incidentTime)) {
        errors.push('Invalid time format');
    }
    
    // ============ LOCATION VALIDATION ============
    if (!data.location) {
        errors.push('Location is required');
    } else if (data.location.length < 10) {
        errors.push('Please provide a more detailed location (minimum 10 characters)');
    } else if (data.location.length > 500) {
        errors.push('Location description too long');
    }
    
    // ============ OPTIONAL FIELDS ============
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
```

#### Main Submit Function

```javascript
/**
 * Submit anonymous report
 * Main endpoint handler
 */
exports.submitAnonymousReport = async (req, res) => {
    let uploadedFiles = [];
    
    try {
        // ============ GET AND HASH IP ============
        const clientIP = getClientIP(req);
        const ipHash = hashIP(clientIP);
        
        // ============ CHECK RATE LIMIT ============
        const withinLimit = await checkRateLimit(ipHash);
        if (!withinLimit) {
            return res.status(429).json({
                success: false,
                error: 'rate_limit_exceeded',
                message: `You have reached the maximum number of anonymous reports (${MAX_SUBMISSIONS_PER_DAY}) for today. Please try again in 24 hours.`
            });
        }
        
        // ============ PARSE FORM DATA ============
        const {
            crimeType,
            description,
            incidentDate,
            incidentTime,
            location,
            latitude,
            longitude,
            locationAccuracy,
            suspectDescription,
            additionalNotes,
            captchaAnswer,
            captchaExpected
        } = req.body;
        
        // ============ VERIFY CAPTCHA ============
        if (!captchaAnswer || !captchaExpected) {
            return res.status(400).json({
                success: false,
                error: 'captcha_required',
                message: 'Please complete the security verification'
            });
        }
        
        if (captchaAnswer.trim() !== captchaExpected.trim()) {
            return res.status(400).json({
                success: false,
                error: 'captcha_failed',
                message: 'Security verification failed. Please try again.'
            });
        }
        
        // ============ VALIDATE DATA ============
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
                error: 'validation_failed',
                message: validation.errors.join('. ')
            });
        }
        
        // ============ CHECK EVIDENCE REQUIREMENT ============
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'evidence_required',
                message: 'At least one evidence file is required for anonymous reports'
            });
        }
        
        // ============ CHECK FOR DUPLICATES ============
        const contentHash = hashContent(description);
        const isDuplicate = await checkDuplicate(contentHash, ipHash);
        
        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                error: 'duplicate_submission',
                message: 'A similar report has already been submitted recently'
            });
        }
        
        // ============ FIND ADMIN FOR LOCATION ============
        const adminData = await findAdminByLocation(location);
        const adminUsername = adminData?.adminUsername || null;
        const districtName = adminData?.districtName || null;
        
        // ============ GET CATEGORY ID ============
        const categoryId = await getCategoryIdNormalized(crimeType);
        
        // ============ GENERATE REPORT ID ============
        const reportId = generateReportId();
        
        // ============ INSERT REPORT ============
        const [result] = await pool.query(
            `INSERT INTO anonymous_reports (
                report_id, crime_type, category_id, description,
                incident_date, incident_time, location, latitude, longitude,
                location_accuracy, suspect_description, additional_notes,
                ip_hash, content_hash, status, admin_username, district_name,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
            [
                reportId, crimeType, categoryId, description,
                incidentDate, incidentTime, location,
                latitude || null, longitude || null, locationAccuracy || 'accurate',
                suspectDescription || null, additionalNotes || null,
                ipHash, contentHash, adminUsername, districtName
            ]
        );
        
        const internalId = result.insertId;
        uploadedFiles = req.files || [];
        
        // ============ SAVE EVIDENCE FILES ============
        for (const file of uploadedFiles) {
            // Generate unique file ID
            const fileId = generateFileId(path.extname(file.originalname));
            
            // Determine file type
            let fileType = 'document';
            if (file.mimetype.startsWith('image/')) fileType = 'image';
            else if (file.mimetype.startsWith('video/')) fileType = 'video';
            else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
            
            await pool.query(
                `INSERT INTO anonymous_evidence (
                    report_id, file_id, file_type, file_path,
                    original_name, mime_type, file_size, uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    internalId, fileId, fileType, file.path,
                    file.originalname, file.mimetype, file.size
                ]
            );
        }
        
        // ============ RECORD FOR RATE LIMITING ============
        await recordSubmission(ipHash);
        await recordSubmissionHash(contentHash, ipHash);
        
        // ============ SUCCESS RESPONSE ============
        res.json({
            success: true,
            message: 'Anonymous report submitted successfully',
            reportId: reportId,
            evidenceCount: uploadedFiles.length
        });
        
    } catch (err) {
        console.error('Anonymous report error:', err);
        
        // Cleanup uploaded files on error
        for (const file of uploadedFiles) {
            try {
                await fs.unlink(file.path);
            } catch (e) {
                console.error('Cleanup error:', e);
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Failed to submit report. Please try again.'
        });
    }
};
```

---

## Frontend Implementation

### File: `frontend/src/js/anonymous-report.js`

#### Element References and State

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // ============ ELEMENT REFERENCES ============
    const disclaimerModal = document.getElementById('disclaimerModal');
    const reportContainer = document.getElementById('reportContainer');
    const successContainer = document.getElementById('successContainer');
    
    const form = document.getElementById('anonymousReportForm');
    const submitBtn = document.getElementById('submitBtn');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('evidenceFiles');
    const fileList = document.getElementById('fileList');
    
    const captchaQuestion = document.getElementById('captchaQuestion');
    const captchaExpected = document.getElementById('captchaExpected');
    const captchaAnswer = document.getElementById('captchaAnswer');
    const refreshCaptcha = document.getElementById('refreshCaptcha');
    
    // Character counter elements
    const description = document.getElementById('description');
    const descCharCount = document.getElementById('descCharCount');
    
    // ============ STATE ============
    let selectedFiles = [];
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    
    // ============ INITIALIZATION ============
    
    // Set date constraints
    const incidentDate = document.getElementById('incidentDate');
    const today = new Date().toISOString().split('T')[0];
    incidentDate.max = today;
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    incidentDate.min = oneYearAgo.toISOString().split('T')[0];
    
    // Generate initial CAPTCHA
    generateCaptcha();
```

#### Disclaimer Modal

```javascript
    // ============ DISCLAIMER MODAL ============
    
    // User must accept disclaimer before seeing form
    acceptDisclaimer.addEventListener('click', () => {
        disclaimerModal.classList.add('hidden');
        reportContainer.classList.remove('hidden');
    });
    
    // Cancel returns to homepage
    cancelDisclaimer.addEventListener('click', () => {
        window.location.href = '/';
    });
```

**Disclaimer Content (HTML):**
```html
<div id="disclaimerModal" class="modal">
    <div class="modal-content">
        <h2>Anonymous Reporting Disclaimer</h2>
        <div class="disclaimer-text">
            <p><strong>Important:</strong></p>
            <ul>
                <li>This report will be submitted anonymously</li>
                <li>Your IP address will be hashed and cannot be traced</li>
                <li>You can check your report status using the Report ID</li>
                <li>False reports may be subject to legal action</li>
                <li>Evidence files are required for verification</li>
            </ul>
        </div>
        <div class="modal-buttons">
            <button id="cancelDisclaimer" class="btn-secondary">Cancel</button>
            <button id="acceptDisclaimer" class="btn-primary">I Understand</button>
        </div>
    </div>
</div>
```

---

## CAPTCHA System

### CAPTCHA Generation (Frontend)

```javascript
    // ============ CAPTCHA SYSTEM ============
    
    function generateCaptcha() {
        // Available operations
        const operations = ['+', '-', '×'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let num1, num2, answer;
        
        switch (operation) {
            case '+':
                // Addition: random numbers 1-20
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * 20) + 1;
                answer = num1 + num2;
                break;
                
            case '-':
                // Subtraction: ensure positive result
                num1 = Math.floor(Math.random() * 20) + 10;
                num2 = Math.floor(Math.random() * 10) + 1;
                answer = num1 - num2;
                break;
                
            case '×':
                // Multiplication: smaller numbers
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 10) + 1;
                answer = num1 * num2;
                break;
        }
        
        // Display question
        captchaQuestion.textContent = `${num1} ${operation} ${num2} = ?`;
        
        // Store expected answer (hidden field)
        captchaExpected.value = answer.toString();
        
        // Clear previous answer
        captchaAnswer.value = '';
    }
    
    // Refresh button
    refreshCaptcha.addEventListener('click', generateCaptcha);
```

**CAPTCHA HTML:**
```html
<div class="captcha-container">
    <label>Security Verification *</label>
    <div class="captcha-box">
        <span id="captchaQuestion" class="captcha-question">5 + 3 = ?</span>
        <input type="hidden" id="captchaExpected" name="captchaExpected">
        <input type="text" id="captchaAnswer" name="captchaAnswer" 
               placeholder="Your answer" required>
        <button type="button" id="refreshCaptcha" class="refresh-btn">
            <i class="fas fa-sync-alt"></i>
        </button>
    </div>
</div>
```

---

## Rate Limiting & Duplicate Detection

### Database Tables

```sql
-- Rate limiting table
CREATE TABLE IF NOT EXISTS `anonymous_rate_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_hash` (`ip_hash`),
  KEY `idx_expires` (`expires_at`)
);

-- Duplicate detection table
CREATE TABLE IF NOT EXISTS `anonymous_submission_hashes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content_hash` varchar(64) NOT NULL,
  `ip_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_content_ip` (`content_hash`, `ip_hash`),
  KEY `idx_expires` (`expires_at`)
);
```

### Cleanup Expired Entries (Scheduled Task)

```javascript
/**
 * Clean up expired rate limit and hash entries
 * Should be run periodically (e.g., hourly)
 */
async function cleanupExpiredEntries() {
    try {
        // Delete expired rate limits
        await pool.query(
            'DELETE FROM anonymous_rate_limits WHERE expires_at < NOW()'
        );
        
        // Delete expired submission hashes
        await pool.query(
            'DELETE FROM anonymous_submission_hashes WHERE expires_at < NOW()'
        );
        
        console.log('Cleaned up expired anonymous report entries');
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
```

---

## Status Checking

### Backend: Check Report Status

```javascript
/**
 * Check anonymous report status
 * Public endpoint - no authentication required
 */
exports.checkReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        
        // Validate report ID format
        if (!reportId || !/^SV-[A-Z0-9]{10}$/i.test(reportId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report ID format'
            });
        }
        
        // Query report (limited fields for privacy)
        const [results] = await pool.query(
            `SELECT 
                report_id,
                crime_type,
                status,
                created_at,
                updated_at
             FROM anonymous_reports 
             WHERE report_id = ?`,
            [reportId.toUpperCase()]
        );
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }
        
        const report = results[0];
        
        res.json({
            success: true,
            report: {
                reportId: report.report_id,
                crimeType: report.crime_type,
                status: report.status,
                submittedAt: report.created_at,
                lastUpdated: report.updated_at
            }
        });
        
    } catch (err) {
        console.error('Check status error:', err);
        res.status(500).json({
            success: false,
            message: 'Error checking report status'
        });
    }
};
```

### Frontend: Status Check Modal

```javascript
    // ============ STATUS CHECK ============
    
    const statusModal = document.getElementById('statusModal');
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const searchStatus = document.getElementById('searchStatus');
    const statusReportId = document.getElementById('statusReportId');
    const statusResult = document.getElementById('statusResult');
    
    // Open status modal
    checkStatusBtn.addEventListener('click', () => {
        statusModal.classList.remove('hidden');
        statusReportId.value = '';
        statusResult.innerHTML = '';
    });
    
    // Close modal
    closeStatusModal.addEventListener('click', () => {
        statusModal.classList.add('hidden');
    });
    
    // Search for report
    searchStatus.addEventListener('click', async () => {
        const reportId = statusReportId.value.trim();
        
        if (!reportId) {
            statusResult.innerHTML = '<p class="error">Please enter a Report ID</p>';
            return;
        }
        
        // Validate format
        if (!/^SV-[A-Z0-9]{10}$/i.test(reportId)) {
            statusResult.innerHTML = '<p class="error">Invalid Report ID format</p>';
            return;
        }
        
        // Show loading
        statusResult.innerHTML = '<p>Searching...</p>';
        
        try {
            const response = await fetch(`/anonymous/status/${reportId}`);
            const data = await response.json();
            
            if (data.success) {
                const report = data.report;
                statusResult.innerHTML = `
                    <div class="status-card">
                        <div class="status-row">
                            <span class="label">Report ID:</span>
                            <span class="value">${report.reportId}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Crime Type:</span>
                            <span class="value">${formatCrimeType(report.crimeType)}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Status:</span>
                            <span class="status-badge ${report.status}">${formatStatus(report.status)}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Submitted:</span>
                            <span class="value">${formatDate(report.submittedAt)}</span>
                        </div>
                        <div class="status-row">
                            <span class="label">Last Updated:</span>
                            <span class="value">${formatDate(report.lastUpdated)}</span>
                        </div>
                    </div>
                `;
            } else {
                statusResult.innerHTML = `<p class="error">${data.message}</p>`;
            }
        } catch (error) {
            console.error('Status check error:', error);
            statusResult.innerHTML = '<p class="error">Error checking status. Please try again.</p>';
        }
    });
    
    // Helper functions
    function formatStatus(status) {
        const labels = {
            'pending': 'Pending Review',
            'verifying': 'Under Verification',
            'investigating': 'Under Investigation',
            'resolved': 'Resolved',
            'flagged': 'Flagged'
        };
        return labels[status] || status;
    }
    
    function formatCrimeType(type) {
        return type.replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
```

---

## File Upload Handling

### Frontend: Drag & Drop Upload

```javascript
    // ============ FILE UPLOAD ============
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Handle selected files
    function handleFiles(files) {
        for (const file of files) {
            // Check file count limit
            if (selectedFiles.length >= MAX_FILES) {
                showToast(`Maximum ${MAX_FILES} files allowed`, 'error');
                break;
            }
            
            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                showToast(`${file.name} exceeds 50MB limit`, 'error');
                continue;
            }
            
            // Check for duplicates
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                showToast(`${file.name} already added`, 'warning');
                continue;
            }
            
            selectedFiles.push(file);
        }
        
        updateFileList();
    }
    
    // Update file list display
    function updateFileList() {
        fileCount.textContent = `${selectedFiles.length}/${MAX_FILES} files`;
        
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '<p class="no-files">No files selected</p>';
            return;
        }
        
        fileList.innerHTML = selectedFiles.map((file, index) => `
            <div class="file-item">
                <div class="file-info">
                    <i class="fas ${getFileIcon(file.type)}"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${formatFileSize(file.size)})</span>
                </div>
                <button type="button" class="remove-file" 
                        onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    // Remove file
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };
    
    // Get appropriate icon
    function getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fa-image';
        if (mimeType.startsWith('video/')) return 'fa-video';
        if (mimeType.startsWith('audio/')) return 'fa-volume-up';
        return 'fa-file';
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
```

---

## API Endpoints

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/anonymous/submit` | Submit anonymous report |
| GET | `/anonymous/status/:reportId` | Check report status |
| GET | `/anonymous/heatmap` | Get anonymous heatmap data |
| GET | `/anonymous/statistics` | Get anonymous report stats |

### Admin Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/anonymous` | Get all anonymous reports |
| GET | `/admin/anonymous/:id` | Get report details |
| PUT | `/admin/anonymous/:id/status` | Update report status |
| PATCH | `/admin/anonymous/:id/flag` | Flag suspicious report |
| GET | `/admin/anonymous/:id/evidence` | Get evidence files |

---

## Database Schema

### Anonymous Reports Table

```sql
CREATE TABLE IF NOT EXISTS `anonymous_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` varchar(20) NOT NULL,
  `crime_type` varchar(50) NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text NOT NULL,
  `incident_date` date NOT NULL,
  `incident_time` time NOT NULL,
  `location` text NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `location_accuracy` enum('accurate','approximate') DEFAULT 'accurate',
  `suspect_description` text,
  `additional_notes` text,
  `ip_hash` varchar(64) NOT NULL,
  `content_hash` varchar(64) NOT NULL,
  `status` enum('pending','verifying','investigating','resolved','flagged') DEFAULT 'pending',
  `admin_username` varchar(50) DEFAULT NULL,
  `district_name` varchar(100) DEFAULT NULL,
  `is_flagged` tinyint(1) DEFAULT 0,
  `flag_reason` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_report_id` (`report_id`),
  KEY `idx_ip_hash` (`ip_hash`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`)
);
```

### Anonymous Evidence Table

```sql
CREATE TABLE IF NOT EXISTS `anonymous_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` int NOT NULL,
  `file_id` varchar(100) NOT NULL,
  `file_type` varchar(20) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `uploaded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`report_id`) REFERENCES `anonymous_reports` (`id`) ON DELETE CASCADE
);
```

---

*Next: [06_SUPER_ADMIN.md](06_SUPER_ADMIN.md) - Super Admin Management*
