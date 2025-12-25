import { Request, Response } from 'express';
import buildNavigationTree from '../utils/navBuilder';
import { getAllUsers } from '../p.user/userModel';
import { updateUsersRole } from '../p.user/userModel';
import {
  assignGroupByUserId,
  assignUserToGroups,
  createGroup,
  createNavigation,
  createRole,
  deleteNavigation,
  getAllGroups,
  getAllRoles,
  getGroupById,
  getNavigation,
  getNavigationByGroups,
  getNavigationByUserId,
  getNavigationPermissions,
  getRoleById,
  removeNavigationPermissions,
  removeNavigationPermissionsNotIn,
  routeTracker,
  setNavigationPermissionsForGroup,
  toggleStatus,
  updateGroup,
  updateNavigation,
  updateNavigationPermission,
  updateRole
} from './adminModel';

// ==================== NAVIGATION HANDLERS ====================

interface CreateNavigationBody {
  id: number;
  parent_nav_id?: null | number;
  parentNavId?: null | number;
  path?: null | string;
  permittedGroups?: number[];
  position: number;
  section_id?: null | number;
  sectionId?: null | number;
  status: number;
  title: string;
  type: string;
}

interface UpdateNavigationBody extends CreateNavigationBody {}

const normalizeNavigationData = (nav: CreateNavigationBody | UpdateNavigationBody) => ({
  ...(nav.id !== undefined ? { id: nav.id } : {}),
  parent_nav_id: nav.parent_nav_id ?? null,
  path: nav.path ?? null,
  position: typeof nav.position === 'number' && !isNaN(nav.position) ? nav.position : 0,
  section_id: nav.section_id ?? null,
  status: nav.status,
  title: nav.title,
  type: nav.type,
});

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

