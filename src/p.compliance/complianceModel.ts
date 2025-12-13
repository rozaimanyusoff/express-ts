import { ResultSetHeader } from 'mysql2';

import { pool, pool2 } from '../utils/db';

const dbName = 'compliance';
const summonTable = `${dbName}.summon`;
const summonTypeTable = `${dbName}.summon_type`;
const summonAgencyTable = `${dbName}.summon_agency`;
const summonTypeAgencyTable = `${dbName}.summon_type_agency`;

const assessmentCriteriaTable = `${dbName}.v_assess_qset`;
const assessmentTable = `${dbName}.v_assess2`;
const assessmentDetailTable = `${dbName}.v_assess_dt2`; // linked to v_assess2 via assess_id

const criteriaOwnershipTable = `${dbName}.criteria_ownership`;

const computerAssessmentTable = `${dbName}.computer_assessment`;


export interface SummonAgency {
  code?: null | string;
  created_at?: null | string;
  id?: number;
  name?: null | string;
  updated_at?: null | string;
}

export interface SummonType {
  created_at?: null | string;
  description?: null | string;
  id?: number;
  name?: null | string;
  updated_at?: null | string;
}

export interface SummonTypeAgency {
  agency_id?: null | number;
  created_at?: null | string;
  id?: number;
  type_id?: null | number;
  updated_at?: null | string;
}

// Helper to format JS Date/ISO into MySQL DATETIME: 'YYYY-MM-DD HH:mm:ss'
const formatToMySQLDatetime = (input?: any): null | string => {
  if (!input) return null;
  const d = (input instanceof Date) ? input : new Date(String(input));
  if (isNaN(d.getTime())) return null;
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
};

const fromParts = (dateStr?: null | string, timeStr?: null | string) => {
  if (!dateStr) return null;
  const datePart = String(dateStr).trim();
  const timePart = timeStr ? String(timeStr).trim() : '00:00:00';
  const combined = `${datePart}T${timePart}`;
  const d = new Date(combined);
  if (isNaN(d.getTime())) return null;
  return formatToMySQLDatetime(d);
};

// Normalize date-only to 'YYYY-MM-DD'
const formatToDateOnly = (input?: any): null | string => {
  if (!input) return null;
  const d = (input instanceof Date) ? input : new Date(String(input));
  if (isNaN(d.getTime())) return null;
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
};

// Normalize time-only to 'HH:MM:SS'
const formatToTimeOnly = (input?: any): null | string => {
  if (!input) return null;
  // If input looks like 'HH:MM' or 'HH:MM:SS', try to parse directly
  const s = String(input).trim();
  const timeOnlyRegex = /^\d{1,2}:\d{2}(:\d{2})?$/;
  if (timeOnlyRegex.test(s)) {
    const parts = s.split(':');
    const hh = String(Number(parts[0])).padStart(2, '0');
    const mm = String(Number(parts[1])).padStart(2, '0');
    const ss = parts[2] ? String(Number(parts[2])).padStart(2, '0') : '00';
    return `${hh}:${mm}:${ss}`;
  }
  // Fallback: try to parse as Date and extract time
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export interface SummonRecord {
  asset_id?: null | number;
  attachment_url?: null | string;
  created_at?: null | string;
  emailStat?: null | number;
  entry_code?: null | string;
  f_name?: null | string;
  id?: number; // optional alias for compatibility
  myeg_date?: null | string;
  notice?: null | string;
  notice_date?: null | string;
  ramco_id?: null | string;
  receipt_date?: null | string;
  reg_no?: null | string;
  running_no?: null | number;
  smn_id?: number;
  summon_agency?: null | string;
  summon_amt?: null | string;
  summon_date?: null | string;
  summon_dt?: null | string;
  summon_loc?: null | string;
  summon_no?: null | string;
  summon_receipt?: null | string;
  summon_stat?: null | string;
  summon_time?: null | string;
  summon_upl?: null | string;
  type_of_summon?: null | string;
  updated_at?: null | string;
  v_email?: null | string;
  vehicle_id?: null | number;
}

export const getSummons = async (): Promise<SummonRecord[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTable} ORDER BY smn_id DESC`);
  return rows as SummonRecord[];
};

export const getSummonTypeAgencies = async (): Promise<SummonTypeAgency[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} ORDER BY id DESC`);
  return rows as SummonTypeAgency[];
};

