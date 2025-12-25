# Admin Module (p.admin)

## Module Overview

The Admin Module is a comprehensive administrative system that handles navigation management, role-based access control, group management, and data import/export operations. It consolidates three previously separate modules (p.nav, p.role, p.group) into a single cohesive administration layer.

**Key Features**:
- **Navigation Management**: Create and manage hierarchical menu structures with permission-based access
- **Role Management**: Define roles with granular permissions (view, create, update, delete)
- **Group Management**: Organize users into groups with role assignments and navigation access control
- **Route Tracking**: Track user navigation paths for analytics and debugging
- **Data Import**: Import data from CSV/Excel into temporary tables for batch processing
- **Permission System**: Group-based permissions that control navigation and feature access

---

## Architecture

### MVC Structure
```
src/p.admin/
├── adminController.ts      # Business logic (420+ lines, merged from nav/role/group controllers)
├── adminModel.ts           # Database operations (350+ lines, merged models)
├── adminRoutes.ts          # API route definitions (consolidated routes)
├── importerController.ts   # Temporary table import functionality
├── importerModel.ts        # Importer database operations
├── importerRoutes.ts       # Importer routes
├── logModel.ts             # Audit logging operations
├── notificationModel.ts    # Notification system integration
├── README.md               # This file
├── SCHEMA.md               # Database schema documentation
├── API.md                  # Complete API reference
└── ENHANCEMENTS.md         # Features and improvements
```

### Database Design
- **Database**: `auth` (shared infrastructure)
- **Core Tables**: 
  - Navigation: `navigation`, `group_nav`
  - Roles: `roles`, `permissions`
  - Groups: `groups`, `user_groups`
  - Support: `modules`, `module_members`, `workflows`, `logs_auth`
- **Connection**: MySQL connection pool via `pool` from `src/utils/db.ts`

### Module Integration

This module consolidated 3 previously separate modules:
1. **p.nav** - Navigation management with group-based access control
2. **p.role** - Role definition and permission management
3. **p.group** - User grouping and group-navigation mapping

---

## Key Workflows

### 1. Navigation Structure Management
```
Admin Creates Navigation Item
      │
      ├─ Set Type (section, menu, item)
      ├─ Define Parent-Child Relationship
      ├─ Set Position/Order
      └─ Configure Path
      │
      ▼
Assign Navigation to Groups
      │
      ├─ Select Groups with Access
      ├─ Store in group_nav Table
      └─ Permissions Applied
      │
      ▼
User With Group Access Sees Item
      │
      ├─ On Login: Build Navigation Tree
      ├─ Filter by User's Groups
      └─ Display Hierarchical Menu
```

### 2. Role-Based Access Control
```
Admin Creates Role
      │
      ├─ Set Permissions
      │  ├─ view (read operations)
      │  ├─ create (new records)
      │  ├─ update (modify records)
      │  └─ delete (remove records)
      │
      ├─ Assign Users to Role
      └─ Role Saved to Database
      │
      ▼
Admin Assigns Users to Groups
      │
      ├─ Users in Groups Inherit Permissions
      ├─ Navigation Access Determined by Group
      └─ Feature Access Restricted by Role
```

### 3. Group Membership Management
```
Admin Creates Group
      │
      ├─ Set Group Name & Description
      ├─ Assign Users (multiple)
      └─ Assign Navigation Items (multiple)
      │
      ▼
User Added to Group
      │
      ├─ Gets Access to Group's Navigation
      ├─ Inherits Group Permissions
      └─ Navigation Tree Updated
```

---

## Main Operations

### Navigation Operations
```typescript
// Get all navigation items (hierarchical tree)
getNavigations() → Navigation[]

// Create navigation item
createNavigationHandler(data) → {id, message, status}

// Update navigation item
updateNavigationHandler(id, data) → {data, message, status}

// Delete navigation item (cascades to group_nav)
deleteNavigationHandler(id) → {affectedRows, message}

// Get navigation by user ID (filtered by groups)
getNavigationByUserIdHandler(userId) → {navTree, message}

// Manage navigation permissions
updateNavigationPermissionsHandler(permissions) → {message}
removeNavigationPermissionsHandler(permissions) → {message}

// Track route access
trackRoute(path, userId) → {message}
```

