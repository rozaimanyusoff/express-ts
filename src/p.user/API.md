# User Module - API Reference

## Base URL & Authentication
- **Base URL**: `http://localhost:3000/api/users`
- **Authentication**: JWT Bearer token required for all endpoints
- **Authorization Header**: `Authorization: Bearer {token}`
- **Content-Type**: `application/json`

---

## Standard Response Format

### Success Response (200)
```json
{
  "status": "success",
  "message": "Operation successful",
  "data": {}
}
```

### Error Response (400/401/404/500)
```json
{
  "status": "error",
  "message": "Error description",
  "code": 400
}
```

---

## User Endpoints

### GET /
Get all users.

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 20)
- `role` - Filter by role ID
- `status` - Filter by status (0=Inactive, 1=Active)

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 101,
      "fname": "John Doe",
      "email": "john@company.com",
      "contact": "60123456789",
      "role": 3,
      "status": 1,
      "last_login": "2024-12-25T14:30:00Z",
      "usergroups": "1,2,3"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

### GET /:id
Get single user by ID.

**URL Parameters**:
- `id` - User ID

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "id": 101,
    "fname": "John Doe",
    "email": "john@company.com",
    "contact": "60123456789",
    "username": "jdoe",
    "user_type": 1,
    "role": 3,
    "status": 1,
    "last_login": "2024-12-25T14:30:00Z",
    "created_at": "2024-11-15T09:00:00Z",
    "usergroups": "1,2,3"
  }
}
```

**Error Responses**:
- `404` - User not found

---

### POST /
Create new user account.

**Request Body**:
```json
{
  "fname": "Jane Doe",
  "email": "jane@company.com",
  "contact": "60198765432",
  "user_type": 1,
  "role": 3,
  "password": "SecurePassword123"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "message": "User created successfully",
  "data": {
    "id": 102,
    "fname": "Jane Doe",
    "email": "jane@company.com",
    "contact": "60198765432"
  }
}
```

**Error Responses**:
- `400` - Validation failed (duplicate email/contact)
- `403` - Insufficient permissions

---

### PUT /:id
Update user information.

**URL Parameters**:
- `id` - User ID

**Request Body**:
```json
{
  "fname": "John Smith",
  "role": 2,
  "status": 1
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

**Error Responses**:
- `404` - User not found
- `403` - Insufficient permissions

---

### DELETE /:id
Delete user account (soft delete).

**URL Parameters**:
- `id` - User ID

**Response (200)**:
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

**Error Responses**:
- `404` - User not found
- `403` - Insufficient permissions

---

## User Profile Endpoints

### GET /:userId/profile
Get user's detailed profile.

**URL Parameters**:
- `userId` - User ID

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "id": 101,
    "fname": "John Doe",
    "email": "john@company.com",
    "dob": "1990-05-15",
    "job": "Software Engineer",
    "location": "Kuala Lumpur",
    "profile_image_url": "/uploads/profiles/user_101_profile.jpg"
  }
}
```

---

### PUT /:userId/profile
Update user profile.

**URL Parameters**:
- `userId` - User ID

**Request Body**:
```json
{
  "dob": "1990-05-15",
  "job": "Senior Software Engineer",
  "location": "Kuala Lumpur",
  "profile_image_url": "/uploads/profiles/user_101_profile.jpg"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Profile updated successfully"
}
```

---

### POST /:userId/profile/avatar
Upload profile picture.

**URL Parameters**:
- `userId` - User ID

**Request**: multipart/form-data with file

**Response (200)**:
```json
{
  "status": "success",
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "/uploads/avatars/user_101.jpg"
  }
}
```

---

## Group Management Endpoints

### GET /:userId/groups
Get user's group memberships.

**URL Parameters**:
- `userId` - User ID

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Development",
      "description": "Engineering team"
    },
    {
      "id": 2,
      "name": "Leadership",
      "description": "Leadership team"
    }
  ]
}
```

---

### POST /:userId/groups/:groupId
Add user to group.

**URL Parameters**:
- `userId` - User ID
- `groupId` - Group ID

**Response (200)**:
```json
{
  "status": "success",
  "message": "User added to group successfully"
}
```

**Error Responses**:
- `409` - User already in group
- `404` - User or group not found

---

### DELETE /:userId/groups/:groupId
Remove user from group.

**URL Parameters**:
- `userId` - User ID
- `groupId` - Group ID

**Response (200)**:
```json
{
  "status": "success",
  "message": "User removed from group successfully"
}
```

---

## Task Management Endpoints

### GET /:userId/tasks
Get user's assigned tasks.

**URL Parameters**:
- `userId` - User ID

