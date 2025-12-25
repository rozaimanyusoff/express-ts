# Admin Module - Database Schema

## Overview

The Admin Module uses the `auth` database and manages 11 core tables related to navigation hierarchies, role-based access control, group management, and administrative functions. This consolidates navigation, role, and group management systems.

---

## Core Tables

### navigation
**Purpose**: Define menu structure, links, and navigation hierarchy

**SQL Definition**:
```sql
CREATE TABLE `navigation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  `position` int NOT NULL DEFAULT '0',
  `section_id` int DEFAULT NULL,
  `parent_nav_id` int DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_nav_id` (`parent_nav_id`),
  KEY `status` (`status`),
  KEY `type` (`type`)
);
```

**TypeScript Interface**:
```typescript
export interface Navigation extends RowDataPacket {
  children?: Navigation[] | null;
  id: number;
  parent_nav_id: null | number;
  path: null | string;
  position: number;
  section_id: null | number;
  status: number;
  title: string;
  type: string;
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key, auto-increment |
| title | varchar(255) | Menu item display text |
| type | varchar(50) | Type: 'section', 'menu', 'item', 'link' |
| path | varchar(255) | Route path (e.g., /dashboard, /reports) |
| position | int | Display order within parent |
| section_id | int | Belongs to section group |
| parent_nav_id | int | Parent navigation item ID |
| status | tinyint | 1=Active, 0=Inactive |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Key Queries**:
```typescript
// Get all navigation (hierarchical tree)
SELECT * FROM navigation WHERE status = 1 ORDER BY position, id;

// Get navigation hierarchy for group
SELECT DISTINCT n.* FROM group_nav gn
LEFT JOIN navigation n ON gn.nav_id = n.id
WHERE gn.group_id = ? ORDER BY n.position;

// Get user's navigation (via groups)
SELECT DISTINCT n.* FROM user_groups ug
INNER JOIN group_nav gn ON ug.group_id = gn.group_id
INNER JOIN navigation n ON gn.nav_id = n.id
WHERE ug.user_id = ? ORDER BY n.position;

// Get children of navigation item
SELECT * FROM navigation WHERE parent_nav_id = ? ORDER BY position;
```

---

### group_nav
**Purpose**: Many-to-many relationship between groups and navigation items

**SQL Definition**:
```sql
CREATE TABLE `group_nav` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nav_id` int NOT NULL,
  `group_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nav_group_unique` (`nav_id`, `group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `group_nav_ibfk_1` FOREIGN KEY (`nav_id`) REFERENCES `navigation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_nav_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
);
```

**Purpose**: Control which groups can see which navigation items

**Key Queries**:
```typescript
// Add navigation to group
INSERT INTO group_nav (nav_id, group_id) VALUES (?, ?);

// Remove navigation from group
DELETE FROM group_nav WHERE nav_id = ? AND group_id = ?;

// Get all navigation for a group
SELECT nav_id FROM group_nav WHERE group_id = ?;

// Get all groups that can see navigation
SELECT group_id FROM group_nav WHERE nav_id = ?;
```

---

### roles
**Purpose**: Define system roles with permissions

**SQL Definition**:
```sql
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `views` tinyint DEFAULT '0',
  `creates` tinyint DEFAULT '0',
  `updates` tinyint DEFAULT '0',
  `deletes` tinyint DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `status` (`status`)
);
```

**TypeScript Interface**:
```typescript
export interface Role {
  create_at: Date;
  creates: number;
  deletes: number;
  desc?: string;
  id: number;
  name: string;
  status: number;
  update_at: Date;
  updates: number;
  views: number;
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key, auto-increment |
| name | varchar(255) | Role name (unique) |
| desc | varchar(255) | Role description |
| views | tinyint | Can view/read (1=true, 0=false) |
| creates | tinyint | Can create records |
| updates | tinyint | Can update/modify records |
| deletes | tinyint | Can delete records |
| status | tinyint | 1=Active, 0=Inactive |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Standard Roles**:
```
ID 1: Admin - Full permissions (v,c,u,d = 1,1,1,1)
ID 2: Manager - Read, create, update (1,1,1,0)
ID 3: Employee - Read only (1,0,0,0)
ID 4: Viewer - View reports only (1,0,0,0)
```

**Key Queries**:
```typescript
// Get all roles
SELECT * FROM roles WHERE status = 1;

// Get users with role
SELECT u.* FROM users u WHERE u.role = ?;