### Role Operations
```typescript
// Get all roles with user mappings
getAllRole() → {data: [Role], message}

// Get role by ID
getRole(id) → {role: Role}

// Create new role
createNewRole(data) → {id, message, success}

// Update role
updateRoleById(id, data) → {id, message, success}
```

### Group Operations
```typescript
// Get all groups with users and navigation
getAllGroupsStructured() → {data: [GroupWithDetails]}

// Get group by ID
getGroupById1(id) → Group

// Create group
createGroup1(data) → {result}

// Update group and its associations
updateGroup1(id, data) → {message, success}
```

---

## Quick Start Examples

### Create Navigation Menu
```bash
curl -X POST http://localhost:3000/api/admin/nav \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reports",
    "type": "menu",
    "path": "/reports",
    "position": 5,
    "status": 1,
    "permittedGroups": [1, 2, 3]
  }'
```

### Create Role
```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manager",
    "description": "Department manager role",
    "permissions": {
      "view": true,
      "create": true,
      "update": true,
      "delete": false
    },
    "userIds": [5, 10, 15]
  }'
```

### Create Group
```bash
curl -X POST http://localhost:3000/api/admin/groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "desc": "Engineering team members",
    "status": 1,
    "userIds": [1, 2, 3, 4],
    "navIds": [10, 15, 20]
  }'
```

### Update Group with Users & Navigation
```bash
curl -X PUT http://localhost:3000/api/admin/groups/5 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "desc": "Engineering team",
    "status": 1,
    "userIds": [1, 2, 3, 6, 8],
    "navIds": [10, 15, 20, 25]
  }'
```

### Get Navigation by User
```bash
# Returns navigation tree filtered by user's group access
curl -X GET http://localhost:3000/api/admin/nav/access/101 \
  -H "Authorization: Bearer {token}"
```

### Track User Route
```bash
curl -X PUT http://localhost:3000/api/admin/nav/track-route \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/dashboard",
    "userId": 101
  }'
```

---

## Database Statistics

| Metric | Count |
|--------|-------|
| Tables | 11 (navigation, group_nav, roles, permissions, groups, user_groups, modules, module_members, workflows, logs_auth, notifications) |
| Navigation Fields | 8 (id, title, type, path, position, section_id, parent_nav_id, status) |
| Role Fields | 10 (id, name, desc, views, creates, updates, deletes, status, create_at, update_at) |
| Group Fields | 5 (id, name, desc, status, created_at) |
| API Endpoints | 35+ |
| Key Indexes | 15+ |

---

## Technologies Used

- **Language**: TypeScript
- **Database**: MySQL 8.0+
- **Connection Pool**: mysql2/promise
- **Authentication**: JWT Bearer tokens
- **Validation**: Custom middleware and controller-level validation
- **Utilities**: navBuilder for hierarchical tree generation
- **Logging**: Custom logger utility

---

## Access Control Model

### Permission Types
```
view       - Read/view operations
create     - Create new records
update     - Modify existing records
delete     - Remove records
```

### Group-Based Access
- Users belong to groups (departments, teams, roles)
- Groups have permissions (from roles table)
- Groups control navigation access (via group_nav table)
- Groups control module access (via module_members table)

### Navigation Hierarchy
```
Root Level (Sections)
├─ Section 1
│  ├─ Menu Item 1
│  ├─ Menu Item 2
│  └─ Menu Item 3
├─ Section 2
│  └─ Menu Item 4
└─ Direct Links (no section)
   └─ Menu Item 5
```

---

## Common Use Cases

