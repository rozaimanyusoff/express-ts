import { pool, pool2 } from '../utils/db';
import { ResultSetHeader } from 'mysql2';

const dbName = 'assets';
const summonTable = `${dbName}.summon_test`;

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

export const createSummon = async (data: Omit<SummonRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
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
    // assume datePart is already YYYY-MM-DD and timePart HH:mm:ss
    // validate by trying to build a Date
    const combined = `${datePart}T${timePart}`;
    const d = new Date(combined);
    if (isNaN(d.getTime())) return null;
    return formatToMySQLDatetime(d);
  };

  // Determine summon_dt: prefer explicit summon_date + summon_time, then provided summon_dt, otherwise now
  let summonDtFormatted: string | null = null;
  if (data.summon_date) {
    summonDtFormatted = fromParts(data.summon_date, data.summon_time || null) || formatToMySQLDatetime(new Date());
  } else if (data.summon_dt) {
    summonDtFormatted = formatToMySQLDatetime(data.summon_dt) || formatToMySQLDatetime(new Date());
  } else {
    summonDtFormatted = formatToMySQLDatetime(new Date());
  }

  const insertObj: any = { ...data };
  if (summonDtFormatted) insertObj.summon_dt = summonDtFormatted;
  const [result] = await pool2.query(`INSERT INTO ${summonTable} SET ?`, [insertObj]);
  return (result as ResultSetHeader).insertId;
};

export const updateSummon = async (id: number, data: Partial<Omit<SummonRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  // Ensure summon_dt (if provided or computable from summon_date + summon_time) is in MySQL DATETIME format
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

  if ('summon_date' in data && (data as any).summon_date) {
    (data as any).summon_dt = fromParts((data as any).summon_date, (data as any).summon_time) || formatToMySQLDatetime(new Date());
  } else if ('summon_dt' in data && (data as any).summon_dt) {
    (data as any).summon_dt = formatToMySQLDatetime((data as any).summon_dt) || undefined;
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
