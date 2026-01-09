# Anonymous Crime Reporting System
## Complete Technical Documentation

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Implementation guide for Vanilla JS, HTML, CSS, Node.js, MySQL

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Database Schema](#3-database-schema)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Security Measures](#6-security-measures)
7. [Deployment Guide](#7-deployment-guide)
8. [API Reference](#8-api-reference)

---

## 1. System Overview

### 1.1 Purpose
A secure, anonymous crime reporting platform that enables citizens to report criminal activities without revealing their identity, while implementing safeguards against false reports.

### 1.2 Core Principles
- **Complete Anonymity**: No personal data collection (name, email, phone, IP stored in plain text)
- **Evidence-Based**: Mandatory evidence upload to reduce false reports
- **Rate-Limited**: IP-based submission limits using one-way hashing
- **Abuse-Resistant**: CAPTCHA, duplicate detection, content validation

### 1.3 Key Features
| Feature | Description |
|---------|-------------|
| Anonymous Submission | No login, no tracking cookies |
| Evidence Upload | Images, videos, documents (max 50MB each) |
| Metadata Stripping | EXIF data removed from images |
| Rate Limiting | 2 reports per IP per 24 hours |
| Duplicate Detection | Content hash comparison |
| Admin Dashboard | Report management without identity exposure |

---

## 2. Architecture Diagram

### 2.1 System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER SUBMISSION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
    │  User    │────────▶│ Frontend │────────▶│  Server  │────────▶│ Database │
    │ Browser  │         │  (HTML)  │         │ (Node.js)│         │ (MySQL)  │
    └──────────┘         └──────────┘         └──────────┘         └──────────┘
         │                    │                    │                    │
         │  1. View Form      │                    │                    │
         │◀───────────────────│                    │                    │
         │                    │                    │                    │
         │  2. Accept         │                    │                    │
         │     Disclaimer     │                    │                    │
         │───────────────────▶│                    │                    │
         │                    │                    │                    │
         │  3. Fill Form +    │                    │                    │
         │     Upload Files   │                    │                    │
         │───────────────────▶│                    │                    │
         │                    │                    │                    │
         │  4. Solve CAPTCHA  │                    │                    │
         │───────────────────▶│                    │                    │
         │                    │                    │                    │
         │                    │  5. POST /api/     │                    │
         │                    │     reports        │                    │
         │                    │───────────────────▶│                    │
         │                    │                    │                    │
         │                    │                    │  6. Check Rate     │
         │                    │                    │     Limit (IP Hash)│
         │                    │                    │───────────────────▶│
         │                    │                    │                    │
         │                    │                    │  7. Check Duplicate│
         │                    │                    │     (Content Hash) │
         │                    │                    │───────────────────▶│
         │                    │                    │                    │
         │                    │                    │  8. Strip Metadata │
         │                    │                    │     & Rename Files │
         │                    │                    │────────┐           │
         │                    │                    │        │           │
         │                    │                    │◀───────┘           │
         │                    │                    │                    │
         │                    │                    │  9. Save Report    │
         │                    │                    │───────────────────▶│
         │                    │                    │                    │
         │                    │                    │  10. Save Evidence │
         │                    │                    │      References    │
         │                    │                    │───────────────────▶│
         │                    │                    │                    │
         │                    │  11. Return        │                    │
         │                    │      Report ID     │                    │
         │                    │◀───────────────────│                    │
         │                    │                    │                    │
         │  12. Show Success  │                    │                    │
         │      + Report ID   │                    │                    │
         │◀───────────────────│                    │                    │
         │                    │                    │                    │
```

### 2.2 Directory Structure

```
project/
├── config/
│   └── database.js           # MySQL connection pool
├── controllers/
│   ├── reportController.js   # Report submission logic
│   └── adminController.js    # Admin dashboard logic
├── middleware/
│   ├── rateLimiter.js        # IP-based rate limiting
│   ├── fileProcessor.js      # File upload & metadata stripping
│   └── adminAuth.js          # Admin authentication
├── routes/
│   ├── reportRoutes.js       # Public report endpoints
│   └── adminRoutes.js        # Admin endpoints
├── utils/
│   ├── hashUtils.js          # Hashing functions
│   ├── idGenerator.js        # Report/file ID generation
│   └── validators.js         # Input validation
├── uploads/                   # Temporary upload storage
├── evidence/                  # Processed evidence storage
├── public/
│   ├── index.html            # Landing page
│   ├── report.html           # Report form
│   ├── admin.html            # Admin dashboard
│   ├── css/
│   │   └── styles.css        # All styles
│   └── js/
│       ├── report.js         # Form handling
│       ├── captcha.js        # CAPTCHA logic
│       ├── fileUpload.js     # File upload handling
│       └── admin.js          # Admin functionality
├── server.js                  # Express app entry
├── package.json
└── .env                       # Environment variables
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│    crime_types      │       │   anonymous_reports │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ name                │◀──────│ crime_type_id (FK)  │
│ description         │       │ report_id           │
│ created_at          │       │ description         │
└─────────────────────┘       │ incident_date       │
                              │ incident_time       │
┌─────────────────────┐       │ location            │
│   evidence_files    │       │ suspect_description │
├─────────────────────┤       │ additional_notes    │
│ id (PK)             │       │ status              │
│ report_id (FK)      │───────│ submitted_at        │
│ original_name       │       │ reviewed_at         │
│ stored_name         │       │ admin_notes         │
│ file_type           │       └─────────────────────┘
│ file_size           │
│ uploaded_at         │       ┌─────────────────────┐
└─────────────────────┘       │    rate_limits      │
                              ├─────────────────────┤
┌─────────────────────┐       │ id (PK)             │
│  submission_hashes  │       │ ip_hash             │
├─────────────────────┤       │ submitted_at        │
│ id (PK)             │       │ expires_at          │
│ content_hash        │       └─────────────────────┘
│ ip_hash             │
│ created_at          │       ┌─────────────────────┐
└─────────────────────┘       │    admin_users      │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ username            │
                              │ password_hash       │
                              │ role                │
                              │ created_at          │
                              └─────────────────────┘
```

### 3.2 Complete SQL Schema

```sql
-- =====================================================
-- DATABASE CREATION
-- =====================================================

CREATE DATABASE IF NOT EXISTS crime_reporting_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE crime_reporting_db;

-- =====================================================
-- CRIME TYPES TABLE
-- =====================================================

CREATE TABLE crime_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- Insert default crime types
INSERT INTO crime_types (name, description) VALUES
    ('theft', 'Theft, burglary, or robbery'),
    ('assault', 'Physical assault or battery'),
    ('fraud', 'Financial fraud, scams, or deception'),
    ('vandalism', 'Property damage or destruction'),
    ('harassment', 'Harassment, stalking, or threats'),
    ('drug_related', 'Drug trafficking or substance abuse'),
    ('cybercrime', 'Online fraud, hacking, or digital crimes'),
    ('domestic_violence', 'Domestic or family violence'),
    ('corruption', 'Government or corporate corruption'),
    ('human_trafficking', 'Human trafficking or exploitation'),
    ('environmental', 'Environmental crimes or violations'),
    ('organized_crime', 'Gang activity or organized crime'),
    ('other', 'Other criminal activity');

-- =====================================================
-- ANONYMOUS REPORTS TABLE
-- =====================================================

CREATE TABLE anonymous_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id VARCHAR(20) NOT NULL UNIQUE,
    crime_type_id INT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE NOT NULL,
    incident_time TIME NOT NULL,
    location VARCHAR(500) NOT NULL,
    suspect_description TEXT,
    additional_notes TEXT,
    status ENUM('pending', 'reviewing', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    admin_notes TEXT,
    
    FOREIGN KEY (crime_type_id) REFERENCES crime_types(id),
    FOREIGN KEY (reviewed_by) REFERENCES admin_users(id),
    
    INDEX idx_report_id (report_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at),
    INDEX idx_crime_type (crime_type_id),
    INDEX idx_flagged (is_flagged)
) ENGINE=InnoDB;

-- =====================================================
-- EVIDENCE FILES TABLE
-- =====================================================

CREATE TABLE evidence_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id VARCHAR(20) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(100) NOT NULL UNIQUE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES anonymous_reports(report_id) ON DELETE CASCADE,
    
    INDEX idx_report (report_id),
    INDEX idx_file_type (file_type)
) ENGINE=InnoDB;

-- =====================================================
-- RATE LIMITS TABLE (IP Hash Based)
-- =====================================================

CREATE TABLE rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    INDEX idx_ip_hash (ip_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- =====================================================
-- SUBMISSION HASHES TABLE (Duplicate Detection)
-- =====================================================

CREATE TABLE submission_hashes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    INDEX idx_content_hash (content_hash),
    INDEX idx_ip_hash (ip_hash),
    INDEX idx_expires (expires_at),
    UNIQUE KEY unique_submission (content_hash, ip_hash)
) ENGINE=InnoDB;

-- =====================================================
-- ADMIN USERS TABLE
-- =====================================================

CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'reviewer', 'supervisor') DEFAULT 'reviewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Stored procedure to clean expired rate limits
DELIMITER //
CREATE PROCEDURE cleanup_expired_rate_limits()
BEGIN
    DELETE FROM rate_limits WHERE expires_at < NOW();
    DELETE FROM submission_hashes WHERE expires_at < NOW();
END //
DELIMITER ;

-- Event to run cleanup daily (requires event_scheduler=ON)
CREATE EVENT IF NOT EXISTS daily_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL cleanup_expired_rate_limits();

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View for admin dashboard (no sensitive data)
CREATE VIEW v_reports_dashboard AS
SELECT 
    ar.report_id,
    ct.name AS crime_type,
    ar.description,
    ar.incident_date,
    ar.incident_time,
    ar.location,
    ar.status,
    ar.is_flagged,
    ar.submitted_at,
    ar.reviewed_at,
    (SELECT COUNT(*) FROM evidence_files ef WHERE ef.report_id = ar.report_id) AS evidence_count
FROM anonymous_reports ar
JOIN crime_types ct ON ar.crime_type_id = ct.id
ORDER BY ar.submitted_at DESC;

-- View for report statistics
CREATE VIEW v_report_statistics AS
SELECT 
    ct.name AS crime_type,
    COUNT(*) AS total_reports,
    SUM(CASE WHEN ar.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN ar.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
    SUM(CASE WHEN ar.is_flagged THEN 1 ELSE 0 END) AS flagged_count
FROM anonymous_reports ar
JOIN crime_types ct ON ar.crime_type_id = ct.id
GROUP BY ct.id, ct.name;
```

---

## 4. Backend Implementation

### 4.1 Package.json

```json
{
  "name": "anonymous-crime-reporting",
  "version": "1.0.0",
  "description": "Anonymous crime reporting system",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.1.5",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 4.2 Environment Variables (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=crime_reporting_db

# Security
IP_HASH_SALT=your-random-32-character-string-here
JWT_SECRET=your-jwt-secret-key-minimum-32-chars
CONTENT_HASH_SALT=another-random-salt-for-content

# Rate Limiting
MAX_SUBMISSIONS_PER_DAY=2
RATE_LIMIT_WINDOW_HOURS=24

# File Upload
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_REPORT=10
UPLOAD_DIR=./uploads
EVIDENCE_DIR=./evidence
```

### 4.3 Database Configuration (config/database.js)

```javascript
/**
 * MySQL Database Connection Pool
 * Uses mysql2/promise for async/await support
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    // Pool configuration
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // Timezone and charset
    timezone: '+00:00',
    charset: 'utf8mb4',
    
    // Enable multiple statements for transactions
    multipleStatements: false
});

// Test connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Execute query with automatic connection handling
async function query(sql, params = []) {
    const [results] = await pool.execute(sql, params);
    return results;
}

// Execute transaction
async function transaction(callback) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
```

### 4.4 Hash Utilities (utils/hashUtils.js)

```javascript
/**
 * Hashing Utilities
 * Provides secure one-way hashing for IPs and content
 */

const crypto = require('crypto');
require('dotenv').config();

const IP_SALT = process.env.IP_HASH_SALT;
const CONTENT_SALT = process.env.CONTENT_HASH_SALT;

/**
 * Hash an IP address using SHA-256 with salt
 * Result cannot be reversed to original IP
 * 
 * @param {string} ip - The IP address to hash
 * @returns {string} - 64-character hex hash
 */
function hashIP(ip) {
    if (!ip) return null;
    
    // Normalize IP (handle IPv4-mapped IPv6)
    const normalizedIP = ip.replace(/^::ffff:/, '');
    
    return crypto
        .createHash('sha256')
        .update(IP_SALT + normalizedIP)
        .digest('hex');
}

/**
 * Hash content for duplicate detection
 * Normalizes text before hashing
 * 
 * @param {string} content - The content to hash
 * @returns {string} - 64-character hex hash
 */
function hashContent(content) {
    if (!content) return null;
    
    // Normalize: lowercase, remove extra whitespace, trim
    const normalized = content
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    
    return crypto
        .createHash('sha256')
        .update(CONTENT_SALT + normalized)
        .digest('hex');
}

/**
 * Generate a simple hash for quick comparisons
 * NOT for security purposes
 * 
 * @param {string} text - Text to hash
 * @returns {number} - Numeric hash
 */
function simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Compare two strings in constant time
 * Prevents timing attacks
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if equal
 */
function secureCompare(a, b) {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
    hashIP,
    hashContent,
    simpleHash,
    secureCompare
};
```

### 4.5 ID Generator (utils/idGenerator.js)

```javascript
/**
 * ID Generation Utilities
 * Creates unique, anonymous identifiers
 */

const crypto = require('crypto');

/**
 * Generate a unique report ID
 * Format: SV-XXXXXXXX (where X is alphanumeric)
 * 
 * @returns {string} - Unique report ID
 */
function generateReportId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SV-${timestamp.slice(-4)}${random}`;
}

/**
 * Generate a random file ID for evidence storage
 * Used to anonymize file names
 * 
 * @param {string} extension - File extension (e.g., '.jpg')
 * @returns {string} - Random filename with extension
 */
function generateFileId(extension = '') {
    const random = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${timestamp}-${random}${extension}`;
}

/**
 * Generate a session token for admin authentication
 * 
 * @returns {string} - Random session token
 */
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CAPTCHA challenge
 * Returns a simple math problem
 * 
 * @returns {Object} - { question, answer }
 */
function generateCaptcha() {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1, num2, answer;
    
    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * 20) + 1;
            answer = num1 + num2;
            break;
        case '-':
            num1 = Math.floor(Math.random() * 20) + 10;
            num2 = Math.floor(Math.random() * 10) + 1;
            answer = num1 - num2;
            break;
        case '×':
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            answer = num1 * num2;
            break;
    }
    
    return {
        question: `${num1} ${operation} ${num2} = ?`,
        answer: answer.toString()
    };
}

