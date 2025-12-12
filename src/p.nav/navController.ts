import { Request, Response } from 'express';

import buildNavigationTree from '../utils/navBuilder';
import {
    createNavigation,
    deleteNavigation,
    getNavigation,
    getNavigationByGroups,
    getNavigationById,
    getNavigationByUserId,
    getNavigationPermissions,
    removeNavigationPermissions,
    removeNavigationPermissionsNotIn,
    routeTracker,
    toggleStatus,
    updateNavigation,
    updateNavigationPermission
} from './navModel';

interface CreateNavigationBody {
    id: number;
    parent_nav_id?: null | number;
    parentNavId?: null | number; // Added camelCase for frontend compatibility
    path?: null | string;
    permittedGroups?: number[];
    position: number;
    section_id?: null | number;
    sectionId?: null | number;   // Added camelCase for frontend compatibility
    status: number;
    title: string;
    type: string;
}

interface UpdateNavigationBody extends CreateNavigationBody { }

const normalizeNavigationData = (nav: CreateNavigationBody | UpdateNavigationBody) => ({
    // id is optional for create
    ...(nav.id !== undefined ? { id: nav.id } : {}),
    parent_nav_id: nav.parent_nav_id ?? null,
    path: nav.path ?? null,
    position: typeof nav.position === 'number' && !isNaN(nav.position) ? nav.position : 0,
    section_id: nav.section_id ?? null,
    status: nav.status,
    title: nav.title,
    type: nav.type,
});

export const trackRoute = async (req: Request, res: Response): Promise<Response> => {
    const { path, userId } = req.body;

    // Validate input
    if (!path || !userId) {
        return res.status(400).json({ 
            message: 'Path and userId are required',
            status: 'error' 
        });
    }

    // Fire-and-forget: don't await, respond immediately
    // Route tracking is non-critical and shouldn't block user requests
    routeTracker(path, userId).catch((error) => {
        // This catch ensures unhandled promise rejections don't crash the app
        console.error('Background route tracking failed:', error);
    });

    // Respond immediately without waiting for database operation
    return res.status(200).json({ 
        message: 'Route tracked successfully',
        status: 'success' 
    });
};

// Remove getNavigationsUnstructured and getNavigationByIds as getNavigations covers both structured and unstructured needs
// Remove redundant mapping logic by creating a helper
const toFlatNavItem = (nav: any) => ({
    navId: nav.id,
    parent_nav_id: nav.parent_nav_id,
    path: nav.path,
    position: nav.position,
    section_id: nav.section_id,
    status: nav.status,
    title: nav.title,
    type: nav.type,
});

export const getNavigations = async (req: Request, res: Response): Promise<Response> => {
    try {
        const rows = await getNavigation();

        if (!Array.isArray(rows)) {
            throw new Error('Invalid navigation data format');
        }

        const flatNavItems = rows.map(toFlatNavItem);
        const navTree = buildNavigationTree(flatNavItems);

        return res.status(200).json({
            message: 'Navigation structure fetched successfully',
            navTree,
            status: 'success'
        });
    } catch (error) {
        console.error('Error processing navigation:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error processing navigation data',
            status: 'error',
        });
    }
};

export const createNavigationHandler = async (req: Request<{}, {}, CreateNavigationBody>, res: Response): Promise<Response> => {
    try {
        // Destructure and map camelCase to snake_case for parentNavId and sectionId
        const { parentNavId, sectionId, ...rest } = req.body;
        const newNavigation = {
            ...rest,
            parent_nav_id: parentNavId ?? null,
            section_id: sectionId ?? null,
        };
        const normalizedData = normalizeNavigationData(newNavigation);
        const newIdResult = await createNavigation(normalizedData);
        const newId = newIdResult.insertId; // Extract the insertId from ResultSetHeader

        // Accept both permittedGroups and groups from frontend
        const groupIds = Array.isArray(req.body.permittedGroups)
            ? req.body.permittedGroups
            : Array.isArray((req.body as any).groups)
                ? (req.body as any).groups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g))
                : [];
        if (groupIds.length > 0) {
            const permissions = groupIds.map((groupId: number) => ({
                group_id: groupId,
                nav_id: newId, // Use the extracted insertId
            }));
            await updateNavigationPermission(permissions);
        }

        return res.status(201).json({
            id: newId,
            message: 'Navigation created successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error creating navigation:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error creating navigation',
            status: 'error'
        });
    }
};

