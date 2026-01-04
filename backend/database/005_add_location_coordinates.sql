-- Migration: Add latitude and longitude to location table
-- Run this if your location table doesn't have coordinate columns

USE `securevoice`;

-- Add latitude column to location table
ALTER TABLE `location`
ADD COLUMN `latitude` DECIMAL(10,8) DEFAULT NULL COMMENT 'Latitude coordinate of the location';

-- Add longitude column to location table  
ALTER TABLE `location`
ADD COLUMN `longitude` DECIMAL(11,8) DEFAULT NULL COMMENT 'Longitude coordinate of the location';

-- Add accuracy_radius column to location table
ALTER TABLE `location`
ADD COLUMN `accuracy_radius` INT DEFAULT NULL COMMENT 'Radius in meters for location accuracy';

-- Add constraints for valid coordinate values
ALTER TABLE `location`
ADD CONSTRAINT `chk_location_latitude` CHECK ((`latitude` IS NULL OR (`latitude` >= -90 AND `latitude` <= 90)));

ALTER TABLE `location`
ADD CONSTRAINT `chk_location_longitude` CHECK ((`longitude` IS NULL OR (`longitude` >= -180 AND `longitude` <= 180)));

ALTER TABLE `location`
ADD CONSTRAINT `chk_location_accuracy_radius` CHECK ((`accuracy_radius` IS NULL OR `accuracy_radius` > 0));

-- Verify columns were added
SELECT 'Migration complete!' AS message;
DESCRIBE location;
