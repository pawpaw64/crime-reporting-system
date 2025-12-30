-- Migration: Add fields for multi-step registration
-- Run this after the initial schema.sql

USE `securevoice`;

-- Add new columns to users table for registration process
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `nid` VARCHAR(17) DEFAULT NULL AFTER `phone`,
ADD COLUMN IF NOT EXISTS `name_bn` VARCHAR(100) DEFAULT NULL AFTER `fullName`,
ADD COLUMN IF NOT EXISTS `father_name` VARCHAR(100) DEFAULT NULL AFTER `name_bn`,
ADD COLUMN IF NOT EXISTS `mother_name` VARCHAR(100) DEFAULT NULL AFTER `father_name`,
ADD COLUMN IF NOT EXISTS `face_image` LONGTEXT DEFAULT NULL AFTER `mother_name`,
ADD COLUMN IF NOT EXISTS `division` VARCHAR(50) DEFAULT NULL AFTER `location`,
ADD COLUMN IF NOT EXISTS `district` VARCHAR(50) DEFAULT NULL AFTER `division`,
ADD COLUMN IF NOT EXISTS `police_station` VARCHAR(100) DEFAULT NULL AFTER `district`,
ADD COLUMN IF NOT EXISTS `union_name` VARCHAR(100) DEFAULT NULL AFTER `police_station`,
ADD COLUMN IF NOT EXISTS `village` VARCHAR(100) DEFAULT NULL AFTER `union_name`,
ADD COLUMN IF NOT EXISTS `place_details` TEXT DEFAULT NULL AFTER `village`,
ADD COLUMN IF NOT EXISTS `is_verified` TINYINT(1) DEFAULT 0 AFTER `place_details`,
ADD COLUMN IF NOT EXISTS `is_nid_verified` TINYINT(1) DEFAULT 0 AFTER `is_verified`,
ADD COLUMN IF NOT EXISTS `is_face_verified` TINYINT(1) DEFAULT 0 AFTER `is_nid_verified`;

-- Add unique constraint on NID
ALTER TABLE `users` ADD UNIQUE KEY `unique_user_nid` (`nid`);

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS `otp_verification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone_otp` (`phone`, `otp_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create registration sessions table (for multi-step registration)
CREATE TABLE IF NOT EXISTS `registration_sessions` (
  `session_id` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `step` int DEFAULT 1,
  `data` JSON DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create login attempts table for security
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `success` tinyint(1) DEFAULT 0,
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
