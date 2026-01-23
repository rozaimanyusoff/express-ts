-- Create telco_subs_account table for subscriber-account assignment history
-- This table tracks account changes for each subscriber with effective dates

CREATE TABLE IF NOT EXISTS `billings`.`telco_subs_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int NOT NULL COMMENT 'Foreign key to telco_subs.id',
  `account_id` int NOT NULL COMMENT 'Foreign key to telco_accounts.id',
  `effective_date` date NOT NULL DEFAULT (CURDATE()) COMMENT 'Date when this account assignment became effective',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when this record was created',
  PRIMARY KEY (`id`),
  KEY `idx_sub_no_id` (`sub_no_id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_effective_date` (`effective_date`),
  CONSTRAINT `fk_subs_account_sub_no_id` FOREIGN KEY (`sub_no_id`) REFERENCES `telco_subs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subs_account_account_id` FOREIGN KEY (`account_id`) REFERENCES `telco_accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Subscriber-Account assignment history with effective date tracking';
