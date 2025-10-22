import { Request, Response } from 'express';
import * as userModel from './userModel';
import dotenv from 'dotenv';
import { sendMail } from '../utils/mailer';
import crypto from 'crypto';
import logger from '../utils/logger';
import {pool} from '../utils/db';
import * as roleModel from '../p.role/roleModel';
import * as groupModel from '../p.group/groupModel';
import * as pendingUserModel from '../p.user/pendingUserModel';
import * as logModel from '../p.admin/logModel';
import * as assetModel from '../p.asset/assetModel';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { buildStoragePath, toDbPath, sanitizeFilename } from '../utils/uploadUtil';

dotenv.config({ path: '.env.local' });

// ===== Interfaces =====

interface AdminUser {
  username: string;
  password: string;
  email: string;
  fname: string;
  user_type: number;
  last_nav: string;
  status: number;
  role: number;
  group: number;
  created_at: Date;
  activated_at: Date;
}

interface AssignGroupsRequest extends Request {
  body: {
    userId: number;
    groups: number[];
  };
}

interface Users {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  activation_code: string | null;
  fname: string;
  contact: string;
  user_type: number;
  last_login: Date | null;
  last_nav: string | null;
  last_ip: string | null;
  last_host: string | null;
  last_os: string | null;
  status: number;
  role: number;
  usergroups: string | null; // Updated field to store comma-separated group IDs
  reset_token: string | null;
  activated_at: Date | null;
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
    // Map users to include role object and usergroups as array of objects
    const formattedUsers = await Promise.all(users.map(async (user) => {
      // Get role object
      let roleObj = null;
      if (user.role) {
        const role = await roleModel.getRoleById(user.role);
        if (role) roleObj = { id: role.id, name: role.name };
      }
      // Get usergroups as array of objects
      let usergroupsArr: any[] = [];
      if (user.usergroups) {
        const groupIds = String(user.usergroups).split(',').map(Number).filter(Boolean);
        usergroupsArr = await Promise.all(groupIds.map(async (gid) => {
          const group = await groupModel.getGroupById(gid);
          return group ? { id: group.id, name: group.name } : null;
        }));
        usergroupsArr = usergroupsArr.filter(Boolean);
      }
      // Calculate time_spent from logs_auth
      const time_spent = await getUserTimeSpent(user.id);
      return {
        ...user,
        role: roleObj,
        usergroups: usergroupsArr,
        time_spent
      };
    }));
    return res.status(200).json({ status: 'success', message: 'User data retrieved successfully', data: formattedUsers });
  } catch (error: any) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ message: 'Error getting all users' });
  }
};

// New: Get all pending users
export const getAllPendingUser = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const pendingUsers = await pendingUserModel.getAllPendingUsers();
    return res.status(200).json({ status: 'success', message: 'Pending user data retrieved successfully', data: pendingUsers });
  } catch (error: any) {
    console.error('Error getting all pending users:', error);
    return res.status(500).json({ message: 'Error getting all pending users' });
  }
};

