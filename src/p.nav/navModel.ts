import { ResultSetHeader, RowDataPacket } from 'mysql2';

import {pool} from '../utils/db';

export interface GroupNavPermission {
  group_id: number;
  nav_id: number;
}

// Type definitions
export interface Navigation extends RowDataPacket {
  /**
   * Only present in navigation tree output, not in DB rows.
   */
  children?: Navigation[] | null; // recursive children
  id: number; // int, required (primary key)
  parent_nav_id: null | number; // int, nullable
  path: null | string; // varchar(255), nullable
  position: number; // int, required
  section_id: null | number; // int, nullable
  status: number; // tinyint, required
  title: string; // varchar(255), required
  type: string; // varchar(50), required
}

export interface NavigationInput {
  // id is not required for insert (auto-increment), so make it optional
  id?: number;
  parent_nav_id: null | number;
  path: null | string;
  position: number;
  section_id: null | number;
  status: number;
  title: string;
  type: string;
}

// Fetch all navigations
export const getNavigation = async (): Promise<Navigation[]> => {
  try {
    const [result] = await pool.query<Navigation[]>(`SELECT * FROM auth.navigation`);
    return result;
  } catch (error) {
    console.error('Error fetching navigation data:', error);
    throw error;
  }
};

// Fetch navigation by group ID
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

// Update user's last navigation path with timeout protection
export const routeTracker = async (path: string, userId: number): Promise<void> => {
  const timeoutMs = 5000; // 5 second timeout for route tracking
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => { reject(new Error('Route tracking timeout')); }, timeoutMs);
    });

    // Race between query and timeout
    const queryPromise = pool.query(
      `UPDATE auth.users SET last_nav = ? WHERE id = ?`,
      [path, userId]
    );

    const [result]: any = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result.affectedRows === 0) {
      console.warn(`Route tracking: No user found with id: ${userId}`);
    }
  } catch (error: any) {
    // Log but don't throw - route tracking should not crash the app
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
    // Do not re-throw - this is a non-critical operation
  }
};

// Create a new navigation entry
export const createNavigation = async (newNavigation: NavigationInput): Promise<ResultSetHeader> => {
  // Remove id if present, as it should be auto-incremented
  const { id, ...insertData } = newNavigation;
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO auth.navigation SET ?',
    [insertData]
  );
  return result;
};

// Update an existing navigation entry
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

// Get navigation permissions
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

// Update navigation permissions
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

// Remove navigation permissions
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

// Toggle navigation status
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

// Fetch navigation by group IDs
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

// Fetch navigation by user ID
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
      // Remove all permissions for this nav_id
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

// Update navigation permissions for a group (remove old, add new)
export const setNavigationPermissionsForGroup = async (groupId: number, navIds: number[]): Promise<void> => {
  await pool.query('DELETE FROM auth.group_nav WHERE group_id = ?', [groupId]);
  if (navIds.length > 0) {
    const values = navIds.map(navId => [navId, groupId]);
    await pool.query('INSERT INTO auth.group_nav (nav_id, group_id) VALUES ?', [values]);
  }
};

// Delete a navigation entry
export const deleteNavigation = async (id: number): Promise<ResultSetHeader> => {
  // Remove all group_nav permissions for this navigation
  await pool.query('DELETE FROM auth.group_nav WHERE nav_id = ?', [id]);
  // Delete the navigation itself
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM auth.navigation WHERE id = ?', [id]);
  return result;
};