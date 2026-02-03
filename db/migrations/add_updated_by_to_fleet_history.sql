-- Add updated_by column to fleet_history table
ALTER TABLE `billings`.`fleet_history` ADD COLUMN `updated_by` varchar(50) DEFAULT NULL COMMENT 'ramco_id of the user who made the change';
