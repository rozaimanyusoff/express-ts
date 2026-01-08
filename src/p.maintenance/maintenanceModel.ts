import { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool, pool2 } from '../utils/db';

// Database and table declarations
const dbMaintenance = 'applications';
const dbAssets = 'assets';
// Add your table declarations here when you provide the database structure
// Example:
const vehicleMaintenanceTable = `${dbMaintenance}.vehicle_svc`;
const maintenanceTypesTable = `${dbMaintenance}.svctype`;
const insuranceTable = `${dbMaintenance}.insurance`;
const roadtaxTable = `${dbMaintenance}.vehicle_insurance`;
// const maintenanceSchedulesTable = `${dbMaintenance}.maintenance_schedules`;
// const techniciansTable = `${dbMaintenance}.technicians`;

const dbBilling = 'billings';
const maintenanceBillingTable = `${dbBilling}.tbl_inv`;

const poolCarTable = `${dbMaintenance}.poolcar`;

const tngTable = `${dbMaintenance}.touchngo`;
const tngDetailTable = `${dbMaintenance}.touchngo_det`;

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
export const getVehicleMtnRequests = async (status?: string, ramco?: string, years?: number[], pendingStatus?: string) => {
    // Select only essential columns to minimize payload
    let query = `SELECT 
        req_id, asset_id, ramco_id, req_date, ws_id, svc_opt,
        verification_stat, recommendation_stat, approval_stat, drv_stat,
        verification_date, recommendation_date, approval_date, form_upload_date,
        cc_id, costcenter_id, req_comment, upload_date, form_upload, emailStat, drv_date, inv_status,
        recommendation, approval
    FROM ${vehicleMaintenanceTable}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Add status filtering if provided (finalized states only)
    if (status) {
        const s = status.toLowerCase();
        switch (s) {
            case 'approved':
                // Approved: verification_stat=1, recommendation_stat=1, approval_stat=1
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=1 AND IFNULL(approval_stat,0)=1)`);
                break;
            case 'cancelled':
                // cancelled by driver
                conditions.push(`IFNULL(drv_stat,0) = 2`);
                break;
            case 'recommended':
                // Recommended: verification_stat=1, recommendation_stat=1, approval_stat=0
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=1 AND IFNULL(approval_stat,0)=0)`);
                break;
            case 'rejected':
                // any rejection
                conditions.push(`(IFNULL(verification_stat,0)=2 OR IFNULL(recommendation_stat,0)=2 OR IFNULL(approval_stat,0)=2)`);
                break;
            case 'verified':
                // Verified: verification_stat=1, recommendation_stat=0, approval_stat=0
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=0 AND IFNULL(approval_stat,0)=0)`);
                break;
        }
    }

    // Add pendingstatus filtering when provided (verified|recommended|approved pending phases)
    if (pendingStatus) {
        const p = pendingStatus.toLowerCase();
        const is = (val: string) => p === val;
        const synonyms = {
            approved: ['approved', 'approval'],
            recommended: ['recommended', 'recommendation'],
            verified: ['verified', 'verification']
        } as const;
        if (synonyms.verified.includes(p as any)) {
            // Pending verification: all 0
            conditions.push(`(IFNULL(verification_stat,0)=0 AND IFNULL(recommendation_stat,0)=0 AND IFNULL(approval_stat,0)=0)`);
        } else if (synonyms.recommended.includes(p as any)) {
            // Pending recommendation: verification not 0/2; recommendation and approval 0
            conditions.push(`(IFNULL(verification_stat,0) NOT IN (0,2) AND IFNULL(recommendation_stat,0)=0 AND IFNULL(approval_stat,0)=0)`);
        } else if (synonyms.approved.includes(p as any)) {
            // Pending approval: verification and recommendation not 0/2; approval 0
            conditions.push(`(IFNULL(verification_stat,0) NOT IN (0,2) AND IFNULL(recommendation_stat,0) NOT IN (0,2) AND IFNULL(approval_stat,0)=0)`);
        }
    }

    // Add ramco (requester) filter if provided
    if (ramco && String(ramco).trim() !== '') {
        conditions.push(`ramco_id = ?`);
        params.push(String(ramco).trim());
    }

    // Add year filter if provided (YEAR(req_date) IN (...))
    if (Array.isArray(years) && years.length > 0) {
        const placeholders = years.map(() => '?').join(',');
        conditions.push(`YEAR(req_date) IN (${placeholders})`);
        params.push(...years);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY req_id DESC`;

    const [rows] = await pool.query(query, params);
    const records = rows as any[];

    // Add computed status field to each record
    return records.map(record => ({
        ...record,
        application_status: getApplicationStatus(record),
        status: getRequestStatus(record)
    }));
};

// Efficient count function for maintenance requests (used for badge counts)
export const countVehicleMtnRequests = async (status?: string) => {
    let query = `SELECT COUNT(*) as count FROM ${vehicleMaintenanceTable}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Add status filtering if provided
    if (status) {
        const s = status.toLowerCase();
        switch (s) {
            case 'approved':
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=1 AND IFNULL(approval_stat,0)=1)`);
                break;
            case 'cancelled':
                conditions.push(`IFNULL(drv_stat,0) = 2`);
                break;
            case 'pending':
                conditions.push(`(IFNULL(verification_stat,0)=0 AND IFNULL(recommendation_stat,0)=0 AND IFNULL(approval_stat,0)=0 AND IFNULL(drv_stat,0)!=2)`);
                break;
            case 'recommended':
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=1 AND IFNULL(approval_stat,0)=0)`);
                break;
            case 'rejected':
                conditions.push(`(IFNULL(verification_stat,0)=2 OR IFNULL(recommendation_stat,0)=2 OR IFNULL(approval_stat,0)=2)`);
                break;
            case 'verified':
                conditions.push(`(IFNULL(verification_stat,0)=1 AND IFNULL(recommendation_stat,0)=0 AND IFNULL(approval_stat,0)=0)`);
                break;
        }
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    const [rows] = await pool.query(query, params);
    const result = rows as any[];
    return result[0]?.count ?? 0;
};

