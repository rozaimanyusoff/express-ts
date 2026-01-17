import { Request, Response } from 'express';
import path from 'path';

import * as assetModel from '../p.asset/assetModel';
import { buildStoragePath, safeMove, sanitizeFilename, toDbPath } from '../utils/uploadUtil';
import * as projectModel from './projectModel';


/* ======= PROJECTS ======= */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await projectModel.getProjects();

    // Fetch employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Enrich each project with assignments summary and scopes
    const enrichedProjects = await Promise.all(
      projects.map(async (project: any) => {
        const scopes = await projectModel.getScopeByProjectId(project.id);

        // Enrich scopes with assignee employee data
        const enrichedScopes = scopes.map((scope: any) => {
          const { assignee, ...scopeWithoutAssignee } = scope;
          if (assignee) {
            const emp = empMap.get(String(assignee));
            return {
              ...scopeWithoutAssignee,
              assignee: emp ? {
                full_name: emp.full_name || emp.name || null,
                ramco_id: String(assignee)
              } : {
                full_name: null,
                ramco_id: String(assignee)
              }
            };
          }
          return {
            ...scopeWithoutAssignee,
            assignee: null
          };
        });

        // Calculate assignments summary grouped by assignee
        const assignmentsMap = new Map<string, { actual_mandays: number; assignee: { full_name: null | string; ramco_id: string; }; planned_mandays: number; scope_count: number }>();

        for (const scope of enrichedScopes) {
          const assigneeId = scope.assignee || 'unassigned';
          const plannedMandays = Number(scope.planned_mandays) || 0;
          const actualMandays = Number(scope.actual_mandays) || 0;

          if (!assignmentsMap.has(assigneeId)) {
            const emp = empMap.get(assigneeId);
            assignmentsMap.set(assigneeId, {
              actual_mandays: 0,
              assignee: {
                full_name: emp ? (emp.full_name || emp.name || null) : null,
                ramco_id: assigneeId
              },
              planned_mandays: 0,
              scope_count: 0
            });
          }

          const current = assignmentsMap.get(assigneeId)!;
          current.planned_mandays += plannedMandays;
          current.actual_mandays += actualMandays;
          current.scope_count += 1;
        }

        const assignments = Array.from(assignmentsMap.values())
          .filter(a => a.assignee.ramco_id !== 'unassigned')
          .sort((a, b) => b.actual_mandays - a.actual_mandays);

        return {
          ...project,
          assignments,
          scopes: enrichedScopes
        };
      })
    );

    return res.status(200).json({ data: enrichedProjects, message: `${enrichedProjects.length} Projects retrieved`, status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch projects', status: 'error' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ data: null, message: 'Project not found', status: 'error' });
    }
    const scopes = await projectModel.getScopeByProjectId(projectId);

    // Fetch employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Enrich scopes with assignee employee data
    const enrichedScopes = scopes.map((scope: any) => {
      if (scope.assignee) {
        const emp = empMap.get(String(scope.assignee));
        return {
          ...scope,
          assignee_details: emp ? {
            full_name: emp.full_name || emp.name || null,
            ramco_id: String(scope.assignee)
          } : {
            full_name: null,
            ramco_id: String(scope.assignee)
          }
        };
      }
      return {
        ...scope,
        assignee_details: null
      };
    });

    // Calculate assignments summary grouped by assignee
    const assignmentsMap = new Map<string, { actual_mandays: number; assignee: { full_name: null | string; ramco_id: string; }; planned_mandays: number; scope_count: number }>();

    for (const scope of enrichedScopes) {
      const assigneeId = scope.assignee || 'unassigned';
      const plannedMandays = Number(scope.planned_mandays) || 0;
      const actualMandays = Number(scope.actual_mandays) || 0;

      if (!assignmentsMap.has(assigneeId)) {
        const emp = empMap.get(assigneeId);
        assignmentsMap.set(assigneeId, {
          actual_mandays: 0,
          assignee: {
            full_name: emp ? (emp.full_name || emp.name || null) : null,
            ramco_id: assigneeId
          },
          planned_mandays: 0,
          scope_count: 0
        });
      }

      const current = assignmentsMap.get(assigneeId)!;
      current.planned_mandays += plannedMandays;
      current.actual_mandays += actualMandays;
      current.scope_count += 1;
    }

    const assignments = Array.from(assignmentsMap.values())
      .filter(a => a.assignee.ramco_id !== 'unassigned') // Optionally exclude unassigned
      .sort((a, b) => b.actual_mandays - a.actual_mandays); // Sort by actual mandays desc

    const { overall_progress, percent_complete, ...rest } = project;
    const progress = (overall_progress !== undefined && overall_progress !== null) ? overall_progress : percent_complete;
    return res.status(200).json({
      data: {
        ...rest,
        assignments,
        overall_progress: progress,
        scopes: enrichedScopes
      },
      message: 'Project retrieved',
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch project', status: 'error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    // Normalize incoming payload per new shape
    const code = body.code;
    const name = body.name;
    const description = body.description ?? null;
    const assignmentType = body.assignmentType ?? body.assignment_type ?? 'project';
    const priority = body.priority ?? undefined; // 'low'|'medium'|'high'|'critical'
    const projectTagsInput = body.project_tags ?? body.projectTags ?? '';
    const projectTags = Array.isArray(projectTagsInput)
      ? projectTagsInput.map((t: any) => String(t))
      : String(projectTagsInput || '').split(',').map((s) => s.trim()).filter(Boolean);
    const scopes = Array.isArray(body.scopes) ? body.scopes : [];

    if (!code || !name) {
      return res.status(400).json({ data: null, message: 'code and name are required', status: 'error' });
    }

    // Compute derived project fields from scopes if not provided
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;
    const minDate = (dates: (null | string)[]) => dates.filter(Boolean).sort()[0] || null;
    const maxDate = (dates: (null | string)[]) => dates.filter(Boolean).sort().slice(-1)[0] || null;
    const plannedStarts = scopes.map((s: any) => parseDate(s.plannedStartDate ?? s.planned_start_date));
    const plannedEnds = scopes.map((s: any) => parseDate(s.plannedEndDate ?? s.planned_end_date));
    const start_date = parseDate(body.startDate ?? body.start_date) || minDate(plannedStarts);
    const due_date = parseDate(body.dueDate ?? body.due_date) || maxDate(plannedEnds);

    const overallFromScopes = (() => {
      const nums = scopes.map((s: any) => Number(s.progress)).filter((n: any) => Number.isFinite(n));
      if (!nums.length) return null;
      const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
      return Math.round(avg);
    })();
    const overallFromPayload = (body.overallProgress ?? body.overall_progress);
    const percent_complete = Number.isFinite(Number(overallFromPayload)) ? Number(overallFromPayload) : (overallFromScopes ?? 0);

    // Allow assignmentType: 'task' | 'support' | 'project'
    const assignment_type = ['project', 'support', 'task'].includes(String(assignmentType)) ? String(assignmentType) as projectModel.AssignmentType : 'project';

    const projId = await projectModel.createProject({ assignment_type, code, description, due_date, name, percent_complete, priority, start_date, status: 'in_progress' });

    // Helper: count business days (Mon-Fri) inclusive
    function businessDaysInclusive(startStr: null | string, endStr: null | string): null | number {
      if (!startStr || !endStr) return null;
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      if (end < start) return 0;
      let count = 0;
      const d = new Date(start);
      while (d <= end) {
        const day = d.getDay(); // 0=Sun, 6=Sat
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    }

    // Build upload mapping for scope attachments from req.files
    const allFiles: any[] = Array.isArray((req as any).files)
      ? ((req as any).files as any[])
      : Object.values((req as any).files || {}).flat();
    const assignedFiles = new Map<number, any[]>();
    const unassigned: any[] = [];
    // Try to assign by fieldname patterns
    for (const f of allFiles || []) {
      const field = String(f.fieldname || '');
      const m = (/scopes\[(\d+)\][.\[]attachments\]?/i.exec(field)) || (/^attachments_(\d+)$/i.exec(field)) || (/^attachment_(\d+)$/i.exec(field));
      if (m) {
        const idx = Number(m[1]);
        if (!assignedFiles.has(idx)) assignedFiles.set(idx, []);
        assignedFiles.get(idx)!.push(f);
      } else {
        unassigned.push(f);
      }
    }
    // Fallback: attach one unassigned file per scope in order
    for (let i = 0; i < scopes.length && unassigned.length; i++) {
      if (!assignedFiles.has(i)) assignedFiles.set(i, []);
      if (assignedFiles.get(i)!.length === 0) {
        assignedFiles.get(i)!.push(unassigned.shift());
      }
    }

    // Sanitize tag for folder name
    const tagFolder = (projectTags[0] ? sanitizeFilename(projectTags[0], 60) : '_untagged');

    // Insert scopes rows
    const createdScopes: any[] = [];
    for (let i = 0; i < scopes.length; i++) {
      const s = scopes[i] || {};
      const planned_start_date = parseDate(s.plannedStartDate ?? s.planned_start_date);
      const planned_end_date = parseDate(s.plannedEndDate ?? s.planned_end_date);
      const actual_start_date = parseDate(s.actualStartDate ?? s.actual_start_date);
      const actual_end_date = parseDate(s.actualEndDate ?? s.actual_end_date);

      const planned_mandays = Number.isFinite(Number(s.plannedMandays ?? s.planned_mandays))
        ? Number(s.plannedMandays ?? s.planned_mandays)
        : businessDaysInclusive(planned_start_date, planned_end_date);
      const actual_mandays = Number.isFinite(Number(s.actualMandays ?? s.actual_mandays))
        ? Number(s.actualMandays ?? s.actual_mandays)
        : businessDaysInclusive(actual_start_date, actual_end_date);

      // Move/rename any uploaded files for this scope to final path project/{tag}/<projectId>-<sanitized>
      const filesForScope = assignedFiles.get(i) || [];
      const dbPaths: string[] = [];
      for (const file of filesForScope) {
        try {
          const originalAbs = file.path;
          const baseName = sanitizeFilename(file.originalname || path.basename(originalAbs));
          const finalName = `${projId}-${baseName}`;
          const destAbs = await buildStoragePath(`project/${tagFolder}`, finalName);
          await safeMove(originalAbs, destAbs);
          const dbPath = toDbPath(`project/${tagFolder}`, finalName);
          dbPaths.push(dbPath);
        } catch (e) {
          // ignore file move errors per-file to avoid blocking others
        }
      }
      const attachment = dbPaths.length ? dbPaths.join(',') : null;

      const scopePayload: projectModel.NewScope = {
        actual_end_date,
        actual_mandays: actual_mandays as any,
        actual_start_date,
        assignee: s.assignee ?? null,
        attachment,
        description: s.description ?? null,
        planned_end_date,
        planned_mandays: planned_mandays as any,
        planned_start_date,
        progress: Number.isFinite(Number(s.progress)) ? Number(s.progress) : null,
        project_id: projId,
        status: s.status ?? null,
        task_groups: (s.taskGroups ?? s.task_groups) ?? null,
        title: s.title
      };
      const scopeId = await projectModel.createScope(scopePayload);
      createdScopes.push({ id: scopeId, ...scopePayload });
    }

    // Link tags, if provided
    if (projectTags && projectTags.length) {
      await projectModel.setProjectTags(projId, projectTags);
    }

    return res.status(201).json({ data: { due_date, id: projId, overall_progress: percent_complete, priority: priority ?? null, scopes: createdScopes, start_date, tags: projectTags }, message: 'Project created', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create project', status: 'error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    const body = req.body || {};
    // At this point, scopes are ignored for this endpoint by design

    const updateData: Partial<Record<string, any>> = {};
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;
    if (body.code !== undefined) updateData.code = String(body.code);
    if (body.name !== undefined) updateData.name = String(body.name);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.assignment_type !== undefined) updateData.assignment_type = String(body.assignment_type);
    if (body.start_date !== undefined || body.startDate !== undefined) updateData.start_date = parseDate(body.start_date ?? body.startDate);
    if (body.due_date !== undefined || body.dueDate !== undefined) updateData.due_date = parseDate(body.due_date ?? body.dueDate);
    if (body.priority !== undefined) updateData.priority = String(body.priority);
    const ovp = body.overall_progress ?? body.overallProgress;
    const pct = body.percent_complete ?? body.percentComplete;
    if (ovp !== undefined) updateData.overall_progress = Number(ovp);
    else if (pct !== undefined) updateData.percent_complete = Number(pct);

    // ensure project exists
    const existing = await projectModel.getProjectById(projectId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Project not found', status: 'error' });
    }

    await projectModel.updateProject(projectId, updateData);

    // Optional tag update
    const projectTagsInput = body.project_tags ?? body.projectTags;
    if (projectTagsInput !== undefined) {
      const tags = Array.isArray(projectTagsInput)
        ? projectTagsInput.map((t: any) => String(t))
        : String(projectTagsInput || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (tags.length) {
        await projectModel.setProjectTags(projectId, tags);
      }
    }

    return res.status(200).json({ data: null, message: 'Project updated', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update project', status: 'error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });

    // ensure project exists because deleteProject returns void
    const existing = await projectModel.getProjectById(projectId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Project not found', status: 'error' });
    }

    await projectModel.deleteProject(projectId);
    return res.status(200).json({ data: null, message: 'Project deleted', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete project', status: 'error' });
  }
};

// POST /api/projects/:id/scopes - Create a single new scope for a project (with optional attachments)
export const addScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    const project = await projectModel.getProjectById(projectId);
    if (!project) return res.status(404).json({ data: null, message: 'Project not found', status: 'error' });

    const body = req.body || {};
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;
    const planned_start_date = parseDate(body.planned_start_date ?? body.plannedStartDate);
    const planned_end_date = parseDate(body.planned_end_date ?? body.plannedEndDate);
    const actual_start_date = parseDate(body.actual_start_date ?? body.actualStartDate);
    const actual_end_date = parseDate(body.actual_end_date ?? body.actualEndDate);

    function businessDaysInclusive(startStr: null | string, endStr: null | string): null | number {
      if (!startStr || !endStr) return null;
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      if (end < start) return 0;
      let count = 0;
      const d = new Date(start);
      while (d <= end) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    }

    const planned_mandays = Number.isFinite(Number(body.planned_mandays ?? body.plannedMandays))
      ? Number(body.planned_mandays ?? body.plannedMandays)
      : businessDaysInclusive(planned_start_date, planned_end_date);
    const actual_mandays = Number.isFinite(Number(body.actual_mandays ?? body.actualMandays))
      ? Number(body.actual_mandays ?? body.actualMandays)
      : businessDaysInclusive(actual_start_date, actual_end_date);

    // Determine folder from existing project tags
    let tagFolder = '_untagged';
    try {
      const tags = await projectModel.getProjectTagNames(projectId);
      if (tags && tags.length) tagFolder = sanitizeFilename(tags[0], 60);
    } catch { /* ignore */ }

    // Collect all uploaded files for this scope
    const allFiles: any[] = Array.isArray((req as any).files)
      ? ((req as any).files as any[])
      : Object.values((req as any).files || {}).flat();
    const dbPaths: string[] = [];
    for (const file of allFiles || []) {
      try {
        const originalAbs = (file).path;
        const baseName = sanitizeFilename((file).originalname || 'file');
        const finalName = `${projectId}-${baseName}`;
        const destAbs = await buildStoragePath(`project/${tagFolder}`, finalName);
        await safeMove(originalAbs, destAbs);
        const dbPath = toDbPath(`project/${tagFolder}`, finalName);
        dbPaths.push(dbPath);
      } catch { /* ignore single-file errors */ }
    }
    const attachment = dbPaths.length ? dbPaths.join(',') : null;

    const scopePayload: projectModel.NewScope = {
      actual_end_date,
      actual_mandays: actual_mandays as any,
      actual_start_date,
      assignee: body.assignee ?? null,
      attachment,
      description: body.description ?? null,
      order_index: Number.isFinite(Number(body.order_index)) ? Number(body.order_index) : undefined,
      planned_end_date,
      planned_mandays: planned_mandays as any,
      planned_start_date,
      progress: Number.isFinite(Number(body.progress)) ? Number(body.progress) : null,
      project_id: projectId,
      status: body.status ?? null,
      task_groups: (body.task_groups ?? body.taskGroups) ?? null,
      title: body.title
    };

    const id = await projectModel.createScope(scopePayload);
    // Maintain assignment row for assignee/actual_mandays
    if (scopePayload.assignee !== null || scopePayload.actual_mandays !== null) {
      await projectModel.upsertAssignment({
        actual_mandays: scopePayload.actual_mandays ?? null,
        assignee: scopePayload.assignee ?? null,
        project_id: projectId,
        scope_id: id
      });
    }
    return res.status(201).json({ data: { id, ...scopePayload }, message: 'Scope created', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create scope', status: 'error' });
  }
};

// DELETE /api/projects/:id/scopes/:scopeId - Remove a scope ensuring it belongs to the project
export const removeScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope id', status: 'error' });
    }
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ data: null, message: 'Scope not found for this project', status: 'error' });
    }
    await projectModel.deleteScope(scopeId);
    // Also remove assignment data for this project/scope
    await projectModel.deleteAssignmentByProjectScope(projectId, scopeId);
    return res.status(200).json({ data: { id: scopeId }, message: 'Scope deleted', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete scope', status: 'error' });
  }
};

// GET /api/projects/:id/scopes/:scopeId - Get a single scope by ID
export const getScopeById = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope id', status: 'error' });
    }

    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ data: null, message: 'Scope not found for this project', status: 'error' });
    }

    return res.status(200).json({
      data: scope,
      message: 'Scope retrieved',
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch scope', status: 'error' });
  }
};

