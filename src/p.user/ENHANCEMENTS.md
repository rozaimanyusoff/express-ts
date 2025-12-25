# User Module - Features & Enhancements

## User Lifecycle

### Account Creation & Onboarding
```
┌──────────────────┐
│  HR/Admin        │
│  Initiates       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  Auth Module             │
│  Register User           │
│  - Create pending_users  │
│  - Generate code         │
│  - Send email            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Activates          │
│  - Enter password        │
│  - Verify email code     │
│  - Move to users table   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Module             │
│  Create Profile          │
│  - Add personal info     │
│  - Upload avatar         │
│  - Set preferences       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Admin Assigns Groups    │
│  - Department group      │
│  - Project groups        │
│  - Role assignment       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Ready              │
│  - Can login             │
│  - See navigation        │
│  - Access granted        │
└──────────────────────────┘
```

---

## Profile Management System

### User Profile Components
```typescript
// Basic profile structure
const userProfile = {
  // User Identity (from users table)
  id: 101,
  fname: "John Doe",
  email: "john@company.com",
  contact: "60123456789",
  username: "jdoe",
  
  // Professional Info (from user_profile table)
  job: "Software Engineer",
  location: "Kuala Lumpur",
  dob: "1990-05-15",
  profile_image_url: "/uploads/profiles/user_101.jpg",
  
  // Access Control (from users, roles, user_groups)
  role: 3,           // Employee role
  status: 1,         // Active
  usergroups: "1,2,3", // Engineering, Team A, Project X
  
  // Activity Info
  last_login: "2024-12-25T14:30:00Z",
  last_ip: "192.168.1.100",
  last_os: "Windows 10"
};
```

### Profile Update Workflow
```
User Edits Profile
       │
       ▼
Validate Input
├─ Email format
├─ DOB in past
├─ Job title length
└─ Location valid
       │
       ▼
Update user_profile table
       │
       ▼
Log change (admin module)
       │
       ▼
Send confirmation email
       │
       ▼
Frontend reflects change
```

---

## Group-Based Permission System

### Group Membership Management
```typescript
// Add user to group
const addUserToGroup = async (userId: number, groupId: number) => {
  // Check if already member
  const existing = await checkMembership(userId, groupId);
  if (existing) throw new Error('Already in group');
  
  // Insert membership
  await db.query(
    'INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
    [userId, groupId]
  );
  
  // Rebuild permission cache
  await rebuildUserPermissions(userId);
  
  // Audit log
  await logUserChange('group_added', userId, groupId);
};
```

### Permission Inheritance
```
User
  │
  ├─ Group 1 (Development)
  │  ├─ Permission: code.edit
  │  ├─ Permission: code.review
  │  └─ Permission: task.assign
  │
  ├─ Group 2 (Leadership)
  │  ├─ Permission: user.create
  │  ├─ Permission: user.delete
  │  └─ Permission: reports.view
  │
  └─ Direct Permissions
     └─ Permission: admin.override

Final Permissions = Union of all group permissions + direct permissions
```

### Permission Checking
```typescript
// Check if user can perform action
const canUserPerform = async (userId: number, action: string) => {
  // Get user's groups
  const groups = await getUserGroups(userId);
  
  // Get all permissions for those groups
  const permissions = await getGroupPermissions(groups);
  
  // Check if action is in permissions
  return permissions.includes(action);
};

// Usage in controller
if (!await canUserPerform(req.user.id, 'user.delete')) {
  return res.status(403).json({
    status: 'error',
    message: 'You do not have permission to delete users'
  });
}
```

---

## Task Management System

### Task Assignment Workflow
```
Manager Creates Task
       │
       ▼
Select User
       │
       ▼
Set Priority & Due Date
       │
       ▼
Insert to user_tasks table
       │
       ▼
Send Notification Email
│
│ Subject: "New task assigned: Complete Q4 Review"
│ Body: Task details, due date, priority
│
       │
       ▼
User Sees in Dashboard
       │
       ▼
User Updates Status (0→1→2)
0 = Open
1 = In Progress
2 = Completed
       │
       ▼
Manager Reviews Completion
       │
       ▼
Task Archived
```

### Task Priorities
```
Priority 0 (Low)
└─ Can wait, flexible deadline
   Example: "Update documentation"

Priority 1 (Medium)
└─ Normal work, standard timeline
   Example: "Code review"

Priority 2 (High)
└─ Urgent, immediate action
   Example: "Critical bug fix"
```

### Task Status Tracking
```
Status 0 (Open)
├─ Just created
├─ Waiting to start
└─ Not yet started

Status 1 (In Progress)
├─ User working on it
├─ Active work
└─ Partial completion

Status 2 (Completed)
├─ Task finished
├─ Marked done
└─ Archived after 30 days
```

