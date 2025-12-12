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
			return res.status(400).json({ data: null, message: 'Invalid date format. Use YYYY-MM-DD', status: 'error' });
		}

		const jobs = await jobbankModel.getJobRepos({ from, limit, offset, to });
		return res.status(200).json({ data: jobs, message: 'Jobs retrieved', status: 'success' });
	} catch (error: any) {
		console.error('getAllJobs error', error);
		return res.status(500).json({ data: null, message: 'Error retrieving jobs', status: 'error' });
	}
};

export const getJobReposById = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid job id', status: 'error' });
		const job = await jobbankModel.getJobReposById(id);
		if (!job) return res.status(404).json({ data: null, message: 'Job not found', status: 'error' });
		return res.status(200).json({ data: job, message: 'Job retrieved', status: 'success' });
	} catch (error: any) {
		console.error('getJob error', error);
		return res.status(500).json({ data: null, message: 'Error retrieving job', status: 'error' });
	}
};

export const createJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const payload = req.body;
		if (!payload?.title) return res.status(400).json({ data: null, message: 'Missing title', status: 'error' });
		const insertId = await jobbankModel.createJobRepos(payload);
		const job = await jobbankModel.getJobReposById(insertId);
		return res.status(201).json({ data: job, message: 'Job created', status: 'success' });
	} catch (error: any) {
		console.error('createJob error', error);
		return res.status(500).json({ data: null, message: error.message || 'Error creating job', status: 'error' });
	}
};

export const updateJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid job id', status: 'error' });
		const payload = req.body;
		await jobbankModel.updateReposJob(id, payload);
		const job = await jobbankModel.getJobReposById(id);
		return res.status(200).json({ data: job, message: 'Job updated', status: 'success' });
	} catch (error: any) {
		console.error('updateJob error', error);
		return res.status(500).json({ data: null, message: error.message || 'Error updating job', status: 'error' });
	}
};

export const deleteJobRepos = async (req: Request, res: Response): Promise<Response> => {
	try {
		const id = Number(req.params.id);
		if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid job id', status: 'error' });
		await jobbankModel.deleteReposJob(id);
		return res.status(200).json({ data: null, message: 'Job deleted', status: 'success' });
	} catch (error: any) {
		console.error('deleteJob error', error);
		return res.status(500).json({ data: null, message: error.message || 'Error deleting job', status: 'error' });
	}
};

