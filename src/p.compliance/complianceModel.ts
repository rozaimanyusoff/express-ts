import { pool, pool2 } from '../utils/db';
import { ResultSetHeader } from 'mysql2';

const dbName = 'assets';
const summonTable = `${dbName}.summon`;

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

export const getSummonById = async (id: number): Promise<SummonRecord | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${summonTable} WHERE smn_id = ?`, [id]);
  const data = rows as SummonRecord[];
  return data.length > 0 ? data[0] : null;
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