// Helper function to determine status based on verification, recommendation, approval and driver stats
const getRequestStatus = (record: any): string => {
    const v = Number(record?.verification_stat ?? 0);
    const r = Number(record?.recommendation_stat ?? 0);
    const a = Number(record?.approval_stat ?? 0);
    const d = Number(record?.drv_stat ?? 0);

    // Cancelled by driver takes precedence
    if (d === 2) return 'cancelled';
    // Any rejection on the flow (except driver cancellation) is 'rejected'
    if (v === 2 || r === 2 || a === 2) return 'rejected';
    // If maintenance form has been uploaded, show as 'Form Uploaded'
    try {
        const fu = (record?.form_upload !== undefined && record.form_upload !== null) ? String(record.form_upload).trim() : '';
        if (fu) return 'Form Uploaded';
    } catch { /* ignore */ }
    // Approved when all stages are positively confirmed and not cancelled
    if (v === 1 && r === 1 && a === 1) return 'approved';
    // Pending phases
    if (v === 0 && r === 0 && a === 0) return 'pending verification';
    if (v === 1 && r === 0 && a === 0) return 'pending recommendation';
    if (v === 1 && r === 1 && a === 0) return 'pending approval';
    // Default fallback
    return 'pending';
};

// Detailed application status including rejections/cancellation
export const getApplicationStatus = (record: any): string => {
    const v = Number(record?.verification_stat ?? null);
    const r = Number(record?.recommendation_stat ?? null);
    const a = Number(record?.approval_stat ?? null);
    const d = Number(record?.drv_stat ?? null);
    if (d === 2) return 'cancelled';
    if (a === 2) return 'approval_rejected';
    if (r === 2) return 'recommendation_rejected';
    if (v === 2) return 'verification_rejected';
    if (a === 1) return 'approved';
    if (r === 1) return 'recommended';
    if (v === 1) return 'verified';
    if (d === 1) return 'accepted';
    return 'pending';
};

