import bcrypt from 'bcrypt';
import fs from 'fs';
import { ResultSetHeader } from "mysql2";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Purpose: Model for user operations.
import {pool} from '../utils/db';
import logger from '../utils/logger';
const { compare, hash } = bcrypt;

// DB and table variables for easier maintenance
const DB_NAME = process.env.DB_NAME || 'auth';
const usersTable = 'users';
const userGroupsTable = 'user_groups';
const userProfileTable = 'user_profile';
const userTasksTable = 'user_tasks';
const workflowTable = 'workflows';
const moduleTable = 'modules';
const moduleMembersTable = 'module_members';
const permissionTable = 'permissions';

// UserProfile interface and profile helpers
export interface UserProfile {
    dob: null | string;
    job: null | string;
    location: null | string;
    profile_image_url: null | string;
    user_id: number;
}

// Define the interface
export interface Users {
    activated_at: Date | null;
    activation_code: null | string;
    avatar?: null | string;
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
    role: number; // role id, now references roles table with new schema
    status: number;
    user_type: number;
    usergroups: null | string; // comma-separated group IDs
    username: string;
}

// Helper to prepend backend URL to image path if needed
function getFullImageUrl(imagePath: null | string): null | string {
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
            activated_at: user.activated_at ? new Date(user.activated_at) : null,
            activation_code: user.activation_code,
            contact: user.contact,
            created_at: new Date(user.created_at),
            email: user.email,
            fname: user.fname,
            id: user.id,
            last_host: user.last_host,
            last_ip: user.last_ip,
            last_login: user.last_login ? new Date(user.last_login) : null,
            last_nav: user.last_nav,
            last_os: user.last_os,
            password: '', // Password is omitted for security
            reset_token: user.reset_token,
            role: user.role,
            status: user.status,
            user_type: user.user_type,
            usergroups: user.usergroups || null, // Map usergroups as a string
            username: user.username,
        }));
    } catch (error) {
        logger.error(`Database error in getAllUsers: ${error}`);
        throw error;
    }
};

