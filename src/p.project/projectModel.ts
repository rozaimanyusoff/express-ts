import { pool } from '../utils/db';

// Table names (main DB)
const T_PROJECTS = 'projects';
const T_ASSIGN = 'project_assignments';
const T_MILESTONES = 'project_milestones';
const T_PROGRESS = 'project_progress_logs';
const T_TAGS = 'project_tags';
const T_TAG_LINKS = 'project_tag_links';
const T_SUPPORT = 'project_support_shifts';

export type AssignmentType = 'task' | 'support';
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk';
export type AssignmentRole = 'primary' | 'collaborator' | 'observer';

export interface NewProject {
  code: string;
  name: string;
  description?: string | null;
  assignment_type: AssignmentType;
  status?: ProjectStatus;
  start_date?: string | null; // YYYY-MM-DD
  due_date?: string | null; // YYYY-MM-DD
  percent_complete?: number; // 0-100
}

export async function createProject(p: NewProject): Promise<number> {
  const payload: any = {
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    assignment_type: p.assignment_type,
    status: p.status ?? 'not_started',
    start_date: p.start_date ?? null,
    due_date: p.due_date ?? null,
    percent_complete: Math.min(100, Math.max(0, Number(p.percent_complete ?? 0)))
  };
  const [res]: any = await pool.query(`INSERT INTO ${T_PROJECTS} SET ?`, [payload]);
  return Number(res.insertId);
}

export async function listProjects(filter?: { assignmentType?: AssignmentType }): Promise<any[]> {
  const where: string[] = [];
  const params: any[] = [];
  if (filter?.assignmentType) { where.push('assignment_type = ?'); params.push(filter.assignmentType); }
  const sql = `SELECT p.*, 
    DATEDIFF(COALESCE(p.due_date, CURRENT_DATE()), COALESCE(p.start_date, CURRENT_DATE())) AS duration_days
    FROM ${T_PROJECTS} p ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.created_at DESC`;
  const [rows] = await pool.query(sql, params);
  return rows as any[];
}

export interface ProgressLog {
  project_id: number;
  logged_by_id: number;
  log_date?: string; // YYYY-MM-DD, default TODAY()
  percent_complete?: number; // 0-100
  remaining_effort_days?: number | null;
  status_override?: ProjectStatus | null;
  notes?: string | null;
}

export async function addProgressLog(log: ProgressLog): Promise<number> {
  const payload: any = {
    project_id: log.project_id,
    logged_by_id: log.logged_by_id,
    log_date: log.log_date || null,
    percent_complete: log.percent_complete !== undefined ? Math.min(100, Math.max(0, Number(log.percent_complete))) : null,
    remaining_effort_days: log.remaining_effort_days ?? null,
    status_override: log.status_override ?? null,
    notes: log.notes ?? null
  };
  const [res]: any = await pool.query(`INSERT INTO ${T_PROGRESS} SET ?`, [payload]);
  const insertId = Number(res.insertId);
  // Optionally update project.percent_complete and status when provided
  const updates: string[] = [];
  const params: any[] = [];
  if (payload.percent_complete !== null && payload.percent_complete !== undefined) { updates.push('percent_complete = ?'); params.push(payload.percent_complete); }
  if (payload.status_override) { updates.push('status = ?'); params.push(payload.status_override); }
  if (updates.length) {
    params.push(log.project_id);
    await pool.query(`UPDATE ${T_PROJECTS} SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  }
  return insertId;
}
