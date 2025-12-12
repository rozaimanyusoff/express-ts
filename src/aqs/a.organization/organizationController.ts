import { Request, Response } from 'express';

import * as organizationModel from './organizationModel';

export const getAllOrganizations = async (req: Request, res: Response): Promise<Response> => {
    try {
        const organizations = await organizationModel.findAllOrganizations();
        
        return res.status(200).json({
            data: organizations,
            message: 'Organizations fetched successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to fetch organizations' });
    }
}

export const saveOrganization = async (req: Request, res: Response) => {
    const { code, description, name } = req.body;

    try {
        const result = await organizationModel.saveOrganization(name, code, description);

        return res.status(200).json({
            data: result,
            message: 'A new organization saved successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to save organization: '});
    }
}

export const updateOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, description, name } = req.body;

    try {
        const result = await organizationModel.updateOrganization(id, name, code, description);

        return res.status(200).json({
            data: result,
            message: 'Organization updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update organization: '});
    }
}

export const toggleOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await organizationModel.toggleOrganization(id, isActive);

        return res.status(200).json({
            data: result,
            message: 'Status organization updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update status organization: '});
    }
}