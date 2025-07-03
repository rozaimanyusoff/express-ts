// Purpose: Model for user operations.
import {pool} from '../utils/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
const { hash, compare } = bcrypt;

// DB and table variables for easier maintenance
export const DB_NAME = process.env.DB_NAME || 'auth';
export const usersTable = 'users';
export const userGroupsTable = 'user_groups';
export const userProfileTable = 'user_profile';
export const userTasksTable = 'user_tasks';

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

// UserProfile interface and profile helpers
export interface UserProfile {
    user_id: number;
    dob: string | null;
    location: string | null;
    job: string | null;
    profile_image_url: string | null;
}

// Helper to prepend backend URL to image path if needed
function getFullImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    const baseUrl = process.env.BACKEND_URL || '';
    if (imagePath.startsWith('http')) return imagePath;
    return baseUrl.replace(/\/$/, '') + imagePath;
}

// Get all users
export const getAllUsers = async (): Promise<Users[]> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT u.*, GROUP_CONCAT(ug.group_id) AS usergroups
      FROM ${usersTable} u
      LEFT JOIN ${userGroupsTable} ug ON u.id = ug.user_id
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
            `SELECT * FROM ${usersTable} WHERE email = ? OR contact = ?`,
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
    // Normalize to lowercase for email and contact
    const normalizedEmail = email.toLowerCase();
    const normalizedName = name.toLowerCase();
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${usersTable} (fname, email, contact, user_type, activation_code) VALUES (?, ?, ?, ?, ?)`,
        [normalizedName, normalizedEmail, contact, userType, activationCode]
    );
    return result;
};

// Validate user activation details
export const validateActivation = async (email: string, contact: string, activationCode: string): Promise<{ valid: boolean; user?: any; error?: unknown }> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT * FROM ${usersTable} WHERE email = ? AND contact = ? AND activation_code = ?`,
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
        `UPDATE ${usersTable} SET password = ?, username = ?, activation_code = null, activated_at = NOW() WHERE email = ? AND contact = ? AND activation_code = ?`,
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
      FROM ${usersTable} u
      LEFT JOIN ${userGroupsTable} ug ON u.id = ug.user_id
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
        const [result]: any = await pool.query(`UPDATE ${usersTable} SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);
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
            `UPDATE ${usersTable} SET password = ? WHERE email = ? AND contact = ?`,
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
        const [rows]: any[] = await pool.query(`SELECT * FROM ${usersTable} WHERE reset_token = ?`, [resetToken]);
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
            `UPDATE ${usersTable} SET reset_token = ?, status = ? WHERE id = ?`,
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
            `UPDATE ${usersTable} SET status = 1, reset_token = null WHERE id = ? AND status = 3`,
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
      UPDATE ${usersTable}
      SET user_type = ?, role = ?, status = ?
      WHERE id = ?
    `;
        await pool.query(query, [user_type, role, status, userId]);
    } catch (error) {
        logger.error(`Database error in updateUser: ${error}`);
        throw error;
    }
};

// Update Role by admin
export const updateUserRole = async (userId: number, role: number): Promise<void> => {
    try {
        const query = `
      UPDATE ${usersTable}
      SET role = ?
      WHERE id = ?
    `;
        await pool.query(query, [role, userId]);
    } catch (error) {
        logger.error(`Database error in updateUserRole: ${error}`);
        throw error;
    }
}

