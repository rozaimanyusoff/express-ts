import pool from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Type definitions
export interface Navigation extends RowDataPacket {
  id: number;
  navId: string;                    // varchar(50), required
  title: string;                    // varchar(255), required
  type: string;                     // varchar(50), required
  position: number;                 // int, required
  status: number;                   // tinyint, required
  icon?: string | null;             // varchar(100), optional
  path?: string | null;             // varchar(255), optional
  component?: string | null;        // varchar(255), optional
  layout?: string | null;           // varchar(50), optional
  is_protected: number;             // tinyint(1), required (or boolean with mapping)
  parent_nav_id?: string | null;    // varchar(50), optional
  section_id?: string | null;       // varchar(50), optional
}

export interface NavigationInput {
  navId: string;
  title: string;
  type: string;
  position: number;
  status: number;
  icon?: string | null;
  path?: string | null;
  component?: string | null;
  layout?: string | null;
  is_protected: boolean;
  parent_nav_id?: string | null;
  section_id?: string | null;
}

export interface GroupNavPermission {
  nav_id: number;
  group_id: number;
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
    console.error('Error fetching navigation data by ID:', error);
    throw error;
  }
};

// Update user's last navigation path
export const routeTracker = async (path: string, userId: number): Promise<void> => {
  //console.log(`Updating last navigation for userId: ${userId} with path: ${path}`);
  try {
    const [result]: any = await pool.query(
      `UPDATE auth.users SET last_nav = ? WHERE id = ?`,
      [path, userId]
    );
    //console.log(`Update result: ${JSON.stringify(result)}`);
    if (result.affectedRows === 0) {
      //console.error(`No user found with id: ${userId}`);
      throw new Error(`No user found with id: ${userId}`);
    }
    //console.log(`Route tracked successfully for user id: ${userId}`);
  } catch (error) {
    console.error('Error tracking route:', error);
    throw error;
  }
};

// Create a new navigation entry
export const createNavigation = async (newNavigation: NavigationInput): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO auth.navigation SET ?',
    [newNavigation]
  );
  return result;
};

// Update an existing navigation entry
export const updateNavigation = async (id: number, updatedData: NavigationInput): Promise<ResultSetHeader> => {
  const query = `
      UPDATE auth.navigation
      SET
          navId = ?,
          title = ?,
          type = ?,
          position = ?,
          status = ?,
          icon = ?,
          path = ?,
          component = ?,
          layout = ?,
          is_protected = ?,
          parent_nav_id = ?,
          section_id = ?
      WHERE id = ?
  `;

  const values = [
      updatedData.navId,
      updatedData.title,
      updatedData.type,
      updatedData.position,
      updatedData.status,
      updatedData.icon,
      updatedData.path,
      updatedData.component,
      updatedData.layout,
      updatedData.is_protected ? 1 : 0, // Convert boolean to tinyint
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
    // Create placeholders for the group IDs
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
      SELECT DISTINCT *
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
/* export const getNavigationByUserId = async (userId: number): Promise<Navigation[]> => {
  try {
    const query = `
      SELECT DISTINCT gn.nav_id
      FROM user_groups ug
      INNER JOIN group_nav gn ON ug.group_id = gn.group_id
      WHERE ug.user_id = ?
    `;

    const [result] = await pool.query<any[]>(query, [userId]);
    return result;
  } catch (error) {
    console.error('Error fetching navigation data by user ID:', error);
    throw error;
  }
}; */

export const removeNavigationPermissionsNotIn = async (navId: number, permittedGroups: number[]): Promise<number> => {
  try {
    const placeholders = permittedGroups.map(() => '?').join(', ');
    const query = `
      DELETE FROM auth.group_nav
      WHERE nav_id = ? AND group_id NOT IN (${placeholders})
    `;
    const values = [navId, ...permittedGroups];

    const [result]: any = await pool.query(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error('Error removing navigation permissions not in permittedGroups:', error);
    throw error;
  }
};

// Update navigation permissions for a group (remove old, add new)
export const setNavigationPermissionsForGroup = async (groupId: number, navIds: number[]): Promise<void> => {
  // Remove all nav permissions for this group
  await pool.query('DELETE FROM auth.group_nav WHERE group_id = ?', [groupId]);
  // Add new nav permissions
  if (navIds.length > 0) {
    const values = navIds.map(navId => [navId, groupId]);
    await pool.query('INSERT INTO auth.group_nav (nav_id, group_id) VALUES ?', [values]);
  }
};