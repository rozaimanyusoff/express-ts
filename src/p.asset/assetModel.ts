import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from 'path';

import { pool, pool2 } from "../utils/db";

// Database and table declarations for easy swapping/testing
const db = 'assets';
const companyDb = 'companies';
const assetTable = `${db}.assetdata`;
const assetSpecsTable = `${db}.spec_properties`;
const assetManagerTable = `${db}.asset_managers`;
const assetHistoryTable = `${db}.asset_history`;
const brandTable = `${db}.brands`;
const brandCategoryTable = `${db}.brand_category`;
const categoryTable = `${db}.categories`;
const costcenterTable = `${db}.costcenters`;
const departmentTable = `${db}.departments`;
const districtTable = `${db}.districts`;
const employeeTable = `${db}.employees`;
const employeeCostcenterTable = `${db}.employee_costcenters`;
const employeeDepartmentTable = `${db}.employee_departments`;
const employeeDistrictTable = `${db}.employee_districts`;
const employeePositionTable = `${db}.employee_positions`;
const modelTable = `${db}.models`;
const moduleTable = `${db}.modules`;
const softwareTable = `${db}.pc_software`;
const computerSpecsTable = `${db}.pc_specs`;
const vehicleSpecsTable = `${db}.v_specs`;
const positionTable = `${db}.positions`;
const sectionTable = `${db}.sections`;
const siteTable = `${db}.sites`;
const typeTable = `${db}.types`;
const zoneTable = `${db}.zones`;
const zoneDistrictTable = `${db}.zone_districts`;
/* To be develop */
const locationTable = `${db}.locations`;
const vendorTable = `${db}.vendors`;
const procurementTable = `${db}.procurements`;
const assetPurchaseTable = `${db}.asset_purchase`;
const assetTransferRequestTable = `${db}.transfer_request`;
const assetTransferItemTable = `${db}.transfer_items`;
const transferChecklistTable = `${db}.transfer_checklists`;

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');

// Helper function to calculate Net Book Value (NBV) based on depreciation
// Depreciation: 20% per year, max 5 years
// Returns formatted string with 2 decimal places
export const calculateNBV = (unitPrice: null | number | undefined, purchaseYear: null | number | undefined): null | string => {
  if (!unitPrice || unitPrice <= 0 || !purchaseYear) return null;
  
  const currentYear = new Date().getFullYear();
  const yearsOld = currentYear - purchaseYear;
  
  // Cap at 5 years maximum depreciation
  const depreciationYears = Math.min(yearsOld, 5);
  const remainingPercentage = Math.max(0, 1 - (depreciationYears * 0.2));
  
  const nbv = unitPrice * remainingPercentage;
  return nbv.toFixed(2);
};

// Helper function to calculate asset age in years
export const calculateAge = (purchaseYear: null | number | undefined): null | number => {
  if (!purchaseYear) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - purchaseYear;
};

/* ============ ASSETS ============ */
export const getAssets = async (type_ids?: number | number[], classification?: string, status?: string, manager?: number, registerNumber?: string, owner?: string | string[], brandId?: number, purpose?: string | string[]) => {
  let sql = `SELECT ${assetTable}.* FROM ${assetTable}`;
  const params: any[] = [];
  const conditions: string[] = [];
  if (typeof manager === 'number' && !isNaN(manager)) {
    conditions.push(`${assetTable}.manager_id = ?`);
    params.push(manager);
  }
  if (Array.isArray(type_ids) && type_ids.length > 0) {
    conditions.push(`${assetTable}.type_id IN (${type_ids.map(() => '?').join(',')})`);
    params.push(...type_ids);
  } else if (typeof type_ids === 'number' && !isNaN(type_ids)) {
    conditions.push(`${assetTable}.type_id = ?`);
    params.push(type_ids);
  }
  if (typeof classification === 'string' && classification !== '') {
    conditions.push(`${assetTable}.classification = ?`);
    params.push(classification);
  }
  if (typeof status === 'string' && status !== '') {
    conditions.push(`${assetTable}.record_status = ?`);
    params.push(status);
  }
  if (typeof purpose === 'string' && purpose !== '') {
    conditions.push(`${assetTable}.purpose = ?`);
    params.push(purpose);
  } else if (Array.isArray(purpose) && purpose.length > 0) {
    const placeholders = purpose.map(() => '?').join(',');
    conditions.push(`${assetTable}.purpose IN (${placeholders})`);
    params.push(...purpose);
  }
  if (typeof registerNumber === 'string' && registerNumber !== '') {
    conditions.push(`${assetTable}.register_number = ?`);
    params.push(registerNumber);
  }
  // owner may be a single ramco_id or array/comma-separated list; match either current asset.ramco_id
  if (owner !== undefined && owner !== null && owner !== '') {
    // normalize owner to string array (accept single value, comma-separated, array, or number)
    let ownerIds: string[] = [];
    if (Array.isArray(owner)) {
      ownerIds = owner.map((o: any) => String(o).trim());
    } else if (typeof owner === 'string') {
      ownerIds = owner.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof owner === 'number') {
      ownerIds = [String(owner)];
    }
    if (ownerIds.length > 0) {
      const placeholders = ownerIds.map(() => '?').join(',');
      // Only match current asset ramco_id (no asset_history involvement)
      conditions.push(`${assetTable}.ramco_id IN (${placeholders})`);
      params.push(...ownerIds);
    }
  }
  if (typeof brandId === 'number' && !isNaN(brandId)) {
    conditions.push(`${assetTable}.brand_id = ?`);
    params.push(brandId);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  // Sort by type_id first, then by register_number within each type group
  sql += ` ORDER BY ${assetTable}.id DESC`;
  const [rows] = await pool.query(sql, params);
  // Ensure compatibility: some callers expect `asset_id` field (billing code).
  // Mirror `id` to `asset_id` when `asset_id` is not present.
  const mapped = (rows as RowDataPacket[]).map((r: any) => ({ ...r, asset_id: r.asset_id !== undefined && r.asset_id !== null ? r.asset_id : r.id }));
  return mapped;
};

// Helper function to fetch purchase items by asset purchase_ids
export const getPurchaseItemsByAssetIds = async (purchaseIds: number[]) => {
  if (!purchaseIds || purchaseIds.length === 0) return [];
  const [rows] = await pool.query(`SELECT id, unit_price FROM purchases2.purchase_items WHERE id IN (?)`, [purchaseIds]);
  return rows;;
};

// Helper function to fetch purchase details by asset register_number
export const getPurchaseDetailsByRegisterNumber = async (registerNumber: string) => {
  if (!registerNumber) return null;
  const [rows]: any[] = await pool.query(
    `SELECT * FROM purchases2.purchase_asset_registry 
     WHERE register_number = ? 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [registerNumber]
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

// Server-side pagination + free-text search for assets
export const getAssetsPaged = async (
  filters: {
    brandId?: number;
    classification?: string;
    manager?: number;
    owner?: string | string[];
    purpose?: string | string[];
    q?: string;
    registerNumber?: string;
    status?: string;
    type_ids?: number | number[];
  },
  options: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }
) => {
  const {
    brandId,
    classification,
    manager,
    owner,
    purpose,
    q,
    registerNumber,
    status,
    type_ids
  } = filters || {};

  const page = Number.isFinite(options.page) && options.page > 0 ? Math.floor(options.page) : 1;
  const pageSize = Number.isFinite(options.pageSize) && options.pageSize > 0 ? Math.floor(options.pageSize) : 25;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: any[] = [];

  if (typeof manager === 'number' && !isNaN(manager)) {
    conditions.push('a.manager_id = ?');
    params.push(manager);
  }
  if (Array.isArray(type_ids) && type_ids.length > 0) {
    conditions.push(`a.type_id IN (${type_ids.map(() => '?').join(',')})`);
    params.push(...type_ids);
  } else if (typeof type_ids === 'number' && !isNaN(type_ids)) {
    conditions.push('a.type_id = ?');
    params.push(type_ids);
  }
  if (typeof classification === 'string' && classification !== '') {
    conditions.push('a.classification = ?');
    params.push(classification);
  }
  if (typeof status === 'string' && status !== '') {
    conditions.push('a.record_status = ?');
    params.push(status);
  }
  if (typeof purpose === 'string' && purpose !== '') {
    conditions.push('a.purpose = ?');
    params.push(purpose);
  } else if (Array.isArray(purpose) && purpose.length > 0) {
    const placeholders = purpose.map(() => '?').join(',');
    conditions.push(`a.purpose IN (${placeholders})`);
    params.push(...purpose);
  }
  if (typeof registerNumber === 'string' && registerNumber !== '') {
    conditions.push('a.register_number = ?');
    params.push(registerNumber);
  }
  if (owner !== undefined && owner !== null && owner !== '') {
    let ownerIds: string[] = [];
    if (Array.isArray(owner)) {
      ownerIds = owner.map((o: any) => String(o).trim());
    } else if (typeof owner === 'string') {
      ownerIds = owner.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof owner === 'number') {
      ownerIds = [String(owner)];
    }
    if (ownerIds.length > 0) {
      const placeholders = ownerIds.map(() => '?').join(',');
      conditions.push(`a.ramco_id IN (${placeholders})`);
      params.push(...ownerIds);
    }
  }
  if (typeof brandId === 'number' && !isNaN(brandId)) {
    conditions.push('a.brand_id = ?');
    params.push(brandId);
  }
  if (typeof q === 'string' && q.trim() !== '') {
    const like = `%${q.toLowerCase()}%`;
    conditions.push(`(
      LOWER(a.entry_code) LIKE ? OR
      LOWER(a.register_number) LIKE ? OR
      LOWER(a.purpose) LIKE ? OR
      LOWER(a.ramco_id) LIKE ? OR
      LOWER(b.name) LIKE ? OR
      LOWER(m.name) LIKE ?
    )`);
    params.push(like, like, like, like, like, like);
  }

  const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  // Joins for searching by related names (brand/model) - removed purchase_items JOIN
  const fromSql = `FROM ${assetTable} a
    LEFT JOIN ${brandTable} b ON b.id = a.brand_id
    LEFT JOIN ${modelTable} m ON m.id = a.model_id`;

  // Count total
  const countSql = `SELECT COUNT(*) AS count ${fromSql}${whereSql}`;
  const [countRows] = await pool.query(countSql, params);
  const total = Array.isArray(countRows) && countRows.length > 0 ? Number((countRows as any)[0].count) : 0;

  // Sorting allowlist
  const sortAllowlist = new Set([
    'asset_code',
    'classification',
    'entry_code',
    'id',
    'purchase_date',
    'purchase_year',
    'record_status',
    'register_number',
    'type_id'
  ]);
  let orderBy = 'a.type_id ASC, a.register_number ASC';
  const sortBy = (options.sortBy || '').toString();
  const sortDir = (options.sortDir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  if (sortBy && sortAllowlist.has(sortBy)) {
    orderBy = `a.${sortBy} ${sortDir}`;
  }

  const dataSql = `SELECT a.* ${fromSql}${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);
  const mapped = (rows as RowDataPacket[]).map((r: any) => ({ ...r, asset_id: r.asset_id !== undefined && r.asset_id !== null ? r.asset_id : r.id }));
  return { rows: mapped, total };
};

export const getAssetById = async (id: number) => {
  if (typeof id !== 'number' || isNaN(id)) {
    throw new Error('Invalid asset id');
  }
  const [rows] = await pool.query(
    `SELECT ${assetTable}.* FROM ${assetTable}
    WHERE ${assetTable}.id = ?`,
    [id]
  );
  return (rows as RowDataPacket[])[0];
};

export const getAssetByCode = async (asset_code: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTable} WHERE asset_code = ?`, [asset_code]);
  return (rows as RowDataPacket[])[0];
};

export const createAsset = async (data: any) => {
  const { brand_id, category_id, depreciation_rate, finance_tag, model_id, procurement_id, register_number, status, type_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetTable} (register_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [register_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id]
  );
  return result;
};

export const updateAsset = async (id: number, data: any) => {
  const [result] = await pool.query(
    `UPDATE ${assetTable} SET brand_id = ?, category_id = ?, classification = ?, costcenter_id = ?, department_id = ?, entry_code = ?, fuel_type = ?, location_id = ?, model_id = ?, purchase_date = ?, purpose = ?, ramco_id = ?, record_status = ?, transmission = ?, type_id = ? WHERE id = ?`,
    [data.brand_id, data.category_id, data.classification, data.costcenter_id, data.department_id, data.entry_code, data.fuel_type, data.location_id, data.model_id, data.purchase_date, data.purpose, data.ramco_id, data.record_status, data.transmission, data.type_id, id]
  );

  // insert into asset_history on successful update
  try {
    const resAny: any = result as any;
    if (resAny?.affectedRows && resAny.affectedRows > 0) {
      const asset = await getAssetById(id);
      if (asset) {
        await pool.query(
          `INSERT INTO ${assetHistoryTable} (asset_id, entry_code, register_number, vehicle_id, type_id, costcenter_id, department_id, location_id, ramco_id, effective_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.entry_code ?? null,
            asset.register_number ?? null,
            asset.vehicle_id ?? null,
            asset.type_id ?? null,
            asset.costcenter_id ?? null,
            asset.department_id ?? null,
            asset.location_id ?? null,
            asset.ramco_id ?? null,
            data.effective_date ?? new Date()
          ]
        );
      }
    }
  } catch (err) {
    // do not fail the update if history insertion fails; log and continue
     
    console.error('Failed to insert asset history for asset', id, err);
  }

  return result;
};