// PUT /api/projects/:id/scopes/:scopeId - Update a single scope (fields and attachments)
export const updateScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope id', status: 'error' });
    }
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ data: null, message: 'Scope not found for this project', status: 'error' });
    }

    const body = req.body || {};
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;

    // Compute mandays if not explicitly provided
    function businessDaysInclusive(startStr: null | string, endStr: null | string): null | number {
      if (!startStr || !endStr) return null;
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      if (end < start) return 0;
      let count = 0;
      const d = new Date(start);
      while (d <= end) {
        const day = d.getDay(); // 0=Sun, 6=Sat
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    }

    const planned_start_date = (body.planned_start_date !== undefined || body.plannedStartDate !== undefined)
      ? parseDate(body.planned_start_date ?? body.plannedStartDate)
      : undefined;
    const planned_end_date = (body.planned_end_date !== undefined || body.plannedEndDate !== undefined)
      ? parseDate(body.planned_end_date ?? body.plannedEndDate)
      : undefined;
    const actual_start_date = (body.actual_start_date !== undefined || body.actualStartDate !== undefined)
      ? parseDate(body.actual_start_date ?? body.actualStartDate)
      : undefined;
    const actual_end_date = (body.actual_end_date !== undefined || body.actualEndDate !== undefined)
      ? parseDate(body.actual_end_date ?? body.actualEndDate)
      : undefined;

    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if ((body.task_groups ?? body.taskGroups) !== undefined) updates.task_groups = (body.task_groups ?? body.taskGroups) ?? null;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.assignee !== undefined) updates.assignee = body.assignee ?? null;
    if (planned_start_date !== undefined) updates.planned_start_date = planned_start_date;
    if (planned_end_date !== undefined) updates.planned_end_date = planned_end_date;

    if (body.planned_mandays !== undefined || body.plannedMandays !== undefined) {
      updates.planned_mandays = Number.isFinite(Number(body.planned_mandays ?? body.plannedMandays))
        ? Number(body.planned_mandays ?? body.plannedMandays)
        : businessDaysInclusive(
          (updates.planned_start_date ?? (scope.planned_start_date || null)),
          (updates.planned_end_date ?? (scope.planned_end_date || null))
        );
    }

    if (body.progress !== undefined) updates.progress = Number.isFinite(Number(body.progress)) ? Number(body.progress) : null;
    if (body.status !== undefined) updates.status = body.status ?? null;

    // Extract overall_progress for project update (not stored in scope)
    const overallProgress = body.overall_progress ?? body.overallProgress;

    if (actual_start_date !== undefined) updates.actual_start_date = actual_start_date;
    if (actual_end_date !== undefined) updates.actual_end_date = actual_end_date;
    if (body.actual_mandays !== undefined || body.actualMandays !== undefined) {
      updates.actual_mandays = Number.isFinite(Number(body.actual_mandays ?? body.actualMandays))
        ? Number(body.actual_mandays ?? body.actualMandays)
        : businessDaysInclusive(
          (updates.actual_start_date ?? (scope.actual_start_date || null)),
          (updates.actual_end_date ?? (scope.actual_end_date || null))
        );
    }

    // Move any uploaded files and apply attachments_mode
    let tagFolder = '_untagged';
    try {
      const tags = await projectModel.getProjectTagNames(projectId);
      if (tags && tags.length) tagFolder = sanitizeFilename(tags[0], 60);
    } catch { /* ignore */ }

    const allFiles: any[] = Array.isArray((req as any).files)
      ? ((req as any).files as any[])
      : Object.values((req as any).files || {}).flat();
    const movedPaths: string[] = [];
    for (const file of allFiles || []) {
      try {
        const originalAbs = (file).path;
        const baseName = sanitizeFilename((file).originalname || 'file');
        const finalName = `${projectId}-${baseName}`;
        const destAbs = await buildStoragePath(`project/${tagFolder}`, finalName);
        await safeMove(originalAbs, destAbs);
        const dbPath = toDbPath(`project/${tagFolder}`, finalName);
        movedPaths.push(dbPath);
      } catch { /* ignore */ }
    }
    const mode = String(body.attachments_mode || '').toLowerCase();
    if (movedPaths.length) {
      if (mode === 'replace') {
        await projectModel.replaceScopeAttachments(scopeId, movedPaths);
      } else {
        await projectModel.appendScopeAttachments(scopeId, movedPaths);
      }
    }

    if (body.order_index !== undefined) {
      updates.order_index = Number.isFinite(Number(body.order_index)) ? Number(body.order_index) : null;
    }
    if (Object.keys(updates).length) {
      await projectModel.updateScope(scopeId, updates);
    }

    // Log activity if status changed
    if (updates.status !== undefined && updates.status !== scope.status) {
      const changedBy = (req.user as any)?.ramco_id || (req.user as any)?.id || 'system';
      const reason = body.activity_reason || body.reason || null;
      const comments = body.review_comments || body.comments || null;
      
      await projectModel.createActivity({
        scope_id: scopeId,
        project_id: projectId,
        activity_type: 'status_change',
        old_status: scope.status as projectModel.ScopeStatus,
        new_status: updates.status as projectModel.ScopeStatus,
        reason: reason,
        comments: comments,
        changed_by: changedBy
      });
    }

    // Log activity if priority changed
    if (updates.priority !== undefined && updates.priority !== scope.priority) {
      const changedBy = (req.user as any)?.ramco_id || (req.user as any)?.id || 'system';
      await projectModel.createActivity({
        scope_id: scopeId,
        project_id: projectId,
        activity_type: 'priority_change',
        reason: `Priority changed from ${scope.priority} to ${updates.priority}`,
        changed_by: changedBy
      });
    }

    // Log activity if progress changed
    if (updates.progress !== undefined && updates.progress !== scope.progress) {
      const changedBy = (req.user as any)?.ramco_id || (req.user as any)?.id || 'system';
      await projectModel.createActivity({
        scope_id: scopeId,
        project_id: projectId,
        activity_type: 'progress_update',
        reason: `Progress updated from ${scope.progress ?? 0} to ${updates.progress ?? 0}`,
        changed_by: changedBy
      });
    }

    // Log activity if assignee changed
    if (updates.assignee !== undefined && updates.assignee !== scope.assignee) {
      const changedBy = (req.user as any)?.ramco_id || (req.user as any)?.id || 'system';
      await projectModel.createActivity({
        scope_id: scopeId,
        project_id: projectId,
        activity_type: 'assignee_change',
        reason: `Assignee changed from ${scope.assignee || 'unassigned'} to ${updates.assignee || 'unassigned'}`,
        changed_by: changedBy
      });
    }

    // Log activity if attachments were added
    if (movedPaths.length) {
      const changedBy = (req.user as any)?.ramco_id || (req.user as any)?.id || 'system';
      await projectModel.createActivity({
        scope_id: scopeId,
        project_id: projectId,
        activity_type: 'attachment_added',
        reason: `Attachments added: ${movedPaths.join(', ')}`,
        changed_by: changedBy
      });
    }

    // Maintain assignment row when assignee or actual_mandays potentially changed
    if (updates.assignee !== undefined || updates.actual_mandays !== undefined) {
      await projectModel.upsertAssignment({
        actual_mandays: (updates.actual_mandays !== undefined ? updates.actual_mandays : scope.actual_mandays) ?? null,
        assignee: (updates.assignee !== undefined ? updates.assignee : scope.assignee) ?? null,
        project_id: projectId,
        scope_id: scopeId
      });
    }

    // Update overall_progress on T_PROJECT table if provided
    if (overallProgress !== undefined && Number.isFinite(Number(overallProgress))) {
      await projectModel.updateProject(projectId, { overall_progress: Number(overallProgress) });
    }

    return res.status(200).json({ data: { id: scopeId }, message: 'Scope updated', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update scope', status: 'error' });
  }
};

