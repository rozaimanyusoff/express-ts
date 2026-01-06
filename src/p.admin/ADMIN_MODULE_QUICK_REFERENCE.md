# Admin Module - Quick Reference

## 🚀 Getting Started

All admin API endpoints are now at `/api/admin/`:

### Base URL
```
http://localhost:3000/api/admin
```

### Authentication
All requests require JWT Bearer token:
```
Authorization: Bearer {your_token}
Content-Type: application/json
```

---

## 📋 Navigation Endpoints

### Get User's Navigation
```bash
GET /api/admin/nav/user/1
```
Returns all navigation items user 1 can access (based on their groups)

### Create Navigation Item
```bash
POST /api/admin/nav
Content-Type: application/json

{
  "title": "Reports",
  "type": "menu",
  "path": "/reports",
  "position": 3,
  "status": 1
}
```

### Get Navigation Tree
```bash
GET /api/admin/nav/tree
```
Returns hierarchical menu structure

### Toggle Navigation Visibility
```bash
PUT /api/admin/nav/5/toggle-status
```
Enable/disable menu item without deletion

---

## 👥 Role Endpoints

### Get All Roles
```bash
GET /api/admin/roles
```

### Create Role
```bash
POST /api/admin/roles
Content-Type: application/json

{
  "name": "Analyst",
  "desc": "Data analyst with read-only access",
  "views": 1,
  "creates": 0,
  "updates": 0,
  "deletes": 0
}
```

### Permission Model
```
views = 1   : Can view/read data
creates = 1 : Can create new records
updates = 1 : Can modify records
deletes = 1 : Can delete records
```

---

## 👨‍💼 Group Endpoints

### Get All Groups
```bash
GET /api/admin/groups
```

### Create Group
```bash
POST /api/admin/groups
Content-Type: application/json

{
  "name": "Engineering",
  "desc": "Engineering team",
  "status": 1
}
```

### Add User to Group
```bash
POST /api/admin/groups/2/users
Content-Type: application/json

{
  "user_id": 5
}
```

### Assign Navigation to Group
```bash
POST /api/admin/groups/2/nav
Content-Type: application/json

{
  "nav_id": 10
}
```

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `navigation` | Menu items & hierarchy |
| `group_nav` | Which groups can see which menus |
| `roles` | User roles with CRUD permissions |
| `groups` | User groups/departments |
| `user_groups` | User-group membership |
| `permissions` | Permission definitions |
| `modules` | System modules |
| `module_members` | Module access control |

---

## ⚙️ Common Workflows

### Add New User to Engineering Group
```bash
# 1. User created in user module (assume user_id = 5)

# 2. Add to Engineering group
POST /api/admin/groups/2/users
{
  "user_id": 5
}

# 3. User sees all Engineering group's navigation
GET /api/admin/nav/user/5
# Returns: [Dashboard, Projects, Issues, etc.]
```

### Promote Employee to Manager
```bash
# 1. Update user's role (done in user module)
# UPDATE users SET role = 2 WHERE id = 5;

# 2. Manager now has create/update permissions
# No navigation change needed - same menu, more actions
```

### Configure Department Menu
```bash
# 1. Create Finance group
POST /api/admin/groups
{
  "name": "Finance",
  "desc": "Finance team"
}
# Returns: group_id = 3

# 2. Create/find Billing navigation (assume nav_id = 20)

# 3. Assign to Finance group
POST /api/admin/groups/3/nav
{
  "nav_id": 20
}

# 4. All Finance users now see Billing in menu
```

---

## 🔍 Common Queries

### Check User's Groups
```bash
# User 5's groups
SELECT g.* FROM groups g
JOIN user_groups ug ON g.id = ug.group_id
WHERE ug.user_id = 5;
```

### Check Group's Users
```bash
# All users in Finance group (id=3)
SELECT u.* FROM users u
JOIN user_groups ug ON u.id = ug.user_id
WHERE ug.group_id = 3;
```

### Check Navigation Access
```bash
# All navigation that Engineering group can see
SELECT n.* FROM navigation n
JOIN group_nav gn ON n.id = gn.nav_id
WHERE gn.group_id = 2
ORDER BY n.position;
```

### Check User's Navigation
```bash
# All menu items user 5 can access
SELECT DISTINCT n.* FROM users u
LEFT JOIN user_groups ug ON u.id = ug.user_id
LEFT JOIN group_nav gn ON ug.group_id = gn.group_id
LEFT JOIN navigation n ON gn.nav_id = n.id
WHERE u.id = 5 AND n.status = 1
ORDER BY n.position;
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Missing required field: title",
  "data": null
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Invalid or missing JWT token",
  "data": null
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Your role does not have delete permissions",
  "data": null
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Navigation item not found",
  "data": null
}
```

### 409 Conflict
```json
{
  "status": "error",
  "message": "Role name already exists",
  "data": null
}
```

---

## 📚 Full Documentation

- **[README.md](src/p.admin/README.md)** - Module overview & workflows
- **[SCHEMA.md](src/p.admin/SCHEMA.md)** - Database schema & design
- **[API.md](src/p.admin/API.md)** - Complete API reference (35+ endpoints)
- **[ENHANCEMENTS.md](src/p.admin/ENHANCEMENTS.md)** - Features & improvements

---

## 🔗 Route Changes from Original

| Old | New |
|-----|-----|
| `/api/nav` | `/api/admin/nav` |
| `/api/roles` | `/api/admin/roles` |
| `/api/groups` | `/api/admin/groups` |

**Note**: All routes now consolidated under `/api/admin/`

---

## 📊 Response Format

All responses follow consistent format:

### Success
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": { /* actual data */ }
}
```

### Error
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

---

## 🛡️ Security Notes

- All routes require JWT authentication
- Permission checks enforced on role
- Group membership controls navigation visibility
- All operations logged to audit trail
- SQL injection prevented via parameterized queries

---

## ⚡ Performance Tips

1. **Navigation Tree**: Built on-demand, consider caching
2. **User Groups**: Cache user's groups for session duration
3. **Batch Operations**: Use bulk endpoints for 10+ items
4. **Indexes**: Key columns indexed for fast lookups

---

## 🆘 Troubleshooting

### User can't see navigation item
1. Check user is in group: `SELECT * FROM user_groups WHERE user_id = ?`
2. Check group has nav: `SELECT * FROM group_nav WHERE group_id = ?`
3. Check nav is active: `SELECT status FROM navigation WHERE id = ?`

### Role permissions not working
1. Verify user role: `SELECT role FROM users WHERE id = ?`
2. Check role has permission: `SELECT creates FROM roles WHERE id = ?`
3. Verify middleware enforces checks in routes

### Navigation shows duplicates
1. Check for duplicate entries: `SELECT COUNT(*), nav_id FROM group_nav GROUP BY nav_id HAVING COUNT(*) > 1`
2. Remove duplicates: `DELETE FROM group_nav WHERE id IN (SELECT id FROM ...)`

---

## 💡 Examples

### cURL Examples

#### Get all navigation
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/nav
```

#### Create role
```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Viewer",
    "desc": "Read-only user",
    "views": 1, "creates": 0, "updates": 0, "deletes": 0
  }'
```

#### Assign user to group
```bash
curl -X POST http://localhost:3000/api/admin/groups/2/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5}'
```

---

Last Updated: December 25, 2024
Consolidated Modules: p.nav, p.role, p.group → p.admin