module.exports = {
    generateReportId,
    generateFileId,
    generateSessionToken,
    generateCaptcha
};
```

### 4.6 Input Validators (utils/validators.js)

```javascript
/**
 * Input Validation Utilities
 * Server-side validation for all inputs
 */

// Valid crime types (must match database)
const VALID_CRIME_TYPES = [
    'theft', 'assault', 'fraud', 'vandalism', 'harassment',
    'drug_related', 'cybercrime', 'domestic_violence', 'corruption',
    'human_trafficking', 'environmental', 'organized_crime', 'other'
];

// Allowed file types
const ALLOWED_FILE_TYPES = {
    // Images
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    // Videos
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    // Documents
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

// Max file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate report data
 * 
 * @param {Object} data - Report form data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateReportData(data) {
    const errors = [];
    
    // Crime type validation
    if (!data.crimeType) {
        errors.push('Crime type is required');
    } else if (!VALID_CRIME_TYPES.includes(data.crimeType)) {
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
        if (isNaN(date.getTime())) {
            errors.push('Invalid incident date');
        } else if (date > today) {
            errors.push('Incident date cannot be in the future');
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
 * Validate uploaded file
 * 
 * @param {Object} file - Multer file object
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateFile(file) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }
    
    // Check file type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
        return { 
            valid: false, 
            error: `File type not allowed: ${file.mimetype}` 
        };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return { 
            valid: false, 
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 50MB)` 
        };
    }
    
    // Basic file name sanitization check
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return { valid: false, error: 'Invalid file name' };
    }
    
    return { valid: true, error: null };
}

/**
 * Sanitize text input
 * Removes potentially dangerous characters
 * 
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
    if (!text) return '';
    
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '')    // Remove remaining angle brackets
        .trim();
}

/**
 * Validate CAPTCHA answer
 * 
 * @param {string} userAnswer - User's answer
 * @param {string} correctAnswer - Correct answer from session
 * @returns {boolean}
 */
function validateCaptcha(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return false;
    return userAnswer.trim() === correctAnswer.trim();
}

module.exports = {
    validateReportData,
    validateFile,
    sanitizeText,
    validateCaptcha,
    VALID_CRIME_TYPES,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};
```

### 4.7 Rate Limiter Middleware (middleware/rateLimiter.js)

```javascript
/**
 * Rate Limiting Middleware
 * Limits submissions based on hashed IP
 */

const { query } = require('../config/database');
const { hashIP } = require('../utils/hashUtils');
require('dotenv').config();

const MAX_SUBMISSIONS = parseInt(process.env.MAX_SUBMISSIONS_PER_DAY) || 2;
const WINDOW_HOURS = parseInt(process.env.RATE_LIMIT_WINDOW_HOURS) || 24;

/**
 * Rate limiter middleware
 * Checks if IP has exceeded submission limit
 */
async function rateLimiter(req, res, next) {
    try {
        // Get client IP (handle proxies)
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.connection.remoteAddress ||
                        req.ip;
        
        // Hash the IP
        const ipHash = hashIP(clientIP);
        
        // Store for later use
        req.ipHash = ipHash;
        
        // Count recent submissions from this IP hash
        const countResult = await query(
            `SELECT COUNT(*) as count FROM rate_limits 
             WHERE ip_hash = ? AND expires_at > NOW()`,
            [ipHash]
        );
        
        const submissionCount = countResult[0].count;
        
        if (submissionCount >= MAX_SUBMISSIONS) {
            return res.status(429).json({
                success: false,
                error: 'rate_limit_exceeded',
                message: `You can only submit ${MAX_SUBMISSIONS} reports per ${WINDOW_HOURS} hours. Please try again later.`,
                retryAfter: WINDOW_HOURS * 60 * 60 // seconds
            });
        }
        
        // Add remaining submissions to response headers
        res.set('X-RateLimit-Limit', MAX_SUBMISSIONS.toString());
        res.set('X-RateLimit-Remaining', (MAX_SUBMISSIONS - submissionCount - 1).toString());
        
        next();
    } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - allow submission if rate limiter fails
        next();
    }
}

/**
 * Record a submission for rate limiting
 * 
 * @param {string} ipHash - Hashed IP address
 */
async function recordSubmission(ipHash) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + WINDOW_HOURS);
    
    await query(
        `INSERT INTO rate_limits (ip_hash, expires_at) VALUES (?, ?)`,
        [ipHash, expiresAt]
    );
}

/**
 * Get remaining submissions for an IP
 * 
 * @param {string} ipHash - Hashed IP address
 * @returns {number} - Remaining submissions
 */
async function getRemainingSubmissions(ipHash) {
    const result = await query(
        `SELECT COUNT(*) as count FROM rate_limits 
         WHERE ip_hash = ? AND expires_at > NOW()`,
        [ipHash]
    );
    
    return Math.max(0, MAX_SUBMISSIONS - result[0].count);
}

module.exports = {
    rateLimiter,
    recordSubmission,
    getRemainingSubmissions
};
```

### 4.8 File Processor Middleware (middleware/fileProcessor.js)

```javascript
/**
 * File Processing Middleware
 * Handles upload, validation, and metadata stripping
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { generateFileId } = require('../utils/idGenerator');
const { validateFile, ALLOWED_FILE_TYPES } = require('../utils/validators');
require('dotenv').config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const EVIDENCE_DIR = process.env.EVIDENCE_DIR || './evidence';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 || 50 * 1024 * 1024;
const MAX_FILES = parseInt(process.env.MAX_FILES_PER_REPORT) || 10;

// Ensure directories exist
async function ensureDirectories() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
}
ensureDirectories();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Temporary name - will be renamed after processing
        const tempName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        cb(null, tempName);
    }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
    if (ALLOWED_FILE_TYPES[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
};

// Multer upload configuration
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES
    }
});

/**
 * Strip EXIF metadata from images
 * 
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path to output file
 * @param {string} mimeType - File MIME type
 */
async function stripImageMetadata(inputPath, outputPath, mimeType) {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!imageTypes.includes(mimeType)) {
        // Not an image - just copy
        await fs.copyFile(inputPath, outputPath);
        return;
    }
    
    // Use sharp to strip metadata
    await sharp(inputPath)
        .rotate() // Auto-rotate based on EXIF, then strip
        .withMetadata({
            // Remove all metadata except orientation
            exif: {},
            iptc: {},
            xmp: {}
        })
        .toFile(outputPath);
}

/**
 * Process uploaded files
 * - Validate each file
 * - Strip metadata from images
 * - Rename with anonymous IDs
 * - Move to evidence directory
 * 
 * @param {Array} files - Multer file array
 * @returns {Array} - Processed file info
 */
async function processUploadedFiles(files) {
    const processedFiles = [];
    
    for (const file of files) {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            // Clean up invalid file
            await fs.unlink(file.path).catch(() => {});
            throw new Error(validation.error);
        }
        
        // Generate anonymous filename
        const extension = ALLOWED_FILE_TYPES[file.mimetype] || 
                         path.extname(file.originalname).toLowerCase();
        const storedName = generateFileId(extension);
        const outputPath = path.join(EVIDENCE_DIR, storedName);
        
        // Strip metadata and move
        await stripImageMetadata(file.path, outputPath, file.mimetype);
        
        // Delete temporary file
        await fs.unlink(file.path).catch(() => {});
        
        // Add to processed list
        processedFiles.push({
            originalName: file.originalname,
            storedName,
            filePath: outputPath,
            fileType: extension.replace('.', ''),
            fileSize: file.size,
            mimeType: file.mimetype
        });
    }
    
    return processedFiles;
}

/**
 * Clean up files on error
 * 
 * @param {Array} files - Array of file paths to delete
 */
async function cleanupFiles(files) {
    for (const file of files) {
        const filePath = typeof file === 'string' ? file : file.path || file.filePath;
        await fs.unlink(filePath).catch(() => {});
    }
}

module.exports = {
    upload,
    processUploadedFiles,
    cleanupFiles,
    stripImageMetadata
};
```

### 4.9 Report Controller (controllers/reportController.js)

```javascript
/**
 * Report Controller
 * Handles report submission logic
 */

const { query, transaction } = require('../config/database');
const { hashContent } = require('../utils/hashUtils');
const { generateReportId } = require('../utils/idGenerator');
const { validateReportData, sanitizeText } = require('../utils/validators');
const { recordSubmission } = require('../middleware/rateLimiter');
const { processUploadedFiles, cleanupFiles } = require('../middleware/fileProcessor');

/**
 * Check for duplicate submission
 * 
 * @param {string} contentHash - Hash of report content
 * @param {string} ipHash - Hashed IP address
 * @returns {boolean} - True if duplicate exists
 */
async function checkDuplicate(contentHash, ipHash) {
    const result = await query(
        `SELECT id FROM submission_hashes 
         WHERE content_hash = ? AND ip_hash = ? AND expires_at > NOW()`,
        [contentHash, ipHash]
    );
    
    return result.length > 0;
}

/**
 * Record submission hash for duplicate detection
 * 
 * @param {string} contentHash - Hash of report content
 * @param {string} ipHash - Hashed IP address
 */
async function recordSubmissionHash(contentHash, ipHash) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await query(
        `INSERT INTO submission_hashes (content_hash, ip_hash, expires_at) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE expires_at = ?`,
        [contentHash, ipHash, expiresAt, expiresAt]
    );
}

/**
 * Get crime type ID from name
 * 
 * @param {string} crimeTypeName - Crime type name
 * @returns {number|null} - Crime type ID or null
 */
async function getCrimeTypeId(crimeTypeName) {
    const result = await query(
        'SELECT id FROM crime_types WHERE name = ? AND is_active = TRUE',
        [crimeTypeName]
    );
    
    return result.length > 0 ? result[0].id : null;
}

/**
 * Submit a new anonymous report
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function submitReport(req, res) {
    const ipHash = req.ipHash;
    let processedFiles = [];
    
    try {
        // Parse form data
        const formData = {
            crimeType: req.body.crimeType,
            description: sanitizeText(req.body.description),
            incidentDate: req.body.incidentDate,
            incidentTime: req.body.incidentTime,
            location: sanitizeText(req.body.location),
            suspectDescription: sanitizeText(req.body.suspectDescription),
            additionalNotes: sanitizeText(req.body.additionalNotes)
        };
        
        // Validate form data
        const validation = validateReportData(formData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                errors: validation.errors
            });
        }
        
        // Check for files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'no_evidence',
                message: 'At least one evidence file is required'
            });
        }
        
        // Check for duplicate submission
        const contentHash = hashContent(formData.description);
        const isDuplicate = await checkDuplicate(contentHash, ipHash);
        
        if (isDuplicate) {
            // Clean up uploaded files
            await cleanupFiles(req.files);
            
            return res.status(409).json({
                success: false,
                error: 'duplicate_submission',
                message: 'A similar report has already been submitted recently'
            });
        }
        
        // Process uploaded files (strip metadata, rename)
        processedFiles = await processUploadedFiles(req.files);
        
        // Get crime type ID
        const crimeTypeId = await getCrimeTypeId(formData.crimeType);
        if (!crimeTypeId) {
            throw new Error('Invalid crime type');
        }
        
        // Generate report ID
        const reportId = generateReportId();
        
        // Save report using transaction
        await transaction(async (connection) => {
            // Insert report
            await connection.execute(
                `INSERT INTO anonymous_reports 
                 (report_id, crime_type_id, description, incident_date, incident_time, 
                  location, suspect_description, additional_notes, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [
                    reportId,
                    crimeTypeId,
                    formData.description,
                    formData.incidentDate,
                    formData.incidentTime,
                    formData.location,
                    formData.suspectDescription || null,
                    formData.additionalNotes || null
                ]
            );
            
            // Insert evidence files
            for (const file of processedFiles) {
                await connection.execute(
                    `INSERT INTO evidence_files 
                     (report_id, original_name, stored_name, file_path, file_type, file_size, mime_type)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reportId,
                        file.originalName,
                        file.storedName,
                        file.filePath,
                        file.fileType,
                        file.fileSize,
                        file.mimeType
                    ]
                );
            }
        });
        
        // Record rate limit
        await recordSubmission(ipHash);
        
        // Record submission hash
        await recordSubmissionHash(contentHash, ipHash);
        
        // Success response
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            reportId,
            evidenceCount: processedFiles.length
        });
        
    } catch (error) {
        console.error('Report submission error:', error);
        
        // Clean up processed files on error
        await cleanupFiles(processedFiles);
        
        res.status(500).json({
            success: false,
            error: 'submission_failed',
            message: 'An error occurred while submitting your report. Please try again.'
        });
    }
}

/**
 * Check submission status by report ID
 * (For user to track their anonymous report)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function checkStatus(req, res) {
    try {
        const { reportId } = req.params;
        
        // Validate report ID format
        if (!/^SV-[A-Z0-9]{10}$/.test(reportId)) {
            return res.status(400).json({
                success: false,
                error: 'invalid_report_id',
                message: 'Invalid report ID format'
            });
        }
        
        const result = await query(
            `SELECT 
                ar.report_id,
                ct.name as crime_type,
                ar.status,
                ar.submitted_at,
                ar.reviewed_at
             FROM anonymous_reports ar
             JOIN crime_types ct ON ar.crime_type_id = ct.id
             WHERE ar.report_id = ?`,
            [reportId]
        );
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'not_found',
                message: 'Report not found'
            });
        }
        
        res.json({
            success: true,
            report: result[0]
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'An error occurred'
        });
    }
}

module.exports = {
    submitReport,
    checkStatus,
    checkDuplicate,
    recordSubmissionHash
};
```

### 4.10 Admin Controller (controllers/adminController.js)

```javascript
/**
 * Admin Controller
 * Handles admin dashboard operations
 */

const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

/**
 * Admin login
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        // Get admin user
        const result = await query(
            'SELECT id, username, password_hash, role FROM admin_users WHERE username = ? AND is_active = TRUE',
            [username]
        );
        
        if (result.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'invalid_credentials',
                message: 'Invalid username or password'
            });
        }
        
        const admin = result[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'invalid_credentials',
                message: 'Invalid username or password'
            });
        }
        
        // Update last login
        await query(
            'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );
        
        // Generate JWT
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.json({
            success: true,
            token,
            user: {
                username: admin.username,
                role: admin.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

/**
 * Get all reports (paginated)
 */
async function getReports(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const crimeType = req.query.crimeType;
        
        // Build query
        let whereClause = '1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND ar.status = ?';
            params.push(status);
        }
        
        if (crimeType) {
            whereClause += ' AND ct.name = ?';
            params.push(crimeType);
        }
        
        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM anonymous_reports ar
             JOIN crime_types ct ON ar.crime_type_id = ct.id
             WHERE ${whereClause}`,
            params
        );
        
        const total = countResult[0].total;
        
        // Get reports
        const reports = await query(
            `SELECT 
                ar.report_id,
                ct.name as crime_type,
                SUBSTRING(ar.description, 1, 200) as description_preview,
                ar.incident_date,
                ar.location,
                ar.status,
                ar.is_flagged,
                ar.submitted_at,
                (SELECT COUNT(*) FROM evidence_files ef WHERE ef.report_id = ar.report_id) as evidence_count
             FROM anonymous_reports ar
             JOIN crime_types ct ON ar.crime_type_id = ct.id
             WHERE ${whereClause}
             ORDER BY ar.submitted_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        
        res.json({
            success: true,
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

/**
 * Get single report details
 */
async function getReport(req, res) {
    try {
        const { reportId } = req.params;
        
        // Get report
        const reportResult = await query(
            `SELECT 
                ar.report_id,
                ct.name as crime_type,
                ar.description,
                ar.incident_date,
                ar.incident_time,
                ar.location,
                ar.suspect_description,
                ar.additional_notes,
                ar.status,
                ar.is_flagged,
                ar.flag_reason,
                ar.submitted_at,
                ar.reviewed_at,
                ar.admin_notes
             FROM anonymous_reports ar
             JOIN crime_types ct ON ar.crime_type_id = ct.id
             WHERE ar.report_id = ?`,
            [reportId]
        );
        
        if (reportResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'not_found'
            });
        }
        
        // Get evidence files
        const evidenceResult = await query(
            `SELECT 
                id,
                original_name,
                stored_name,
                file_type,
                file_size,
                uploaded_at
             FROM evidence_files
             WHERE report_id = ?`,
            [reportId]
        );
        
        res.json({
            success: true,
            report: reportResult[0],
            evidence: evidenceResult
        });
        
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

/**
 * Update report status
 */
async function updateStatus(req, res) {
    try {
        const { reportId } = req.params;
        const { status, adminNotes } = req.body;
        const adminId = req.admin.id;
        
        const validStatuses = ['pending', 'reviewing', 'reviewed', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'invalid_status'
            });
        }
        
        await query(
            `UPDATE anonymous_reports 
             SET status = ?, admin_notes = ?, reviewed_at = NOW(), reviewed_by = ?
             WHERE report_id = ?`,
            [status, adminNotes || null, adminId, reportId]
        );
        
        res.json({
            success: true,
            message: 'Status updated'
        });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

/**
 * Flag a report
 */
async function flagReport(req, res) {
    try {
        const { reportId } = req.params;
        const { flagged, reason } = req.body;
        
        await query(
            `UPDATE anonymous_reports 
             SET is_flagged = ?, flag_reason = ?
             WHERE report_id = ?`,
            [flagged, flagged ? reason : null, reportId]
        );
        
        res.json({
            success: true,
            message: flagged ? 'Report flagged' : 'Flag removed'
        });
        
    } catch (error) {
        console.error('Flag report error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

/**
 * Get dashboard statistics
 */
async function getStatistics(req, res) {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_reports,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN is_flagged = TRUE THEN 1 ELSE 0 END) as flagged,
                COUNT(DISTINCT DATE(submitted_at)) as active_days
            FROM anonymous_reports
            WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        const byType = await query(`
            SELECT ct.name, COUNT(*) as count
            FROM anonymous_reports ar
            JOIN crime_types ct ON ar.crime_type_id = ct.id
            WHERE ar.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY ct.id, ct.name
            ORDER BY count DESC
        `);
        
        res.json({
            success: true,
            statistics: stats[0],
            byType
        });
        
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
}

module.exports = {
    login,
    getReports,
    getReport,
    updateStatus,
    flagReport,
    getStatistics
};
```

### 4.11 Admin Auth Middleware (middleware/adminAuth.js)

```javascript
/**
 * Admin Authentication Middleware
 * JWT-based authentication for admin routes
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify admin JWT token
 */
function verifyAdmin(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'no_token',
                message: 'Authentication required'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach admin info to request
        req.admin = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        };
        
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'token_expired',
                message: 'Session expired. Please login again.'
            });
        }
        
        return res.status(401).json({
            success: false,
            error: 'invalid_token',
            message: 'Invalid authentication'
        });
    }
}

/**
 * Check admin role
 * 
 * @param {Array} allowedRoles - Array of allowed roles
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'not_authenticated'
            });
        }
        
        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'forbidden',
                message: 'You do not have permission for this action'
            });
        }
        
        next();
    };
}

module.exports = {
    verifyAdmin,
    requireRole
};
```

### 4.12 Main Server (server.js)

```javascript
/**
 * Anonymous Crime Reporting System
 * Main Express Server
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import modules
const { testConnection } = require('./config/database');
const { rateLimiter } = require('./middleware/rateLimiter');
const { upload } = require('./middleware/fileProcessor');
const { verifyAdmin, requireRole } = require('./middleware/adminAuth');
const reportController = require('./controllers/reportController');
const adminController = require('./controllers/adminController');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE
// ======================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        }
    }
}));

// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Evidence files (protected - only accessible by admin)
app.use('/evidence', verifyAdmin, express.static(path.join(__dirname, 'evidence')));

// ======================
// PUBLIC ROUTES
// ======================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit anonymous report
app.post('/api/reports',
    rateLimiter,
    upload.array('evidence', 10),
    reportController.submitReport
);

// Check report status (by report ID)
app.get('/api/reports/:reportId/status',
    reportController.checkStatus
);

// ======================
// ADMIN ROUTES
// ======================

// Admin login
app.post('/api/admin/login', adminController.login);

// Protected admin routes
app.get('/api/admin/reports',
    verifyAdmin,
    adminController.getReports
);

app.get('/api/admin/reports/:reportId',
    verifyAdmin,
    adminController.getReport
);

app.patch('/api/admin/reports/:reportId/status',
    verifyAdmin,
    requireRole('admin', 'reviewer'),
    adminController.updateStatus
);

app.patch('/api/admin/reports/:reportId/flag',
    verifyAdmin,
    requireRole('admin', 'supervisor'),
    adminController.flagReport
);

app.get('/api/admin/statistics',
    verifyAdmin,
    adminController.getStatistics
);

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'file_too_large',
            message: 'File size exceeds the maximum limit of 50MB'
        });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            error: 'too_many_files',
            message: 'Maximum 10 files allowed per submission'
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'An unexpected error occurred'
    });
});

// ======================
// START SERVER
// ======================

async function startServer() {
    // Test database connection
    await testConnection();
    
    // Start listening
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════╗
║   Anonymous Crime Reporting System                 ║
║   Server running on port ${PORT}                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                     ║
╚════════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(console.error);
```

---

## 5. Frontend Implementation

### 5.1 Report Page HTML (public/report.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Submit an anonymous crime report securely">
    <title>Anonymous Crime Report</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- Disclaimer Modal -->
    <div id="disclaimerModal" class="modal">
        <div class="modal-content disclaimer">
            <div class="modal-header">
                <h2>⚠️ Important Notice</h2>
            </div>
            <div class="modal-body">
                <ul class="disclaimer-list">
                    <li>
                        <strong>🔒 Your report is anonymous.</strong>
                        <p>We do not collect or store any personal identifying information.</p>
                    </li>
                    <li>
                        <strong>⚖️ False reporting is a criminal offense.</strong>
                        <p>Submitting false or misleading information may result in legal consequences.</p>
                    </li>
                    <li>
                        <strong>🚨 This is NOT for emergencies.</strong>
                        <p>For immediate assistance, call emergency services (911 / 999 / 112).</p>
                    </li>
                    <li>
                        <strong>📎 Evidence is required.</strong>
                        <p>You must upload at least one evidence file (photo, video, or document).</p>
                    </li>
                </ul>
            </div>
            <div class="modal-footer">
                <button id="declineBtn" class="btn btn-secondary">Cancel</button>
                <button id="acceptBtn" class="btn btn-primary">I Understand & Accept</button>
            </div>
        </div>
    </div>

    <!-- Main Report Container -->
    <div id="reportContainer" class="container hidden">
        <header class="page-header">
            <h1>Anonymous Crime Report</h1>
            <p class="subtitle">Submit your report securely and anonymously</p>
        </header>

        <form id="reportForm" class="report-form" novalidate>
            <!-- Crime Details Section -->
            <section class="form-section">
                <h2 class="section-title">
                    <span class="icon">📋</span>
                    Crime Details
                    <span class="required-badge">Required</span>
                </h2>
                
                <div class="form-group">
                    <label for="crimeType">Type of Crime *</label>
                    <select id="crimeType" name="crimeType" required>
                        <option value="">Select crime type...</option>
                        <option value="theft">Theft / Burglary / Robbery</option>
                        <option value="assault">Physical Assault</option>
                        <option value="fraud">Fraud / Scam</option>
                        <option value="vandalism">Vandalism / Property Damage</option>
                        <option value="harassment">Harassment / Stalking</option>
                        <option value="drug_related">Drug-Related Crime</option>
                        <option value="cybercrime">Cybercrime</option>
                        <option value="domestic_violence">Domestic Violence</option>
                        <option value="corruption">Corruption</option>
                        <option value="human_trafficking">Human Trafficking</option>
                        <option value="environmental">Environmental Crime</option>
                        <option value="organized_crime">Organized Crime</option>
                        <option value="other">Other</option>
                    </select>
                    <span class="error-message" id="crimeTypeError"></span>
                </div>
                
                <div class="form-group">
                    <label for="description">
                        Description of Incident *
                        <span class="char-count" id="descCharCount">0 / 5000</span>
                    </label>
                    <textarea 
                        id="description" 
                        name="description" 
                        rows="6" 
                        placeholder="Provide a detailed description of what happened. Include as much relevant information as possible (minimum 50 characters)."
                        minlength="50"
                        maxlength="5000"
                        required
                    ></textarea>
                    <span class="error-message" id="descriptionError"></span>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="incidentDate">Date of Incident *</label>
                        <input 
                            type="date" 
                            id="incidentDate" 
                            name="incidentDate" 
                            required
                        >
                        <span class="error-message" id="incidentDateError"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="incidentTime">Approximate Time *</label>
                        <input 
                            type="time" 
                            id="incidentTime" 
                            name="incidentTime" 
                            required
                        >
                        <span class="error-message" id="incidentTimeError"></span>
                    </div>
                </div>
            </section>

            <!-- Location Section -->
            <section class="form-section">
                <h2 class="section-title">
                    <span class="icon">📍</span>
                    Location
                    <span class="required-badge">Required</span>
                </h2>
                
                <div class="form-group">
                    <label for="location">Location of Incident *</label>
                    <textarea 
                        id="location" 
                        name="location" 
                        rows="3" 
                        placeholder="Provide a detailed location description (street address, landmarks, area name, city). Minimum 10 characters."
                        minlength="10"
                        maxlength="500"
                        required
                    ></textarea>
                    <span class="error-message" id="locationError"></span>
                </div>
            </section>

            <!-- Evidence Section -->
            <section class="form-section">
                <h2 class="section-title">
                    <span class="icon">📎</span>
                    Evidence
                    <span class="required-badge">Required</span>
                </h2>
                
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <span class="upload-icon">📤</span>
                        <p class="upload-text">
                            <strong>Drop files here</strong> or <span class="link">browse</span>
                        </p>
                        <p class="upload-hint">
                            Images, videos, or documents (max 50MB each, up to 10 files)
                        </p>
                    </div>
                    <input 
                        type="file" 
                        id="evidenceFiles" 
                        name="evidence" 
                        multiple 
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        class="file-input"
                    >
                </div>
                
                <div id="fileList" class="file-list"></div>
                <p id="fileCount" class="file-count">0 files selected</p>
                <span class="error-message" id="evidenceError"></span>
                
                <div class="privacy-notice">
                    <span class="icon">🔒</span>
                    <p>Files are automatically processed to remove metadata (EXIF data) and renamed for anonymity.</p>
                </div>
            </section>

            <!-- Optional Sections -->
            <section class="form-section optional">
                <h2 class="section-title">
                    <span class="icon">👤</span>
                    Suspect Information
                    <span class="optional-badge">Optional</span>
                </h2>
                
                <div class="form-group">
                    <label for="suspectDescription">Suspect Description</label>
                    <textarea 
                        id="suspectDescription" 
                        name="suspectDescription" 
                        rows="4" 
                        placeholder="Describe any suspects if applicable (physical appearance, clothing, vehicle, etc.)"
                        maxlength="2000"
                    ></textarea>
                </div>
                
                <div class="form-group">
                    <label for="additionalNotes">Additional Notes</label>
                    <textarea 
                        id="additionalNotes" 
                        name="additionalNotes" 
                        rows="4" 
                        placeholder="Any other relevant information"
                        maxlength="2000"
                    ></textarea>
                </div>
            </section>

            <!-- CAPTCHA Section -->
            <section class="form-section captcha-section">
                <h2 class="section-title">
                    <span class="icon">🔐</span>
                    Security Verification
                </h2>
                
                <div class="captcha-container">
                    <div class="captcha-question" id="captchaQuestion">Loading...</div>
                    <button type="button" id="refreshCaptcha" class="btn-icon" title="Refresh">🔄</button>
                </div>
                
                <div class="form-group">
                    <label for="captchaAnswer">Your Answer *</label>
                    <input 
                        type="text" 
                        id="captchaAnswer" 
                        name="captchaAnswer" 
                        placeholder="Enter your answer"
                        autocomplete="off"
                        required
                    >
                    <span class="error-message" id="captchaError"></span>
                </div>
            </section>

            <!-- Submit Section -->
            <div class="submit-section">
                <button type="submit" id="submitBtn" class="btn btn-primary btn-large" disabled>
                    <span class="btn-text">Submit Anonymous Report</span>
                    <span class="btn-loading hidden">
                        <span class="spinner"></span>
                        Submitting...
                    </span>
                </button>
                
                <p class="submit-notice">
                    By submitting, you confirm that all information provided is truthful and accurate to the best of your knowledge.
                </p>
            </div>
        </form>
    </div>

    <!-- Success Container -->
    <div id="successContainer" class="container success-container hidden">
        <div class="success-content">
            <div class="success-icon">✓</div>
            <h1>Report Submitted Successfully</h1>
            <p class="success-message">Your anonymous report has been received and will be reviewed by our team.</p>
            
            <div class="report-id-box">
                <p class="label">Your Report ID</p>
                <p class="report-id" id="reportIdDisplay">SV-XXXXXXXX</p>
                <button id="copyReportId" class="btn btn-secondary btn-small">Copy ID</button>
            </div>
            
            <div class="important-notice">
                <h3>⚠️ Important</h3>
                <p>Save this Report ID to track the status of your submission. This is the only way to check on your report.</p>
            </div>
            
            <div class="success-actions">
                <a href="/" class="btn btn-secondary">Return Home</a>
                <a href="/report.html" class="btn btn-primary">Submit Another Report</a>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/js/captcha.js"></script>
    <script src="/js/fileUpload.js"></script>
    <script src="/js/report.js"></script>
</body>
</html>
```

### 5.2 Main Stylesheet (public/css/styles.css)

```css
/**
 * Anonymous Crime Reporting System
 * Main Stylesheet
 */

/* ======================
   CSS VARIABLES
   ====================== */
:root {
    /* Colors */
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --primary-light: #3b82f6;
    --secondary: #64748b;
    --success: #22c55e;
    --danger: #ef4444;
    --warning: #f59e0b;
    
    /* Backgrounds */
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --bg-dark: #0f172a;
    
    /* Text */
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --text-light: #ffffff;
    
    /* Borders */
    --border-color: #e2e8f0;
    --border-focus: var(--primary);
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    
    /* Border Radius */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-full: 9999px;
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}

/* ======================
   RESET & BASE
   ====================== */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
}

/* ======================
   LAYOUT
   ====================== */
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-lg);
}

.hidden {
    display: none !important;
}

/* ======================
   TYPOGRAPHY
   ====================== */
h1, h2, h3 {
    font-weight: 600;
    line-height: 1.3;
}

h1 { font-size: 1.875rem; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.125rem; }

/* ======================
   MODAL
   ====================== */
.modal {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-content {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    max-width: 560px;
    width: 100%;
    box-shadow: var(--shadow-lg);
    animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.modal-body {
    padding: var(--space-lg);
}

.modal-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
}

/* Disclaimer List */
.disclaimer-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}

.disclaimer-list li {
    padding-left: var(--space-md);
    border-left: 3px solid var(--primary);
}

.disclaimer-list strong {
    display: block;
    margin-bottom: var(--space-xs);
}

.disclaimer-list p {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

/* ======================
   BUTTONS
   ====================== */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg);
    font-size: 0.9375rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background-color: var(--primary);
    color: var(--text-light);
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--primary-dark);
}