// Assign user to groups
export const assignUserToGroups = async (userId: number, groups: number[]): Promise<void> => {
    if (groups.length === 0) {
        return;
    }

    try {
        // Remove existing group associations for the user
        await pool.query(`DELETE FROM ${userGroupsTable} WHERE user_id = ?`, [userId]);

        // Insert new group associations
        const values = groups.flatMap((groupId) => [userId, groupId]);
        const query = `
      INSERT INTO ${userGroupsTable} (user_id, group_id)
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
        const [rows]: any[] = await pool.query(`SELECT * FROM ${usersTable} WHERE email = ? AND password = ?`, [email, password]);
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
            `UPDATE ${usersTable} SET last_ip = ?, last_host = ?, last_os = ? WHERE id = ?`,
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
            `UPDATE ${usersTable} SET role = ? WHERE id IN (${userIds.map(() => '?').join(',')})`,
            [roleId, ...userIds]
        );
    } catch (error) {
        logger.error(`Database error in updateUsersRole: ${error}`);
        throw error;
    }
};

// Get admin user IDs
export const getAdminUserIds = async (): Promise<number[]> => {
    const [rows]: any[] = await pool.query(`SELECT id FROM ${usersTable} WHERE role = 1`);
    return rows.map((row: any) => row.id);
};

// Set or clear the user's current session token
export const setUserSessionToken = async (userId: number, token: string | null): Promise<void> => {
    await pool.query(`UPDATE ${usersTable} SET current_session_token = ? WHERE id = ?`, [token, userId]);
};

// Get the user's current session token
export const getUserSessionToken = async (userId: number): Promise<string | null> => {
    const [rows]: any[] = await pool.query(`SELECT current_session_token FROM ${usersTable} WHERE id = ?`, [userId]);
    return rows[0]?.current_session_token || null;
};

// Get user profile
export const getUserProfile = async (userId: number): Promise<UserProfile | null> => {
    const [rows]: any[] = await pool.query(`SELECT * FROM ${userProfileTable} WHERE user_id = ?`, [userId]);
    if (rows.length === 0) return null;
    const profile = rows[0];
    profile.profile_image_url = getFullImageUrl(profile.profile_image_url);
    return profile;
};

// Upsert user profile
export const upsertUserProfile = async (userId: number, profile: Partial<UserProfile & { profileImage?: any }>): Promise<void> => {
    let imageUrl = profile.profile_image_url || null;
    // If profileImage is a file (Buffer or base64 string), save it to disk and set imageUrl
    if (profile.profileImage) {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
        let ext = '.jpg';
        let buffer: Buffer;
        if (typeof profile.profileImage === 'string' && profile.profileImage.startsWith('data:')) {
            // base64 data URL
            const matches = profile.profileImage.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                buffer = Buffer.from(matches[2], 'base64');
                const mime = matches[1];
                if (mime === 'image/png') ext = '.png';
                if (mime === 'image/jpeg') ext = '.jpg';
            } else {
                throw new Error('Invalid base64 image data');
            }
        } else if (Buffer.isBuffer(profile.profileImage)) {
            buffer = profile.profileImage;
        } else {
            throw new Error('Unsupported image format');
        }
        const filename = `profile_${userId}_${Date.now()}${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);
        imageUrl = `/uploads/${filename}`;
    }
    await pool.query(`
    INSERT INTO ${userProfileTable} (user_id, dob, location, job, profile_image_url)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE dob = VALUES(dob), location = VALUES(location), job = VALUES(job), profile_image_url = VALUES(profile_image_url)
  `, [userId, profile.dob, profile.location, profile.job, imageUrl]);
};

export async function getUserTasks(userId: number) {
    const [rows] = await pool.query(
        `SELECT id, title, completed, progress, created_at, updated_at FROM ${userTasksTable} WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
}

// Create a new task for a user
export async function createUserTask(userId: number, title: string, progress: number = 0) {
    const [result] = await pool.query(
        `INSERT INTO ${userTasksTable} (user_id, title, progress) VALUES (?, ?, ?)`,
        [userId, title, progress]
    );
    return result;
}

// Update a task for a user
export async function updateUserTask(userId: number, taskId: number, updates: { title?: string, completed?: boolean, progress?: number }) {
    const fields = [];
    const values = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.completed !== undefined) { fields.push('completed = ?'); values.push(updates.completed); }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }
    if (!fields.length) return null;
    values.push(userId, taskId);
    const [result] = await pool.query(
        `UPDATE ${userTasksTable} SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`,
        values
    );
    return result;
}