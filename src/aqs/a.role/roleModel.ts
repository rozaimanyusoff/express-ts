import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { Role, RoleModulePermission } from "./interface";

const rolesTable = "roles";
const roleModulePermissionsTable = "role_module_permissions";
type Permissions = 'read' | 'write' | 'update' | 'delete';

export const findAllRoles = async (): Promise<Role[]> => {
	try {
		const { rows } = await pgPool.query<Role>(`SELECT * FROM auth.${rolesTable};`);
		return rows.map((row: Role) => ({
			id: row.id,
			roleName: row.roleName,
			description: row.description,
			isActive: row.isActive,
		}));
	} catch (error) {
		logger.error(`Database error in findAllRoles: ${error}`);
		throw error;
	}
};

export const createRole = async (name: string, description: string): Promise<Role> => {
	try {
		const { rows } = await pgPool.query<Role>(
			`INSERT INTO auth.${rolesTable} ("roleName", "description", "isActive") VALUES ($1, $2, $3) RETURNING *`,
			[name, description, true]
		);

		const newRole = rows[0];

		return {
			id: newRole.id,
			roleName: newRole.roleName,
			description: newRole.description,
			isActive: newRole.isActive,
		};
	} catch (error) {
		logger.error(`Database error in createRole: ${error}`);
		throw error;
	}
};

export const updateRole = async (roleId: number, name: string, description: string): Promise<Role> => {
	try {
		const { rows } = await pgPool.query<Role>(
			`UPDATE auth.${rolesTable} SET "roleName" = $1, "description" = $2 WHERE id = $3 RETURNING *`,
			[name, description, roleId]
		);
		const updatedRole = rows[0];

		// // Delete existing permissions
		// await pgPool.query(
		// 	`DELETE FROM auth.${roleModulePermissionsTable} WHERE "roleId" = $1`,
		// 	[roleId]
		// );

		// Fetch modules
		// const { rows: moduleRows } = await pgPool.query<{ id: number; name: string }>(
		// 	`SELECT * FROM auth.modules`
		// );
		// const modules = moduleRows.reduce((acc, module) => {
		// 	acc[module.name] = module.id;
		// 	return acc;
		// }, {} as { [key: string]: number });

		// // Insert updated role-module permissions
		// for (const perm of Object.values(permissions)) {
		// 	const moduleId = modules[Object.keys(permissions).find(key => permissions[key] === perm) || ''];
		// 	const isRead = perm.includes('read');
		// 	const isWrite = perm.includes('write');
		// 	const isUpdate = perm.includes('update');
		// 	const isDelete = perm.includes('delete');
			
		// 	await pgPool.query<RoleModulePermission>(
		// 		`INSERT INTO auth.${roleModulePermissionsTable} ("roleId", "moduleId", "isRead", "isWrite", "isUpdate", "isDelete") VALUES ($1, $2, $3, $4, $5, $6)`,
		// 		[roleId, moduleId, isRead, isWrite, isUpdate, isDelete]
		// 	);
		// }
		return {
			id: updatedRole.id,
			roleName: updatedRole.roleName,
			description: updatedRole.description,
			isActive: updatedRole.isActive,
		};
	} catch (error) {
		logger.error(`Database error in updateRole: ${error}`);
		throw error;
	}
};

export const toggleRole = async (roleId: number): Promise<Role> => {
	try {
		// Fetch current isActive status
		const { rows } = await pgPool.query<Role>(
			`SELECT "isActive" FROM auth.${rolesTable} WHERE id = $1`,
			[roleId]
		);
		if (rows.length === 0) {
			throw new Error('Role not found');
		}
		const currentStatus = rows[0].isActive;

		// Toggle isActive status
		const { rows: updateRows } = await pgPool.query<Role>(
			`UPDATE auth.${rolesTable} SET "isActive" = $1 WHERE id = $2 RETURNING *`,
			[!currentStatus, roleId]
		);
		const updatedRole = updateRows[0];

		return {
			id: updatedRole.id,
			roleName: updatedRole.roleName,
			description: updatedRole.description,
			isActive: updatedRole.isActive,
		};
	} catch (error) {
		logger.error(`Database error in toggleRole: ${error}`);
		throw error;
	}
};