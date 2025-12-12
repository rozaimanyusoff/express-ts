import { Request, Response } from 'express';
import * as organizationModel from './organizationModel';

export const getAllOrganizations = async (req: Request, res: Response): Promise<Response> => {
    try {
        const organizations = await organizationModel.findAllOrganizations();
        
        return res.status(200).json({
            success: true,
            message: 'Organizations fetched successfully',
            data: organizations
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch organizations', error: (error as Error).message });
    }
}

export const saveOrganization = async (req: Request, res: Response) => {
    const { name, code, description } = req.body;

    try {
        const result = await organizationModel.saveOrganization(name, code, description);

        return res.status(200).json({
            success: true,
            message: 'A new organization saved successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save organization: ', error: (error as Error).message});
    }
}

export const updateOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, code, description } = req.body;

    try {
        const result = await organizationModel.updateOrganization(id, name, code, description);

        return res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update organization: ', error: (error as Error).message});
    }
}

export const toggleOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await organizationModel.toggleOrganization(id, isActive);

        return res.status(200).json({
            success: true,
            message: 'Status organization updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update status organization: ', error: (error as Error).message});
    }
}