export const getVehicleMtnRequestById = async (id: number) => {
	const [rows] = await pool.query(`SELECT * FROM ${vehicleMaintenanceTable} WHERE req_id = ?`, [id]);
	const record = (rows as RowDataPacket[])[0];

    if (record) {
        // Map svc_opt to svc_type with names
        let svc_type: any[] = [];
        if (record.svc_opt) {
            const serviceTypes = await getServiceTypes() as any[];
            const svcTypeIds = String(record.svc_opt)
                .split(',')
                .map((id: string) => parseInt(id.trim()))
                .filter((n: number) => Number.isFinite(n));
            
            svc_type = svcTypeIds
                .map((id: number) => {
                    const st = serviceTypes.find((s: any) => s.svctype_id === id);
                    return st ? { id: st.svctype_id, name: st.svctype_name } : null;
                })
                .filter((st: any) => st !== null);
        }

        return {
            ...record,
            application_status: getApplicationStatus(record),
            status: getRequestStatus(record),
            svc_type
        };
    }

	return record;
};

// Create a new vehicle maintenance request from user application form
export const createVehicleMtnRequest = async (data: any) => {
    // Map data to DB columns. Some schemas use vehicle_id separately; we prefer asset_id and mirror vehicle_id when provided.
    const req_date = data.req_date ?? null;
    const ramco_id = data.ramco_id ?? null;
    const costcenter_id = data.costcenter_id ?? data.cc_id ?? null;
    const location_id = data.location_id ?? data.loc_id ?? null;
    const contact = data.ctc_m ?? null;
    const asset_id = data.asset_id ?? null;
    const vehicle_id = data.vehicle_id ?? data.asset_id ?? null;
    const register_number = data.register_number ?? '';
    const entry_code = data.entry_code ?? '';
    const odo_start = data.odo_start ?? null;
    const odo_end = data.odo_end ?? null;
    const req_comment = data.req_comment ?? '';
    const svc_opt = data.svc_opt ?? '';
    const extra_mileage = (data.extra_mileage !== undefined && data.extra_mileage !== null && Number(data.extra_mileage) > 0) ? Number(data.extra_mileage) : null;
    const late_notice = data.late_notice ?? ((extra_mileage && extra_mileage > 500) ? ' - ' : null);
    const late_notice_date = data.late_notice_date ?? (late_notice ? (req_date ?? null) : null);
    const req_upload = data.req_upload_path ?? null; // normalized DB path from controller (uploads/vehiclemtn2/<filename>)

    const [result] = await pool.query(
        `INSERT INTO ${vehicleMaintenanceTable}
         (req_date, ramco_id, costcenter_id, location_id, ctc_m, vehicle_id, register_number, entry_code, asset_id, odo_start, odo_end, req_comment, svc_opt, extra_mileage, late_notice, late_notice_date, req_upload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req_date, ramco_id, costcenter_id, location_id, contact, vehicle_id, register_number, entry_code, asset_id, odo_start, odo_end, req_comment, svc_opt, extra_mileage, late_notice, late_notice_date, req_upload]
    );
    return (result as ResultSetHeader).insertId;
};

// Coordinator updates the vehicle maintenance request
export const updateVehicleMtnRequest = async (id: number, data: any) => {
    // Build dynamic SET clauses to support various updates (verification, workshop, cancellation, etc.)
    const sets: string[] = [];
    const params: any[] = [];

    const map: Record<string, string> = {
        coordinator_comment: 'verification_comment',
        drv_cancel_comment: 'drv_cancel_comment',
        drv_date: 'drv_date',
        // cancellation fields
        drv_stat: 'drv_stat',
        major_service_comment: 'major_svc_comment',
        major_service_options: 'major_opt',
        rejection_comment: 'rejection_comment',
        service_confirmation: 'verification_stat',
        verification_date: 'verification_date',
        workshop_id: 'ws_id'
    };

    for (const [key, column] of Object.entries(map)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            sets.push(`${column} = ?`);
            params.push((data)[key]);
        }
    }

    // Allow direct column updates if controller sends DB column names (defensive flexibility)
    const directKeys = [
        'verification_comment','verification_stat','verification_date','rejection_comment','ws_id','major_opt','major_svc_comment',
        // driver cancellation
        'drv_stat','drv_cancel_comment','drv_date',
        // approval workflow
        'approval','approval_stat','approval_date',
        // maintenance form upload
        'form_upload','form_upload_date'
    ];
    for (const col of directKeys) {
        if (Object.prototype.hasOwnProperty.call(data, col) && !sets.find(s => s.startsWith(`${col} =`))) {
            sets.push(`${col} = ?`);
            params.push((data)[col]);
        }
    }

        if (sets.length === 0) {
            // Nothing to update; return a ResultSetHeader-shaped object
            const noop: ResultSetHeader = {
                affectedRows: 0,
                changedRows: 0,
                fieldCount: 0,
                info: 'No fields to update',
                insertId: 0,
                serverStatus: 0,
                warningStatus: 0
            } as ResultSetHeader;
            return noop;
        }

    const sql = `UPDATE ${vehicleMaintenanceTable} SET ${sets.join(', ')} WHERE req_id = ?`;
    params.push(id);
    const [result] = await pool.query(sql, params);
    return result as ResultSetHeader;
};

export const deleteVehicleMtnRequest = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query('SELECT 1 as placeholder WHERE 1 = ?', [id]);
	return result;
};

//Recommended
export const recommendVehicleMtnRequest = async (id: number, ramco_id: number | string, stat: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query(`
		UPDATE ${vehicleMaintenanceTable} SET recommendation = ?, recommendation_stat = ?, recommendation_date = NOW() WHERE req_id = ?`, [ramco_id, stat, id]);
	return result;
};

//Approve
export const approveVehicleMtnRequest = async (id: number, ramco_id: number | string, stat: number) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query(`
		UPDATE ${vehicleMaintenanceTable} SET approval = ?, approval_stat = ?, approval_date = NOW() WHERE req_id = ?`, [ramco_id, stat, id]);
	return result;
};

// Update uploaded request form path after we know the req_id and renamed file
export const updateVehicleMtnUpload = async (req_id: number, dbPath: string) => {
    const [result] = await pool.query(
        `UPDATE ${vehicleMaintenanceTable} SET req_upload = ? WHERE req_id = ?`,
        [dbPath, req_id]
    );
    return result as ResultSetHeader;
};

// Force invoice creation for approved maintenance record - used when the requestor claimed already upload the form but the maintenance request is still pending for invoicing
export const pushVehicleMtnToBilling = async (reqId: number) => {
	try {
		// Check if invoice already exists
		const [existing] = await pool.query(
			`SELECT svc_order FROM ${maintenanceBillingTable} WHERE svc_order = ?`,
			[reqId]
		) as RowDataPacket[][];

		if (existing.length > 0) {
			throw new Error('Invoice already exists for this maintenance record (duplicate)');
		}

        // Insert invoice record (trust caller did the approval); tolerate nulls for optional fields
        const [result] = await pool.query(`
            INSERT INTO ${maintenanceBillingTable}
            (svc_order, asset_id, register_number, entry_code, ws_id, entry_date, costcenter_id, location_id)
            SELECT req_id, asset_id, register_number, entry_code, ws_id, approval_date,costcenter_id, location_id FROM ${vehicleMaintenanceTable} WHERE req_id = ?
        `, [reqId]) as ResultSetHeader[];

		if (result.affectedRows === 0) {
			throw new Error('No eligible maintenance record found or record not approved');
		}

		return {
			affectedRows: result.affectedRows,
			insertId: result.insertId,
			reqId,
			success: true
		};
	} catch (error) {
		throw error;
	}
};

/* =========== MAINTENANCE TYPE =========== */
export const getServiceTypes = async () => {
	// Placeholder - implement when database structure is provided
	const [rows] = await pool.query(`SELECT * FROM ${maintenanceTypesTable}`);
	return rows;
};

export const getServiceTypeById = async (id: number) => {
	// Placeholder - implement when database structure is provided
	const [rows] = await pool.query(`SELECT * FROM ${maintenanceTypesTable} WHERE id = ?`, [id]);
	return (rows as RowDataPacket[])[0];
};

export const createServiceType = async (typeData: any) => {
	// Placeholder - implement when database structure is provided
	const [result] = await pool.query(`INSERT INTO ${maintenanceTypesTable} SET ?`, [typeData]);
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
				case 'approved':
					query += ` AND verification_stat = 1 AND recommendation_stat = 1 AND approval_stat = 1`;
					break;
				case 'pending':
					query += ` AND (verification_stat IS NULL OR verification_stat = 0)`;
					break;
				case 'recommended':
					query += ` AND verification_stat = 1 AND recommendation_stat = 1 AND (approval_stat IS NULL OR approval_stat = 0)`;
					break;
				case 'verified':
					query += ` AND verification_stat = 1 AND (recommendation_stat IS NULL OR recommendation_stat = 0)`;
					break;
				default:
					// No additional filtering for invalid status
					break;
			}
		}

		query += ` ORDER BY req_id DESC`;

		const [rows] = await pool.query(query, params) as RowDataPacket[][];
		return rows;
	} catch (error) {
		throw error;
	}
};


/* ================== INSURANCE ================== */
//insurance CRUD operations will be here when database structure is provided
export const getInsurances = async () => {
    // Placeholder - implement when database structure is provided
    const [rows] = await pool.query(`SELECT * FROM ${insuranceTable} ORDER BY id DESC`);
    return rows;
}

export const getInsuranceById = async (id: number) => {
    // Placeholder - implement when database structure is provided
    const [rows] = await pool.query(`SELECT * FROM ${insuranceTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};

export const createInsurance = async (data: any) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`INSERT INTO ${insuranceTable} SET ?`, [data]);
    return (result as ResultSetHeader).insertId;
};

