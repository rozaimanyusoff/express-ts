import { Request, Response } from 'express';
import * as model from './projectModel';

// POST /api/projects
export const createProject = async (req: Request, res: Response) => {
  try {
    const { code, name, description, assignment_type, status, start_date, due_date, percent_complete } = req.body || {};
    if (!code || !name || !assignment_type) {
      return res.status(400).json({ status: 'error', message: 'code, name, and assignment_type are required', data: null });
    }
    if (!['task', 'support'].includes(String(assignment_type))) {
      return res.status(400).json({ status: 'error', message: 'assignment_type must be task|support', data: null });
    }
    const id = await model.createProject({ code, name, description, assignment_type, status, start_date, due_date, percent_complete });
    return res.status(201).json({ status: 'success', message: 'Project created', data: { id } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to create project', data: null });
  }
};

// POST /api/projects/:id/progress-log
export const addProgressLog = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    const { logged_by_id, log_date, percent_complete, remaining_effort_days, status_override, notes } = req.body || {};
    if (!logged_by_id) return res.status(400).json({ status: 'error', message: 'logged_by_id required', data: null });
    const id = await model.addProgressLog({ project_id: projectId, logged_by_id, log_date, percent_complete, remaining_effort_days, status_override, notes });
    return res.status(201).json({ status: 'success', message: 'Progress log added', data: { id } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to add progress log', data: null });
  }
};

// GET /api/projects?assignmentType=task
export const listProjects = async (req: Request, res: Response) => {
  try {
    const assignmentType = typeof req.query.assignmentType === 'string' ? (req.query.assignmentType as any) : undefined;
    if (assignmentType && !['task', 'support'].includes(String(assignmentType))) {
      return res.status(400).json({ status: 'error', message: 'assignmentType must be task|support', data: null });
    }
    const rows = await model.listProjects({ assignmentType });
    return res.json({ status: 'success', message: 'Projects retrieved', data: rows });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch projects', data: null });
  }
};