.btn-secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
    background-color: var(--border-color);
}

.btn-large {
    padding: var(--space-md) var(--space-xl);
    font-size: 1rem;
    width: 100%;
}

.btn-small {
    padding: var(--space-xs) var(--space-md);
    font-size: 0.8125rem;
}

.btn-icon {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
}

.btn-icon:hover {
    background-color: var(--bg-tertiary);
}

/* Button Loading State */
.btn .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: var(--radius-full);
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ======================
   PAGE HEADER
   ====================== */
.page-header {
    text-align: center;
    margin-bottom: var(--space-2xl);
}

.page-header h1 {
    margin-bottom: var(--space-sm);
}

.subtitle {
    color: var(--text-secondary);
}

/* ======================
   FORM SECTIONS
   ====================== */
.form-section {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

.section-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--border-color);
}

.section-title .icon {
    font-size: 1.25rem;
}

.required-badge {
    background-color: #fee2e2;
    color: var(--danger);
    font-size: 0.6875rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-full);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    margin-left: auto;
}

.optional-badge {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-full);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    margin-left: auto;
}

/* ======================
   FORM ELEMENTS
   ====================== */
.form-group {
    margin-bottom: var(--space-lg);
}

.form-group:last-child {
    margin-bottom: 0;
}

.form-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
}

