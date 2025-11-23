import { Request, Response } from 'express';
import * as projectModel from './projectModel';
import { buildStoragePath, safeMove, sanitizeFilename, toDbPath } from '../utils/uploadUtil';
import * as assetModel from '../p.asset/assetModel';
import path from 'path';


/* ======= PROJECTS ======= */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await projectModel.getProjects();

    // Fetch employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Enrich each project with assignments summary
    const enrichedProjects = await Promise.all(
      projects.map(async (project: any) => {
        const scopes = await projectModel.getScopeByProjectId(project.id);

        // Calculate assignments summary grouped by assignee
        const assignmentsMap = new Map<string, { assignee: { ramco_id: string; full_name: string | null }; planned_mandays: number; actual_mandays: number; scope_count: number }>();

        for (const scope of scopes) {
          const assigneeId = scope.assignee || 'unassigned';
          const plannedMandays = Number(scope.planned_mandays) || 0;
          const actualMandays = Number(scope.actual_mandays) || 0;

          if (!assignmentsMap.has(assigneeId)) {
            const emp = empMap.get(assigneeId);
            assignmentsMap.set(assigneeId, {
              assignee: {
                ramco_id: assigneeId,
                full_name: emp ? (emp.full_name || emp.name || null) : null
              },
              planned_mandays: 0,
              actual_mandays: 0,
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
          assignments
        };
      })
    );

    return res.status(200).json({ status: 'success', message: `${enrichedProjects.length} Projects retrieved`, data: enrichedProjects });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch projects', data: null });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
    }
    const scopes = await projectModel.getScopeByProjectId(projectId);

    // Fetch employees for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    // Calculate assignments summary grouped by assignee
    const assignmentsMap = new Map<string, { assignee: { ramco_id: string; full_name: string | null }; planned_mandays: number; actual_mandays: number; scope_count: number }>();

    for (const scope of scopes) {
      const assigneeId = scope.assignee || 'unassigned';
      const plannedMandays = Number(scope.planned_mandays) || 0;
      const actualMandays = Number(scope.actual_mandays) || 0;

      if (!assignmentsMap.has(assigneeId)) {
        const emp = empMap.get(assigneeId);
        assignmentsMap.set(assigneeId, {
          assignee: {
            ramco_id: assigneeId,
            full_name: emp ? (emp.full_name || emp.name || null) : null
          },
          planned_mandays: 0,
          actual_mandays: 0,
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

    const { percent_complete, overall_progress, ...rest } = project as any;
    const progress = (overall_progress !== undefined && overall_progress !== null) ? overall_progress : percent_complete;
    return res.status(200).json({
      status: 'success',
      message: 'Project retrieved',
      data: {
        ...rest,
        overall_progress: progress,
        assignments,
        scopes
      }
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch project', data: null });
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
      return res.status(400).json({ status: 'error', message: 'code and name are required', data: null });
    }

    // Compute derived project fields from scopes if not provided
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;
    const minDate = (dates: (string | null)[]) => dates.filter(Boolean).sort()[0] || null;
    const maxDate = (dates: (string | null)[]) => dates.filter(Boolean).sort().slice(-1)[0] || null;
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
    const assignment_type = ['task', 'support', 'project'].includes(String(assignmentType)) ? String(assignmentType) as projectModel.AssignmentType : 'project';

    const projId = await projectModel.createProject({ code, name, description, assignment_type, status: 'in_progress', start_date, due_date, percent_complete, priority });

    // Helper: count business days (Mon-Fri) inclusive
    function businessDaysInclusive(startStr: string | null, endStr: string | null): number | null {
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
      const m = field.match(/scopes\[(\d+)\][.\[]attachments\]?/i) || field.match(/^attachments_(\d+)$/i) || field.match(/^attachment_(\d+)$/i);
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
        project_id: projId,
        title: s.title,
        task_groups: (s.taskGroups ?? s.task_groups) ?? null,
        description: s.description ?? null,
        assignee: s.assignee ?? null,
        planned_start_date,
        planned_end_date,
        planned_mandays: planned_mandays as any,
        attachment,
        progress: Number.isFinite(Number(s.progress)) ? Number(s.progress) : null,
        status: s.status ?? null,
        actual_start_date,
        actual_end_date,
        actual_mandays: actual_mandays as any
      };
      const scopeId = await projectModel.createScope(scopePayload);
      createdScopes.push({ id: scopeId, ...scopePayload });
    }

    // Link tags, if provided
    if (projectTags && projectTags.length) {
      await projectModel.setProjectTags(projId, projectTags);
    }

    return res.status(201).json({ status: 'success', message: 'Project created', data: { id: projId, start_date, due_date, overall_progress: percent_complete, priority: priority ?? null, tags: projectTags, scopes: createdScopes } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to create project', data: null });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
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
      return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
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

    return res.status(200).json({ status: 'success', message: 'Project updated', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to update project', data: null });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });

    // ensure project exists because deleteProject returns void
    const existing = await projectModel.getProjectById(projectId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
    }

    await projectModel.deleteProject(projectId);
    return res.status(200).json({ status: 'success', message: 'Project deleted', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to delete project', data: null });
  }
};

// POST /api/projects/:id/scopes - Create a single new scope for a project (with optional attachments)
export const addScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    const project = await projectModel.getProjectById(projectId);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found', data: null });

    const body = req.body || {};
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;
    const planned_start_date = parseDate(body.planned_start_date ?? body.plannedStartDate);
    const planned_end_date = parseDate(body.planned_end_date ?? body.plannedEndDate);
    const actual_start_date = parseDate(body.actual_start_date ?? body.actualStartDate);
    const actual_end_date = parseDate(body.actual_end_date ?? body.actualEndDate);

    function businessDaysInclusive(startStr: string | null, endStr: string | null): number | null {
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
        const originalAbs = (file as any).path;
        const baseName = sanitizeFilename((file as any).originalname || 'file');
        const finalName = `${projectId}-${baseName}`;
        const destAbs = await buildStoragePath(`project/${tagFolder}`, finalName);
        await safeMove(originalAbs, destAbs);
        const dbPath = toDbPath(`project/${tagFolder}`, finalName);
        dbPaths.push(dbPath);
      } catch { /* ignore single-file errors */ }
    }
    const attachment = dbPaths.length ? dbPaths.join(',') : null;

    const scopePayload: projectModel.NewScope = {
      project_id: projectId,
      title: body.title,
      task_groups: (body.task_groups ?? body.taskGroups) ?? null,
      description: body.description ?? null,
      assignee: body.assignee ?? null,
      planned_start_date,
      planned_end_date,
      planned_mandays: planned_mandays as any,
      attachment,
      progress: Number.isFinite(Number(body.progress)) ? Number(body.progress) : null,
      status: body.status ?? null,
      actual_start_date,
      actual_end_date,
      actual_mandays: actual_mandays as any,
      order_index: Number.isFinite(Number(body.order_index)) ? Number(body.order_index) : undefined
    };

    const id = await projectModel.createScope(scopePayload);
    // Maintain assignment row for assignee/actual_mandays
    if (scopePayload.assignee !== null || scopePayload.actual_mandays !== null) {
      await projectModel.upsertAssignment({
        project_id: projectId,
        scope_id: id,
        assignee: scopePayload.assignee ?? null,
        actual_mandays: scopePayload.actual_mandays ?? null
      });
    }
    return res.status(201).json({ status: 'success', message: 'Scope created', data: { id, ...scopePayload } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to create scope', data: null });
  }
};

// DELETE /api/projects/:id/scopes/:scopeId - Remove a scope ensuring it belongs to the project
export const removeScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid scope id', data: null });
    }
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ status: 'error', message: 'Scope not found for this project', data: null });
    }
    await projectModel.deleteScope(scopeId);
    // Also remove assignment data for this project/scope
    await projectModel.deleteAssignmentByProjectScope(projectId, scopeId);
    return res.status(200).json({ status: 'success', message: 'Scope deleted', data: { id: scopeId } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to delete scope', data: null });
  }
};

// PUT /api/projects/:id/scopes/:scopeId - Update a single scope (fields and attachments)
export const updateScope = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const scopeId = Number(req.params.scopeId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    if (!Number.isFinite(scopeId) || scopeId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid scope id', data: null });
    }
    const scope = await projectModel.getScopeById(scopeId);
    if (!scope || Number(scope.project_id) !== projectId) {
      return res.status(404).json({ status: 'error', message: 'Scope not found for this project', data: null });
    }

    const body = req.body || {};
    const parseDate = (s: any) => (typeof s === 'string' && s.trim() !== '') ? s.trim().slice(0, 10) : null;

    // Compute mandays if not explicitly provided
    function businessDaysInclusive(startStr: string | null, endStr: string | null): number | null {
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
        const originalAbs = (file as any).path;
        const baseName = sanitizeFilename((file as any).originalname || 'file');
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
    // Maintain assignment row when assignee or actual_mandays potentially changed
    if (updates.assignee !== undefined || updates.actual_mandays !== undefined) {
      await projectModel.upsertAssignment({
        project_id: projectId,
        scope_id: scopeId,
        assignee: (updates.assignee !== undefined ? updates.assignee : scope.assignee) ?? null,
        actual_mandays: (updates.actual_mandays !== undefined ? updates.actual_mandays : scope.actual_mandays) ?? null
      });
    }

    // Update overall_progress on T_PROJECT table if provided
    if (overallProgress !== undefined && Number.isFinite(Number(overallProgress))) {
      await projectModel.updateProject(projectId, { overall_progress: Number(overallProgress) });
    }

    return res.status(200).json({ status: 'success', message: 'Scope updated', data: { id: scopeId } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to update scope', data: null });
  }
};

// PUT /api/projects/:id/scopes/reorder - Set ordering for scopes by IDs array
export const reorderScopes = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    // Accept two payload shapes:
    // 1) { order: [scopeId1, scopeId2, ...] }
    // 2) { scopes: [{ id, order_index }, ...] }
    let order: number[] = [];
    if (Array.isArray((req.body as any)?.order)) {
      order = (req.body as any).order
        .map((x: any) => Number(x))
        .filter((n: any) => Number.isFinite(n));
    } else if (Array.isArray((req.body as any)?.scopes)) {
      const arr = (req.body as any).scopes
        .map((s: any) => ({
          id: Number(s.id ?? s.scope_id ?? s.scopeId),
          idx: Number(s.order_index ?? s.orderIndex ?? s.index)
        }))
        .filter((x: any) => Number.isFinite(x.id) && Number.isFinite(x.idx))
        .sort((a: any, b: any) => a.idx - b.idx);
      order = arr.map((x: any) => x.id);
    }
    if (!order.length) {
      return res.status(400).json({ status: 'error', message: 'Provide order as array of scope ids or scopes[{id, order_index}]', data: null });
    }
    // Validate scopes belong to project
    const existingIds = await projectModel.getScopeIdsByProject(projectId);
    const invalid = order.filter((id: number) => !existingIds.includes(id));
    if (invalid.length) {
      return res.status(400).json({ status: 'error', message: 'order contains scope ids not in this project', data: { invalid } });
    }
    await projectModel.setScopesOrder(projectId, order);
    return res.status(200).json({ status: 'success', message: 'Scopes reordered', data: { order } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to reorder scopes', data: null });
  }
};


/* ======= ASSIGNMENTS ======= */

// GET /api/projects/:id/assignments - Get all assignments for a project
export const getProjectAssignments = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid project id', data: null });
    }
    const assignments = await projectModel.getAssignmentsByProjectId(projectId);

    // Restructure to nest assignee details
    const enriched = assignments.map((a: any) => ({
      id: a.id,
      project_id: a.project_id,
      scope_id: a.scope_id,
      assignee: {
        ramco_id: a.assignee,
        full_name: null // Will be enriched from employee table if needed
      },
      actual_mandays: a.actual_mandays,
      scope_title: a.scope_title,
      scope_status: a.scope_status,
      scope_progress: a.scope_progress,
      planned_start_date: a.planned_start_date,
      planned_end_date: a.planned_end_date,
      actual_start_date: a.actual_start_date,
      actual_end_date: a.actual_end_date,
      project_code: a.project_code,
      project_name: a.project_name
    }));

    return res.status(200).json({
      status: 'success',
      message: `${enriched.length} assignments retrieved`,
      data: enriched
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch assignments', data: null });
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
        id: a.id,
        project_id: a.project_id,
        scope_id: a.scope_id,
        assignee: {
          ramco_id: a.assignee,
          full_name: emp ? (emp.full_name || emp.name || null) : null
        },
        actual_mandays: a.actual_mandays,
        scope_title: a.scope_title,
        scope_status: a.scope_status,
        scope_progress: a.scope_progress,
        planned_start_date: a.planned_start_date,
        planned_end_date: a.planned_end_date,
        actual_start_date: a.actual_start_date,
        actual_end_date: a.actual_end_date,
        project_code: a.project_code,
        project_name: a.project_name,
        project_start_date: a.project_start_date,
        project_due_date: a.project_due_date
      };
    });

    return res.status(200).json({
      status: 'success',
      message: `${enriched.length} assignments retrieved`,
      data: enriched
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch assignments', data: null });
  }
};

// GET /api/assignments/assignee/:assignee - Get assignments by assignee/developer
export const getAssignmentsByAssignee = async (req: Request, res: Response) => {
  try {
    const assignee = req.params.assignee;
    if (!assignee) {
      return res.status(400).json({ status: 'error', message: 'Assignee is required', data: null });
    }
    const assignments = await projectModel.getAssignmentsByAssignee(assignee);

    // Get employee for enrichment
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
    const emp = empMap.get(String(assignee));

    // Restructure to nest assignee details
    const enriched = assignments.map((a: any) => ({
      id: a.id,
      project_id: a.project_id,
      scope_id: a.scope_id,
      assignee: {
        ramco_id: a.assignee,
        full_name: emp ? (emp.full_name || emp.name || null) : null
      },
      actual_mandays: a.actual_mandays,
      scope_title: a.scope_title,
      scope_status: a.scope_status,
      scope_progress: a.scope_progress,
      planned_start_date: a.planned_start_date,
      planned_end_date: a.planned_end_date,
      actual_start_date: a.actual_start_date,
      actual_end_date: a.actual_end_date,
      project_code: a.project_code,
      project_name: a.project_name,
      project_start_date: a.project_start_date,
      project_due_date: a.project_due_date
    }));

    return res.status(200).json({
      status: 'success',
      message: `${enriched.length} assignments retrieved for ${assignee}`,
      data: enriched
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch assignments', data: null });
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
    const calculateBusinessDays = (startDate: string | null, endDate: string | null): number | null => {
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
        assignee: {
          ramco_id: w.assignee,
          full_name: emp ? (emp.full_name || emp.name || null) : null
        },
        total_projects: w.total_projects,
        total_scopes: w.total_scopes,
        total_scope_mandays: w.total_scope_mandays,
        actual_duration_days: actualDuration, // Business days from earliest project start to latest project end
        completed_scopes: w.completed_scopes,
        in_progress_scopes: w.in_progress_scopes,
        not_started_scopes: w.not_started_scopes,
        avg_progress: w.avg_progress ? Math.round(Number(w.avg_progress)) : null
      };
    });

    return res.status(200).json({
      status: 'success',
      message: `Workload summary for ${enriched.length} developers`,
      data: enriched
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch workload summary', data: null });
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
      return res.status(400).json({ status: 'error', message: 'title is required', data: null });
    }

    const id = await projectModel.createDevCoreTask({ title, description, example });
    return res.status(201).json({ status: 'success', message: 'Dev core task created', data: { id } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to create dev core task', data: null });
  }
};

// GET /api/projects/devcore-tasks - Get all dev core tasks
export const getDevCoreTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await projectModel.getDevCoreTasks();
    return res.status(200).json({
      status: 'success',
      message: `Retrieved ${tasks.length} dev core tasks`,
      data: tasks
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch dev core tasks', data: null });
  }
};

// GET /api/projects/devcore-tasks/:id - Get a dev core task by ID
export const getDevCoreTaskById = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ status: 'error', message: 'Invalid task id', data: null });

    const task = await projectModel.getDevCoreTaskById(taskId);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Dev core task not found', data: null });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Dev core task retrieved',
      data: task
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch dev core task', data: null });
  }
};

// PUT /api/projects/devcore-tasks/:id - Update a dev core task by ID
export const updateDevCoreTask = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ status: 'error', message: 'Invalid task id', data: null });

    const body = req.body || {};
    const updateData: Partial<projectModel.DevCoreTask> = {};
    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.description !== undefined) updateData.description = body.description ? String(body.description) : null;
    if (body.example !== undefined) updateData.example = body.example ? String(body.example) : null;

    // ensure task exists
    const existing = await projectModel.getDevCoreTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Dev core task not found', data: null });
    }

    await projectModel.updateDevCoreTask(taskId, updateData);
    return res.status(200).json({ status: 'success', message: 'Dev core task updated', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to update dev core task', data: null });
  }
};