export const getSummonTypeAgencyById = async (id: number): Promise<null | SummonTypeAgency> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} WHERE id = ?`, [id]);
  const data = rows as SummonTypeAgency[];
  return data.length > 0 ? data[0] : null;
};

export const getSummonTypeAgencyByPair = async (type_id: number, agency_id: number): Promise<null | SummonTypeAgency> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} WHERE type_id = ? AND agency_id = ? LIMIT 1`, [type_id, agency_id]);
  const data = rows as SummonTypeAgency[];
  return data.length > 0 ? data[0] : null;
};

export const getSummonTypeAgenciesByType = async (type_id: number): Promise<SummonTypeAgency[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} WHERE type_id = ? ORDER BY id DESC`, [type_id]);
  return rows as SummonTypeAgency[];
};

export const getAgenciesByType = async (type_id: number): Promise<SummonAgency[]> => {
  const [rows] = await pool2.query(
    `SELECT a.* FROM ${summonAgencyTable} a JOIN ${summonTypeAgencyTable} ta ON ta.agency_id = a.id WHERE ta.type_id = ? ORDER BY a.name`,
    [type_id]
  );
  return rows as SummonAgency[];
};

export const getSummonTypesWithAgencies = async (): Promise<{ agencies: SummonAgency[]; type: SummonType; }[]> => {
  const types = await getSummonTypes();
  const allAgencies = await getSummonAgencies();
  // Build agency map for quick lookup
  const agencyMap = new Map<number, SummonAgency>();
  for (const a of allAgencies) if (a.id) agencyMap.set(a.id, a);

  const result: { agencies: SummonAgency[]; type: SummonType; }[] = [];
  for (const t of types) {
    const mappings = await getSummonTypeAgenciesByType(Number(t.id));
    const agencies: SummonAgency[] = [];
    for (const m of mappings) {
      const aid = Number(m.agency_id);
      if (agencyMap.has(aid)) agencies.push(agencyMap.get(aid)!);
    }
    result.push({ agencies, type: t });
  }
  return result;
};

export const createSummonTypeAgency = async (data: Partial<SummonTypeAgency>) => {
  const type_id = Number((data as any).type_id) || 0;
  const agency_id = Number((data as any).agency_id) || 0;
  if (!type_id || !agency_id) throw new Error('type_id and agency_id are required');
  // prevent duplicate mapping
  const existing = await getSummonTypeAgencyByPair(type_id, agency_id);
  if (existing) return existing.id;
  const now = formatToMySQLDatetime(new Date());
  const [result] = await pool2.query(`INSERT INTO ${summonTypeAgencyTable} (type_id, agency_id, created_at, updated_at) VALUES (?, ?, ?, ?)`, [type_id, agency_id, now, now]);
  return (result as ResultSetHeader).insertId;
};

export const updateSummonTypeAgency = async (id: number, data: Partial<SummonTypeAgency>): Promise<void> => {
  const payload: any = {};
  if (data.type_id !== undefined) payload.type_id = Number((data as any).type_id) || null;
  if (data.agency_id !== undefined) payload.agency_id = Number((data as any).agency_id) || null;
  // if both provided, ensure no duplicate pair exists for different id
  if (payload.type_id && payload.agency_id) {
    const found = await getSummonTypeAgencyByPair(payload.type_id, payload.agency_id);
    if (found && found.id !== id) throw new Error('Mapping already exists');
  }
  // set updated_at
  const now = formatToMySQLDatetime(new Date());
  payload.updated_at = now;
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${summonTypeAgencyTable} SET ${fields} WHERE id = ?`, [...values, id]);
  }
};

export const deleteSummonTypeAgency = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${summonTypeAgencyTable} WHERE id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Summon type-agency mapping not found');
};

export const getSummonTypes = async (): Promise<SummonType[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeTable} ORDER BY id DESC`);
  return rows as SummonType[];
};

export const getSummonTypeById = async (id: number): Promise<null | SummonType> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeTable} WHERE id = ?`, [id]);
  const data = rows as SummonType[];
  return data.length > 0 ? data[0] : null;
};

