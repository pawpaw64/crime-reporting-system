-- Add tracking token to complaints table for QR code tracking
-- Migration: 010_add_tracking_token.sql

USE `securevoice`;

-- Add tracking_token column to complaint table
ALTER TABLE `complaint`
ADD COLUMN `tracking_token` VARCHAR(100) UNIQUE NULL AFTER `complaint_id`,
ADD INDEX `idx_tracking_token` (`tracking_token`);

-- Update existing complaints with unique tracking tokens (UUID format)
UPDATE `complaint`
SET `tracking_token` = CONCAT(
    SUBSTRING(MD5(RAND()), 1, 8), '-',
    SUBSTRING(MD5(RAND()), 1, 4), '-',
    SUBSTRING(MD5(RAND()), 1, 4), '-',
    SUBSTRING(MD5(RAND()), 1, 4), '-',
    SUBSTRING(MD5(RAND()), 1, 12)
)
WHERE `tracking_token` IS NULL;
