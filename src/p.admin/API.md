# Admin Module - API Reference

## Overview

The Admin API provides endpoints for managing navigation hierarchies, roles, groups, and related configurations. All endpoints require JWT authentication and are prefixed with `/api/admin/`.

**Base URL**: `http://localhost:3000/api/admin`
**Authentication**: JWT Bearer Token (header: `Authorization: Bearer {token}`)
**Content-Type**: `application/json`

---

## Navigation Endpoints

### Route Tracking

#### Track User Navigation
```
POST /api/admin/nav/track-route
```

**Purpose**: Log user navigation activity for analytics

**Request Body**:
```json
{
  "user_id": 1,
  "nav_id": 5,
  "route": "/dashboard",
  "timestamp": "2024-12-25T10:00:00Z"
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Route tracked successfully",
  "data": {
    "id": 42,
    "user_id": 1,
    "nav_id": 5,
    "route": "/dashboard",
    "tracked_at": "2024-12-25T10:00:00Z"
  }
}
```

**Error Response (400)**:
```json
{
  "status": "error",
  "message": "Invalid user or navigation ID",
  "data": null
}
```

---

### Navigation CRUD

#### Get All Navigation Items
```
GET /api/admin/nav
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | int | No | Filter by status (1=active, 0=inactive) |
| type | string | No | Filter by type (section/menu/item/link) |

**Example**: `GET /api/admin/nav?status=1&type=menu`

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation items retrieved",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "type": "menu",
      "path": "/dashboard",
      "position": 1,
      "section_id": null,
      "parent_nav_id": null,
      "status": 1,
      "children": []
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
        }
      ]
    }
  ]
}
```

---

#### Create Navigation Item
```
POST /api/admin/nav
```

**Request Body**:
```json
{
  "title": "Reports",
  "type": "menu",
  "path": "/reports",
  "position": 3,
  "parent_nav_id": null,
  "section_id": null,
  "status": 1
}
```

**Success Response (201)**:
```json
{
  "status": "success",
  "message": "Navigation item created",
  "data": {
    "id": 25,
    "title": "Reports",
    "type": "menu",
    "path": "/reports",
    "position": 3,
    "status": 1,
    "created_at": "2024-12-25T10:00:00Z"
  }
}
```

**Error Response (400)**:
```json
{
  "status": "error",
  "message": "Missing required field: title",
  "data": null
}
```

---

#### Update Navigation Item
```
PUT /api/admin/nav/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Navigation item ID |

**Request Body** (all fields optional):
```json
{
  "title": "Reports Dashboard",
  "path": "/reports/dashboard",
  "position": 2,
  "status": 1
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation item updated",
  "data": {
    "id": 25,
    "title": "Reports Dashboard",
    "path": "/reports/dashboard",
    "position": 2,
    "status": 1,
    "updated_at": "2024-12-25T10:30:00Z"
  }
}
```

**Error Response (404)**:
```json
{
  "status": "error",
  "message": "Navigation item not found",
  "data": null
}
```

---

#### Delete Navigation Item
```
DELETE /api/admin/nav/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Navigation item ID |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation item deleted",
  "data": {
    "id": 25,
    "affected_rows": 1
  }
}
```

**Error Response (404)**:
```json
{
  "status": "error",
  "message": "Navigation item not found",
  "data": null
}
```

---

#### Toggle Navigation Status
```
PUT /api/admin/nav/:id/toggle-status
```

**Purpose**: Enable/disable navigation item visibility

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Navigation item ID |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation status toggled",
  "data": {
    "id": 25,
    "status": 0,
    "title": "Reports"
  }
}
```

---

#### Get Navigation by User ID
```
GET /api/admin/nav/user/:userId
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | int | User ID |

**Purpose**: Get all navigation items accessible by a user based on their groups

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "User navigation retrieved",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "type": "menu",
      "status": 1
    },
    {
      "id": 10,
      "title": "Projects",
      "path": "/projects",
      "type": "menu",
      "status": 1
    }
  ]
}
```