// DELETE /api/projects/devcore-tasks/:id - Delete a dev core task by ID
export const deleteDevCoreTask = async (req: Request, res: Response) => {
  try {
    const taskId = Number(req.params.id);
    if (!taskId) return res.status(400).json({ status: 'error', message: 'Invalid task id', data: null });

    // ensure task exists
    const existing = await projectModel.getDevCoreTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Dev core task not found', data: null });
    }

    await projectModel.deleteDevCoreTask(taskId);
    return res.status(200).json({ status: 'success', message: 'Dev core task deleted', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to delete dev core task', data: null });
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
      return res.status(400).json({ status: 'error', message: 'category, feature_key, and feature_name are required', data: null });
    }

    const id = await projectModel.createCoreFeature({ category, feature_key, feature_name, description, example_module });
    return res.status(201).json({ status: 'success', message: 'Core feature created', data: { id } });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to create core feature', data: null });
  }
};

// GET /api/projects/core-features - Get all core features
export const getCoreFeatures = async (req: Request, res: Response) => {
  try {
    const features = await projectModel.getCoreFeatures();
    return res.status(200).json({
      status: 'success',
      message: `Retrieved ${features.length} core features`,
      data: features
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch core features', data: null });
  }
};

// GET /api/projects/core-features/:id - Get a core feature by ID
export const getCoreFeatureById = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ status: 'error', message: 'Invalid feature id', data: null });

    const feature = await projectModel.getCoreFeatureById(featureId);
    if (!feature) {
      return res.status(404).json({ status: 'error', message: 'Core feature not found', data: null });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Core feature retrieved',
      data: feature
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to fetch core feature', data: null });
  }
};

// PUT /api/projects/core-features/:id - Update a core feature by ID
export const updateCoreFeature = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ status: 'error', message: 'Invalid feature id', data: null });

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
      return res.status(404).json({ status: 'error', message: 'Core feature not found', data: null });
    }

    await projectModel.updateCoreFeature(featureId, updateData);
    return res.status(200).json({ status: 'success', message: 'Core feature updated', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to update core feature', data: null });
  }
};

// DELETE /api/projects/core-features/:id - Delete a core feature by ID
export const deleteCoreFeature = async (req: Request, res: Response) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId) return res.status(400).json({ status: 'error', message: 'Invalid feature id', data: null });

    // ensure feature exists
    const existing = await projectModel.getCoreFeatureById(featureId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Core feature not found', data: null });
    }

    await projectModel.deleteCoreFeature(featureId);
    return res.status(200).json({ status: 'success', message: 'Core feature deleted', data: null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to delete core feature', data: null });
  }
};
