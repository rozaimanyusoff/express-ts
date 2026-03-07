-- Migration: add data_source column to assets.asset_history
-- Tracks which module/action produced each history record
-- Example values: 'create | purchase id: 375', 'update | purchase id: 375'

ALTER TABLE `assets`.`asset_history`
  ADD COLUMN `data_source` VARCHAR(100) DEFAULT NULL AFTER `effective_date`;