export const updateInsurance = async (id: number, data: any) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`UPDATE ${insuranceTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteInsurance = async (id: number) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`DELETE FROM ${insuranceTable} WHERE id = ?`, [id]);
    return result;
}

/* ================== ROAD TAX ================== */
//roadtax CRUD operations will be here when database structure is provided
export const getRoadTaxes = async () => {
    // Placeholder - implement when database structure is provided
    const [rows] = await pool.query(`SELECT * FROM ${roadtaxTable} ORDER BY rt_id DESC`);
    return rows;
};

export const getRoadTaxById = async (id: number) => {
    // Placeholder - implement when database structure is provided
    const [rows] = await pool.query(`SELECT * FROM ${roadtaxTable} WHERE rt_id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};

export const getRoadTaxByInsuranceId = async (insuranceId: number) => {
    // Placeholder - implement when database structure is provided
    const [rows] = await pool.query(`SELECT * FROM ${roadtaxTable} WHERE insurance_id = ? ORDER BY rt_id DESC`, [insuranceId]);
    return rows;
};

export const createRoadTax = async (data: any) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`INSERT INTO ${roadtaxTable} SET ?`, [data]);
    return (result as ResultSetHeader).insertId;
};

export const updateRoadTax = async (id: number, data: any) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`UPDATE ${roadtaxTable} SET ? WHERE rt_id = ?`, [data, id]);
    return result;
};

