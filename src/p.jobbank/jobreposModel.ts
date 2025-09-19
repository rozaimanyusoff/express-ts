import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Database and table declarations
const dbJobbank = 'j8_jms';
const jobsTable = `${dbJobbank}.job_banks`;

// Job interface - adapt fields to your actual schema if different
export interface JobRepos {
	bank_id?: number;
	pr_id?: string;
	pr_job_date?: string | null;
	user_id?: number;
	created_by?: number;
	district_id?: number;
	dma?: string | null;
	team_id?: number;
	alc_job_id?: string | null;
	alc_job_date?: string | null;
	addr_full?: string | null;
	addr_geo?: string | null;
	case_cat?: number;
	job_code?: number;
	job_rl?: number;
	pipe_size?: number;
	leak_cat?: string | null;
	backhoe?: string | null;
	leak_loc?: number;
	comments?: string | null;
	images?: string | null;
	rs_action_date?: string | null;
	rs_id?: number | null;
	wp_rej_comment?: string | null;
	wp_action_date?: string | null;
	wp_id?: number | null;
	wp_submit_date?: string | null;
	jms_id?: number | null;
	job_id?: string | null;
	bank_status?: number | null;
	timestamp?: string | null;
	found_by?: string | null;
}

export interface JobsQueryOptions {
	from?: string; // pr_job_date >= from
	to?: string;   // pr_job_date <= to
	limit?: number;
	offset?: number;
}

export const getJobRepos = async (opts: JobsQueryOptions = {}): Promise<JobRepos[]> => {
	const { from, to } = opts;
	const hasLimit = typeof opts.limit === 'number' && opts.limit > 0;
	const limit = hasLimit ? opts.limit as number : undefined;
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

export const createJobRepos = async (data: Omit<JobRepos, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
	const { title, description, company, location, job_type, salary, status } = data as any;
	const [result] = await pool.query(
		`INSERT INTO ${jobsTable} (title, description, company, location, job_type, salary, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
		[title, description, company, location, job_type, salary, status]
	);
	return (result as ResultSetHeader).insertId;
};

export const updateReposJob = async (id: number, data: Partial<Omit<JobRepos, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
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