// Get the last entry_code for a given type_id (ordered by numeric suffix)
export const getLastEntryCodeByType = async (typeId: number): Promise<null | string> => {
  const prefix = String(typeId);
  const prefixLen = prefix.length;
  const [rows] = await pool.query(
    `SELECT entry_code FROM ${assetTable}
    WHERE type_id = ? AND entry_code IS NOT NULL AND entry_code LIKE CONCAT(?, '%')
    ORDER BY CAST(SUBSTRING(entry_code, ? + 1) AS UNSIGNED) DESC, entry_code DESC
    LIMIT 1`,
    [typeId, prefix, prefixLen]
  );
  const r = (rows as RowDataPacket[])[0];
  return r ? (r.entry_code as string) : null;
};

export const deleteAsset = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTable} WHERE id = ?`, [id]);
  return result;
};

/* =============== ASSET-OWNERSHIP CRUD (using pc_ownership join table)] =============== */
export const createAssetOwnership = async (data: any) => {
  const { asset_code, effective_date, ramco_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetHistoryTable} (asset_code, ramco_id, effective_date) VALUES (?, ?, ?)`,
    [asset_code, ramco_id, effective_date]
  );
  return result;
};

export const getAssetOwnerships = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetHistoryTable}`);
  return rows;
};

export const getAssetOwnershipById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetHistoryTable} id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateAssetOwnership = async (id: number, data: any) => {
  const { asset_code, effective_date, ramco_id } = data;
  const [result] = await pool.query(
    `UPDATE ${assetHistoryTable} SET asset_code = ?, ramco_id = ?, effective_date = ? WHERE id = ?`,
    [asset_code, ramco_id, effective_date, id]
  );
  return result;
};

export const deleteAssetOwnership = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetHistoryTable} WHERE id = ?`, [id]);
  return result;
};

/* ======= ASSET MANAGERS ======= */
export const getAssetManagers = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable}`);
  return rows;
};

export const getAssetManagerById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const getAssetManagerByRamcoId = async (ramco_id: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable} WHERE ramco_id = ?`, [ramco_id]);
  return (rows as RowDataPacket[])[0];
};

export const createAssetManager = async (data: any) => {
  const [result] = await pool.query(
    `INSERT INTO ${assetManagerTable} (ramco_id, manager_id, created_at)
     VALUES (?, ?, NOW())`,
    [data.ramco_id, data.manager_id, data.created_at, data.is_active ? 1 : 0]
  );
  return result;
};

export const updateAssetManager = async (id: number, data: any) => {
  const [result] = await pool.query(
    `UPDATE ${assetManagerTable} SET ramco_id = ?, manager_id = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
    [data.ramco_id, data.manager_id, data.is_active ? 1 : 0, id]
  );
  return result;
};

export const deleteAssetManager = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetManagerTable} WHERE id = ?`, [id]);
  return result;
}


function mapDataTypeToSql(dataType: string): string {
  switch ((dataType || '').toLowerCase()) {
    case 'boolean': return 'TINYINT(1)';
    case 'date': return 'DATE';
    case 'datetime': return 'DATETIME'; case 'decimal': return 'DECIMAL(18,4)';
    case 'float': return 'DOUBLE';
    case 'int':
    case 'integer': return 'INT';
    case 'json': return 'JSON';
    case 'string': return 'VARCHAR(255)';
    case 'text': return 'TEXT';
    default: return 'VARCHAR(255)';
  }
}

/* ================ SPEC PROPERTIES (master) + schema application helpers ================ */
/**
 * Sanitize a user-provided name into a safe SQL column name.
 * Allowed characters: lowercase letters, numbers and underscore. Must start with a letter.
 */
