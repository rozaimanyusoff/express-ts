import { Request, Response } from 'express';
import * as roleModel from './roleModel';

export const getAllRoles = async (req: Request, res: Response): Promise<Response> => {
    try {
        const roles = await roleModel.findAllRoles();
        
        return res.status(200).json({
            success: true,
            message: 'Roles fetched successfully',
            data: roles
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch roles', error: (error as Error).message });
    }
}