@media (max-width: 640px) {
    .form-row {
        grid-template-columns: 1fr;
    }
}

label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: var(--space-sm);
    color: var(--text-primary);
}

.char-count {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 0.75rem;
}

input[type="text"],
input[type="date"],
input[type="time"],
input[type="email"],
input[type="password"],
select,
textarea {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    font-size: 0.9375rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background-color: var(--bg-primary);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

input:focus,
select:focus,
textarea:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

input.error,
select.error,
textarea.error {
    border-color: var(--danger);
}

textarea {
    resize: vertical;
    min-height: 100px;
}

select {
    cursor: pointer;
}

.error-message {
    display: block;
    color: var(--danger);
    font-size: 0.8125rem;
    margin-top: var(--space-xs);
    min-height: 1.25rem;
}

/* ======================
   FILE UPLOAD
   ====================== */
.upload-area {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-2xl);
    text-align: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
}

.upload-area:hover,
.upload-area.dragover {
    border-color: var(--primary);
    background-color: rgba(37, 99, 235, 0.02);
}

.upload-area.dragover {
    background-color: rgba(37, 99, 235, 0.05);
}

.upload-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: var(--space-md);
}

.upload-text {
    margin-bottom: var(--space-sm);
}

.upload-text .link {
    color: var(--primary);
    text-decoration: underline;
}