function sanitizeColumnName(name: string): string {
  if (!name || typeof name !== 'string') throw new Error('Invalid name');
  let s = name.toLowerCase().trim();
  // replace spaces and hyphens with underscore
  s = s.replace(/[\s\-]+/g, '_');
  // remove any chars other than a-z0-9_
  s = s.replace(/[^a-z0-9_]/g, '');
  // ensure it starts with a letter
  if (!/^[a-z]/.test(s)) s = 'c_' + s;
  // trim length to reasonable limit
  return s.substring(0, 120);
}

// Prefer legacy spec schema if provided (many existing installs keep specs in `assetdata`)
const SPEC_SCHEMA = process.env.ASSET_SPEC_SCHEMA || 'assetdata';

function getPrimarySpecTableName(type_id: number): null | string {
  if (!Number.isFinite(type_id) || type_id <= 0) return null;
  return `${SPEC_SCHEMA}.${type_id}_specs`;
}

function mapTypeIdToSpecTables(type_id: number): string[] {
  // Per-type spec tables are named '{type_id}_specs'. Try candidate schemas in order.
  // 1) SPEC_SCHEMA env or 'assetdata' (legacy), 2) current db schema, 3) hardcoded 'assetdata' as fallback if different
  if (!Number.isFinite(type_id) || type_id <= 0) return [];
  const candidates = new Set<string>();
  candidates.add(`${SPEC_SCHEMA}.${type_id}_specs`);
  candidates.add(`${db}.${type_id}_specs`);
  if (SPEC_SCHEMA !== 'assetdata') candidates.add(`assetdata.${type_id}_specs`);
  return Array.from(candidates);
}

function quoteFullTableName(fullTableName: string): string {
  const parts = String(fullTableName).split('.');
  const schema = parts.length > 1 ? parts[0] : SPEC_SCHEMA;
  const table = parts.length > 1 ? parts[1] : parts[0];
  return `\`${schema}\`.\`${table}\``;
}

// Generic spec fetcher for per-type spec tables named '{type_id}_specs'
export const getSpecsForAsset = async (type_id: number, asset_id: number) => {
  const tables = mapTypeIdToSpecTables(type_id);
  if (!tables.length) return [] as any[];

  // Load asset details to try alternate matching keys when asset_id doesn't exist in the spec table
  let assetRow: any = null;
  try {
    assetRow = await getAssetById(asset_id);
  } catch (_) {
    // ignore; we'll still try by asset_id
  }

  // Build list of candidate predicates in order of likelihood
  const predicates: { params: any[]; sql: string; }[] = [];
  // 1) Primary by asset_id
  predicates.push({ params: [asset_id], sql: `asset_id = ?` });
  if (assetRow) {
    // 2) By asset_code if available
    const assetCode = assetRow.asset_code || assetRow.entry_code || null;
    if (assetCode) {
      predicates.push({ params: [assetCode], sql: `asset_code = ?` });
    }
    // 3) By register_number
    if (assetRow.register_number) {
      predicates.push({ params: [assetRow.register_number], sql: `register_number = ?` });
    }
    // 4) By vehicle_id if present on asset row
    const vehicleId = assetRow.vehicle_id || null;
    if (vehicleId) {
      predicates.push({ params: [vehicleId], sql: `vehicle_id = ?` });
    }
  }

  for (const table of tables) {
    const qTable = quoteFullTableName(table);
    for (const pred of predicates) {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${qTable} WHERE ${pred.sql} LIMIT 1`, pred.params);
        if (Array.isArray(rows) && rows.length > 0) {
          // Fetch full row(s) once we know a predicate works (remove LIMIT 1)
          const [allRows] = await pool.query(`SELECT * FROM ${qTable} WHERE ${pred.sql}`, pred.params);
          return allRows as any[];
        }
      } catch (_err) {
        // Column might not exist in this table; try next predicate
      }
    }
  }

  // Not found
  return [] as any[];
};

export const getSpecPropertiesByType = async (type_id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetSpecsTable} WHERE type_id = ? ORDER BY id`, [type_id]);
  return rows;
};

export const getAllSpecProperties = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetSpecsTable} ORDER BY type_id, id`);
  return rows;
};

export const getSpecPropertyById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetSpecsTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const createSpecProperty = async (data: any) => {
  const { column_name, created_by = null, data_type, default_value = null, label, name, nullable = 1, options = null, type_id, visible_on_form = 1 } = data;
  const col = column_name ? sanitizeColumnName(column_name) : sanitizeColumnName(name);
  // Insert metadata record
  const [result] = await pool.query(
    `INSERT INTO ${assetSpecsTable} (type_id, name, column_name, label, data_type, nullable, default_value, visible_on_form, options, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [type_id, name, col, label, data_type, nullable ? 1 : 0, default_value, visible_on_form ? 1 : 0, options ? JSON.stringify(options) : null, created_by]
  );
  const insertId = (result as any).insertId;
  // Fetch the inserted row and attempt to apply it immediately (best-effort)
  try {
    const specRow = await getSpecPropertyById(insertId);
    if (specRow) {
      const applyRes: any = await applySpecPropertyToType(specRow);
      return { applied: applyRes?.ok, applyError: applyRes?.error ? applyRes.error : null, column_name: col, insertId };
    }
  } catch (err) {
    // swallow errors here; caller can call applyPendingSpecProperties if needed
    return { applied: false, applyError: err instanceof Error ? err.message : String(err), column_name: col, insertId };
  }
  return { applied: false, column_name: col, insertId };
};

// Helper to check whether a column exists in a given schema.table
async function columnExistsInTable(fullTableName: string, columnName: string) {
  // fullTableName format: `${schema}.${table}`
  const parts = String(fullTableName).split('.');
  let schema = parts.length > 1 ? parts[0] : null;
  const table = parts.length > 1 ? parts[1] : parts[0];
  if (!schema) schema = db; // fallback
  const [rows] = await pool.query(
    `SELECT COUNT(1) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [schema, table, columnName]
  );
  const cnt = Array.isArray(rows) && (rows as any[])[0] ? (rows as any[])[0].cnt : 0;
  return Number(cnt) > 0;
}

export const applySpecPropertyToType = async (specProperty: any) => {
  // specProperty is a row from spec_properties table (must include type_id, column_name, data_type, nullable, default_value)
  const tableName = getPrimarySpecTableName(Number(specProperty.type_id));
  if (!tableName) throw new Error(`No spec table mapped for type_id ${specProperty.type_id}`);
  const qTable = quoteFullTableName(tableName);
  const column = sanitizeColumnName(specProperty.column_name);
  if (!/^[a-z][a-z0-9_]{0,119}$/.test(column)) throw new Error('Invalid column name');
  const sqlType = mapDataTypeToSql(specProperty.data_type);
  const nullable = specProperty.nullable ? 'NULL' : 'NOT NULL';
  const defaultClause = (specProperty.default_value !== null && specProperty.default_value !== undefined && specProperty.default_value !== '')
    ? `DEFAULT '${String(specProperty.default_value).replace(/'/g, "\\'")}'`
    : '';

  try {
    // Ensure per-type spec table exists with a minimal schema
    await ensureSpecTableExists(tableName);

    const exists = await columnExistsInTable(tableName, column);
    const columnDef = `${sqlType} ${nullable} ${defaultClause}`.trim();
    if (exists) {
      // Modify existing column to match new definition
      await pool.query(`ALTER TABLE ${qTable} MODIFY COLUMN \`${column}\` ${columnDef}`);
    } else {
      // Add new column
      await pool.query(`ALTER TABLE ${qTable} ADD COLUMN \`${column}\` ${columnDef}`);
    }
    // mark active
    await pool.query(`UPDATE ${assetSpecsTable} SET is_active = 1, updated_at = NOW() WHERE id = ?`, [specProperty.id]);
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message, ok: false };
  }
};