// PUT /api/projects/:id/scopes/reorder - Set ordering for scopes by IDs array
export const reorderScopes = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    // Accept two payload shapes:
    // 1) { order: [scopeId1, scopeId2, ...] }
    // 2) { scopes: [{ id, order_index }, ...] }
    let order: number[] = [];
    if (Array.isArray((req.body)?.order)) {
      order = (req.body).order
        .map((x: any) => Number(x))
        .filter((n: any) => Number.isFinite(n));
    } else if (Array.isArray((req.body)?.scopes)) {
      const arr = (req.body).scopes
        .map((s: any) => ({
          id: Number(s.id ?? s.scope_id ?? s.scopeId),
          idx: Number(s.order_index ?? s.orderIndex ?? s.index)
        }))
        .filter((x: any) => Number.isFinite(x.id) && Number.isFinite(x.idx))
        .sort((a: any, b: any) => a.idx - b.idx);
      order = arr.map((x: any) => x.id);
    }
    if (!order.length) {
      return res.status(400).json({ data: null, message: 'Provide order as array of scope ids or scopes[{id, order_index}]', status: 'error' });
    }
    // Validate scopes belong to project
    const existingIds = await projectModel.getScopeIdsByProject(projectId);
    const invalid = order.filter((id: number) => !existingIds.includes(id));
    if (invalid.length) {
      return res.status(400).json({ data: { invalid }, message: 'order contains scope ids not in this project', status: 'error' });
    }
    await projectModel.setScopesOrder(projectId, order);
    return res.status(200).json({ data: { order }, message: 'Scopes reordered', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to reorder scopes', status: 'error' });
  }
};