// Update user and assign groups
export const updateUser1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { user_type, role, usergroups, status, fname, email, last_nav } = req.body as any;

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
        return res.status(400).json({ status: 'error', message: 'Unsupported avatar file type' });
      }
      const filename = `${userId}-${safeName}`; // <id-filename>
      const destAbs = await buildStoragePath('profile/avatar', filename);
      await fsPromises.mkdir(path.dirname(destAbs), { recursive: true });
      await fsPromises.writeFile(destAbs, file.buffer);
      const storedRel = toDbPath('profile/avatar', filename); // e.g., uploads/profile/avatar/<id-filename>

      await userModel.updateUserAvatar(userId, storedRel, contact);
      return res.status(200).json({ status: 'success', message: 'User avatar updated', data: { id: userId, avatar: storedRel } });
    }

    // If only contact provided (no file), allow updating contact alone via the same endpoint
    if (contact !== undefined) {
      await userModel.updateUserAvatar(userId, undefined, contact);
      return res.status(200).json({ status: 'success', message: 'User contact updated', data: { id: userId, contact } });
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

    return res.status(200).json({ status: 'success', message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Assign user to groups directly
export const assignUserToGroups1 = async (
  req: AssignGroupsRequest,
  res: Response
): Promise<Response> => {
  const { userId, groups } = req.body;

  if (!userId || !Array.isArray(groups)) {
    return res.status(400).json({ status: 'Error', message: 'Invalid input' });
  }

  try {
    await userModel.assignUserToGroups(userId, groups);
    return res
      .status(200)
      .json({ status: 'Success', message: 'User assigned to groups successfully' });
  } catch (error: any) {
    console.error('Error assigning user to groups:', error);
    return res
      .status(500)
      .json({ status: 'Error', message: 'Error assigning user to groups', error: error.message });
  }
};

// Change groups for multiple users
export const changeUsersGroups = async (req: Request, res: Response): Promise<Response> => {
  const { userIds, groupIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || !Array.isArray(groupIds) || groupIds.length === 0) {
    return res.status(400).json({ status: 'Error', message: 'userIds and groupIds must be non-empty arrays' });
  }
  try {
    for (const userId of userIds) {
      await userModel.assignUserToGroups(userId, groupIds);
    }
    return res.status(200).json({ status: 'Success', message: 'Groups updated for selected users' });
  } catch (error: any) {
    console.error('Error changing users groups:', error);
    return res.status(500).json({ status: 'Error', message: 'Error changing users groups', error: error.message });
  }
};

// Change role for multiple users
export const changeUsersRole = async (req: Request, res: Response): Promise<Response> => {
  const { userIds, roleId } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || typeof roleId !== 'number') {
    return res.status(400).json({ status: 'Error', message: 'userIds must be a non-empty array and roleId must be a number' });
  }
  try {
    for (const userId of userIds) {
      await userModel.updateUserRole(userId, roleId);
    }
    return res.status(200).json({ status: 'Success', message: 'Role updated for selected users' });
  } catch (error: any) {
    console.error('Error changing users role:', error);
    return res.status(500).json({ message: 'Error changing users role', error: error.message });
  }
};

// Suspend or activate multiple users
export const suspendOrActivateUsers = async (req: Request, res: Response): Promise<Response> => {
  const { user_ids, status } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0 || typeof status !== 'number') {
    return res.status(400).json({ status: 'Error', message: 'user_ids must be a non-empty array and status must be a number' });
  }
  try {
    for (const userId of user_ids) {
      await userModel.updateUser(userId, { status } as any);
    }
    return res.status(200).json({ status: 'Success', message: 'Status updated for selected users' });
  } catch (error: any) {
    console.error('Error updating users status:', error);
    return res.status(500).json({ status: 'Error', message: 'Error updating users status', error: error.message });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;

  try {
    const { success, user, message } = await userModel.verifyLoginCredentials(emailOrUsername, password);

    if (!success) {
      return res.status(401).json({ success: false, message });
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
    return res.status(500).json({ message: 'Error logging in user', error: error.message });
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
          e: email.split('@')[0],
          c: contact ? contact.slice(-4) : '',
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
        results.push({ user_id: user.id, email, status: 'sent' });
      } catch (err) {
        logger.error('Error sending reset email for user', user.id, err);
        results.push({ user_id: user.id, email: user.email, status: 'error', error: (err instanceof Error ? err.message : JSON.stringify(err)) });
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
  const { name, email, phone, dob, location, job } = req.body;
  // If file is uploaded, use req.file.buffer
  let profileImage = undefined;
  if ((req as any).file && (req as any).file.buffer) {
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
    await userModel.upsertUserProfile(userId, { dob, location, job, profileImage });
    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const tasks = await userModel.getUserTasks(userId) as any[];
    // Format for frontend
    const now = new Date();
    const formatted = tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        progress: Number(task.progress),
        done: `${task.progress}%`,
        time: timeAgo(task.updated_at || task.created_at, now)
    }));
    res.json({ status: 'Success', tasks: formatted });
};

// POST /api/users/tasks
export const postTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { title, progress } = req.body;
    if (!title) return res.status(400).json({ status: 'Error', message: 'Title required' });
    await userModel.createUserTask(userId, title, progress || 0);
    res.status(201).json({ status: 'Success', message: 'Task created' });
};

// PUT /api/users/tasks/:id
export const putTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const taskId = Number(req.params.id);
    const { title, completed, progress } = req.body;
    const result = await userModel.updateUserTask(userId, taskId, { title, completed, progress });
    if (result && (result as any).affectedRows > 0) {
        res.json({ status: 'Success', message: 'Task updated' });
    } else {
        res.status(404).json({ status: 'Error', message: 'Task not found or not updated' });
    }
};

// Get authentication logs for a user (admin only)
export const getUserAuthLogs = async (req: Request, res: Response): Promise<Response> => {
    const userId = Number(req.params.userId);
    // Robust admin check
    const isAdmin = req.user && typeof req.user === 'object' && 'role' in req.user && req.user.role === 1;
    if (!isAdmin) {
        return res.status(403).json({ status: 'error', message: 'Forbidden: Admins only' });
    }
    if (!userId) {
        return res.status(400).json({ status: 'error', message: 'Missing or invalid userId' });
    }
    try {
        const { getUserAuthLogs } = require('../models/logModel');
        const logs = await getUserAuthLogs(userId);
        return res.status(200).json({ status: 'success', logs });
    } catch (error) {
        logger.error('Error fetching user auth logs:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to fetch user logs' });
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
        return res.status(200).json({ status: 'success', message: 'Logs data retrieved succesfully', logs: logsWithUser });
    } catch (error) {
        logger.error('Error fetching all auth logs:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to fetch auth logs' });
    }
}

