import { ResultSetHeader } from "mysql2";

import {pool} from "../utils/db";

export interface Role {
    create_at: Date;
    creates: number;
    deletes: number;
    desc?: string;
    id: number;
    name: string;
    status: number;
    update_at: Date;
    updates: number;
    views: number;
}

// Get all roles
export const getAllRoles = async (): Promise<Role[]> => {
    try {
        const [rows]: any[] = await pool.query('SELECT * FROM roles');
        return rows;
    } catch (error) {
        console.error('Error getting all roles:', error);
        throw error;
    }
};

// Get role by id
export const getRoleById = async (id: number): Promise<Role> => {
    try {
        const [rows]: any[] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
        return rows[0];
    } catch (error) {
        console.error('Error getting role by id:', error);
        throw error;
    }
};

// Create new role
export const createRole = async (role: Omit<Role, 'create_at' | 'id' | 'update_at'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO roles (name, `desc`, views, creates, updates, deletes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [role.name, role.desc, role.views, role.creates, role.updates, role.deletes, role.status]
    );
    return result;
};

// Update role
export const updateRole = async (id: number, role: Omit<Role, 'create_at' | 'id' | 'update_at'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        'UPDATE roles SET name = ?, `desc` = ?, views = ?, creates = ?, updates = ?, deletes = ?, status = ? WHERE id = ?',
        [role.name, role.desc, role.views, role.creates, role.updates, role.deletes, role.status, id]
    );
    return result;
};

