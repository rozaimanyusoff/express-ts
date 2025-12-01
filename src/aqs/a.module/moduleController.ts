import { Request, Response } from 'express';
import * as moduleModel from './moduleModel';

export const getAllModules = async (req: Request, res: Response): Promise<Response> => {
    try {
        const modules = await moduleModel.findAllModules();
        
        return res.status(200).json({
            success: true,
            message: 'Modules fetched successfully',
            data: modules
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch modules', error: (error as Error).message });
    }
}

export const saveModule = async (req: Request, res: Response) => {
    const { name, items } = req.body;

    try {
        const result = await moduleModel.saveModule(name, items);

        return res.status(200).json({
            success: true,
            message: 'A new module save successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save module: ', error: (error as Error).message});
    }
}

export const updateModule = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, items } = req.body;

    try {
        const result = await moduleModel.updateModule(id, name, items);

        return res.status(200).json({
            success: true,
            message: 'Module updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update module: ', error: (error as Error).message});
    }
}

export const toggleModule = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await moduleModel.toggleModule(id, isActive);

        return res.status(200).json({
            success: true,
            message: 'Status module updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update status module: ', error: (error as Error).message});
    }
}