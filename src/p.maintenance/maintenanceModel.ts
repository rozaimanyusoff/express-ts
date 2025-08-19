import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Database and table declarations
const dbMaintenance = 'applications';
// Add your table declarations here when you provide the database structure
// Example:
const vehicleMaintenanceTable = `${dbMaintenance}.vehicle_svc`;
const maintenanceTypesTable = `${dbMaintenance}.svctype`;
// const maintenanceSchedulesTable = `${dbMaintenance}.maintenance_schedules`;
// const techniciansTable = `${dbMaintenance}.technicians`;

/* =========== INTERFACES =========== */

// Define your interfaces here when you provide the database structure
// Example:
// export interface MaintenanceRecord {
//   id: number;
//   asset_id: number;
//   maintenance_type_id: number;
//   technician_id: number;
//   scheduled_date: string;
//   completed_date: string;
//   status: string;
//   description: string;
//   cost: number;
//   created_at: string;
// }

/* =========== CRUD OPERATIONS =========== */

// Placeholder CRUD functions - will be implemented based on your database structure

// Example placeholder functions:
export const getVehicleMtnRequests = async (status?: string) => {
	let query = `SELECT * FROM ${vehicleMaintenanceTable}`;
	const params: any[] = [];

	// Add status filtering if provided
	if (status) {
		switch (status.toLowerCase()) {
			case 'pending':
				query += ` WHERE (verification_stat IS NULL OR verification_stat = 0)`;
				break;
			case 'verified':
				query += ` WHERE verification_stat = 1 AND (recommendation_stat IS NULL OR recommendation_stat = 0)`;
				break;
			case 'recommended':
				query += ` WHERE verification_stat = 1 AND recommendation_stat = 1 AND (approval_stat IS NULL OR approval_stat = 0)`;
				break;
			case 'approved':
				query += ` WHERE verification_stat = 1 AND recommendation_stat = 1 AND approval_stat = 1`;
				break;
		}
	}

	query += ` ORDER BY req_id DESC`;

	const [rows] = await pool2.query(query, params);
	const records = rows as any[];

	// Add computed status field to each record
	return records.map(record => ({
		...record,
		status: getRequestStatus(record)
	}));
};

// Helper function to determine status based on verification, recommendation, and approval stats
const getRequestStatus = (record: any): string => {
	const { verification_stat, recommendation_stat, approval_stat } = record;

	if (approval_stat === 1) {
		return 'approved';
	} else if (recommendation_stat === 1) {
		return 'recommended';
	} else if (verification_stat === 1) {
		return 'verified';
	} else {
		return 'pending';
	}
};

export const getVehicleMtnRequestById = async (id: number) => {
	const [rows] = await pool2.query(`SELECT * FROM ${vehicleMaintenanceTable} WHERE req_id = ?`, [id]);
	const record = (rows as RowDataPacket[])[0];

	if (record) {
		return {
			...record,
			status: getRequestStatus(record)
		};
	}

	return record;
};

export const createVehicleMtnRequest = async (recordData: any) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool2.query('SELECT 1 as placeholder');
	return result;
};

export const updateVehicleMtnRequest = async (id: number, recordData: any) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool2.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

export const deleteVehicleMtnRequest = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

// Force invoice creation for approved maintenance record - used when the requestor claimed already upload the form but the maintenance request is still pending for invoicing
export const pushVehicleMtnToBilling = async (requestId: number) => {
	try {
		// Check if invoice already exists
		const [existing] = await pool2.query(
			'SELECT svc_order FROM billings.tbl_inv WHERE svc_order = ?',
			[requestId]
		) as RowDataPacket[][];

		if (existing.length > 0) {
			throw new Error('Invoice already exists for this maintenance record (duplicate)');
		}

		// Insert invoice record
		const [result] = await pool2.query(`
            INSERT INTO billings.tbl_inv
            (svc_order, vehicle_id, entry_code, ws_id, entry_date, cc_id, loc_id)
            SELECT req_id, vehicle_id, entry_code, ws_id, date(approval_date), cc_id, loc_id
            FROM applications.vehicle_svc
            WHERE approval_stat = 1 AND drv_stat != 2 AND req_id = ?
        `, [requestId]) as ResultSetHeader[];

		if (result.affectedRows === 0) {
			throw new Error('No eligible maintenance record found or record not approved');
		}

		return {
			success: true,
			insertId: result.insertId,
			affectedRows: result.affectedRows,
			requestId
		};
	} catch (error) {
		throw error;
	}
};

/* MAINTENANCE TYPE */

export const getServiceTypes = async () => {
	// Placeholder - implement when database structure is provided
	const [rows] = await pool2.query(`SELECT * FROM ${maintenanceTypesTable}`);
	return rows;
};

export const getServiceTypeById = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [rows] = await pool2.query(`SELECT * FROM ${maintenanceTypesTable} WHERE id = ?`, [id]);
	return (rows as RowDataPacket[])[0];
};

export const createServiceType = async (typeData: any) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool2.query(`INSERT INTO ${maintenanceTypesTable} SET ?`, [typeData]);
	return result;
};

export const updateServiceType = async (id: number, typeData: any) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

export const deleteServiceType = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

export const getVehicleMtnRequestByAssetId = async (vehicleId: number, status?: string) => {
	try {
		let query = `SELECT * FROM ${vehicleMaintenanceTable} WHERE asset_id = ?`;
		const params: any[] = [vehicleId];

		// Add status filtering if provided
		if (status) {
			switch (status.toLowerCase()) {
				case 'pending':
					query += ` AND (verification_stat IS NULL OR verification_stat = 0)`;
					break;
				case 'verified':
					query += ` AND verification_stat = 1 AND (recommendation_stat IS NULL OR recommendation_stat = 0)`;
					break;
				case 'recommended':
					query += ` AND verification_stat = 1 AND recommendation_stat = 1 AND (approval_stat IS NULL OR approval_stat = 0)`;
					break;
				case 'approved':
					query += ` AND verification_stat = 1 AND recommendation_stat = 1 AND approval_stat = 1`;
					break;
				default:
					// No additional filtering for invalid status
					break;
			}
		}

		query += ` ORDER BY req_id DESC`;

		const [rows] = await pool2.query(query, params) as RowDataPacket[][];
		return rows;
	} catch (error) {
		throw error;
	}
};

// Add more CRUD functions here based on your requirements
