import {pool} from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import logger from '../utils/logger';

export interface Group {
    id: number;
    name: string;
    desc: string;
    status: number;
    created_at: string;
}

export interface UserGroup {
    id: number;
    user_id: number;
    group_id: number;
}

// Get all groups
export const getAllGroups = async (): Promise<Group[]> => {
    try {
        const [rows]: any[] = await pool.query('SELECT * FROM auth.groups');
        return rows;
    } catch (error) {
        console.error('Error getting all groups:', error);
        throw error;
    }
}

// Get group by id
export const getGroupById = async (id: number): Promise<Group> => {
    try {
        const [rows]: any[] = await pool.query('SELECT * FROM auth.groups WHERE id = ?', [id]);
        return rows[0];
    } catch (error) {
        console.error('Error getting group by id:', error);
        throw error;
    }
}

// Create new group
export const createGroup = async (group: Omit<Group, 'id' | 'created_at'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO auth.groups (name, description, status) VALUES (?, ?, ?)',
        [group.name, group.desc, group.status]
    );
    return result;
};

// Update group
export const updateGroup = async (id: number, group: Omit<Group, 'id' | 'created_at'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        'UPDATE auth.groups SET name = ?, description = ?, status = ? WHERE id = ?',
        [group.name, group.desc, group.status, id]
    );
    return result;
};

// Get groups by user ID
export const getGroupsByUserId = async (userId: number): Promise<number[]> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT group_id FROM user_groups WHERE user_id = ?',
            [userId]
        );
        return rows.map((row) => (row as { group_id: number }).group_id);
    } catch (error) {
        logger.error(`Database error in getGroupsByUserId: ${error}`);
        throw error;
    }
}

// Assign default group to user by user ID
export const assignGroupByUserId = async (userId: number, groupId: number = 5): Promise<void> => {
    try {
        await pool.query(
            'INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
            [userId, groupId]
        );
    } catch (error) {
        logger.error(`Database error in assignGroupByUserId: ${error}`);
        throw error;
    }
};

// Assign users to a group (remove old, add new)
export const assignUserToGroups = async (groupId: number, userIds: number[]): Promise<void> => {
    // Remove all users from this group
    await pool.query('DELETE FROM user_groups WHERE group_id = ?', [groupId]);
    // Add new users
    if (userIds.length > 0) {
        const values = userIds.map(userId => [userId, groupId]);
        await pool.query('INSERT INTO user_groups (user_id, group_id) VALUES ?', [values]);
    }
};

// Update navigation permissions for a group (remove old, add new)
export const setNavigationPermissionsForGroup = async (groupId: number, navIds: number[]): Promise<void> => {
    // Remove all nav permissions for this group
    await pool.query('DELETE FROM auth.group_nav WHERE group_id = ?', [groupId]);
    // Add new nav permissions
    if (navIds.length > 0) {
        const values = navIds.map(navId => [navId, groupId]);
        await pool.query('INSERT INTO auth.group_nav (nav_id, group_id) VALUES ?', [values]);
    }
};