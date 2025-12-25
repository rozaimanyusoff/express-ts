-- Migration: Migrate logs_auth to file-based logging and add time_spent columns
-- This script adds the new columns to users table and optionally migrates existing logs

-- Add new columns to users table if they don't exist
ALTER TABLE `auth`.`users` 
ADD COLUMN IF NOT EXISTS `last_logout` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `time_spent` int DEFAULT '0' COMMENT 'Total seconds spent in app';

-- Index for efficient queries on last_logout
ALTER TABLE `auth`.`users` 
ADD INDEX IF NOT EXISTS `idx_last_logout` (`last_logout`),
ADD INDEX IF NOT EXISTS `idx_time_spent` (`time_spent`);

-- Note: logs_auth table is kept for backward compatibility but is no longer actively used
-- New authentication logs are written to files in uploads/logs/auth/ organized by date
-- To completely remove logs_auth (optional, after verification):
-- DROP TABLE `logs_auth`;