// Ensure the given spec table exists; create if missing with a basic structure
async function ensureSpecTableExists(fullTableName: string) {
  // Split schema and table
  const parts = String(fullTableName).split('.');
  const schema = parts.length > 1 ? parts[0] : SPEC_SCHEMA;
  const table = parts.length > 1 ? parts[1] : parts[0];
  // Create table if not exists with minimal columns
  // We don't attempt to create schema; assume it exists or is managed outside
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${schema}\`.\`${table}\` (
      id INT NOT NULL AUTO_INCREMENT,
      asset_id INT NULL,
      created_at DATETIME NULL,
      updated_at DATETIME NULL,
      PRIMARY KEY (id),
      INDEX idx_asset_id (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

export const updateSpecProperty = async (id: number, data: any) => {
  // Fetch current row to diff changes
  const existing = await getSpecPropertyById(id);
  if (!existing) throw new Error('Spec property not found');

  // Allow updates to: label, nullable, default_value, options, is_active, column_name, data_type, name
  const sets: string[] = [];
  const params: any[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.column_name !== undefined) { sets.push('column_name = ?'); params.push(sanitizeColumnName(data.column_name)); }
  if (data.label !== undefined) { sets.push('label = ?'); params.push(data.label); }
  if (data.nullable !== undefined) { sets.push('nullable = ?'); params.push(data.nullable ? 1 : 0); }
  if (data.default_value !== undefined) { sets.push('default_value = ?'); params.push(data.default_value); }
  if (data.options !== undefined) { sets.push('options = ?'); params.push(JSON.stringify(data.options)); }
  if (data.data_type !== undefined) { sets.push('data_type = ?'); params.push(data.data_type); }
  if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
  if (sets.length === 0) return { affectedRows: 0 } as any;
  params.push(id);
  const sql = `UPDATE ${assetSpecsTable} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`;
  const [result] = await pool.query(sql, params);

  // Fetch updated row
  const updated = await getSpecPropertyById(id);
  try {
    const tableName = getPrimarySpecTableName(Number(updated.type_id));
    if (tableName) {
      const qTable = quoteFullTableName(tableName);
      // If column name changed and the column existed before, rename it
      const oldCol = existing.column_name;
      const newCol = updated.column_name;
      const sqlType = mapDataTypeToSql(updated.data_type);
      const nullableClause = updated.nullable ? 'NULL' : 'NOT NULL';
      const defaultClause = (updated.default_value !== null && updated.default_value !== undefined && updated.default_value !== '')
        ? `DEFAULT '${String(updated.default_value).replace(/'/g, "\\'")}'`
        : '';
      const columnDef = `${sqlType} ${nullableClause} ${defaultClause}`.trim();

      if (oldCol && newCol && oldCol !== newCol) {
        // Only attempt rename if old column exists
        const existsOld = await columnExistsInTable(tableName, oldCol);
        if (existsOld) {
          await pool.query(`ALTER TABLE ${qTable} CHANGE \`${oldCol}\` \`${newCol}\` ${columnDef}`);
        } else {
          // Old column missing: try adding the new column
          await pool.query(`ALTER TABLE ${qTable} ADD COLUMN \`${newCol}\` ${columnDef}`);
        }
      } else {
        // Column name unchanged: modify type/null/default if column exists
        const exists = await columnExistsInTable(tableName, newCol);
        if (exists) {
          await pool.query(`ALTER TABLE ${qTable} MODIFY COLUMN \`${newCol}\` ${columnDef}`);
        } else if (updated.is_active) {
          // column missing but metadata indicates active => try to create
          await pool.query(`ALTER TABLE ${qTable} ADD COLUMN \`${newCol}\` ${columnDef}`);
        }
      }
    }
  } catch (err) {
    // ignore DB errors here; caller can inspect returned result if needed
  }

  return result;
};

export const deleteSpecProperty = async (id: number, dropColumn = false) => {
  const spec = await getSpecPropertyById(id);
  if (!spec) throw new Error('Spec property not found');
  if (dropColumn) {
    const tableName = getPrimarySpecTableName(Number(spec.type_id));
    if (!tableName) throw new Error(`No spec table mapped for type_id ${spec.type_id}`);
    const qTable = quoteFullTableName(tableName);
    const column = spec.column_name;
    // Drop column if exists
    try {
      await pool.query(`ALTER TABLE ${qTable} DROP COLUMN \`${column}\``);
    } catch (err) {
      // continue; still allow metadata cleanup
    }
  }
  const [result] = await pool.query(`DELETE FROM ${assetSpecsTable} WHERE id = ?`, [id]);
  return result;
};

/**
 * Apply all pending spec properties (is_active = 0) to their mapped per-type spec tables.
 * If type_id provided, only apply for that type.
 */
export const applyPendingSpecProperties = async (type_id?: number) => {
  const params: any[] = [];
  let sql = `SELECT * FROM ${assetSpecsTable} WHERE is_active = 0`;
  if (typeof type_id === 'number') {
    sql += ' AND type_id = ?';
    params.push(type_id);
  }
  sql += ' ORDER BY id';
  const [rows] = await pool.query(sql, params);
  const results: any[] = [];
  for (const r of rows as any[]) {
    try {
      const res = await applySpecPropertyToType(r);
      if (res && res.ok) {
        results.push({ column_name: r.column_name, id: r.id, ok: true });
      } else {
        results.push({ column_name: r.column_name, error: res.error ? res.error : 'unknown', id: r.id, ok: false });
      }
    } catch (err) {
      results.push({ column_name: r.column_name, error: (err as Error).message, id: r.id, ok: false });
    }
  }
  return results;
};

// Helper: safely extract string from query param
export function getStringParam(param: any): string | undefined {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
  return undefined;
}

/* =========== TYPES =========== */
export const createType = async (data: any) => {
  const { description, image, name, ramco_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${typeTable} (name, description, image, manager) VALUES (?, ?, ?, ?)`,
    [name, description, image, ramco_id]
  );
  return result;
};

export const getTypes = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable}`);
  return rows;
};

export const getTypeById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateType = async (id: number, data: any) => {
  const { description, image, name, ramco_id } = data;
  const [result] = await pool.query(
    `UPDATE ${typeTable} SET name = ?, description = ?, image = ?, manager = ? WHERE id = ?`,
    [name, description, image, ramco_id, id]
  );
  return result;
};

export const deleteType = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${typeTable} WHERE id = ?`, [id]);
  return result;
};

/* =========== CATEGORIES =========== */
export const createCategory = async (data: any) => {
  const { name, type_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${categoryTable} (name, type_id, manager_id) VALUES (?, ?, ?)`,
    [name, type_id, type_id]
  );
  return result;
};

export const getCategories = async (manager?: number | string | string[]) => {
  // Normalize manager input into a deduplicated array of string ids
  let managerIds: string[] = [];
  if (manager !== undefined && manager !== null && manager !== '') {
    if (Array.isArray(manager)) {
      managerIds = manager.map(m => String(m).trim()).filter(Boolean);
    } else if (typeof manager === 'string') {
      managerIds = manager.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      managerIds = [String(manager)];
    }
  }

  // If no manager filter provided, return all categories
  if (managerIds.length === 0) {
    const [rows] = await pool.query(`SELECT * FROM ${categoryTable} ORDER BY name`);
    return rows;
  }

  // Filter directly on the categories table by manager_id (no JOINs)
  // Deduplicate managerIds to avoid redundant placeholders
  managerIds = Array.from(new Set(managerIds));
  const placeholders = managerIds.map(() => '?').join(',');
  const sql = `SELECT * FROM ${categoryTable} WHERE manager_id IN (${placeholders}) ORDER BY name`;
  const [rows] = await pool.query(sql, managerIds);
  return rows;
};

export const getCategoryById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCategory = async (id: number, data: any) => {
  const { image, name, type_id } = data;
  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (image !== undefined) { sets.push('image = ?'); params.push(image); }
  if (type_id !== undefined) { sets.push('type_id = ?'); params.push(type_id); }
  const sql = `UPDATE ${categoryTable} SET ${sets.join(', ')} WHERE id = ?`;
  params.push(id);
  const [result] = await pool.query(sql, params);
  return result;
};

export const deleteCategory = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${categoryTable} WHERE id = ?`, [id]);
  return result;
};

/* =========== BRANDS =========== */
export const createBrand = async (data: any) => {
  const { category_ids, logo, name, type_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${brandTable} (name, image${type_id ? ', type_id' : ''}) VALUES (?, ?${type_id ? ', ?' : ''})`,
    type_id ? [name, logo, type_id] : [name, logo]
  );
  const insertId = (result as any).insertId as number | undefined;
  
  // Handle brand-category associations
  if (insertId && Array.isArray(category_ids) && category_ids.length > 0) {
    // Fetch the newly created brand to get its code
    const [brandRows] = await pool.query(`SELECT code FROM ${brandTable} WHERE id = ?`, [insertId]);
    const brand = (brandRows as RowDataPacket[])[0];
    const brandCode = brand?.code || String(insertId); // Use brand code or fallback to ID
    
    // Fetch category codes for the provided category IDs
    const placeholders = category_ids.map(() => '?').join(',');
    const [categoryRows] = await pool.query(
      `SELECT id, code FROM ${categoryTable} WHERE id IN (${placeholders})`,
      category_ids
    );
    const categoryMap = new Map((categoryRows as RowDataPacket[]).map((c: any) => [c.id, c.code]));
    
    // Insert into brand_category table with codes
    for (const category_id of category_ids) {
      const categoryCode = categoryMap.get(category_id) || String(category_id);
      await pool.query(
        `INSERT INTO ${brandCategoryTable} (brand_id, category_id, brand_code, category_code) VALUES (?, ?, ?, ?)`,
        [insertId, category_id, brandCode, categoryCode]
      );
    }
  }
  return result;
};

