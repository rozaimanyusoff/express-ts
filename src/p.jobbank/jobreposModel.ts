import { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool, pool2 } from '../utils/db';

// Database and table declarations
const dbJobbank = 'j8_jms';
const jobsTable = `${dbJobbank}.job_banks`;

// Job interface - adapt fields to your actual schema if different
export interface JobRepos {
	addr_full?: null | string;
	addr_geo?: null | string;
	alc_job_date?: null | string;
	alc_job_id?: null | string;
	backhoe?: null | string;
	bank_id?: number;
	bank_status?: null | number;
	case_cat?: number;
	comments?: null | string;
	created_by?: number;
	district_id?: number;
	dma?: null | string;
	found_by?: null | string;
	images?: null | string;
	jms_id?: null | number;
	job_code?: number;
	job_id?: null | string;
	job_rl?: number;
	leak_cat?: null | string;
	leak_loc?: number;
	pipe_size?: number;
	pr_id?: string;
	pr_job_date?: null | string;
	rs_action_date?: null | string;
	rs_id?: null | number;
	team_id?: number;
	timestamp?: null | string;
	user_id?: number;
	wp_action_date?: null | string;
	wp_id?: null | number;
	wp_rej_comment?: null | string;
	wp_submit_date?: null | string;
}

export interface JobsQueryOptions {
	from?: string; // pr_job_date >= from
	limit?: number;
	offset?: number;
	to?: string;   // pr_job_date <= to
}

export const getJobRepos = async (opts: JobsQueryOptions = {}): Promise<JobRepos[]> => {
	const { from, to } = opts;
	const hasLimit = typeof opts.limit === 'number' && opts.limit > 0;
	const limit = hasLimit ? opts.limit! : undefined;
	const offset = typeof opts.offset === 'number' && opts.offset >= 0 ? opts.offset : 0;

	const clauses: string[] = [];
	const params: any[] = [];

	if (from && to) {
		clauses.push(`pr_job_date BETWEEN ? AND ?`);
		params.push(from, to);
	} else if (from) {
		clauses.push(`pr_job_date >= ?`);
		params.push(from);
	} else if (to) {
		clauses.push(`pr_job_date <= ?`);
		params.push(to);
	}

	const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	let sql = `SELECT * FROM ${jobsTable} ${where} ORDER BY bank_id DESC`;

	if (hasLimit) {
		sql += ` LIMIT ? OFFSET ?`;
		params.push(limit, offset);
	}

	const [rows] = await pool.query(sql, params);
	return rows as JobRepos[];
};

export const getJobReposById = async (id: number): Promise<JobRepos | null> => {
	const [rows] = await pool.query(`SELECT * FROM ${jobsTable} WHERE bank_id = ? LIMIT 1`, [id]);
	const recs = rows as JobRepos[];
	return recs.length > 0 ? recs[0] : null;
};

export const createJobRepos = async (data: Omit<JobRepos, 'created_at' | 'id' | 'updated_at'>): Promise<number> => {
	const { company, description, job_type, location, salary, status, title } = data as any;
	const [result] = await pool.query(
		`INSERT INTO ${jobsTable} (title, description, company, location, job_type, salary, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
		[title, description, company, location, job_type, salary, status]
	);
	return (result as ResultSetHeader).insertId;
};

export const updateReposJob = async (id: number, data: Partial<Omit<JobRepos, 'created_at' | 'id' | 'updated_at'>>): Promise<void> => {
	const allowed = ['title', 'description', 'company', 'location', 'job_type', 'salary', 'status'];
	const keys = Object.keys(data).filter(k => allowed.includes(k));
	if (!keys.length) return;
	const fields = keys.map(k => `${k} = ?`).join(', ');
	const values = keys.map(k => (data as any)[k]);
	await pool.query(`UPDATE ${jobsTable} SET ${fields}, updated_at = NOW() WHERE bank_id = ?`, [...values, id]);
};

export const deleteReposJob = async (id: number): Promise<void> => {
	const [result] = await pool.query(`DELETE FROM ${jobsTable} WHERE bank_id = ?`, [id]);
	const rr = result as ResultSetHeader;
	if (rr.affectedRows === 0) throw new Error('Job not found');
};