// Bulk update: set insurance_id for all roadtax rows matching any of the provided asset IDs
// If asset_id doesn't exist in roadtax table, insert a new record
export const updateRoadTaxByAssets = async (insuranceId: number, assetIds: number[]) => {
    const ids = Array.isArray(assetIds) ? assetIds.filter((n) => Number.isFinite(Number(n))).map(Number) : [];
    if (!ids.length) {
        // Return a ResultSetHeader-like object with 0 affected rows
        return { affectedRows: 0, changedRows: 0, insertedCount: 0, warningStatus: 0 } as any;
    }

    // Check which asset_ids already exist in roadtax table
    const placeholders = ids.map(() => '?').join(',');
    const [existingRows] = await pool.query(
        `SELECT DISTINCT asset_id FROM ${roadtaxTable} WHERE asset_id IN (${placeholders})`,
        ids
    ) as RowDataPacket[][];

    const existingAssetIds = new Set(existingRows.map((row: any) => Number(row.asset_id)));
    const toUpdate = ids.filter(id => existingAssetIds.has(id));
    const toInsert = ids.filter(id => !existingAssetIds.has(id));

    let updatedCount = 0;
    let insertedCount = 0;

    // Update existing records
    if (toUpdate.length > 0) {
        const updatePlaceholders = toUpdate.map(() => '?').join(',');
        const updateSql = `UPDATE ${roadtaxTable} SET insurance_id = ? WHERE asset_id IN (${updatePlaceholders})`;
        const updateParams = [insuranceId, ...toUpdate];
        const [updateResult] = await pool.query(updateSql, updateParams) as ResultSetHeader[];
        updatedCount = updateResult.affectedRows || 0;
    }

    // Insert new records for asset_ids that don't exist
    if (toInsert.length > 0) {
        for (const assetId of toInsert) {
            try {
                const [insertResult] = await pool.query(
                    `INSERT INTO ${roadtaxTable} (asset_id, insurance_id) VALUES (?, ?)`,
                    [assetId, insuranceId]
                ) as ResultSetHeader[];
                if (insertResult.affectedRows > 0) insertedCount++;
            } catch (error) {
                console.error(`Error inserting roadtax record for asset_id ${assetId}:`, error);
                // Continue with other inserts even if one fails
            }
        }
    }

    return {
        affectedRows: updatedCount + insertedCount,
        changedRows: updatedCount,
        insertedCount,
        updatedCount,
        warningStatus: 0
    };
};

