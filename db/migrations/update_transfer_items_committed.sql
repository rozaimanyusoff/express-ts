-- Migration: Update transfer_items table
-- Purpose: Remove 'attachment' column and add 'committed_at' datetime column
-- Date: 2026-02-08

-- Remove the attachment column (consolidated with attachment1, attachment2, attachment3)
ALTER TABLE assets.transfer_items DROP COLUMN IF EXISTS attachment;

-- Add committed_at column to track when transfer was committed
ALTER TABLE assets.transfer_items ADD COLUMN committed_at datetime DEFAULT NULL AFTER acceptance_remarks;

-- Add index on committed_at for query optimization
ALTER TABLE assets.transfer_items ADD INDEX idx_committed_at (committed_at);
