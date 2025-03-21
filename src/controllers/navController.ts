import { Request, Response } from 'express';
import { routeTracker, getNavigation, getNavigationByGroups, createNavigation, updateNavigation, getNavigationPermissions, getNavigationById, updateNavigationPermission, removeNavigationPermissions, toggleStatus } from '../models/navModel';
import buildNavigationTree from '../utils/navBuilder';

interface CreateNavigationBody {
    id?: number;
    navId: string;
    title: string;
    type: string;
    position: number;
    status: number;
    icon?: string;
    path?: string;
    component?: string;
    layout?: string;
    isProtected?: boolean;
    parentNavId?: string | null;
    sectionId?: string | null;
    permittedGroups?: number[];
}

interface UpdateNavigationBody extends CreateNavigationBody { }

export const trackRoute = async (req: Request, res: Response): Promise<Response> => {
    const { path, userId } = req.body;

    try {
        await routeTracker(path, userId);
        return res.status(200).json({ message: 'Route tracked successfully' });
    } catch (error) {
        console.error('Error tracking route:', error);
        return res.status(500).json({ message: 'Error tracking route', error: (error as Error).message });
    }
};

export const getNavigations = async (req: Request, res: Response): Promise<Response> => {
    try {
        const rows = await getNavigation();

        if (!Array.isArray(rows)) {
            throw new Error('Invalid navigation data format');
        }

        const flatNavItems = rows.map((nav) => ({
            id: nav.id,
            navId: nav.navId,
            title: nav.title,
            type: nav.type,
            position: nav.position,
            status: nav.status,
            icon: nav.icon ?? '',
            path: nav.path ?? '',
            component: nav.component ?? '',
            layout: nav.layout ?? '',
            is_protected: Boolean(nav.is_protected),
            parent_nav_id: nav.parent_nav_id ?? null,
            section_id: nav.section_id ?? null,
        }));

        const navigationTree = buildNavigationTree(flatNavItems);

        return res.status(200).json({
            success: true,
            navigationTree,
        });
    } catch (error) {
        console.error('Error processing navigation:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing navigation data',
        });
    }
};

export const getNavigationsUnstructured = async (req: Request, res: Response): Promise<Response> => {
    try {
        const rawNav = await getNavigation();
        return res.status(200).json(rawNav);
    } catch (error) {
        console.error('Error processing navigation:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing navigation data'
        });
    }
};

export const createNavigationHandler = async (req: Request<{}, {}, CreateNavigationBody>, res: Response): Promise<Response> => {
    try {
        const newNavigation = req.body;

        const normalizedData = {
            navId: newNavigation.navId,
            title: newNavigation.title,
            type: newNavigation.type,
            position: newNavigation.position,
            status: newNavigation.status,
            icon: newNavigation.icon ?? null,
            path: newNavigation.path ?? null,
            component: newNavigation.component ?? null,
            layout: newNavigation.layout ?? null,
            is_protected: Boolean(newNavigation.isProtected),
            parent_nav_id: newNavigation.parentNavId ?? null,
            section_id: newNavigation.sectionId ?? null,
        };

        const newId = await createNavigation(normalizedData);

        if (newNavigation.permittedGroups && newNavigation.permittedGroups.length) {
            const permissions = newNavigation.permittedGroups.map((groupId: number) => ({
                nav_id: newId,
                group_id: groupId,
            }));
            await updateNavigationPermission(permissions);
        }

        return res.status(201).json({ message: 'Navigation created successfully', id: newId });
    } catch (error) {
        console.error('Error creating navigation:', error);
        return res.status(500).json({ message: 'Error creating navigation' });
    }
};

export const updateNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        const updatedData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Navigation ID is required' });
        }

        const normalizedData = {
            navId: updatedData.navId,
            title: updatedData.title,
            type: updatedData.type,
            position: updatedData.position,
            status: updatedData.status,
            icon: updatedData.icon ?? null,
            path: updatedData.path ?? null,
            component: updatedData.component ?? null,
            layout: updatedData.layout ?? null,
            is_protected: Boolean(updatedData.isProtected),
            parent_nav_id: updatedData.parentNavId ?? null,
            section_id: updatedData.sectionId ?? null,
        };

        const updatedItem = await updateNavigation(id, normalizedData);

        if (updatedData.permittedGroups && updatedData.permittedGroups.length) {
            const permissions = updatedData.permittedGroups.map((groupId: number) => ({
                nav_id: id,
                group_id: groupId,
            }));
            await updateNavigationPermission(permissions);
        }

        return res.status(200).json({ message: 'Navigation updated successfully', data: updatedItem });
    } catch (error) {
        console.error('Error updating navigation:', error);
        return res.status(500).json({ message: 'Error updating navigation' });
    }
};

export const getNavigationByGroup = async (req: Request<{ role: string }>, res: Response): Promise<Response> => {
    try {
        const role = Number(req.params.role);
        const rows = await getNavigationByGroups(role);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching navigation by group:', error);
        return res.status(500).json({ message: 'Error fetching navigation by group' });
    }
};

// /api/nav/access
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

        const result = Object.values(groupedPermissions);

        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        console.error('Error fetching navigation permissions:', error);
        return res.status(500).json({ message: 'Error fetching navigation permissions' });
    }
};

export const getNavigationByIds = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        const navigation = await getNavigationById(id);

        const flatNavItems = navigation.map((nav) => ({
            id: nav.id,
            navId: nav.navId,
            title: nav.title,
            type: nav.type,
            position: nav.position,
            status: nav.status,
            icon: nav.icon ?? '',
            path: nav.path ?? '',
            component: nav.component ?? '',
            layout: nav.layout ?? '',
            is_protected: Boolean(nav.is_protected),
            parent_nav_id: nav.parent_nav_id ?? null, // 🛠 fixed
            section_id: nav.section_id ?? null        // 🛠 fixed
        }));

        const navigationTree = buildNavigationTree(flatNavItems);

        return res.status(200).json({
            success: true,
            navigationTree
        });
    } catch (error) {
        console.error('Error fetching navigation by ID:', error);
        return res.status(500).json({ message: 'Error fetching navigation by ID' });
    }
};

export const updateNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length) {
            return res.status(400).json({ status: 'Error', message: 'No permissions provided' });
        }

        if (!permissions.every((p: any) => p.nav_id && p.group_id)) {
            return res.status(400).json({ status: 'Error', message: 'Each permission item must include nav_id and group_id' });
        }

        await updateNavigationPermission(permissions);

        return res.json({ status: 'Success', message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating navigation permissions:', error);
        return res.status(500).json({ status: 'Error', message: (error as Error).message });
    }
};

export const removeNavigationPermissionsHandler = async (req: Request<{}, {}, { permissions: any[] }>, res: Response): Promise<Response> => {
    try {
        const { permissions } = req.body;

        if (!permissions.length) {
            return res.status(400).json({ status: 'Error', message: 'No permissions provided' });
        }

        if (!permissions.every((p: any) => p.nav_id && p.group_id)) {
            return res.status(400).json({ status: 'Error', message: 'Each permission item must include nav_id and group_id' });
        }

        await removeNavigationPermissions(permissions);

        return res.json({ status: 'Success', message: 'Permissions removed successfully' });
    } catch (error) {
        console.error('Error removing navigation permissions:', error);
        return res.status(500).json({ status: 'Error', message: (error as Error).message });
    }
};

export const toggleStatusHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        await toggleStatus(id, status ? 1 : 0);

        return res.json({ status: 'Success', message: `Navigation item ${status ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        console.error('Error toggling status:', error);
        return res.status(500).json({ status: 'Error', message: (error as Error).message });
    }
};
