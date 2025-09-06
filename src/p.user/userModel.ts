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
const DB_NAME = process.env.DB_NAME || 'auth';
const usersTable = 'users';
const userGroupsTable = 'user_groups';
const userProfileTable = 'user_profile';
const userTasksTable = 'user_tasks';
const approvalLevelsTable = 'approval_levels';
const moduleTable = 'modules';
const moduleMembersTable = 'module_members';
const permissionTable = 'permissions';

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

// Get single user by id (minimal fields)
export const getUserById = async (userId: number): Promise<Users | null> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT id, username, email, contact, user_type, role, status, last_login, last_nav FROM ${usersTable} WHERE id = ? LIMIT 1`,
            [userId]
        );
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const u = rows[0];
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            password: '',
            created_at: new Date(),
            activation_code: null,
            fname: '',
            contact: u.contact,
            user_type: u.user_type,
            last_login: u.last_login ? new Date(u.last_login) : null,
            last_nav: u.last_nav,
            last_ip: null,
            last_host: null,
            last_os: null,
            status: u.status,
            role: u.role,
            usergroups: null,
            reset_token: null,
            activated_at: null,
        } as Users;
    } catch (error) {
        logger.error(`Database error in getUserById: ${error}`);
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

/* ======= APPROVAL LEVELS CRUD =======
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
export const createApprovalLevel = async (data: any): Promise<number> => {
    const [result] = await pool.query(`
        INSERT INTO ${approvalLevelsTable} (module_name, level_order, ramco_id, level_name, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, 
        [data.module_name, data.level_order, data.employee_ramco_id, data.level_name, data.description, data.is_active]
    );
    return (result as ResultSetHeader).insertId;
};

export const getApprovalLevels = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${approvalLevelsTable}`);
    return rows;
};

export const getApprovalLevelById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${approvalLevelsTable} WHERE id = ?`, [id]) as [any[], any];
    return rows[0] || null;
};

export const updateApprovalLevel = async (id: number, data: any): Promise<void> => {
    const [result] = await pool.query(`
        UPDATE ${approvalLevelsTable} SET module_name = ?, level_order = ?, ramco_id = ?, level_name = ?, description = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?`, 
        [data.module_name, data.level_order, data.employee_ramco_id, data.level_name, data.description, data.is_active, id]
    );
};

export const deleteApprovalLevel = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${approvalLevelsTable} WHERE id = ?`, [id]);
    return result;
};


/* ===== MODULES ======= */
export interface Module {
    id: number;
    name: string;
    description: string;
    created_at: Date;
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
    ramco_id: string;
    module_id: number;
    permission_id: number;
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
    const { ramco_id, module_id, permission_id } = data as any;
    const [result] = await pool.query(`UPDATE ${moduleMembersTable} SET ramco_id = ?, module_id = ?, permission_id = ? WHERE id = ?`, [ramco_id, module_id, permission_id, id]);
    return result;
};

export const deleteModuleMember = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${moduleMembersTable} WHERE id = ?`, [id]);
    return result;
};

// PERMISSIONS
export interface Permission {
    id: number;
    name: string;
    description?: string | null;
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

export const getPermissionById = async (id: number): Promise<Permission | null> => {
    const [rows]: any[] = await pool.query(`SELECT * FROM ${permissionTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] as Permission : null;
};

export const createPermission = async (data: { code: string; name: string; description?: string | null; category?: string | null; is_active?: number }): Promise<number> => {
    const { code, name, description = null, category = null, is_active = 1 } = data;
    const [result] = await pool.query(`INSERT INTO ${permissionTable} (code, name, description, category, is_active) VALUES (?, ?, ?, ?, ?)`, [code, name, description, category, is_active]);
    return (result as ResultSetHeader).insertId;
};

export const updatePermission = async (id: number, data: Partial<{ code: string; name: string; description?: string | null; category?: string | null; is_active?: number }>) => {
    const { code, name, description = null, category = null, is_active = 1 } = data as any;
    const [result] = await pool.query(`UPDATE ${permissionTable} SET code = ?, name = ?, description = ?, category = ?, is_active = ? WHERE id = ?`, [code, name, description, category, is_active, id]);
    return result;
};

export const deletePermission = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${permissionTable} WHERE id = ?`, [id]);
    return result;
};

