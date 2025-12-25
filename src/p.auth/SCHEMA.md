# Auth Module - Database Schema

## Database Reference
- **Full Database Schema**: [auth.sql](../../src/db/auth.sql) (16K)
- **Module-Specific Tables**: [auth_module.sql](../../src/db/auth_module.sql)

---

## Core Authentication Tables

### users
Primary user table storing active user accounts and session information.

```sql
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact` varchar(20) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `user_type` int DEFAULT '1',
  `role` int DEFAULT NULL,
  `status` int DEFAULT '0',
  `activation_code` varchar(255) DEFAULT NULL,
  `activated_at` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `current_session_token` varchar(500) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_ip` varchar(45) DEFAULT NULL,
  `last_host` varchar(255) DEFAULT NULL,
  `last_os` varchar(255) DEFAULT NULL,
  `last_nav` longtext,
  `avatar` varchar(500) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_contact` (`contact`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4;
```

**TypeScript Interface**:
```typescript
interface Users {
  id: number;
  username?: string;
  email: string;
  password: string;
  contact: string;
  fname: string;
  user_type: number;  // 1=Employee, 2=Customer, 3=Vendor, etc.
  role?: number;
  status: number;      // 0=inactive, 1=active
  activation_code?: string;
  activated_at?: Date;
  reset_token?: string;
  current_session_token?: string;
  last_login?: Date;
  last_ip?: string;
  last_host?: string;
  last_os?: string;
  last_nav?: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}
```

**Key Queries**:
```sql
-- Get user by email
SELECT * FROM users WHERE email = ?;

-- Check credentials
SELECT * FROM users WHERE email = ? AND password = ?;

-- Get user with groups
SELECT u.*, GROUP_CONCAT(ug.group_id) AS usergroups
FROM users u
LEFT JOIN user_groups ug ON u.id = ug.user_id
WHERE u.id = ?
GROUP BY u.id;

-- Get admins (role_id = 1)
SELECT * FROM users WHERE role = 1 AND status = 1;

-- Get users by type
SELECT * FROM users WHERE user_type = ? AND status = 1;

-- Update last login
UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?;

-- Find user by reset token
SELECT * FROM users WHERE reset_token = ?;
```

---

### pending_users
Temporary table for unactivated user registrations awaiting activation or approval.

```sql
CREATE TABLE `pending_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `contact` varchar(20) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `user_type` int DEFAULT '1',
  `activation_code` varchar(255) DEFAULT NULL,
  `status` int DEFAULT '0',
  `invited_by` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_contact` (`contact`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4;
```

**States**:
- `status = 0` - Registration submitted, awaiting activation
- `status = 1` - Awaiting admin approval
- `status = 2` - Approved, ready for activation
- `status = 3` - Rejected

**Lifecycle**:
1. User registers → record created in pending_users
2. Email verification link sent
3. User clicks link → status = 2 (approved)
4. User completes activation → moved to users table
5. Record deleted from pending_users

---

### logs_auth
Comprehensive audit trail of all authentication activities.

```sql
CREATE TABLE `logs_auth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `hostname` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Actions Logged**:
- `register` - User registration attempt
- `login` - Login attempt (success/fail)
- `logout` - User logout
- `activate` - Account activation
- `password_change` - Password changed by user
- `password_reset` - Password reset via token
- `forgot_password` - Password reset requested
- `session_expired` - Session token expired
- `rate_limit_exceeded` - Too many failed attempts

**Payload Example**:
```json
{
  "email": "user@company.com",
  "contact": "60123456789",
  "reason": "invalid_password",
  "attempt": 3
}
```

**Key Queries**:
```sql
-- Get login history for user
SELECT * FROM logs_auth 
WHERE user_id = ? AND action = 'login' 
ORDER BY created_at DESC LIMIT 10;

-- Failed login attempts
SELECT * FROM logs_auth
WHERE user_id = ? AND action = 'login' AND status = 'fail'
AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Authentication audit trail
SELECT * FROM logs_auth
WHERE user_id = ? 
ORDER BY created_at DESC LIMIT 100;
```

---

## Access Control Tables

### roles
User roles defining permission levels in the system.

```sql
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) NOT NULL,
  `description` text,
  `level` int DEFAULT '0',
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;
```

**Typical Roles**:
- `Admin` (level: 1) - Full system access
- `Manager` (level: 2) - Department/team management
- `User` (level: 3) - Standard access
- `Guest` (level: 4) - Limited read-only access

### permissions
Fine-grained permissions for modules and actions.

```sql
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) NOT NULL,
  `description` text,
  `module` varchar(100) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_name` (`permission_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Examples**:
- `asset_view` - View asset list
- `asset_create` - Create new asset
- `asset_edit` - Edit asset details
- `user_manage` - Manage users

---

## User Assignment Tables

### user_groups
Many-to-many relationship between users and groups.