export const createSummonType = async (data: Partial<SummonType>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload = { ...data, created_at: now, updated_at: now } as any;
  const [result] = await pool2.query(`INSERT INTO ${summonTypeTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateSummonType = async (id: number, data: Partial<SummonType>): Promise<void> => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${summonTypeTable} SET ${fields} WHERE id = ?`, [...values, id]);
  }
};

export const deleteSummonType = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${summonTypeTable} WHERE id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Summon type not found');
};

export const getSummonById = async (id: number): Promise<null | SummonRecord> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTable} WHERE smn_id = ?`, [id]);
  const data = rows as SummonRecord[];
  return data.length > 0 ? data[0] : null;
};

export const getSummonAgencies = async (): Promise<SummonAgency[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonAgencyTable} ORDER BY id DESC`);
  return rows as SummonAgency[];
};

export const getSummonAgencyById = async (id: number): Promise<null | SummonAgency> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonAgencyTable} WHERE id = ?`, [id]);
  const data = rows as SummonAgency[];
  return data.length > 0 ? data[0] : null;
};

export const createSummonAgency = async (data: Partial<SummonAgency>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload = { ...data, created_at: now, updated_at: now } as any;
  const [result] = await pool2.query(`INSERT INTO ${summonAgencyTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateSummonAgency = async (id: number, data: Partial<SummonAgency>): Promise<void> => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${summonAgencyTable} SET ${fields} WHERE id = ?`, [...values, id]);
  }
};

export const deleteSummonAgency = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${summonAgencyTable} WHERE id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Summon agency not found');
};

export const createSummon = async (data: SummonRecord) => {

  const [result] = await pool2.query(`INSERT INTO ${summonTable} (asset_id, ramco_id, summon_no, summon_date, summon_time, summon_loc, myeg_date, type_of_summon, summon_agency, summon_amt, summon_upl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.asset_id, data.ramco_id, data.summon_no, data.summon_date, data.summon_time, data.summon_loc, data.myeg_date, data.type_of_summon, data.summon_agency, data.summon_amt, data.summon_upl]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateSummon = async (id: number, data: Partial<Omit<SummonRecord, 'created_at' | 'id' | 'updated_at'>>): Promise<void> => {
  // Normalize summon_date and summon_time (if present) and only format summon_dt when explicitly provided.
  if ('summon_date' in data && (data as any).summon_date) {
    const d = formatToDateOnly((data as any).summon_date);
    if (d) (data as any).summon_date = d;
    else (data as any).summon_date = null;
  }
  if ('summon_time' in data && (data as any).summon_time) {
    const t = formatToTimeOnly((data as any).summon_time);
    if (t) (data as any).summon_time = t;
    else (data as any).summon_time = null;
  }

  if ('summon_dt' in data && (data as any).summon_dt) {
    const dt = formatToMySQLDatetime((data as any).summon_dt);
    (data as any).summon_dt = dt || null;
  }

  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${summonTable} SET ${fields} WHERE smn_id = ?`, [...values, id]);
  }
};

export const deleteSummon = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${summonTable} WHERE smn_id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Summon record not found');
};

/* ========== ASSESSMENT CRITERIA ========== */
export interface AssessmentCriteria {
  created_at?: null | string;
  created_by?: null | string;
  ownership?: null | number;
  q_id?: number;
  qset_desc?: null | string;
  qset_id?: number;
  qset_order?: null | number;
  qset_quesno?: number;
  qset_stat?: null | string;
  updated_at?: null | string;
  updated_by?: null | string;
}

export const getAssessmentCriteria = async (): Promise<AssessmentCriteria[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentCriteriaTable} ORDER BY qset_order`);
  return rows as AssessmentCriteria[];
};


export const getAssessmentCriteriaById = async (id: number): Promise<AssessmentCriteria | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentCriteriaTable} WHERE qset_id = ?`, [id]);
  const data = rows as AssessmentCriteria[];
  return data.length > 0 ? data[0] : null;
};

export const createAssessmentCriteria = async (data: Partial<AssessmentCriteria>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload: any = { ...data, created_at: now, updated_at: now };
  const [result] = await pool2.query(`INSERT INTO ${assessmentCriteriaTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateAssessmentCriteria = async (id: number, data: Partial<AssessmentCriteria>) => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${assessmentCriteriaTable} SET ${fields} WHERE qset_id = ?`, [...values, id]);
  }
};

export const deleteAssessmentCriteria = async (id: number) => {
  const [result] = await pool2.query(`DELETE FROM ${assessmentCriteriaTable} WHERE qset_id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Assessment criteria not found');
};

