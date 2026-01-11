-- Migration: Add latitude and longitude to complaint table for heatmap functionality
-- This allows complaints to have their own coordinates independent of the location table
-- Run this after 003_admin_approval_system_SAFE.sql

USE `securevoice`;

-- Add coordinate columns to complaint table (remove IF NOT EXISTS as it's not supported)
-- If columns already exist, you can skip this or it will show an error (which is safe to ignore)
ALTER TABLE `complaint`
ADD COLUMN `latitude` DECIMAL(10,8) DEFAULT NULL COMMENT 'Latitude coordinate of the complaint location' AFTER `location_address`,
ADD COLUMN `longitude` DECIMAL(11,8) DEFAULT NULL COMMENT 'Longitude coordinate of the complaint location' AFTER `latitude`,
ADD COLUMN `location_accuracy_radius` INT DEFAULT NULL COMMENT 'Radius in meters for location accuracy (for approximate locations)' AFTER `longitude`;

-- Add constraints to ensure valid coordinate values (separate statements to avoid conflicts)
ALTER TABLE `complaint`
ADD CONSTRAINT `chk_complaint_latitude` CHECK ((`latitude` IS NULL OR (`latitude` >= -90 AND `latitude` <= 90)));

ALTER TABLE `complaint`
ADD CONSTRAINT `chk_complaint_longitude` CHECK ((`longitude` IS NULL OR (`longitude` >= -180 AND `longitude` <= 180)));

ALTER TABLE `complaint`
ADD CONSTRAINT `chk_complaint_accuracy_radius` CHECK ((`location_accuracy_radius` IS NULL OR `location_accuracy_radius` > 0));

-- Create index on coordinates for faster heatmap queries
CREATE INDEX `idx_complaint_coordinates` ON `complaint`(`latitude`, `longitude`);
