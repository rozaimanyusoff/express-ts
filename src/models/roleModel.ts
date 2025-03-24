import pool from "../utils/db";


export interface Role {
    id: number;
    name: string;
    desc: string;
    can_view: number;
    can_edit: number;
    can_delete: number;
    status: number;
    created_at: Date;
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
export const createRole = async (role: Role): Promise<any> => {
    try {
        const [result]: any = await pool.query(
            'INSERT INTO roles (name, desc, can_view, can_edit, can_delete, status) VALUES (?, ?, ?, ?, ?, ?)',
            [role.name, role.desc, role.can_view, role.can_edit, role.can_delete, role.status]
        );
        return result;
    } catch (error) {
        console.error('Error creating role:', error);
        throw error;
    }
}

// Update role
export const updateRole = async (id: number, role: Role): Promise<any> => {
    try {
        const [result]: any = await pool.query(
            'UPDATE roles SET name = ?, desc = ?, can_view = ?, can_edit = ?, can_delete = ?, status = ? WHERE id = ?',
            [role.name, role.desc, role.can_view, role.can_edit, role.can_delete, role.status, id]
        );
        return result;
    } catch (error) {
        console.error('Error updating role:', error);
        throw error;
    }
};

