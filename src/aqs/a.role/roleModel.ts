import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { Role } from "./interface";

const rolesTable = "roles";

export const findAllRoles = async (): Promise<Role[]> => {
	try {
		const { rows } = await pgPool.query<Role>(`SELECT * FROM auth.${rolesTable} WHERE "isActive" = true`);
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
