import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Database and table declarations
const dbMaintenance = 'applications';
// Add your table declarations here when you provide the database structure
// Example:
const vehicleMaintenanceTable = `${dbMaintenance}.vehicle_svc`;
const maintenanceTypesTable = `${dbMaintenance}.svctype`;
const fleetInsuranceTable = `${dbMaintenance}.fleet_insurance`;
const roadtaxTable = `${dbMaintenance}.roadtax`;
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

// Create a new vehicle maintenance request from user application form
export const createVehicleMtnRequest = async (data: any) => {
	const [result] = await pool2.query(`
		INSERT INTO ${vehicleMaintenanceTable} (req_date, ramco_id, costcenter_id, location_id, ctc_m, vehicle_id, register_number, entry_code, asset_id, odo_start, odo_end, req_comment, svc_opt
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
		[data.req_date, data.ramco_id, data.costcenter_id, data.location_id, data.ctc_m, data.vehicle_id, data.register_number, data.entry_code, data.asset_id, data.odo_start, data.odo_end, data.req_comment, data.svc_opt]
	);
	return (result as ResultSetHeader).insertId;
};

// Coordinator updates the vehicle maintenance request
export const updateVehicleMtnRequest = async (id: number, data: any) => {
	const [result] = await pool2.query(
		`UPDATE ${vehicleMaintenanceTable} SET verification_comment=?, verification_stat=?, verification_date=?, rejection_comment=?, ws_id=?, major_opt=?, major_svc_comment=? WHERE req_id = ?`, 
		[data.coordinator_comment, data.service_confirmation, data.verification_date, data.rejection_comment, data.workshop_id, data.major_service_options, data.major_service_comment, id]
	);
	return result;
};

export const deleteVehicleMtnRequest = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

//Recommended
export const recommendVehicleMtnRequest = async (id: number, ramco_id: string | number, stat: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool2.query(`
		UPDATE ${vehicleMaintenanceTable} SET recommendation = ?, recommendation_stat = ?, recommendation_date = NOW() WHERE req_id = ?`, [ramco_id, stat, id]);
	return result;
};

//Approve
export const approveVehicleMtnRequest = async (id: number, ramco_id: string | number, stat: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool2.query(`
		UPDATE ${vehicleMaintenanceTable} SET approval = ?, approval_stat = ?, approval_date = NOW() WHERE req_id = ?`, [ramco_id, stat, id]);
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

/* ================== FLEET INSURANCE + ROADTAX ================== */

export interface FleetInsurance {
    id: number;
    insurer: string;
    policy_no: string;
    coverage_start: string | Date;
    coverage_end: string | Date;
    coverage_details?: string | null;
    premium_amount?: number | null;
    created_at?: string | Date;
    updated_at?: string | Date;
    updated_by?: string | number | null;
}

export interface RoadtaxRow {
    id: number;
    insurer_id: number;
    asset_id: number;
    register_number?: string | null;
    roadtax_expiry?: string | Date | null;
    roadtax_amount?: number | null;
    created_at?: string | Date;
    updated_at?: string | Date;
}

type CreateInsurancePayload = {
    assets_ids: number[];
    insurance: {
        insurer: string;
        policy_no: string;
        coverage_start: string | Date;
        coverage_end: string | Date;
        premium_amount?: number | null;
        coverage_details?: string | null;
        updated_by?: string | number | null;
    }
}

// Create insurance and seed roadtax rows for provided assets
export async function createFleetInsuranceWithAssets(payload: CreateInsurancePayload) {
    const { assets_ids = [], insurance } = payload || ({} as any);
    if (!insurance || !Array.isArray(assets_ids)) {
        throw new Error('Invalid payload: missing insurance or assets_ids');
    }

    // Preload register numbers for assets (best-effort; uses pool on assets DB)
    let registerMap = new Map<number, string | null>();
    try {
        if (assets_ids.length > 0) {
            const placeholders = assets_ids.map(() => '?').join(',');
            const [rows] = await pool.query(
                `SELECT id, register_number FROM assets.assetdata WHERE id IN (${placeholders})`,
                assets_ids
            );
            const arr = Array.isArray(rows) ? (rows as any[]) : [];
            registerMap = new Map(arr.map(r => [Number(r.id), r.register_number || null]));
        }
    } catch {
        // ignore; we'll insert null register_number if not resolvable
    }

    const conn = await pool2.getConnection();
    try {
        await conn.beginTransaction();
        const [insResult] = await conn.query(
            `INSERT INTO ${fleetInsuranceTable}
            (insurer, policy_no, coverage_start, coverage_end, coverage_details, premium_amount, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
            [
                insurance.insurer,
                insurance.policy_no,
                insurance.coverage_start,
                insurance.coverage_end,
                insurance.coverage_details ?? null,
                insurance.premium_amount ?? null,
                insurance.updated_by ?? null,
            ]
        ) as any[];
        const insertedId: number = (insResult as any).insertId;

        // Insert roadtax rows (initially without expiry/amount)
        for (const assetId of assets_ids) {
            const reg = registerMap.get(Number(assetId)) ?? null;
            await conn.query(
                `INSERT INTO ${roadtaxTable}
                (insurer_id, asset_id, register_number, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())`,
                [insertedId, assetId, reg]
            );
        }

        await conn.commit();
        return insertedId;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// Update insurance and synchronize asset roadtax rows
export async function updateFleetInsuranceWithAssets(id: number, payload: CreateInsurancePayload) {
    const { assets_ids = [], insurance } = payload || ({} as any);
    if (!id || !insurance || !Array.isArray(assets_ids)) {
        throw new Error('Invalid payload: missing id, insurance or assets_ids');
    }

    // Preload register numbers for assets (best-effort; uses pool on assets DB)
    let registerMap = new Map<number, string | null>();
    try {
        if (assets_ids.length > 0) {
            const placeholders = assets_ids.map(() => '?').join(',');
            const [rows] = await pool.query(
                `SELECT id, register_number FROM assets.assetdata WHERE id IN (${placeholders})`,
                assets_ids
            );
            const arr = Array.isArray(rows) ? (rows as any[]) : [];
            registerMap = new Map(arr.map(r => [Number(r.id), r.register_number || null]));
        }
    } catch {
        // ignore
    }

    const conn = await pool2.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE ${fleetInsuranceTable}
             SET insurer = ?, policy_no = ?, coverage_start = ?, coverage_end = ?, coverage_details = ?, premium_amount = ?, updated_at = NOW(), updated_by = ?
             WHERE id = ?`,
            [
                insurance.insurer,
                insurance.policy_no,
                insurance.coverage_start,
                insurance.coverage_end,
                insurance.coverage_details ?? null,
                insurance.premium_amount ?? null,
                insurance.updated_by ?? null,
                id
            ]
        );

        // Fetch existing asset associations
        const [existingRows] = await conn.query(`SELECT asset_id FROM ${roadtaxTable} WHERE insurer_id = ?`, [id]);
        const existing = new Set((Array.isArray(existingRows) ? existingRows as any[] : []).map(r => Number(r.asset_id)));
        const incoming = new Set(assets_ids.map(Number));

        // Determine to add and to remove
        const toAdd: number[] = [];
        const toRemove: number[] = [];
        for (const aid of incoming) if (!existing.has(aid)) toAdd.push(aid);
        for (const aid of existing) if (!incoming.has(aid)) toRemove.push(aid);

        // Apply removals
        if (toRemove.length > 0) {
            const ph = toRemove.map(() => '?').join(',');
            await conn.query(`DELETE FROM ${roadtaxTable} WHERE insurer_id = ? AND asset_id IN (${ph})`, [id, ...toRemove]);
        }

        // Apply additions
        for (const assetId of toAdd) {
            const reg = registerMap.get(Number(assetId)) ?? null;
            await conn.query(
                `INSERT INTO ${roadtaxTable}
                (insurer_id, asset_id, register_number, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())`,
                [id, assetId, reg]
            );
        }

        await conn.commit();
        return { id, added: toAdd.length, removed: toRemove.length };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

export async function getFleetInsuranceById(id: number) {
    const [insRows] = await pool2.query(`SELECT * FROM ${fleetInsuranceTable} WHERE id = ?`, [id]);
    const insurance = (insRows as RowDataPacket[])[0];
    if (!insurance) return null;
    const [rtRows] = await pool2.query(`SELECT * FROM ${roadtaxTable} WHERE insurer_id = ?`, [id]);
    const assets = Array.isArray(rtRows) ? rtRows as RoadtaxRow[] : [];
    return { insurance, assets };
}

export async function listFleetInsurances() {
    const [rows] = await pool2.query(`SELECT * FROM ${fleetInsuranceTable} ORDER BY id DESC`);
    return rows as RowDataPacket[];
}

export async function getRoadtaxCountsByInsurer() {
    const [rows] = await pool2.query(`
        SELECT insurer_id, COUNT(*) AS assets_count
        FROM ${roadtaxTable}
        GROUP BY insurer_id
    `);
    return rows as RowDataPacket[];
}
