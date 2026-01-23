-- Media Module Database Schema
-- Tables for storing media metadata (documents, images, videos)
-- Uses soft deletes for audit trail

-- Create media database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `media`;

-- Main media table
CREATE TABLE IF NOT EXISTS `media`.`media` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `kind` ENUM('document', 'image', 'video') NOT NULL,
  `file_url` VARCHAR(512) NOT NULL,
  `size` BIGINT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED,
  `tags` VARCHAR(500),
  `etag` VARCHAR(100),
  `checksum` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  -- Indexes for fast queries
  INDEX `idx_kind` (`kind`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_name_search` (`name`),
  FULLTEXT INDEX `idx_tags_search` (`tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Media tags table (normalized)
-- Useful if you want to query by individual tags more efficiently
CREATE TABLE IF NOT EXISTS `media`.`media_tags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_tag` (`tag`),
  INDEX `idx_media_id` (`media_id`),
  UNIQUE KEY `uq_media_tag` (`media_id`, `tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Media access log table (for audit/analytics)
CREATE TABLE IF NOT EXISTS `media`.`media_access_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED,
  `action` ENUM('view', 'download', 'share') NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `accessed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_media_id` (`media_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_accessed_at` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Thumbnail storage table
CREATE TABLE IF NOT EXISTS `media`.`media_thumbnails` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `thumbnail_url` VARCHAR(512) NOT NULL,
  `width` INT,
  `height` INT,
  `size` INT,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_media_id` (`media_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
