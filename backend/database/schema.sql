-- Crime Reporting System Database Schema
-- Database: securevoice

CREATE DATABASE IF NOT EXISTS `securevoice` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

USE `securevoice`;

-- Districts table
CREATE TABLE IF NOT EXISTS `districts` (
  `district_name` varchar(100) NOT NULL,
  PRIMARY KEY (`district_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Category table for complaint types
CREATE TABLE IF NOT EXISTS `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `unique_category_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `name_bn` varchar(100) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `mother_name` varchar(100) DEFAULT NULL,
  `face_image` longtext DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `nid` varchar(17) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `division` varchar(50) DEFAULT NULL,
  `district` varchar(50) DEFAULT NULL,
  `police_station` varchar(100) DEFAULT NULL,
  `union_name` varchar(100) DEFAULT NULL,
  `village` varchar(100) DEFAULT NULL,
  `place_details` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `is_nid_verified` tinyint(1) DEFAULT 0,
  `is_face_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `age` int DEFAULT NULL,
  PRIMARY KEY (`username`),
  UNIQUE KEY `unique_user_email` (`email`),
  UNIQUE KEY `unique_user_username` (`username`),
  UNIQUE KEY `unique_userid` (`userid`),
  UNIQUE KEY `unique_user_nid` (`nid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Admins table
CREATE TABLE IF NOT EXISTS `admins` (
  `adminid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `district_name` varchar(100) DEFAULT NULL,
  `dob` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`username`),
  UNIQUE KEY `unique_admin_email` (`email`),
  UNIQUE KEY `unique_admin_username` (`username`),
  UNIQUE KEY `unique_adminid` (`adminid`),
  KEY `fk_admins_district_name` (`district_name`),
  CONSTRAINT `fk_admins_district_name` FOREIGN KEY (`district_name`) REFERENCES `districts` (`district_name`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Location table
CREATE TABLE IF NOT EXISTS `location` (
  `location_id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(100) DEFAULT NULL,
  `district_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`location_id`),
  KEY `fk_location_district_name` (`district_name`),
  CONSTRAINT `fk_location_district_name` FOREIGN KEY (`district_name`) REFERENCES `districts` (`district_name`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Complaint table
CREATE TABLE IF NOT EXISTS `complaint` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `status` enum('pending','verifying','investigating','resolved') DEFAULT 'pending',
  `username` varchar(100) DEFAULT NULL,
  `admin_username` varchar(100) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `complaint_type` varchar(100) DEFAULT NULL,
  `location_address` text,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  KEY `username` (`username`),
  KEY `admin_username` (`admin_username`),
  KEY `location_id` (`location_id`),
  KEY `fk_complaint_category` (`category_id`),
  CONSTRAINT `complaint_ibfk_1` FOREIGN KEY (`username`) REFERENCES `users` (`username`),
  CONSTRAINT `complaint_ibfk_2` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`),
  CONSTRAINT `complaint_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `location` (`location_id`),
  CONSTRAINT `fk_complaint_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Evidence table
CREATE TABLE IF NOT EXISTS `evidence` (
  `evidence_id` int NOT NULL AUTO_INCREMENT,
  `uploaded_at` datetime DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `complaint_id` int DEFAULT NULL,
  PRIMARY KEY (`evidence_id`),
  KEY `complaint_id` (`complaint_id`),
  CONSTRAINT `evidence_ibfk_1` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Admin cases table
CREATE TABLE IF NOT EXISTS `admin_cases` (
  `case_id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` int NOT NULL,
  `admin_username` varchar(100) NOT NULL,
  `complainant_username` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','verifying','investigating','resolved') DEFAULT 'pending',
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `unique_admin_complaint` (`complaint_id`,`admin_username`),
  KEY `fk_admin_case_admin` (`admin_username`),
  CONSTRAINT `fk_admin_case_admin` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`) ON UPDATE CASCADE,
  CONSTRAINT `fk_admin_case_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Complaint chat table
CREATE TABLE IF NOT EXISTS `complaint_chat` (
  `chat_id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` int NOT NULL,
  `sender_type` enum('user','admin') NOT NULL,
  `sender_username` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`chat_id`),
  KEY `complaint_id` (`complaint_id`),
  CONSTRAINT `complaint_chat_ibfk_1` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Status updates table
CREATE TABLE IF NOT EXISTS `status_updates` (
  `update_id` int NOT NULL AUTO_INCREMENT,
  `status` enum('pending','verifying','investigating','resolved') DEFAULT NULL,
  `remarks` text,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `complaint_id` int DEFAULT NULL,
  PRIMARY KEY (`update_id`),
  KEY `fk_status_update_complaint` (`complaint_id`),
  KEY `fk_status_update_admin` (`updated_by`),
  CONSTRAINT `fk_status_update_admin` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`username`) ON UPDATE CASCADE,
  CONSTRAINT `fk_status_update_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Complaint notifications table
CREATE TABLE IF NOT EXISTS `complaint_notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` int NOT NULL,
  `message` text NOT NULL,
  `type` enum('status_change','admin_comment','system') DEFAULT 'system',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `complaint_id` (`complaint_id`),
  CONSTRAINT `complaint_notifications_ibfk_1` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Admin settings table
CREATE TABLE IF NOT EXISTS `admin_settings` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(100) NOT NULL,
  `dark_mode` tinyint(1) DEFAULT '0',
  `email_notifications` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `unique_admin_settings` (`admin_username`),
  CONSTRAINT `admin_settings_ibfk_1` FOREIGN KEY (`admin_username`) REFERENCES `admins` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default categories
INSERT INTO `category` (`name`, `description`) VALUES
('Theft', 'Property theft and burglary cases'),
('Harassment', 'Harassment and intimidation cases'),
('Threat', 'Threatening behavior and verbal threats'),
('Assault', 'Physical assault and battery cases'),
('Fraud', 'Financial fraud and scam cases'),
('Other', 'Other types of complaints not covered above');

-- Insert default districts
INSERT INTO `districts` (`district_name`) VALUES
('Dhaka'),
('Rajshahi'),
('Khulna'),
('Sylhet'),
('Barishal');

-- Insert default admin (password: admin123)
-- Note: You'll need to hash the password before inserting
INSERT INTO `admins` (`username`, `email`, `password`, `fullName`, `district_name`) VALUES
('admin', 'admin@crime.gov.bd', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'Dhaka');