// Get role with permission details
SELECT id, name, desc, views, creates, updates, deletes 
FROM roles WHERE id = ?;
```

---

### permissions
**Purpose**: Define granular permissions in the system

**SQL Definition**:
```sql
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(255) NOT NULL,
  `description` text,
  `module` varchar(100) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_name` (`permission_name`),
  KEY `module` (`module`)
);
```

**Common Permissions**:
```
navigation.view         - View navigation menu
navigation.edit         - Edit navigation items
navigation.delete       - Delete navigation items
roles.view              - View roles
roles.create            - Create roles
roles.edit              - Edit roles
roles.delete            - Delete roles
groups.view             - View groups
groups.create           - Create groups
groups.edit             - Edit groups
groups.delete           - Delete groups
reports.generate        - Generate reports
data.import             - Import data
```

---

### groups
**Purpose**: Organize users into logical groups/departments

**SQL Definition**:
```sql
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `status` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `status` (`status`)
);
```

**TypeScript Interface**:
```typescript
export interface Group {
  created_at: string;
  desc: string;
  id: number;
  name: string;
  status: number;
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key, auto-increment |
| name | varchar(255) | Group name (unique) |
| description | text | Group description/purpose |
| status | tinyint | 1=Active, 0=Inactive |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Standard Groups** (examples):
```
ID 1: Admin - System administrators
ID 2: Engineering - Engineering team
ID 3: Sales - Sales team
ID 4: Finance - Finance team
ID 5: HR - Human Resources
```

**Key Queries**:
```typescript
// Get all groups
SELECT * FROM groups WHERE status = 1;

// Get group members
SELECT u.* FROM users u
JOIN user_groups ug ON u.id = ug.user_id
WHERE ug.group_id = ?;

// Get user's groups
SELECT g.* FROM groups g
JOIN user_groups ug ON g.id = ug.group_id
WHERE ug.user_id = ?;
```

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

**Purpose**: Track which users belong to which groups

**Key Queries**:
```typescript
// Add user to group
INSERT INTO user_groups (user_id, group_id) VALUES (?, ?);

// Remove user from group
DELETE FROM user_groups WHERE user_id = ? AND group_id = ?;

// Get user's groups
SELECT group_id FROM user_groups WHERE user_id = ?;

// Get group members
SELECT user_id FROM user_groups WHERE group_id = ?;
```

---

### modules
**Purpose**: System modules and features

**SQL Definition**:
```sql
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(100) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
);
```

**Sample Modules**:
```
ID 1: Dashboard
ID 2: Assets
ID 3: Maintenance
ID 4: Billing
ID 5: Compliance
ID 6: Reports
ID 7: Users
ID 8: Settings
```

---

### module_members
**Purpose**: Control which groups can access which modules

**SQL Definition**:
```sql
CREATE TABLE `module_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `group_id` int NOT NULL,
  `access_level` varchar(50) DEFAULT 'read',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_group_unique` (`module_id`, `group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `module_members_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `module_members_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
);
```

---

### workflows
**Purpose**: Define workflow processes and state transitions

**SQL Definition**:
```sql
CREATE TABLE `workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `steps` json DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
);
```

**Example Workflows**:
```json
{
  "id": 1,
  "name": "Approval Workflow",
  "steps": [
    {"step": 1, "name": "Submit", "status": "draft"},
    {"step": 2, "name": "Review", "status": "pending_review"},
    {"step": 3, "name": "Approve", "status": "approved"},
    {"step": 4, "name": "Complete", "status": "completed"}
  ]
}
```

---

### logs_auth
**Purpose**: Audit trail for authentication and authorization events

**SQL Definition**:
```sql
CREATE TABLE `logs_auth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `details` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `action` (`action`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `logs_auth_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
```

**Logged Actions**:
```
login               - User login
logout              - User logout
navigation_access   - Navigation viewed
role_change         - Role changed
group_change        - Group membership changed
permission_denied   - Access denied
```

---

## Sample Data

### Sample Navigation Structure
```json
[
  {
    "id": 1,
    "title": "Dashboard",
    "type": "menu",
    "path": "/dashboard",
    "position": 1,
    "parent_nav_id": null,
    "status": 1
  },
  {
    "id": 2,
    "title": "Administration",
    "type": "section",
    "position": 5,
    "parent_nav_id": null,
    "status": 1,
    "children": [
      {
        "id": 3,
        "title": "Users",
        "type": "menu",
        "path": "/admin/users",
        "position": 1,
        "parent_nav_id": 2,
        "status": 1
      },
      {
        "id": 4,
        "title": "Roles",
        "type": "menu",
        "path": "/admin/roles",
        "position": 2,
        "parent_nav_id": 2,
        "status": 1
      },
      {
        "id": 5,
        "title": "Groups",
        "type": "menu",
        "path": "/admin/groups",
        "position": 3,
        "parent_nav_id": 2,
        "status": 1
      }
    ]
  }
]
```

### Sample Role
```json
{
  "id": 2,
  "name": "Manager",
  "desc": "Department manager with read/create/update permissions",
  "views": 1,
  "creates": 1,
  "updates": 1,
  "deletes": 0,
  "status": 1,
  "created_at": "2024-12-25T10:00:00Z",
  "updated_at": "2024-12-25T10:00:00Z"
}
```

### Sample Group with Users & Navigation
```json
{
  "id": 2,
  "name": "Engineering",
  "description": "Engineering team members",
  "status": 1,
  "created_at": "2024-12-01T09:00:00Z",
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@company.com",
      "username": "jdoe"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@company.com",
      "username": "jsmith"
    }
  ],
  "navTree": [
    {
      "navId": 10,
      "title": "Projects",
      "path": "/projects"
    },
    {
      "navId": 15,
      "title": "Issues",
      "path": "/issues"
    }
  ]
}
```

---

## Table Relationships

```
users (1) ──── (many) user_groups
groups (1) ──── (many) user_groups
groups (1) ──── (many) group_nav
navigation (1) ──── (many) group_nav
users (1) ──── (many) logs_auth
roles (1) ──── (many) users
permissions (1) ──── (many) roles (implied)
modules (1) ──── (many) module_members
groups (1) ──── (many) module_members
workflows (1) ──── (many) steps (json)
```

---

## Database Optimization

### Indexes
```sql
-- Primary keys (auto)
ALTER TABLE navigation ADD PRIMARY KEY (id);
ALTER TABLE roles ADD PRIMARY KEY (id);
ALTER TABLE groups ADD PRIMARY KEY (id);
ALTER TABLE user_groups ADD PRIMARY KEY (id);
ALTER TABLE group_nav ADD PRIMARY KEY (id);