---

#### Reorder Navigation Items
```
PUT /api/admin/nav/reorder
```

**Purpose**: Change display order of navigation items

**Request Body**:
```json
{
  "items": [
    {
      "id": 1,
      "position": 1
    },
    {
      "id": 2,
      "position": 2
    },
    {
      "id": 3,
      "position": 3
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation items reordered",
  "data": {
    "updated_count": 3,
    "items": [
      {"id": 1, "position": 1},
      {"id": 2, "position": 2},
      {"id": 3, "position": 3}
    ]
  }
}
```

---

### Navigation Permissions

#### Get Navigation Permissions
```
GET /api/admin/permissions/nav/:navId
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| navId | int | Navigation ID |

**Purpose**: Get all groups that have access to a navigation item

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation permissions retrieved",
  "data": {
    "nav_id": 5,
    "nav_title": "Reports",
    "groups": [
      {
        "group_id": 1,
        "group_name": "Admin",
        "access": "full"
      },
      {
        "group_id": 2,
        "group_name": "Managers",
        "access": "read"
      }
    ]
  }
}
```

---

#### Update Navigation Permission
```
PUT /api/admin/permissions/nav/:navId
```

**Purpose**: Add or update group access to navigation item

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| navId | int | Navigation ID |

**Request Body**:
```json
{
  "group_id": 2,
  "access": "read"
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Permission updated",
  "data": {
    "nav_id": 5,
    "group_id": 2,
    "access": "read"
  }
}
```

---

#### Remove Navigation Permission
```
DELETE /api/admin/permissions/nav/:navId/:groupId
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| navId | int | Navigation ID |
| groupId | int | Group ID |

**Purpose**: Revoke group access to navigation item

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Permission removed",
  "data": {
    "nav_id": 5,
    "group_id": 2
  }
}
```

---

#### Get Navigation Tree (Hierarchical)
```
GET /api/admin/nav/tree
```

**Purpose**: Get complete navigation hierarchy with parent-child relationships

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| root_only | boolean | Get only root level items (no children) |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation tree retrieved",
  "data": [
    {
      "id": 1,
      "title": "Dashboard",
      "path": "/dashboard",
      "position": 1,
      "children": []
    },
    {
      "id": 2,
      "title": "Administration",
      "position": 5,
      "children": [
        {
          "id": 3,
          "title": "Users",
          "path": "/admin/users",
          "position": 1,
          "children": []
        }
      ]
    }
  ]
}
```

---

## Role Endpoints

#### Get All Roles
```
GET /api/admin/roles
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | int | No | Filter by status (1=active, 0=inactive) |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Roles retrieved",
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "desc": "System administrator",
      "views": 1,
      "creates": 1,
      "updates": 1,
      "deletes": 1,
      "status": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Manager",
      "desc": "Department manager",
      "views": 1,
      "creates": 1,
      "updates": 1,
      "deletes": 0,
      "status": 1,
      "created_at": "2024-01-02T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

---

#### Get Role by ID
```
GET /api/admin/roles/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Role ID |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Role retrieved",
  "data": {
    "id": 2,
    "name": "Manager",
    "desc": "Department manager with read/create/update",
    "views": 1,
    "creates": 1,
    "updates": 1,
    "deletes": 0,
    "status": 1
  }
}
```

**Error Response (404)**:
```json
{
  "status": "error",
  "message": "Role not found",
  "data": null
}
```

---

#### Create Role
```
POST /api/admin/roles
```

**Request Body**:
```json
{
  "name": "Analyst",
  "desc": "Data analyst with read-only access",
  "views": 1,
  "creates": 0,
  "updates": 0,
  "deletes": 0,
  "status": 1
}
```

**Required Fields**: name, views, creates, updates, deletes