/* ======= SCOPE ACTIVITIES ======= */

// GET /api/projects/:id/scopes/:scopeId/activities - Get activity history for a scope
export const getScopeActivityHistory = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope id', status: 'error' });
    }

    // Verify scope belongs to project
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ data: null, message: 'Scope not found for this project', status: 'error' });
    }

    const activities = await projectModel.getActivityHistory(scopeId, limit);

    return res.status(200).json({
      data: activities,
      message: `Retrieved ${activities.length} activity records`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch scope activity history', status: 'error' });
  }
};

// GET /api/projects/:id/scopes/:scopeId/activity-summary - Get activity summary for a scope
export const getScopeActivitySummary = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope id', status: 'error' });
    }

    // Verify scope belongs to project
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ data: null, message: 'Scope not found for this project', status: 'error' });
    }

    const summary = await projectModel.getActivitySummary(scopeId);

    return res.status(200).json({
      data: summary,
      message: 'Activity summary retrieved',
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch scope activity summary', status: 'error' });
  }
};

/* ======= ASSIGNMENTS ======= */

// GET /api/projects/:id/assignments - Get all assignments for a project
export const getProjectAssignments = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project id', status: 'error' });
    }
    const assignments = await projectModel.getAssignmentsByProjectId(projectId);

    // Restructure to nest assignee details
    const enriched = assignments.map((a: any) => ({
      actual_end_date: a.actual_end_date,
      actual_mandays: a.actual_mandays,
      actual_start_date: a.actual_start_date,
      assignee: {
        full_name: null, // Will be enriched from employee table if needed
        ramco_id: a.assignee
      },
      id: a.id,
      planned_end_date: a.planned_end_date,
      planned_start_date: a.planned_start_date,
      project_code: a.project_code,
      project_id: a.project_id,
      project_name: a.project_name,
      scope_id: a.scope_id,
      scope_progress: a.scope_progress,
      scope_status: a.scope_status,
      scope_title: a.scope_title
    }));

    return res.status(200).json({
      data: enriched,
      message: `${enriched.length} assignments retrieved`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch assignments', status: 'error' });
  }
};