.upload-hint {
    font-size: 0.8125rem;
    color: var(--text-muted);
}

.file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

/* File List */
.file-list {
    margin-top: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.file-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
}

.file-icon {
    font-size: 1.5rem;
}

.file-info {
    flex: 1;
    min-width: 0;
}

.file-name {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-size {
    font-size: 0.75rem;
    color: var(--text-muted);
}

.file-remove {
    color: var(--danger);
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
}

.file-remove:hover {
    background-color: #fee2e2;
}

.file-count {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-top: var(--space-sm);
}

/* Privacy Notice */
.privacy-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding: var(--space-md);
    background-color: #ecfdf5;
    border-radius: var(--radius-md);
    font-size: 0.8125rem;
    color: #166534;
}

/* ======================
   CAPTCHA
   ====================== */
.captcha-container {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    padding: var(--space-md);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
}

.captcha-question {
    font-size: 1.25rem;
    font-weight: 600;
    font-family: monospace;
    flex: 1;
}

/* ======================
   SUBMIT SECTION
   ====================== */
.submit-section {
    text-align: center;
    padding-top: var(--space-lg);
}

.submit-notice {
    margin-top: var(--space-md);
    font-size: 0.8125rem;
    color: var(--text-muted);
}

/* ======================
   SUCCESS PAGE
   ====================== */