**Success Response (201)**:
```json
{
  "status": "success",
  "message": "Role created",
  "data": {
    "id": 5,
    "name": "Analyst",
    "desc": "Data analyst with read-only access",
    "views": 1,
    "creates": 0,
    "updates": 0,
    "deletes": 0,
    "status": 1,
    "created_at": "2024-12-25T10:00:00Z"
  }
}
```

**Error Response (400)**:
```json
{
  "status": "error",
  "message": "Role name already exists",
  "data": null
}
```

---

#### Update Role
```
PUT /api/admin/roles/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Role ID |

**Request Body** (all fields optional):
```json
{
  "name": "Senior Analyst",
  "desc": "Senior analyst with update permissions",
  "views": 1,
  "creates": 1,
  "updates": 1,
  "deletes": 0,
  "status": 1
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Role updated",
  "data": {
    "id": 5,
    "name": "Senior Analyst",
    "desc": "Senior analyst with update permissions",
    "views": 1,
    "creates": 1,
    "updates": 1,
    "deletes": 0,
    "status": 1,
    "updated_at": "2024-12-25T11:00:00Z"
  }
}
```

---

## Group Endpoints

#### Get All Groups (Flat)
```
GET /api/admin/groups
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | int | Filter by status (1=active, 0=inactive) |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Groups retrieved",
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "desc": "System administrators",
      "status": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Engineering",
      "desc": "Engineering team",
      "status": 1,
      "created_at": "2024-01-02T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

---

#### Get All Groups (Structured with Members)
```
GET /api/admin/groups/structured
```

**Purpose**: Get groups with their members and navigation assignments

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Groups with structure retrieved",
  "data": [
    {
      "id": 2,
      "name": "Engineering",
      "desc": "Engineering team",
      "status": 1,
      "members": [
        {
          "id": 1,
          "name": "John Doe",
          "email": "john@company.com"
        },
        {
          "id": 2,
          "name": "Jane Smith",
          "email": "jane@company.com"
        }
      ],
      "navigation": [
        {
          "nav_id": 10,
          "title": "Projects"
        },
        {
          "nav_id": 15,
          "title": "Issues"
        }
      ]
    }
  ]
}
```

---

#### Get Group by ID
```
GET /api/admin/groups/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Group ID |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Group retrieved",
  "data": {
    "id": 2,
    "name": "Engineering",
    "desc": "Engineering team",
    "status": 1,
    "created_at": "2024-01-02T00:00:00Z",
    "members": [
      {"id": 1, "name": "John Doe"},
      {"id": 2, "name": "Jane Smith"}
    ]
  }
}
```

---

#### Create Group
```
POST /api/admin/groups
```

**Request Body**:
```json
{
  "name": "Marketing",
  "desc": "Marketing and communications team",
  "status": 1
}
```

**Required Fields**: name

**Success Response (201)**:
```json
{
  "status": "success",
  "message": "Group created",
  "data": {
    "id": 6,
    "name": "Marketing",
    "desc": "Marketing and communications team",
    "status": 1,
    "created_at": "2024-12-25T10:00:00Z"
  }
}
```

**Error Response (400)**:
```json
{
  "status": "error",
  "message": "Group name already exists",
  "data": null
}
```

---

#### Update Group
```
PUT /api/admin/groups/:id
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Group ID |

**Request Body** (all fields optional):
```json
{
  "name": "Marketing & Communications",
  "desc": "Marketing, communications, and PR",
  "status": 1
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Group updated",
  "data": {
    "id": 6,
    "name": "Marketing & Communications",
    "desc": "Marketing, communications, and PR",
    "status": 1,
    "updated_at": "2024-12-25T11:00:00Z"
  }
}
```

---

#### Assign User to Group
```
POST /api/admin/groups/:groupId/users
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| groupId | int | Group ID |

**Request Body**:
```json
{
  "user_id": 5
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "User assigned to group",
  "data": {
    "user_id": 5,
    "group_id": 6,
    "user_name": "John Smith"
  }
}
```

---

#### Remove User from Group
```
DELETE /api/admin/groups/:groupId/users/:userId
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| groupId | int | Group ID |
| userId | int | User ID |

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "User removed from group",
  "data": {
    "user_id": 5,
    "group_id": 6
  }
}
```

---

#### Assign Navigation to Group
```
POST /api/admin/groups/:groupId/nav
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| groupId | int | Group ID |