// GET /api/assignments - Get all assignments across all projects
export const getAllAssignments = async (req: Request, res: Response) => {
  try {
    const assignments = await projectModel.getAllAssignments();

    // Get employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Restructure to nest assignee details
    const enriched = assignments.map((a: any) => {
      const emp = empMap.get(String(a.assignee));
      return {
        actual_end_date: a.actual_end_date,
        actual_mandays: a.actual_mandays,
        actual_start_date: a.actual_start_date,
        assignee: {
          full_name: emp ? (emp.full_name || emp.name || null) : null,
          ramco_id: a.assignee
        },
        id: a.id,
        planned_end_date: a.planned_end_date,
        planned_start_date: a.planned_start_date,
        project_code: a.project_code,
        project_due_date: a.project_due_date,
        project_id: a.project_id,
        project_name: a.project_name,
        project_start_date: a.project_start_date,
        scope_id: a.scope_id,
        scope_progress: a.scope_progress,
        scope_status: a.scope_status,
        scope_title: a.scope_title
      };
    });

    return res.status(200).json({
      data: enriched,
      message: `${enriched.length} assignments retrieved`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch assignments', status: 'error' });
  }
};

// GET /api/assignments/assignee/:assignee - Get assignments by assignee/developer
export const getAssignmentsByAssignee = async (req: Request, res: Response) => {
  try {
    const assignee = req.params.assignee as string;
    if (!assignee) {
      return res.status(400).json({ data: null, message: 'Assignee is required', status: 'error' });
    }
    const assignments = await projectModel.getAssignmentsByAssignee(assignee);

    // Get employee for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
    const emp = empMap.get(String(assignee));

    // Restructure to nest assignee details
    const enriched = assignments.map((a: any) => ({
      actual_end_date: a.actual_end_date,
      actual_mandays: a.actual_mandays,
      actual_start_date: a.actual_start_date,
      assignee: {
        full_name: emp ? (emp.full_name || emp.name || null) : null,
        ramco_id: a.assignee
      },
      id: a.id,
      planned_end_date: a.planned_end_date,
      planned_start_date: a.planned_start_date,
      project_code: a.project_code,
      project_due_date: a.project_due_date,
      project_id: a.project_id,
      project_name: a.project_name,
      project_start_date: a.project_start_date,
      scope_id: a.scope_id,
      scope_progress: a.scope_progress,
      scope_status: a.scope_status,
      scope_title: a.scope_title
    }));

    return res.status(200).json({
      data: enriched,
      message: `${enriched.length} assignments retrieved for ${assignee}`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch assignments', status: 'error' });
  }
};

// GET /api/assignments/workload - Get workload summary for all developers
export const getWorkloadSummary = async (req: Request, res: Response) => {
  try {
    const workload = await projectModel.getWorkloadSummary();

    // Get employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Helper function to calculate business days between two dates
    const calculateBusinessDays = (startDate: null | string, endDate: null | string): null | number => {
      if (!startDate || !endDate) return null;

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      if (end < start) return 0;

      let count = 0;
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      return count;
    };

    // Restructure to nest assignee details
    const enriched = workload.map((w: any) => {
      const emp = empMap.get(String(w.assignee));
      const actualDuration = calculateBusinessDays(w.earliest_start_date, w.latest_due_date);

      return {
        actual_duration_days: actualDuration, // Business days from earliest project start to latest project end
        assignee: {
          full_name: emp ? (emp.full_name || emp.name || null) : null,
          ramco_id: w.assignee
        },
        avg_progress: w.avg_progress ? Math.round(Number(w.avg_progress)) : null,
        completed_scopes: w.completed_scopes,
        in_progress_scopes: w.in_progress_scopes,
        not_started_scopes: w.not_started_scopes,
        total_projects: w.total_projects,
        total_scope_mandays: w.total_scope_mandays,
        total_scopes: w.total_scopes
      };
    });

    return res.status(200).json({
      data: enriched,
      message: `Workload summary for ${enriched.length} developers`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch workload summary', status: 'error' });
  }
};


/* ======= DEV CORE TASKS CRUD ======= */
// POST /api/projects/devcore-tasks - Create a new dev core task
export const createDevCoreTask = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const title = body.title;
    const description = body.description ?? null;
    const example = body.example ?? null;

    if (!title) {
      return res.status(400).json({ data: null, message: 'title is required', status: 'error' });
    }

    const id = await projectModel.createDevCoreTask({ description, example, title });
    return res.status(201).json({ data: { id }, message: 'Dev core task created', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create dev core task', status: 'error' });
  }
};

// GET /api/projects/devcore-tasks - Get all dev core tasks
export const getDevCoreTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await projectModel.getDevCoreTasks();
    return res.status(200).json({
      data: tasks,
      message: `Retrieved ${tasks.length} dev core tasks`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch dev core tasks', status: 'error' });
  }
};

// GET /api/projects/devcore-tasks/:id - Get a dev core task by ID
export const getDevCoreTaskById = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ data: null, message: 'Invalid task id', status: 'error' });

    const task = await projectModel.getDevCoreTaskById(taskId);
    if (!task) {
      return res.status(404).json({ data: null, message: 'Dev core task not found', status: 'error' });
    }

    return res.status(200).json({
      data: task,
      message: 'Dev core task retrieved',
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch dev core task', status: 'error' });
  }
};

// PUT /api/projects/devcore-tasks/:id - Update a dev core task by ID
export const updateDevCoreTask = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ data: null, message: 'Invalid task id', status: 'error' });

    const body = req.body || {};
    const updateData: Partial<projectModel.DevCoreTask> = {};
    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.example !== undefined) updateData.example = body.example ? String(body.example) : null;

    // ensure task exists
    const existing = await projectModel.getDevCoreTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Dev core task not found', status: 'error' });
    }

    await projectModel.updateDevCoreTask(taskId, updateData);
    return res.status(200).json({ data: null, message: 'Dev core task updated', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update dev core task', status: 'error' });
  }
};