// Reorder an assessment criteria item by changing its qset_order and shifting others
export const reorderAssessmentCriteria = async (qset_id: number, newOrderInput: number) => {
  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();

    // fetch current order
    const [rows] = await conn.query(`SELECT qset_order FROM ${assessmentCriteriaTable} WHERE qset_id = ? FOR UPDATE`, [qset_id]);
    const data = rows as any[];
    if (!data || data.length === 0) throw new Error('Assessment criteria not found');
    const currentOrder = Number(data[0].qset_order) || 0;

    // determine bounds
    const [maxRows] = await conn.query(`SELECT MAX(qset_order) as maxOrder FROM ${assessmentCriteriaTable}`);
    const maxOrder = (Array.isArray(maxRows) && (maxRows as any[])[0]?.maxOrder) ? Number((maxRows as any[])[0].maxOrder) : currentOrder;

    let newOrder = Number(newOrderInput) || 0;
    if (newOrder < 1) newOrder = 1;
    if (newOrder > maxOrder) newOrder = maxOrder;

    if (newOrder === currentOrder) {
      await conn.commit();
      return;
    }

    const now = formatToMySQLDatetime(new Date());

    if (newOrder < currentOrder) {
      // shift others down (increment) to make space
      await conn.query(
        `UPDATE ${assessmentCriteriaTable} SET qset_order = qset_order + 1, updated_at = ? WHERE qset_order >= ? AND qset_order < ?`,
        [now, newOrder, currentOrder]
      );
    } else {
      // newOrder > currentOrder: shift others up (decrement)
      await conn.query(
        `UPDATE ${assessmentCriteriaTable} SET qset_order = qset_order - 1, updated_at = ? WHERE qset_order <= ? AND qset_order > ?`,
        [now, newOrder, currentOrder]
      );
    }

    // set target item to newOrder
    await conn.query(`UPDATE ${assessmentCriteriaTable} SET qset_order = ?, updated_at = ? WHERE qset_id = ?`, [newOrder, now, qset_id]);

    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => { });
    throw err;
  } finally {
    conn.release();
  }
};

/* ========== CRITERIA OWNERSHIP ========== */
export interface CriteriaOwnership {
  created_at?: null | string; //datetime - yyyy-mm-dd hh:mm:ss
  department_id?: null | number; // department ID
  id?: number;
  ramco_id?: null | string; //member ID
  status?: null | string;
  updated_at?: null | string; //datetime - yyyy-mm-dd hh:mm:ss
}

export const getAssessmentCriteriaOwnerships = async (): Promise<CriteriaOwnership[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${criteriaOwnershipTable} ORDER BY id DESC`);
  return rows as CriteriaOwnership[];
}

export const getAssessmentCriteriaOwnershipById = async (id: number): Promise<CriteriaOwnership | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${criteriaOwnershipTable} WHERE id = ?`, [id]);
  const data = rows as CriteriaOwnership[];
  return data.length > 0 ? data[0] : null;
}

export const createAssessmentCriteriaOwnership = async (data: Partial<CriteriaOwnership>) => {
  const now = formatToMySQLDatetime(new Date());
  const ramco_id = (data.ramco_id ?? '').toString();
  const department_id = Number(data.department_id ?? 0);
  if (!ramco_id || !department_id) throw new Error('ramco_id and department_id are required');
  // Check for duplicate
  const [dupRows] = await pool2.query(
    `SELECT id FROM ${criteriaOwnershipTable} WHERE ramco_id = ? AND department_id = ? LIMIT 1`,
    [ramco_id, department_id]
  );
  if (Array.isArray(dupRows) && dupRows.length > 0) {
    throw new Error('Duplicate ownership record exists for this ramco_id and department_id');
  }
  const payload = { ...data, created_at: now, updated_at: now } as any;
  const [result] = await pool2.query(`INSERT INTO ${criteriaOwnershipTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
}

export const updateAssessmentCriteriaOwnership = async (id: number, data: Partial<CriteriaOwnership>): Promise<void> => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${criteriaOwnershipTable} SET ${fields} WHERE id = ?`, [...values, id]);
  }
}