export const getBrands = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable}`);
  return rows;
};

export const getBrandById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateBrand = async (id: number, data: any) => {
  const { category_ids, logo, name, type_id } = data;
  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (logo !== undefined) { sets.push('image = ?'); params.push(logo); }
  if (type_id !== undefined) { sets.push('type_id = ?'); params.push(type_id); }
  if (sets.length > 0) {
    const sql = `UPDATE ${brandTable} SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);
    await pool.query(sql, params);
  }
  // Reset brand-category associations if category_ids provided
  if (Array.isArray(category_ids)) {
    // Fetch the brand to get its code
    const [brandRows] = await pool.query(`SELECT code FROM ${brandTable} WHERE id = ?`, [id]);
    const brand = (brandRows as RowDataPacket[])[0];
    const brandCode = brand?.code || String(id);
    
    // Delete old associations
    await pool.query(`DELETE FROM ${brandCategoryTable} WHERE brand_id = ?`, [id]);
    
    if (category_ids.length > 0) {
      // Fetch category codes for the provided category IDs
      const placeholders = category_ids.map(() => '?').join(',');
      const [categoryRows] = await pool.query(
        `SELECT id, code FROM ${categoryTable} WHERE id IN (${placeholders})`,
        category_ids
      );
      const categoryMap = new Map((categoryRows as RowDataPacket[]).map((c: any) => [c.id, c.code]));
      
      // Insert new associations with codes
      for (const category_id of category_ids) {
        const categoryCode = categoryMap.get(category_id) || String(category_id);
        await pool.query(
          `INSERT INTO ${brandCategoryTable} (brand_id, category_id, brand_code, category_code) VALUES (?, ?, ?, ?)`,
          [id, category_id, brandCode, categoryCode]
        );
      }
    }
  }
  return { ok: true } as any;
};

export const deleteBrand = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${brandTable} WHERE id = ?`, [id]);
  return result;
};

/* =========== MODELS =========== */
export const createModel = async (data: any) => {
  const { brand_id, category_id, generation, image, name, specification, status, type_id } = data;
  // Check for duplicate by name and type_id
  const [dupRows] = await pool.query(
    `SELECT id FROM ${modelTable} WHERE name = ? AND type_id = ?`,
    [name, type_id]
  );
  if (Array.isArray(dupRows) && dupRows.length > 0) {
    throw new Error('Model with the same name and type already exists');
  }
  const [result] = await pool.query(
    `INSERT INTO ${modelTable} (name, image, brand_id, category_id, type_id, specification, generation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, image, brand_id, category_id, type_id, specification, generation, status]
  );
  return result;
};

export const getModels = async (typeId?: number, brandIds?: number[]) => {
  // Build SQL with optional filters
  const where: string[] = [];
  const params: any[] = [];
  if (typeof typeId === 'number') {
    where.push('type_id = ?');
    params.push(typeId);
  }
  if (Array.isArray(brandIds) && brandIds.length > 0) {
    const placeholders = brandIds.map(() => '?').join(',');
    where.push(`brand_id IN (${placeholders})`);
    params.push(...brandIds);
  }
  const sql = `SELECT * FROM ${modelTable}` + (where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '');
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const getModelById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${modelTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModel = async (id: number, data: any) => {
  const { brand_id, category_id, generation, image, item_code, name, specification, status, type_id } = data;
  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (image !== undefined) { sets.push('image = ?'); params.push(image); }
  if (brand_id !== undefined) { sets.push('brand_id = ?'); params.push(brand_id); }
  if (category_id !== undefined) { sets.push('category_id = ?'); params.push(category_id); }
  if (type_id !== undefined) { sets.push('type_id = ?'); params.push(type_id); }
  if (item_code !== undefined) { sets.push('item_code = ?'); params.push(item_code); }
  if (specification !== undefined) { sets.push('specification = ?'); params.push(specification); }
  if (generation !== undefined) { sets.push('generation = ?'); params.push(generation); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (sets.length === 0) return { affectedRows: 0 } as any;
  params.push(id);
  const sql = `UPDATE ${modelTable} SET ${sets.join(', ')} WHERE id = ?`;
  const [result] = await pool.query(sql, params);
  return result;
};

export const checkModelInAssets = async (model_id: number) => {
  const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${assetTable} WHERE model_id = ?`, [model_id]);
  return (rows as any[])[0]?.count || 0;
};

export const deleteModel = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${modelTable} WHERE id = ?`, [id]);
  return result;
};

export const getModelsByBrand = async (brand_id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${modelTable} WHERE brand_id = ?`, [brand_id]);
  return rows;
};


// COSTCENTERS CRUD
export const createCostcenter = async (data: any) => {
  const { description = null, name = null } = data;
  const [result] = await pool.query(`INSERT INTO ${costcenterTable} (name, description) VALUES (?, ?)`, [name, description]);
  return result;
};

export const getCostcenters = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${costcenterTable}`);
  return rows;
};

export const getCostcenterById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${costcenterTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCostcenter = async (id: number, data: any) => {
  const { description = null, name = null } = data;
  const [result] = await pool.query(`UPDATE ${costcenterTable} SET name = ?, description = ? WHERE id = ?`, [name, description, id]);
  return result;
};

export const deleteCostcenter = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${costcenterTable} WHERE id = ?`, [id]);
  return result;
};

/* =========== DEPARTMENTS =========== */
export const createDepartment = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${departmentTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getDepartments = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${departmentTable}`);
  return rows;
};

export const getDepartmentById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${departmentTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDepartment = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${departmentTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deleteDepartment = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${departmentTable} WHERE id = ?`, [id]);
  return result;
};


/* =========== SECTIONS =========== */
export const createSection = async (data: any) => {
  const { department_id, name } = data;
  const [result] = await pool.query(`INSERT INTO ${sectionTable} (name, department_id) VALUES (?, ?)`, [name, department_id]);
  return result;
};

export const getSections = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${sectionTable}`);
  return rows;
};

export const getSectionById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${sectionTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateSection = async (id: number, data: any) => {
  const { department_id, name } = data;
  const [result] = await pool.query(`UPDATE ${sectionTable} SET name = ?, department_id = ? WHERE id = ?`, [name, department_id, id]);
  return result;
};

export const deleteSection = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${sectionTable} WHERE id = ?`, [id]);
  return result;
};

/* =========== LOCATIONS =========== */
export const createLocation = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${locationTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getLocations = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${locationTable}`);
  return rows;
};

export const getLocationById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${locationTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateLocation = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${locationTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deleteLocation = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${locationTable} WHERE id = ?`, [id]);
  return result;
};


/* ========== DISTRICTS ========== */
export const createDistrict = async (data: any) => {
  const { code, name } = data;
  const [result] = await pool.query(
    `INSERT INTO ${districtTable} (name, code) VALUES (?, ?)`,
    [name, code]
  );
  return result;
};

export const getDistricts = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${districtTable}`);
  return rows;
};

export const getDistrictById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${districtTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDistrict = async (id: number, data: any) => {
  const { code, name } = data;
  const [result] = await pool.query(
    `UPDATE ${districtTable} SET name = ?, code = ? WHERE id = ?`,
    [name, code, id]
  );
  return result;
};

export const deleteDistrict = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${districtTable} WHERE id = ?`, [id]);
  return result;
};

/* ========== SITES ========== */
export const createSite = async (data: any) => {
  const { address = null, code = null, description = null, email = null, name = null, phone = null } = data;
  const [result] = await pool.query(
    `INSERT INTO ${siteTable} (name, code, address, phone, email, description) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, code, address, phone, email, description]
  );
  return result;
};

export const getSites = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable}`);
  return rows;
};

export const getSiteById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateSite = async (id: number, data: any) => {
  const { address = null, code = null, description = null, email = null, name = null, phone = null } = data;
  const [result] = await pool.query(
    `UPDATE ${siteTable} SET name = ?, code = ?, address = ?, phone = ?, email = ?, description = ? WHERE id = ?`,
    [name, code, address, phone, email, description, id]
  );
  return result;
};

export const deleteSite = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${siteTable} WHERE id = ?`, [id]);
  return result;
};

export const getSitesBatch = async (offset: number, limit: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable} LIMIT ? OFFSET ?`, [limit, offset]);
  return rows;
};

export const getSitesCount = async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${siteTable}`);
  if (Array.isArray(rows) && rows.length > 0 && 'count' in rows[0]) {
    return (rows[0] as any).count;
  }
  return 0;
};

