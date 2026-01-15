-- Migration: Implement Secure District Admin Registration and Approval System

USE `securevoice`;

-- =============================================================================
-- 1. CREATE SUPER ADMINS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS `super_admins` (
  `super_admin_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`super_admin_id`),
  UNIQUE KEY `unique_super_admin_username` (`username`),
  UNIQUE KEY `unique_super_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 2. CREATE NORMALIZED TABLES (BEFORE MODIFYING ADMINS TABLE)
-- =============================================================================

-- 2A. Create admin_verification_tokens table (stores temporary tokens)
CREATE TABLE IF NOT EXISTS `admin_verification_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `token_type` enum('email_verification','password_reset','password_setup') NOT NULL,
  `token_value` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_username` (`admin_username`),
  KEY `idx_token_type` (`token_type`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_verification_tokens_admin` FOREIGN KEY (`admin_username`) 
    REFERENCES `admins` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2B. Create admin_approval_workflow table (stores registration approval data)
CREATE TABLE IF NOT EXISTS `admin_approval_workflow` (
  `workflow_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `status` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
  `request_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_date` timestamp NULL DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL COMMENT 'Super Admin username who approved',
  `rejection_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL COMMENT 'Additional notes from super admin',
  PRIMARY KEY (`workflow_id`),
  UNIQUE KEY `unique_admin_workflow` (`admin_username`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `fk_workflow_admin` FOREIGN KEY (`admin_username`) 
    REFERENCES `admins` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 3. MIGRATE EXISTING DATA TO NORMALIZED TABLES
-- =============================================================================

-- 3A. Migrate email verification tokens (if email_verification_token column exists)
INSERT INTO `admin_verification_tokens` 
  (`admin_username`, `token_type`, `token_value`, `expires_at`, `is_used`)
SELECT 
  `username`,
  'email_verification',
  `email_verification_token`,
  DATE_ADD(NOW(), INTERVAL 24 HOUR),
  IF(`email_verified` = 1, 1, 0)
FROM `admins`
WHERE `email_verification_token` IS NOT NULL 
  AND `email_verification_token` != ''
ON DUPLICATE KEY UPDATE token_value=token_value;

-- 3B. Migrate password reset tokens (if password_reset_token column exists)
INSERT INTO `admin_verification_tokens` 
  (`admin_username`, `token_type`, `token_value`, `expires_at`, `is_used`)
SELECT 
  `username`,
  'password_reset',
  `password_reset_token`,
  COALESCE(`password_reset_expires`, DATE_ADD(NOW(), INTERVAL 1 HOUR)),
  0
FROM `admins`
WHERE `password_reset_token` IS NOT NULL 
  AND `password_reset_token` != ''
ON DUPLICATE KEY UPDATE token_value=token_value;

-- 3C. Migrate approval workflow data (if status column exists)
INSERT INTO `admin_approval_workflow` 
  (`admin_username`, `status`, `request_date`, `approval_date`, `approved_by`, `rejection_reason`)
SELECT 
  `username`,
  COALESCE(`status`, 'approved'),
  COALESCE(`request_date`, `created_at`),
  `approval_date`,
  `approved_by`,
  `rejection_reason`
FROM `admins`
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- =============================================================================
-- 4. SAFELY DROP COLUMNS FROM ADMINS TABLE (NOW STORED IN NORMALIZED TABLES)
-- =============================================================================

-- Create stored procedure to safely drop columns
DELIMITER $$

DROP PROCEDURE IF EXISTS DropColumnIfExists$$
CREATE PROCEDURE DropColumnIfExists(
    IN tableName VARCHAR(100),
    IN columnName VARCHAR(100)
)
BEGIN
    DECLARE columnExists INT;
    
    SELECT COUNT(*) INTO columnExists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tableName
        AND COLUMN_NAME = columnName;
    
    IF columnExists > 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` DROP COLUMN `', columnName, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Drop columns that have been moved to normalized tables
CALL DropColumnIfExists('admins', 'email_verified');
CALL DropColumnIfExists('admins', 'email_verification_token');
CALL DropColumnIfExists('admins', 'password_reset_token');
CALL DropColumnIfExists('admins', 'password_reset_expires');
CALL DropColumnIfExists('admins', 'status');
CALL DropColumnIfExists('admins', 'request_date');
CALL DropColumnIfExists('admins', 'approval_date');
CALL DropColumnIfExists('admins', 'approved_by');
CALL DropColumnIfExists('admins', 'rejection_reason');

-- Clean up procedure
DROP PROCEDURE IF EXISTS DropColumnIfExists;

DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(100),
    IN columnName VARCHAR(100),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT;
    
    SELECT COUNT(*) INTO columnExists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tableName
        AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add columns that should remain in admins table (core identity data)
CALL AddColumnIfNotExists('admins', 'phone', "varchar(20) DEFAULT NULL AFTER `fullName`");
CALL AddColumnIfNotExists('admins', 'designation', "varchar(100) DEFAULT NULL COMMENT 'e.g., District Police Chief, Deputy Commissioner' AFTER `phone`");
CALL AddColumnIfNotExists('admins', 'official_id', "varchar(50) DEFAULT NULL COMMENT 'Official employee/badge ID' AFTER `designation`");
CALL AddColumnIfNotExists('admins', 'is_active', "tinyint(1) DEFAULT 0 COMMENT '1 = can login, 0 = cannot login' AFTER `district_name`");
CALL AddColumnIfNotExists('admins', 'last_login', "timestamp NULL DEFAULT NULL AFTER `dob`");

-- Clean up procedure
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- =============================================================================
-- 6. MAKE NECESSARY COLUMNS NULLABLE
-- =============================================================================
-- Make password nullable (set after approval, not during registration)
ALTER TABLE `admins` 
MODIFY COLUMN `password` VARCHAR(255) NULL DEFAULT NULL;

-- Make dob nullable (optional field)
ALTER TABLE `admins` 
MODIFY COLUMN `dob` VARCHAR(100) NULL DEFAULT NULL;

-- Make last_login nullable (no login until account is activated)
ALTER TABLE `admins` 
MODIFY COLUMN `last_login` TIMESTAMP NULL DEFAULT NULL;

-- Set default value for is_active if not already set
ALTER TABLE `admins` 
MODIFY COLUMN `is_active` TINYINT(1) DEFAULT 0 COMMENT '1 = can login, 0 = cannot login';

-- Add index if not exists (removed old FK columns)
CREATE INDEX IF NOT EXISTS `idx_admin_district` ON `admins` (`district_name`);
CREATE INDEX IF NOT EXISTS `idx_admin_is_active` ON `admins` (`is_active`);

-- =============================================================================
-- 7. CREATE ADMIN DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS `admin_documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `document_type` enum('nid','official_id','authorization_letter','photo','other') NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int DEFAULT NULL COMMENT 'File size in bytes',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `fk_admin_documents_admin` (`admin_username`),
  CONSTRAINT `fk_admin_documents_admin` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 8. CREATE ADMIN AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL COMMENT 'e.g., login, status_update, complaint_viewed',
  `action_details` text DEFAULT NULL COMMENT 'JSON or text with additional context',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `complaint_id` int DEFAULT NULL COMMENT 'Related complaint if applicable',
  `target_username` varchar(50) DEFAULT NULL COMMENT 'User affected by action',
  `result` enum('success','failure','warning') DEFAULT 'success',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_admin_username` (`admin_username`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `fk_audit_complaint` (`complaint_id`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`) ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 9. CREATE OTP VERIFICATION TABLE FOR ADMIN LOGIN
-- =============================================================================
CREATE TABLE IF NOT EXISTS `admin_otp_verification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_otp` (`admin_username`, `otp_code`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 11. UPDATE EXISTING ADMINS (SET THEM AS APPROVED IN WORKFLOW TABLE)
-- =============================================================================
-- For existing admins, ensure they have workflow entries marked as approved
INSERT INTO `admin_approval_workflow` 
  (`admin_username`, `status`, `request_date`, `approval_date`, `approved_by`)
SELECT 
  `username`,
  'approved',
  COALESCE(`created_at`, NOW()),
  NOW(),
  'system'
FROM `admins`
WHERE NOT EXISTS (
  SELECT 1 FROM `admin_approval_workflow` 
  WHERE `admin_approval_workflow`.`admin_username` = `admins`.`username`
);

-- Set all existing admins as active so they can continue working
UPDATE `admins` 
SET `is_active` = 1
WHERE `is_active` = 0 AND `username` IN (
  SELECT `admin_username` FROM `admin_approval_workflow` WHERE `status` = 'approved'
);

-- =============================================================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS `idx_admin_is_active` ON `admins` (`is_active`);
CREATE INDEX IF NOT EXISTS `idx_admin_district` ON `admins` (`district_name`);
CREATE INDEX IF NOT EXISTS `idx_workflow_status` ON `admin_approval_workflow` (`status`);
CREATE INDEX IF NOT EXISTS `idx_workflow_request_date` ON `admin_approval_workflow` (`request_date`);

