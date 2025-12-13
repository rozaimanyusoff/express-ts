import crypto from 'crypto';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';

import * as logModel from '../p.admin/logModel';
import * as assetModel from '../p.asset/assetModel';
import * as groupModel from '../p.group/groupModel';
import * as roleModel from '../p.role/roleModel';
import * as pendingUserModel from '../p.user/pendingUserModel';
import {pool} from '../utils/db';
import logger from '../utils/logger';
import { sendMail } from '../utils/mailer';
import { buildStoragePath, sanitizeFilename, toDbPath } from '../utils/uploadUtil';
import * as userModel from './userModel';

dotenv.config({ path: '.env.local' });

// ===== Interfaces =====

interface AdminUser {
  activated_at: Date;
  created_at: Date;
  email: string;
  fname: string;
  group: number;
  last_nav: string;
  password: string;
  role: number;
  status: number;
  user_type: number;
  username: string;
}

interface AssignGroupsRequest extends Request {
  body: {
    groups: number[];
    userId: number;
  };
}

interface Users {
  activated_at: Date | null;
  activation_code: null | string;
  contact: string;
  created_at: Date;
  email: string;
  fname: string;
  id: number;
  last_host: null | string;
  last_ip: null | string;
  last_login: Date | null;
  last_nav: null | string;
  last_os: null | string;
  password: string;
  reset_token: null | string;
  role: number;
  status: number;
  user_type: number;
  usergroups: null | string; // Updated field to store comma-separated group IDs
  username: string;
}

// Get all users
async function getUserTimeSpent(userId: number): Promise<number> {
  // Sum all (logout - login) pairs for the user
  const [rows]: any[] = await pool.query(`
    SELECT action, created_at
    FROM logs_auth
    WHERE user_id = ? AND (action = 'login' OR action = 'logout')
    ORDER BY created_at ASC
  `, [userId]);
  let total = 0;
  let lastLogin: Date | null = null;
  for (const row of rows) {
    if (row.action === 'login') {
      // Only set lastLogin if not already set (ignore consecutive logins)
      if (!lastLogin) {
        lastLogin = new Date(row.created_at);
      }
    } else if (row.action === 'logout' && lastLogin) {
      const logoutTime = new Date(row.created_at);
      total += (logoutTime.getTime() - lastLogin.getTime()) / 1000; // seconds
      lastLogin = null;
    }
  }
  // If still logged in, add time from last login to now
  if (lastLogin) {
    total += (Date.now() - lastLogin.getTime()) / 1000;
  }
  return Math.round(total);
}

export const getAllUser = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await userModel.getAllUsers();
    const userIds = users.map(u => u.id);

    // Batch fetch roles, groups, and time spent
    const [roles, groups, timeSpentRows] = await Promise.all([
      roleModel.getAllRoles(),
      groupModel.getAllGroups(),
      (await import('../p.admin/logModel.js')).getTimeSpentByUsers(userIds)
    ]);

    const rolesMap = new Map<number, { id: number; name: string }>(
      roles.map((r: any) => [Number(r.id), { id: Number(r.id), name: r.name }])
    );
    const groupsMap = new Map<number, { id: number; name: string }>(
      groups.map((g: any) => [Number(g.id), { id: Number(g.id), name: g.name }])
    );
    const timeMap = new Map<number, number>(
      (timeSpentRows || []).map((t: any) => [Number(t.user_id), Number(t.time_spent || 0)])
    );

    const formattedUsers = users.map((user) => {
      const roleObj = user.role ? (rolesMap.get(Number(user.role)) || null) : null;
      let usergroupsArr: any[] = [];
      if (user.usergroups) {
        const groupIds = String(user.usergroups).split(',').map(Number).filter(Boolean);
        usergroupsArr = groupIds
          .map((gid) => groupsMap.get(gid) || null)
          .filter(Boolean) as any[];
      }
      const time_spent = timeMap.get(user.id) ?? 0;
      return {
        ...user,
        role: roleObj,
        time_spent,
        usergroups: usergroupsArr
      };
    });

    return res.status(200).json({ data: formattedUsers, message: 'User data retrieved successfully', status: 'success' });
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ message: 'Error getting all users' });
  }
};