### Query Examples
```typescript
// Get pending tasks (ordered by priority and due date)
SELECT * FROM user_tasks 
WHERE user_id = ? AND status < 2 
ORDER BY priority DESC, due_date ASC;

// Get overdue tasks
SELECT * FROM user_tasks 
WHERE user_id = ? AND status < 2 AND due_date < CURDATE();

// Get completed tasks this month
SELECT * FROM user_tasks 
WHERE user_id = ? AND status = 2 
AND completed_at >= DATE_TRUNC('month', NOW())
ORDER BY completed_at DESC;

// Get task workload per user
SELECT user_id, COUNT(*) as open_tasks, 
       AVG(priority) as avg_priority
FROM user_tasks 
WHERE status < 2
GROUP BY user_id;
```

---

## Avatar Upload & Storage

### Avatar Upload Process
```
User Selects Image
       │
       ▼
Validate:
├─ File type (JPG, PNG, GIF)
├─ File size (< 5MB)
└─ Dimensions (min 100x100)
       │
       ▼
Resize to 200x200
       │
       ▼
Generate unique filename
       │
       ▼
Save to /mnt/winshare/avatars/
       │
       ▼
Update user_profile.profile_image_url
       │
       ▼
Return URL to frontend
       │
       ▼
User sees new avatar
```

### Avatar Storage
```
/mnt/winshare/
├── avatars/
│   ├── user_101_profile.jpg
│   ├── user_102_profile.jpg
│   ├── user_103_profile.jpg
│   └── user_104_profile.png

Access URLs:
/uploads/avatars/user_101_profile.jpg
```

---

## Search & Filtering

### User Search Implementation
```typescript
// Search users by name, email, contact
const searchUsers = async (query: string) => {
  const results = await db.query(`
    SELECT u.id, u.fname, u.email, u.contact, u.status
    FROM users u
    WHERE (u.fname LIKE ? OR u.email LIKE ? OR u.contact LIKE ?)
    AND u.status = 1
    LIMIT 20
  `, [`%${query}%`, `%${query}%`, `%${query}%`]);
  
  return results;
};

// Case-insensitive search
const query = `%${searchTerm.toLowerCase()}%`;
```

### Advanced Filtering
```typescript
// Filter users by multiple criteria
const filterUsers = async (filters: {
  role?: number,
  status?: number,
  group?: number,
  userType?: number,
  joinedAfter?: Date
}) => {
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  
  if (filters.role) {
    query += ' AND role = ?';
    params.push(filters.role);
  }
  
  if (filters.status !== undefined) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  
  if (filters.group) {
    query += ` AND id IN (
      SELECT user_id FROM user_groups WHERE group_id = ?
    )`;
    params.push(filters.group);
  }
  
  return db.query(query, params);
};
```

---

## User Analytics

### Usage Tracking
```typescript
// Track user activity
const trackActivity = async (userId: number, action: string) => {
  await db.query(`
    INSERT INTO user_activity_log (user_id, action, created_at)
    VALUES (?, ?, NOW())
  `, [userId, action]);
};

// Update last navigation
const updateLastNav = async (userId: number, navItem: string) => {
  await db.query(
    'UPDATE users SET last_nav = ? WHERE id = ?',
    [navItem, userId]
  );
};

// Update last login (from auth module)
const updateLastLogin = async (userId: number) => {
  await db.query(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [userId]
  );
};
```

### User Reports
```
Active Users Report
├─ Total active users: 150
├─ Users by role:
│  ├─ Admin: 5
│  ├─ Manager: 15
│  └─ Employee: 130
└─ Last 24 hours logins: 120

Task Completion Report
├─ Total tasks: 500
├─ Completed: 350 (70%)
├─ In Progress: 100 (20%)
└─ Pending: 50 (10%)

Group Membership Report
├─ Development: 45 users
├─ Engineering: 55 users
├─ Leadership: 12 users
└─ Finance: 38 users
```

---

## Integration Points

### With Auth Module
```typescript
// Auth creates user in pending_users
// User activation moves to users table
// Both modules share users table

import { getUserByEmail } from './userModel';
import { verifyPassword } from '../p.auth/authModel';

// Auth uses user module for profile data
const user = await getUserById(userId);
const profile = await getUserProfile(userId);
```

### With Admin Module
```typescript
// User changes are logged
import { logUserChange } from '../p.admin/logModel';

await logUserChange({
  action: 'user_profile_updated',
  user_id: userId,
  changed_fields: ['job', 'location'],
  timestamp: new Date()
});
```

### With Notification Module
```typescript
// Send emails for user events
import { sendEmail } from '../p.notification/mailer';

await sendEmail({
  to: user.email,
  template: 'task_assigned',
  data: { task_name, due_date }
});
```

