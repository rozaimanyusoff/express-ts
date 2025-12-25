# User Module - Database Schema

## Overview
The User Module uses the `auth` database (shared with p.auth) and manages 8 core tables related to user profiles, groups, tasks, and role-based access control.

---

## Core Tables

### users
**Purpose**: User account information and authentication data

**SQL Definition**:
```sql
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fname` varchar(255) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `contact` varchar(20) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `user_type` int DEFAULT NULL,
  `role` int DEFAULT NULL,
  `status` int DEFAULT '0',
  `avatar` varchar(255) DEFAULT NULL,
  `activation_code` varchar(255) DEFAULT NULL,
  `activated_at` timestamp NULL DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `last_ip` varchar(45) DEFAULT NULL,
  `last_host` varchar(255) DEFAULT NULL,
  `last_os` varchar(255) DEFAULT NULL,
  `last_nav` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `contact` (`contact`),
  UNIQUE KEY `username` (`username`),
  KEY `role` (`role`),
  KEY `status` (`status`),
  KEY `user_type` (`user_type`)
);
```

**TypeScript Interface**:
```typescript
export interface Users {
    activated_at: Date | null;
    activation_code: null | string;
    avatar?: null | string;
    contact: string;
    created_at: Date;
    email: string;
    fname: string;
    id: number;
    last_host: null | string;
    last_ip: null | string;
    last_login: Date | null;
    last_nav: null | string;
    last_os: null | string;
    password: string;
    reset_token: null | string;
    role: number;
    status: number;
    user_type: number;
    usergroups: null | string;
    username: string;
}
```

**Key Queries**:
```typescript
// Get all users with groups
SELECT u.*, GROUP_CONCAT(ug.group_id) AS usergroups
FROM users u
LEFT JOIN user_groups ug ON u.id = ug.user_id
GROUP BY u.id;

// Find user by email
SELECT * FROM users WHERE email = 'john@company.com';

// Find user by username or email
SELECT * FROM users WHERE (email = ? OR username = ?)
AND activated_at IS NOT NULL;

// Get active users
SELECT * FROM users WHERE status = 1 AND activated_at IS NOT NULL;

// Update last login
UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?;

// Get user with roles
SELECT u.*, r.role_name FROM users u
LEFT JOIN roles r ON u.role = r.id
WHERE u.id = ?;
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key, auto-increment |
| fname | varchar(255) | Full name |
| username | varchar(255) | Unique username for login |
| email | varchar(255) | Unique email address |
| contact | varchar(20) | Phone number, unique |
| password | varchar(255) | Bcrypt hashed password |
| user_type | int | 1=Employee, 2=Customer, 3=Vendor |
| role | int | Foreign key to roles table |
| status | int | 0=Inactive, 1=Active, 2=Suspended |
| avatar | varchar(255) | Profile picture URL |
| activation_code | varchar(255) | Email verification code |
| activated_at | timestamp | Account activation timestamp |
| reset_token | varchar(255) | Password reset token |
| last_login | timestamp | Last successful login |
| last_ip | varchar(45) | Last login IP address |
| last_host | varchar(255) | Last login hostname |
| last_os | varchar(255) | Last login OS |
| last_nav | varchar(255) | Last accessed navigation item |
| created_at | timestamp | Account creation time |
| updated_at | timestamp | Last update time |

**Indexes**:
- Primary: `id`
- Unique: `email`, `contact`, `username`
- Foreign Keys: `role`
- Search: `status`, `user_type`

---

### user_profile
**Purpose**: Extended user information (personal and professional details)

**SQL Definition**:
```sql
CREATE TABLE `user_profile` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dob` date DEFAULT NULL,
  `job` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
```

**TypeScript Interface**:
```typescript
export interface UserProfile {
    dob: null | string;
    job: null | string;
    location: null | string;
    profile_image_url: null | string;
    user_id: number;
}
```

**Key Queries**:
```typescript
// Get user profile
SELECT * FROM user_profile WHERE user_id = ?;

// Get user with profile
SELECT u.*, p.dob, p.job, p.location, p.profile_image_url
FROM users u
LEFT JOIN user_profile p ON u.id = p.user_id
WHERE u.id = ?;

// Update profile
UPDATE user_profile SET job = ?, location = ?, dob = ? WHERE user_id = ?;