// New: Get all pending users
export const getAllPendingUser = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const pendingUsers = await pendingUserModel.getAllPendingUsers();
    return res.status(200).json({ data: pendingUsers, message: 'Pending user data retrieved successfully', status: 'success' });
  } catch (error: any) {
    console.error('Error getting all pending users:', error);
    return res.status(500).json({ message: 'Error getting all pending users' });
  }
};

// Update user and assign groups
export const updateUser1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { email, fname, last_nav, role, status, user_type, usergroups } = req.body;

  try {
    // Validate user ID
    const userId = Number(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // If avatar file provided (multipart/form-data with field 'avatar'), handle avatar upload first
    const file = (req as any).file as Express.Multer.File | undefined;
    // Optional contact update (can be 'null' string from multipart)
    const contactRaw = (req.body && Object.prototype.hasOwnProperty.call(req.body, 'contact')) ? req.body.contact : undefined;
    const contact = contactRaw === undefined ? undefined : (contactRaw === null || String(contactRaw).toLowerCase() === 'null' || String(contactRaw).trim() === '' ? null : String(contactRaw));

    if (file) {
      // Only allow common image uploads
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const original = file.originalname || 'avatar.png';
      const safeName = sanitizeFilename(original);
      const ext = path.extname(safeName).toLowerCase();
      if (!allowed.includes(ext)) {
        return res.status(400).json({ message: 'Unsupported avatar file type', status: 'error' });
      }
      const filename = `${userId}-${safeName}`; // <id-filename>
      const destAbs = await buildStoragePath('profile/avatar', filename);
      await fsPromises.mkdir(path.dirname(destAbs), { recursive: true });
      await fsPromises.writeFile(destAbs, file.buffer);
      const storedRel = toDbPath('profile/avatar', filename); // e.g., uploads/profile/avatar/<id-filename>

      await userModel.updateUserAvatar(userId, storedRel, contact);
      return res.status(200).json({ data: { avatar: storedRel, id: userId }, message: 'User avatar updated', status: 'success' });
    }

    // If only contact provided (no file), allow updating contact alone via the same endpoint
    if (contact !== undefined) {
      await userModel.updateUserAvatar(userId, undefined, contact);
      return res.status(200).json({ data: { contact, id: userId }, message: 'User contact updated', status: 'success' });
    }

    // Flexible partial update for basic fields when no avatar/contact change provided
    const baseUpdate: any = {};
    if (user_type !== undefined) baseUpdate.user_type = user_type;
    if (role !== undefined) baseUpdate.role = role;
    if (status !== undefined) baseUpdate.status = status;
    if (fname !== undefined) baseUpdate.fname = fname;
    if (email !== undefined) baseUpdate.email = email;
    if (last_nav !== undefined) baseUpdate.last_nav = last_nav;
    if (Object.keys(baseUpdate).length > 0) {
      await userModel.updateUserFields(userId, baseUpdate);
    }

    // Assign user to groups only if provided
    if (Array.isArray(usergroups)) {
      await userModel.assignUserToGroups(userId, usergroups);
    }

    return res.status(200).json({ message: 'User updated successfully', status: 'success' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: error.message, message: 'Error updating user' });
  }
};

// Assign user to groups directly
export const assignUserToGroups1 = async (
  req: AssignGroupsRequest,
  res: Response
): Promise<Response> => {
  const { groups, userId } = req.body;

  if (!userId || !Array.isArray(groups)) {
    return res.status(400).json({ message: 'Invalid input', status: 'Error' });
  }

  try {
    await userModel.assignUserToGroups(userId, groups);
    return res
      .status(200)
      .json({ message: 'User assigned to groups successfully', status: 'Success' });
  } catch (error: any) {
    console.error('Error assigning user to groups:', error);
    return res
      .status(500)
      .json({ error: error.message, message: 'Error assigning user to groups', status: 'Error' });
  }
};

