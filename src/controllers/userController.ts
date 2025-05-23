import { Request, Response } from 'express';
import {
  getAllUsers,
  updateUser,
  assignUserToGroups,
  verifyLoginCredentials,
  updateUserResetTokenAndStatus,
  upsertUserProfile, getUserTasks, createUserTask, updateUserTask
} from '../models/userModel';
import dotenv from 'dotenv';
import { sendMail } from '../utils/mailer';
import crypto from 'crypto';
import logger from '../utils/logger';
import pool from '../utils/db';
import { getRoleById } from '../models/roleModel';
import { getGroupById } from '../models/groupModel';

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
    const users = await getAllUsers();
    // Map users to include role object and usergroups as array of objects
    const formattedUsers = await Promise.all(users.map(async (user) => {
      // Get role object
      let roleObj = null;
      if (user.role) {
        const role = await getRoleById(user.role);
        if (role) roleObj = { id: role.id, name: role.name };
      }
      // Get usergroups as array of objects
      let usergroupsArr: any[] = [];
      if (user.usergroups) {
        const groupIds = String(user.usergroups).split(',').map(Number).filter(Boolean);
        usergroupsArr = await Promise.all(groupIds.map(async (gid) => {
          const group = await getGroupById(gid);
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

// Update user and assign groups
export const updateUser1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { user_type, role, usergroups, status } = req.body;

  try {
    // Validate user ID
    const userId = Number(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Update the user details
    await updateUser(userId, { user_type, role, status } as Users);

    // Handle user groups
    if (!Array.isArray(usergroups) || usergroups.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty usergroups' });
    }

    // Assign user to groups
    await assignUserToGroups(userId, usergroups);

    return res.status(200).json({ message: 'User updated successfully' });
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
    await assignUserToGroups(userId, groups);
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
    return res.status(400).json({ message: 'userIds and groupIds must be non-empty arrays' });
  }
  try {
    for (const userId of userIds) {
      await assignUserToGroups(userId, groupIds);
    }
    return res.status(200).json({ message: 'Groups updated for selected users' });
  } catch (error: any) {
    console.error('Error changing users groups:', error);
    return res.status(500).json({ message: 'Error changing users groups', error: error.message });
  }
};

// Change role for multiple users
export const changeUsersRole = async (req: Request, res: Response): Promise<Response> => {
  const { userIds, roleId } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || typeof roleId !== 'number') {
    return res.status(400).json({ message: 'userIds must be a non-empty array and roleId must be a number' });
  }
  try {
    for (const userId of userIds) {
      await updateUser(userId, { role: roleId } as any);
    }
    return res.status(200).json({ message: 'Role updated for selected users' });
  } catch (error: any) {
    console.error('Error changing users role:', error);
    return res.status(500).json({ message: 'Error changing users role', error: error.message });
  }
};

// Suspend or activate multiple users
export const suspendOrActivateUsers = async (req: Request, res: Response): Promise<Response> => {
  const { user_ids, status } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0 || typeof status !== 'number') {
    return res.status(400).json({ message: 'user_ids must be a non-empty array and status must be a number' });
  }
  try {
    for (const userId of user_ids) {
      await updateUser(userId, { status } as any);
    }
    return res.status(200).json({ message: 'Status updated for selected users' });
  } catch (error: any) {
    console.error('Error updating users status:', error);
    return res.status(500).json({ message: 'Error updating users status', error: error.message });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;

  try {
    const { success, user, message } = await verifyLoginCredentials(emailOrUsername, password);

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
        await updateUserResetTokenAndStatus(user.id, resetToken, 3);
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
    await upsertUserProfile(userId, { dob, location, job, profileImage });
    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const tasks = await getUserTasks(userId) as any[];
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
    res.json({ tasks: formatted });
};

// POST /api/users/tasks
export const postTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { title, progress } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });
    await createUserTask(userId, title, progress || 0);
    res.status(201).json({ message: 'Task created' });
};

// PUT /api/users/tasks/:id
export const putTask = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const taskId = Number(req.params.id);
    const { title, completed, progress } = req.body;
    const result = await updateUserTask(userId, taskId, { title, completed, progress });
    if (result && (result as any).affectedRows > 0) {
        res.json({ message: 'Task updated' });
    } else {
        res.status(404).json({ message: 'Task not found or not updated' });
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

// Helper for "time ago"
function timeAgo(date: Date, now: Date) {
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}