CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `desc` text,
  `status` tinyint DEFAULT '1',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert group data
INSERT INTO `groups` (`id`, `name`, `desc`, `status`, `create_at`) VALUES
(1, 'Admin', 'Group with full administrative access', 1, '2025-03-26 01:16:54'),
(2, 'Management', 'Group for managerial level users', 1, '2025-03-26 01:16:54'),
(3, 'Editorial', 'Group for content editors and publishers', 1, '2025-03-26 01:16:54'),
(4, 'Viewer', 'Group with read-only access', 1, '2025-03-26 01:16:54'),
(5, 'User', 'Standard registered users', 1, '2025-03-26 01:16:54'),
(6, 'Guest', 'Limited access for guest users', 1, '2025-03-26 01:16:54');