// Search users by job title
SELECT u.*, p.job FROM users u
JOIN user_profile p ON u.id = p.user_id
WHERE p.job LIKE '%Engineer%';
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| user_id | int | Foreign key to users |
| dob | date | Date of birth |
| job | varchar(255) | Job title/position |
| location | varchar(255) | Work location/office |
| profile_image_url | varchar(255) | Profile picture URL |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

---

### user_groups
**Purpose**: Many-to-many relationship between users and groups

**SQL Definition**:
```sql
CREATE TABLE `user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_group_unique` (`user_id`, `group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
);
```

**Key Queries**:
```typescript
// Get user's groups
SELECT g.* FROM groups g
JOIN user_groups ug ON g.id = ug.group_id
WHERE ug.user_id = ?;

// Get group members
SELECT u.* FROM users u
JOIN user_groups ug ON u.id = ug.user_id
WHERE ug.group_id = ?;

// Add user to group
INSERT INTO user_groups (user_id, group_id) VALUES (?, ?);

// Remove user from group
DELETE FROM user_groups WHERE user_id = ? AND group_id = ?;

// Check user in group
SELECT COUNT(*) as count FROM user_groups 
WHERE user_id = ? AND group_id = ?;

// Get all groups for user
SELECT GROUP_CONCAT(group_id) as groups FROM user_groups WHERE user_id = ?;
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| user_id | int | Foreign key to users |
| group_id | int | Foreign key to groups |
| created_at | timestamp | Assignment time |

---

### user_tasks
**Purpose**: Track tasks assigned to users

**SQL Definition**:
```sql
CREATE TABLE `user_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_name` varchar(255) NOT NULL,
  `task_description` text,
  `status` int DEFAULT '0',
  `priority` int DEFAULT '0',
  `due_date` date DEFAULT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `user_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_tasks_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
);
```

**Key Queries**:
```typescript
// Get user's tasks
SELECT * FROM user_tasks WHERE user_id = ? ORDER BY due_date ASC;

// Get pending tasks
SELECT * FROM user_tasks WHERE user_id = ? AND status IN (0, 1);

// Get completed tasks
SELECT * FROM user_tasks WHERE user_id = ? AND status = 2;

// Assign task
INSERT INTO user_tasks (user_id, task_name, task_description, priority, due_date, assigned_by) 
VALUES (?, ?, ?, ?, ?, ?);

// Update task status
UPDATE user_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

// Get overdue tasks
SELECT * FROM user_tasks 
WHERE user_id = ? AND status < 2 AND due_date < CURDATE();

// Get tasks by priority
SELECT * FROM user_tasks 
WHERE user_id = ? AND status < 2 
ORDER BY priority DESC, due_date ASC;
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| user_id | int | Foreign key to users |
| task_name | varchar(255) | Task title |
| task_description | text | Detailed description |
| status | int | 0=Open, 1=In Progress, 2=Completed |
| priority | int | 0=Low, 1=Medium, 2=High |
| due_date | date | Task due date |
| assigned_by | int | User ID of task creator |
| assigned_at | timestamp | Assignment timestamp |
| completed_at | timestamp | Completion timestamp |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

---

### groups
**Purpose**: Department/team grouping for users

**SQL Definition**:
```sql
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `status` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
);
```

**Key Queries**:
```typescript
// Get all groups
SELECT * FROM groups WHERE status = 1;

// Get group details
SELECT * FROM groups WHERE id = ?;

// Create group
INSERT INTO groups (name, description, status) VALUES (?, ?, 1);

// Get group members count
SELECT COUNT(*) as members FROM user_groups WHERE group_id = ?;

// Delete group
DELETE FROM groups WHERE id = ?;
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| name | varchar(255) | Group name |
| description | text | Group description |
| status | int | 1=Active, 0=Inactive |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

---

## Access Control Tables

### roles
**Purpose**: Role definitions for permission management

**SQL Definition**:
```sql
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(255) NOT NULL,
  `description` text,
  `status` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
);
```

**Standard Roles**:
| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | Admin | Full system access |
| 2 | Manager | Department/team management |
| 3 | Employee | Basic user access |
| 4 | Customer | External customer access |
| 5 | Vendor | Vendor/supplier access |

---

### permissions
**Purpose**: Define system permissions

**SQL Definition**:
```sql
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(255) NOT NULL,
  `description` text,
  `module` varchar(100) DEFAULT NULL,
  `status` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_name` (`permission_name`)
);
```

