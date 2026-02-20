-- Priority System for Complaints
-- Add priority level to complaints based on crime severity
-- Migration 012: Add Priority System

USE `securevoice`;

-- Add priority column to complaint table
ALTER TABLE `complaint` 
ADD COLUMN `priority` ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium' AFTER `status`,
ADD COLUMN `priority_keywords_matched` TEXT NULL COMMENT 'Keywords that triggered the priority level' AFTER `priority`;

-- Add priority column to anonymous_reports table
ALTER TABLE `anonymous_reports` 
ADD COLUMN `priority` ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium' AFTER `status`,
ADD COLUMN `priority_keywords_matched` TEXT NULL COMMENT 'Keywords that triggered the priority level' AFTER `priority`;

-- Create index for priority-based sorting (for efficient queries)
CREATE INDEX `idx_complaint_priority` ON `complaint` (`priority`, `created_at` DESC);
CREATE INDEX `idx_complaint_priority_status` ON `complaint` (`priority`, `status`, `created_at` DESC);

CREATE INDEX `idx_anon_priority` ON `anonymous_reports` (`priority`, `submitted_at` DESC);
CREATE INDEX `idx_anon_priority_status` ON `anonymous_reports` (`priority`, `status`, `submitted_at` DESC);

-- Create priority keywords reference table for admin configuration
CREATE TABLE IF NOT EXISTS `priority_keywords` (
    `keyword_id` INT NOT NULL AUTO_INCREMENT,
    `keyword` VARCHAR(100) NOT NULL,
    `priority_level` ENUM('critical', 'high', 'medium', 'low') NOT NULL,
    `category` VARCHAR(100) DEFAULT NULL COMMENT 'Optional crime category association',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`keyword_id`),
    UNIQUE KEY `unique_keyword` (`keyword`),
    INDEX `idx_priority_level` (`priority_level`),
    INDEX `idx_active_keywords` (`is_active`, `priority_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default priority keywords

-- CRITICAL priority keywords (life-threatening situations)
INSERT INTO `priority_keywords` (`keyword`, `priority_level`, `category`) VALUES
('murder', 'critical', 'violent_crime'),
('homicide', 'critical', 'violent_crime'),
('killing', 'critical', 'violent_crime'),
('killed', 'critical', 'violent_crime'),
('kidnap', 'critical', 'violent_crime'),
('kidnapping', 'critical', 'violent_crime'),
('kidnapped', 'critical', 'violent_crime'),
('abduction', 'critical', 'violent_crime'),
('abducted', 'critical', 'violent_crime'),
('hostage', 'critical', 'violent_crime'),
('terrorism', 'critical', 'terrorism'),
('terrorist', 'critical', 'terrorism'),
('bomb', 'critical', 'terrorism'),
('bombing', 'critical', 'terrorism'),
('explosive', 'critical', 'terrorism'),
('mass shooting', 'critical', 'violent_crime'),
('shooting', 'critical', 'violent_crime'),
('shot', 'critical', 'violent_crime'),
('gunfire', 'critical', 'violent_crime'),
('child abuse', 'critical', 'abuse'),
('rape', 'critical', 'sexual_crime'),
('sexual assault', 'critical', 'sexual_crime'),
('molestation', 'critical', 'sexual_crime'),
('human trafficking', 'critical', 'trafficking'),
('trafficking', 'critical', 'trafficking'),
('arson', 'critical', 'violent_crime'),
('stabbing', 'critical', 'violent_crime'),
('stabbed', 'critical', 'violent_crime');

-- HIGH priority keywords (serious crimes requiring urgent attention)
INSERT INTO `priority_keywords` (`keyword`, `priority_level`, `category`) VALUES
('assault', 'high', 'violent_crime'),
('attacked', 'high', 'violent_crime'),
('attack', 'high', 'violent_crime'),
('beaten', 'high', 'violent_crime'),
('beating', 'high', 'violent_crime'),
('robbery', 'high', 'property_crime'),
('armed robbery', 'high', 'property_crime'),
('burglary', 'high', 'property_crime'),
('home invasion', 'high', 'property_crime'),
('domestic violence', 'high', 'abuse'),
('abuse', 'high', 'abuse'),
('threatening', 'high', 'threat'),
('death threat', 'high', 'threat'),
('weapon', 'high', 'weapon'),
('gun', 'high', 'weapon'),
('knife attack', 'high', 'weapon'),
('armed', 'high', 'weapon'),
('extortion', 'high', 'financial_crime'),
('blackmail', 'high', 'financial_crime'),
('ransom', 'high', 'financial_crime'),
('drug dealer', 'high', 'drug_crime'),
('drug dealing', 'high', 'drug_crime'),
('narcotics', 'high', 'drug_crime'),
('gang', 'high', 'organized_crime'),
('gang violence', 'high', 'organized_crime'),
('stalking', 'high', 'harassment'),
('stalker', 'high', 'harassment');

-- MEDIUM priority keywords (standard crimes - default level)
INSERT INTO `priority_keywords` (`keyword`, `priority_level`, `category`) VALUES
('theft', 'medium', 'property_crime'),
('stolen', 'medium', 'property_crime'),
('fraud', 'medium', 'financial_crime'),
('scam', 'medium', 'financial_crime'),
('harassment', 'medium', 'harassment'),
('vandalism', 'medium', 'property_crime'),
('trespassing', 'medium', 'property_crime'),
('break-in', 'medium', 'property_crime'),
('cybercrime', 'medium', 'cyber_crime'),
('hacking', 'medium', 'cyber_crime'),
('identity theft', 'medium', 'financial_crime'),
('corruption', 'medium', 'corruption'),
('bribery', 'medium', 'corruption');

-- LOW priority keywords (minor incidents)
INSERT INTO `priority_keywords` (`keyword`, `priority_level`, `category`) VALUES
('noise complaint', 'low', 'nuisance'),
('parking', 'low', 'traffic'),
('littering', 'low', 'nuisance'),
('jaywalking', 'low', 'traffic'),
('loitering', 'low', 'nuisance'),
('minor dispute', 'low', 'civil');

-- View to show priority distribution for analytics
CREATE OR REPLACE VIEW `complaint_priority_summary` AS
SELECT 
    priority,
    status,
    COUNT(*) as count
FROM complaint
WHERE is_discarded IS NULL OR is_discarded = FALSE
GROUP BY priority, status
ORDER BY 
    FIELD(priority, 'critical', 'high', 'medium', 'low'),
    FIELD(status, 'pending', 'verifying', 'investigating', 'resolved');

CREATE OR REPLACE VIEW `anonymous_priority_summary` AS
SELECT 
    priority,
    status,
    COUNT(*) as count
FROM anonymous_reports
GROUP BY priority, status
ORDER BY 
    FIELD(priority, 'critical', 'high', 'medium', 'low'),
    FIELD(status, 'pending', 'in_review', 'verified', 'actioned', 'dismissed');