### With Navigation Module
```typescript
// User groups determine navigation access
import { getNavigationByUserGroups } from '../p.nav/navModel';

const navigation = await getNavigationByUserGroups(userGroupIds);
```

---

## Error Handling

### Validation Errors
```typescript
// Email validation
if (!email.includes('@')) {
  return res.status(400).json({
    status: 'error',
    message: 'Invalid email format'
  });
}

// Duplicate check
const existing = await findUserByEmail(email);
if (existing) {
  return res.status(409).json({
    status: 'error',
    message: 'Email already registered'
  });
}

// Profile data validation
if (dob && dob > new Date()) {
  return res.status(400).json({
    status: 'error',
    message: 'Date of birth cannot be in future'
  });
}
```

### Permission Errors
```typescript
// Insufficient permissions
if (!await canUserPerform(userId, 'user.delete')) {
  return res.status(403).json({
    status: 'error',
    message: 'Insufficient permissions'
  });
}

// Group not found
const group = await getGroupById(groupId);
if (!group) {
  return res.status(404).json({
    status: 'error',
    message: 'Group not found'
  });
}
```

---

## Security Considerations

### Data Protection
```typescript
// Never return password in responses
delete user.password;

// Hash sensitive data
const hash = bcrypt.hashSync(data, 10);

// Validate all inputs
const sanitized = DOMPurify.sanitize(userInput);

// Log sensitive operations
await logUserChange('profile_deleted', userId);
```

### Access Control
```typescript
// Verify user can only access own profile
if (userId !== req.user.id && !isAdmin(req.user)) {
  return res.status(403).json({
    status: 'error',
    message: 'Cannot access other user profiles'
  });
}

// Check deletion permissions
if (!hasPermission(req.user, 'user.delete')) {
  return res.status(403).json({
    status: 'error',
    message: 'Cannot delete users'
  });
}
```

---

## Future Enhancements

### Short-term (Planned)
1. **Bulk Import**: Import users from CSV
2. **User Preferences**: Save UI preferences (theme, language)
3. **Department Hierarchy**: Parent-child department structure
4. **User Search**: Advanced search with filters
5. **Export Functionality**: Export user lists to Excel/CSV

### Medium-term (Roadmap)
1. **Delegation System**: Users delegate tasks to others
2. **Skill Management**: Track user skills and expertise
3. **Capacity Planning**: Monitor user workload
4. **Performance Metrics**: Track user productivity
5. **Advanced Reporting**: Generate comprehensive reports

### Long-term (Future)
1. **Merge with Auth**: Create unified p.auth-user module
2. **Advanced Permission Model**: ACL (Access Control Lists)
3. **User Behavior Analytics**: Track and analyze user patterns
4. **Recommendation System**: Suggest groups/tasks based on history
5. **Machine Learning**: Anomaly detection for security

---

## Module Merger Plan (p.user + p.auth → p.auth-user)

**Current State**:
- Two separate modules sharing 'auth' database
- Auth handles registration and login
- User handles profiles and assignments

**Why Merge?**
- Shared database and models
- Single responsibility domain (user identity)
- Simplified API surface
- Easier maintenance

**Merger Structure**:
```
src/p.auth-user/
├── authController.ts
├── userController.ts
├── userModel.ts
├── authModel.ts
├── authRoutes.ts
├── userRoutes.ts
├── index.ts (exports both)
├── README.md
├── SCHEMA.md
├── API.md
└── ENHANCEMENTS.md
```

**Migration Path**:
1. Complete separate documentation (current)
2. Identify shared code
3. Create migration plan
4. Merge route files
5. Update import paths across app
6. Comprehensive testing
7. Deprecate old modules

---

## Testing Checklist

- [ ] Create user with all fields
- [ ] Create user with minimal fields
- [ ] Update user profile
- [ ] Upload avatar (image validation)
- [ ] Add user to single group
- [ ] Add user to multiple groups
- [ ] Remove user from group
- [ ] Get user's groups
- [ ] Create task for user
- [ ] Update task status
- [ ] Get pending/overdue tasks
- [ ] Delete user (soft delete)
- [ ] Search users by name
- [ ] Filter users by role
- [ ] Filter users by group
- [ ] Get group members
- [ ] Test permission checking
- [ ] Test own profile access (non-admin)
- [ ] Test admin profile access (cross-user)
- [ ] Verify audit logging

---

## See Also
- [README.md](README.md) - Module overview
- [SCHEMA.md](SCHEMA.md) - Database schema
- [API.md](API.md) - API reference
- [Auth ENHANCEMENTS.md](../p.auth/ENHANCEMENTS.md) - Auth features
