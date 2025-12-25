import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../utils/db';
import logger from '../utils/logger';

// ==================== NAVIGATION TYPES & INTERFACES ====================

export interface GroupNavPermission {
  group_id: number;
  nav_id: number;
}

export interface Navigation extends RowDataPacket {
  children?: Navigation[] | null;
  id: number;
  parent_nav_id: null | number;
  path: null | string;
  position: number;
  section_id: null | number;
  status: number;
  title: string;
  type: string;
}

export interface NavigationInput {
  id?: number;
  parent_nav_id: null | number;
  path: null | string;
  position: number;
  section_id: null | number;
  status: number;
  title: string;
  type: string;
}

// ==================== ROLE TYPES & INTERFACES ====================

export interface Role {
  create_at: Date;
  creates: number;
  deletes: number;
  desc?: string;
  id: number;
  name: string;
  status: number;
  update_at: Date;
  updates: number;
  views: number;
}

// ==================== GROUP TYPES & INTERFACES ====================

export interface Group {
  created_at: string;
  desc: string;
  id: number;
  name: string;
  status: number;
}

export interface UserGroup {
  group_id: number;
  id: number;
  user_id: number;
}

// ==================== NAVIGATION OPERATIONS ====================

export const getNavigation = async (): Promise<Navigation[]> => {
  try {
    const [result] = await pool.query<Navigation[]>(`SELECT * FROM auth.navigation`);
    return result;
  } catch (error) {
    console.error('Error fetching navigation data:', error);
    throw error;
  }
};

export const getNavigationById = async (id: number): Promise<Navigation[]> => {
  try {
    const [result] = await pool.query<Navigation[]>(
      `SELECT n.*
       FROM auth.group_nav gn
       LEFT JOIN auth.navigation n ON gn.nav_id = n.id
       WHERE gn.group_id = ?
       ORDER BY n.position, n.id`,
      [id]
    );
    return result;
  } catch (error) {
    console.error('Error fetching navigation data by id:', error);
    throw error;
  }
};

export const routeTracker = async (path: string, userId: number): Promise<void> => {
  const timeoutMs = 5000;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => { reject(new Error('Route tracking timeout')); }, timeoutMs);
    });

    const queryPromise = pool.query(
      `UPDATE auth.users SET last_nav = ? WHERE id = ?`,
      [path, userId]
    );

    const [result]: any = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result.affectedRows === 0) {
      console.warn(`Route tracking: No user found with id: ${userId}`);
    }
  } catch (error: any) {
    if (error.message === 'Route tracking timeout') {
      console.error('Route tracking timeout - database may be slow or unresponsive');
    } else if (error.code === 'ETIMEDOUT' || error.errno === -110) {
      console.error('Route tracking database timeout (ETIMEDOUT):', {
        path,
        timestamp: new Date().toISOString(),
        userId
      });
    } else {
      console.error('Error tracking route:', error);
    }
  }
};

export const createNavigation = async (newNavigation: NavigationInput): Promise<ResultSetHeader> => {
  const { id, ...insertData } = newNavigation;
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO auth.navigation SET ?',
    [insertData]
  );
  return result;
};

export const updateNavigation = async (id: number, updatedData: NavigationInput): Promise<ResultSetHeader> => {
  const query = `
    UPDATE auth.navigation
    SET
      title = ?,
      type = ?,
      position = ?,
      status = ?,
      path = ?,
      parent_nav_id = ?,
      section_id = ?
    WHERE id = ?
  `;

  const values = [
    updatedData.title,
    updatedData.type,
    updatedData.position,
    updatedData.status,
    updatedData.path,
    updatedData.parent_nav_id,
    updatedData.section_id,
    id,
  ];

  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result;
};

export const getNavigationPermissions = async (): Promise<GroupNavPermission[]> => {
  try {
    const [result]: any = await pool.query(
      'SELECT * FROM auth.group_nav ORDER BY nav_id, group_id'
    );
    return result;
  } catch (error) {
    console.error('Error fetching navigation permission data:', error);
    throw error;
  }
};

