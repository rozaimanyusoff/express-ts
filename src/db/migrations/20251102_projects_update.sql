-- Migration: Update projects table to support 'project' assignment type and priority
-- Date: 2025-11-02

-- 1) Extend assignment_type enum to include 'project'
ALTER TABLE projects 
  MODIFY COLUMN assignment_type ENUM('task','support','project') NOT NULL;

-- 2) Add priority column if not exists
-- Note: MySQL prior to 8.0.29 doesn't support IF NOT EXISTS on ADD COLUMN for all variants.
-- Safest to attempt ADD and let migration tool handle already-exists cases, or run conditionally.
-- Assuming manual execution, comment out if the column already exists.
ALTER TABLE projects 
  ADD COLUMN priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium' AFTER due_date;
