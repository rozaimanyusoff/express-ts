-- Migration: add read_at column & index for notifications
ALTER TABLE notifications
  ADD COLUMN read_at DATETIME NULL AFTER created_at;

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at);