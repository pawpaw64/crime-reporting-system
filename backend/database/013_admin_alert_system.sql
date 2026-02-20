-- Admin Alert System for Super Admin Notifications
-- Tracks delayed responses to critical and high priority complaints
-- Migration 013: Admin Alert System

USE `securevoice`;

-- Create admin_alerts table to track delayed complaint responses
CREATE TABLE IF NOT EXISTS `admin_alerts` (
    `alert_id` INT NOT NULL AUTO_INCREMENT,
    `complaint_id` INT NOT NULL,
    `admin_username` VARCHAR(100) NOT NULL,
    `priority_level` ENUM('critical', 'high') NOT NULL,
    `alert_type` ENUM('no_update', 'no_resolution') DEFAULT 'no_update',
    `time_elapsed` INT NOT NULL COMMENT 'Time elapsed in minutes since complaint creation',
    `threshold_minutes` INT NOT NULL COMMENT 'Expected response time in minutes',
    `complaint_status` VARCHAR(50) NOT NULL,
    `is_resolved` TINYINT(1) DEFAULT 0 COMMENT 'Whether the alert has been resolved (complaint updated)',
    `is_acknowledged` TINYINT(1) DEFAULT 0 COMMENT 'Whether super admin has acknowledged this alert',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL,
    `acknowledged_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`alert_id`),
    KEY `idx_admin_username` (`admin_username`),
    KEY `idx_complaint_id` (`complaint_id`),
    KEY `idx_is_resolved` (`is_resolved`),
    KEY `idx_priority_level` (`priority_level`),
    KEY `idx_admin_unresolved` (`admin_username`, `is_resolved`, `created_at` DESC),
    CONSTRAINT `fk_alert_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_alert_admin` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create view for active (unresolved) alerts per admin
CREATE OR REPLACE VIEW `admin_alert_summary` AS
SELECT 
    a.username as admin_username,
    COUNT(*) as total_alerts,
    SUM(CASE WHEN aa.priority_level = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
    SUM(CASE WHEN aa.priority_level = 'high' THEN 1 ELSE 0 END) as high_alerts,
    MIN(aa.created_at) as oldest_alert,
    MAX(aa.created_at) as latest_alert
FROM admin_alerts aa
JOIN admins a ON aa.admin_username = a.username
WHERE aa.is_resolved = 0
GROUP BY a.username;

-- Create view for detailed alert information
CREATE OR REPLACE VIEW `admin_alert_details` AS
SELECT 
    aa.alert_id,
    aa.complaint_id,
    aa.admin_username,
    ad.fullName as admin_name,
    ad.email as admin_email,
    ad.district_name,
    c.complaint_type,
    c.description as complaint_description,
    c.location_address,
    c.created_at as complaint_created_at,
    aa.priority_level,
    aa.alert_type,
    aa.time_elapsed,
    aa.threshold_minutes,
    aa.complaint_status,
    aa.is_resolved,
    aa.is_acknowledged,
    aa.created_at as alert_created_at,
    aa.resolved_at,
    aa.acknowledged_at,
    u.fullName as complainant_name,
    u.username as complainant_username
FROM admin_alerts aa
JOIN admins ad ON aa.admin_username = ad.username
JOIN complaint c ON aa.complaint_id = c.complaint_id
LEFT JOIN users u ON c.username = u.username
ORDER BY aa.created_at DESC;

-- Create table to store alert configuration settings
CREATE TABLE IF NOT EXISTS `alert_config` (
    `config_id` INT NOT NULL AUTO_INCREMENT,
    `priority_level` ENUM('critical', 'high', 'medium', 'low') NOT NULL,
    `threshold_minutes` INT NOT NULL COMMENT 'Time threshold in minutes before alert is generated',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`config_id`),
    UNIQUE KEY `unique_priority_config` (`priority_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default alert configuration
INSERT INTO `alert_config` (`priority_level`, `threshold_minutes`, `is_active`) VALUES
('critical', 60, 1),  -- 1 hour for critical complaints
('high', 120, 1),     -- 2 hours for high priority complaints
('medium', 480, 0),   -- 8 hours for medium (disabled by default)
('low', 1440, 0);     -- 24 hours for low (disabled by default)

-- Create index on complaints for efficient alert checking
CREATE INDEX `idx_complaint_priority_assigned` ON `complaint` (`priority`, `admin_username`, `status`, `created_at`);

-- Create stored procedure to check and generate alerts
DELIMITER //

CREATE PROCEDURE `check_and_generate_alerts`()
BEGIN
    -- Declare variables
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_complaint_id INT;
    DECLARE v_admin_username VARCHAR(100);
    DECLARE v_priority VARCHAR(20);
    DECLARE v_status VARCHAR(50);
    DECLARE v_created_at DATETIME;
    DECLARE v_threshold_minutes INT;
    DECLARE v_time_elapsed INT;
    
    -- Cursor for critical complaints (1 hour threshold)
    DECLARE critical_cursor CURSOR FOR
        SELECT 
            c.complaint_id,
            c.admin_username,
            c.priority,
            c.status,
            c.created_at,
            ac.threshold_minutes,
            TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) as time_elapsed
        FROM complaint c
        JOIN alert_config ac ON ac.priority_level = 'critical' AND ac.is_active = 1
        WHERE c.priority = 'critical'
            AND c.admin_username IS NOT NULL
            AND c.status IN ('pending', 'verifying')
            AND TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) >= ac.threshold_minutes
            AND (c.is_discarded IS NULL OR c.is_discarded = FALSE)
            AND NOT EXISTS (
                SELECT 1 FROM admin_alerts aa 
                WHERE aa.complaint_id = c.complaint_id 
                AND aa.is_resolved = 0
            );
    
    -- Cursor for high priority complaints (2 hour threshold)
    DECLARE high_cursor CURSOR FOR
        SELECT 
            c.complaint_id,
            c.admin_username,
            c.priority,
            c.status,
            c.created_at,
            ac.threshold_minutes,
            TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) as time_elapsed
        FROM complaint c
        JOIN alert_config ac ON ac.priority_level = 'high' AND ac.is_active = 1
        WHERE c.priority = 'high'
            AND c.admin_username IS NOT NULL
            AND c.status IN ('pending', 'verifying')
            AND TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) >= ac.threshold_minutes
            AND (c.is_discarded IS NULL OR c.is_discarded = FALSE)
            AND NOT EXISTS (
                SELECT 1 FROM admin_alerts aa 
                WHERE aa.complaint_id = c.complaint_id 
                AND aa.is_resolved = 0
            );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Process critical complaints
    OPEN critical_cursor;
    critical_loop: LOOP
        FETCH critical_cursor INTO v_complaint_id, v_admin_username, v_priority, v_status, v_created_at, v_threshold_minutes, v_time_elapsed;
        IF done THEN
            LEAVE critical_loop;
        END IF;
        
        -- Insert alert
        INSERT INTO admin_alerts 
            (complaint_id, admin_username, priority_level, alert_type, time_elapsed, threshold_minutes, complaint_status)
        VALUES 
            (v_complaint_id, v_admin_username, 'critical', 'no_update', v_time_elapsed, v_threshold_minutes, v_status);
    END LOOP;
    CLOSE critical_cursor;
    
    -- Reset done flag
    SET done = FALSE;
    
    -- Process high priority complaints
    OPEN high_cursor;
    high_loop: LOOP
        FETCH high_cursor INTO v_complaint_id, v_admin_username, v_priority, v_status, v_created_at, v_threshold_minutes, v_time_elapsed;
        IF done THEN
            LEAVE high_loop;
        END IF;
        
        -- Insert alert
        INSERT INTO admin_alerts 
            (complaint_id, admin_username, priority_level, alert_type, time_elapsed, threshold_minutes, complaint_status)
        VALUES 
            (v_complaint_id, v_admin_username, 'high', 'no_update', v_time_elapsed, v_threshold_minutes, v_status);
    END LOOP;
    CLOSE high_cursor;
    
    -- Auto-resolve alerts for complaints that have been updated or resolved
    UPDATE admin_alerts aa
    JOIN complaint c ON aa.complaint_id = c.complaint_id
    SET aa.is_resolved = 1,
        aa.resolved_at = NOW()
    WHERE aa.is_resolved = 0
        AND (c.status IN ('investigating', 'resolved') OR c.is_discarded = TRUE);
        
END//

DELIMITER ;

-- Create event scheduler to run the alert check every 15 minutes
-- Note: Ensure that MySQL event scheduler is enabled (SET GLOBAL event_scheduler = ON;)
CREATE EVENT IF NOT EXISTS `check_admin_alerts_event`
ON SCHEDULE EVERY 15 MINUTE
STARTS CURRENT_TIMESTAMP
DO CALL check_and_generate_alerts();

-- Enable event scheduler (if not already enabled)
SET GLOBAL event_scheduler = ON;
