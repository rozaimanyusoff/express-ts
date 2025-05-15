// Purpose: Model for user operations.
import pool from '../utils/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { ResultSetHeader } from "mysql2";
const { hash, compare } = bcrypt;

// Define the interface
export interface Users {
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
  role: number; // role id, now references roles table with new schema
  usergroups: string | null; // comma-separated group IDs
  reset_token: string | null;
  activated_at: Date | null;
}

// Get all users
export const getAllUsers = async (): Promise<Users[]> => {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(ug.group_id) AS usergroups
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      GROUP BY u.id`
    );

    return rows.map((user: Users) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      password: '', // Password is omitted for security
      created_at: new Date(user.created_at),
      activation_code: user.activation_code,
      fname: user.fname,
      contact: user.contact,
      user_type: user.user_type,
      last_login: user.last_login ? new Date(user.last_login) : null,
      last_nav: user.last_nav,
      last_ip: user.last_ip,
      last_host: user.last_host,
      last_os: user.last_os,
      status: user.status,
      role: user.role,
      usergroups: user.usergroups || null, // Map usergroups as a string
      reset_token: user.reset_token,
      activated_at: user.activated_at ? new Date(user.activated_at) : null,
    }));
  } catch (error) {
    logger.error(`Database error in getAllUsers: ${error}`);
    throw error;
  }
};

// Validate user by email or contact prior to registration
export const findUserByEmailOrContact = async (email: string, contact: string): Promise<any[]> => {
  try {
    const [rows]: any[] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR contact = ?',
      [email, contact]
    );
    logger.info(`findUserByEmailOrContact query result: ${JSON.stringify(rows)}`);
    return rows;
  } catch (error) {
    logger.error(`Database error in findUserByEmailOrContact: ${error}`);
    throw error;
  }
};

// Register user if no existing user found
export const registerUser = async (name: string, email: string, contact: string, userType: number, activationCode: string): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (fname, email, contact, user_type, activation_code) VALUES (?, ?, ?, ?, ?)',
    [name, email, contact, userType, activationCode]
  );
  return result;
};

// Validate user activation details
export const validateActivation = async (email: string, contact: string, activationCode: string): Promise<{ valid: boolean; user?: any; error?: unknown }> => {
  try {
    const [rows]: any[] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND contact = ? AND activation_code = ?',
      [email, contact, activationCode]
    );
    return {
      valid: Array.isArray(rows) && rows.length > 0,
      user: rows[0],
    };
  } catch (error) {
    logger.error(`Database error in validateActivation: ${error}`);
    throw error;
  }
};

// Activate user account
export const activateUser = async (email: string, contact: string, activationCode: string, username: string, password: string): Promise<ResultSetHeader> => {
  const hashedPassword = await hash(password, 10);
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE users SET password = ?, username = ?, activation_code = null, activated_at = NOW() WHERE email = ? AND contact = ? AND activation_code = ?',
    [hashedPassword, username, email, contact, activationCode]
  );
  return result;
};

// Verify login credentials
export const verifyLoginCredentials = async (
  emailOrUsername: string,
  password: string
): Promise<{ success: boolean; user?: Users; message?: string; error?: unknown }> => {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(ug.group_id) AS usergroups
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      WHERE (email = ? OR username = ?)
      AND activated_at IS NOT NULL
      GROUP BY u.id`,
      [emailOrUsername, emailOrUsername]
    );

    if (Array.isArray(rows) && rows.length === 0) {
      return { success: false, message: 'Invalid credentials' };
    }

    const user = rows[0];
    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return { success: false, message: 'Invalid credentials' };
    }

    if (user.status !== 1) {
      return { success: false, message: 'Account is inactive' };
    }

    delete user.password;

    const formattedUser: Users = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: '', // Password is removed for security
      created_at: new Date(user.created_at),
      activation_code: user.activation_code,
      fname: user.fname,
      contact: user.contact,
      user_type: user.user_type,
      last_login: user.last_login ? new Date(user.last_login) : null,
      last_nav: user.last_nav,
      last_ip: user.last_ip,
      last_host: user.last_host,
      last_os: user.last_os,
      status: user.status,
      role: user.role,
      usergroups: user.usergroups || null, // Map usergroups as a string
      reset_token: user.reset_token,
      activated_at: user.activated_at ? new Date(user.activated_at) : null,
    };

    return {
      success: true,
      user: formattedUser,
    };
  } catch (error) {
    logger.error(`Database error in verifyLoginCredentials: ${error}`);
    throw error;
  }
};

// Update last login
export const updateLastLogin = async (userId: number): Promise<any> => {
  try {
    const [result]: any = await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    return result;
  } catch (error) {
    logger.error(`Database error in updateLastLogin: ${error}`);
    throw error;
  }
};

