CREATE TABLE `group_nav` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nav_id` int NOT NULL,
  `group_id` int NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nav_group` (`nav_id`,`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `group_nav` (`nav_id`, `group_id`, `timestamp`) VALUES (1, 1, '2025-05-18 00:00:00');
INSERT INTO `group_nav` (`nav_id`, `group_id`, `timestamp`) VALUES (2, 1, '2025-05-18 00:00:00');