// Bulk update: set rt_exp for all roadtax rows matching any of the provided asset IDs
export const updateRoadTaxExpiryByAssets = async (rtExp: string, assetIds: number[]) => {
    const ids = Array.isArray(assetIds) ? assetIds.filter((n) => Number.isFinite(Number(n))).map(Number) : [];
    if (!ids.length) {
        return { affectedRows: 0, changedRows: 0, warningStatus: 0 } as any;
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE ${roadtaxTable} SET rt_exp = ?, updated_at = NOW() WHERE asset_id IN (${placeholders})`;
    const params = [rtExp, ...ids];
    const [result] = await pool.query(sql, params);
    return result;
};

export const deleteRoadTax = async (id: number) => {
    // Placeholder - implement when database structure is provided
    const [result] = await pool.query(`DELETE FROM ${roadtaxTable} WHERE rt_id = ?`, [id]);
    return result;
};

/* ================= POOLCAR APPS ================= */

export const getPoolCars = async (opts?: { asset_id?: number }) => {
    // Optional filter by assigned asset_id
    const where: string[] = [];
    const params: any[] = [];
    if (opts && typeof opts.asset_id === 'number' && Number.isFinite(opts.asset_id) && opts.asset_id > 0) {
        where.push(`asset_id = ?`);
        params.push(Number(opts.asset_id));
    }
    const sql = `SELECT * FROM ${poolCarTable}` + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ` ORDER BY pcar_id DESC`;
    const [rows] = await pool.query(sql, params);
    const arr = rows as RowDataPacket[];
    // Attach computed status based on approval_stat and pcar_cancel
    return arr.map((r: any) => ({
        ...r,
        status: getPoolCarStatus(r)
    }));
};
export const getPoolCarById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${poolCarTable} WHERE pcar_id = ?`, [id]);
    const rec = (rows as RowDataPacket[])[0];
    if (!rec) return rec;
    return { ...(rec as any), status: getPoolCarStatus(rec as any) };
};
export const createPoolCar = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${poolCarTable} SET ?`, [data]);
    return (result as ResultSetHeader).insertId;
};
export const updatePoolCar = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${poolCarTable} SET ? WHERE pcar_id = ?`, [data, id]);
    return result;
};
export const deletePoolCar = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${poolCarTable} WHERE pcar_id = ?`, [id]);
    return result;
};

//admin need to get poolcar status whether is available or hired. hired means the poolcar is taken by user and not yet return from last assigned by last application. poolcar identified by asset_id or vehicle_id.
export const getAvailablePoolCars = async () => {
    // Determine status per unique vehicle (identified by asset_id when present, otherwise vehicle_id)
    // Status rules:
    //  - 'hired'   if the latest record for the vehicle has approval_stat = 1 AND no return date
    //  - 'pending' if the latest record has approval_stat NULL/0 AND no return date (requested but not approved)
    //  - 'available' otherwise (including when last record is returned or rejected/cancelled)
    const sql = `
        SELECT 
            t.asset_id,
            t.pcar_id,
            t.pcar_retdate,
            t.approval_stat,
            -- count of hired applications for this vehicle within last 30 days
            (
                SELECT COUNT(1)
                FROM ${poolCarTable} h
                WHERE 
                    (
                        (t.asset_id IS NOT NULL AND t.asset_id > 0 AND h.asset_id = t.asset_id)
                        OR (t.vehicle_id IS NOT NULL AND t.vehicle_id > 0 AND h.vehicle_id = t.vehicle_id)
                    )
                    AND h.approval_stat = 1
                    AND DATE(
                        CASE
                            WHEN h.approval_date IS NOT NULL AND YEAR(h.approval_date) >= 2000 THEN h.approval_date
                            WHEN h.pcar_datereq IS NOT NULL AND YEAR(h.pcar_datereq) >= 2000 THEN h.pcar_datereq
                            WHEN h.pcar_datefr IS NOT NULL AND YEAR(h.pcar_datefr) >= 2000 THEN h.pcar_datefr
                            ELSE NULL
                        END
                    ) >= (CURDATE() - INTERVAL 30 DAY)
            ) AS hired_last_30d,
            CASE 
                WHEN t.approval_stat = 1 AND t.pcar_retdate IS NULL THEN 'hired'
                WHEN (t.approval_stat IS NULL OR t.approval_stat = 0) AND t.pcar_retdate IS NULL THEN 'pending'
                ELSE 'available'
            END AS status
        FROM ${poolCarTable} t
        JOIN (
            SELECT 
                CASE 
                    WHEN asset_id IS NOT NULL AND asset_id > 0 THEN CONCAT('A:', asset_id)
                    WHEN vehicle_id IS NOT NULL AND vehicle_id > 0 THEN CONCAT('V:', vehicle_id)
                    ELSE NULL
                END AS vehicle_key,
                MAX(pcar_id) AS max_id
            FROM ${poolCarTable}
            WHERE (asset_id IS NOT NULL AND asset_id > 0) OR (vehicle_id IS NOT NULL AND vehicle_id > 0)
            GROUP BY CASE 
                WHEN asset_id IS NOT NULL AND asset_id > 0 THEN CONCAT('A:', asset_id)
                WHEN vehicle_id IS NOT NULL AND vehicle_id > 0 THEN CONCAT('V:', vehicle_id)
                ELSE NULL END
        ) x
        ON (
            (CASE 
                WHEN t.asset_id IS NOT NULL AND t.asset_id > 0 THEN CONCAT('A:', t.asset_id)
                WHEN t.vehicle_id IS NOT NULL AND t.vehicle_id > 0 THEN CONCAT('V:', t.vehicle_id)
                ELSE NULL END) = x.vehicle_key
            AND t.pcar_id = x.max_id
        )
        -- Exclude 'pending' rows (awaiting approval with no return yet)
        WHERE NOT ((t.approval_stat IS NULL OR t.approval_stat = 0) AND t.pcar_retdate IS NULL)
        ORDER BY t.pcar_id DESC`;
    const [rows] = await pool.query(sql);
    return rows as RowDataPacket[];
};

// Helper to compute poolcar status from approval_stat and pcar_cancel
export const getPoolCarStatus = (input: any, pcar_cancelParam?: any): string => {
    // Support calling with a record or raw values
    const approval_stat = (typeof input === 'object' && input !== null && 'approval_stat' in input)
        ? (input).approval_stat
        : input;
    const pcar_cancel = (typeof input === 'object' && input !== null && 'pcar_cancel' in input)
        ? (input).pcar_cancel
        : pcar_cancelParam;
    const pcar_retdate = (typeof input === 'object' && input !== null && 'pcar_retdate' in input)
        ? (input).pcar_retdate
        : undefined;

    const a = Number(approval_stat ?? 0);
    const cancelled = (() => {
        const v = pcar_cancel;
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return v === 1;
        if (typeof v === 'boolean') return v;
        const s = String(v).toLowerCase();
        return s === '1' || s === 'true' || s === 'yes' || s === 'cancelled';
    })();
    const hasReturned = (() => {
        if (pcar_retdate === null || pcar_retdate === undefined) return false;
        const d = new Date(pcar_retdate);
        return !Number.isNaN(d.getTime());
    })();

    // Rules:
    // - if approval_stat: 2 & pcar_cancel: any => rejected
    if (a === 2) return 'rejected';
    // - if pcar_cancel indicates cancellation => cancelled
    if (cancelled) return 'cancelled';
    // - if returned date exists => returned
    if (hasReturned) return 'returned';
    // - if approval_stat: 0 & pcar_cancel: '1' => cancelled
    if (a === 0 && cancelled) return 'cancelled';
    // - if approval_stat: 1 & pcar_cancel: null => approved
    if (a === 1 && !cancelled) return 'approved';
    // - if approval_stat: 0 & pcar_cancel: null => pending
    if (a === 0 && !cancelled) return 'pending';
    // Fallbacks for unspecified combos
    if (cancelled) return 'cancelled';
    return 'pending';
};



/* ============= TOUCH & GO ================== */
//CRUD model for touch n go data. has parent tngTable and child tngDetailTable that linked with tng_id
export const getTngRecords = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${tngTable} ORDER BY tng_id DESC`);
    return rows as RowDataPacket[];
};
export const getTngRecordById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${tngTable} WHERE tng_id = ?`, [id]);
    return (rows as RowDataPacket[])};
export const createTngRecord = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${tngTable} SET ?`, [data]);
    return (result as ResultSetHeader).insertId;
};
export const updateTngRecord = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${tngTable} SET ? WHERE tng_id = ?`, [data, id]);
    return result;
};
export const deleteTngRecord = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${tngTable} WHERE tng_id = ?`, [id]);
    return result;
};

