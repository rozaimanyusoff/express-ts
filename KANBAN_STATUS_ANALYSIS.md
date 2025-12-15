# Kanban Card Status Handler - Endpoint Analysis

## Current Architecture

Your project uses a **scope-based kanban system** where each card represents a **scope** (defined by `scope_id`) within a project.

### Current Endpoints for Scope Management

#### 1. **Create Scope** ✅ SUITABLE FOR INITIAL CARDS
```
POST /api/projects/:id/scopes
```
- Creates a new kanban card/scope for a project
- **Used for**: Adding new cards to the kanban board
- **Accepts**: title, status, progress, assignee, dates, attachments
- **Returns**: scope_id of the created card

---

#### 2. **Update Scope** ✅ PRIMARY ENDPOINT FOR STATUS CHANGES
```
PUT /api/projects/:id/scopes/:scopeId
```
- **Most suitable for handling kanban status changes**
- **Current status field supports**: `'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'`
- **Supports updating**:
  - `status` (primary kanban state)
  - `progress` (0-100 percentage)
  - `order_index` (card position within a column)
  - All other scope metadata

**Example Request**:
```json
{
  "status": "in_progress",
  "progress": 25,
  "order_index": 1
}
```

---

#### 3. **Reorder Scopes** ✅ SUITABLE FOR DRAG-AND-DROP
```
PUT /api/projects/:id/scopes/reorder
```
- Manages visual ordering within kanban columns (via `order_index`)
- **Two payload shapes supported**:

**Format 1** - Array of scope IDs:
```json
{
  "order": [scope_id1, scope_id2, scope_id3]
}
```

**Format 2** - Objects with order indices:
```json
{
  "scopes": [
    { "id": scope_id1, "order_index": 0 },
    { "id": scope_id2, "order_index": 1 }
  ]
}
```

---

#### 4. **Get Project Scopes** ✅ FOR FETCHING KANBAN BOARD
```
GET /api/projects/:id
```
- Returns project with all scopes included
- Scopes ordered by `order_index ASC, id ASC`
- Each scope includes current status, progress, and all metadata

---

#### 5. **Delete Scope** ✅ FOR REMOVING CARDS
```
DELETE /api/projects/:id/scopes/:scopeId
```
- Removes a kanban card entirely from the board

---

## Recommended Kanban Workflow

### Backend API Flow:
1. **Load Board**: `GET /api/projects/:id` → Fetch all scopes with their statuses
2. **Change Status**: `PUT /api/projects/:id/scopes/:scopeId` → Update scope status
3. **Reorder Cards**: `PUT /api/projects/:id/scopes/reorder` → Update visual order
4. **Create Card**: `POST /api/projects/:id/scopes` → Add new scope
5. **Update Metadata**: `PUT /api/projects/:id/scopes/:scopeId` → Update any scope field

---

## Current Scope Table Schema

### Existing Columns in `project_scopes`:
```sql
CREATE TABLE project_scopes (
  id INT PRIMARY KEY,
  project_id INT,
  title VARCHAR(255),
  description TEXT,
  status ENUM('not_started','in_progress','on_hold','completed','cancelled'),
  progress TINYINT UNSIGNED (0-100),
  assignee VARCHAR(50),
  order_index INT,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  planned_mandays INT,
  actual_mandays INT,
  attachment TEXT (comma-separated paths),
  task_groups TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 🎯 Suggested Additional Columns for Enhanced Kanban

### Priority Tier 1 (STRONGLY RECOMMENDED)
These add essential kanban functionality:

| Column | Type | Purpose |
|--------|------|---------|
| `priority` | ENUM('critical','high','medium','low') | Visual urgency indicator for cards |
| `color_tag` | VARCHAR(7) CHAR(7) | Hex color for card visual grouping |
| `swimlane` | VARCHAR(50) | Vertical swim lane categorization (e.g., "frontend", "backend", "qa") |

### Priority Tier 2 (RECOMMENDED)
Adds workflow tracking and WIP limits:

| Column | Type | Purpose |
|--------|------|---------|
| `blocked_reason` | TEXT | Why a card is blocked (status='on_hold') |
| `blocked_since` | TIMESTAMP | When the card became blocked |
| `duration_days` | INT GENERATED | Auto-calculated days from start to now (or completion) |
| `cycle_time_days` | INT | Days from in_progress to completed |
| `wip_limit` | INT | Work-in-progress limit for column (nullable) |

### Priority Tier 3 (OPTIONAL)
Advanced analytics and dependencies:

| Column | Type | Purpose |
|--------|------|---------|
| `parent_scope_id` | INT FK | Epic/parent task reference |
| `story_points` | DECIMAL(4,2) | Agile estimation (0-40 typically) |
| `tags` | JSON | Array of tag names ["bug-fix", "feature"] |
| `blockers` | JSON | Array of blocking scope IDs |
| `blocked_by_scope_ids` | JSON | Dependencies on other scopes |
| `effort_estimate` | DECIMAL(5,2) | Alternative to mandays; effort units |
| `complexity` | ENUM('simple','medium','complex') | Complexity assessment |
| `due_date` | DATE | Different from planned_end_date; soft deadline |
| `time_estimate_hours` | INT | Hour-level granularity vs. mandays |
| `actual_hours_spent` | INT | Track hours instead of just completion % |

---

## Recommended SQL Alterations

### Minimal Implementation (Tier 1):
```sql
ALTER TABLE project_scopes 
ADD COLUMN priority ENUM('critical','high','medium','low') 
           DEFAULT 'medium' AFTER status,
