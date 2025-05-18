CREATE TABLE `user_profile` (
  `user_id` int NOT NULL,
  `dob` varchar(20) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `job` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;