export const updateNavigationPermission = async (permissions: GroupNavPermission[]): Promise<number> => {
  try {
    if (!permissions.length) return 0;

    const placeholders = permissions.map(() => `(?, ?)`).join(', ');
    const values = permissions.flatMap(p => [p.nav_id, p.group_id]);

    const query = `
      INSERT INTO auth.group_nav (nav_id, group_id)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE nav_id = VALUES(nav_id), group_id = VALUES(group_id)
    `;

    const [result]: any = await pool.query(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error('Error updating navigation permissions:', error);
    throw error;
  }
};

export const removeNavigationPermissions = async (permissions: GroupNavPermission[]): Promise<number> => {
  try {
    if (!permissions.length) return 0;

    const conditions = permissions.map(() => `(?, ?)`).join(", ");
    const values = permissions.flatMap(p => [p.nav_id, p.group_id]);

    const query = `DELETE FROM auth.group_nav WHERE (nav_id, group_id) IN (${conditions})`;
    const [result]: any = await pool.query(query, values);

    return result.affectedRows;
  } catch (error) {
    console.error('Error removing navigation permissions:', error);
    throw error;
  }
};

export const toggleStatus = async (id: number, status: number): Promise<number> => {
  try {
    const [result]: any = await pool.query(
      `UPDATE auth.navigation SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('Error toggling navigation status:', error);
    throw error;
  }
};

export const getNavigationByGroups = async (groupIds: number[]): Promise<Navigation[]> => {
  try {
    const placeholders = groupIds.map(() => '?').join(', ');

    const query = `
      SELECT DISTINCT n.*
      FROM auth.group_nav gn
      LEFT JOIN auth.navigation n ON gn.nav_id = n.id
      WHERE gn.group_id IN (${placeholders})
      ORDER BY n.position, n.id
    `;

    const [result] = await pool.query<Navigation[]>(query, groupIds);
    return result;
  } catch (error) {
    console.error('Error fetching navigation data by group IDs:', error);
    throw error;
  }
};

export const getNavigationByUserId = async (userId: number): Promise<Navigation[]> => {
  try {
    const query = `
      SELECT DISTINCT n.*
      FROM user_groups ug
      INNER JOIN group_nav gn ON ug.group_id = gn.group_id
      INNER JOIN auth.navigation n ON gn.nav_id = n.id
      WHERE ug.user_id = ?
      ORDER BY n.position, n.id
    `;

    const [result] = await pool.query<Navigation[]>(query, [userId]);
    return result;
  } catch (error) {
    console.error('Error fetching navigation data by user ID:', error);
    throw error;
  }
};

export const removeNavigationPermissionsNotIn = async (id: number, permittedGroups: number[]): Promise<number> => {
  try {
    if (!permittedGroups.length) {
      const [result]: any = await pool.query(
        'DELETE FROM auth.group_nav WHERE nav_id = ?',
        [id]
      );
      return result.affectedRows;
    }
    const placeholders = permittedGroups.map(() => '?').join(', ');
    const query = `
      DELETE FROM auth.group_nav
      WHERE nav_id = ? AND group_id NOT IN (${placeholders})
    `;
    const values = [id, ...permittedGroups];

    const [result]: any = await pool.query(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error('Error removing navigation permissions not in permittedGroups:', error);
    throw error;
  }
};

export const deleteNavigation = async (id: number): Promise<ResultSetHeader> => {
  await pool.query('DELETE FROM auth.group_nav WHERE nav_id = ?', [id]);
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM auth.navigation WHERE id = ?', [id]);
  return result;
};

// ==================== ROLE OPERATIONS ====================

export const getAllRoles = async (): Promise<Role[]> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM auth.roles');
    return rows;
  } catch (error) {
    console.error('Error getting all roles:', error);
    throw error;
  }
};

export const getRoleById = async (id: number): Promise<Role> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM auth.roles WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error('Error getting role by id:', error);
    throw error;
  }
};

export const createRole = async (role: Omit<Role, 'create_at' | 'id' | 'update_at'>): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO auth.roles (name, `desc`, views, creates, updates, deletes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [role.name, role.desc, role.views, role.creates, role.updates, role.deletes, role.status]
  );
  return result;
};

export const updateRole = async (id: number, role: Omit<Role, 'create_at' | 'id' | 'update_at'>): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE auth.roles SET name = ?, `desc` = ?, views = ?, creates = ?, updates = ?, deletes = ?, status = ? WHERE id = ?',
    [role.name, role.desc, role.views, role.creates, role.updates, role.deletes, role.status, id]
  );
  return result;
};

// ==================== GROUP OPERATIONS ====================

export const getAllGroups = async (): Promise<Group[]> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM auth.groups');
    return rows;
  } catch (error) {
    console.error('Error getting all groups:', error);
    throw error;
  }
};

export const getGroupById = async (id: number): Promise<Group> => {
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM auth.groups WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error('Error getting group by id:', error);
    throw error;
  }
};

export const createGroup = async (group: Omit<Group, 'created_at' | 'id'>): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO auth.groups (name, description, status) VALUES (?, ?, ?)',
    [group.name, group.desc, group.status]
  );
  return result;
};

export const updateGroup = async (id: number, group: Omit<Group, 'created_at' | 'id'>): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE auth.groups SET name = ?, description = ?, status = ? WHERE id = ?',
    [group.name, group.desc, group.status, id]
  );
  return result;
};

export const getGroupsByUserId = async (userId: number): Promise<number[]> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT group_id FROM user_groups WHERE user_id = ?',
      [userId]
    );
    return rows.map((row) => (row as { group_id: number }).group_id);
  } catch (error) {
    logger.error(`Database error in getGroupsByUserId: ${error}`);
    throw error;
  }
};

export const assignGroupByUserId = async (userId: number, groupId = 5): Promise<void> => {
  try {
    await pool.query(
      'INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
      [userId, groupId]
    );
  } catch (error) {
    logger.error(`Database error in assignGroupByUserId: ${error}`);
    throw error;
  }
};

export const assignUserToGroups = async (groupId: number, userIds: number[]): Promise<void> => {
  await pool.query('DELETE FROM user_groups WHERE group_id = ?', [groupId]);
  if (userIds.length > 0) {
    const values = userIds.map(userId => [userId, groupId]);
    await pool.query('INSERT INTO user_groups (user_id, group_id) VALUES ?', [values]);
  }
};

export const setNavigationPermissionsForGroup = async (groupId: number, navIds: number[]): Promise<void> => {
  await pool.query('DELETE FROM auth.group_nav WHERE group_id = ?', [groupId]);
  if (navIds.length > 0) {
    const values = navIds.map(navId => [navId, groupId]);
    await pool.query('INSERT INTO auth.group_nav (nav_id, group_id) VALUES ?', [values]);
  }
};
