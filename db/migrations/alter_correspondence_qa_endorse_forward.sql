-- Migration: Correspondence QA, Endorsement & Recipient Action/Forward support
-- Run once against the media database.

-- ============================================================
-- 1. ALTER media.correspondences
--    Add: letter_date, qa_* fields, endorsed_* fields
-- ============================================================
ALTER TABLE `media`.`correspondences`
  ADD COLUMN `letter_date`        DATE          NULL          AFTER `date_received`,
  ADD COLUMN `qa_review_date`     DATETIME      NULL          AFTER `registered_by`,
  ADD COLUMN `qa_reviewed_by`     VARCHAR(50)   NULL          AFTER `qa_review_date`,
  ADD COLUMN `qa_status`          VARCHAR(50)   NULL          AFTER `qa_reviewed_by`,
  ADD COLUMN `qa_remarks`         TEXT          NULL          AFTER `qa_status`,
  ADD COLUMN `endorsed_by`        VARCHAR(50)   NULL          AFTER `qa_remarks`,
  ADD COLUMN `endorsed_at`        DATETIME      NULL          AFTER `endorsed_by`,
  ADD COLUMN `endorsed_remarks`   TEXT          NULL          AFTER `endorsed_at`,
  ADD COLUMN `endorsed_status`    VARCHAR(50)   NULL          AFTER `endorsed_remarks`;

-- ============================================================
-- 2. ALTER media.correspondence_recipients
--    Add: action_date, action_status, action_remarks
-- ============================================================
ALTER TABLE `media`.`correspondence_recipients`
  ADD COLUMN `action_date`      DATETIME    NULL AFTER `department_id`,
  ADD COLUMN `action_status`    VARCHAR(50) NULL AFTER `action_date`,
  ADD COLUMN `action_remarks`   TEXT        NULL AFTER `action_status`;

-- ============================================================
-- 3. CREATE media.correspondence_recipient_forwards
--    Stores 1-level forward entries made by a recipient
-- ============================================================
CREATE TABLE IF NOT EXISTS `media`.`correspondence_recipient_forwards` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `recipient_id`    INT UNSIGNED  NOT NULL COMMENT 'FK → correspondence_recipients.id',
  `ramco_id`        VARCHAR(50)   NOT NULL,
  `department_id`   INT           NOT NULL,
  `action_date`     DATETIME      NULL,
  `action_status`   VARCHAR(50)   NULL,
  `action_remarks`  TEXT          NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_recipient_id` (`recipient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