.success-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-lg);
}

.success-content {
    text-align: center;
    max-width: 480px;
}

.success-icon {
    width: 80px;
    height: 80px;
    background-color: var(--success);
    color: white;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    margin: 0 auto var(--space-lg);
    animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
    from {
        transform: scale(0);
    }
    to {
        transform: scale(1);
    }
}

.success-content h1 {
    margin-bottom: var(--space-md);
    color: var(--success);
}

.success-message {
    color: var(--text-secondary);
    margin-bottom: var(--space-xl);
}

.report-id-box {
    background-color: var(--bg-tertiary);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
}

.report-id-box .label {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
}

.report-id {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: monospace;
    color: var(--primary);
    margin-bottom: var(--space-md);
    letter-spacing: 0.1em;
}

.important-notice {
    background-color: #fef3c7;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
    text-align: left;
}

.important-notice h3 {
    margin-bottom: var(--space-xs);
    color: #92400e;
}

.important-notice p {
    font-size: 0.875rem;
    color: #92400e;
}

.success-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: center;
}

@media (max-width: 480px) {
    .success-actions {
        flex-direction: column;
    }
}
```

### 5.3 CAPTCHA Script (public/js/captcha.js)

```javascript
/**
 * Simple Math CAPTCHA
 * Generates and validates math problems
 */

