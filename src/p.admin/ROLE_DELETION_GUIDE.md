# Role Deletion with User Validation

## Overview
A new endpoint has been implemented to safely delete roles from the system. Before deletion, it automatically checks if any users have the selected roles assigned to prevent orphaning users.

## Implementation Details

### Model Functions (adminModel.ts)

#### `getUsersByRoleIds(roleIds: number[])`
Fetches all users who have any of the selected roles assigned.
- **Parameters**: Array of role IDs to check
- **Returns**: Array of user objects with their assigned role
- **Query**: Searches `auth.users` table where `role IN (roleIds)`

#### `deleteRoles(roleIds: number[])`
Deletes multiple roles from the system (only when no users are assigned).
- **Parameters**: Array of role IDs to delete
- **Returns**: Number of affected rows
- **Query**: Deletes from `auth.roles` table

### Controller Function (adminController.ts)

#### `deleteRolesByIds(req, res)`
Handles the deletion request with two-step validation:
1. **User Check**: Queries for any users with the selected roles
2. **Conditional Deletion**: Only deletes if no users are found

### Route (adminRoutes.ts)

```typescript
router.delete('/roles', asyncHandler(adminController.deleteRolesByIds));
```

## API Usage

### Request
```bash
DELETE /api/admin/roles
Content-Type: application/json

{
  "roleIds": [1, 2, 3]
}
```

### Success Response (No Users Found)
Status: `200 OK`
```json
{
  "status": "success",
  "success": true,
  "message": "Successfully deleted 3 role(s)",
  "data": {
    "deletedCount": 3,
    "roleIds": [1, 2, 3]
  }
}
```

### Conflict Response (Users Found)
Status: `409 Conflict`
```json
{
  "status": "error",
  "success": false,
  "message": "Cannot delete 3 role(s). 5 user(s) still have these roles assigned",
  "data": {
    "roleIds": [1, 2, 3],
    "affectedUsers": [
      {
        "id": 100,
        "name": "John Doe",
        "email": "john@example.com",
        "roleId": 1
      },
      {
        "id": 101,
        "name": "Jane Smith",
        "email": "jane@example.com",
        "roleId": 2
      }
      // ... more users
    ]
  }
}
```

### Error Response (Invalid Input)
Status: `400 Bad Request`
```json
{
  "status": "error",
  "success": false,
  "message": "roleIds must be a non-empty array",
  "data": null
}
```

### Server Error Response
Status: `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection error details",
  "data": null
}
```

## Implementation Workflow

### Before Deletion
```
User Submits Delete Request (roleIds: [1, 2, 3])
        ↓
Check if any users have role.id IN (1, 2, 3)
        ↓
    Found users?
    ├─ YES → Return 409 Conflict with affected users list
    └─ NO  → Proceed to deletion
        ↓
Delete roles from auth.roles table
        ↓
Return 200 Success with deletion count
```

## Database Schema
- **Users Table**: `auth.users`
  - Field: `role` (integer, foreign key to roles.id)
  
- **Roles Table**: `auth.roles`
  - Field: `id` (primary key)
  - Field: `name` (role name)

## Error Scenarios

| Scenario | HTTP Status | Action |
|----------|------------|--------|
| Invalid roleIds format | 400 | Return validation error |
| Empty roleIds array | 400 | Return validation error |
| Users assigned to roles | 409 | Return conflict with user details |
| Database error | 500 | Return error message |
| Success (no users) | 200 | Delete and confirm |

## Next Steps

If you encounter a conflict response (users still assigned):
1. View the affected users in the response
2. Reassign those users to different roles
3. Retry the role deletion

Optional: Could implement a cascade option to reassign all users to a default role before deletion.