/* ========== ZONES ========== */
export const createZone = async (data: any) => {
  const { code, employee_id, name } = data;
  const [result] = await pool.query(
    `INSERT INTO ${zoneTable} (name, code, employee_id) VALUES (?, ?, ?)`,
    [name, code, employee_id]
  );
  return result;
};

export const getZones = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneTable}`);
  return rows;
};

export const getZoneById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateZone = async (id: number, data: any) => {
  const { code, employee_id, name } = data;
  const [result] = await pool.query(
    `UPDATE ${zoneTable} SET name = ?, code = ?, employee_id = ? WHERE id = ?`,
    [name, code, employee_id, id]
  );
  return result;
};

export const deleteZone = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${zoneTable} WHERE id = ?`, [id]);
  return result;
};

/* ========== ZONE-DISTRICT RELATIONSHIPS ========== */
export const addDistrictToZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    `INSERT INTO ${zoneDistrictTable} (zone_id, district_id) VALUES (?, ?)`,
    [zone_id, district_id]
  );
  return result;
};

export const removeDistrictFromZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE zone_id = ? AND district_id = ?`,
    [zone_id, district_id]
  );
  return result;
};

export const getDistrictsByZone = async (zone_id: number) => {
  const [rows] = await pool.query(
    `SELECT d.* FROM ${districtTable} d INNER JOIN ${zoneDistrictTable} zd ON d.id = zd.district_id WHERE zd.zone_id = ?`,
    [zone_id]
  );
  return rows;
};

export const getZonesByDistrict = async (district_id: number) => {
  const [rows] = await pool.query(
    `SELECT z.* FROM ${zoneTable} z INNER JOIN ${zoneDistrictTable} zd ON z.id = zd.zone_id WHERE zd.district_id = ?`,
    [district_id]
  );
  return rows;
};

// Get all zone-district relationships
export const getAllZoneDistricts = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneDistrictTable}`);
  return rows;
};

// Remove all zones from a given district
export const removeAllZonesFromDistrict = async (district_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE district_id = ?`,
    [district_id]
  );
  return result;
};

// Remove all districts from a given zone
export const removeAllDistrictsFromZone = async (zone_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE zone_id = ?`,
    [zone_id]
  );
  return result;
};


/* =========== EMPLOYEES =========== */
export const createEmployee = async (data: any) => {
	// Map incoming fields to database columns
	const {
		avatar,
		contact,
		costcenter_id,
		department_id,
		dob,
		email,
		employment_status,
		employment_type,
		full_name,
		gender,
		grade,
		hire_date,
		location_id,
		position_id,
		ramco_id,
		resignation_date
	} = data;

	const [result] = await pool.query(
		`INSERT INTO ${employeeTable} 
		(ramco_id, full_name, email, contact, gender, dob, avatar, hire_date, 
		 resignation_date, employment_type, employment_status, grade, 
		 position_id, department_id, costcenter_id, location_id) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[ramco_id, full_name, email, contact, gender, dob, avatar, hire_date,
		 resignation_date, employment_type, employment_status, grade,
		 position_id, department_id, costcenter_id, location_id]
	);
	return result;
};

export const getEmployees = async (status?: string, cc?: string[], dept?: string[], loc?: string[], supervisor?: string[], ramco?: string[], pos?: string[]) => {
  let query = `SELECT * FROM ${employeeTable}`;
  const params: any[] = [];
  const conditions: string[] = [];
  if (status) {
    conditions.push('employment_status = ?');
    params.push(status);
  }
  // cost center filter (assuming column name costcenter_id)
  if (Array.isArray(cc) && cc.length > 0) {
    const ph = cc.map(() => '?').join(',');
    conditions.push(`costcenter_id IN (${ph})`);
    params.push(...cc);
  }
  // department filter
  if (Array.isArray(dept) && dept.length > 0) {
    const ph = dept.map(() => '?').join(',');
    conditions.push(`department_id IN (${ph})`);
    params.push(...dept);
  }
  // location filter
  if (Array.isArray(loc) && loc.length > 0) {
    const ph = loc.map(() => '?').join(',');
    conditions.push(`location_id IN (${ph})`);
    params.push(...loc);
  }
  // supervisor filter (match supervisor_id column to ramco_id(s))
  if (Array.isArray(supervisor) && supervisor.length > 0) {
    const ph = supervisor.map(() => '?').join(',');
    conditions.push(`supervisor_id IN (${ph})`);
    params.push(...supervisor);
  }
  // ramco filter (match ramco_id column)
  if (Array.isArray(ramco) && ramco.length > 0) {
    const ph = ramco.map(() => '?').join(',');
    conditions.push(`ramco_id IN (${ph})`);
    params.push(...ramco);
  }
  // position filter (position_id)
  if (Array.isArray(pos) && pos.length > 0) {
    const ph = pos.map(() => '?').join(',');
    conditions.push(`position_id IN (${ph})`);
    params.push(...pos);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.query(query, params);
  return rows;
};

export const getEmployeeById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByRamco = async (ramco_id: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE ramco_id = ?`, [ramco_id]);
  return (rows as RowDataPacket[])[0];
};

// Get Head of Department (HOD) by department_id using departmental_level = 1
export const getDepartmentHeadByDepartmentId = async (department_id: number) => {
  if (!Number.isFinite(department_id)) return null as any;
  const [rows] = await pool.query(
    `SELECT * FROM ${employeeTable}
     WHERE department_id = ?
       AND employment_status = 'active'
       AND COALESCE(departmental_level, 0) = 1
     ORDER BY id ASC
     LIMIT 1`,
    [department_id]
  );
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByEmail = async (email: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE email = ?`, [email]);
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByContact = async (contact: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE contact = ?`, [contact]);
  return (rows as RowDataPacket[])[0];
};

export const updateEmployee = async (id: number, data: any) => {
  const { avatar, contact, costcenter_id, department_id, email, employment_status, employment_type, full_name, location_id, position_id, resignation_date } = data;
  const [result] = await pool.query(
    `UPDATE ${employeeTable} SET full_name = ?, email = ?, contact = ?, department_id = ?, costcenter_id = ?, position_id = ?, location_id = ?, avatar = ?, resignation_date = ?, employment_type = ?, employment_status = ? WHERE id = ?`,
    [full_name, email, contact, department_id, costcenter_id, position_id, location_id, avatar, resignation_date, employment_type, employment_status, id]
  );
  return result;
};

export const deleteEmployee = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${employeeTable} WHERE id = ?`, [id]);
  return result;
};

// Bulk update resignation details by ramco_id array
export const updateEmployeesResignation = async (
  ramcoIds: string[],
  resignationDate: string,
  employmentStatus: string
) => {
  if (!Array.isArray(ramcoIds) || ramcoIds.length === 0) {
    return { affectedRows: 0 } as any;
  }
  const placeholders = ramcoIds.map(() => '?').join(',');
  const sql = `UPDATE ${employeeTable} SET resignation_date = ?, employment_status = ? WHERE ramco_id IN (${placeholders})`;
  const params = [resignationDate, employmentStatus, ...ramcoIds];
  const [result] = await pool.query(sql, params);
  return result as ResultSetHeader;
};

/* =========== POSITIONS =========== */
export const createPosition = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${positionTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getPositions = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${positionTable}`);
  return rows;
};

export const getPositionById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${positionTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updatePosition = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${positionTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deletePosition = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${positionTable} WHERE id = ?`, [id]);
  return result;
};

// VENDORS CRUD
export const createVendor = async (data: any) => {
  const { name, quote_date, quote_number, quote_status } = data;
  const [result] = await pool.query(
    `INSERT INTO ${vendorTable} (name, quote_number, quote_date, quote_status) VALUES (?, ?, ?, ?)`,
    [name, quote_number, quote_date, quote_status]
  );
  return result;
};

export const getVendors = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${vendorTable}`);
  return rows;
};

export const getVendorById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${vendorTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateVendor = async (id: number, data: any) => {
  const { name, quote_date, quote_number, quote_status } = data;
  const [result] = await pool.query(
    `UPDATE ${vendorTable} SET name = ?, quote_number = ?, quote_date = ?, quote_status = ? WHERE id = ?`,
    [name, quote_number, quote_date, quote_status, id]
  );
  return result;
};

export const deleteVendor = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${vendorTable} WHERE id = ?`, [id]);
  return result;
};

// PROCUREMENTS CRUD
export const createProcurement = async (data: any) => {
  const { conditions, cost_center_id, currency, delivery_date, delivery_status, department_id, develivery_order, invoice_date, invoice_number, invoice_status, price, purchase_date, purchase_order, purchase_order_date, purchase_order_status, requisition_number, vendor_id, warranty_period } = data;
  const [result] = await pool.query(
    `INSERT INTO ${procurementTable} (requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period]
  );
  return result;
};