export const deleteAssessmentCriteriaOwnership = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${criteriaOwnershipTable} WHERE id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Criteria ownership record not found');
}


/* ========== ASSESSMENTS (parent) ========== */
export interface AssessmentRecord {
  a_date?: null | string;
  a_dt?: null | string;
  a_loc?: null | string;
  a_ncr?: null | number;
  a_rate?: null | string;
  a_remark?: null | string;
  a_upload?: null | string;
  a_upload2?: null | string;
  a_upload3?: null | string;
  a_upload4?: null | string;
  assess_id?: number;
  asset_id?: null | number;
  loc_id?: null | number;
  ownership?: null | number;
}

export const getAssessments = async (year?: number, asset_id?: number): Promise<AssessmentRecord[]> => {
  let query = `SELECT * FROM ${assessmentTable}`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (year) {
    conditions.push(`(YEAR(a_date) = ? OR (a_date IS NULL AND YEAR(a_dt) = ?))`);
    params.push(year, year);
  }

  if (asset_id) {
    conditions.push(`asset_id = ?`);
    params.push(asset_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY assess_id DESC`;
  const [rows] = await pool2.query(query, params);
  return rows as AssessmentRecord[];
};

export const getAssessmentById = async (id: number): Promise<AssessmentRecord | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentTable} WHERE assess_id = ?`, [id]);
  const data = rows as AssessmentRecord[];
  return data.length > 0 ? data[0] : null;
};

export const createAssessment = async (data: Partial<AssessmentRecord>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload: any = { ...data, created_at: now, updated_at: now };
  const [result] = await pool2.query(`INSERT INTO ${assessmentTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateAssessment = async (id: number, data: Partial<AssessmentRecord>) => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${assessmentTable} SET ${fields} WHERE assess_id = ?`, [...values, id]);
  }
};

export const deleteAssessment = async (id: number) => {
  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();
    // First delete child records
    await conn.query(`DELETE FROM ${assessmentDetailTable} WHERE assess_id = ?`, [id]);
    // Then delete parent record
    const [result] = await conn.query(`DELETE FROM ${assessmentTable} WHERE assess_id = ?`, [id]);
    const r = result as ResultSetHeader;
    if (r.affectedRows === 0) {
      // No parent row deleted; rollback to avoid leaving partial state (though children already deleted is harmless)
      await conn.rollback();
      throw new Error('Assessment not found');
    }
    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
};

// Update acceptance_status and acceptance_date for assessment
export const updateAssessmentAcceptance = async (id: number, acceptance_status: number, acceptance_date: Date) => {
  const payload: any = {
    acceptance_date: formatToMySQLDatetime(acceptance_date),
    acceptance_status,
    updated_at: formatToMySQLDatetime(new Date()),
  };
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${assessmentTable} SET ${fields} WHERE assess_id = ?`, [...values, id]);
  }
};

/* ========== ASSESSMENT DETAILS (child) ========== */
export interface AssessmentDetailRecord {
  adt_id?: number;
  adt_item?: null | string;
  adt_ncr?: null | number;
  adt_rate?: null | string;
  adt_rate2?: null | number;
  adt_rem?: null | string;
  assess_id?: number;
  created_at?: null | string;
  updated_at?: null | string;
  vehicle_id?: null | number;
}

export const getAssessmentDetails = async (assess_id: number): Promise<AssessmentDetailRecord[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentDetailTable} WHERE assess_id = ? ORDER BY adt_id ASC`, [assess_id]);
  return rows as AssessmentDetailRecord[];
};

export const getAssessmentDetailById = async (id: number): Promise<AssessmentDetailRecord | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentDetailTable} WHERE adt_id = ?`, [id]);
  const data = rows as AssessmentDetailRecord[];
  return data.length > 0 ? data[0] : null;
};

export const createAssessmentDetail = async (data: Partial<AssessmentDetailRecord>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload: any = { ...data, created_at: now, updated_at: now };
  const [result] = await pool2.query(`INSERT INTO ${assessmentDetailTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateAssessmentDetail = async (id: number, data: Partial<AssessmentDetailRecord>) => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await pool2.query(`UPDATE ${assessmentDetailTable} SET ${fields} WHERE adt_id = ?`, [...values, id]);
  }
};

