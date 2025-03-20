// Purpose: Model for user operations.
import pool from '../utils/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
const { hash, compare } = bcrypt;

// Define the interface
export interface Users {
  id: number;
  email: string;
  username: string;
  contact: string;
  name: string;
  status: number;
  user_type: number;
  lastNav: string;
  lastLogin: string;
  role: number;
  accessgroups: string;
}

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
export const registerUser = async (username: string, email: string, contact: string, activationCode: string): Promise<any> => {
  try {
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, contact, activation_code) VALUES (?, ?, ?, ?)',
      [username, email, contact, activationCode]
    );
    return result;
  } catch (error) {
    logger.error(`Database error in registerUser: ${error}`);
    throw error;
  }
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
export const activateUser = async (email: string, contact: string, activationCode: string, userType: number, username: string, password: string): Promise<{ activated: boolean; message: string; error?: unknown }> => {
  try {
    if (!password) {
      return {
        activated: false,
        message: 'Password is required',
      };
    }

    const hashedPassword = await hash(password, 10);
    const [result]: any = await pool.query(
      'UPDATE users SET password = ?, user_type = ?, username = ? WHERE email = ? AND contact = ? AND activation_code = ?',
      [hashedPassword, userType, username, email, contact, activationCode]
    );

    return {
      activated: result.affectedRows > 0,
      message: result.affectedRows > 0 ? 'Account activated' : 'Invalid activation details',
    };
  } catch (error) {
    logger.error(`Database error in activateUser: ${error}`);
    throw error;
  }
};

// Verify login credentials
export const verifyLoginCredentials = async (emailOrUsername: string, password: string): Promise<{ success: boolean; user?: Users; message?: string; error?: unknown }> => {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT u.*, GROUP_CONCAT(ug.group_id) AS accessgroups
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
      email: user.email,
      username: user.username,
      contact: user.contact,
      name: user.fname,
      status: user.status,
      user_type: user.user_type,
      lastNav: user.last_nav,
      lastLogin: new Date(user.last_login).toLocaleDateString('en-us'),
      role: user.role,
      accessgroups: user.accessgroups,
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
    await pool.query(
      'UPDATE users SET user_type = ?, role = ?, status = ? WHERE id = ?',
      [user_type, role, status, userId]
    );
  } catch (error) {
    logger.error(`Database error in updateUser: ${error}`);
    throw error;
  }
};

// Assign user to groups
export const assignUserToGroups = async (userId: number, groups: number[]): Promise<void> => {
  if (groups.length > 0) {
    const values = groups.flatMap(groupId => [userId, groupId]);
    const query = `
      INSERT IGNORE INTO user_groups (user_id, group_id, timestamp)
      VALUES ${groups.map(() => '(?, ?, NOW())').join(', ')}
    `;
    try {
      await pool.query(query, values);
    } catch (error) {
      logger.error(`Database error in assignUserToGroups: ${error}`);
      throw error;
    }
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