// src/p.training/trainingController.ts
import { Request, Response } from 'express';
import * as trainingModel from './trainingModel';
import dayjs from 'dayjs';
import { toPublicUrl } from '../utils/uploadUtil';
import type { TrainingEvent } from './trainingModel';
import * as assetModel from '../p.asset/assetModel';

const formatDMY12h = (value: any): string | null => {
   if (!value) return null;
   const d = dayjs(value);
   if (!d.isValid()) return null;
   // d/m/yyyy h:m a
   return d.format('D/M/YYYY h:mm A');
};

const mapRowToTrainingEvent = (row: any): TrainingEvent => {
   const filename = row?.attendance_upload ? String(row.attendance_upload) : null;
   // Build full URL: BACKEND_URL/uploads/trainings/<filename>
   const attachmentUrl = filename ? toPublicUrl(`trainings/${filename}`) : null;

   return {
      training_id: Number(row?.training_id ?? 0),
      course_title: String(row?.course_title ?? ''),
      course_id: Number(row?.course_id ?? 0),
      series: row?.series ?? null,
      sdate: formatDMY12h(row?.sdate),
      edate: formatDMY12h(row?.edate),
      hrs: row?.hrs ?? null,
      days: row?.days ?? null,
      venue: row?.venue ?? null,
      training_count: Number(row?.training_count ?? 0),
      attendance: row?.attendance != null ? Number(row.attendance) : null,
      session: row?.session ?? null,
      seat: row?.seat != null ? Number(row.seat) : null,
      contents: row?.contents ?? null,
      event_cost: row?.event_cost ?? null,
      cost_trainer: row?.cost_trainer ?? null,
      cost_venue: row?.cost_venue ?? null,
      cost_lodging: row?.cost_lodging ?? null,
      cost_other: row?.cost_other ?? null,
      cost_total: row?.cost_total ?? null,
      attendance_upload: attachmentUrl,
   };
};

