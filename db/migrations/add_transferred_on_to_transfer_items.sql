-- Migration: Add transferred_on column to track when transfers were processed
-- This column marks when the asset_history record was created and assetdata was updated
-- Used by the scheduled job to identify which transfers have already been processed

ALTER TABLE `assets`.`transfer_items`
ADD COLUMN `transferred_on` DATETIME NULL COMMENT 'Timestamp when ownership was transferred and asset_history was created' AFTER `acceptance_date`;

-- Create index to help identify pending transfers efficiently
CREATE INDEX idx_transferred_on ON `assets`.`transfer_items` (transferred_on);
CREATE INDEX idx_effective_date_transferred ON `assets`.`transfer_items` (effective_date, transferred_on);