// Change groups for multiple users
export const changeUsersGroups = async (req: Request, res: Response): Promise<Response> => {
  const { groupIds, userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || !Array.isArray(groupIds) || groupIds.length === 0) {
    return res.status(400).json({ message: 'userIds and groupIds must be non-empty arrays', status: 'Error' });
  }
  try {
    for (const userId of userIds) {
      await userModel.assignUserToGroups(userId, groupIds);
    }
    return res.status(200).json({ message: 'Groups updated for selected users', status: 'Success' });
  } catch (error: any) {
    console.error('Error changing users groups:', error);
    return res.status(500).json({ error: error.message, message: 'Error changing users groups', status: 'Error' });
  }
};

// Change role for multiple users
export const changeUsersRole = async (req: Request, res: Response): Promise<Response> => {
  const { roleId, userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || typeof roleId !== 'number') {
    return res.status(400).json({ message: 'userIds must be a non-empty array and roleId must be a number', status: 'Error' });
  }
  try {
    for (const userId of userIds) {
      await userModel.updateUserRole(userId, roleId);
    }
    return res.status(200).json({ message: 'Role updated for selected users', status: 'Success' });
  } catch (error: any) {
    console.error('Error changing users role:', error);
    return res.status(500).json({ error: error.message, message: 'Error changing users role' });
  }
};

// Suspend or activate multiple users
export const suspendOrActivateUsers = async (req: Request, res: Response): Promise<Response> => {
  const { status, user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0 || typeof status !== 'number') {
    return res.status(400).json({ message: 'user_ids must be a non-empty array and status must be a number', status: 'Error' });
  }
  try {
    for (const userId of user_ids) {
      await userModel.updateUser(userId, { status } as any);
    }
    return res.status(200).json({ message: 'Status updated for selected users', status: 'Success' });
  } catch (error: any) {
    console.error('Error updating users status:', error);
    return res.status(500).json({ error: error.message, message: 'Error updating users status', status: 'Error' });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;

  try {
    const { message, success, user } = await userModel.verifyLoginCredentials(emailOrUsername, password);

    if (!success) {
      return res.status(401).json({ message, success: false });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        usergroups: user?.usergroups || '', // Ensure usergroups is always a string
      },
    });
  } catch (error: any) {
    console.error('Error logging in user:', error);
    return res.status(500).json({ error: error.message, message: 'Error logging in user' });
  }
};