// List trainings
export const getTrainings = async (req: Request, res: Response) => {
   try {
      const yearParam = typeof req.query?.year === 'string' ? Number(req.query.year) : (Array.isArray(req.query?.year) ? Number(req.query.year[0]) : undefined);
      const year = Number.isFinite(yearParam as number) ? Math.floor(yearParam as number) : undefined;
      const rows = await trainingModel.getTrainings(year);
      const data = (rows as any[]).map(mapRowToTrainingEvent);
      return res.json({ status: 'success', message: 'Training events fetched successfully with total entries: ' + data.length, data });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

// Get single training by ID
export const getTrainingById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      }
      const row = await trainingModel.getTrainingById(id);
      if (!row) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
      const item = mapRowToTrainingEvent(row);
      // Fetch and enrich participants for this training event
      let participants: any[] = [];
      try {
         const rawParts = await trainingModel.getParticipantsByTrainingId(item.training_id);
         // Enrich each participant with employee details by ramco_id
         for (const p of rawParts) {
            const ramco = p?.participant ? String(p.participant) : '';
            let emp: any = null;
            if (ramco) {
               try { emp = await assetModel.getEmployeeByRamco(ramco); } catch { emp = null; }
            }
            participants.push({
               participant_id: Number(p.participant_id ?? 0),
               participants: emp ? { ramco_id: emp.ramco_id ?? ramco, full_name: emp.full_name ?? null } : { ramco_id: ramco, full_name: null },
               // participant-level hours preserved here for transparency
               training_details: {
                  training_id: Number(p.training_id ?? item.training_id),
                  course_title: item.course_title,
                  hrs: item.hrs,
                  days: item.days,
                  venue: item.venue,
                  attendance_upload: item.attendance_upload
               },
            });
         }
      } catch (_) { /* ignore */ }
      const attendanceCount = Array.isArray(participants) ? participants.length : 0;
      return res.json({ status: 'success', message: 'Training fetched', data: { ...item, attendance: attendanceCount, participants } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

// Create training
export const createTraining = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createTraining(payload);
      return res.json({ status: 'success', message: 'Training created', data: { insertId: result?.insertId } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

// Update training
export const updateTraining = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      }
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateTraining(id, payload);
      return res.json({ status: 'success', message: 'Training updated', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

// Delete training
export const deleteTraining = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      }
      const result: any = await trainingModel.deleteTraining(id);
      return res.json({ status: 'success', message: 'Training deleted', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

/* ======== Trainers ======== */
export const getTrainers = async (_req: Request, res: Response) => {
   try {
      const data = await trainingModel.getTrainers();
      return res.json({ status: 'success', message: 'Trainers fetched', data });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const getTrainerById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const item = await trainingModel.getTrainerById(id);
      if (!item) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
      return res.json({ status: 'success', message: 'Trainer fetched', data: item });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const createTrainer = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createTrainer(payload);
      return res.json({ status: 'success', message: 'Trainer created', data: { insertId: result?.insertId } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const updateTrainer = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateTrainer(id, payload);
      return res.json({ status: 'success', message: 'Trainer updated', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const deleteTrainer = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const result: any = await trainingModel.deleteTrainer(id);
      return res.json({ status: 'success', message: 'Trainer deleted', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

/* ======== Courses ======== */
export const getCourses = async (req: Request, res: Response) => {
   try {
      // Support ?q= or ?search= for autocomplete/search functionality
      const searchTerm = typeof req.query?.q === 'string' ? req.query.q : 
                        (typeof req.query?.search === 'string' ? req.query.search : undefined);
      
      const data = await trainingModel.getCourses(searchTerm);
      return res.json({ status: 'success', message: 'Courses fetched', data });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const getCourseById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const item = await trainingModel.getCourseById(id);
      if (!item) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
      return res.json({ status: 'success', message: 'Course fetched', data: item });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const createCourse = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createCourse(payload);
      return res.json({ status: 'success', message: 'Course created', data: { insertId: result?.insertId } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const updateCourse = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateCourse(id, payload);
      return res.json({ status: 'success', message: 'Course updated', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const deleteCourse = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const result: any = await trainingModel.deleteCourse(id);
      return res.json({ status: 'success', message: 'Course deleted', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

/* ======== Participants ======== */
export const getParticipants = async (req: Request, res: Response) => {
   try {
      const trainingIdQ = req.query?.training_id;
      const ramcoQ = typeof req.query?.ramco === 'string' ? String(req.query.ramco).trim() : undefined;

      const rows = trainingIdQ ? await trainingModel.getParticipantsByTrainingId(Number(trainingIdQ)) : await trainingModel.getParticipants();

      // Optional filter by ramco (participant)
      const filteredRows = ramcoQ ? (rows as any[]).filter(r => String(r.participant || '').trim() === ramcoQ) : (rows as any[]);

      // Cache training events by id to avoid repeated lookups
      const trainingCache = new Map<number, TrainingEvent>();

      const data: any[] = [];
      for (const p of filteredRows) {
         const ramco = p?.participant ? String(p.participant) : '';
         let emp: any = null;
         if (ramco) {
            try { emp = await assetModel.getEmployeeByRamco(ramco); } catch { emp = null; }
         }

         const trainId = Number(p.training_id ?? 0);
         let ev: TrainingEvent | undefined = undefined;
         if (Number.isFinite(trainId) && trainId > 0) {
            ev = trainingCache.get(trainId);
            if (!ev) {
               try {
                  const tr = await trainingModel.getTrainingById(trainId);
                  if (tr) {
                     ev = mapRowToTrainingEvent(tr);
                     trainingCache.set(trainId, ev);
                  }
               } catch { /* ignore */ }
            }
         }

         data.push({
            participant_id: Number(p.participant_id ?? 0),
            training_id: trainId,
            participant: emp ? { ramco_id: emp.ramco_id ?? ramco, full_name: emp.full_name ?? null } : { ramco_id: ramco, full_name: null },
            training_details: {
               training_id: trainId,
               date: ev?.sdate ? formatDMY12h(ev.sdate) : null,
               course_title: ev?.course_title ?? null,
               hrs: ev?.hrs ?? null,
               days: ev?.days ?? null,
               venue: ev?.venue ?? null,
               attendance_upload: ev?.attendance_upload ?? null
            },
            attendance: p.attendance ?? null,
         });
      }
      return res.json({ status: 'success', message: 'Participants fetched', data });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const getParticipantById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const item = await trainingModel.getParticipantById(id);
      if (!item) return res.status(404).json({ status: 'error', message: 'Not found', data: null });
      return res.json({ status: 'success', message: 'Participant fetched', data: item });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const createParticipant = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createParticipant(payload);
      return res.json({ status: 'success', message: 'Participant created', data: { insertId: result?.insertId } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const updateParticipant = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateParticipant(id, payload);
      return res.json({ status: 'success', message: 'Participant updated', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};

export const deleteParticipant = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
      const result: any = await trainingModel.deleteParticipant(id);
      return res.json({ status: 'success', message: 'Participant deleted', data: { affectedRows: result?.affectedRows } });
   } catch (error) {
      return res.status(500).json({ status: 'error', message: (error as Error).message ?? 'Unknown error', data: null });
   }
};
