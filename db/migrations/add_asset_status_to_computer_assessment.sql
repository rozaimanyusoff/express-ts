-- Migration: Add asset_status column to computer_assessment table
-- Purpose: Track whether a computer assessment is for a new unlinked asset or an existing asset

ALTER TABLE compliance.computer_assessment 
ADD COLUMN `asset_status` varchar(20) DEFAULT NULL COMMENT 'new = unlinked asset, linked = has asset_id in assets.assetdata';

-- Update existing records with asset_id = NULL to have asset_status = 'new'
UPDATE compliance.computer_assessment 
SET asset_status = 'new' 
WHERE asset_id IS NULL OR asset_id = 0;

-- Update existing records with valid asset_id to have asset_status = 'linked'
UPDATE compliance.computer_assessment 
SET asset_status = 'linked' 
WHERE asset_id IS NOT NULL AND asset_id > 0;
