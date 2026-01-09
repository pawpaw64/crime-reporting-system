-- =====================================================
-- ANONYMOUS REPORTS ADMIN ASSIGNMENT
-- Migration: 007_anonymous_admin_assignment.sql
-- Purpose: Add admin assignment to anonymous reports for location-based routing
-- =====================================================

USE `securevoice`;

-- Add assigned_admin column to anonymous_reports if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'securevoice' 
    AND TABLE_NAME = 'anonymous_reports' 
    AND COLUMN_NAME = 'assigned_admin'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE anonymous_reports ADD COLUMN assigned_admin VARCHAR(100) DEFAULT NULL AFTER district_name, ADD INDEX idx_assigned_admin (assigned_admin), ADD CONSTRAINT fk_anonymous_reports_assigned_admin FOREIGN KEY (assigned_admin) REFERENCES admins(username) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Column assigned_admin already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing reports to assign admins based on district
UPDATE anonymous_reports ar
LEFT JOIN admins a ON ar.district_name = a.district_name
SET ar.assigned_admin = a.username
WHERE ar.assigned_admin IS NULL 
AND ar.district_name IS NOT NULL
AND a.username IS NOT NULL;

SELECT 'Migration 007 completed: Admin assignment column added to anonymous_reports' AS status;
