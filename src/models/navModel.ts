import pool from '../utils/db';
import { RowDataPacket } from 'mysql2';

// Type definitions
export interface Navigation extends RowDataPacket {
  id: number;
    navId: string;
    title: string;
    type: string;
    position: number;
    status: number;
    icon?: string;
    path?: string;
    component?: string;
    layout?: string;
    is_protected?: boolean;
    parent_nav_id?: string | null;
    section_id?: string | null;
    permitted_groups?: number[];
  role?: number;
  [key: string]: any;
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
    const [result] = await pool.query<Navigation[]>(`SELECT * FROM navigation`);
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
       FROM group_nav gn
       LEFT JOIN navigation n ON gn.nav_id = n.id
       WHERE n.status != 0 AND gn.group_id = ?
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
  console.log(`Updating last navigation for userId: ${userId} with path: ${path}`);
  try {
    const [result]: any = await pool.query(
      `UPDATE users SET last_nav = ? WHERE id = ?`,
      [path, userId]
    );
    console.log(`Update result: ${JSON.stringify(result)}`);
    if (result.affectedRows === 0) {
      console.error(`No user found with id: ${userId}`);
      throw new Error(`No user found with id: ${userId}`);
    }
    console.log(`Route tracked successfully for user id: ${userId}`);
  } catch (error) {
    console.error('Error tracking route:', error);
    throw error;
  }
};

// Create a new navigation entry
export const createNavigation = async (newNavigation: NavigationInput): Promise<number> => {
  try {
    const [result]: any = await pool.query(
      'INSERT INTO navigation SET ?',
      [newNavigation]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating navigation:', error);
    throw error;
  }
};

// Update an existing navigation entry
export const updateNavigation = async (id: number, updatedData: NavigationInput): Promise<Navigation> => {
  console.log(`Updating navigation item with navId: ${id}`);
  try {
    const [rows]: any = await pool.query('SELECT * FROM navigation WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('Navigation item not found');
    }

    await pool.query('UPDATE navigation SET ? WHERE id = ?', [updatedData, id]);

    const [updatedRows]: any = await pool.query('SELECT * FROM navigation WHERE id = ?', [id]);
    return updatedRows[0];
  } catch (error) {
    console.error('Error updating navigation:', error);
    throw error;
  }
};

// Get navigation items by role/group
export const getNavigationByGroups = async (role: number): Promise<Navigation[]> => {
  try {
    const [result]: any = await pool.query(
      'SELECT * FROM navigation WHERE role = ?',
      [role]
    );
    return result;
  } catch (error) {
    console.error('Error fetching group navigation data:', error);
    throw error;
  }
};

// Get navigation permissions
export const getNavigationPermissions = async (): Promise<GroupNavPermission[]> => {
  try {
    const [result]: any = await pool.query(
      'SELECT * FROM group_nav ORDER BY nav_id, group_id'
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
    const values = permissions.map(perm => [perm.nav_id, perm.group_id]);
    const [result]: any = await pool.query(
      `INSERT IGNORE INTO group_nav (nav_id, group_id) VALUES ?`,
      [values]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('Error updating navigation permissions:', error);
    throw error;
  }
};

// Remove navigation permissions
export const removeNavigationPermissions = async (permissions: GroupNavPermission[]): Promise<number> => {
  try {
    const values = permissions.map(perm => [perm.nav_id, perm.group_id]);
    const [result]: any = await pool.query(
      `DELETE FROM group_nav WHERE (nav_id, group_id) IN (?)`,
      [values]
    );
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
      `UPDATE navigation SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('Error toggling navigation status:', error);
    throw error;
  }
};