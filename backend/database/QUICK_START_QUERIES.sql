-- =====================================================================
-- QUICK START SQL QUERIES FOR ADMIN APPROVAL SYSTEM
-- =====================================================================
-- Run these queries in order to set up the new secure admin system

USE `securevoice`;

-- Make password nullable (since it's set after approval, not during registration)
ALTER TABLE admins 
MODIFY COLUMN password VARCHAR(255) NULL DEFAULT NULL;

-- Make rejection_reason nullable (only needed when status is 'rejected')
ALTER TABLE admins 
MODIFY COLUMN rejection_reason TEXT NULL DEFAULT NULL;

-- Make date of birth nullable (optional field)
ALTER TABLE admins 
MODIFY COLUMN dob VARCHAR(100) NULL DEFAULT NULL;

-- Make last_login nullable (no login until account is activated)
ALTER TABLE admins 
MODIFY COLUMN last_login TIMESTAMP NULL DEFAULT NULL;

-- If you have these fields, make them nullable as well:
ALTER TABLE admins 
MODIFY COLUMN approved_by INT NULL DEFAULT NULL;

ALTER TABLE admins 
MODIFY COLUMN approved_date TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE admins 
MODIFY COLUMN email_verified TINYINT(1) NULL DEFAULT 0;

ALTER TABLE admins 
MODIFY COLUMN email_verification_token VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE admins 
MODIFY COLUMN password_setup_token VARCHAR(255) NULL DEFAULT NULL;

-- Set default value for status if not already set
ALTER TABLE admins 
MODIFY COLUMN status ENUM('pending','approved','rejected','suspended') DEFAULT 'pending';

-- Set default value for is_active if not already set
ALTER TABLE admins 
MODIFY COLUMN is_active TINYINT(1) DEFAULT 0;

-- =====================================================================
-- STEP 1: CREATE SUPER ADMIN ACCOUNT
-- =====================================================================
-- First, generate a hashed password using Node.js:
-- const bcrypt = require('bcryptjs');
-- console.log(bcrypt.hashSync('YourPasswordHere', 10));

-- Replace the password hash below with your generated hash
INSERT INTO `super_admins` (`username`, `email`, `password`, `fullName`, `is_active`) 
VALUES (
  'superadmin', 
  'superadmin@crime.gov.bd', 
  '$2b$10$YourHashedPasswordHere',  -- REPLACE THIS WITH YOUR ACTUAL HASH
  'System Super Administrator', 
  1
) ON DUPLICATE KEY UPDATE username=username;

-- =====================================================================
-- STEP 2: UPDATE EXISTING ADMINS (IF ANY)
-- =====================================================================
-- This automatically approves any existing admins so they can continue working
UPDATE `admins` 
SET `status` = 'approved', 
    `is_active` = 1, 
    `email_verified` = 1,
    `approval_date` = CURRENT_TIMESTAMP,
    `approved_by` = 'system',
    `password` = NULL  -- They will need to set a new password
WHERE (`status` IS NULL OR `status` = 'pending') 
   OR `password` IS NOT NULL;  -- Existing admins with passwords

-- =====================================================================
-- STEP 3: VERIFY INSTALLATION
-- =====================================================================
-- Check if all tables were created
SHOW TABLES LIKE '%admin%';

-- Check super_admins table structure
DESC super_admins;

-- Check admins table has new columns
DESC admins;

-- Check audit logs table
DESC admin_audit_logs;

-- Check OTP table
DESC admin_otp_verification;

-- Check documents table
DESC admin_documents;

-- =====================================================================
-- STEP 4: VIEW DATA
-- =====================================================================
-- View super admins
SELECT super_admin_id, username, email, fullName, is_active, created_at 
FROM super_admins;

-- View all admin requests
SELECT adminid, username, email, fullName, district_name, status, is_active, 
       request_date, approval_date, approved_by 
FROM admins 
ORDER BY request_date DESC;

-- View pending requests
SELECT adminid, username, email, fullName, district_name, designation, 
       official_id, phone, request_date 
FROM admins 
WHERE status = 'pending'
ORDER BY request_date DESC;

-- =====================================================================
-- OPTIONAL: SAMPLE DATA FOR TESTING
-- =====================================================================

-- Insert a test pending admin request
INSERT INTO `admins` (
    username, email, fullName, phone, designation, official_id, 
    district_name, status, is_active, request_date
) VALUES (
    'testadmin1', 
    'testadmin@example.com', 
    'Test Admin Officer', 
    '01712345678', 
    'Deputy Commissioner', 
    'DC-2024-001', 
    'Dhaka', 
    'pending', 
    0, 
    NOW()
);

-- =====================================================================
-- USEFUL QUERIES FOR SUPER ADMIN
-- =====================================================================

-- Approve an admin (manual approval without email)
UPDATE admins 
SET status = 'approved', 
    is_active = 1,
    approval_date = NOW(),
    approved_by = 'superadmin'
WHERE username = 'testadmin1';

-- Reject an admin
UPDATE admins 
SET status = 'rejected', 
    rejection_reason = 'Insufficient credentials',
    approval_date = NOW(),
    approved_by = 'superadmin'
WHERE username = 'testadmin1';

-- Suspend an admin
UPDATE admins 
SET status = 'suspended', 
    is_active = 0,
    rejection_reason = 'Policy violation'
WHERE username = 'testadmin1';

-- Reactivate an admin
UPDATE admins 
SET status = 'approved', 
    is_active = 1,
    rejection_reason = NULL
WHERE username = 'testadmin1';

-- =====================================================================
-- AUDIT LOG QUERIES
-- =====================================================================

-- View recent audit logs
SELECT log_id, admin_username, action, result, timestamp, ip_address
FROM admin_audit_logs 
ORDER BY timestamp DESC 
LIMIT 50;

-- View logs for specific admin
SELECT log_id, action, action_details, result, timestamp, ip_address
FROM admin_audit_logs 
WHERE admin_username = 'your_admin_username'
ORDER BY timestamp DESC;

-- View failed login attempts
SELECT log_id, admin_username, action_details, timestamp, ip_address
FROM admin_audit_logs 
WHERE action = 'login_attempt' AND result = 'failure'
ORDER BY timestamp DESC;

-- Count actions by admin
SELECT admin_username, COUNT(*) as action_count
FROM admin_audit_logs 
GROUP BY admin_username
ORDER BY action_count DESC;

-- =====================================================================
-- CLEANUP QUERIES (USE WITH CAUTION)
-- =====================================================================

-- Delete expired OTPs
DELETE FROM admin_otp_verification 
WHERE expires_at < NOW() OR is_used = 1;

-- Delete old audit logs (older than 90 days)
DELETE FROM admin_audit_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Clear password reset tokens (expired)
UPDATE admins 
SET password_reset_token = NULL, 
    password_reset_expires = NULL
WHERE password_reset_expires < NOW();

-- =====================================================================
-- STATISTICS QUERIES
-- =====================================================================

-- Admin status summary
SELECT 
    status, 
    COUNT(*) as count,
    SUM(is_active) as active_count
FROM admins 
GROUP BY status;

-- Admins by district
SELECT 
    district_name, 
    COUNT(*) as admin_count,
    SUM(CASE WHEN status = 'approved' AND is_active = 1 THEN 1 ELSE 0 END) as active_admins
FROM admins 
GROUP BY district_name;

-- Recent activity summary (last 7 days)
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as actions,
    COUNT(DISTINCT admin_username) as unique_admins
FROM admin_audit_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- =====================================================================
-- END OF QUICK START QUERIES
-- =====================================================================
