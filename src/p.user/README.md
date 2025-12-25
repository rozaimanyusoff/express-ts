# User Management Module (p.user)

## Module Overview

The User Management module handles all user-related operations including user profiles, group assignments, task management, and permission-based access control. It works in tandem with the Auth module to provide complete user lifecycle management.

**Key Features**:
- User CRUD operations (Create, Read, Update, Delete)
- User profile management (personal and professional details)
- Group-based membership and permissions
- User task assignment and tracking
- Role-based access control integration
- User workflow management
- Navigation tree customization per user

---

## Architecture

### MVC Structure
```
src/p.user/
├── userController.ts      # Business logic for user operations
├── userModel.ts          # Database operations (817 lines)
├── pendingUserModel.ts   # Pending user operations
├── userRoutes.ts         # API route definitions
├── README.md             # This file
├── SCHEMA.md             # Database schema documentation
├── API.md                # Complete API reference
└── ENHANCEMENTS.md       # Features and improvements
```

### Database Design
- **Database**: `auth` (shared with p.auth module)
- **Core Tables**: users, user_profile, user_groups, user_tasks, groups
- **Access Control**: roles, permissions, module_members
- **Navigation**: workflows, modules, navigation
- **Connection**: MySQL connection pool via `pool` from `src/utils/db.ts`

---

## Module Dependencies

### Modules This Depends On
- **p.auth**: Authentication and session management
  - Auth module handles user login/registration
  - User module provides profile and group data
  - Shared `users` table between modules

- **p.admin**: Logging and audit trail
  - User operations logged for audit trail
  - Admin module tracks profile changes

- **p.nav**: Navigation and module access
  - User roles determine navigation structure
  - Module permissions control feature access

### Modules That Depend On This
- **p.maintenance**: User assignment to maintenance tasks
- **p.billing**: User-based billing and charge allocation
- **p.asset**: User ownership of assets
- **p.compliance**: User responsibility for compliance tasks
- **p.purchase**: User approval workflows
- **p.project**: User project assignment

---

## Key Workflows

### 1. User Profile Creation
```
User Registration (p.auth)
         │
         ▼
Create Users Entry
         │
         ▼
Create User Profile (p.user)
│ - Personal info (DOB, location)
│ - Professional info (job title, department)
│ - Profile image upload
         │
         ▼
Assign User Groups
         │
         ▼
User Ready for Operations
```

### 2. Group Assignment & Permissions
```
Admin Assigns User to Group
         │
         ▼
Insert into user_groups table
         │
         ▼
Inherit Group Permissions
         │
         ▼
Update User Roles
         │
         ▼
Rebuild Navigation Tree
         │
         ▼
User Sees Updated Menu
```

### 3. Task Assignment
```
Manager Creates Task
         │
         ▼
Assign User (user_tasks table)
         │
         ▼
User Receives Notification
         │
         ▼
User Can View in Dashboard
         │
         ▼
Update Task Status
         │
         ▼
Task Completion Logged
```

---

## Main Functions

### User Data Operations
```typescript
// Get all users with their groups
getAllUsers() → Users[]

// Get single user by ID
getUserById(userId) → User

// Find user by email or contact
findUserByEmailOrContact(email, contact) → User[]

// Get user profile details
getUserProfile(userId) → UserProfile

// Get user's assigned groups
getUserGroups(userId) → Groups[]

// Get user's assigned tasks
getUserTasks(userId) → Tasks[]
```

### User Management
```typescript
// Create new user account
registerUser(name, email, contact, userType, activationCode) → ResultSetHeader

// Activate user account
activateUser(email, contact, activationCode, username, password) → ResultSetHeader

// Verify login credentials
verifyLoginCredentials(emailOrUsername, password) → {success, user}

// Update user profile
updateUserProfile(userId, profileData) → boolean

// Update user password
updateUserPassword(email, contact, newPassword) → boolean
```

### Group Management
```typescript
// Add user to group
addUserToGroup(userId, groupId) → ResultSetHeader

// Remove user from group
removeUserFromGroup(userId, groupId) → ResultSetHeader

// Get group members
getGroupMembers(groupId) → Users[]

// Create new group
createGroup(groupName, description) → ResultSetHeader
```

---

## Quick Start Examples

### Create a New User Account
```bash
# 1. User registers via Auth module
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@company.com",
    "contact": "60198765432",
    "userType": 1
  }'

# 2. Create user profile
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Software Engineer",
    "department": "Development",
    "location": "Kuala Lumpur",
    "dob": "1990-05-15"
  }'
```

### Assign User to Groups
```bash
# Add user to department group
curl -X POST http://localhost:3000/api/users/101/groups/5 \
  -H "Authorization: Bearer {token}"

# Get user's groups
curl -X GET http://localhost:3000/api/users/101/groups \
  -H "Authorization: Bearer {token}"
```

