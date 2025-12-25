# Admin Module - Enhancements & Features

## Overview

This document outlines the features, workflows, integration points, and future enhancements for the consolidated Admin module (Navigation, Roles, Groups).

---

## Core Features

### 1. Hierarchical Navigation Management

**Feature**: Organize menu items into parent-child hierarchies with position-based ordering.

**Workflow**:
```
Create Root Navigation Item
    ↓
Add Child Items (position order)
    ↓
Assign to Groups (permissions)
    ↓
Users Access via Group Membership
    ↓
Built into Application Menu
```

**Key Capabilities**:
- Create sections (parent items without paths)
- Create menu items (items with links)
- Nest to 3+ levels deep
- Reorder items with position field
- Toggle visibility without deletion
- Track which users access which nav items
- Different navigation trees per group

**Use Cases**:
1. **Multi-level Admin Interface**: Create Admin section with Users, Roles, Groups subsections
2. **Department-specific Menus**: Engineering sees Projects/Issues, Sales sees Leads/Opportunities
3. **Feature Flags**: Disable menu items for beta features without deleting them
4. **Auditing**: Track when users access different sections

**Database Design**:
```
┌─ navigation
│  ├─ id (PK)
│  ├─ title
│  ├─ path (nullable, null for sections)
│  ├─ parent_nav_id (FK, self-referential)
│  ├─ position (1, 2, 3... within parent)
│  └─ status (1=visible, 0=hidden)
│
└─ group_nav (M:M relationship)
   ├─ nav_id (FK)
   └─ group_id (FK)
```

**Implementation Example**:
```typescript
// Create navigation hierarchy
const createAdminSection = async () => {
  // 1. Create section
  const adminNav = await createNavigation({
    title: 'Administration',
    type: 'section',
    position: 5,
    status: 1
  }); // id: 2

  // 2. Create children
  await createNavigation({
    title: 'Users',
    type: 'menu',
    path: '/admin/users',
    position: 1,
    parent_nav_id: 2,
    status: 1
  }); // id: 3

  // 3. Assign to Admin group
  await setNavigationPermissionsForGroup(2, 2); // nav_id=2, group_id=2
};

// Get user's navigation
const userNav = await getNavigationByUserId(userId);
// Returns: [Dashboard, Administration > Users, Administration > Roles, ...]
```

---

### 2. Role-Based Access Control (RBAC)

**Feature**: Define granular permissions through role assignments.

**Permission Model**:
```
4 Granular Permissions per Role:
├─ views (1/0)   - Can read/view data
├─ creates (1/0) - Can create new records
├─ updates (1/0) - Can modify existing records
└─ deletes (1/0) - Can remove records
```

**Standard Roles**:
```json
{
  "Admin": {
    "views": 1, "creates": 1, "updates": 1, "deletes": 1,
    "description": "Full system access"
  },
  "Manager": {
    "views": 1, "creates": 1, "updates": 1, "deletes": 0,
    "description": "Can manage data except deletions"
  },
  "Employee": {
    "views": 1, "creates": 0, "updates": 0, "deletes": 0,
    "description": "Read-only access"
  },
  "Viewer": {
    "views": 1, "creates": 0, "updates": 0, "deletes": 0,
    "description": "Reports and analytics view"
  }
}
```

**Workflow**:
```
Define Role with Permissions
    ↓
Assign Users to Role
    ↓
Application Checks Role Permissions
    ↓
Grant/Deny Operations (CRUD)
```

**Use Cases**:
1. **Department Hierarchies**: Managers have more permissions than employees
2. **Read-only Auditors**: Audit team can only view, not modify
3. **Data Deletion Restrictions**: Only admins can delete; managers can create/update
4. **Custom Job Roles**: Create specialized roles for specific departments

