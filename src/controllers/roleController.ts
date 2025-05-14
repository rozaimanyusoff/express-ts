import { Request, Response } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole } from '../models/roleModel.js';

// Get all roles
export const getAllRole = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const roles = await getAllRoles();
        // Get all users to map them to roles
        const { getAllUsers } = await import('../models/userModel.js');
        const users = await getAllUsers();

        // Map roles to API structure
        const data = roles.map((role: any) => {
            // Permissions as object
            const permissions = {
                view: !!role.views,
                create: !!role.creates,
                update: !!role.updates,
                delete: !!role.deletes
            };

            // Find users for this role
            const roleUsers = users.filter((u: any) => u.role === role.id).map((u: any) => ({
                id: u.id,
                name: u.fname || u.name || u.username
            }));

            return {
                id: role.id,
                name: role.name,
                description: role.desc || role.description || '',
                permissions,
                created_at: role.created_at ? new Date(role.created_at).toISOString() : null,
                updated_at: role.updated_at ? new Date(role.updated_at).toISOString() : null,
                users: roleUsers
            };
        });
        return res.status(200).json({
            success: true,
            message: 'Role data fetched successful',
            data
        });
    } catch (error) {
        console.error('Error getting all roles:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: (error as Error).message });
    }
}

// Get role by id
export const getRole = async (req: Request, res: Response): Promise<Response> => {  
    const { id } = req.params;

    try {
        const role = await getRoleById(Number(id));
        return res.status(200).json({ role });
    } catch (error) {
        console.error('Error getting role by id:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Create new role
export const createNewRole = async (req: Request, res: Response): Promise<Response> => {
    const role = req.body;

    try {
        const result = await createRole(role);
        return res.status(201).json({ result });
    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Update role
export const updateRoleById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const role = req.body;

    try {
        const result = await updateRole(Number(id), role);
        return res.status(200).json({ result });
    } catch (error) {
        console.error('Error updating role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};