// CRUD for touch n go details
export const getTngDetailsByTngId = async (tngId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${tngDetailTable} WHERE tng_id = ? ORDER BY tngd_id ASC`, [tngId]);
    return rows as RowDataPacket[];
};
export const getTngDetailById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${tngDetailTable} WHERE tngd_id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};
export const createTngDetail = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${tngDetailTable} SET ?`, [data]);
    return (result as ResultSetHeader).insertId;
};
export const updateTngDetail = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${tngDetailTable} SET ? WHERE tngd_id = ?`, [data, id]);
    return result;
};
export const deleteTngDetail = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${tngDetailTable} WHERE tngd_id = ?`, [id]);
    return result;
};

/* ============= UNSEEN BILLS COUNT ================== */
/**
 * Count new/unprocessed form uploads awaiting billing
 * Returns count of maintenance requests that have form_upload but no linked invoice
 * or invoice status indicates not yet processed
 * 
 * @param ramcoId - Optional: filter by requester ID (current user's scope)
 * @returns Count of unseen/unprocessed maintenance forms
 */
export const getUnseenBillsCount = async (ramcoId?: number): Promise<number> => {
    try {
        // Query: form_upload is NOT NULL but no invoice yet or invoice not processed
        let query = `
            SELECT COUNT(DISTINCT vs.req_id) as count
            FROM ${vehicleMaintenanceTable} vs
            LEFT JOIN ${maintenanceBillingTable} inv
                ON vs.req_id = inv.svc_order OR vs.req_id = CAST(inv.svc_order AS UNSIGNED)
            WHERE vs.form_upload IS NOT NULL
            AND vs.form_upload != ''
            AND (inv.inv_no IS NULL OR inv.inv_date IS NULL AND inv.inv_total = 0.00)
        `;
        
        const params: any[] = [];
        
        // Optional: scope to specific requester
        if (ramcoId && Number.isFinite(ramcoId) && ramcoId > 0) {
            query += ` AND vs.ramco_id = ?`;
            params.push(ramcoId);
        }
        
        const [rows]: any = await pool.query(query, params);
        const result = rows?.[0];
        return result?.count ?? 0;
    } catch (error) {
        console.error('Error getting unseen bills count:', error);
        throw error;
    }
};
