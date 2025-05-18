CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `activation_code` varchar(100) DEFAULT NULL,
  `fname` varchar(50) DEFAULT NULL,
  `contact` varchar(20) DEFAULT NULL,
  `user_type` int DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `last_nav` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `last_ip` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `last_host` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `last_os` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `role` int DEFAULT '5',
  `reset_token` text,
  `activated_at` timestamp NULL DEFAULT NULL,
  `current_session_token` varchar(255) DEFAULT NULL,
  `current_session_token_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` (
  `id`, `username`, `email`, `password`, `created_at`, `activation_code`, `fname`, `contact`, `user_type`, `last_login`, `last_nav`, `last_ip`, `last_host`, `last_os`, `status`, `role`, `reset_token`, `activated_at`, `current_session_token`, `current_session_token_expires_at`
) VALUES (
  1,
  'admin',
  'adms.rtsb@ranhill.com.my',
  '$2b$10$wH6Q8Qw8Qw8Qw8Qw8Qw8QeQw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8', -- bcrypt hash for 'admin123' (example)
  '2025-05-18 00:00:00',
  NULL,
  'System Administrator',
  '0123456789',
  1,
  '2025-05-18 00:00:00',
  '/admin',
  NULL,
  NULL,
  'macOS',
  1,
  1,
  NULL,
  '2025-05-18 00:00:00',
  NULL,
  NULL
);