// Admin: Reset password for multiple users
export const adminResetPasswords = async (req: Request, res: Response): Promise<Response> => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'user_ids must be a non-empty array' });
  }

  // Get frontend URL from env and sanitize (reuse logic from authController)
  let sanitizedFrontendUrl;
  try {
    sanitizedFrontendUrl = (process.env.FRONTEND_URL ?? '').replace(/([^:]\/\/)+/g, '$1');
    new URL(sanitizedFrontendUrl);
  } catch (error) {
    logger.error('Invalid FRONTEND_URL in environment variables:', error);
    return res.status(500).json({ message: 'Invalid FRONTEND_URL in environment variables' });
  }

  // Fetch user info for all user_ids
  try {
    const [users]: any[] = await pool.query('SELECT * FROM users WHERE id IN (?)', [user_ids]);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found for the provided IDs' });
    }

    const results = [];
    for (const user of users) {
      try {
        const email = user.email;
        const contact = user.contact;
        const name = user.fname || user.name || user.username || 'User';
        const payload = {
          c: contact ? contact.slice(-4) : '',
          e: email.split('@')[0],
          x: Date.now() + (60 * 60 * 1000)
        };
        const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
        const randomBytes = crypto.randomBytes(4).toString('hex');
        const resetToken = `${tokenString}-${randomBytes}`;
        await userModel.updateUserResetTokenAndStatus(user.id, resetToken, 3);
        const html = `
          <h1>Reset Password</h1>
          <p>Hello ${name},</p>
          <p>Please reset your password by clicking the link below:</p>
          <a href="${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>Thank you!</p>
        `;
        await sendMail(email, 'Reset Password', html);
        results.push({ email, status: 'sent', user_id: user.id });
      } catch (err) {
        logger.error('Error sending reset email for user', user.id, err);
        results.push({ email: user.email, error: (err instanceof Error ? err.message : JSON.stringify(err)), status: 'error', user_id: user.id });
      }
    }
    return res.status(200).json({ message: 'Reset password emails processed', results });
  } catch (error) {
    logger.error('Admin reset password error:', error);
    return res.status(500).json({ message: 'Error processing admin reset password request' });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<Response> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Accept all possible fields from frontend
  const { dob, email, job, location, name, phone } = req.body;
  // If file is uploaded, use req.file.buffer
  let profileImage = undefined;
  if ((req as any).file?.buffer) {
    profileImage = (req as any).file.buffer;
  }
  try {
    // Update users table for fname, email, contact
    if (name || email || phone) {
      const updateFields: any = {};
      if (name) updateFields.fname = name;
      if (email) updateFields.email = email;
      if (phone) updateFields.contact = phone;
      const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateFields);
      if (setClause) {
        await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, userId]);
      }
    }
    // Update user_profile table for profile fields
    await userModel.upsertUserProfile(userId, { dob, job, location, profileImage });
    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, message: 'Error updating profile' });
  }
};

export const getTasks = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const tasks = await userModel.getUserTasks(userId) as any[];
    // Format for frontend
    const now = new Date();
    const formatted = tasks.map((task: any) => ({
        completed: !!task.completed,
        done: `${task.progress}%`,
        id: task.id,
        progress: Number(task.progress),
        time: timeAgo(task.updated_at || task.created_at, now),
        title: task.title
    }));
    res.json({ status: 'Success', tasks: formatted });
};

// POST /api/users/tasks
export const postTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { progress, title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required', status: 'Error' });
    await userModel.createUserTask(userId, title, progress || 0);
    res.status(201).json({ message: 'Task created', status: 'Success' });
};

// PUT /api/users/tasks/:id
export const putTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const taskId = Number(req.params.id);
    const { completed, progress, title } = req.body;
    const result = await userModel.updateUserTask(userId, taskId, { completed, progress, title });
    if (result && (result as any).affectedRows > 0) {
        res.json({ message: 'Task updated', status: 'Success' });
    } else {
        res.status(404).json({ message: 'Task not found or not updated', status: 'Error' });
    }
};

// Get authentication logs for a user (admin only)
export const getUserAuthLogs = async (req: Request, res: Response): Promise<Response> => {
    const userId = Number(req.params.userId);
    // Robust admin check
    const isAdmin = req.user && typeof req.user === 'object' && 'role' in req.user && req.user.role === 1;
    if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admins only', status: 'error' });
    }
    if (!userId) {
        return res.status(400).json({ message: 'Missing or invalid userId', status: 'error' });
    }
    try {
        const logModel = await import('../p.admin/logModel.js');
        const { getUserAuthLogs } = logModel;
        const logs = await getUserAuthLogs(userId);
        return res.status(200).json({ logs, status: 'success' });
    } catch (error) {
        logger.error('Error fetching user auth logs:', error);
        return res.status(500).json({ message: 'Failed to fetch user logs', status: 'error' });
    }
};

