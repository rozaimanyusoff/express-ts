CREATE TABLE `navigation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `position` int NOT NULL,
  `status` tinyint NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  `parent_nav_id` int DEFAULT NULL,
  `section_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert Administration section
INSERT INTO `navigation` (`id`, `title`, `type`, `position`, `status`, `path`, `parent_nav_id`, `section_id`) VALUES
(1, 'Administration', 'section', 1, 1, NULL, NULL, NULL);

-- Insert Users Management under Administration
INSERT INTO `navigation` (`id`, `title`, `type`, `position`, `status`, `path`, `parent_nav_id`, `section_id`) VALUES
(2, 'Users Management', 'level-1', 1, 1, '/admin', 1, 1);