// DELETE /api/projects/devcore-tasks/:id - Delete a dev core task by ID
export const deleteDevCoreTask = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ data: null, message: 'Invalid task id', status: 'error' });

    // ensure task exists
    const existing = await projectModel.getDevCoreTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Dev core task not found', status: 'error' });
    }

    await projectModel.deleteDevCoreTask(taskId);
    return res.status(200).json({ data: null, message: 'Dev core task deleted', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete dev core task', status: 'error' });
  }
};

/* ======= APP CORE FEATURES CRUD ======= */
// POST /api/projects/core-features - Create a new core feature
export const createCoreFeature = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const category = body.category;
    const feature_key = body.feature_key;
    const feature_name = body.feature_name;
    const description = body.description ?? null;
    const example_module = body.example_module ?? null;

    if (!category || !feature_key || !feature_name) {
      return res.status(400).json({ data: null, message: 'category, feature_key, and feature_name are required', status: 'error' });
    }

    const id = await projectModel.createCoreFeature({ category, description, example_module, feature_key, feature_name });
    return res.status(201).json({ data: { id }, message: 'Core feature created', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create core feature', status: 'error' });
  }
};

// GET /api/projects/core-features - Get all core features
export const getCoreFeatures = async (req: Request, res: Response) => {
  try {
    const features = await projectModel.getCoreFeatures();
    return res.status(200).json({
      data: features,
      message: `Retrieved ${features.length} core features`,
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch core features', status: 'error' });
  }
};

// GET /api/projects/core-features/:id - Get a core feature by ID
export const getCoreFeatureById = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ data: null, message: 'Invalid feature id', status: 'error' });

    const feature = await projectModel.getCoreFeatureById(featureId);
    if (!feature) {
      return res.status(404).json({ data: null, message: 'Core feature not found', status: 'error' });
    }

    return res.status(200).json({
      data: feature,
      message: 'Core feature retrieved',
      status: 'success'
    });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch core feature', status: 'error' });
  }
};

