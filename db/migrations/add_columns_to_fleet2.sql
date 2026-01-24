-- Migration: Add replacement_card_id and assignment columns to fleet2 table
-- Purpose: Track card replacements and assignment type (new/renewal/replacement)

ALTER TABLE billings.fleet2 
ADD COLUMN `replacement_card_id` int DEFAULT NULL COMMENT 'ID of the card being replaced (for replacement assignments)',
ADD COLUMN `assignment` varchar(50) DEFAULT NULL COMMENT 'Assignment type: new, renewal, replacement, etc.';
