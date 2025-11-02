import { pool } from '../utils/db';

// Table names (main DB)
const projectDB = 'projects';
const BASE_PROJECTS = 'projects';
const BASE_PROGRESS = 'project_progress_logs';
const T_PROJECTS = `${projectDB}.${BASE_PROJECTS}`;
const T_ASSIGN = `${projectDB}.project_assignments`;
const T_SCOPES = `${projectDB}.project_scopes`;
const T_PROGRESS = `${projectDB}.${BASE_PROGRESS}`;
const T_TAGS = `${projectDB}.project_tags`;
const T_TAG_LINKS = `${projectDB}.project_tag_links`;
const T_SUPPORT = `${projectDB}.project_support_shifts`;

// --- Schema adaptability helpers ---
type ProgressCol = 'overall_progress' | 'percent_complete';
let cachedProjectProgressCol: ProgressCol | null = null;
let cachedLogProgressCol: ProgressCol | null = null;

async function detectProgressColumn(dbName: string, tableName: string): Promise<ProgressCol> {
  const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN ('overall_progress','percent_complete')`;
  const [rows]: any = await pool.query(sql, [dbName, tableName]);
  const cols = rows.map((r: any) => String(r.COLUMN_NAME));
  if (cols.includes('overall_progress')) return 'overall_progress';
  return 'percent_complete';
}

async function getProjectProgressCol(): Promise<ProgressCol> {
  if (!cachedProjectProgressCol) {
    cachedProjectProgressCol = await detectProgressColumn(projectDB, BASE_PROJECTS);
  }
  return cachedProjectProgressCol;
}


export type AssignmentType = 'task' | 'support' | 'project';
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk';
export type AssignmentRole = 'primary' | 'collaborator' | 'observer';

// ----- Tags utilities -----

function slugify(name: string): string {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 100);
}

export async function ensureTag(name: string): Promise<number> {
  const tagName = name.trim();
  if (!tagName) throw new Error('Tag name is required');
  const tagSlug = slugify(tagName);
  // Try find existing
  const [rows]: any = await pool.query(`SELECT id FROM ${T_TAGS} WHERE slug = ? OR name = ? LIMIT 1`, [tagSlug, tagName]);
  if (rows.length) return Number(rows[0].id);
  const [res]: any = await pool.query(`INSERT INTO ${T_TAGS} (name, slug) VALUES (?, ?)`, [tagName, tagSlug]);
  return Number(res.insertId);
}

export async function linkProjectTag(projectId: number, tagId: number): Promise<void> {
  await pool.query(`INSERT IGNORE INTO ${T_TAG_LINKS} (project_id, tag_id) VALUES (?, ?)`, [projectId, tagId]);
}

export async function setProjectTags(projectId: number, tags: string[] | null | undefined): Promise<void> {
  if (!tags || !tags.length) return;
  for (const t of tags) {
    const id = await ensureTag(t);
    await linkProjectTag(projectId, id);
  }
}

export async function getProjectTagNames(projectId: number): Promise<string[]> {
  const sql = `SELECT t.name FROM ${T_TAG_LINKS} l JOIN ${T_TAGS} t ON t.id = l.tag_id WHERE l.project_id = ? ORDER BY t.name ASC`;
  const [rows]: any = await pool.query(sql, [projectId]);
  return rows.map((r: any) => String(r.name));
}

/* ======= PROJECTS ======= */

export interface NewProject {
  code: string;
  name: string;
  description?: string | null;
  assignment_type: AssignmentType;
  status?: ProjectStatus;
  start_date?: string | null; // YYYY-MM-DD
  due_date?: string | null; // YYYY-MM-DD
  percent_complete?: number; // 0-100 (legacy)
  overall_progress?: number; // 0-100 (new)
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export const getProjects = async (): Promise<any[]> => {
  const [rows]: any = await pool.query(`SELECT * FROM ${T_PROJECTS} ORDER BY id DESC`);
  return rows;
};

//include scope
export const getProjectById = async (projectId: number): Promise<any | null> => {
  const [rows]: any = await pool.query(`SELECT * FROM ${T_PROJECTS} WHERE id = ? LIMIT 1`, [projectId]);
  if (rows.length) return rows[0];
  return null;
};

export async function createProject(p: NewProject): Promise<number> {
  const payload: any = {
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    assignment_type: p.assignment_type,
    status: p.status ?? 'not_started',
    start_date: p.start_date ?? null,
    due_date: p.due_date ?? null
  };
  if (p.priority) payload.priority = p.priority;
  // Map progress to the actual column present
  const progressValRaw = p.overall_progress ?? p.percent_complete ?? 0;
  const progressVal = Math.min(100, Math.max(0, Number(progressValRaw)));
  const progressCol = await getProjectProgressCol();
  (payload as any)[progressCol] = progressVal;
  const [res]: any = await pool.query(`INSERT INTO ${T_PROJECTS} SET ?`, [payload]);
  return Number(res.insertId);
};

export async function updateProject(projectId: number, updates: Partial<NewProject>): Promise<void> {
  const payload: any = {};
  if (updates.code !== undefined) payload.code = updates.code;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description ?? null;
  if (updates.assignment_type !== undefined) payload.assignment_type = updates.assignment_type;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.start_date !== undefined) payload.start_date = updates.start_date ?? null;
  if (updates.due_date !== undefined) payload.due_date = updates.due_date ?? null;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  // Map progress to the actual column present
  const progressValRaw = updates.overall_progress ?? updates.percent_complete;
  if (progressValRaw !== undefined) {
    const progressCol = await getProjectProgressCol();
    (payload as any)[progressCol] = Math.min(100, Math.max(0, Number(progressValRaw)));
  }
  if (Object.keys(payload).length === 0) return; // Nothing to update
  await pool.query(`UPDATE ${T_PROJECTS} SET ?, updated_at = NOW() WHERE id = ?`, [payload, projectId]);
};


export async function deleteProject(projectId: number): Promise<void> {
  await pool.query(`DELETE FROM ${T_PROJECTS} WHERE id = ?`, [projectId]);
};


/* ======= SCOPE ======= */
export interface NewScope {
  project_id: number;
  title: string;
  task_groups?: string | null;
  description?: string | null;
  assignee?: string | null; // ramco_id
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | null;
  attachment?: string | null; // comma-separated or single path
  progress?: number | null; // 0-100
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  actual_mandays?: number | null;
  order_index?: number | null;
}

export async function getScopeByProjectId(projectId: number): Promise<any[]> {
  const [rows]: any = await pool.query(`SELECT * FROM ${T_SCOPES} WHERE project_id = ? ORDER BY order_index ASC, id ASC`, [projectId]);
  return rows;
};

export async function getScopeById(scopeId: number): Promise<any | null> {
  const [rows]: any = await pool.query(`SELECT * FROM ${T_SCOPES} WHERE id = ? LIMIT 1`, [scopeId]);
  return rows.length ? rows[0] : null;
}

export async function createScope(scope: NewScope): Promise<number> {
  const payload: any = {
    project_id: scope.project_id,
    title: scope.title,
    task_groups: scope.task_groups ?? null,
    description: scope.description ?? null,
    assignee: scope.assignee ?? null,
    planned_start_date: scope.planned_start_date ?? null,
    planned_end_date: scope.planned_end_date ?? null,
    planned_mandays: scope.planned_mandays ?? null,
    attachment: scope.attachment ?? null,
    progress: scope.progress !== undefined && scope.progress !== null ? Math.min(100, Math.max(0, Number(scope.progress))) : null,
    status: scope.status ?? null,
    actual_start_date: scope.actual_start_date ?? null,
    actual_end_date: scope.actual_end_date ?? null,
    actual_mandays: scope.actual_mandays ?? null
  };
  // determine order_index: use provided or next available for the project
  if (scope.order_index !== undefined && scope.order_index !== null && Number.isFinite(Number(scope.order_index))) {
    payload.order_index = Number(scope.order_index);
  } else {
    const [r]: any = await pool.query(`SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx FROM ${T_SCOPES} WHERE project_id = ?`, [scope.project_id]);
    payload.order_index = Number(r?.[0]?.next_idx ?? 0);
  }
  const [res]: any = await pool.query(`INSERT INTO ${T_SCOPES} SET ?`, [payload]);
  return Number(res.insertId);
};

export async function updateScope(scopeId: number, updates: Partial<NewScope>): Promise<void> {
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.task_groups !== undefined) payload.task_groups = updates.task_groups ?? null;
  if (updates.description !== undefined) payload.description = updates.description ?? null;
  if (updates.assignee !== undefined) payload.assignee = updates.assignee ?? null;
  if (updates.planned_start_date !== undefined) payload.planned_start_date = updates.planned_start_date ?? null;
  if (updates.planned_end_date !== undefined) payload.planned_end_date = updates.planned_end_date ?? null;
  if (updates.planned_mandays !== undefined) payload.planned_mandays = updates.planned_mandays ?? null;
  if (updates.attachment !== undefined) payload.attachment = updates.attachment ?? null;
  if (updates.progress !== undefined && updates.progress !== null) {
    payload.progress = Math.min(100, Math.max(0, Number(updates.progress)));
  }
  if (updates.status !== undefined) payload.status = updates.status ?? null;
  if (updates.actual_start_date !== undefined) payload.actual_start_date = updates.actual_start_date ?? null;
  if (updates.actual_end_date !== undefined) payload.actual_end_date = updates.actual_end_date ?? null;
  if (updates.actual_mandays !== undefined) payload.actual_mandays = updates.actual_mandays ?? null;
  if (updates.order_index !== undefined) payload.order_index = updates.order_index ?? null;
  if (Object.keys(payload).length === 0) return; // Nothing to update
  await pool.query(`UPDATE ${T_SCOPES} SET ?, updated_at = NOW() WHERE id = ?`, [payload, scopeId]);
}

export async function deleteScope(scopeId: number): Promise<void> {
  await pool.query(`DELETE FROM ${T_SCOPES} WHERE id = ?`, [scopeId]);
};

export async function appendScopeAttachments(scopeId: number, newPaths: string[]): Promise<void> {
  if (!newPaths.length) return;
  const existing = await getScopeById(scopeId);
  const existingAtt = existing?.attachment ? String(existing.attachment) : '';
  const existingArr = existingAtt ? existingAtt.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const combinedSet = new Set<string>([...existingArr, ...newPaths]);
  const combined = Array.from(combinedSet).join(',');
  await pool.query(`UPDATE ${T_SCOPES} SET attachment = ?, updated_at = NOW() WHERE id = ?`, [combined, scopeId]);
}

export async function replaceScopeAttachments(scopeId: number, newPaths: string[]): Promise<void> {
  const value = newPaths.length ? newPaths.join(',') : null;
  await pool.query(`UPDATE ${T_SCOPES} SET attachment = ?, updated_at = NOW() WHERE id = ?`, [value, scopeId]);
}

export async function getScopeIdsByProject(projectId: number): Promise<number[]> {
  const [rows]: any = await pool.query(`SELECT id FROM ${T_SCOPES} WHERE project_id = ?`, [projectId]);
  return rows.map((r: any) => Number(r.id));
}

export async function setScopesOrder(projectId: number, orderedScopeIds: number[]): Promise<void> {
  if (!orderedScopeIds || !orderedScopeIds.length) return;
  // Build CASE statement
  const cases = orderedScopeIds.map((id, idx) => `WHEN ${id} THEN ${idx}`).join(' ');
  const idsIn = orderedScopeIds.join(',');
  const sql = `UPDATE ${T_SCOPES}
               SET order_index = CASE id ${cases} END, updated_at = NOW()
               WHERE project_id = ? AND id IN (${idsIn})`;
  await pool.query(sql, [projectId]);
}

/* ======= ASSIGNMENTS (T_ASSIGN) ======= */
export interface AssignmentRow {
  id?: number;
  project_id: number;
  scope_id: number;
  assignee: string | null;
  actual_mandays: number | null;
}

export async function upsertAssignment(row: AssignmentRow): Promise<void> {
  const [rows]: any = await pool.query(
    `SELECT id, assignee, actual_mandays FROM ${T_ASSIGN} WHERE project_id = ? AND scope_id = ? LIMIT 1`,
    [row.project_id, row.scope_id]
  );
  if (rows.length) {
    const existing = rows[0];
    const newAssignee = row.assignee ?? null;
    const newMandays = row.actual_mandays ?? null;
    // If nothing changed, skip write
    if (String(existing.assignee ?? '') === String(newAssignee ?? '') && Number(existing.actual_mandays ?? null) === Number(newMandays ?? null)) {
      return;
    }
    await pool.query(
      `UPDATE ${T_ASSIGN} SET assignee = ?, actual_mandays = ?, updated_at = NOW() WHERE id = ?`,
      [newAssignee, newMandays, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO ${T_ASSIGN} (project_id, scope_id, assignee, actual_mandays) VALUES (?, ?, ?, ?)`,
      [row.project_id, row.scope_id, row.assignee ?? null, row.actual_mandays ?? null]
    );
  }
}

export async function deleteAssignmentByProjectScope(projectId: number, scopeId: number): Promise<void> {
  await pool.query(`DELETE FROM ${T_ASSIGN} WHERE project_id = ? AND scope_id = ?`, [projectId, scopeId]);
}