**Implementation**:
```typescript
// Check role permissions
const canDeleteRecord = (user: User, role: Role) => {
  return role.deletes === 1;
};

const canCreateRecord = (role: Role) => {
  return role.creates === 1;
};

// Enforce in routes
router.delete('/records/:id', asyncHandler(async (req, res) => {
  const user = req.user;
  const role = await getRoleById(user.role);
  
  if (!role || !canDeleteRecord(user, role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Your role does not have delete permissions'
    });
  }
  
  await deleteRecord(req.params.id);
  res.json({ status: 'success', message: 'Record deleted' });
}));
```

---

### 3. Group-Based User Organization

**Feature**: Organize users into logical groups with shared permissions and navigation.

**Workflow**:
```
Create Group (e.g., "Engineering")
    ↓
Add Users to Group
    ↓
Assign Navigation Items to Group
    ↓
All Group Members See Same Menu + Permissions
```

**Group Model**:
```
Group (1) ──── (many) Users
Group (1) ──── (many) Navigation Items
User (1) ──── (many) Groups
```

**Use Cases**:
1. **Department Organization**: Create groups for Engineering, Sales, Finance, HR
2. **Permission Delegation**: Each group gets specific menu sections
3. **Bulk User Management**: Add/remove users to manage 50+ people at once
4. **Regional Access**: Create groups for North Region, South Region with different menus
5. **Project Teams**: Create temporary groups for specific projects

**Implementation**:
```typescript
// Create group with members and nav
const engineeringTeamSetup = async () => {
  // 1. Create group
  const group = await createGroup({
    name: 'Engineering',
    desc: 'Engineering team members'
  }); // id: 2

  // 2. Add users (John, Jane, etc.)
  await assignUserToGroups(1, [2]); // John to Engineering
  await assignUserToGroups(2, [2]); // Jane to Engineering

  // 3. Assign navigation
  await setNavigationPermissionsForGroup(2, [
    10, // Projects menu
    15, // Issues menu
    20, // Documentation menu
  ]);
};

// When Jane logs in
const janeNav = await getNavigationByUserId(2);
// Returns: [Dashboard, Projects, Issues, Documentation]
```

---

## Integration Points

### User Module Integration
**Location**: `p.user/`

**Integration Patterns**:
```typescript
// 1. Get user with their groups
const user = await getUser(userId); // includes role_id, group_ids
const userGroups = await getGroupsByUserId(userId);

// 2. Update user's group membership
await assignUserToGroups(userId, [group1, group2, group3]);

// 3. Load user's navigation on login
const userNav = await getNavigationByUserId(userId);
```

**Shared Tables**:
- `users` (has role_id field)
- `user_groups` (links users to groups)

---

### Module Access Control Integration
**Location**: `p.nav/`, Module Guards

**Pattern**:
```typescript
// Frontend route guard
const canAccessModule = async (userId: number, moduleName: string) => {
  const userGroups = await getGroupsByUserId(userId);
  const moduleAccess = await pool.query(
    `SELECT 1 FROM module_members 
     WHERE module_id = (SELECT id FROM modules WHERE name = ?)
     AND group_id IN (?)`,
    [moduleName, userGroups]
  );
  return moduleAccess.length > 0;
};

// Usage
if (await canAccessModule(userId, 'Billing')) {
  // User can access Billing module
}
```

---

### Audit Logging Integration
**Location**: Audit Trail System

**Implementation**:
```typescript
// Track admin operations
const trackNavChange = async (userId: number, action: string) => {
  await pool.query(
    `INSERT INTO logs_auth (user_id, action, status, details)
     VALUES (?, ?, 'success', ?)`,
    [userId, action, JSON.stringify({ nav_change: true })]
  );
};

// Log all role/group changes
router.put('/admin/roles/:id', asyncHandler(async (req, res) => {
  const oldRole = await getRoleById(req.params.id);
  await updateRole(req.params.id, req.body);
  
  await trackNavChange(req.user.id, `Updated role ${oldRole.name}`);
  
  res.json({ status: 'success' });
}));
```