export const trackRoute = async (req: Request, res: Response): Promise<Response> => {
  const { path, userId } = req.body;

  if (!path || !userId) {
    return res.status(400).json({
      message: 'Path and userId are required',
      status: 'error'
    });
  }

  routeTracker(path, userId).catch((error) => {
    console.error('Background route tracking failed:', error);
  });

  return res.status(200).json({
    message: 'Route tracked successfully',
    status: 'success'
  });
};

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
    const { parentNavId, sectionId, ...rest } = req.body;
    const newNavigation = {
      ...rest,
      parent_nav_id: parentNavId ?? null,
      section_id: sectionId ?? null,
    };
    const normalizedData = normalizeNavigationData(newNavigation);
    const newIdResult = await createNavigation(normalizedData);
    const newId = newIdResult.insertId;

    const groupIds = Array.isArray(req.body.permittedGroups)
      ? req.body.permittedGroups
      : Array.isArray((req.body as any).groups)
        ? (req.body as any).groups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g))
        : [];
    if (groupIds.length > 0) {
      const permissions = groupIds.map((groupId: number) => ({
        group_id: groupId,
        nav_id: newId,
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

    let groupIds: number[] = [];
    if (Array.isArray(groups)) {
      groupIds = groups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g));
    } else if (Array.isArray(permittedGroups)) {
      groupIds = permittedGroups.map((g: any) => Number(g)).filter((g: any) => !isNaN(g));
    }

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

    const normalizedData = normalizeNavigationData(updatedData);
    const updatedItem = await updateNavigation(id, normalizedData);

    await removeNavigationPermissionsNotIn(id, groupIds);

    if (groupIds.length > 0) {
      const permissions = groupIds.map((groupId: number) => ({
        group_id: groupId,
        nav_id: id,
      }));
      await updateNavigationPermission(permissions);
    }

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

export const reorderNavigationHandler = async (req: Request, res: Response): Promise<Response> => {
  const { nodes } = req.body;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return res.status(400).json({ message: 'nodes must be a non-empty array', status: 'error' });
  }
  try {
    for (const node of nodes) {
      const { navId, parent_nav_id, position, section_id } = node;
      if (typeof navId !== 'number' || typeof position !== 'number') continue;
      const navRows = await getNavigation();
      const nav = navRows.find((n) => n.id === navId);
      if (!nav) continue;
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

// ==================== ROLE HANDLERS ====================

export const getAllRole = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const roles = await getAllRoles();
    const users = await getAllUsers();

    const data = roles.map((role: any) => {
      const permissions = {
        create: !!role.creates,
        delete: !!role.deletes,
        update: !!role.updates,
        view: !!role.views
      };

      const roleUsers = users.filter((u: any) => u.role === role.id).map((u: any) => ({
        id: u.id,
        name: u.fname || u.name || u.username
      }));

      return {
        created_at: role.created_at ? new Date(role.created_at).toISOString() : null,
        description: role.desc || role.description || '',
        id: role.id,
        name: role.name,
        permissions,
        updated_at: role.updated_at ? new Date(role.updated_at).toISOString() : null,
        users: roleUsers
      };
    });
    return res.status(200).json({
      data,
      message: 'Role data fetched successful',
      success: true
    });
  } catch (error) {
    console.error('Error getting all roles:', error);
    return res.status(500).json({ error: (error as Error).message, message: 'Internal server error', success: false });
  }
};

export const getRole = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const role = await getRoleById(Number(id));
    return res.status(200).json({ role });
  } catch (error) {
    console.error('Error getting role by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNewRole = async (req: Request, res: Response): Promise<Response> => {
  const { description, name, permissions, userIds } = req.body;
  try {
    const roleData = {
      creates: permissions?.create ? 1 : 0,
      deletes: permissions?.delete ? 1 : 0,
      desc: description,
      name,
      status: 1,
      updates: permissions?.update ? 1 : 0,
      views: permissions?.view ? 1 : 0
    };
    const result = await createRole(roleData);
    const newRoleId = result.insertId;
    if (Array.isArray(userIds) && userIds.length > 0) {
      await updateUsersRole(userIds, newRoleId);
    }
    return res.status(201).json({ id: newRoleId, message: 'Role created successfully', success: true });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoleById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { description, name, permissions, userIds } = req.body;
  try {
    const roleData = {
      creates: permissions?.create ? 1 : 0,
      deletes: permissions?.delete ? 1 : 0,
      desc: description,
      name,
      status: 1,
      updates: permissions?.update ? 1 : 0,
      views: permissions?.view ? 1 : 0
    };
    await updateRole(Number(id), roleData);
    if (Array.isArray(userIds)) {
      await updateUsersRole(userIds, Number(id));
    }
    return res.status(200).json({ id: Number(id), message: 'Role updated successfully', success: true });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GROUP HANDLERS ====================

export const getAllGroups1 = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const groups = await getAllGroups();
    return res.status(200).json({ groups, success: true });
  } catch (error) {
    console.error('Error getting all groups:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupById1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const group = await getGroupById(Number(id));
    return res.status(200).json(group);
  } catch (error) {
    console.error('Error getting group by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGroup1 = async (req: Request, res: Response): Promise<Response> => {
  const newGroup = req.body;

  try {
    const result = await createGroup(newGroup);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGroup1 = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { desc, name, navIds, status, userIds } = req.body;

  try {
    await updateGroup(Number(id), { desc, name, status });

    if (Array.isArray(userIds)) {
      await assignUserToGroups(Number(id), userIds);
    }

    if (Array.isArray(navIds)) {
      await setNavigationPermissionsForGroup(Number(id), navIds);
    }

    return res.status(200).json({ message: 'Group updated successfully', success: true });
  } catch (error) {
    console.error('Error updating group:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllGroupsStructured = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const groups = await getAllGroups();
    const users = await getAllUsers();

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

    const data = await Promise.all(groups.map(async (group) => {
      const navTreeRaw = await getNavigationByGroups([group.id]);
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