-- Unique constraints
ALTER TABLE navigation ADD UNIQUE(path);
ALTER TABLE roles ADD UNIQUE(name);
ALTER TABLE groups ADD UNIQUE(name);

-- Foreign key indexes
ALTER TABLE group_nav ADD INDEX(nav_id), ADD INDEX(group_id);
ALTER TABLE user_groups ADD INDEX(user_id), ADD INDEX(group_id);
ALTER TABLE module_members ADD INDEX(module_id), ADD INDEX(group_id);

-- Search/filter indexes
ALTER TABLE navigation ADD INDEX(status), ADD INDEX(type), ADD INDEX(parent_nav_id);
ALTER TABLE roles ADD INDEX(status);
ALTER TABLE groups ADD INDEX(status);
ALTER TABLE logs_auth ADD INDEX(user_id), ADD INDEX(action), ADD INDEX(created_at);
```

### Query Performance Tips
1. Use indexes on `status` for active-only queries
2. Leverage foreign key indexes for JOINs
3. Use LEFT JOIN for optional group_nav relationships
4. Cache navigation trees (rarely changes)
5. Build hierarchies in application (not queries)
6. Use DISTINCT carefully (can be slow on large datasets)

---

## Sample Queries

### Get Complete User Navigation
```sql
SELECT DISTINCT n.*
FROM users u
LEFT JOIN user_groups ug ON u.id = ug.user_id
LEFT JOIN group_nav gn ON ug.group_id = gn.group_id
LEFT JOIN navigation n ON gn.nav_id = n.id
WHERE u.id = ? AND n.status = 1
ORDER BY n.position, n.id;
```

### Get All Users with Their Roles & Groups
```sql
SELECT u.id, u.fname, u.email, 
       r.name as role,
       GROUP_CONCAT(g.name) as groups
FROM users u
LEFT JOIN roles r ON u.role = r.id
LEFT JOIN user_groups ug ON u.id = ug.user_id
LEFT JOIN groups g ON ug.group_id = g.id
WHERE u.status = 1
GROUP BY u.id;
```

### Get Navigation Tree for Group
```sql
SELECT n.*
FROM group_nav gn
LEFT JOIN navigation n ON gn.nav_id = n.id
WHERE gn.group_id = ? AND n.status = 1
ORDER BY n.parent_nav_id, n.position;
```

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [API.md](API.md) - Complete API reference
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and improvements