// PUT /api/projects/core-features/:id - Update a core feature by ID
export const updateCoreFeature = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ data: null, message: 'Invalid feature id', status: 'error' });

    const body = req.body || {};
    const updateData: Partial<projectModel.CoreFeature> = {};
    if (body.category !== undefined) updateData.category = String(body.category);
    if (body.feature_key !== undefined) updateData.feature_key = String(body.feature_key);
    if (body.feature_name !== undefined) updateData.feature_name = String(body.feature_name);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.example_module !== undefined) updateData.example_module = body.example_module ? String(body.example_module) : null;

    // ensure feature exists
    const existing = await projectModel.getCoreFeatureById(featureId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Core feature not found', status: 'error' });
    }

    await projectModel.updateCoreFeature(featureId, updateData);
    return res.status(200).json({ data: null, message: 'Core feature updated', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update core feature', status: 'error' });
  }
};

// DELETE /api/projects/core-features/:id - Delete a core feature by ID
export const deleteCoreFeature = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ data: null, message: 'Invalid feature id', status: 'error' });

    // ensure feature exists
    const existing = await projectModel.getCoreFeatureById(featureId);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Core feature not found', status: 'error' });
    }

    await projectModel.deleteCoreFeature(featureId);
    return res.status(200).json({ data: null, message: 'Core feature deleted', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete core feature', status: 'error' });
  }
};