**Request Body**:
```json
{
  "nav_id": 10
}
```

**Purpose**: Grant group access to navigation item

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation assigned to group",
  "data": {
    "group_id": 6,
    "nav_id": 10
  }
}
```

---

#### Remove Navigation from Group
```
DELETE /api/admin/groups/:groupId/nav/:navId
```

**Purpose**: Revoke group access to navigation item

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Navigation removed from group",
  "data": {
    "group_id": 6,
    "nav_id": 10
  }
}
```

---

## Error Response Codes

| Code | Message | Scenario |
|------|---------|----------|
| 200 | Success | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid/missing JWT token |
| 403 | Forbidden | User lacks permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate name/unique constraint |
| 500 | Server Error | Database or server error |

---

## Standard Response Format

All endpoints follow this response structure:

**Success**:
```json
{
  "status": "success",
  "message": "Operation description",
  "data": {}
}
```

**Error**:
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

---

## Testing Checklist

### Navigation Tests
- [ ] GET /api/admin/nav returns all items
- [ ] POST /api/admin/nav creates new item
- [ ] PUT /api/admin/nav/:id updates item
- [ ] DELETE /api/admin/nav/:id deletes item
- [ ] PUT /api/admin/nav/:id/toggle-status toggles active/inactive
- [ ] GET /api/admin/nav/user/:userId returns user's accessible nav
- [ ] GET /api/admin/nav/tree returns hierarchical structure
- [ ] PUT /api/admin/nav/reorder changes display order
- [ ] GET /api/admin/permissions/nav/:navId returns group permissions
- [ ] PUT /api/admin/permissions/nav/:navId updates permission
- [ ] DELETE /api/admin/permissions/nav/:navId/:groupId removes permission
- [ ] POST /api/admin/nav/track-route logs navigation activity

### Role Tests
- [ ] GET /api/admin/roles returns all roles
- [ ] GET /api/admin/roles/:id returns specific role
- [ ] POST /api/admin/roles creates new role
- [ ] PUT /api/admin/roles/:id updates role
- [ ] Create role rejects duplicate names
- [ ] All RBAC fields (view, create, update, delete) save correctly

### Group Tests
- [ ] GET /api/admin/groups returns all groups
- [ ] GET /api/admin/groups/structured includes members and nav
- [ ] GET /api/admin/groups/:id returns specific group
- [ ] POST /api/admin/groups creates new group
- [ ] PUT /api/admin/groups/:id updates group
- [ ] POST /api/admin/groups/:groupId/users assigns user
- [ ] DELETE /api/admin/groups/:groupId/users/:userId removes user
- [ ] POST /api/admin/groups/:groupId/nav assigns navigation
- [ ] DELETE /api/admin/groups/:groupId/nav/:navId removes navigation

### Authentication Tests
- [ ] Requests without JWT token return 401
- [ ] Requests with invalid token return 401
- [ ] All endpoints respect JWT authentication

### Error Handling Tests
- [ ] Missing required fields return 400 with clear message
- [ ] Non-existent resources return 404
- [ ] Duplicate entries return 409
- [ ] Invalid IDs return 400
- [ ] Database errors return 500 with safe message

---

## Usage Examples

### Get all navigation for a user
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/nav/user/1
```

### Create a new role
```bash
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analyst",
    "desc": "Data analyst",
    "views": 1,
    "creates": 0,
    "updates": 0,
    "deletes": 0
  }'
```

### Assign user to group
```bash
curl -X POST http://localhost:3000/api/admin/groups/2/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5}'
```

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [SCHEMA.md](SCHEMA.md) - Database tables and structure
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and improvements