---

## Workflows

### Workflow 1: New User Onboarding

**Scenario**: New employee Jane joins Engineering team

**Steps**:
```
1. HR creates Jane in user system
   - Sets role: "Employee" (views=1, creates=0, updates=0, deletes=0)
   
2. HR adds Jane to "Engineering" group
   - assignUserToGroups(jane_id, [engineering_group_id])
   
3. Engineering group already has nav assignments:
   - Dashboard, Projects, Issues, Documentation
   
4. Jane logs in
   - Query getNavigationByUserId(jane_id)
   - Frontend renders: [Dashboard, Projects, Issues, Documentation]
   
5. Jane can only VIEW data (role=Employee)
   - Create button disabled
   - Edit button disabled
   - Delete button disabled
```

**Database Operations**:
```sql
-- 1. Create user (in user module)
INSERT INTO users (fname, lname, email, role, username) 
VALUES ('Jane', 'Smith', 'jane@company.com', 3, 'jsmith');
-- Returns user_id = 5

-- 2. Add to group
INSERT INTO user_groups (user_id, group_id) VALUES (5, 2);

-- 3. Jane's navigation (automatic via group_nav)
SELECT DISTINCT n.* FROM user_groups ug
JOIN group_nav gn ON ug.group_id = gn.group_id
JOIN navigation n ON gn.nav_id = n.id
WHERE ug.user_id = 5 AND n.status = 1;
```

---

### Workflow 2: Role Promotion

**Scenario**: Employee John is promoted to Manager

**Steps**:
```
1. HR updates John's role
   - Current: "Employee" (views=1, creates=0, updates=0, deletes=0)
   - New: "Manager" (views=1, creates=1, updates=1, deletes=0)
   
2. Update user role
   - UPDATE users SET role = 2 WHERE id = 1;
   
3. John's capabilities change automatically:
   - Create button now enabled
   - Edit button now enabled
   - Delete button still disabled (safety: can't delete)
   
4. No navigation change needed
   - Still has access to same menu items
   - But can now modify those items
```

**Implementation**:
```typescript
router.put('/users/:id/role', asyncHandler(async (req, res) => {
  const { new_role_id } = req.body;
  
  // 1. Verify role exists
  const role = await getRoleById(new_role_id);
  if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });
  
  // 2. Update user
  await pool.query(
    `UPDATE users SET role = ? WHERE id = ?`,
    [new_role_id, req.params.id]
  );
  
  // 3. Log change
  await trackNavChange(req.user.id, 
    `Promoted user ${req.params.id} to ${role.name}`);
  
  res.json({ 
    status: 'success',
    message: 'User promoted',
    data: { userId: req.params.id, newRole: role.name }
  });
}));
```

---

### Workflow 3: Department-Specific Menu Configuration

**Scenario**: Configure Finance team with specific navigation and permissions

**Steps**:
```
1. Create "Finance" group
   - name: 'Finance'
   - desc: 'Finance and accounting team'
   
2. Create/reuse navigation items
   - Billing (nav_id: 20)
   - Reports (nav_id: 25)
   - Accounts (nav_id: 30)
   - Compliance (nav_id: 35)
   
3. Assign navigation to Finance group
   - group_nav: (nav_id=20, group_id=3)
   - group_nav: (nav_id=25, group_id=3)
   - group_nav: (nav_id=30, group_id=3)
   - group_nav: (nav_id=35, group_id=3)
   
4. Assign all Finance users to group
   - Jane (id=5) → Engineering, Finance (2 groups)
   - John (id=6) → Finance
   - Sarah (id=7) → Finance
   
5. Each Finance user sees:
   - Dashboard (universal)
   - Billing
   - Reports
   - Accounts
   - Compliance
```