/* ======= CHECKLISTS ======= */

export const getChecklists = async (req: Request, res: Response) => {
  try {
    const checklists = await projectModel.getChecklists();
    return res.json({ data: checklists, message: 'Checklists retrieved', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch checklists', status: 'error' });
  }
};

export const getChecklistById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist ID', status: 'error' });
    }

    const checklist = await projectModel.getChecklistById(id);
    if (!checklist) {
      return res.status(404).json({ data: null, message: 'Checklist not found', status: 'error' });
    }

    return res.json({ data: checklist, message: 'Checklist retrieved', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch checklist', status: 'error' });
  }
};

export const createChecklist = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ data: null, message: 'Checklist name is required', status: 'error' });
    }

    const id = await projectModel.createChecklist(name.trim());
    const checklist = await projectModel.getChecklistById(id);

    return res.status(201).json({ data: checklist, message: 'Checklist created successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create checklist', status: 'error' });
  }
};

export const updateChecklist = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist ID', status: 'error' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ data: null, message: 'Checklist name is required', status: 'error' });
    }

    const existing = await projectModel.getChecklistById(id);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Checklist not found', status: 'error' });
    }

    await projectModel.updateChecklist(id, name.trim());
    const updated = await projectModel.getChecklistById(id);

    return res.json({ data: updated, message: 'Checklist updated successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update checklist', status: 'error' });
  }
};

export const deleteChecklist = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist ID', status: 'error' });
    }

    const existing = await projectModel.getChecklistById(id);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Checklist not found', status: 'error' });
    }

    await projectModel.deleteChecklist(id);
    return res.json({ data: null, message: 'Checklist deleted successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete checklist', status: 'error' });
  }
};

export const getScopeChecklists = async (req: Request, res: Response) => {
  try {
    const scopeId = Number(req.params.scopeId);

    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope ID', status: 'error' });
    }

    const checklists = await projectModel.getScopeChecklistsByScope(scopeId);
    return res.json({ data: checklists, message: 'Scope checklists retrieved', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch scope checklists', status: 'error' });
  }
};

export const getProjectChecklists = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project ID', status: 'error' });
    }

    const checklists = await projectModel.getScopeChecklistsByProject(projectId);
    return res.json({ data: checklists, message: 'Project checklists retrieved', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch project checklists', status: 'error' });
  }
};

export const getScopeChecklistMapById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist mapping ID', status: 'error' });
    }

    const mapping = await projectModel.getScopeChecklistMapById(id);
    if (!mapping) {
      return res.status(404).json({ data: null, message: 'Checklist mapping not found', status: 'error' });
    }

    return res.json({ data: mapping, message: 'Checklist mapping retrieved', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to fetch checklist mapping', status: 'error' });
  }
};

export const createScopeChecklistMap = async (req: Request, res: Response) => {
  try {
    const { project_id, scope_id, checklist_id, remarks, status, created_by } = req.body;

    if (!Number.isFinite(project_id) || project_id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid project ID', status: 'error' });
    }
    if (!Number.isFinite(scope_id) || scope_id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid scope ID', status: 'error' });
    }
    if (!Number.isFinite(checklist_id) || checklist_id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist ID', status: 'error' });
    }

    const id = await projectModel.createScopeChecklistMap({
      checklist_id,
      created_by: created_by || null,
      project_id,
      remarks: remarks || null,
      scope_id,
      status: status || null
    });

    const mapping = await projectModel.getScopeChecklistMapById(id);
    return res.status(201).json({ data: mapping, message: 'Checklist mapping created successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to create checklist mapping', status: 'error' });
  }
};

export const updateScopeChecklistMap = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { remarks, status } = req.body;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist mapping ID', status: 'error' });
    }

    const existing = await projectModel.getScopeChecklistMapById(id);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Checklist mapping not found', status: 'error' });
    }

    await projectModel.updateScopeChecklistMap(id, {
      remarks: remarks !== undefined ? remarks : undefined,
      status: status !== undefined ? status : undefined
    });

    const updated = await projectModel.getScopeChecklistMapById(id);
    return res.json({ data: updated, message: 'Checklist mapping updated successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to update checklist mapping', status: 'error' });
  }
};

export const deleteScopeChecklistMap = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ data: null, message: 'Invalid checklist mapping ID', status: 'error' });
    }

    const existing = await projectModel.getScopeChecklistMapById(id);
    if (!existing) {
      return res.status(404).json({ data: null, message: 'Checklist mapping not found', status: 'error' });
    }

    await projectModel.deleteScopeChecklistMap(id);
    return res.json({ data: null, message: 'Checklist mapping deleted successfully', status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ data: null, message: e?.message || 'Failed to delete checklist mapping', status: 'error' });
  }
};