// Update user password
export const updateUserPassword = async (email: string, contact: string, newPassword: string): Promise<boolean> => {
  try {
    const hashedPassword = await hash(newPassword, 10);
    const [result]: any = await pool.query(
      'UPDATE users SET password = ? WHERE email = ? AND contact = ?',
      [hashedPassword, email, contact]
    );
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`Database error in updateUserPassword: ${error}`);
    throw error;
  }
};

// Find user by reset token
export const findUserByResetToken = async (resetToken: string): Promise<Users | null> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [resetToken]);
    logger.info(`findUserByResetToken query result: ${JSON.stringify(rows)}`);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error(`Database error in findUserByResetToken: ${error}`);
    throw error;
  }
};

// Update user reset token and status
export const updateUserResetTokenAndStatus = async (userId: number, resetToken: string, status: number): Promise<void> => {
  try {
    await pool.query(
      'UPDATE users SET reset_token = ?, status = ? WHERE id = ?',
      [resetToken, status, userId]
    );
  } catch (error) {
    logger.error(`Database error in updateUserResetTokenAndStatus: ${error}`);
    throw error;
  }
};

// Reactivate user
export const reactivateUser = async (userId: number): Promise<void> => {
  try {
    await pool.query(
      'UPDATE users SET status = 1, reset_token = null WHERE id = ? AND status = 3',
      [userId]
    );
  } catch (error) {
    logger.error(`Database error in reactivateUser: ${error}`);
    throw error;
  }
};

// Update user by admin
export const updateUser = async (userId: number, { user_type, role, status }: Users): Promise<void> => {
  try {
    const query = `
      UPDATE users
      SET user_type = ?, role = ?, status = ?
      WHERE id = ?
    `;
    await pool.query(query, [user_type, role, status, userId]);
  } catch (error) {
    logger.error(`Database error in updateUser: ${error}`);
    throw error;
  }
};

// Assign user to groups
export const assignUserToGroups = async (userId: number, groups: number[]): Promise<void> => {
  if (groups.length === 0) {
    return;
  }

  try {
    // Remove existing group associations for the user
    await pool.query('DELETE FROM user_groups WHERE user_id = ?', [userId]);

    // Insert new group associations
    const values = groups.flatMap((groupId) => [userId, groupId]);
    const query = `
      INSERT INTO user_groups (user_id, group_id)
      VALUES ${groups.map(() => '(?, ?)').join(', ')}
    `;
    await pool.query(query, values);
  } catch (error) {
    logger.error(`Database error in assignUserToGroups: ${error}`);
    throw error;
  }
};

// Get user by email and password
export const getUserByEmailAndPassword = async (email: string, password: string): Promise<any[]> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    return rows;
  } catch (error) {
    logger.error(`Database error in getUserByEmailAndPassword: ${error}`);
    throw error;
  }
};

// Update user login details (IP, host, OS)
export const updateUserLoginDetails = async (
  userId: number,
  { ip, host, os }: { ip: string | string[] | null; host: string | null; os: string | null }
): Promise<void> => {
  try {
    await pool.query(
      'UPDATE users SET last_ip = ?, last_host = ?, last_os = ? WHERE id = ?',
      [ip, host, os, userId]
    );
    logger.info(`Updated login details for user ID ${userId}: IP=${ip}, Host=${host}, OS=${os}`);
  } catch (error) {
    logger.error(`Database error in updateUserLoginDetails: ${error}`);
    throw error;
  }
};

// Bulk update users' role
export const updateUsersRole = async (userIds: number[], roleId: number): Promise<void> => {
  if (!userIds.length) return;
  try {
    // Set role for all userIds
    await pool.query(
      `UPDATE users SET role = ? WHERE id IN (${userIds.map(() => '?').join(',')})`,
      [roleId, ...userIds]
    );
  } catch (error) {
    logger.error(`Database error in updateUsersRole: ${error}`);
    throw error;
  }
};

// Log authentication activity
type AuthAction = 'login' | 'logout' | 'register' | 'activate' | 'reset_password' | 'request_reset' | 'other';

export const logAuthActivity = async (userId: number, action: AuthAction, status: 'success' | 'fail', reason: any = {}, req?: any): Promise<void> => {
  try {
    let ip = null;
    let userAgent = null;
    if (req) {
      ip = req.headers && (req.headers['x-forwarded-for'] as string) || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      userAgent = req.headers && req.headers['user-agent'] || null;
    }
    // Ensure details is always a non-empty string (use null if empty object)
    let details = null;
    if (reason && (typeof reason !== 'object' || Object.keys(reason).length > 0)) {
      details = JSON.stringify(reason);
    }
    await pool.query(
      `INSERT INTO logs_auth (user_id, action, status, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, status, ip, userAgent, details]
    );
  } catch (error) {
    logger.error('Error logging auth activity:', error);
  }
};