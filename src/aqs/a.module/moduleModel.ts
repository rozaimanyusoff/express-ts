import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { Module } from "./interface";

const modulesTable = "modules";

export const findAllModules = async (): Promise<Module[]> => {
	try {
		const { rows } = await pgPool.query<Module>(`SELECT * FROM auth.${modulesTable} order BY id ASC`);
		return rows.map((row: Module) => ({
			id: row.id,
			isActive: row.isActive,
			items: row.items,
			name: row.name,
		}));
	} catch (error) {
		logger.error(`Database error in findAllModules: ${error}`);
		throw error;
	}
};

export const saveModule = async (name: string, items: string) => {
	try {
		const result = await pgPool.query(`INSERT INTO auth.${modulesTable} (name, items) VALUES ($1, $2)`, [
			name, items === '' ? null : items
		]);

		return result;

	} catch (error) {
		logger.error(`Database error in saveModule: ${error}`);
		throw error;
	}
};

export const updateModule = async (id: string, name: string, items: string) => {
	try {
		const result = await pgPool.query(
			`UPDATE auth.${modulesTable} SET name = $1, items = $2 WHERE id = $3`,
			[name, items === '' ? null : items, id]
		);

		return result;
	} catch (error) {
		logger.error(`Database error in updateModule: ${error}`);
		throw error;
	}
};

export const toggleModule = async (id: string, isActive: boolean) => {
	try {
		const result = await pgPool.query(`UPDATE auth.${modulesTable} SET "isActive" = $1 WHERE id = $2`, [isActive, id]);

		return result;
	} catch (error) {
		logger.error(`Database error in toggleModule: ${error}`);
		throw error;
	}
};