export const deleteAssessmentDetail = async (id: number) => {
  const [result] = await pool2.query(`DELETE FROM ${assessmentDetailTable} WHERE adt_id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Assessment detail not found');
};

// ========== Transaction helpers and bulk detail replacement ==========
import type { PoolConnection } from 'mysql2/promise';

export const withTransaction = async <T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> => {
  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
};

export const createAssessmentWithConn = async (conn: PoolConnection, data: Partial<AssessmentRecord>) => {
  const now = formatToMySQLDatetime(new Date());
  const payload: any = { ...data, created_at: now, updated_at: now };
  const [result] = await conn.query(`INSERT INTO ${assessmentTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateAssessmentWithConn = async (conn: PoolConnection, id: number, data: Partial<AssessmentRecord>) => {
  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());
  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);
  if (fields) {
    await conn.query(`UPDATE ${assessmentTable} SET ${fields} WHERE assess_id = ?`, [...values, id]);
  }
};

export const replaceAssessmentDetails = async (
  assess_id: number,
  details: Partial<AssessmentDetailRecord>[]
): Promise<{ deleted: number; inserted: number }> => {
  if (!assess_id) throw new Error('assess_id is required');

  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();

    const [delRes] = await conn.query(`DELETE FROM ${assessmentDetailTable} WHERE assess_id = ?`, [assess_id]);
    const deleted = (delRes as ResultSetHeader).affectedRows || 0;

    if (!Array.isArray(details) || details.length === 0) {
      await conn.commit();
      return { deleted, inserted: 0 };
    }

    const now = formatToMySQLDatetime(new Date());
    const allowedCols = ['assess_id', 'vehicle_id', 'adt_item', 'adt_ncr', 'adt_rate', 'adt_rate2', 'adt_rem', 'adt_image'];
    const rows: any[] = [];
    for (const d of details) {
      const row: any = { assess_id };
      for (const k of allowedCols) {
        if (k === 'assess_id') continue;
        if ((d as any)[k] !== undefined) row[k] = (d as any)[k];
      }
      row.created_at = now;
      row.updated_at = now;
      rows.push(row);
    }

    if (rows.length === 0) {
      await conn.commit();
      return { deleted, inserted: 0 };
    }

    const sample = rows[0];
    const cols = Object.keys(sample);
    const placeholders = `(${cols.map(() => '?').join(', ')})`;
    const sql = `INSERT INTO ${assessmentDetailTable} (${cols.join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')}`;
    const values: any[] = [];
    for (const r of rows) values.push(...cols.map(c => r[c] === undefined ? null : r[c]));

    const [insRes] = await conn.query(sql, values);
    const inserted = (insRes as ResultSetHeader).affectedRows || 0;

    await conn.commit();
    return { deleted, inserted };
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
};

export const replaceAssessmentDetailsWithConn = async (
  conn: PoolConnection,
  assess_id: number,
  details: Partial<AssessmentDetailRecord>[]
): Promise<{ deleted: number; inserted: number }> => {
  if (!assess_id) throw new Error('assess_id is required');

  const [delRes] = await conn.query(`DELETE FROM ${assessmentDetailTable} WHERE assess_id = ?`, [assess_id]);
  const deleted = (delRes as ResultSetHeader).affectedRows || 0;

  if (!Array.isArray(details) || details.length === 0) {
    return { deleted, inserted: 0 };
  }

  const now = formatToMySQLDatetime(new Date());
  const allowedCols = ['assess_id', 'vehicle_id', 'adt_item', 'adt_ncr', 'adt_rate', 'adt_rate2', 'adt_rem', 'adt_image'];
  const rows: any[] = [];
  for (const d of details) {
    const row: any = { assess_id };
    for (const k of allowedCols) {
      if (k === 'assess_id') continue;
      if ((d as any)[k] !== undefined) row[k] = (d as any)[k];
    }
    row.created_at = now;
    row.updated_at = now;
    rows.push(row);
  }
  if (rows.length === 0) {
    return { deleted, inserted: 0 };
  }
  const sample = rows[0];
  const cols = Object.keys(sample);
  const placeholders = `(${cols.map(() => '?').join(', ')})`;
  const sql = `INSERT INTO ${assessmentDetailTable} (${cols.join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')}`;
  const values: any[] = [];
  for (const r of rows) values.push(...cols.map(c => r[c] === undefined ? null : r[c]));
  const [insRes] = await conn.query(sql, values);
  const inserted = (insRes as ResultSetHeader).affectedRows || 0;
  return { deleted, inserted };
};

// Get assessment with details by asset_id and year
export const getAssessmentDetailsByAssetAndYear = async (asset_id: number, year: number): Promise<(AssessmentRecord & { details: AssessmentDetailRecord[] })[]> => {
  let query = `SELECT * FROM ${assessmentTable} WHERE asset_id = ?`;
  const params: any[] = [asset_id];

  if (year) {
    query += ` AND (YEAR(a_date) = ? OR (a_date IS NULL AND YEAR(a_dt) = ?))`;
    params.push(year, year);
  }

  query += ` ORDER BY assess_id DESC`;
  const [assessmentRows] = await pool2.query(query, params);
  const assessments = assessmentRows as AssessmentRecord[];

  // Fetch details for each assessment
  const result: (AssessmentRecord & { details: AssessmentDetailRecord[] })[] = [];
  for (const assessment of assessments) {
    const details = await getAssessmentDetails(assessment.assess_id!);
    result.push({ ...assessment, details });
  }

  return result;
};

// Get assessment with NCR details (adt_ncr = 1) by asset_id and year
export const getAssessmentNCRDetailsByAsset = async (asset_id: number, year: number): Promise<(AssessmentRecord & { details: AssessmentDetailRecord[] })[]> => {
  let query = `SELECT * FROM ${assessmentTable} WHERE asset_id = ?`;
  const params: any[] = [asset_id];

  if (year) {
    query += ` AND (YEAR(a_date) = ? OR (a_date IS NULL AND YEAR(a_dt) = ?))`;
    params.push(year, year);
  }

  query += ` ORDER BY assess_id DESC`;
  const [assessmentRows] = await pool2.query(query, params);
  const assessments = assessmentRows as AssessmentRecord[];

  // Fetch NCR details (adt_ncr = 1) for each assessment
  const result: (AssessmentRecord & { details: AssessmentDetailRecord[] })[] = [];
  for (const assessment of assessments) {
    const [detailRows] = await pool2.query(
      `SELECT * FROM ${assessmentDetailTable} WHERE assess_id = ? AND adt_ncr = 2 ORDER BY adt_id`,
      [assessment.assess_id]
    );
    const details = detailRows as AssessmentDetailRecord[];
    // Only include assessments that have NCR details
    if (details.length > 0) {
      result.push({ ...assessment, details });
    }
  }

  return result;
};

/* ========== COMPUTER ASSESSMENT ========== */
export interface ComputerAssessment {
  adapter_equipped?: boolean | null;
  adapter_output?: null | string;
  assessment_date?: null | string;
  // Assessment metadata
  assessment_year?: null | string;
  // Asset reference
  asset_id?: null | number;
  // Security & VPN
  av_installed?: null | string; // 'Installed', 'Not installed', etc.

  av_license?: null | string;
  av_status?: null | string;
  av_vendor?: null | string;
  battery_capacity?: null | string;
  // Battery & Adapter
  battery_equipped?: boolean | null;
  brand?: null | string;

  category?: null | string;
  // Asset ownership
  costcenter_id?: null | number;
  cpu_generation?: null | string;
  // CPU specifications
  cpu_manufacturer?: null | string;

  cpu_model?: null | string;
  // Metadata
  created_at?: null | string;
  department_id?: null | number;

  display_form_factor?: null | string;
  display_interfaces?: null | string; // JSON array stored as string
  // Display specifications
  display_manufacturer?: null | string;

  display_resolution?: null | string;
  display_size?: null | number; // inches
  graphics_manufacturer?: null | string;

  graphics_specs?: null | string;
  // Graphics specifications
  graphics_type?: null | string;
  id?: number;

  // Software
  installed_software?: null | string;
  location_id?: null | number;
  // Memory specifications
  memory_manufacturer?: null | string;

  memory_size_gb?: null | number;
  memory_type?: null | string;
  model?: null | string;
  // OS specifications
  os_name?: null | string;
  os_patch_status?: null | string;

  os_version?: null | string;
  overall_score?: null | number;
  ports_audiojack?: null | number;
  ports_displayport?: null | number;
  ports_ethernet?: null | number;
  ports_hdmi?: null | number;
  ports_sdcard?: null | number;
  ports_thunderbolt?: null | number;
  // Ports
  ports_usb_a?: null | number;

  ports_usb_c?: null | number;
  ports_vga?: null | number;
  purchase_date?: null | string;
  ramco_id?: null | string;

  register_number?: null | string;
  remarks?: null | string;
  // Storage specifications
  storage_manufacturer?: null | string;
  storage_size_gb?: null | number;
  storage_type?: null | string;
  technician?: null | string;
  updated_at?: null | string;

  vpn_installed?: null | string;

  vpn_setup_type?: null | string;
  vpn_username?: null | string;
}

export const getComputerAssessments = async (filters?: {
  assessment_year?: string;
  asset_id?: number;
  ramco_id?: string;
  technician?: string;
}): Promise<ComputerAssessment[]> => {
  let query = `SELECT * FROM ${computerAssessmentTable}`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (filters?.asset_id) {
    conditions.push('asset_id = ?');
    params.push(filters.asset_id);
  }
  if (filters?.assessment_year) {
    conditions.push('assessment_year = ?');
    params.push(filters.assessment_year);
  }
  if (filters?.technician) {
    conditions.push('technician = ?');
    params.push(filters.technician);
  }
  if (filters?.ramco_id) {
    conditions.push('ramco_id = ?');
    params.push(filters.ramco_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY id DESC`;
  const [rows] = await pool2.query(query, params);
  return rows as ComputerAssessment[];
};

export const getComputerAssessmentById = async (id: number): Promise<ComputerAssessment | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${computerAssessmentTable} WHERE id = ?`, [id]);
  const data = rows as ComputerAssessment[];
  return data.length > 0 ? data[0] : null;
};

export const createComputerAssessment = async (data: Partial<ComputerAssessment>): Promise<number> => {
  const now = formatToMySQLDatetime(new Date());
  
  // Handle date formatting
  const assessmentDate = data.assessment_date ? formatToDateOnly(data.assessment_date) : null;
  const purchaseDate = data.purchase_date ? formatToDateOnly(data.purchase_date) : null;

  // Handle display_interfaces (convert array to JSON string if needed)
  let displayInterfaces = data.display_interfaces;
  if (Array.isArray(displayInterfaces)) {
    displayInterfaces = JSON.stringify(displayInterfaces);
  }

  const payload = {
    ...data,
    assessment_date: assessmentDate,
    created_at: now,
    display_interfaces: displayInterfaces,
    purchase_date: purchaseDate,
    updated_at: now,
  } as any;

  const [result] = await pool2.query(`INSERT INTO ${computerAssessmentTable} SET ?`, [payload]);
  return (result as ResultSetHeader).insertId;
};

export const updateComputerAssessment = async (id: number, data: Partial<ComputerAssessment>): Promise<void> => {
  // Handle date formatting
  if ('assessment_date' in data && data.assessment_date) {
    (data as any).assessment_date = formatToDateOnly(data.assessment_date);
  }
  if ('purchase_date' in data && data.purchase_date) {
    (data as any).purchase_date = formatToDateOnly(data.purchase_date);
  }

  // Handle display_interfaces (convert array to JSON string if needed)
  if ('display_interfaces' in data && Array.isArray(data.display_interfaces)) {
    (data as any).display_interfaces = JSON.stringify(data.display_interfaces);
  }

  const payload: any = { ...data };
  payload.updated_at = formatToMySQLDatetime(new Date());

  const fields = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const values = Object.values(payload).map(v => v === undefined ? null : v);

  if (fields) {
    await pool2.query(`UPDATE ${computerAssessmentTable} SET ${fields} WHERE id = ?`, [...values, id]);
  }
};

export const deleteComputerAssessment = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${computerAssessmentTable} WHERE id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Computer assessment not found');
};
