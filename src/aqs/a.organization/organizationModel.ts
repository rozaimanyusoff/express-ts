import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { Organization } from "./interface";

const organizationsTable = "organizations";

export const findAllOrganizations = async (): Promise<Organization[]> => {
	try {
		const { rows } = await pgPool.query<Organization>(`SELECT * FROM auth.${organizationsTable} order BY id ASC`);
		return rows.map((row: Organization) => ({
			code: row.code,
			description: row.description,
			id: row.id,
			isActive: row.isActive,
			name: row.name,
		}));
	} catch (error) {
		logger.error(`Database error in findAllOrganizations: ${error}`);
		throw error;
	}
};

export const saveOrganization = async (name: string, code: string, description: string) => {
	try {
		const result = await pgPool.query(`INSERT INTO auth.${organizationsTable} (name, code, description) VALUES ($1, $2, $3)`, [
			name, code, description === '' ? null : description
		]);

		return result;

	} catch (error) {
		logger.error(`Database error in saveOrganization: ${error}`);
		throw error;
	}
};

export const updateOrganization = async (id: string, name: string, code: string, description: string) => {
	try {
		const result = await pgPool.query(
			`UPDATE auth.${organizationsTable} SET name = $1, code = $2, description = $3 WHERE id = $4`,
			[name, code, description === '' ? null : description, id]
		);

		return result;
	} catch (error) {
		logger.error(`Database error in updateOrganization: ${error}`);
		throw error;
	}
};

export const toggleOrganization = async (id: string, isActive: boolean) => {
	try {
		const result = await pgPool.query(`UPDATE auth.${organizationsTable} SET "isActive" = $1 WHERE id = $2`, [isActive, id]);

		return result;
	} catch (error) {
		logger.error(`Database error in toggleOrganization: ${error}`);
		throw error;
	}
};