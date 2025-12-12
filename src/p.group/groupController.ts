import { Request, Response } from 'express';

import { getNavigationByGroups, setNavigationPermissionsForGroup, updateNavigationPermission } from '../p.nav/navModel';
import { getAllUsers } from '../p.user/userModel';
import { assignUserToGroups, createGroup, getAllGroups, getGroupById, updateGroup } from './groupModel';

// Get all groups
export const getAllGroups1 = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const groups = await getAllGroups();
        return res.status(200).json({ groups, success: true });
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
    const { desc, name, navIds, status, userIds } = req.body;

    try {
        // Update group basic info
        await updateGroup(Number(id), { desc, name, status });

        // Update user-group associations
        if (Array.isArray(userIds)) {
            await assignUserToGroups(Number(id), userIds);
        }

        // Update group-nav associations (remove old, add new)
        if (Array.isArray(navIds)) {
            await setNavigationPermissionsForGroup(Number(id), navIds);
        }

        return res.status(200).json({ message: 'Group updated successfully', success: true });
    } catch (error) {
        console.error('Error updating group:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Get all groups with users and navTree
export const getAllGroupsStructured = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const groups = await getAllGroups();
        const users = await getAllUsers();

        // Map groupId to users
        const userGroupsMap: Record<number, any[]> = {};
        users.forEach(user => {
            if (user.usergroups) {
                user.usergroups.split(',').forEach((gid: string) => {
                    const groupId = parseInt(gid, 10);
                    if (!userGroupsMap[groupId]) userGroupsMap[groupId] = [];
                    userGroupsMap[groupId].push({
                        email: user.email,
                        id: user.id,
                        name: user.fname,
                        username: user.username
                    });
                });
            }
        });

        // For each group, fetch navTree and users
        const data = await Promise.all(groups.map(async (group) => {
            const navTreeRaw = await getNavigationByGroups([group.id]);
            // Limit navTree fields to id, title, path
            const navTree = navTreeRaw.map((nav: any) => ({
                navId: nav.id,
                path: nav.path,
                title: nav.title
            }));
            return {
                ...group,
                navTree: navTree || [],
                users: userGroupsMap[group.id] || []
            };
        }));

        return res.status(200).json({
            data,
            message: 'Groups data retrieved successfully',
            success: true
        });
    } catch (error) {
        console.error('Error getting all groups:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};