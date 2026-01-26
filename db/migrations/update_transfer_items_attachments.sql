-- Migration: Update transfer_items table to add individual attachment columns, transfer_type, and remove acceptance_attachments

-- Add transfer_type column if it doesn't exist
ALTER TABLE `assets`.`transfer_items`
ADD COLUMN `transfer_type` varchar(50) DEFAULT NULL AFTER `type_id`;

-- Add individual attachment columns if they don't exist
ALTER TABLE `assets`.`transfer_items`
ADD COLUMN `attachment1` varchar(255) DEFAULT NULL AFTER `acceptance_remarks`,
ADD COLUMN `attachment2` varchar(255) DEFAULT NULL AFTER `attachment1`,
ADD COLUMN `attachment3` varchar(255) DEFAULT NULL AFTER `attachment2`;

-- Drop acceptance_attachments column if it exists
ALTER TABLE `assets`.`transfer_items`
DROP COLUMN IF EXISTS `acceptance_attachments`;