const Captcha = (function() {
    let currentAnswer = null;
    
    const operations = [
        { symbol: '+', fn: (a, b) => a + b },
        { symbol: '-', fn: (a, b) => a - b },
        { symbol: '×', fn: (a, b) => a * b }
    ];
    
    /**
     * Generate a new CAPTCHA question
     */
    function generate() {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        let num1, num2;
        
        switch (operation.symbol) {
            case '+':
                num1 = Math.floor(Math.random() * 20) + 1;
                num2 = Math.floor(Math.random() * 20) + 1;
                break;
            case '-':
                num1 = Math.floor(Math.random() * 20) + 10;
                num2 = Math.floor(Math.random() * 10) + 1;
                break;
            case '×':
                num1 = Math.floor(Math.random() * 10) + 1;
                num2 = Math.floor(Math.random() * 10) + 1;
                break;
        }
        
        currentAnswer = operation.fn(num1, num2);
        
        return `${num1} ${operation.symbol} ${num2} = ?`;
    }
    
    /**
     * Initialize CAPTCHA in the DOM
     */
    function init() {
        const questionEl = document.getElementById('captchaQuestion');
        const refreshBtn = document.getElementById('refreshCaptcha');
        const answerInput = document.getElementById('captchaAnswer');
        
        if (questionEl) {
            questionEl.textContent = generate();
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (questionEl) {
                    questionEl.textContent = generate();
                }
                if (answerInput) {
                    answerInput.value = '';
                }
            });
        }
    }
    
    /**
     * Verify user's answer
     * @param {string} userAnswer - User's input
     * @returns {boolean}
     */
    function verify(userAnswer) {
        if (!userAnswer || currentAnswer === null) return false;
        return parseInt(userAnswer.trim(), 10) === currentAnswer;
    }
    
    /**
     * Refresh the CAPTCHA
     */
    function refresh() {
        const questionEl = document.getElementById('captchaQuestion');
        const answerInput = document.getElementById('captchaAnswer');
        
        if (questionEl) {
            questionEl.textContent = generate();
        }
        if (answerInput) {
            answerInput.value = '';
        }
    }
    
    /**
     * Check if CAPTCHA answer is filled
     * @returns {boolean}
     */
    function isFilled() {
        const answerInput = document.getElementById('captchaAnswer');
        return answerInput && answerInput.value.trim().length > 0;
    }
    
    return {
        init,
        generate,
        verify,
        refresh,
        isFilled
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', Captcha.init);
```

### 5.4 File Upload Script (public/js/fileUpload.js)

```javascript
/**
 * File Upload Handler
 * Manages file selection, validation, and display
 */

const FileUpload = (function() {
    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    
    const ALLOWED_TYPES = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    
    let selectedFiles = [];
    let onChangeCallback = null;
    
    /**
     * Initialize file upload handlers
     * @param {Function} onChange - Callback when files change
     */
    function init(onChange) {
        onChangeCallback = onChange;
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('evidenceFiles');
        
        if (!uploadArea || !fileInput) return;
        
        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = ''; // Reset for same file selection
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }
    
    /**
     * Process and validate files
     * @param {FileList} files - Files to process
     */
    function handleFiles(files) {
        const newFiles = Array.from(files);
        const errors = [];
        
        for (const file of newFiles) {
            // Check file count
            if (selectedFiles.length >= MAX_FILES) {
                errors.push(`Maximum ${MAX_FILES} files allowed`);
                break;
            }
            
            // Check file type
            if (!ALLOWED_TYPES[file.type]) {
                errors.push(`"${file.name}" - File type not allowed`);
                continue;
            }
            
            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`"${file.name}" - File too large (max 50MB)`);
                continue;
            }
            
            // Check for duplicate
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                errors.push(`"${file.name}" - Already added`);
                continue;
            }
            
            selectedFiles.push(file);
        }
        
        // Show errors if any
        if (errors.length > 0) {
            showError(errors.join('\n'));
        }
        
        renderFileList();
        notifyChange();
    }
    
    /**
     * Remove a file from selection
     * @param {number} index - File index to remove
     */
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        renderFileList();
        notifyChange();
    }
    
    /**
     * Render the file list in the DOM
     */
    function renderFileList() {
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        if (!fileList) return;
        
        fileList.innerHTML = selectedFiles.map((file, index) => `
            <div class="file-item">
                <span class="file-icon">${getFileIcon(file.type)}</span>
                <div class="file-info">
                    <span class="file-name">${escapeHtml(file.name)}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
                <button type="button" class="file-remove" data-index="${index}" title="Remove">×</button>
            </div>
        `).join('');
        
        // Add remove handlers
        fileList.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                removeFile(index);
            });
        });
        
        if (fileCount) {
            fileCount.textContent = `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`;
        }
    }
    
    /**
     * Get icon for file type
     * @param {string} mimeType - File MIME type
     * @returns {string} Emoji icon
     */
    function getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        return '📎';
    }
    
    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        const errorEl = document.getElementById('evidenceError');
        if (errorEl) {
            errorEl.textContent = message;
            setTimeout(() => { errorEl.textContent = ''; }, 5000);
        }
    }
    
    /**
     * Notify parent of changes
     */
    function notifyChange() {
        if (onChangeCallback) {
            onChangeCallback(selectedFiles);
        }
    }
    
    /**
     * Get selected files
     * @returns {File[]}
     */
    function getFiles() {
        return selectedFiles;
    }
    
    /**
     * Check if files are selected
     * @returns {boolean}
     */
    function hasFiles() {
        return selectedFiles.length > 0;
    }
    
    /**
     * Clear all files
     */
    function clear() {
        selectedFiles = [];
        renderFileList();
        notifyChange();
    }
    
    return {
        init,
        getFiles,
        hasFiles,
        clear
    };
})();
```

### 5.5 Main Report Script (public/js/report.js)

```javascript
/**
 * Report Form Handler
 * Main controller for the anonymous report submission
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const disclaimerModal = document.getElementById('disclaimerModal');
    const reportContainer = document.getElementById('reportContainer');
    const successContainer = document.getElementById('successContainer');
    const reportForm = document.getElementById('reportForm');
    const submitBtn = document.getElementById('submitBtn');
    const acceptBtn = document.getElementById('acceptBtn');
    const declineBtn = document.getElementById('declineBtn');
    
    // State
    let filesSelected = false;
    let captchaComplete = false;
    
    // =====================
    // DISCLAIMER MODAL
    // =====================
    
    acceptBtn?.addEventListener('click', () => {
        disclaimerModal.classList.add('hidden');
        reportContainer.classList.remove('hidden');
    });
    
    declineBtn?.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // =====================
    // FILE UPLOAD
    // =====================
    
    FileUpload.init((files) => {
        filesSelected = files.length > 0;
        updateSubmitButton();
    });
    
    // =====================
    // FORM VALIDATION
    // =====================
    
    // Character counter for description
    const description = document.getElementById('description');
    const descCharCount = document.getElementById('descCharCount');
    
    description?.addEventListener('input', () => {
        const count = description.value.length;
        descCharCount.textContent = `${count} / 5000`;
        
        if (count < 50) {
            descCharCount.style.color = '#ef4444';
        } else {
            descCharCount.style.color = '#94a3b8';
        }
    });
    
    // Set max date to today
    const incidentDate = document.getElementById('incidentDate');
    if (incidentDate) {
        incidentDate.max = new Date().toISOString().split('T')[0];
    }
    
    // CAPTCHA verification
    const captchaAnswer = document.getElementById('captchaAnswer');
    captchaAnswer?.addEventListener('input', () => {
        captchaComplete = Captcha.isFilled();
        updateSubmitButton();
    });
    
    // Real-time validation
    const requiredFields = ['crimeType', 'description', 'incidentDate', 'incidentTime', 'location'];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field?.addEventListener('input', updateSubmitButton);
        field?.addEventListener('change', updateSubmitButton);
    });
    
    /**
     * Update submit button state
     */
    function updateSubmitButton() {
        const formValid = validateForm(false);
        submitBtn.disabled = !(formValid && filesSelected && captchaComplete);
    }
    
    /**
     * Validate form fields
     * @param {boolean} showErrors - Whether to show error messages
     * @returns {boolean}
     */
    function validateForm(showErrors = true) {
        let isValid = true;
        
        // Crime type
        const crimeType = document.getElementById('crimeType');
        if (!crimeType.value) {
            if (showErrors) setError('crimeType', 'Please select a crime type');
            isValid = false;
        } else {
            clearError('crimeType');
        }
        
        // Description
        const description = document.getElementById('description');
        if (!description.value || description.value.length < 50) {
            if (showErrors) setError('description', 'Description must be at least 50 characters');
            isValid = false;
        } else if (description.value.length > 5000) {
            if (showErrors) setError('description', 'Description must be less than 5000 characters');
            isValid = false;
        } else {
            clearError('description');
        }
        
        // Incident date
        const incidentDate = document.getElementById('incidentDate');
        if (!incidentDate.value) {
            if (showErrors) setError('incidentDate', 'Please select the incident date');
            isValid = false;
        } else if (new Date(incidentDate.value) > new Date()) {
            if (showErrors) setError('incidentDate', 'Date cannot be in the future');
            isValid = false;
        } else {
            clearError('incidentDate');
        }
        
        // Incident time
        const incidentTime = document.getElementById('incidentTime');
        if (!incidentTime.value) {
            if (showErrors) setError('incidentTime', 'Please select the incident time');
            isValid = false;
        } else {
            clearError('incidentTime');
        }
        
        // Location
        const location = document.getElementById('location');
        if (!location.value || location.value.length < 10) {
            if (showErrors) setError('location', 'Please provide a detailed location (min 10 characters)');
            isValid = false;
        } else {
            clearError('location');
        }
        
        return isValid;
    }
    
    /**
     * Set error message for a field
     */
    function setError(fieldId, message) {
        const errorEl = document.getElementById(fieldId + 'Error');
        const field = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = message;
        if (field) field.classList.add('error');
    }
    
    /**
     * Clear error for a field
     */
    function clearError(fieldId) {
        const errorEl = document.getElementById(fieldId + 'Error');
        const field = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = '';
        if (field) field.classList.remove('error');
    }
    
    // =====================
    // FORM SUBMISSION
    // =====================
    
    reportForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!validateForm(true)) {
            return;
        }
        
        // Validate files
        if (!FileUpload.hasFiles()) {
            document.getElementById('evidenceError').textContent = 
                'Please upload at least one evidence file';
            return;
        }
        
        // Validate CAPTCHA
        if (!Captcha.verify(captchaAnswer.value)) {
            setError('captcha', 'Incorrect answer. Please try again.');
            Captcha.refresh();
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').classList.add('hidden');
        submitBtn.querySelector('.btn-loading').classList.remove('hidden');
        
        try {
            // Build FormData
            const formData = new FormData();
            formData.append('crimeType', document.getElementById('crimeType').value);
            formData.append('description', document.getElementById('description').value);
            formData.append('incidentDate', document.getElementById('incidentDate').value);
            formData.append('incidentTime', document.getElementById('incidentTime').value);
            formData.append('location', document.getElementById('location').value);
            formData.append('suspectDescription', document.getElementById('suspectDescription')?.value || '');
            formData.append('additionalNotes', document.getElementById('additionalNotes')?.value || '');
            
            // Append files
            FileUpload.getFiles().forEach(file => {
                formData.append('evidence', file);
            });
            
            // Submit to server
            const response = await fetch('/api/reports', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Submission failed');
            }
            
            // Show success
            showSuccess(result.reportId);
            
        } catch (error) {
            console.error('Submission error:', error);
            alert(error.message || 'An error occurred. Please try again.');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').classList.remove('hidden');
            submitBtn.querySelector('.btn-loading').classList.add('hidden');
        }
    });
    
    /**
     * Show success screen
     * @param {string} reportId - The generated report ID
     */
    function showSuccess(reportId) {
        reportContainer.classList.add('hidden');
        successContainer.classList.remove('hidden');
        
        document.getElementById('reportIdDisplay').textContent = reportId;
        
        // Copy button
        document.getElementById('copyReportId')?.addEventListener('click', () => {
            navigator.clipboard.writeText(reportId).then(() => {
                const btn = document.getElementById('copyReportId');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy ID'; }, 2000);
            });
        });
    }
});
```

---

## 6. Security Measures

### 6.1 Security Checklist

| Category | Measure | Implementation |
|----------|---------|----------------|
| **Identity Protection** | No PII collection | No name, email, phone, ID fields |
| | IP hashing | SHA-256 with salt, one-way |
| | File renaming | Random UUIDs for evidence |
| | Metadata stripping | EXIF removal with Sharp |
| **Abuse Prevention** | Rate limiting | 2 submissions per IP per 24h |
| | CAPTCHA | Simple math verification |
| | Duplicate detection | Content hash comparison |
| | Input validation | Server-side validation |
| **Data Security** | HTTPS | Required for production |
| | File validation | Type, size, content checks |
| | SQL injection | Parameterized queries |
| | XSS prevention | Input sanitization |
| **Admin Access** | JWT authentication | Token-based auth |
| | Role-based access | Admin, reviewer, supervisor |
| | No IP exposure | Hashed IPs never displayed |

### 6.2 IP Hashing Implementation

```javascript
// IP is NEVER stored in plain text
// Only one-way hash is stored