export const getProcurements = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${procurementTable}`);
  return rows;
};

export const getProcurementById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${procurementTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateProcurement = async (id: number, data: any) => {
  const { conditions, cost_center_id, currency, delivery_date, delivery_status, department_id, develivery_order, invoice_date, invoice_number, invoice_status, price, purchase_date, purchase_order, purchase_order_date, purchase_order_status, requisition_number, vendor_id, warranty_period } = data;
  const [result] = await pool.query(
    `UPDATE ${procurementTable} SET requisition_number = ?, vendor_id = ?, purchase_order = ?, purchase_order_date = ?, purchase_order_status = ?, delivery_date = ?, delivery_status = ?, develivery_order = ?, invoice_number = ?, invoice_date = ?, invoice_status = ?, cost_center_id = ?, department_id = ?, conditions = ?, price = ?, currency = ?, purchase_date = ?, warranty_period = ? WHERE id = ?`,
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period, id]
  );
  return result;
};

export const deleteProcurement = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${procurementTable} WHERE id = ?`, [id]);
  return result;
};




// MODULES CRUD
export const createModule = async (data: any) => {
  const { code = null, name = null } = data;
  const [result] = await pool.query(`INSERT INTO ${moduleTable} (name, code) VALUES (?, ?)`, [name, code]);
  return result;
};

export const getModules = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${moduleTable}`);
  return rows;
};

export const getModuleById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${moduleTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModule = async (id: number, data: any) => {
  const { code = null, name = null } = data;
  const [result] = await pool.query(`UPDATE ${moduleTable} SET name = ?, code = ? WHERE id = ?`, [name, code, id]);
  return result;
};

export const deleteModule = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${moduleTable} WHERE id = ?`, [id]);
  return result;
};

// BRAND_CATEGORIES JOIN TABLE CRUD
export const addBrandCategory = async (brand_code: string, category_code: string) => {
  const [result] = await pool.query(
    `INSERT INTO ${brandCategoryTable} (brand_code, category_code) VALUES (?, ?)`,
    [brand_code, category_code]
  );
  return result;
};

export const removeBrandCategory = async (brand_code: string, category_code: string) => {
  const [result] = await pool.query(
    `DELETE FROM ${brandCategoryTable} WHERE brand_code = ? AND category_code = ?`,
    [brand_code, category_code]
  );
  return result;
};

export const getCategoriesByBrand = async (brand_code: string) => {
  const [rows] = await pool.query(
    `SELECT category_code FROM ${brandCategoryTable} WHERE brand_code = ?`,
    [brand_code]
  );
  return rows;
};

export const getCategoriesByBrandId = async (brand_id: number) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name 
     FROM ${categoryTable} c 
     JOIN ${brandCategoryTable} bc ON c.id = bc.category_id 
     WHERE bc.brand_id = ?`,
    [brand_id]
  );
  return rows;
};

export const getBrandsByCategory = async (category_code: string) => {
  const [rows] = await pool.query(
    `SELECT brand_code FROM ${brandCategoryTable} WHERE category_code = ?`,
    [category_code]
  );
  return rows;
};

export const getBrandsByCategoryId = async (category_id: number) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.name 
     FROM ${brandTable} b 
     JOIN ${brandCategoryTable} bc ON b.id = bc.brand_id 
     WHERE bc.category_id = ?`,
    [category_id]
  );
  return rows;
};

// SOFTWARE CRUD
export const getSoftwares = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${softwareTable}`);
  return rows;
};

export const getSoftwareById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${softwareTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const createSoftware = async (data: { name: string }) => {
  const { name } = data;
  const [result] = await pool.query(
    `INSERT INTO ${softwareTable} (name) VALUES (?)`,
    [name]
  );
  return result;
};

export const updateSoftware = async (id: number, data: { name: string }) => {
  const { name } = data;
  const [result] = await pool.query(
    `UPDATE ${softwareTable} SET name = ? WHERE id = ?`,
    [name, id]
  );
  return result;
};

export const deleteSoftware = async (id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${softwareTable} WHERE id = ?`,
    [id]
  );
  return result;
};

// Resolve codes to IDs for model creation/update
export const getTypeByCode = async (code: number | string) => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getCategoryByCode = async (code: number | string) => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getBrandByCode = async (code: number | string) => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

// Fetch specs for an asset (by asset_id)
export async function getComputerSpecsForAsset(asset_id: number) {
  return getSpecsForAsset(1, asset_id);
}

// Fetch installed software for an asset (by asset_id)
export async function getInstalledSoftwareForAsset(asset_id: number) {
  const [rows] = await pool.query(
    `SELECT pis.id, pis.software_id, s.name, pis.installed_at
    FROM assetdata.pc_installed_software pis
    JOIN assetdata.pc_software s ON pis.software_id = s.id
    WHERE pis.asset_id = ?`,
    [asset_id]
  );
  return rows;
}

// Fetch vehicle specs for an asset (by asset_id)
export async function getVehicleSpecsForAsset(asset_id: number) {
  return getSpecsForAsset(2, asset_id);
}


// Helper: get assets by array of asset IDs
export const getAssetsByIds = async (assetIds: number[]) => {
  if (!Array.isArray(assetIds) || !assetIds.length) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT * FROM ${assetTable} WHERE id IN (${placeholders})`, assetIds);
  return rows;
};

// Search employees for autocomplete with enriched organizational details
export const searchEmployeesAutocomplete = async (query: string) => {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return [];
  const q = `%${term}%`;
  const [rows] = await pool.query(
    `SELECT 
       e.ramco_id,
       e.full_name,
       e.position_id,
       p.name AS position_name,
       e.costcenter_id,
       cc.name AS costcenter_name,
       e.department_id,
       d.name AS department_name,
       e.location_id,
       l.name AS location_name
     FROM ${employeeTable} e
     LEFT JOIN ${positionTable} p ON p.id = e.position_id
     LEFT JOIN ${costcenterTable} cc ON cc.id = e.costcenter_id
     LEFT JOIN ${departmentTable} d ON d.id = e.department_id
     LEFT JOIN ${locationTable} l ON l.id = e.location_id
     WHERE e.employment_status = 'active'
       AND (LOWER(e.full_name) LIKE ? OR LOWER(e.ramco_id) LIKE ?)
     ORDER BY e.full_name ASC
     LIMIT 20`,
    [q, q]
  );
  return rows;
};



/* ============ ASSET TRANSFER REQUESTS CRUD ============ */

export const getAssetTransfers = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferRequestTable}`);
  return rows;
};

export const getAssetTransferById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferRequestTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const createAssetTransfer = async (data: any) => {
  const [result] = await pool.query(
    `INSERT INTO ${assetTransferRequestTable} (transfer_date, transfer_by, costcenter_id, department_id, transfer_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.transfer_date, data.transfer_by, data.costcenter_id, data.department_id, data.transfer_status]
  );
  return (result as any).insertId;
};

export const createAssetTransferItem = async (data: any) => {
  // Ensure only primitive values are inserted
  const getId = (v: any) => (v && typeof v === 'object' && 'id' in v) ? v.id : v ?? null;
  const [result] = await pool.query(
    `INSERT INTO ${assetTransferItemTable} (transfer_id, effective_date, asset_id, type_id, current_owner, current_costcenter_id, current_department_id, current_location_id, new_owner, new_costcenter_id, new_department_id, new_location_id, return_to_asset_manager, reason, remarks, attachment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.transfer_id,
      data.effective_date,
      data.asset_id,
      data.type_id,
      data.current_owner,
      data.current_costcenter_id,
      data.current_department_id,
      data.current_location_id,
      data.new_owner,
      data.new_costcenter_id,
      data.new_department_id,
      data.new_location_id,
      data.return_to_asset_manager,
      data.reason,
      data.remarks,
      data.attachment
    ]
  );
  return result;
};

export const updateAssetTransfer = async (id: number, data: any) => {
  const { action_date, approval_date, approval_id, asset_mgr_id, qa_date, qa_id, request_date, request_no, requestor, return_to_asset_manager, verified_date, verifier_id } = data;
  const [result] = await pool.query(
    `UPDATE ${assetTransferRequestTable} SET request_no = ?, requestor = ?, request_date = ?, verifier_id = ?, verified_date = ?, approval_id = ?, approval_date = ?, asset_mgr_id = ?, qa_id = ?, qa_date = ?, action_date = ?, return_to_asset_manager = ?, updated_at = NOW() WHERE id = ?`,
    [request_no, requestor, request_date, verifier_id, verified_date, approval_id, approval_date, asset_mgr_id, qa_id, qa_date, action_date, return_to_asset_manager ? 1 : 0, id]
  );
  return result;
};