**Query Parameters**:
- `status` - Filter by status (0=Open, 1=In Progress, 2=Completed)
- `priority` - Filter by priority (0=Low, 1=Medium, 2=High)
- `sort` - Sort by (due_date, priority, created_at)

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 25,
      "user_id": 101,
      "task_name": "Complete Q4 Review",
      "task_description": "Submit quarterly performance review",
      "status": 1,
      "priority": 2,
      "due_date": "2024-12-31",
      "assigned_by": 50,
      "assigned_at": "2024-12-10T10:00:00Z"
    }
  ]
}
```

---

### POST /:userId/tasks
Create new task for user.

**URL Parameters**:
- `userId` - User ID

**Request Body**:
```json
{
  "task_name": "Review Code Changes",
  "task_description": "Review PR #1234",
  "priority": 1,
  "due_date": "2024-12-28"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "message": "Task created successfully",
  "data": {
    "id": 26,
    "task_name": "Review Code Changes"
  }
}
```

---

### GET /:userId/tasks/:taskId
Get specific task details.

**URL Parameters**:
- `userId` - User ID
- `taskId` - Task ID

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "id": 25,
    "user_id": 101,
    "task_name": "Complete Q4 Review",
    "task_description": "Submit quarterly performance review",
    "status": 1,
    "priority": 2,
    "due_date": "2024-12-31",
    "assigned_by": 50,
    "assigned_at": "2024-12-10T10:00:00Z",
    "completed_at": null
  }
}
```

---

### PUT /:userId/tasks/:taskId
Update task status or details.

**URL Parameters**:
- `userId` - User ID
- `taskId` - Task ID

**Request Body**:
```json
{
  "status": 2,
  "completed_at": "2024-12-25T15:00:00Z"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Task updated successfully"
}
```

---

### DELETE /:userId/tasks/:taskId
Delete user task.

**URL Parameters**:
- `userId` - User ID
- `taskId` - Task ID

**Response (200)**:
```json
{
  "status": "success",
  "message": "Task deleted successfully"
}
```

---

## Search & Filter Endpoints

### GET /search
Search users by name, email, or contact.

**Query Parameters**:
- `q` - Search query (required)
- `type` - Search type (name, email, contact)
- `limit` - Results limit (default: 10)

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 101,
      "fname": "John Doe",
      "email": "john@company.com",
      "status": 1
    }
  ]
}
```

---

### GET /by-group/:groupId
Get all members of a group.

**URL Parameters**:
- `groupId` - Group ID

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 101,
      "fname": "John Doe",
      "email": "john@company.com",
      "role": 3,
      "status": 1
    }
  ]
}
```

---

### GET /by-role/:roleId
Get all users with specific role.

**URL Parameters**:
- `roleId` - Role ID

**Response (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 50,
      "fname": "Manager",
      "email": "manager@company.com",
      "role": 2,
      "status": 1
    }
  ]
}
```

---

## Error Codes Reference

| Code | Message | Cause |
|------|---------|-------|
| 400 | Validation failed | Invalid input data |
| 400 | Email already exists | Duplicate email |
| 400 | Contact already exists | Duplicate contact |
| 401 | Unauthorized | No/invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | User not found | Invalid user ID |
| 409 | Conflict | User already in group |
| 500 | Internal error | Server error |

---

## Testing Checklist

- [ ] Get all users with pagination
- [ ] Get single user by ID
- [ ] Create new user
- [ ] Update user information
- [ ] Delete user account
- [ ] Get user profile
- [ ] Update user profile
- [ ] Upload profile avatar
- [ ] Get user groups
- [ ] Add user to group
- [ ] Remove user from group
- [ ] Get user tasks
- [ ] Create new task
- [ ] Update task status
- [ ] Delete task
- [ ] Search users by name
- [ ] Search users by email
- [ ] Filter users by role
- [ ] Filter users by group
- [ ] Get group members
- [ ] Test permission checking

---

## API Usage Examples

### Get All Users
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Create New User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "Jane Smith",
    "email": "jane@company.com",
    "contact": "60198765432",
    "user_type": 1,
    "role": 3,
    "password": "SecurePassword123"
  }'
```

### Update User Profile
```bash
curl -X PUT http://localhost:3000/api/users/101/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "job": "Senior Software Engineer",
    "location": "Kuala Lumpur",
    "dob": "1990-05-15"
  }'
```

### Add User to Group
```bash
curl -X POST http://localhost:3000/api/users/101/groups/5 \
  -H "Authorization: Bearer {token}"
```

### Assign Task to User
```bash
curl -X POST http://localhost:3000/api/users/101/tasks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Complete Training",
    "task_description": "Complete onboarding training",
    "priority": 2,
    "due_date": "2024-12-31"
  }'
```

---

## See Also
- [README.md](README.md) - Module overview and workflows
- [SCHEMA.md](SCHEMA.md) - Database schema definitions
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features and improvements