const hashedIP = crypto
    .createHash('sha256')
    .update(SALT + clientIP)
    .digest('hex');

// Hash cannot be reversed to original IP
// Used only for:
// - Rate limiting
// - Duplicate detection
// - Never exposed to admins
```

### 6.3 File Security

```javascript
// 1. Validate file type (MIME and extension)
// 2. Validate file size (max 50MB)
// 3. Strip EXIF metadata using Sharp
// 4. Rename with random UUID
// 5. Store in protected directory
// 6. Serve only to authenticated admins
```

---

## 7. Deployment Guide

### 7.1 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- SSL certificate (production)

### 7.2 Installation Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd anonymous-crime-reporting

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Create database
mysql -u root -p < schema.sql

# 5. Create admin user
node scripts/create-admin.js

# 6. Start server
npm start
```

### 7.3 Production Checklist

- [ ] HTTPS enabled
- [ ] Strong passwords for database
- [ ] Unique salts for hashing
- [ ] File upload directory permissions
- [ ] Database backups configured
- [ ] Log rotation enabled
- [ ] Rate limit values reviewed
- [ ] Error pages customized

---

## 8. API Reference

### 8.1 Public Endpoints

#### Submit Report
```
POST /api/reports
Content-Type: multipart/form-data

Body:
- crimeType: string (required)
- description: string (required, 50-5000 chars)
- incidentDate: string (required, YYYY-MM-DD)
- incidentTime: string (required, HH:MM)
- location: string (required, 10-500 chars)
- suspectDescription: string (optional)
- additionalNotes: string (optional)
- evidence: File[] (required, 1-10 files)

Response:
{
  "success": true,
  "reportId": "SV-XXXXXXXX",
  "evidenceCount": 3
}
```

#### Check Status
```
GET /api/reports/:reportId/status

Response:
{
  "success": true,
  "report": {
    "report_id": "SV-XXXXXXXX",
    "crime_type": "theft",
    "status": "pending",
    "submitted_at": "2025-01-15T10:30:00Z"
  }
}
```

### 8.2 Admin Endpoints

All admin endpoints require `Authorization: Bearer <token>` header.

#### Login
```
POST /api/admin/login
Content-Type: application/json

Body:
{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "token": "eyJ...",
  "user": { "username": "admin", "role": "admin" }
}
```

#### Get Reports
```
GET /api/admin/reports?page=1&limit=20&status=pending

Response:
{
  "success": true,
  "reports": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

#### Update Status
```
PATCH /api/admin/reports/:reportId/status
Content-Type: application/json

Body:
{
  "status": "reviewed",
  "adminNotes": "Forwarded to local PD"
}
```

---

## Appendix: Error Codes

| Code | Meaning |
|------|---------|
| `rate_limit_exceeded` | Too many submissions from this location |
| `duplicate_submission` | Similar report already submitted |
| `no_evidence` | No evidence files uploaded |
| `validation_error` | Form validation failed |
| `file_too_large` | File exceeds 50MB limit |
| `invalid_file_type` | Unsupported file format |
| `invalid_credentials` | Wrong username/password |
| `token_expired` | JWT session expired |

---

**Document End**

*For questions or support, contact the development team.*