**Common Permissions**:
```
user.view           - View user information
user.edit           - Edit user information
user.create         - Create new user
user.delete         - Delete user account
profile.edit        - Edit own profile
task.view           - View assigned tasks
task.edit           - Update task status
groups.manage       - Manage group membership
reports.view        - View reports
```

---

## Navigation Tables

### workflows
**Purpose**: Workflow definitions for business processes

**Key Fields**:
```sql
id, name, description, steps, status, created_at
```

---

### modules
**Purpose**: System modules and features

**Key Fields**:
```sql
id, name, description, icon, status, created_at
```

---

### module_members
**Purpose**: Control which groups can access which modules

**Key Fields**:
```sql
id, module_id, group_id, access_level, created_at
```

---

## Sample Data

### Sample User
```json
{
  "id": 101,
  "fname": "John Doe",
  "username": "jdoe",
  "email": "john@company.com",
  "contact": "60123456789",
  "password": "$2b$10$...",
  "user_type": 1,
  "role": 3,
  "status": 1,
  "avatar": "/uploads/avatars/user_101.jpg",
  "activation_code": null,
  "activated_at": "2024-12-01T10:30:00Z",
  "reset_token": null,
  "last_login": "2024-12-25T14:30:00Z",
  "last_ip": "192.168.1.100",
  "last_host": "desktop-01",
  "last_os": "Windows 10",
  "last_nav": "dashboard",
  "created_at": "2024-11-15T09:00:00Z",
  "updated_at": "2024-12-25T14:30:00Z"
}
```

### Sample User Profile
```json
{
  "id": 1,
  "user_id": 101,
  "dob": "1990-05-15",
  "job": "Software Engineer",
  "location": "Kuala Lumpur",
  "profile_image_url": "/uploads/profiles/user_101_profile.jpg",
  "created_at": "2024-11-15T09:00:00Z",
  "updated_at": "2024-12-20T15:30:00Z"
}
```

### Sample User Task
```json
{
  "id": 25,
  "user_id": 101,
  "task_name": "Complete Q4 Review",
  "task_description": "Submit quarterly performance review",
  "status": 1,
  "priority": 2,
  "due_date": "2024-12-31",
  "assigned_by": 50,
  "assigned_at": "2024-12-10T10:00:00Z",
  "completed_at": null,
  "created_at": "2024-12-10T10:00:00Z",
  "updated_at": "2024-12-25T11:00:00Z"
}
```

---

## Table Relationships

```
users (1) ──── (many) user_profile
users (1) ──── (many) user_groups
users (1) ──── (many) user_tasks
groups (1) ──── (many) user_groups
users (1) ──── (many) user_tasks (assigned_by)
roles (1) ──── (many) users
permissions (1) ──── (many) groups
modules (1) ──── (many) module_members
groups (1) ──── (many) module_members
```

---

## Database Optimization

### Indexes
```sql
-- Primary keys
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE user_profile ADD PRIMARY KEY (id);
ALTER TABLE user_groups ADD PRIMARY KEY (id);
ALTER TABLE user_tasks ADD PRIMARY KEY (id);

-- Unique constraints
ALTER TABLE users ADD UNIQUE KEY (email);
ALTER TABLE users ADD UNIQUE KEY (contact);
ALTER TABLE users ADD UNIQUE KEY (username);

-- Foreign key indexes
ALTER TABLE user_profile ADD INDEX (user_id);
ALTER TABLE user_groups ADD INDEX (user_id);
ALTER TABLE user_groups ADD INDEX (group_id);
ALTER TABLE user_tasks ADD INDEX (user_id);
ALTER TABLE user_tasks ADD INDEX (assigned_by);

-- Search indexes
ALTER TABLE users ADD INDEX (status);
ALTER TABLE users ADD INDEX (role);
ALTER TABLE users ADD INDEX (user_type);
ALTER TABLE user_tasks ADD INDEX (status);
ALTER TABLE user_tasks ADD INDEX (due_date);
```

### Query Performance Tips
1. Always filter by `status` to exclude deleted records
2. Use indexes on `email`, `contact` for lookups
3. Join with `user_groups` for permission checks
4. Use `GROUP_CONCAT` to fetch multiple related records
5. Cache frequently accessed data (roles, groups)

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [API.md](API.md) - Complete API reference
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and improvements
