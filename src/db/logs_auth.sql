CREATE TABLE logs_auth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('login', 'logout', 'register', 'activate', 'reset_password', 'request_reset', 'other') NOT NULL,
    status ENUM('success', 'fail') DEFAULT 'success',
    ip VARCHAR(45),
    user_agent VARCHAR(255),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
