import { Request, Response } from 'express';

import * as moduleModel from './moduleModel';

export const getAllModules = async (req: Request, res: Response): Promise<Response> => {
    try {
        const modules = await moduleModel.findAllModules();
        
        return res.status(200).json({
            data: modules,
            message: 'Modules fetched successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to fetch modules' });
    }
}

export const saveModule = async (req: Request, res: Response) => {
    const { items, name } = req.body;

    try {
        const result = await moduleModel.saveModule(name, items);

        return res.status(200).json({
            data: result,
            message: 'A new module save successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to save module: '});
    }
}

export const updateModule = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items, name } = req.body;

    try {
        const result = await moduleModel.updateModule(id, name, items);

        return res.status(200).json({
            data: result,
            message: 'Module updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update module: '});
    }
}

export const toggleModule = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await moduleModel.toggleModule(id, isActive);

        return res.status(200).json({
            data: result,
            message: 'Status module updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update status module: '});
    }
}