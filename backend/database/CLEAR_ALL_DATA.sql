-- =====================================================
-- CLEAR ALL DATA SCRIPT
-- Purpose: Remove all demo/test data while keeping schema and reference data
-- Usage: mysql -u root -p securevoice < CLEAR_ALL_DATA.sql
-- =====================================================

USE `securevoice`;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. CLEAR COMPLAINT RELATED DATA
-- =====================================================
DELETE FROM `complaint_notifications` WHERE 1=1;
DELETE FROM `complaint_chat` WHERE 1=1;
DELETE FROM `status_updates` WHERE 1=1;
DELETE FROM `evidence` WHERE 1=1;
DELETE FROM `admin_cases` WHERE 1=1;
DELETE FROM `complaint` WHERE 1=1;

-- =====================================================
-- 2. CLEAR ANONYMOUS REPORTS DATA
-- =====================================================
DELETE FROM `anonymous_evidence` WHERE 1=1;
DELETE FROM `anonymous_rate_limits` WHERE 1=1;
DELETE FROM `anonymous_submission_hashes` WHERE 1=1;
DELETE FROM `anonymous_reports` WHERE 1=1;

-- =====================================================
-- 3. CLEAR ADMIN RELATED DATA
-- =====================================================
DELETE FROM `admin_settings` WHERE 1=1;
DELETE FROM `admin_verification_tokens` WHERE 1=1;
DELETE FROM `admin_approval_workflow` WHERE 1=1;
DELETE FROM `admins` WHERE 1=1;

-- =====================================================
-- 4. CLEAR SUPER ADMIN DATA
-- =====================================================
DELETE FROM `super_admins` WHERE 1=1;

-- =====================================================
-- 5. CLEAR USER DATA
-- =====================================================
DELETE FROM `users` WHERE 1=1;

-- =====================================================
-- 6. CLEAR LOCATION DATA
-- =====================================================
DELETE FROM `location` WHERE 1=1;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 7. RESET AUTO INCREMENT VALUES
-- =====================================================
ALTER TABLE `complaint` AUTO_INCREMENT = 1;
ALTER TABLE `evidence` AUTO_INCREMENT = 1;
ALTER TABLE `admin_cases` AUTO_INCREMENT = 1;
ALTER TABLE `complaint_chat` AUTO_INCREMENT = 1;
ALTER TABLE `complaint_notifications` AUTO_INCREMENT = 1;
ALTER TABLE `status_updates` AUTO_INCREMENT = 1;
ALTER TABLE `location` AUTO_INCREMENT = 1;
ALTER TABLE `anonymous_reports` AUTO_INCREMENT = 1;
ALTER TABLE `anonymous_evidence` AUTO_INCREMENT = 1;

-- =====================================================
-- DONE! Database cleared successfully
-- =====================================================
SELECT 'All data cleared successfully!' AS Result;
SELECT 'Run the following to create a new super admin:' AS Next_Step;
SELECT 'node scripts/create-super-admin.js' AS Command;




---