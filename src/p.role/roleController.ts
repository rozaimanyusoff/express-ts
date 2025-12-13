import { Request, Response } from 'express';

import { updateUsersRole } from '../p.user/userModel.js';
import { createRole, getAllRoles, getRoleById, updateRole } from './roleModel.js';

// Get all roles
export const getAllRole = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const roles = await getAllRoles();
        // Get all users to map them to roles
        const { getAllUsers } = await import('../p.user/userModel.js');
        const users = await getAllUsers();

        // Map roles to API structure
        const data = roles.map((role: any) => {
            // Permissions as object
            const permissions = {
                create: !!role.creates,
                delete: !!role.deletes,
                update: !!role.updates,
                view: !!role.views
            };

            // Find users for this role
            const roleUsers = users.filter((u: any) => u.role === role.id).map((u: any) => ({
                id: u.id,
                name: u.fname || u.name || u.username
            }));

            return {
                created_at: role.created_at ? new Date(role.created_at).toISOString() : null,
                description: role.desc || role.description || '',
                id: role.id,
                name: role.name,
                permissions,
                updated_at: role.updated_at ? new Date(role.updated_at).toISOString() : null,
                users: roleUsers
            };
        });
        return res.status(200).json({
            data,
            message: 'Role data fetched successful',
            success: true
        });
    } catch (error) {
        console.error('Error getting all roles:', error);
        return res.status(500).json({ error: (error as Error).message, message: 'Internal server error', success: false });
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
    const { description, name, permissions, userIds } = req.body;
    try {
        const roleData = {
            creates: permissions?.create ? 1 : 0,
            deletes: permissions?.delete ? 1 : 0,
            desc: description,
            name,
            status: 1,
            updates: permissions?.update ? 1 : 0,
            views: permissions?.view ? 1 : 0
        };
        const result = await createRole(roleData);
        const newRoleId = result.insertId;
        if (Array.isArray(userIds) && userIds.length > 0) {
            await updateUsersRole(userIds, newRoleId);
        }
        return res.status(201).json({ id: newRoleId, message: 'Role created successfully', success: true });
    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Update role
export const updateRoleById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { description, name, permissions, userIds } = req.body;
    try {
        const roleData = {
            creates: permissions?.create ? 1 : 0,
            deletes: permissions?.delete ? 1 : 0,
            desc: description,
            name,
            status: 1,
            updates: permissions?.update ? 1 : 0,
            views: permissions?.view ? 1 : 0
        };
        await updateRole(Number(id), roleData);
        if (Array.isArray(userIds)) {
            await updateUsersRole(userIds, Number(id));
        }
        return res.status(200).json({ id: Number(id), message: 'Role updated successfully', success: true });
    } catch (error) {
        console.error('Error updating role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};