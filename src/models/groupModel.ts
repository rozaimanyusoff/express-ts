import pool from "../utils/db";
import { ResultSetHeader } from "mysql2";

export interface Group {
    id: number;
    name: string;
    desc: string;
    status: number;
    created_at: string;
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
        'INSERT INTO auth.groups (name, desc, status) VALUES (?, ?, ?)',
        [group.name, group.desc, group.status]
    );
    return result;
};

// Update group
export const updateGroup = async (id: number, group: Omit<Group, 'id' | 'created_at'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        'UPDATE auth.groups SET name = ?, desc = ?, status = ? WHERE id = ?',
        [group.name, group.desc, group.status, id]
    );
    return result;
};