-- =====================================================
-- MIGRATION: 011_increase_location_name_size.sql
-- Purpose: Increase location_name field size to handle long addresses
-- Issue: Auto location button generates long address strings that exceed VARCHAR(100)
-- Solution: Change location_name from VARCHAR(100) to TEXT
-- =====================================================

USE `securevoice`;

-- Increase location_name field size in location table
ALTER TABLE `location` 
MODIFY COLUMN `location_name` TEXT DEFAULT NULL 
COMMENT 'Full address string, can be very long from geocoding services';

-- Add index on first 255 characters for performance (TEXT can't have full index)
-- First drop existing index if any
DROP INDEX IF EXISTS `idx_location_name` ON `location`;

-- Create new index on first 255 characters
CREATE INDEX `idx_location_name` ON `location` (`location_name`(255));

-- Note: Existing data is preserved during ALTER TABLE MODIFY COLUMN operation
-- This migration is safe to run on production databases

SELECT 'Migration 011: Location name field increased to TEXT' AS status;