// Get authentication logs for a user (admin only, using logModel)
export const getAuthLogs = async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid userId' });
  }
  try {
    const logs = await logModel.getUserAuthLogs(userId);
    return res.status(200).json({ status: 'success', logs });
  } catch (error) {
    logger.error('Error fetching user auth logs:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch user logs' });
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
    return res.status(200).json({ status: 'success', message: 'Modules retrieved', data: modules });
  } catch (error: any) {
    logger.error('Error fetching modules', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch modules' });
  }
};

export const getModuleById = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
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
      if (!grouped.has(ram)) grouped.set(ram, { ramco_id: ram, permissions: [] as any[] });
      if (perm) grouped.get(ram).permissions.push(perm);
    }

    const result = [
      {
        module: moduleRow ? moduleRow.name : null,
        members: Array.from(grouped.values()),
      }
    ];
    return res.status(200).json({ status: 'success', message: 'Permissions data retrieved successfully', data: result });
  } catch (error: any) {
    logger.error('Error fetching module', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch module' });
  }
};

export const createModule = async (req: Request, res: Response): Promise<Response> => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ status: 'error', message: 'Name required' });
  try {
    const insertId = await userModel.createModule(name, description || null);
    return res.status(201).json({ status: 'success', message: 'Module created', data: { id: insertId } });
  } catch (error: any) {
    logger.error('Error creating module', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create module' });
  }
};

export const updateModule = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const { name, description } = req.body;
  if (!id || !name) return res.status(400).json({ status: 'error', message: 'Invalid input' });
  try {
    await userModel.updateModule(id, name, description || null);
    return res.status(200).json({ status: 'success', message: 'Module updated' });
  } catch (error: any) {
    logger.error('Error updating module', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update module' });
  }
};

export const deleteModule = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    await userModel.deleteModule(id);
    return res.status(200).json({ status: 'success', message: 'Module deleted' });
  } catch (error: any) {
    logger.error('Error deleting module', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete module' });
  }
};

// ===== MODULE MEMBERS =====
export const getAllModuleMembers = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const rows = await userModel.getModuleMembers();
    return res.status(200).json({ status: 'success', message: 'Module members retrieved', data: rows });
  } catch (error: any) {
    logger.error('Error fetching module members', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch module members' });
  }
};

export const getModuleMembersByModule = async (req: Request, res: Response): Promise<Response> => {
  const moduleId = Number(req.params.id);
  if (!moduleId) return res.status(400).json({ status: 'error', message: 'Invalid module id' });
  try {
    const rows = await userModel.getModuleMembersByModule(moduleId);
    return res.status(200).json({ status: 'success', message: 'Module members retrieved', data: rows });
  } catch (error: any) {
    logger.error('Error fetching module members by module', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch module members by module' });
  }
};

export const getModuleMembersByRamco = async (req: Request, res: Response): Promise<Response> => {
  const ramco = String(req.params.ramco_id || req.query.ramco_id || '');
  if (!ramco) return res.status(400).json({ status: 'error', message: 'Invalid ramco_id' });
  try {
    const rows = await userModel.getModuleMembersByRamco(ramco);
    return res.status(200).json({ status: 'success', message: 'Module members retrieved', data: rows });
  } catch (error: any) {
    logger.error('Error fetching module members by ramco', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch module members by ramco' });
  }
};

export const postModuleMember = async (req: Request, res: Response): Promise<Response> => {
  const moduleId = Number(req.params.id || req.body.module_id);
  const { ramco_id, permission_id } = req.body;
  if (!moduleId || !ramco_id) return res.status(400).json({ status: 'error', message: 'module_id and ramco_id required' });
  try {
    const insertId = await userModel.addModuleMember(ramco_id, moduleId, Number(permission_id || 0));
    return res.status(201).json({ status: 'success', message: 'Module member added', data: { id: insertId } });
  } catch (error: any) {
    logger.error('Error adding module member', error);
    return res.status(500).json({ status: 'error', message: 'Failed to add module member' });
  }
};

export const putModuleMember = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const { ramco_id, module_id, permission_id } = req.body;
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    await userModel.updateModuleMember(id, { ramco_id, module_id: module_id ? Number(module_id) : undefined, permission_id });
    return res.status(200).json({ status: 'success', message: 'Module member updated' });
  } catch (error: any) {
    logger.error('Error updating module member', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update module member' });
  }
};

export const deleteModuleMemberHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    await userModel.deleteModuleMember(id);
    return res.status(200).json({ status: 'success', message: 'Module member deleted' });
  } catch (error: any) {
    logger.error('Error deleting module member', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete module member' });
  }
};

