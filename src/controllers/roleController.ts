import { Request, Response } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole } from '../models/roleModel';

// Get all roles
export const getAllRole = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const roles = await getAllRoles();
        return res.status(200).json({ success: true, roles });
    } catch (error) {
        console.error('Error getting all roles:', error);
        return res.status(500).json({ error: 'Internal server error' });
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