-- =====================================================
-- ANONYMOUS CRIME REPORTING SYSTEM SCHEMA
-- Migration: 006_anonymous_reports.sql
-- Purpose: Enable anonymous crime reporting without login
-- =====================================================

USE `securevoice`;

-- =====================================================
-- ANONYMOUS REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `anonymous_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Public tracking ID like SV-XXXXXXXX',
    `crime_type` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `incident_date` DATE NOT NULL,
    `incident_time` TIME NOT NULL,
    `location_address` VARCHAR(500) NOT NULL,
    `latitude` DECIMAL(10,8) DEFAULT NULL,
    `longitude` DECIMAL(11,8) DEFAULT NULL,
    `district_name` VARCHAR(100) DEFAULT NULL,
    `suspect_description` TEXT DEFAULT NULL,
    `additional_notes` TEXT DEFAULT NULL,
    `status` ENUM('pending', 'reviewing', 'reviewed', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
    `is_flagged` TINYINT(1) DEFAULT 0,
    `flag_reason` VARCHAR(255) DEFAULT NULL,
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` TIMESTAMP NULL,
    `reviewed_by` VARCHAR(100) DEFAULT NULL,
    `admin_notes` TEXT DEFAULT NULL,
    `ip_hash` VARCHAR(64) NOT NULL COMMENT 'SHA-256 hashed IP for rate limiting only',
    `content_hash` VARCHAR(64) DEFAULT NULL COMMENT 'For duplicate detection',
    
    INDEX `idx_report_id` (`report_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_submitted_at` (`submitted_at`),
    INDEX `idx_crime_type` (`crime_type`),
    INDEX `idx_flagged` (`is_flagged`),
    INDEX `idx_district` (`district_name`),
    INDEX `idx_ip_hash` (`ip_hash`),
    
    CONSTRAINT `fk_anonymous_reports_district` FOREIGN KEY (`district_name`) 
        REFERENCES `districts` (`district_name`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_anonymous_reports_reviewer` FOREIGN KEY (`reviewed_by`) 
        REFERENCES `admins` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- ANONYMOUS EVIDENCE FILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `anonymous_evidence` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` VARCHAR(20) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `stored_name` VARCHAR(100) NOT NULL UNIQUE,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(50) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) DEFAULT NULL,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_report` (`report_id`),
    INDEX `idx_file_type` (`file_type`),
    
    CONSTRAINT `fk_anonymous_evidence_report` FOREIGN KEY (`report_id`) 
        REFERENCES `anonymous_reports` (`report_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- RATE LIMITS TABLE (IP Hash Based)
-- =====================================================

CREATE TABLE IF NOT EXISTS `anonymous_rate_limits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_hash` VARCHAR(64) NOT NULL,
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    
    INDEX `idx_ip_hash` (`ip_hash`),
    INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- SUBMISSION HASHES TABLE (Duplicate Detection)
-- =====================================================

CREATE TABLE IF NOT EXISTS `anonymous_submission_hashes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_hash` VARCHAR(64) NOT NULL,
    `ip_hash` VARCHAR(64) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    
    INDEX `idx_content_hash` (`content_hash`),
    INDEX `idx_ip_hash` (`ip_hash`),
    INDEX `idx_expires` (`expires_at`),
    UNIQUE KEY `unique_submission` (`content_hash`, `ip_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- CLEANUP EVENT - Remove expired rate limits
-- =====================================================

DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `cleanup_anonymous_rate_limits`()
BEGIN
    DELETE FROM `anonymous_rate_limits` WHERE `expires_at` < NOW();
    DELETE FROM `anonymous_submission_hashes` WHERE `expires_at` < NOW();
END //
DELIMITER ;

-- Create event to run cleanup daily (requires event_scheduler=ON)
-- SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS `daily_anonymous_cleanup`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL cleanup_anonymous_rate_limits();

-- =====================================================
-- VIEW: Anonymous Reports Dashboard (for admin)
-- =====================================================

CREATE OR REPLACE VIEW `v_anonymous_reports_dashboard` AS
SELECT 
    ar.report_id,
    ar.crime_type,
    ar.description,
    ar.incident_date,
    ar.incident_time,
    ar.location_address,
    ar.district_name,
    ar.status,
    ar.is_flagged,
    ar.submitted_at,
    ar.reviewed_at,
    ar.reviewed_by,
    (SELECT COUNT(*) FROM anonymous_evidence ae WHERE ae.report_id = ar.report_id) AS evidence_count
FROM anonymous_reports ar
ORDER BY ar.submitted_at DESC;

-- =====================================================
-- VIEW: Anonymous Report Statistics
-- =====================================================

CREATE OR REPLACE VIEW `v_anonymous_report_stats` AS
SELECT 
    ar.crime_type,
    COUNT(*) AS total_reports,
    SUM(CASE WHEN ar.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN ar.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
    SUM(CASE WHEN ar.is_flagged = 1 THEN 1 ELSE 0 END) AS flagged_count
FROM anonymous_reports ar
GROUP BY ar.crime_type;