**Configuration Code**:
```typescript
const configureFinanceTeam = async () => {
  // 1. Create group
  const financeGroup = await createGroup({
    name: 'Finance',
    desc: 'Finance and accounting team'
  }); // id: 3

  // 2. Assign navigation
  const navItems = [
    { title: 'Billing', path: '/billing' },
    { title: 'Reports', path: '/reports' },
    { title: 'Accounts', path: '/accounts' },
    { title: 'Compliance', path: '/compliance' }
  ];

  for (const nav of navItems) {
    const existing = await pool.query(
      `SELECT id FROM navigation WHERE path = ?`,
      [nav.path]
    );
    
    const navId = existing[0]?.id || await createNavigation(nav);
    await pool.query(
      `INSERT INTO group_nav (nav_id, group_id) VALUES (?, ?)`,
      [navId, financeGroup.id]
    );
  }

  // 3. Add users
  const financeUsers = [5, 6, 7]; // Jane, John, Sarah
  for (const userId of financeUsers) {
    await assignUserToGroups(userId, [financeGroup.id]);
  }
};
```

---

## Security Features

### Permission Hierarchy
```
User
  ├─ Role (granular permissions: view, create, update, delete)
  └─ Groups (navigation access + module access)
      ├─ Navigation Items (what menu items they see)
      └─ Modules (what feature modules they can access)
```

### Access Denial Scenarios
```
1. No JWT Token
   → 401 Unauthorized

2. Invalid Role
   → Operation denied based on role.creates/updates/deletes

3. Group Restriction
   → Navigation items not visible if not in authorized group

4. Module Access
   → Cannot access feature if not in module_members

5. Cross-Group Access
   → User A (Engineering) cannot see Finance-only navigation
```

### Audit Trail
```sql
-- All admin operations logged
CREATE TABLE logs_auth (
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id int,
  action varchar(100),
  status varchar(50),
  details json,
  created_at timestamp
);

-- Track what changed
INSERT INTO logs_auth VALUES (
  null,
  1,
  'Updated role Manager',
  'success',
  '{"role_id": 2, "field": "creates", "old": 1, "new": 0}',
  now()
);
```

---

## Performance Optimizations

### 1. Navigation Tree Caching
```typescript
// Cache the navigation tree (doesn't change frequently)
const navigationCache = new Map();

export const getNavigationCached = async (groupId?: number) => {
  const cacheKey = `nav_${groupId || 'all'}`;
  
  if (navigationCache.has(cacheKey)) {
    return navigationCache.get(cacheKey);
  }
  
  const nav = groupId 
    ? await getNavigationByGroups(groupId)
    : await getNavigation();
  
  navigationCache.set(cacheKey, nav);
  
  // Clear after 1 hour
  setTimeout(() => navigationCache.delete(cacheKey), 3600000);
  
  return nav;
};

// Clear cache when nav changes
router.put('/nav/:id', asyncHandler(async (req, res) => {
  await updateNavigation(req.params.id, req.body);
  navigationCache.clear(); // Clear all caches
  res.json({ status: 'success' });
}));
```

### 2. Efficient User Navigation Loading
```typescript
// Single query instead of multiple joins
export const getNavigationByUserId = async (userId: number) => {
  const [rows] = await pool.query(`
    SELECT DISTINCT n.id, n.title, n.path, n.position, 
           n.parent_nav_id, n.type, n.status
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN group_nav gn ON ug.group_id = gn.group_id
    LEFT JOIN navigation n ON gn.nav_id = n.id
    WHERE u.id = ? AND n.status = 1
    ORDER BY n.parent_nav_id, n.position
  `, [userId]);
  
  return buildHierarchy(rows);
};
```

