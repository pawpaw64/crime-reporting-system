-- =====================================================
-- FULL DATABASE NORMALIZATION TO 3NF
-- Migration: 009_3nf_normalization.sql
-- Purpose: Transform database to Third Normal Form (3NF)
-- =====================================================


USE `securevoice`;

-- =============================================================================
-- STEP 1: CREATE NORMALIZED ADDRESS HIERARCHY TABLES
-- =============================================================================

-- 1A. Divisions Table (Top level of address hierarchy)
CREATE TABLE IF NOT EXISTS `divisions` (
    `division_id` INT AUTO_INCREMENT PRIMARY KEY,
    `division_name` VARCHAR(100) NOT NULL,
    `division_name_bn` VARCHAR(100) DEFAULT NULL COMMENT 'Bengali name',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_division_name` (`division_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 1B. Update Districts Table (Link to Divisions)
-- First check if division_id column exists
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'districts' 
    AND COLUMN_NAME = 'division_id'
);

SET @add_division_id = IF(@col_exists = 0,
    'ALTER TABLE districts ADD COLUMN division_id INT DEFAULT NULL AFTER district_name',
    'SELECT "division_id column already exists in districts"'
);
PREPARE stmt FROM @add_division_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1C. Police Stations Table (Normalized from users table)
CREATE TABLE IF NOT EXISTS `police_stations` (
    `police_station_id` INT AUTO_INCREMENT PRIMARY KEY,
    `police_station_name` VARCHAR(150) NOT NULL,
    `police_station_name_bn` VARCHAR(150) DEFAULT NULL COMMENT 'Bengali name',
    `district_name` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `address` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_district` (`district_name`),
    CONSTRAINT `fk_police_station_district` FOREIGN KEY (`district_name`) 
        REFERENCES `districts` (`district_name`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 1D. Unions Table (Administrative unit under police station)
CREATE TABLE IF NOT EXISTS `unions` (
    `union_id` INT AUTO_INCREMENT PRIMARY KEY,
    `union_name` VARCHAR(150) NOT NULL,
    `union_name_bn` VARCHAR(150) DEFAULT NULL COMMENT 'Bengali name',
    `police_station_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_police_station` (`police_station_id`),
    CONSTRAINT `fk_union_police_station` FOREIGN KEY (`police_station_id`) 
        REFERENCES `police_stations` (`police_station_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 1E. Villages Table (Lowest level of address hierarchy)
CREATE TABLE IF NOT EXISTS `villages` (
    `village_id` INT AUTO_INCREMENT PRIMARY KEY,
    `village_name` VARCHAR(150) NOT NULL,
    `village_name_bn` VARCHAR(150) DEFAULT NULL COMMENT 'Bengali name',
    `union_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_union` (`union_id`),
    CONSTRAINT `fk_village_union` FOREIGN KEY (`union_id`) 
        REFERENCES `unions` (`union_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- STEP 2: CREATE USER ADDRESS TABLE (NORMALIZED FROM USERS)
-- =============================================================================

-- User addresses table - separates address data from user identity
CREATE TABLE IF NOT EXISTS `user_addresses` (
    `address_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `division_id` INT DEFAULT NULL,
    `district_name` VARCHAR(100) DEFAULT NULL,
    `police_station_id` INT DEFAULT NULL,
    `union_id` INT DEFAULT NULL,
    `village_id` INT DEFAULT NULL,
    `place_details` TEXT DEFAULT NULL,
    `is_primary` TINYINT(1) DEFAULT 1 COMMENT '1 = Primary address',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_username` (`username`),
    KEY `idx_district` (`district_name`),
    CONSTRAINT `fk_user_address_user` FOREIGN KEY (`username`) 
        REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_user_address_division` FOREIGN KEY (`division_id`) 
        REFERENCES `divisions` (`division_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_user_address_district` FOREIGN KEY (`district_name`) 
        REFERENCES `districts` (`district_name`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_user_address_police_station` FOREIGN KEY (`police_station_id`) 
        REFERENCES `police_stations` (`police_station_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_user_address_union` FOREIGN KEY (`union_id`) 
        REFERENCES `unions` (`union_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_user_address_village` FOREIGN KEY (`village_id`) 
        REFERENCES `villages` (`village_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- STEP 3: NORMALIZE CRIME TYPES (FOR BOTH COMPLAINT AND ANONYMOUS_REPORTS)
-- =============================================================================

-- Update category table to be comprehensive crime types table
-- Add crime_code for standardization
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'category' 
    AND COLUMN_NAME = 'crime_code'
);

SET @add_crime_code = IF(@col_exists = 0,
    'ALTER TABLE category ADD COLUMN crime_code VARCHAR(50) DEFAULT NULL AFTER category_id, ADD UNIQUE KEY unique_crime_code (crime_code)',
    'SELECT "crime_code column already exists"'
);
PREPARE stmt FROM @add_crime_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert standard crime types (if not already exists)
INSERT IGNORE INTO `category` (`name`, `crime_code`, `description`) VALUES
('Theft', 'THEFT', 'Property theft and burglary cases'),
('Assault', 'ASSAULT', 'Physical assault and battery cases'),
('Fraud', 'FRAUD', 'Financial fraud and scam cases'),
('Harassment', 'HARASSMENT', 'Harassment and intimidation cases'),
('Threat', 'THREAT', 'Threatening behavior and verbal threats'),
('Vandalism', 'VANDALISM', 'Property destruction and vandalism'),
('Drug Related', 'DRUG_RELATED', 'Drug trafficking and substance abuse'),
('Cybercrime', 'CYBERCRIME', 'Online fraud, hacking, and digital crimes'),
('Domestic Violence', 'DOMESTIC_VIOLENCE', 'Domestic and family violence'),
('Corruption', 'CORRUPTION', 'Bribery and corrupt practices'),
('Human Trafficking', 'HUMAN_TRAFFICKING', 'Human trafficking and exploitation'),
('Environmental', 'ENVIRONMENTAL', 'Environmental crimes and pollution'),
('Organized Crime', 'ORGANIZED_CRIME', 'Gang and organized criminal activity'),
('Public Safety', 'PUBLIC_SAFETY', 'Public safety and order violations'),
('Traffic Violation', 'TRAFFIC_VIOLATION', 'Traffic and road safety violations'),
('Other', 'OTHER', 'Other types of complaints not covered above');

-- Update crime codes for existing categories
UPDATE category SET crime_code = UPPER(REPLACE(name, ' ', '_')) WHERE crime_code IS NULL;

-- =============================================================================
-- STEP 4: ADD CATEGORY_ID TO ANONYMOUS_REPORTS (NORMALIZE CRIME_TYPE)
-- =============================================================================

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'anonymous_reports' 
    AND COLUMN_NAME = 'category_id'
);

SET @add_category_id = IF(@col_exists = 0,
    'ALTER TABLE anonymous_reports ADD COLUMN category_id INT DEFAULT NULL AFTER crime_type, ADD KEY idx_category (category_id), ADD CONSTRAINT fk_anonymous_category FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "category_id column already exists in anonymous_reports"'
);
PREPARE stmt FROM @add_category_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate existing crime_type string values to category_id
UPDATE anonymous_reports ar
JOIN category c ON LOWER(REPLACE(c.name, ' ', '_')) = LOWER(ar.crime_type)
   OR LOWER(c.crime_code) = LOWER(ar.crime_type)
   OR LOWER(c.name) = LOWER(ar.crime_type)
SET ar.category_id = c.category_id
WHERE ar.category_id IS NULL;

-- Set 'Other' category for unmatched crime types
UPDATE anonymous_reports ar
JOIN category c ON c.crime_code = 'OTHER'
SET ar.category_id = c.category_id
WHERE ar.category_id IS NULL AND ar.crime_type IS NOT NULL;

-- =============================================================================
-- STEP 5: POPULATE DIVISIONS TABLE WITH BANGLADESH DIVISIONS
-- =============================================================================

INSERT IGNORE INTO `divisions` (`division_name`, `division_name_bn`) VALUES
('Dhaka', 'ঢাকা'),
('Chittagong', 'চট্টগ্রাম'),
('Rajshahi', 'রাজশাহী'),
('Khulna', 'খুলনা'),
('Barishal', 'বরিশাল'),
('Sylhet', 'সিলেট'),
('Rangpur', 'রংপুর'),
('Mymensingh', 'ময়মনসিংহ');

-- Link existing districts to divisions (approximate based on Bangladesh geography)
UPDATE districts SET division_id = (SELECT division_id FROM divisions WHERE division_name = 'Dhaka') 
WHERE district_name = 'Dhaka';
UPDATE districts SET division_id = (SELECT division_id FROM divisions WHERE division_name = 'Rajshahi') 
WHERE district_name = 'Rajshahi';
UPDATE districts SET division_id = (SELECT division_id FROM divisions WHERE division_name = 'Khulna') 
WHERE district_name = 'Khulna';
UPDATE districts SET division_id = (SELECT division_id FROM divisions WHERE division_name = 'Sylhet') 
WHERE district_name = 'Sylhet';
UPDATE districts SET division_id = (SELECT division_id FROM divisions WHERE division_name = 'Barishal') 
WHERE district_name = 'Barishal';

-- =============================================================================
-- STEP 6: MIGRATE EXISTING USER ADDRESS DATA TO NORMALIZED TABLE
-- =============================================================================

-- Migrate existing user addresses to the new table
INSERT INTO user_addresses (username, district_name, place_details, is_primary)
SELECT 
    username,
    district,
    place_details,
    1
FROM users 
WHERE (district IS NOT NULL OR place_details IS NOT NULL)
AND username NOT IN (SELECT username FROM user_addresses)
ON DUPLICATE KEY UPDATE district_name = VALUES(district_name);

-- =============================================================================
-- STEP 7: CREATE COMPATIBILITY VIEWS (MAINTAINS BACKWARD COMPATIBILITY)
-- =============================================================================

-- View: Users with full address (maintains backward compatibility)
CREATE OR REPLACE VIEW `v_users_with_address` AS
SELECT 
    u.userid,
    u.username,
    u.email,
    u.fullName,
    u.name_bn,
    u.father_name,
    u.mother_name,
    u.face_image,
    u.phone,
    u.nid,
    u.dob,
    u.age,
    u.is_verified,
    u.is_nid_verified,
    u.is_face_verified,
    u.created_at,
    -- Address fields from normalized table (or original columns as fallback)
    COALESCE(d.division_name, u.division) as division,
    COALESCE(ua.district_name, u.district) as district,
    COALESCE(ps.police_station_name, u.police_station) as police_station,
    COALESCE(un.union_name, u.union_name) as union_name,
    COALESCE(v.village_name, u.village) as village,
    COALESCE(ua.place_details, u.place_details) as place_details,
    u.location
FROM users u
LEFT JOIN user_addresses ua ON u.username = ua.username AND ua.is_primary = 1
LEFT JOIN divisions d ON ua.division_id = d.division_id
LEFT JOIN police_stations ps ON ua.police_station_id = ps.police_station_id
LEFT JOIN unions un ON ua.union_id = un.union_id
LEFT JOIN villages v ON ua.village_id = v.village_id;

-- View: Complaints with category name (maintains backward compatibility)
CREATE OR REPLACE VIEW `v_complaints_full` AS
SELECT 
    c.complaint_id,
    c.description,
    c.created_at,
    c.status,
    c.username,
    c.admin_username,
    c.location_id,
    COALESCE(cat.name, c.complaint_type) as complaint_type,
    c.location_address,
    c.category_id,
    cat.name as category_name,
    cat.crime_code,
    c.latitude,
    c.longitude,
    c.location_accuracy_radius,
    c.is_discarded,
    c.discarded_at,
    c.discarded_by,
    l.location_name,
    l.district_name as location_district,
    u.fullName as complainant_name,
    u.phone as complainant_phone,
    a.fullName as admin_name
FROM complaint c
LEFT JOIN category cat ON c.category_id = cat.category_id
LEFT JOIN location l ON c.location_id = l.location_id
LEFT JOIN users u ON c.username = u.username
LEFT JOIN admins a ON c.admin_username = a.username;

-- View: Anonymous reports with category name (maintains backward compatibility)
CREATE OR REPLACE VIEW `v_anonymous_reports_full` AS
SELECT 
    ar.id,
    ar.report_id,
    COALESCE(cat.name, ar.crime_type) as crime_type,
    ar.category_id,
    cat.name as category_name,
    cat.crime_code,
    ar.description,
    ar.incident_date,
    ar.incident_time,
    ar.location_address,
    ar.latitude,
    ar.longitude,
    ar.district_name,
    ar.assigned_admin,
    ar.suspect_description,
    ar.additional_notes,
    ar.status,
    ar.is_flagged,
    ar.flag_reason,
    ar.submitted_at,
    ar.reviewed_at,
    ar.reviewed_by,
    ar.admin_notes,
    a.fullName as assigned_admin_name,
    ra.fullName as reviewer_name
FROM anonymous_reports ar
LEFT JOIN category cat ON ar.category_id = cat.category_id
LEFT JOIN admins a ON ar.assigned_admin = a.username
LEFT JOIN admins ra ON ar.reviewed_by = ra.username;

-- View: Address hierarchy lookup
CREATE OR REPLACE VIEW `v_address_hierarchy` AS
SELECT 
    d.division_id,
    d.division_name,
    d.division_name_bn,
    dt.district_id,
    dt.district_name,
    ps.police_station_id,
    ps.police_station_name,
    ps.police_station_name_bn,
    u.union_id,
    u.union_name,
    u.union_name_bn,
    v.village_id,
    v.village_name,
    v.village_name_bn
FROM divisions d
LEFT JOIN districts dt ON dt.division_id = d.division_id
LEFT JOIN police_stations ps ON ps.district_name = dt.district_name
LEFT JOIN unions u ON u.police_station_id = ps.police_station_id
LEFT JOIN villages v ON v.union_id = u.union_id;

-- =============================================================================
-- STEP 8: CREATE HELPER STORED PROCEDURES
-- =============================================================================

DELIMITER //

-- Procedure: Get or create category by name/code
DROP PROCEDURE IF EXISTS GetOrCreateCategory//
CREATE PROCEDURE GetOrCreateCategory(
    IN p_category_name VARCHAR(100),
    OUT p_category_id INT
)
BEGIN
    -- Try to find by name (case-insensitive)
    SELECT category_id INTO p_category_id 
    FROM category 
    WHERE LOWER(name) = LOWER(p_category_name) 
       OR LOWER(crime_code) = LOWER(REPLACE(p_category_name, ' ', '_'))
    LIMIT 1;
    
    -- If not found, insert new category
    IF p_category_id IS NULL THEN
        INSERT INTO category (name, crime_code, description)
        VALUES (p_category_name, UPPER(REPLACE(p_category_name, ' ', '_')), CONCAT('Category: ', p_category_name));
        SET p_category_id = LAST_INSERT_ID();
    END IF;
END//

-- Procedure: Get division ID by name
DROP PROCEDURE IF EXISTS GetDivisionId//
CREATE PROCEDURE GetDivisionId(
    IN p_division_name VARCHAR(100),
    OUT p_division_id INT
)
BEGIN
    SELECT division_id INTO p_division_id 
    FROM divisions 
    WHERE LOWER(division_name) = LOWER(p_division_name)
    LIMIT 1;
END//

DELIMITER ;

-- =============================================================================
-- STEP 9: ADD INDEXES FOR PERFORMANCE (silently ignore if already exists)
-- =============================================================================

-- Note: Using stored procedure to safely create indexes
DELIMITER //
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists//
CREATE PROCEDURE CreateIndexIfNotExists(
    IN p_table VARCHAR(100),
    IN p_index VARCHAR(100),
    IN p_column VARCHAR(100)
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    SELECT COUNT(*) INTO indexExists FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index;
    IF indexExists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index, ' ON ', p_table, '(', p_column, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

CALL CreateIndexIfNotExists('user_addresses', 'idx_user_addresses_primary', 'is_primary');
CALL CreateIndexIfNotExists('category', 'idx_category_crime_code', 'crime_code');
CALL CreateIndexIfNotExists('police_stations', 'idx_police_stations_name', 'police_station_name');
CALL CreateIndexIfNotExists('unions', 'idx_unions_name', 'union_name');
CALL CreateIndexIfNotExists('villages', 'idx_villages_name', 'village_name');
CALL CreateIndexIfNotExists('divisions', 'idx_divisions_name', 'division_name');

DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;


SELECT '3NF Normalization migration completed successfully!' AS status;