// Bulk/individual update of transfer approvals
export const bulkUpdateAssetTransfersApproval = async (ids: number[], status: string, approved_by: string, approved_date?: Date | string) => {
  if (!Array.isArray(ids) || ids.length === 0) return { affectedRows: 0 } as any;
  const placeholders = ids.map(() => '?').join(',');
  const dateVal = approved_date ?? new Date();
  // Align with controller which reads approved_by/approved_date and transfer_status for statuses
  const sql = `UPDATE ${assetTransferRequestTable} SET transfer_status = ?, approved_by = ?, approved_date = ?, updated_at = NOW() WHERE id IN (${placeholders})`;
  const params: any[] = [status, approved_by, dateVal, ...ids];
  const [result] = await pool.query(sql, params);
  return result;
};
export const deleteAssetTransfer = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTransferRequestTable} WHERE id = ?`, [id]);
  return result;
};
export const deleteAssetTransferItemByRequestId = async (requestId: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTransferItemTable} WHERE transfer_id = ?`, [requestId]);
  return result;
};
export const getAssetTransferItemByRequestId = async (transfer_id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferItemTable} WHERE transfer_id = ?`, [transfer_id]);
  return rows;
};

export const getAssetTransferItemById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferItemTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const getAllAssetTransferItems = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferItemTable}`);
  return rows;
};

export const updateAssetTransferItem = async (id: number, data: any) => {
  const allowedFields = [
    'effective_date',
    'asset_id',
    'type_id',
    'current_owner',
    'current_costcenter_id',
    'current_department_id',
    'current_location_id',
    'new_owner',
    'new_costcenter_id',
    'new_department_id',
    'new_location_id',
    'return_to_asset_manager',
    'reason',
    'remarks',
    'attachment'
  ] as const;
  const sets: string[] = [];
  const params: any[] = [];
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sets.push(`${key} = ?`);
      params.push((data)[key]);
    }
  }
  if (!sets.length) {
    return { affectedRows: 0 } as any;
  }
  const sql = `UPDATE ${assetTransferItemTable} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`;
  params.push(id);
  const [result] = await pool.query(sql, params);
  return result;
};

export const deleteAssetTransferItem = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTransferItemTable} WHERE id = ?`, [id]);
  return result;
};

export const getAssetTransferWithDetails = async () => {
  const requests = await (await pool.query(`SELECT * FROM ${assetTransferRequestTable}`))[0] as RowDataPacket[];
  if (!requests.length) return [];
  const allIds = requests.map((r: any) => r.id);
  const placeholders = allIds.map(() => '?').join(',');
  const [allDetails] = await pool.query(
    `SELECT * FROM ${assetTransferItemTable} WHERE transfer_id IN (${placeholders})`,
    allIds
  );
  // Group details by transfer_id
  const detailsMap: Record<number, any[]> = {};
  for (const detail of allDetails as any[]) {
    if (!detailsMap[detail.transfer_id]) detailsMap[detail.transfer_id] = [];
    detailsMap[detail.transfer_id].push(detail);
  }
  // Attach items to each request
  return requests.map((r: any) => ({ ...r, items: detailsMap[r.id] || [] }));
};

// Helper to generate the next request_no in the format 'AR/0001/{year}'.
export const generateNextRequestNo = async () => {
  const year = new Date().getFullYear();
  // Find the max number for this year
  const [rows] = await pool.query(
    `SELECT request_no FROM ${assetTransferRequestTable} WHERE request_no LIKE ? ORDER BY request_no DESC LIMIT 1`,
    [`AR/%/${year}`]
  );
  let nextNumber = 1;
  if (Array.isArray(rows) && rows.length > 0) {
    const last = (rows[0] as any).request_no;
    const match = last?.match(/AR\/(\d{4})\//);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `AR/${nextNumber.toString().padStart(4, '0')}/${year}`;
};

/* === TRANSFER CHECKLIST === */
export const getTransferChecklists = async (typeId?: number) => {
  if (typeof typeId === 'number' && !Number.isNaN(typeId)) {
    const [rows] = await pool.query(`SELECT * FROM ${transferChecklistTable} WHERE type_id = ?`, [typeId]);
    return rows;
  }
  const [rows] = await pool.query(`SELECT * FROM ${transferChecklistTable}`);
  return rows;
};
export const getTransferChecklistById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${transferChecklistTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};
export const createTransferChecklist = async (data: any) => {
  const { created_by, is_required, item, type_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${transferChecklistTable} (type_id, item, is_required, created_by, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [type_id, item, is_required ? 1 : 0, created_by]
  );
  return result;
}
export const updateTransferChecklist = async (id: number, data: any) => {
  const { created_by, is_required, item, sort_order, type_id } = data;
  const [result] = await pool.query(
    `UPDATE ${transferChecklistTable} SET type_id = ?, item = ?, is_required = ?, created_by = ?, created_at = NOW() WHERE id = ?`,
    [type_id, item, is_required ? 1 : 0, created_by, id]
  );
  return result;
};
export const deleteTransferChecklist = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${transferChecklistTable} WHERE id = ?`, [id]);
  return result;
};

// Update acceptance metadata for a transfer request (dynamic fields)
export const setAssetTransferAcceptance = async (id: number, data: {
  acceptance_attachments?: string[]; // stored as JSON array string
  acceptance_by?: null | string;
  acceptance_checklist_items?: number[]; // will be stored as comma-separated string
  acceptance_date?: null | string; // expect 'YYYY-MM-DD hh:mm:ss'
  acceptance_remarks?: null | string;
}) => {
  const sets: string[] = [];
  const params: any[] = [];
  if (data.acceptance_by !== undefined) { sets.push('acceptance_by = ?'); params.push(data.acceptance_by); }
  if (data.acceptance_date !== undefined) { sets.push('acceptance_date = ?'); params.push(data.acceptance_date); }
  if (data.acceptance_remarks !== undefined) { sets.push('acceptance_remarks = ?'); params.push(data.acceptance_remarks); }
  if (data.acceptance_attachments !== undefined) {
    // keep attachments as JSON string for future-proofing
    sets.push('acceptance_attachments = ?');
    params.push(JSON.stringify(data.acceptance_attachments));
  }
  if (data.acceptance_checklist_items !== undefined) {
    // store as plain comma-separated list without brackets
    const csv = data.acceptance_checklist_items.map(n => Number(n)).filter(n => Number.isFinite(n)).join(',');
    sets.push('acceptance_checklist_items = ?');
    params.push(csv);
  }
  if (!sets.length) return { affectedRows: 0 } as any;
  const sql = `UPDATE ${assetTransferItemTable} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`;
  params.push(id);
  const [result] = await pool.query(sql, params);
  return result;
};

// Insert asset movement record into asset_history
export const insertAssetHistory = async (data: {
  asset_id: number;
  costcenter_id?: null | number;
  department_id?: null | number;
  effective_date?: Date | string;
  location_id?: null | number;
  ramco_id?: null | string;
  register_number?: null | string;
  type_id?: null | number;
}) => {
  const [result] = await pool.query(
    `INSERT INTO ${assetHistoryTable} (asset_id, register_number, type_id, costcenter_id, department_id, location_id, ramco_id, effective_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.asset_id,
      data.register_number ?? null,
      data.type_id ?? null,
      data.costcenter_id ?? null,
      data.department_id ?? null,
      data.location_id ?? null,
      data.ramco_id ?? null,
      data.effective_date ?? new Date()
    ]
  );
  return result;
};

// Update asset current ownership data in assetdata table
export const updateAssetCurrentOwner = async (asset_id: number, data: {
  costcenter_id?: null | number;
  department_id?: null | number;
  location_id?: null | number;
  ramco_id?: null | string;
}) => {
  const sets: string[] = [];
  const params: any[] = [];
  
  if (data.ramco_id !== undefined) { sets.push('ramco_id = ?'); params.push(data.ramco_id); }
  if (data.costcenter_id !== undefined) { sets.push('costcenter_id = ?'); params.push(data.costcenter_id); }
  if (data.department_id !== undefined) { sets.push('department_id = ?'); params.push(data.department_id); }
  if (data.location_id !== undefined) { sets.push('location_id = ?'); params.push(data.location_id); }
  
  if (!sets.length) return { affectedRows: 0 } as any;
  
  const sql = `UPDATE ${assetTable} SET ${sets.join(', ')} WHERE id = ?`;
  params.push(asset_id);
  
  const [result] = await pool.query(sql, params);
  return result;
};



// Note: named exports are used throughout the codebase. No default export to normalize usage.

