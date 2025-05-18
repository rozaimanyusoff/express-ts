CREATE TABLE `pending_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contact` varchar(32) NOT NULL,
  `user_type` int NOT NULL,
  `activation_code` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;