### 3. Batch Operations
```typescript
// Assign multiple users to group in one operation
router.post('/groups/:groupId/users/bulk', asyncHandler(async (req, res) => {
  const { user_ids } = req.body; // Array of user IDs
  
  const values = user_ids.map(uid => [uid, req.params.groupId]);
  
  await pool.query(
    `INSERT INTO user_groups (user_id, group_id) VALUES ?
     ON DUPLICATE KEY UPDATE created_at = NOW()`,
    [values]
  );
  
  res.json({ 
    status: 'success',
    message: `Added ${user_ids.length} users to group`
  });
}));
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test role permission logic
describe('Role Permissions', () => {
  test('Admin role has all permissions', () => {
    const adminRole = { views: 1, creates: 1, updates: 1, deletes: 1 };
    expect(canView(adminRole)).toBe(true);
    expect(canCreate(adminRole)).toBe(true);
    expect(canUpdate(adminRole)).toBe(true);
    expect(canDelete(adminRole)).toBe(true);
  });

  test('Employee role can only view', () => {
    const empRole = { views: 1, creates: 0, updates: 0, deletes: 0 };
    expect(canView(empRole)).toBe(true);
    expect(canCreate(empRole)).toBe(false);
    expect(canUpdate(empRole)).toBe(false);
    expect(canDelete(empRole)).toBe(false);
  });
});
```

### Integration Tests
```typescript
// Test workflows
describe('User Onboarding Workflow', () => {
  test('New user gets correct navigation based on group', async () => {
    // 1. Create user
    const user = await createUser({ name: 'Jane' });
    
    // 2. Add to Engineering group
    const engGroup = await getGroupByName('Engineering');
    await assignUserToGroups(user.id, [engGroup.id]);
    
    // 3. Verify navigation
    const nav = await getNavigationByUserId(user.id);
    const titles = nav.map(n => n.title);
    
    expect(titles).toContain('Projects');
    expect(titles).toContain('Issues');
    expect(titles).not.toContain('Billing');
  });
});
```

---

## Future Enhancements

### Short Term (1-2 months)
- [ ] Navigation search/filter in menu
- [ ] Role templates (predefined role sets)
- [ ] Batch user management (import CSV)
- [ ] Navigation drag-and-drop reordering UI
- [ ] Role comparison tool (show differences)

### Medium Term (3-6 months)
- [ ] Dynamic permission fields (not just view/create/update/delete)
- [ ] Permission inheritance (child roles inherit parent permissions)
- [ ] Time-based access (access valid until date)
- [ ] Notification when group/role changes
- [ ] Mobile-optimized navigation
- [ ] Navigation search with analytics

### Long Term (6+ months)
- [ ] AI-suggested roles (based on usage patterns)
- [ ] Fine-grained permission system (per-field permissions)
- [ ] Navigation branching (A/B test different menus)
- [ ] Permission graph visualization
- [ ] Zero-trust access model
- [ ] External IdP integration (LDAP, Okta)
- [ ] SSO with group/role synchronization

---

## Troubleshooting

### Issue: User can't see navigation item
```
Solution:
1. Check user is in group: SELECT * FROM user_groups WHERE user_id = ?
2. Check group has nav assigned: SELECT * FROM group_nav WHERE group_id = ?
3. Check nav is active: SELECT status FROM navigation WHERE id = ?
4. Verify no parent_nav_id = 0 (should be NULL): SELECT parent_nav_id FROM navigation WHERE id = ?
```

### Issue: Role permissions not respected
```
Solution:
1. Confirm user has role: SELECT role FROM users WHERE id = ?
2. Verify role has permission: SELECT views, creates FROM roles WHERE id = ?
3. Check middleware enforces permissions in routes
4. Clear browser cache (JWT might be cached)
```

### Issue: Circular hierarchy in navigation
```
Solution:
1. Add constraint to prevent self-parent: 
   ALTER TABLE navigation ADD CONSTRAINT check_no_self_parent CHECK (id != parent_nav_id);
2. Validate parent not a descendant before update
3. Use recursive CTE to detect cycles in migration script
```

---

## See Also
- [README.md](README.md) - Module overview
- [SCHEMA.md](SCHEMA.md) - Database tables
- [API.md](API.md) - API endpoints