// Get all authentication logs (admin only, using logModel)
export const getAllAuthLogs = async (req: Request, res: Response): Promise<Response> => {
    try {
        const logs = await logModel.getAuthLogs();
        // Use userModel.getAllUsers to get user info
        const users = await userModel.getAllUsers();
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        const logsWithUser = logs.map((log: any) => {
            const user = userMap.get(log.user_id);
            // Remove user_id from log
            const { user_id, ...rest } = log;
            return {
                ...rest,
                user: user ? { id: user.id, name: user.username || user.email } : null
            };
        });
        return res.status(200).json({ logs: logsWithUser, message: 'Logs data retrieved succesfully', status: 'success' });
    } catch (error) {
        logger.error('Error fetching all auth logs:', error);
        return res.status(500).json({ message: 'Failed to fetch auth logs', status: 'error' });
    }
}

// Get authentication logs for a user (admin only, using logModel)
export const getAuthLogs = async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ message: 'Missing or invalid userId', status: 'error' });
  }
  try {
    const logs = await logModel.getUserAuthLogs(userId);
    return res.status(200).json({ logs, status: 'success' });
  } catch (error) {
    logger.error('Error fetching user auth logs:', error);
    return res.status(500).json({ message: 'Failed to fetch user logs', status: 'error' });
  }
};

// Helper for "time ago"
function timeAgo(date: Date, now: Date) {
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}



/* ===== MODULES (via userModel) ===== */
export const getModules = async (req: Request, res: Response): Promise<Response> => {
  try {
    const modules = await userModel.getAllModules();
    return res.status(200).json({ data: modules, message: 'Modules retrieved', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching modules', error);
    return res.status(500).json({ message: 'Failed to fetch modules', status: 'error' });
  }
};

export const getModuleById = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    const moduleRow = await userModel.getModuleById(id);
    // Build members with permissions grouped per ramco_id
    const members = await userModel.getModuleMembersByModule(id);
    // Fetch all permissions and build id->perm map
    const allPerms = await userModel.getPermissions();
    const permMap = new Map(allPerms.map(p => [p.id, p]));

    // group by ramco_id
    const grouped = new Map<string, any>();
    for (const m of members) {
      const ram = String(m.ramco_id);
      const perm = permMap.get(Number(m.permission_id));
      if (!grouped.has(ram)) grouped.set(ram, { permissions: [] as any[], ramco_id: ram });
      if (perm) grouped.get(ram).permissions.push(perm);
    }

    const result = [
      {
        members: Array.from(grouped.values()),
        module: moduleRow ? moduleRow.name : null,
      }
    ];
    return res.status(200).json({ data: result, message: 'Permissions data retrieved successfully', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching module', error);
    return res.status(500).json({ message: 'Failed to fetch module', status: 'error' });
  }
};

export const createModule = async (req: Request, res: Response): Promise<Response> => {
  const { description, name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required', status: 'error' });
  try {
    const insertId = await userModel.createModule(name, description || null);
    return res.status(201).json({ data: { id: insertId }, message: 'Module created', status: 'success' });
  } catch (error: any) {
    logger.error('Error creating module', error);
    return res.status(500).json({ message: 'Failed to create module', status: 'error' });
  }
};

export const updateModule = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const { description, name } = req.body;
  if (!id || !name) return res.status(400).json({ message: 'Invalid input', status: 'error' });
  try {
    await userModel.updateModule(id, name, description || null);
    return res.status(200).json({ message: 'Module updated', status: 'success' });
  } catch (error: any) {
    logger.error('Error updating module', error);
    return res.status(500).json({ message: 'Failed to update module', status: 'error' });
  }
};

export const deleteModule = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    await userModel.deleteModule(id);
    return res.status(200).json({ message: 'Module deleted', status: 'success' });
  } catch (error: any) {
    logger.error('Error deleting module', error);
    return res.status(500).json({ message: 'Failed to delete module', status: 'error' });
  }
};

// ===== MODULE MEMBERS =====
export const getAllModuleMembers = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const rows = await userModel.getModuleMembers();
    return res.status(200).json({ data: rows, message: 'Module members retrieved', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching module members', error);
    return res.status(500).json({ message: 'Failed to fetch module members', status: 'error' });
  }
};