// Get single user by id (minimal fields)
export const getUserById = async (userId: number): Promise<null | Users> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT id, username, email, contact, user_type, role, status, last_login, last_nav FROM ${usersTable} WHERE id = ? LIMIT 1`,
            [userId]
        );
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const u = rows[0];
        return {
            activated_at: null,
            activation_code: null,
            contact: u.contact,
            created_at: new Date(),
            email: u.email,
            fname: '',
            id: u.id,
            last_host: null,
            last_ip: null,
            last_login: u.last_login ? new Date(u.last_login) : null,
            last_nav: u.last_nav,
            last_os: null,
            password: '',
            reset_token: null,
            role: u.role,
            status: u.status,
            user_type: u.user_type,
            usergroups: null,
            username: u.username,
        } as Users;
    } catch (error) {
        logger.error(`Database error in getUserById: ${error}`);
        throw error;
    }
};

// Get employee by ramco_id from employees table (the correct source for owner data in maintenance billings)
export const getEmployeeByRamcoId = async (ramcoId: string | null | undefined): Promise<any> => {
    if (!ramcoId || typeof ramcoId !== 'string') return null;
    try {
        const [rows]: any[] = await pool.query(
            `SELECT id, ramco_id, full_name, email, contact FROM assets.employees 
             WHERE ramco_id = ? LIMIT 1`,
            [ramcoId]
        );
        return rows[0] || null;
    } catch (error) {
        logger.error(`Database error in getEmployeeByRamcoId for ${ramcoId}: ${error}`);
        return null;
    }
};

// Get module member and user data by ramco_id with fallback strategies
export const getModuleMemberByRamcoId = async (ramcoId: string | null | undefined): Promise<any> => {
    if (!ramcoId || typeof ramcoId !== 'string') return null;
    try {
        // Strategy 1: Try module_members with user join
        const [rows]: any[] = await pool.query(
            `SELECT mm.*, u.fname, u.username, u.email 
             FROM ${moduleMembersTable} mm
             LEFT JOIN ${usersTable} u ON mm.manager_id = u.id
             WHERE mm.ramco_id = ? LIMIT 1`,
            [ramcoId]
        );
        
        // If found and has fname, return it
        if (rows[0] && rows[0].fname) {
            return rows[0];
        }
        
        // Strategy 2: If no result or fname is null, try to find user directly
        // Search for users by contact number matching ramco_id pattern or by email containing ramco_id
        const [userRows]: any[] = await pool.query(
            `SELECT id, fname, username, email FROM ${usersTable} 
             WHERE contact LIKE ? OR username LIKE ? OR email LIKE ?
             LIMIT 1`,
            [`%${ramcoId}%`, `%${ramcoId}%`, `%${ramcoId}%`]
        );
        
        if (userRows[0]) {
            // Return with user data found
            return {
                ...rows[0],
                fname: userRows[0].fname,
                username: userRows[0].username,
                email: userRows[0].email
            };
        }
        
        // If still no fname found, return the module_members record (fname will be null)
        return rows[0] || null;
    } catch (error) {
        logger.error(`Database error in getModuleMemberByRamcoId for ${ramcoId}: ${error}`);
        return null;
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
export const validateActivation = async (email: string, contact: string, activationCode: string): Promise<{ error?: unknown; user?: any; valid: boolean; }> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT * FROM ${usersTable} WHERE email = ? AND contact = ? AND activation_code = ?`,
            [email, contact, activationCode]
        );
        return {
            user: rows[0],
            valid: Array.isArray(rows) && rows.length > 0,
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
): Promise<{ error?: unknown; message?: string; success: boolean; user?: Users; }> => {
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
            return { message: 'Invalid credentials', success: false };
        }

        const user = rows[0];
        const passwordMatch = await compare(password, user.password);

        if (!passwordMatch) {
            return { message: 'Invalid credentials', success: false };
        }

        if (user.status !== 1) {
            return { message: 'Account is inactive', success: false };
        }

        delete user.password;

        const formattedUser: Users = {
            activated_at: user.activated_at ? new Date(user.activated_at) : null,
            activation_code: user.activation_code,
            avatar: user.avatar || null,
            contact: user.contact,
            created_at: new Date(user.created_at),
            email: user.email,
            fname: user.fname,
            id: user.id,
            last_host: user.last_host,
            last_ip: user.last_ip,
            last_login: user.last_login ? new Date(user.last_login) : null,
            last_nav: user.last_nav,
            last_os: user.last_os,
            password: '', // Password is removed for security
            reset_token: user.reset_token,
            role: user.role,
            status: user.status,
            user_type: user.user_type,
            usergroups: user.usergroups || null, // Map usergroups as a string
            username: user.username,
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
export const findUserByResetToken = async (resetToken: string): Promise<null | Users> => {
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
export const updateUserResetTokenAndStatus = async (userId: number, resetToken: string | null, status: number): Promise<void> => {
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
export const updateUser = async (userId: number, { role, status, user_type }: Users): Promise<void> => {
    // Backward-compatible wrapper around updateUserFields
    await updateUserFields(userId, { role, status, user_type });
};

// Allow controllers to update any subset of allowed fields dynamically
export type UpdatableUserFields = Partial<{
    avatar: null | string;
    contact: null | string;
    email: null | string;
    fname: null | string;
    last_nav: null | string;
    role: null | number;
    status: null | number;
    user_type: null | number;
}>;

export const updateUserFields = async (userId: number, fields: UpdatableUserFields): Promise<number> => {
    try {
        const keys = Object.keys(fields) as (keyof UpdatableUserFields)[];
        const updates: string[] = [];
        const values: any[] = [];
        for (const k of keys) {
            if (fields[k] !== undefined) {
                updates.push(`${k} = ?`);
                values.push((fields as any)[k]);
            }
        }
        if (updates.length === 0) return 0;
        values.push(userId);
        const sql = `UPDATE ${usersTable} SET ${updates.join(', ')} WHERE id = ?`;
        const [res]: any = await pool.query(sql, values);
        return res?.affectedRows || 0;
    } catch (error) {
        logger.error(`Database error in updateUserFields: ${error}`);
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

// Update user's avatar (and optionally contact)
export const updateUserAvatar = async (userId: number, avatarPath?: null | string, contact?: null | string): Promise<void> => {
    const fields: string[] = [];
    const values: any[] = [];
    if (avatarPath !== undefined) { fields.push('avatar = ?'); values.push(avatarPath); }
    if (contact !== undefined) { fields.push('contact = ?'); values.push(contact); }
    if (fields.length === 0) return; // nothing to update
    values.push(userId);
    const sql = `UPDATE ${usersTable} SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(sql, values);
};

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
    { host, ip, os }: { host: null | string; ip: null | string | string[]; os: null | string }
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

// Update user logout and time spent
export const updateUserLogoutAndTimeSpent = async (userId: number): Promise<void> => {
    try {
        // Get user's last_login timestamp
        const [rows]: any[] = await pool.query(
            `SELECT last_login, time_spent FROM ${usersTable} WHERE id = ?`,
            [userId]
        );
        
        if (!rows || rows.length === 0) {
            logger.warn(`User ${userId} not found for logout update`);
            return;
        }
        
        const user = rows[0];
        let sessionSeconds = 0;
        
        // Calculate session duration from last_login to now
        if (user.last_login) {
            const loginTime = new Date(user.last_login).getTime();
            const now = Date.now();
            sessionSeconds = Math.max(0, Math.floor((now - loginTime) / 1000));
        }
        
        // Update user with new logout time and accumulated time_spent
        const newTimeSpent = (user.time_spent || 0) + sessionSeconds;
        
        await pool.query(
            `UPDATE ${usersTable} SET last_logout = NOW(), time_spent = ? WHERE id = ?`,
            [newTimeSpent, userId]
        );
        
        logger.info(`Updated user ${userId} logout: session=${sessionSeconds}s, total_time=${newTimeSpent}s`);
    } catch (error) {
        logger.error(`Database error in updateUserLogoutAndTimeSpent: ${error}`);
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

// Delete a single user and related records
export const deleteUser = async (userId: number): Promise<void> => {
    try {
        // Delete from related tables first (cascade)
        await pool.query(`DELETE FROM ${userGroupsTable} WHERE user_id = ?`, [userId]);
        await pool.query(`DELETE FROM ${userProfileTable} WHERE user_id = ?`, [userId]);
        await pool.query(`DELETE FROM ${userTasksTable} WHERE user_id = ?`, [userId]);
        
        // Finally delete the user
        await pool.query(`DELETE FROM ${usersTable} WHERE id = ?`, [userId]);
        logger.info(`Deleted user ${userId} and related records`);
    } catch (error) {
        logger.error(`Database error in deleteUser: ${error}`);
        throw error;
    }
};

// Delete multiple users and related records
export const deleteUsers = async (userIds: number[]): Promise<void> => {
    if (!userIds.length) return;
    try {
        const placeholders = userIds.map(() => '?').join(',');
        
        // Delete from related tables first (cascade)
        await pool.query(`DELETE FROM ${userGroupsTable} WHERE user_id IN (${placeholders})`, userIds);
        await pool.query(`DELETE FROM ${userProfileTable} WHERE user_id IN (${placeholders})`, userIds);
        await pool.query(`DELETE FROM ${userTasksTable} WHERE user_id IN (${placeholders})`, userIds);
        
        // Finally delete the users
        await pool.query(`DELETE FROM ${usersTable} WHERE id IN (${placeholders})`, userIds);
        logger.info(`Deleted ${userIds.length} users and their related records`);
    } catch (error) {
        logger.error(`Database error in deleteUsers: ${error}`);
        throw error;
    }
};

// Get admin user IDs
export const getAdminUserIds = async (): Promise<number[]> => {
    const [rows]: any[] = await pool.query(`SELECT id FROM ${usersTable} WHERE role = 1`);
    return rows.map((row: any) => row.id);
};

// Set or clear the user's current session token
export const setUserSessionToken = async (userId: number, token: null | string): Promise<void> => {
    await pool.query(`UPDATE ${usersTable} SET current_session_token = ? WHERE id = ?`, [token, userId]);
};

// Get the user's current session token
export const getUserSessionToken = async (userId: number): Promise<null | string> => {
    const [rows]: any[] = await pool.query(`SELECT current_session_token FROM ${usersTable} WHERE id = ?`, [userId]);
    return rows[0]?.current_session_token || null;
};

// Get user profile
export const getUserProfile = async (userId: number): Promise<null | UserProfile> => {
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
            const matches = /^data:(.+);base64,(.+)$/.exec(profile.profileImage);
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

// Create a new task for a user
export async function createUserTask(userId: number, title: string, progress = 0) {
    const [result] = await pool.query(
        `INSERT INTO ${userTasksTable} (user_id, title, progress) VALUES (?, ?, ?)`,
        [userId, title, progress]
    );
    return result;
}

export async function getUserTasks(userId: number) {
    const [rows] = await pool.query(
        `SELECT id, title, completed, progress, created_at, updated_at FROM ${userTasksTable} WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
}

// Update a task for a user
export async function updateUserTask(userId: number, taskId: number, updates: { completed?: boolean, progress?: number; title?: string, }) {
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

/* ======= WORKFLOWS CRUD =======
id INT AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,        -- e.g., 'billing', 'purchase_order'
    level_order INT NOT NULL,                 -- sequence (1=lowest, N=highest)
    ramco_id VARCHAR(50) NOT NULL,          -- short code, e.g., 'PREP', 'VER', 'APP'
    level_name VARCHAR(100) NOT NULL,         -- descriptive name, e.g., 'Prepare'
    description TEXT NULL,                    -- optional: explanation of role
    is_active TINYINT(1) DEFAULT 1,           -- allow enabling/disabling
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
*/
export const createWorkflow = async (data: any): Promise<number> => {
    // Expected payload:
    // {
    //   module_name: string,
    //   description?: string,
    //   is_active?: boolean,
    //   employees: Array<{ ramco_id: string | number; level_name: string; department_id?: number }>
    // }
    // OR (legacy format):
    // {
    //   employees: Array<{ employee_ramco_id: string; authorize_level: string }>
    // }
    const conn = await pool.getConnection();
    try {
        const moduleName = String(data?.module_name || '').trim();
        if (!moduleName) throw new Error('module_name is required');
        const description = data?.description ?? null;
        const isActive = data?.is_active === false ? 0 : 1;
        const employees = Array.isArray(data?.employees) ? data.employees : [];
        if (employees.length === 0) throw new Error('employees array is required');

        // Map common authorize levels to stable ordering; fallback to index order
        const orderMap: Record<string, number> = {
            approval: 3,
            approve: 3,
            recommender: 2,
            recommend: 2,
            verifier: 1,
            verify: 1
        };

        // Build rows to insert
        const rows = employees.map((e: any, idx: number) => {
            // Support both field name formats: level_name (new) or authorize_level (legacy)
            const levelName = String(e?.level_name ?? e?.authorize_level ?? '').trim();
            const levelOrder = orderMap[levelName.toLowerCase()] ?? (idx + 1);
            // Support both field name formats: ramco_id (new) or employee_ramco_id (legacy)
            const ramcoId = String(e?.ramco_id ?? e?.employee_ramco_id ?? '').trim();
            if (!ramcoId) throw new Error(`employees[${idx}].ramco_id is required`);
            // Get department_id from each employee object (allows per-employee department configuration)
            const departmentId = e?.department_id ?? null;
            return {
                department_id: departmentId,
                description,
                is_active: isActive,
                level_name: levelName || `Level ${levelOrder}`,
                level_order: levelOrder,
                module_name: moduleName,
                ramco_id: ramcoId
            };
        });

        await conn.beginTransaction();

        const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',');
        const params: any[] = [];
        for (const r of rows) {
            params.push(r.module_name, r.level_order, r.ramco_id, r.level_name, r.description, r.is_active, r.department_id);
        }

        const [result] = await conn.query(
            `INSERT INTO ${workflowTable} (module_name, level_order, ramco_id, level_name, description, is_active, department_id, created_at, updated_at)
             VALUES ${placeholders}`,
            params
        );

        await conn.commit();

        const res = result as ResultSetHeader & { affectedRows?: number };
        const firstId = Number(res.insertId) || 0;
        const count = Number((res as any).affectedRows) || rows.length;
        // MySQL returns the first insertId for multi-row insert; derive the IDs range if available
        // Note: This assumes AUTO_INCREMENT increments by 1.
        const workflowIds = firstId > 0 ? Array.from({ length: count }, (_, i) => firstId + i) : [];
        // Return number of created rows (controller may choose to expose IDs)
        return count as unknown as number;
    } catch (err) {
        try { await conn.rollback(); } catch {}
        throw err;
    } finally {
        conn.release();
    }
};

export const getWorkflows = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${workflowTable}`);
    return rows;
};

export const getWorkflowById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${workflowTable} WHERE id = ?`, [id]) as [any[], any];
    return rows[0] || null;
};

export const updateWorkflow = async (id: number, data: any): Promise<void> => {
    const [result] = await pool.query(`
        UPDATE ${workflowTable} SET module_name = ?, level_order = ?, ramco_id = ?, level_name = ?, description = ?, is_active = ?, department_id = ?, updated_at = NOW()
        WHERE id = ?`, 
        [data.module_name, data.level_order, data.ramco_id, data.level_name, data.description, data.is_active, data.department_id, id]
    );
};

export const deleteWorkflow = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${workflowTable} WHERE id = ?`, [id]);
    return result;
};

export const deleteWorkflowByModule = async (moduleName: string): Promise<number> => {
    const [result] = await pool.query(`DELETE FROM ${workflowTable} WHERE module_name = ?`, [moduleName]);
    return (result as ResultSetHeader).affectedRows || 0;
};

// Reorder workflows: accepts either array of ids (implied order) or array of { id, level_order }
export const reorderWorkflows = async (payload: { items: (number | { id: number; level_order: number })[]; module_name?: string; }): Promise<number> => {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error('items array is required');
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Normalize to {id, level_order}
        let normalized: { id: number; level_order: number }[] = [];
        if (typeof payload.items[0] === 'number') {
            normalized = (payload.items as number[]).map((id, idx) => ({ id, level_order: idx + 1 }));
        } else {
            normalized = (payload.items as { id: number; level_order: number }[]).map(x => ({ id: Number(x.id), level_order: Number(x.level_order) }))
                .filter(x => Number.isFinite(x.id) && Number.isFinite(x.level_order));
        }
        if (normalized.length === 0) throw new Error('No valid items to reorder');

        let updated = 0;
        for (const item of normalized) {
            if (payload.module_name) {
                const [res] = await conn.query(`UPDATE ${workflowTable} SET level_order = ?, updated_at = NOW() WHERE id = ? AND module_name = ?`, [item.level_order, item.id, payload.module_name]);
                updated += (res as ResultSetHeader).affectedRows || 0;
            } else {
                const [res] = await conn.query(`UPDATE ${workflowTable} SET level_order = ?, updated_at = NOW() WHERE id = ?`, [item.level_order, item.id]);
                updated += (res as ResultSetHeader).affectedRows || 0;
            }
        }

        await conn.commit();
        return updated;
    } catch (err) {
        try { await conn.rollback(); } catch {}
        throw err;
    } finally {
        conn.release();
    }
};


/* ===== MODULES ======= */
export interface Module {
    created_at: Date;
    description: string;
    id: number;
    name: string;
    updated_at: Date;
}

export const getAllModules = async (): Promise<Module[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${moduleTable}`);
    return rows as Module[];
};

export const getModuleById = async (id: number): Promise<Module | null> => {
    const [rows]: any[] = await pool.query(`SELECT * FROM ${moduleTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? (rows[0] as Module) : null;
};

export const createModule = async (name: string, description: string): Promise<number> => {
    const [result] = await pool.query(`
        INSERT INTO ${moduleTable} (name, description, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW())`,
        [name, description]
    );
    return (result as ResultSetHeader).insertId;
};

export const updateModule = async (id: number, name: string, description: string): Promise<void> => {
    await pool.query(`
        UPDATE ${moduleTable} SET name = ?, description = ?, updated_at = NOW()
        WHERE id = ?`,
        [name, description, id]
    );
};

export const deleteModule = async (id: number): Promise<void> => {
    await pool.query(`DELETE FROM ${moduleTable} WHERE id = ?`, [id]);
};

// MODULE MEMBERS CRUD
export interface ModuleMember {
    id: number;
    module_id: number;
    permission_id: number;
    ramco_id: string;
}

export const getModuleMembers = async (): Promise<ModuleMember[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${moduleMembersTable}`);
    return rows as ModuleMember[];
};

export const getModuleMembersByModule = async (moduleId: number): Promise<ModuleMember[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${moduleMembersTable} WHERE module_id = ?`, [moduleId]);
    return rows as ModuleMember[];
};

export const getModuleMembersByRamco = async (ramcoId: string): Promise<ModuleMember[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${moduleMembersTable} WHERE ramco_id = ?`, [ramcoId]);
    return rows as ModuleMember[];
};

