import { Request, Response } from 'express';
import { getAllGroups, getGroupById, createGroup, updateGroup } from '../models/groupModel';

// Get all groups
export const getAllGroups1 = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const groups = await getAllGroups();
        return res.status(200).json({ success: true, groups });
    } catch (error) {
        console.error('Error getting all groups:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Get group by id
export const getGroupById1 = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
        const group = await getGroupById(Number(id));
        return res.status(200).json(group);
    } catch (error) {
        console.error('Error getting group by id:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Create new group
export const createGroup1 = async (req: Request, res: Response): Promise<Response> => {
    const newGroup = req.body;

    try {
        const result = await createGroup(newGroup);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Update group
export const updateGroup1 = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const updatedGroup = req.body;

    try {
        const result = await updateGroup(Number(id), updatedGroup);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating group:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}