ADD COLUMN color_tag CHAR(7) DEFAULT '#10b981' AFTER priority,
ADD COLUMN swimlane VARCHAR(50) DEFAULT NULL AFTER color_tag;
```

### Extended Implementation (Tiers 1-2):
```sql
ALTER TABLE project_scopes 
ADD COLUMN priority ENUM('critical','high','medium','low') DEFAULT 'medium' AFTER status,
ADD COLUMN color_tag CHAR(7) DEFAULT '#10b981' AFTER priority,
ADD COLUMN swimlane VARCHAR(50) DEFAULT NULL AFTER color_tag,
ADD COLUMN blocked_reason TEXT DEFAULT NULL,
ADD COLUMN blocked_since TIMESTAMP DEFAULT NULL,
ADD COLUMN duration_days INT GENERATED ALWAYS AS 
           (DATEDIFF(COALESCE(actual_end_date, NOW()), 
                     COALESCE(planned_start_date, created_at))) VIRTUAL,
ADD COLUMN cycle_time_days INT DEFAULT NULL;
```

---

## Model/Controller Updates Required

### To support new columns, update `projectModel.ts`:

```typescript
export interface NewScope {
  // ... existing fields
  priority?: 'critical' | 'high' | 'medium' | 'low';
  color_tag?: string;
  swimlane?: string;
  blocked_reason?: null | string;
  blocked_since?: null | string;
}

export async function updateScope(scopeId: number, updates: Partial<NewScope>): Promise<void> {
  const payload: any = {};
  // ... existing code
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.color_tag !== undefined) payload.color_tag = updates.color_tag;
  if (updates.swimlane !== undefined) payload.swimlane = updates.swimlane;
  if (updates.blocked_reason !== undefined) payload.blocked_reason = updates.blocked_reason ?? null;
  if (updates.blocked_since !== undefined) payload.blocked_since = updates.blocked_since ?? null;
  // ... rest of code
}
```

---

## Summary Table: Which Endpoint For Which Action?

| Action | Endpoint | Method |
|--------|----------|--------|
| Load kanban board | `GET /api/projects/:id` | GET |
| Change card status | `PUT /api/projects/:id/scopes/:scopeId` | PUT |
| Reorder cards in column | `PUT /api/projects/:id/scopes/reorder` | PUT |
| Add new card | `POST /api/projects/:id/scopes` | POST |
| Remove card | `DELETE /api/projects/:id/scopes/:scopeId` | DELETE |
| Update card metadata | `PUT /api/projects/:id/scopes/:scopeId` | PUT |

---

## Status Field Values (Current)
- `not_started` → Backlog column
- `in_progress` → In Progress column
- `on_hold` → Blocked/On Hold column
- `completed` → Done column
- `cancelled` → Cancelled column (optional)

> **Consider** adding a `wipStatus` column if you need intermediate states not covered by the above.