export const getModuleMembersByModule = async (req: Request, res: Response): Promise<Response> => {
  const moduleId = Number(req.params.id);
  if (!moduleId) return res.status(400).json({ message: 'Invalid module id', status: 'error' });
  try {
    const rows = await userModel.getModuleMembersByModule(moduleId);
    return res.status(200).json({ data: rows, message: 'Module members retrieved', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching module members by module', error);
    return res.status(500).json({ message: 'Failed to fetch module members by module', status: 'error' });
  }
};

export const getModuleMembersByRamco = async (req: Request, res: Response): Promise<Response> => {
  const ramco = String(req.params.ramco_id || req.query.ramco_id || '');
  if (!ramco) return res.status(400).json({ message: 'Invalid ramco_id', status: 'error' });
  try {
    const rows = await userModel.getModuleMembersByRamco(ramco);
    return res.status(200).json({ data: rows, message: 'Module members retrieved', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching module members by ramco', error);
    return res.status(500).json({ message: 'Failed to fetch module members by ramco', status: 'error' });
  }
};

export const postModuleMember = async (req: Request, res: Response): Promise<Response> => {
  const moduleId = Number(req.params.id || req.body.module_id);
  const { permission_id, ramco_id } = req.body;
  if (!moduleId || !ramco_id) return res.status(400).json({ message: 'module_id and ramco_id required', status: 'error' });
  try {
    const insertId = await userModel.addModuleMember(ramco_id, moduleId, Number(permission_id || 0));
    return res.status(201).json({ data: { id: insertId }, message: 'Module member added', status: 'success' });
  } catch (error: any) {
    logger.error('Error adding module member', error);
    return res.status(500).json({ message: 'Failed to add module member', status: 'error' });
  }
};

export const putModuleMember = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const { module_id, permission_id, ramco_id } = req.body;
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    await userModel.updateModuleMember(id, { module_id: module_id ? Number(module_id) : undefined, permission_id, ramco_id });
    return res.status(200).json({ message: 'Module member updated', status: 'success' });
  } catch (error: any) {
    logger.error('Error updating module member', error);
    return res.status(500).json({ message: 'Failed to update module member', status: 'error' });
  }
};

export const deleteModuleMemberHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    await userModel.deleteModuleMember(id);
    return res.status(200).json({ message: 'Module member deleted', status: 'success' });
  } catch (error: any) {
    logger.error('Error deleting module member', error);
    return res.status(500).json({ message: 'Failed to delete module member', status: 'error' });
  }
};

// ===== PERMISSIONS CRUD =====
export const getPermissionsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const rows = await userModel.getPermissions();
    return res.status(200).json({ data: rows, message: 'Permissions retrieved', status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching permissions', error);
    return res.status(500).json({ message: 'Failed to fetch permissions', status: 'error' });
  }
};

export const getPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    const p = await userModel.getPermissionById(id);
    if (!p) return res.status(404).json({ message: 'Permission not found', status: 'error' });
    return res.status(200).json({ data: p, status: 'success' });
  } catch (error: any) {
    logger.error('Error fetching permission', error);
    return res.status(500).json({ message: 'Failed to fetch permission', status: 'error' });
  }
};

export const postPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const { category, code, description, is_active, name } = req.body;
  if (!code || !name) return res.status(400).json({ message: 'code and name required', status: 'error' });
  try {
    const id = await userModel.createPermission({ category, code, description, is_active, name });
    return res.status(201).json({ data: { id }, message: 'Permission created', status: 'success' });
  } catch (error: any) {
    logger.error('Error creating permission', error);
    return res.status(500).json({ message: 'Failed to create permission', status: 'error' });
  }
};

export const putPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const data = req.body;
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    await userModel.updatePermission(id, data);
    return res.status(200).json({ message: 'Permission updated', status: 'success' });
  } catch (error: any) {
    logger.error('Error updating permission', error);
    return res.status(500).json({ message: 'Failed to update permission', status: 'error' });
  }
};