```sql
CREATE TABLE `user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  `assigned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_group` (`user_id`, `group_id`),
  KEY `idx_group_id` (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4;
```

**Purpose**: Assign users to groups for batch permissions/features

### groups
User groupings for feature access and organization.

```sql
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_name` varchar(255) NOT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_name` (`group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

**Examples**:
- `Beta Testers` - Early feature access
- `Finance Team` - Financial module access
- `IT Administrators` - System management

### module_members
User access to specific system modules.

```sql
CREATE TABLE `module_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `user_id` int NOT NULL,
  `assigned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_user` (`module_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Workflow & Configuration Tables

### modules
System modules that users can access.

```sql
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) NOT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_name` (`module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4;
```

**Examples**: Asset, Maintenance, Billing, Compliance, Purchase

### workflows
Approval/processing workflows configured in the system.

```sql
CREATE TABLE `workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workflow_name` varchar(255) NOT NULL,
  `description` text,
  `module_name` varchar(100) DEFAULT NULL,
  `level_order` int DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module_name` (`module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

### navigation
UI navigation structure (menu items per role).

```sql
CREATE TABLE `navigation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `href` varchar(255) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `order_seq` int DEFAULT '0',
  `parent_id` int DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `role_id` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

---

## Database Relationships

```
User Authentication Flow:
  users ─── users.role ──→ roles
  users ─┬─ user_groups ──→ groups
         ├─ module_members ──→ modules
         └─ navigation (role_id)

Audit Trail:
  logs_auth ─── user_id ──→ users

Pending Users:
  pending_users ─── invited_by ──→ users (admin)
```

---

## Authentication Token Details

### Session Token (JWT)
**Used for**: User authentication across requests

**Payload**:
```typescript
{
  id: number;           // User ID
  email: string;        // User email
  username?: string;    // Username
  role: number;         // Role ID
  usergroups?: string;  // Comma-separated group IDs
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
}
```

**Storage**: 
- Server: `users.current_session_token`
- Client: HTTP header `Authorization: Bearer {token}`

**Expiration**: Configurable (default: 24 hours)

### Reset Token
**Used for**: Password reset verification

**Properties**:
- Stored in: `users.reset_token`
- Validity: 1 hour (configurable)
- Generated: Random string via `crypto.randomBytes()`
- Cleared: After password reset or expiration

### Activation Code
**Used for**: Email verification during registration

**Properties**:
- Stored in: `pending_users.activation_code` or `users.activation_code`
- Validity: Until account activated
- Format: Random alphanumeric string
- Sent via: Email link with `?code=XXX` parameter

---

## Key Queries for Common Operations

### Registration Flow
```sql
-- Check duplicate email/contact
SELECT * FROM users WHERE email = ? OR contact = ?
UNION
SELECT * FROM pending_users WHERE email = ? OR contact = ?;

-- Create pending user
INSERT INTO pending_users (username, email, contact, fname, user_type, activation_code, status)
VALUES (?, ?, ?, ?, ?, ?, 0);
```

### Activation Flow
```sql
-- Get pending user by activation code
SELECT * FROM pending_users WHERE activation_code = ? AND status = 0;

-- Move to active users (transaction required)
BEGIN;
INSERT INTO users (username, email, password, contact, fname, user_type, role, status, activated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW());
DELETE FROM pending_users WHERE id = ?;
COMMIT;
```

### Login Flow
```sql
-- Get user and validate
SELECT * FROM users WHERE email = ? AND status = 1;
-- Then bcrypt.compare(inputPassword, user.password)

-- Update session token
UPDATE users SET current_session_token = ? WHERE id = ?;

-- Log activity
INSERT INTO logs_auth (user_id, action, status, ip_address, user_agent, hostname)
VALUES (?, 'login', 'success', ?, ?, ?);
```

---

## Performance Considerations

- **Indexes**: All frequently searched columns indexed (email, contact, role, status)
- **Session Token Expiry**: Clear expired tokens periodically
- **Auth Logs Archival**: Archive old logs quarterly (keep 6 months active)
- **Pending Users Cleanup**: Delete old pending registrations monthly
- **Rate Limit Cleanup**: Clear old rate limit entries from cache/logs

---

## Sample Data

```json
{
  "id": 1,
  "username": "jdoe",
  "email": "john.doe@company.com",
  "password": "$2b$10$...(bcrypt hash)",
  "contact": "60123456789",
  "fname": "John Doe",
  "user_type": 1,
  "role": 1,
  "status": 1,
  "activation_code": null,
  "activated_at": "2024-01-15T10:30:00Z",
  "reset_token": null,
  "current_session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "last_login": "2024-12-25T14:30:00Z",
  "last_ip": "192.168.1.100",
  "last_host": "DESKTOP-ABC123",
  "last_os": "Windows 10",
  "created_at": "2024-01-15T10:30:00Z"
}
```