### View User Tasks
```bash
# Get all tasks assigned to user
curl -X GET http://localhost:3000/api/users/101/tasks \
  -H "Authorization: Bearer {token}"

# Update task status
curl -X PUT http://localhost:3000/api/users/101/tasks/25 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": 2}'
```

---

## Module Dependencies Table

| Module | Type | Purpose |
|--------|------|---------|
| p.auth | Required | User authentication and registration |
| p.admin | Required | Audit logging for user operations |
| p.nav | Required | Navigation tree and module access |
| p.maintenance | Depends | Assigns users to maintenance tasks |
| p.billing | Depends | User-based billing and invoicing |
| p.asset | Depends | User asset ownership and tracking |
| p.compliance | Depends | User compliance task assignment |
| p.purchase | Depends | User purchase approvals |
| p.project | Depends | User project participation |

---

## Database Statistics

| Metric | Count |
|--------|-------|
| Tables | 8 (users, user_profile, user_groups, user_tasks, groups, roles, permissions, workflows) |
| User Fields | 20+ (id, email, fname, contact, role, status, etc.) |
| Profile Fields | 5 (DOB, job, location, profile image, etc.) |
| API Endpoints | 25+ |
| Key Indexes | 8 (id, email, contact, group_id, etc.) |

---

## Technologies Used

- **Language**: TypeScript
- **Database**: MySQL 8.0+
- **Connection Pool**: mysql2/promise
- **Password Hashing**: bcrypt (10 salt rounds)
- **Authentication**: JWT (auth dependency)
- **Validation**: Custom middleware and controller-level validation
- **Logging**: Custom logger utility

---

## Access Control Model

### Role-Based Access
- **Admin (Role 1)**: Full access to all user management features
- **Manager (Role 2)**: Can view reports and assign tasks to team members
- **Employee (Role 3)**: Can view own profile and assigned tasks
- **Custom Roles**: Created via admin interface

### Group-Based Permissions
- Users belong to groups (departments, teams)
- Groups have associated permissions
- Permissions control feature access
- Multiple group membership supported

### Permission Types
```
user.view          - View user profile
user.edit          - Edit user information
user.create        - Create new user
user.delete        - Delete user account
task.assign        - Assign tasks to users
task.view          - View assigned tasks
profile.edit       - Edit own profile
groups.manage      - Manage group membership
```

---

## Common Use Cases

### 1. New Employee Onboarding
```
1. HR registers employee via auth module
2. User activates account
3. Admin creates user profile
4. Assign to department group
5. Assign to project team
6. System emails access details
7. User can login and see navigation
```

### 2. Department Transfer
```
1. Manager initiates transfer request
2. Admin removes user from old group
3. Admin adds user to new group
4. User permissions updated
5. Navigation tree rebuilt
6. User sees new menu on next login
```

### 3. Task Assignment Workflow
```
1. Manager views team members
2. Manager assigns task to user
3. User receives notification
4. User views tasks in dashboard
5. User updates task status
6. Manager tracks completion
7. System logs activity
```

---

## Planned Features

### Near-term
- [ ] User avatar upload with image resizing
- [ ] Bulk user import from CSV
- [ ] User deactivation without deletion
- [ ] User email preferences management
- [ ] Two-factor authentication integration

### Medium-term
- [ ] User department hierarchy
- [ ] Delegation system (assign tasks to other users)
- [ ] User skill management
- [ ] Capacity planning (workload tracking)
- [ ] User performance metrics

### Long-term
- [ ] Integration with p.auth for module merger
- [ ] Advanced reporting and analytics
- [ ] User behavior analytics
- [ ] Recommendation system
- [ ] Advanced permission model (ACL)

---

## Error Handling

### Common Errors
- `400 Bad Request`: Missing or invalid user data
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User lacks permission
- `404 Not Found`: User or resource not found
- `409 Conflict`: Duplicate email or contact
- `500 Internal Server Error`: Database connection issues

### Validation Errors
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "contact": "Contact already registered"
  }
}
```

---

## See Also
- [SCHEMA.md](SCHEMA.md) - Database schema and table definitions
- [API.md](API.md) - Complete API reference with examples
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Features, improvements, and roadmap
- [Auth Module README](../p.auth/README.md) - Authentication module documentation

---

## Notes

**Interdependency with Auth Module**:
- Auth and User modules are tightly integrated and share the `auth` database
- Planned for future merger into single `p.auth-user` module
- Currently documented separately for clarity
- See [ENHANCEMENTS.md](ENHANCEMENTS.md#future-enhancements) for merger roadmap

**Database Connection**:
- Both auth and user modules use same MySQL database connection pool
- Ensure DB_NAME environment variable is set to 'auth'
- Connection pooling handles concurrent operations
- Recommended max connections: 10-20 per environment
