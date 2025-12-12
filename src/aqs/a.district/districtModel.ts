import { pgPool } from "../../utils/db";
import logger from "../../utils/logger";
import { District } from "./interface";

const districtTable = "districts";

export const findAllDistricts = async (): Promise<District[]> => {
	try {
		const { rows } = await pgPool.query<District>(`SELECT * FROM auth.${districtTable} order BY id ASC`);
		return rows.map((row: District) => ({
			code: row.code,
			id: row.id,
			isActive: row.isActive,
			name: row.name,
			organizationId: row.organizationId
		}));
	} catch (error) {
		logger.error(`Database error in findAllDistrict: ${error}`);
		throw error;
	}
};

export const saveDistrict = async (organizationId: number, name: string, code: string) => {
	try {
		const result = await pgPool.query(`INSERT INTO auth.${districtTable} ("organizationId", name, code) VALUES ($1, $2, $3)`, [
			organizationId, name, code
		]);

		return result;

	} catch (error) {
		logger.error(`Database error in saveDistrict: ${error}`);
		throw error;
	}
};

export const updateDistrict = async (id: string, organizationId: number, name: string, code: string) => {
	try {
		const result = await pgPool.query(
			`UPDATE auth.${districtTable} SET "organizationId" = $1, name = $2, code = $3 WHERE id = $4`,
			[organizationId, name, code, id]
		);

		return result;
	} catch (error) {
		logger.error(`Database error in updateDistrict: ${error}`);
		throw error;
	}
};

export const toggleDistrict = async (id: string, isActive: boolean) => {
	try {
		const result = await pgPool.query(`UPDATE auth.${districtTable} SET "isActive" = $1 WHERE id = $2`, [isActive, id]);

		return result;
	} catch (error) {
		logger.error(`Database error in toggleDistrict: ${error}`);
		throw error;
	}
};