// ===== PERMISSIONS CRUD =====
export const getPermissionsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const rows = await userModel.getPermissions();
    return res.status(200).json({ status: 'success', message: 'Permissions retrieved', data: rows });
  } catch (error: any) {
    logger.error('Error fetching permissions', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch permissions' });
  }
};

export const getPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    const p = await userModel.getPermissionById(id);
    if (!p) return res.status(404).json({ status: 'error', message: 'Permission not found' });
    return res.status(200).json({ status: 'success', data: p });
  } catch (error: any) {
    logger.error('Error fetching permission', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch permission' });
  }
};

export const postPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const { code, name, description, category, is_active } = req.body;
  if (!code || !name) return res.status(400).json({ status: 'error', message: 'code and name required' });
  try {
    const id = await userModel.createPermission({ code, name, description, category, is_active });
    return res.status(201).json({ status: 'success', message: 'Permission created', data: { id } });
  } catch (error: any) {
    logger.error('Error creating permission', error);
    return res.status(500).json({ status: 'error', message: 'Failed to create permission' });
  }
};

export const putPermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  const data = req.body;
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    await userModel.updatePermission(id, data);
    return res.status(200).json({ status: 'success', message: 'Permission updated' });
  } catch (error: any) {
    logger.error('Error updating permission', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update permission' });
  }
};

export const deletePermissionHandler = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
  try {
    await userModel.deletePermission(id);
    return res.status(200).json({ status: 'success', message: 'Permission deleted' });
  } catch (error: any) {
    logger.error('Error deleting permission', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete permission' });
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
      const employee = emp ? { ramco_id: emp.ramco_id, full_name: emp.full_name || emp.fullname || emp.name || null } : null;
      const copy = { ...lvl };
      delete (copy as any).ramco_id;
      (copy as any).employee = employee;
      return copy;
    });

    return res.status(200).json({ status: 'success', message: 'Approval levels retrieved successfully', data: enriched });
  } catch (error: any) {
    console.error('Error getting approval levels:', error);
    return res.status(500).json({ message: 'Error getting approval levels', error: error.message });
  }
};

export const getWorkflowById = async (req: Request, res: Response): Promise<Response> => {
  const workflowId = Number(req.params.id);
  if (!workflowId) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid workflowId' });
  }
  try {
    const workflow = await userModel.getWorkflowById(workflowId);
    if (!workflow) {
      return res.status(404).json({ status: 'error', message: 'Workflow not found' });
    }

    // Enrich ramco_id -> employee
    const employeesRaw = await assetModel.getEmployees();
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
  const emp = empMap.get(String(workflow.ramco_id)) || null;
    const employee = emp ? { ramco_id: emp.ramco_id, full_name: emp.full_name || emp.fullname || emp.name || null } : null;
  const copy = { ...workflow };
    delete (copy as any).ramco_id;
    (copy as any).employee = employee;

    return res.status(200).json({ status: 'success', data: copy });
  } catch (error) {
    console.error('Error getting approval level by ID:', error);
    return res.status(500).json({ status: 'error', message: 'Error getting approval level', error: (error as any).message });
  }
};

export const createWorkflow = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const createdCount = await userModel.createWorkflow(data);
    return res.status(201).json({
      status: 'success',
      message: `Workflow created successfully (${createdCount} level${createdCount === 1 ? '' : 's'})`,
      data: {
        created_levels: createdCount,
        module_name: data?.module_name || null
      }
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return res.status(500).json({ status: 'error', message: 'Error creating workflow', error: (error as any).message });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  const workflowId = Number(req.params.id);
  const data = req.body;

  try {
    await userModel.updateWorkflow(workflowId, data);
    return res.status(200).json({ status: 'success', message: 'Workflow updated successfully' });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return res.status(500).json({ status: 'error', message: 'Error updating workflow', error: (error as any).message });
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
      return res.status(400).json({ status: 'error', message: 'items/order must be a non-empty array' });
    }
    const updated = await userModel.reorderWorkflows({ module_name: data.module_name, items: incoming });
    return res.status(200).json({ status: 'success', message: `Reordered ${updated} workflow level(s)`, data: { updated } });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: 'Failed to reorder workflows', error: error?.message });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  const workflowId = Number(req.params.id);
  if (!workflowId) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid workflowId' });
  }
  try {
    await userModel.deleteWorkflow(workflowId);
    return res.status(200).json({ status: 'success', message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return res.status(500).json({ status: 'error', message: 'Error deleting workflow', error: (error as any).message });
  }
};
