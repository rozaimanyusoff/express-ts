-- Add approval fields to transfer_items table
-- Includes approval status, approved by (ramco_id), and approval date

ALTER TABLE `assets`.`transfer_items` ADD COLUMN `approval_status` varchar(50) DEFAULT 'pending' AFTER `acceptance_attachments`;
ALTER TABLE `assets`.`transfer_items` ADD COLUMN `approved_by` varchar(10) DEFAULT NULL AFTER `approval_status`;
ALTER TABLE `assets`.`transfer_items` ADD COLUMN `approved_date` datetime DEFAULT NULL AFTER `approved_by`;
