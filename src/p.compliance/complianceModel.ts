import { pool, pool2 } from '../utils/db';
import { ResultSetHeader } from 'mysql2';

const dbName = 'assets';
const summonTable = `${dbName}.summon`;

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
  // Use INSERT ... SET ? to allow flexible fields matching the summons table schema
  const insertObj: any = { ...data, summon_dt: data.summon_dt || new Date().toISOString() };
  const [result] = await pool2.query(`INSERT INTO ${summonTable} SET ?`, [insertObj]);
  return (result as ResultSetHeader).insertId;
};

export const updateSummon = async (id: number, data: Partial<Omit<SummonRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  if (fields) {
    await pool2.query(`UPDATE ${summonTable} SET ${fields}, updated_at = NOW() WHERE smn_id = ?`, [...values, id]);
  }
};

export const deleteSummon = async (id: number): Promise<void> => {
  const [result] = await pool2.query(`DELETE FROM ${summonTable} WHERE smn_id = ?`, [id]);
  const r = result as ResultSetHeader;
  if (r.affectedRows === 0) throw new Error('Summon record not found');
};