### 1. Set Up Department Navigation
```
1. Create "Engineering" group
2. Create navigation items (Roadmap, Issues, Repos)
3. Assign navigation to group
4. Add users to group
5. Users see filtered navigation
```

### 2. Create New Role with Permissions
```
1. Define "Analyst" role
2. Set permissions (view, create, update)
3. Assign users to role
4. Users restricted to permission scope
```

### 3. Add New Feature Menu
```
1. Create navigation items in hierarchy
2. Assign to appropriate groups
3. Set permissions via role system
4. Enable gradually with status toggle
```

### 4. Track User Navigation
```
1. Frontend sends route on navigation
2. System records in users.last_nav
3. Analytics queries navigation patterns
4. Helps identify feature usage
```

---

## Merged Module Consolidation

### What Was Consolidated
- **p.nav** → Navigation menu and group-nav mapping
- **p.role** → Role definitions and permissions
- **p.group** → User groups and group management

### Why Consolidation
- Single responsibility domain (administration)
- Shared database and dependencies
- Common access patterns
- Unified API surface

### File Changes
- Old: `/p.nav/navController.ts` → `/p.admin/adminController.ts` (nav functions)
- Old: `/p.role/roleController.ts` → `/p.admin/adminController.ts` (role functions)
- Old: `/p.group/groupController.ts` → `/p.admin/adminController.ts` (group functions)
- Old: `/p.nav/navModel.ts` → `/p.admin/adminModel.ts` (navigation operations)
- Old: `/p.role/roleModel.ts` → `/p.admin/adminModel.ts` (role operations)
- Old: `/p.group/groupModel.ts` → `/p.admin/adminModel.ts` (group operations)
- Old: Routes at `/api/nav`, `/api/roles`, `/api/groups`
- New: Routes at `/api/admin/nav`, `/api/admin/roles`, `/api/admin/groups`

---

## Migration Path

### URL Mapping (Old → New)
```
/api/nav/*          → /api/admin/nav/*
/api/roles/*        → /api/admin/roles/*
/api/groups/*       → /api/admin/groups/*
/api/importer/*     → /api/admin/import-temp-table (via /tables)
```

### Frontend Updates Needed
- Update all API calls to `/api/admin/` prefix
- Import statements from `p.nav`, `p.role`, `p.group` → `p.admin`
- No logic changes required, only URL paths

---

## Error Handling

### Common Errors
- `400 Bad Request`: Missing or invalid data
- `401 Unauthorized`: No/invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Item not found
- `500 Internal Error`: Database/server error

### Validation
- Navigation: Required fields (title, type, position, status)
- Role: Required fields (name, permissions object)
- Group: Required fields (name, desc, status)

---

## Performance Considerations

### Indexes
- Primary keys on all tables (id)
- Foreign key indexes (group_id, nav_id, user_id)
- Search indexes (status, name)
- Hierarchy indexes (parent_nav_id)

### Query Optimization
- Use GROUP_CONCAT for user-group mapping
- LEFT JOIN for optional group_nav relationships
- DISTINCT for navigation without duplicates
- Build trees in memory (not in queries)

---

## Future Enhancements

### Short-term
- [ ] Bulk import navigation structures
- [ ] Role duplication/templates
- [ ] Group hierarchy (parent-child groups)
- [ ] Navigation drag-drop reordering UI

### Medium-term
- [ ] Advanced permission system (ACL)
- [ ] Dynamic role creation from permissions
- [ ] Navigation versioning/history
- [ ] Permission audit logging

### Long-term
- [ ] RBAC with resource-level permissions
- [ ] Workflow engine integration
- [ ] Multi-tenant support
- [ ] Permission inheritance rules

---

## See Also
- [SCHEMA.md](SCHEMA.md) - Database schema and table definitions
- [API.md](API.md) - Complete API reference with examples
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and implementation details
- [Auth Module README](../p.auth/README.md) - Authentication (uses user roles)
- [User Module README](../p.user/README.md) - User management (belongs to groups)