export const deletePermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
  try {
    await userModel.deletePermission(id);
    return res.status(200).json({ message: 'Permission deleted', status: 'success' });
  } catch (error: any) {
    logger.error('Error deleting permission', error);
    return res.status(500).json({ message: 'Failed to delete permission', status: 'error' });
  }
};

/* ======== Workflows CRUD ======== */

export const getWorkflows = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const workflows = (await userModel.getWorkflows()) as any[];

    // Enrich ramco_id -> employee object { ramco_id, full_name }
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

    const enriched = (workflows || []).map((lvl: any) => {
      const emp = empMap.get(String(lvl.ramco_id)) || null;
      const employee = emp ? { full_name: emp.full_name || emp.fullname || emp.name || null, ramco_id: emp.ramco_id } : null;
      const copy = { ...lvl };
      delete (copy).ramco_id;
      (copy).employee = employee;
      return copy;
    });

    return res.status(200).json({ data: enriched, message: 'Approval levels retrieved successfully', status: 'success' });
  } catch (error: any) {
    console.error('Error getting approval levels:', error);
    return res.status(500).json({ error: error.message, message: 'Error getting approval levels' });
  }
};

export const getWorkflowById = async (req: Request, res: Response): Promise<Response> => {
  const workflowId = Number(req.params.id);
  if (!workflowId) {
    return res.status(400).json({ message: 'Missing or invalid workflowId', status: 'error' });
  }
  try {
    const workflow = await userModel.getWorkflowById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found', status: 'error' });
    }

    // Enrich ramco_id -> employee
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
  const emp = empMap.get(String(workflow.ramco_id)) || null;
    const employee = emp ? { full_name: emp.full_name || emp.fullname || emp.name || null, ramco_id: emp.ramco_id } : null;
  const copy = { ...workflow };
    delete (copy).ramco_id;
    (copy).employee = employee;

    return res.status(200).json({ data: copy, status: 'success' });
  } catch (error) {
    console.error('Error getting approval level by ID:', error);
    return res.status(500).json({ error: (error as any).message, message: 'Error getting approval level', status: 'error' });
  }
};

export const createWorkflow = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const createdCount = await userModel.createWorkflow(data);
    return res.status(201).json({
      data: {
        created_levels: createdCount,
        module_name: data?.module_name || null
      },
      message: `Workflow created successfully (${createdCount} level${createdCount === 1 ? '' : 's'})`,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return res.status(500).json({ error: (error as any).message, message: 'Error creating workflow', status: 'error' });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  const workflowId = Number(req.params.id);
  const data = req.body;

  try {
    await userModel.updateWorkflow(workflowId, data);
    return res.status(200).json({ message: 'Workflow updated successfully', status: 'success' });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return res.status(500).json({ error: (error as any).message, message: 'Error updating workflow', status: 'error' });
  }
};

export const reorderWorkflows = async (req: Request, res: Response) => {
  // Payload examples:
  // { module_name: 'vehicle maintenance', items: [3,1,2] }
  // { items: [{id:3, level_order:1}, {id:1, level_order:2}] }
  const data = req.body || {};
  try {
    // Support alias: 'order' for array of ids
    const incoming = Array.isArray(data.items) ? data.items : (Array.isArray(data.order) ? data.order : []);
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ message: 'items/order must be a non-empty array', status: 'error' });
    }
    const updated = await userModel.reorderWorkflows({ items: incoming, module_name: data.module_name });
    return res.status(200).json({ data: { updated }, message: `Reordered ${updated} workflow level(s)`, status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message, message: 'Failed to reorder workflows', status: 'error' });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  const workflowId = Number(req.params.id);
  if (!workflowId) {
    return res.status(400).json({ message: 'Missing or invalid workflowId', status: 'error' });
  }
  try {
    await userModel.deleteWorkflow(workflowId);
    return res.status(200).json({ message: 'Workflow deleted successfully', status: 'success' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return res.status(500).json({ error: (error as any).message, message: 'Error deleting workflow', status: 'error' });
  }
};
