-- Migration: Add activation_expires_at column to pending_users table
-- This column tracks 24-hour expiration for activation codes

ALTER TABLE pending_users 
ADD COLUMN activation_expires_at TIMESTAMP NULL COMMENT '24-hour expiration for activation code' 
AFTER activation_code;

-- Log the migration
SELECT 'Successfully added activation_expires_at column to pending_users' AS migration_status;
