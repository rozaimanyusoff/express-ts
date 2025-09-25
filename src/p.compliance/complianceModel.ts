import { pool, pool2 } from '../utils/db';
import { ResultSetHeader } from 'mysql2';

const dbName = 'compliance2';
const summonTable = `${dbName}.summon`;
const summonTypeTable = `${dbName}.summon_type`;
const summonAgencyTable = `${dbName}.summon_agency`;
const summonTypeAgencyTable = `${dbName}.summon_type_agency`;

const assessmentCriteriaTable = `${dbName}.test_v_assess_qset`;
const assessmentTable = `${dbName}.test_v_assess2`;
const assessmentDetailTable = `${dbName}.test_v_assess_dt2`; // linked to v_assess2 via assess_id


export interface SummonType {
  id?: number;
  name?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SummonAgency {
  id?: number;
  name?: string | null;
  code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SummonTypeAgency {
  id?: number;
  type_id?: number | null;
  agency_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Helper to format JS Date/ISO into MySQL DATETIME: 'YYYY-MM-DD HH:mm:ss'
const formatToMySQLDatetime = (input?: any): string | null => {
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

const fromParts = (dateStr?: string | null, timeStr?: string | null) => {
  if (!dateStr) return null;
  const datePart = String(dateStr).trim();
  const timePart = timeStr ? String(timeStr).trim() : '00:00:00';
  const combined = `${datePart}T${timePart}`;
  const d = new Date(combined);
  if (isNaN(d.getTime())) return null;
  return formatToMySQLDatetime(d);
};

// Normalize date-only to 'YYYY-MM-DD'
const formatToDateOnly = (input?: any): string | null => {
  if (!input) return null;
  const d = (input instanceof Date) ? input : new Date(String(input));
  if (isNaN(d.getTime())) return null;
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
};

// Normalize time-only to 'HH:MM:SS'
const formatToTimeOnly = (input?: any): string | null => {
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
  smn_id?: number;
  id?: number; // optional alias for compatibility
  vehicle_id?: number | null;
  asset_id?: number | null;
  entry_code?: string | null;
  reg_no?: string | null;
  summon_no?: string | null;
  myeg_date?: string | null;
  summon_date?: string | null;
  summon_time?: string | null;
  ramco_id?: string | null;
  f_name?: string | null;
  v_email?: string | null;
  summon_loc?: string | null;
  type_of_summon?: string | null;
  summon_amt?: string | null;
  summon_upl?: string | null;
  receipt_date?: string | null;
  summon_stat?: string | null;
  summon_agency?: string | null;
  summon_receipt?: string | null;
  emailStat?: number | null;
  notice?: string | null;
  notice_date?: string | null;
  summon_dt?: string | null;
  running_no?: number | null;
  attachment_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const getSummons = async (): Promise<SummonRecord[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTable} ORDER BY smn_id DESC`);
  return rows as SummonRecord[];
};

export const getSummonTypeAgencies = async (): Promise<SummonTypeAgency[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} ORDER BY id DESC`);
  return rows as SummonTypeAgency[];
};

export const getSummonTypeAgencyById = async (id: number): Promise<SummonTypeAgency | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTypeAgencyTable} WHERE id = ?`, [id]);
  const data = rows as SummonTypeAgency[];
  return data.length > 0 ? data[0] : null;
};

export const getSummonTypeAgencyByPair = async (type_id: number, agency_id: number): Promise<SummonTypeAgency | null> => {
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

export const getSummonTypesWithAgencies = async (): Promise<Array<{ type: SummonType; agencies: SummonAgency[] }>> => {
  const types = await getSummonTypes();
  const allAgencies = await getSummonAgencies();
  // Build agency map for quick lookup
  const agencyMap = new Map<number, SummonAgency>();
  for (const a of allAgencies) if (a.id) agencyMap.set(a.id, a);

  const result: Array<{ type: SummonType; agencies: SummonAgency[] }> = [];
  for (const t of types) {
    const mappings = await getSummonTypeAgenciesByType(Number(t.id));
    const agencies: SummonAgency[] = [];
    for (const m of mappings) {
      const aid = Number(m.agency_id);
      if (agencyMap.has(aid)) agencies.push(agencyMap.get(aid) as SummonAgency);
    }
    result.push({ type: t, agencies });
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

export const getSummonTypeById = async (id: number): Promise<SummonType | null> => {
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

export const getSummonById = async (id: number): Promise<SummonRecord | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTable} WHERE smn_id = ?`, [id]);
  const data = rows as SummonRecord[];
  return data.length > 0 ? data[0] : null;
};

export const getSummonAgencies = async (): Promise<SummonAgency[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonAgencyTable} ORDER BY id DESC`);
  return rows as SummonAgency[];
};

export const getSummonAgencyById = async (id: number): Promise<SummonAgency | null> => {
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

export const updateSummon = async (id: number, data: Partial<Omit<SummonRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
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
  qset_id?: number;
  q_id?: number;
  qset_quesno?: number;
  qset_desc?: string;
  qset_stat?: string;
  qset_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export const getAssessmentCriteria = async (): Promise<AssessmentCriteria[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${assessmentCriteriaTable} ORDER BY qset_id DESC`);
  return rows as AssessmentCriteria[];
};

/* ========== ASSESSMENTS (parent) ========== */
export interface AssessmentRecord {
  assess_id?: number;
  asset_id?: number | null;
  a_date?: string | null;
  a_loc?: string | null;
  loc_id?: number | null;
  a_ncr?: number | null;
  a_rate?: string | null;
  a_upload?: string | null;
  a_upload2?: string | null;
  a_upload3?: string | null;
  a_upload4?: string | null;
  a_remark?: string | null;
  a_dt?: string | null;
  ownership?: number | null;
}

export const getAssessments = async (year?: number): Promise<AssessmentRecord[]> => {
  let query = `SELECT * FROM ${assessmentTable}`;
  const params: any[] = [];
  
  if (year) {
    query += ` WHERE YEAR(a_date) = ? OR (a_date IS NULL AND YEAR(a_dt) = ?)`;
    params.push(year, year);
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
  const [result] = await pool2.query(`DELETE FROM ${assessmentTable} WHERE assess_id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Assessment not found');
};

/* ========== ASSESSMENT DETAILS (child) ========== */
export interface AssessmentDetailRecord {
  adt_id?: number;
  assess_id?: number;
  vehicle_id?: number | null;
  adt_item?: string | null;
  adt_ncr?: number | null;
  adt_rate?: string | null;
  adt_rate2?: number | null;
  adt_rem?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
    const maxOrder = (Array.isArray(maxRows) && (maxRows as any[])[0] && (maxRows as any[])[0].maxOrder) ? Number((maxRows as any[])[0].maxOrder) : currentOrder;

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
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
};