// Update navigation
export const updateNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                code: 400,
                message: 'Navigation ID is required',
                status: 'error'
            });
        }

        // Map frontend camelCase keys to backend snake_case keys
        const {
            groups,
            navId,
            parentNavId,
            path,
            permittedGroups,
            position,
            sectionId,
            status,
            title,
            type,
            ...rest
        } = req.body;

        // Convert group IDs to numbers if present
        let groupIds: number[] = [];
        if (Array.isArray(groups)) {
            groupIds = groups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g));
        } else if (Array.isArray(permittedGroups)) {
            groupIds = permittedGroups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g));
        }

        // Compose the normalized update object
        const updatedData = {
            id: navId ?? id,
            parent_nav_id: parentNavId ?? rest.parent_nav_id ?? null,
            path: path ?? null,
            permittedGroups: groupIds,
            position: typeof position === 'number' ? position : 0,
            section_id: sectionId ?? rest.section_id ?? null,
            status,
            title,
            type,
            ...rest
        };

        // Normalize the data
        const normalizedData = normalizeNavigationData(updatedData);

        // Update the navigation item in the database
        const updatedItem = await updateNavigation(id, normalizedData);

        // Always call removeNavigationPermissionsNotIn to ensure all permissions are removed if groupIds is empty
        await removeNavigationPermissionsNotIn(id, groupIds);

        // Only add/update permissions if groupIds is non-empty
        if (groupIds.length > 0) {
            const permissions = groupIds.map((groupId: number) => ({
                group_id: groupId,
                nav_id: id,
            }));
            await updateNavigationPermission(permissions);
        }
        // If permittedGroups is missing or empty, skip permission update/removal

        return res.status(200).json({
            data: updatedItem,
            message: 'Navigation updated successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error updating navigation:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error updating navigation',
            status: 'error'
        });
    }
};

export const getNavigationPermissionsHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const permissions = await getNavigationPermissions();

        const groupedPermissions = permissions.reduce((acc: any, perm: any) => {
            const { group_id, nav_id } = perm;
            if (!acc[nav_id]) {
                acc[nav_id] = { groups: [], nav_id };
            }
            acc[nav_id].groups.push(group_id);
            return acc;
        }, {});

        return res.status(200).json({
            data: Object.values(groupedPermissions),
            message: 'Navigation permissions fetched successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error fetching navigation permissions:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error fetching navigation permissions',
            status: 'error'
        });
    }
};

export const updateNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length || !permissions.every((p) => typeof p.nav_id === 'number' && typeof p.group_id === 'number')) {
            return res.status(400).json({
                code: 400,
                message: 'Navigation ID is required',
                status: 'error'
            });
        }

        await updateNavigationPermission(permissions);
        return res.status(200).json({
            message: 'Permissions updated successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error updating navigation permissions:', error);
        return res.status(500).json({
            code: 500,
            message: (error as Error).message,
            status: 'error'
        });
    }
};

export const removeNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length || !permissions.every(p => p.nav_id && p.group_id)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid permissions data',
                status: 'error'
            });
        }

        await removeNavigationPermissions(permissions);
        return res.status(200).json({
            message: 'Permissions removed successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error removing navigation permissions:', error);
        return res.status(500).json({
            code: 500,
            message: (error as Error).message,
            status: 'error'
        });
    }
};

export const toggleStatusHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        await toggleStatus(id, status ? 1 : 0);
        return res.status(200).json({
            message: `Navigation item ${status ? 'enabled' : 'disabled'} successfully`,
            status: 'success'
        });
    } catch (error) {
        console.error('Error toggling status:', error);
        return res.status(500).json({
            code: 500,
            message: (error as Error).message,
            status: 'error'
        });
    }
};

export const getNavigationByUserIdHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = Number(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid user ID',
                status: 'error'
            });
        }

        // Fetch navigation items by user ID
        const navigation = await getNavigationByUserId(userId);

        const flatNavItems = navigation.map(toFlatNavItem);

        const navTree = buildNavigationTree(flatNavItems);

        return res.status(200).json({
            message: 'Navigation structure fetched successfully',
            navTree,
            status: 'success'
        });
    } catch (error) {
        console.error('Error fetching navigation by user ID:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error fetching navigation by user ID',
            status: 'error'
        });
    }
};

export const deleteNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                code: 400,
                message: 'Navigation ID is required',
                status: 'error'
            });
        }
        const result = await deleteNavigation(id);
        return res.status(200).json({
            affectedRows: result.affectedRows,
            message: 'Navigation deleted successfully',
            status: 'success'
        });
    } catch (error) {
        console.error('Error deleting navigation:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error deleting navigation',
            status: 'error'
        });
    }
};

// Handler for reordering navigation nodes
export const reorderNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    const { nodes } = req.body;
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return res.status(400).json({ message: 'nodes must be a non-empty array', status: 'error' });
    }
    try {
        for (const node of nodes) {
            const { navId, parent_nav_id, position, section_id } = node;
            if (typeof navId !== 'number' || typeof position !== 'number') continue;
            // Fetch current navigation to preserve required fields
            const navRows = await getNavigation();
            const nav = navRows.find((n) => n.id === navId);
            if (!nav) continue;
            // For root/section nodes, allow parent_nav_id and section_id to be null
            await updateNavigation(navId, {
                parent_nav_id: nav.type === 'section' ? null : (parent_nav_id ?? null),
                path: nav.path,
                position,
                section_id: nav.type === 'section' ? null : (section_id ?? null),
                status: nav.status,
                title: nav.title,
                type: nav.type,
            });
        }
        return res.status(200).json({ message: 'Navigation reordered successfully', status: 'success' });
    } catch (error) {
        console.error('Error reordering navigation:', error);
        return res.status(500).json({ message: 'Error reordering navigation', status: 'error' });
    }
};