export const addModuleMember = async (ramco_id: string, module_id: number, permission_id: number): Promise<number> => {
    const [result] = await pool.query(`INSERT INTO ${moduleMembersTable} (ramco_id, module_id, permission_id) VALUES (?, ?, ?)`, [ramco_id, module_id, permission_id]);
    return (result as ResultSetHeader).insertId;
};

export const updateModuleMember = async (id: number, data: Partial<ModuleMember>) => {
    const { module_id, permission_id, ramco_id } = data as any;
    const [result] = await pool.query(`UPDATE ${moduleMembersTable} SET ramco_id = ?, module_id = ?, permission_id = ? WHERE id = ?`, [ramco_id, module_id, permission_id, id]);
    return result;
};

export const deleteModuleMember = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${moduleMembersTable} WHERE id = ?`, [id]);
    return result;
};

// PERMISSIONS
export interface Permission {
    description?: null | string;
    id: number;
    name: string;
}

export const getPermissions = async (): Promise<Permission[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${permissionTable} ORDER BY id`);
    return rows as Permission[];
};

export const getPermissionsByIds = async (ids: number[]): Promise<Permission[]> => {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(`SELECT * FROM ${permissionTable} WHERE id IN (${placeholders})`, ids);
    return rows as Permission[];
};

export const getPermissionById = async (id: number): Promise<null | Permission> => {
    const [rows]: any[] = await pool.query(`SELECT * FROM ${permissionTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] as Permission : null;
};

export const createPermission = async (data: { category?: null | string; code: string; description?: null | string; is_active?: number; name: string; }): Promise<number> => {
    const { category = null, code, description = null, is_active = 1, name } = data;
    const [result] = await pool.query(`INSERT INTO ${permissionTable} (code, name, description, category, is_active) VALUES (?, ?, ?, ?, ?)`, [code, name, description, category, is_active]);
    return (result as ResultSetHeader).insertId;
};

export const updatePermission = async (id: number, data: Partial<{ category?: null | string; code: string; description?: null | string; is_active?: number; name: string; }>) => {
    const { category = null, code, description = null, is_active = 1, name } = data as any;
    const [result] = await pool.query(`UPDATE ${permissionTable} SET code = ?, name = ?, description = ?, category = ?, is_active = ? WHERE id = ?`, [code, name, description, category, is_active, id]);
    return result;
};

export const deletePermission = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${permissionTable} WHERE id = ?`, [id]);
    return result;
};

