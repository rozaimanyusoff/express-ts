-- Media Module Database Schema
-- Tables used by p.media/ module from 'media' database

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correspondence_recipient_forwards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `recipient_id` int unsigned NOT NULL,
  `ramco_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int NOT NULL,
  `action_date` datetime DEFAULT NULL,
  `action_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient_id` (`recipient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correspondence_recipients` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `correspondence_id` int unsigned NOT NULL,
  `recipient_ramco_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int NOT NULL,
  `action_date` datetime DEFAULT NULL,
  `action_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_correspondence_id` (`correspondence_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correspondences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reference_no` varchar(100) DEFAULT NULL,
  `sender` varchar(255) DEFAULT NULL,
  `sender_ref` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_cover_page` tinyint(1) NOT NULL DEFAULT '0',
  `document_full_letters` tinyint(1) NOT NULL DEFAULT '0',
  `document_claim_attachment` tinyint(1) NOT NULL DEFAULT '0',
  `document_others` tinyint(1) NOT NULL DEFAULT '0',
  `document_others_specify` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` text,
  `direction` enum('incoming','outgoing') DEFAULT NULL,
  `letter_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` enum('low','normal','high') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `date_received` date DEFAULT NULL,
  `letter_date` date DEFAULT NULL,
  `registered_at` datetime DEFAULT NULL,
  `registered_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qa_review_date` datetime DEFAULT NULL,
  `qa_reviewed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qa_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qa_remarks` text COLLATE utf8mb4_unicode_ci,
  `endorsed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endorsed_at` datetime DEFAULT NULL,
  `endorsed_remarks` text COLLATE utf8mb4_unicode_ci,
  `endorsed_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_size` bigint DEFAULT NULL,
  `attachment_pdf_page_count` int DEFAULT NULL,
  `attachment_file_path` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_correspondences_reference_no` (`reference_no`),
  KEY `idx_correspondences_direction` (`direction`),
  KEY `idx_correspondences_priority` (`priority`),
  KEY `idx_correspondences_date_received` (`date_received`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` enum('document','image','video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` bigint unsigned NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int unsigned NOT NULL,
  `project_id` int unsigned DEFAULT NULL,
  `tags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etag` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checksum` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kind` (`kind`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_name_search` (`name`),
  FULLTEXT KEY `idx_tags_search` (`tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_tags` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `media_id` int unsigned NOT NULL,
  `tag` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_media_tag` (`media_id`,`tag`),
  KEY `idx_tag` (`tag`),
  KEY `idx_media_id` (`media_id`),
  CONSTRAINT `media_tags_ibfk_1` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
