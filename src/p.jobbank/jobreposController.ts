// src/p.jobbank/jobbankController.ts
import { Request, Response } from 'express';
import * as jobbankModel from './jobreposModel';

/* ============== JOBS MANAGEMENT =============== */

export const getAllJobRepos = async (_req: Request, res: Response): Promise<Response> => {
	try {
		const q = _req.query || {};
		const from = typeof q.from === 'string' ? q.from.trim() : undefined;
		const to = typeof q.to === 'string' ? q.to.trim() : undefined;
		const limit = q.limit ? Number(q.limit) : undefined;
		const offset = q.offset ? Number(q.offset) : undefined;

		// Basic validation for dates (YYYY-MM-DD or ISO) - permissive: let DB handle strict formats
		const isValidDate = (s?: string) => !s || /^\d{4}-\d{2}-\d{2}/.test(s);
		if (!isValidDate(from) || !isValidDate(to)) {
			return res.status(400).json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD', data: null });
		}

		const jobs = await jobbankModel.getJobRepos({ from, to, limit, offset });
		return res.status(200).json({ status: 'success', message: 'Jobs retrieved', data: jobs });
	} catch (error: any) {
		console.error('getAllJobs error', error);
		return res.status(500).json({ status: 'error', message: 'Error retrieving jobs', data: null });
	}
};

export const getJobReposById = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid job id', data: null });
		const job = await jobbankModel.getJobReposById(id);
		if (!job) return res.status(404).json({ status: 'error', message: 'Job not found', data: null });
		return res.status(200).json({ status: 'success', message: 'Job retrieved', data: job });
	} catch (error: any) {
		console.error('getJob error', error);
		return res.status(500).json({ status: 'error', message: 'Error retrieving job', data: null });
	}
};

export const createJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const payload = req.body;
		if (!payload || !payload.title) return res.status(400).json({ status: 'error', message: 'Missing title', data: null });
		const insertId = await jobbankModel.createJobRepos(payload);
		const job = await jobbankModel.getJobReposById(insertId);
		return res.status(201).json({ status: 'success', message: 'Job created', data: job });
	} catch (error: any) {
		console.error('createJob error', error);
		return res.status(500).json({ status: 'error', message: error.message || 'Error creating job', data: null });
	}
};

export const updateJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid job id', data: null });
		const payload = req.body;
		await jobbankModel.updateReposJob(id, payload);
		const job = await jobbankModel.getJobReposById(id);
		return res.status(200).json({ status: 'success', message: 'Job updated', data: job });
	} catch (error: any) {
		console.error('updateJob error', error);
		return res.status(500).json({ status: 'error', message: error.message || 'Error updating job', data: null });
	}
};

export const deleteJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid job id', data: null });
		await jobbankModel.deleteReposJob(id);
		return res.status(200).json({ status: 'success', message: 'Job deleted', data: null });
	} catch (error: any) {
		console.error('deleteJob error', error);
		return res.status(500).json({ status: 'error', message: error.message || 'Error deleting job', data: null });
	}
};