// Get user by username or email
export const getUserByUsernameOrEmail = async (emailOrUsername: string): Promise<null | Users> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT id, username, email, contact, user_type, role, status, fname, last_login, last_nav, activated_at, activation_code, avatar FROM ${usersTable} WHERE username = ? OR email = ? LIMIT 1`,
            [emailOrUsername, emailOrUsername]
        );
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const u = rows[0];
        return {
            activated_at: u.activated_at ? new Date(u.activated_at) : null,
            activation_code: u.activation_code,
            avatar: u.avatar,
            contact: u.contact,
            created_at: new Date(),
            email: u.email,
            fname: u.fname,
            id: u.id,
            last_host: null,
            last_ip: null,
            last_login: u.last_login ? new Date(u.last_login) : null,
            last_nav: u.last_nav,
            last_os: null,
            password: '',
            reset_token: null,
            role: u.role,
            status: u.status,
            user_type: u.user_type,
            usergroups: null,
            username: u.username,
        } as Users;
    } catch (error) {
        logger.error(`Database error in getUserByUsernameOrEmail: ${error}`);
        throw error;
    }
};

// Store admin pincode with expiration (15 minutes)
export const storeAdminPincode = async (userId: number, pincode: string, expiryMinutes: number = 15): Promise<void> => {
    try {
        const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
        // Use reset_token field to temporarily store pincode with hash
        const hashedPincode = await hash(pincode, 10);
        await pool.query(
            `UPDATE ${usersTable} SET reset_token = ? WHERE id = ?`,
            [hashedPincode, userId]
        );
        // You may want to add a log or tracking for this
        logger.info(`Admin pincode generated for user ${userId}, expires at ${expiryTime.toISOString()}`);
    } catch (error) {
        logger.error(`Database error in storeAdminPincode: ${error}`);
        throw error;
    }
};

// Verify admin pincode
export const verifyAdminPincode = async (userId: number, pincode: string): Promise<boolean> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT reset_token FROM ${usersTable} WHERE id = ? LIMIT 1`,
            [userId]
        );
        if (!Array.isArray(rows) || rows.length === 0) return false;
        const storedHash = rows[0].reset_token;
        if (!storedHash) return false;
        return await compare(pincode, storedHash);
    } catch (error) {
        logger.error(`Database error in verifyAdminPincode: ${error}`);
        throw error;
    }
};

// Clear admin pincode after verification
export const clearAdminPincode = async (userId: number): Promise<void> => {
    try {
        await pool.query(
            `UPDATE ${usersTable} SET reset_token = NULL WHERE id = ?`,
            [userId]
        );
    } catch (error) {
        logger.error(`Database error in clearAdminPincode: ${error}`);
        throw error;
    }
};

