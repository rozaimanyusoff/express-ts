import { Request, Response } from 'express';
import {
    routeTracker,
    getNavigation,
    createNavigation,
    updateNavigation,
    getNavigationPermissions,
    getNavigationById,
    updateNavigationPermission,
    removeNavigationPermissions,
    toggleStatus,
    getNavigationByGroups,
    getNavigationByUserId,
    removeNavigationPermissionsNotIn,
    deleteNavigation
} from './navModel';
import buildNavigationTree from '../utils/navBuilder';

interface CreateNavigationBody {
    id: number;
    title: string;
    type: string;
    position: number;
    status: number;
    path?: string | null;
    parent_nav_id?: number | null;
    section_id?: number | null;
    parentNavId?: number | null; // Added camelCase for frontend compatibility
    sectionId?: number | null;   // Added camelCase for frontend compatibility
    permittedGroups?: number[];
}

interface UpdateNavigationBody extends CreateNavigationBody { }

const normalizeNavigationData = (nav: CreateNavigationBody | UpdateNavigationBody) => ({
    // id is optional for create
    ...(nav.id !== undefined ? { id: nav.id } : {}),
    title: nav.title,
    type: nav.type,
    position: typeof nav.position === 'number' && !isNaN(nav.position) ? nav.position : 0,
    status: nav.status,
    path: nav.path ?? null,
    parent_nav_id: nav.parent_nav_id ?? null,
    section_id: nav.section_id ?? null,
});

export const trackRoute = async (req: Request, res: Response): Promise<Response> => {
    const { path, userId } = req.body;

    // Validate input
    if (!path || !userId) {
        return res.status(400).json({ 
            status: 'error',
            message: 'Path and userId are required' 
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
        status: 'success',
        message: 'Route tracked successfully' 
    });
};

// Remove getNavigationsUnstructured and getNavigationByIds as getNavigations covers both structured and unstructured needs
// Remove redundant mapping logic by creating a helper
const toFlatNavItem = (nav: any) => ({
    navId: nav.id,
    title: nav.title,
    type: nav.type,
    position: nav.position,
    status: nav.status,
    path: nav.path,
    parent_nav_id: nav.parent_nav_id,
    section_id: nav.section_id,
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
            status: 'success',
            message: 'Navigation structure fetched successfully',
            navTree
        });
    } catch (error) {
        console.error('Error processing navigation:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error processing navigation data',
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
                nav_id: newId, // Use the extracted insertId
                group_id: groupId,
            }));
            await updateNavigationPermission(permissions);
        }

        return res.status(201).json({
            status: 'success',
            message: 'Navigation created successfully',
            id: newId
        });
    } catch (error) {
        console.error('Error creating navigation:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error creating navigation'
        });
    }
};

// Update navigation
export const updateNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Navigation ID is required'
            });
        }

        // Map frontend camelCase keys to backend snake_case keys
        const {
            navId,
            title,
            type,
            position,
            status,
            path,
            parentNavId,
            sectionId,
            groups,
            permittedGroups,
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
            title,
            type,
            position: typeof position === 'number' ? position : 0,
            status,
            path: path ?? null,
            parent_nav_id: parentNavId ?? rest.parent_nav_id ?? null,
            section_id: sectionId ?? rest.section_id ?? null,
            permittedGroups: groupIds,
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
                nav_id: id,
                group_id: groupId,
            }));
            await updateNavigationPermission(permissions);
        }
        // If permittedGroups is missing or empty, skip permission update/removal

        return res.status(200).json({
            status: 'success',
            message: 'Navigation updated successfully',
            data: updatedItem
        });
    } catch (error) {
        console.error('Error updating navigation:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error updating navigation'
        });
    }
};

export const getNavigationPermissionsHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const permissions = await getNavigationPermissions();

        const groupedPermissions = permissions.reduce((acc: any, perm: any) => {
            const { nav_id, group_id } = perm;
            if (!acc[nav_id]) {
                acc[nav_id] = { nav_id, groups: [] };
            }
            acc[nav_id].groups.push(group_id);
            return acc;
        }, {});

        return res.status(200).json({
            status: 'success',
            message: 'Navigation permissions fetched successfully',
            data: Object.values(groupedPermissions)
        });
    } catch (error) {
        console.error('Error fetching navigation permissions:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error fetching navigation permissions'
        });
    }
};

export const updateNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length || !permissions.every((p) => typeof p.nav_id === 'number' && typeof p.group_id === 'number')) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Navigation ID is required'
            });
        }

        await updateNavigationPermission(permissions);
        return res.status(200).json({
            status: 'success',
            message: 'Permissions updated successfully'
        });
    } catch (error) {
        console.error('Error updating navigation permissions:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: (error as Error).message
        });
    }
};

export const removeNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length || !permissions.every(p => p.nav_id && p.group_id)) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid permissions data'
            });
        }

        await removeNavigationPermissions(permissions);
        return res.status(200).json({
            status: 'success',
            message: 'Permissions removed successfully'
        });
    } catch (error) {
        console.error('Error removing navigation permissions:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: (error as Error).message
        });
    }
};

export const toggleStatusHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        await toggleStatus(id, status ? 1 : 0);
        return res.status(200).json({
            status: 'success',
            message: `Navigation item ${status ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('Error toggling status:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: (error as Error).message
        });
    }
};

export const getNavigationByUserIdHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = Number(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid user ID'
            });
        }

        // Fetch navigation items by user ID
        const navigation = await getNavigationByUserId(userId);

        const flatNavItems = navigation.map(toFlatNavItem);

        const navTree = buildNavigationTree(flatNavItems);

        return res.status(200).json({
            status: 'success',
            message: 'Navigation structure fetched successfully',
            navTree
        });
    } catch (error) {
        console.error('Error fetching navigation by user ID:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error fetching navigation by user ID'
        });
    }
};

export const deleteNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Navigation ID is required'
            });
        }
        const result = await deleteNavigation(id);
        return res.status(200).json({
            status: 'success',
            message: 'Navigation deleted successfully',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting navigation:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error deleting navigation'
        });
    }
};

// Handler for reordering navigation nodes
export const reorderNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    const { nodes } = req.body;
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return res.status(400).json({ status: 'error', message: 'nodes must be a non-empty array' });
    }
    try {
        for (const node of nodes) {
            const { navId, position, parent_nav_id, section_id } = node;
            if (typeof navId !== 'number' || typeof position !== 'number') continue;
            // Fetch current navigation to preserve required fields
            const navRows = await getNavigation();
            const nav = navRows.find((n) => n.id === navId);
            if (!nav) continue;
            // For root/section nodes, allow parent_nav_id and section_id to be null
            await updateNavigation(navId, {
                title: nav.title,
                type: nav.type,
                status: nav.status,
                path: nav.path,
                position,
                parent_nav_id: nav.type === 'section' ? null : (parent_nav_id ?? null),
                section_id: nav.type === 'section' ? null : (section_id ?? null),
            });
        }
        return res.status(200).json({ status: 'success', message: 'Navigation reordered successfully' });
    } catch (error) {
        console.error('Error reordering navigation:', error);
        return res.status(500).json({ status: 'error', message: 'Error reordering navigation' });
    }
};
