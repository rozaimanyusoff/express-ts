CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `views` tinyint(1) DEFAULT '0',
  `creates` tinyint(1) NOT NULL DEFAULT '0',
  `updates` tinyint(1) DEFAULT '0',
  `deletes` tinyint(1) DEFAULT '0',
  `status` tinyint(1) DEFAULT '1',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `update_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `roles` (`id`, `name`, `desc`, `views`, `creates`, `updates`, `deletes`, `status`, `create_at`, `update_at`) VALUES
(1, 'Administrator', '', 1, 1, 1, 1, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00'),
(2, 'Manager', '', 1, 0, 1, 0, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00'),
(3, 'Editor', '', 1, 0, 1, 1, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00'),
(4, 'Viewer', '', 1, 0, 1, 1, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00'),
(5, 'User', '', 1, 0, 1, 1, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00'),
(6, 'Guest', '', 0, 0, 0, 0, 1, '2025-05-18 00:00:00', '2025-05-18 00:00:00');