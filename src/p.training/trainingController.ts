// src/p.training/trainingController.ts
import { Request, Response } from 'express';
import * as trainingModel from './trainingModel';
import dayjs from 'dayjs';
import { toPublicUrl, toDbPath, sanitizeFilename } from '../utils/uploadUtil';
import type { TrainingEvent } from './trainingModel';
import * as assetModel from '../p.asset/assetModel';
import { promises as fsPromises } from 'fs';

// Note: HTML entity decoding for courses is handled in trainingModel

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
      return res.json({ status: 'success', message: `${data.length} training events fetched successfully`, data });
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
         if (Array.isArray(rawParts) && rawParts.length > 0) {
            // Batch fetch all required data
            const ramcoIds = Array.from(new Set(rawParts.map(p => String(p.participant || '').trim()).filter(s => s.length > 0)));

            let employeeMap = new Map<string, any>();
            let departmentMap = new Map<number, any>();
            let positionMap = new Map<number, any>();
            let locationMap = new Map<number, any>();

            // Fetch all employees
            try {
               const employees = await assetModel.getEmployees();
               if (Array.isArray(employees)) {
                  employeeMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
               }
            } catch { /* ignore */ }

            // Fetch positions
            try {
               const positions = await assetModel.getPositions?.();
               if (Array.isArray(positions)) {
                  positionMap = new Map((positions as any[]).map((pos: any) => [Number(pos.id), pos]));
               }
            } catch { /* ignore */ }

            // Fetch departments
            try {
               const departments = await assetModel.getDepartments?.();
               if (Array.isArray(departments)) {
                  departmentMap = new Map((departments as any[]).map((d: any) => [Number(d.id), d]));
               }
            } catch { /* ignore */ }

            // Fetch locations
            try {
               const locations = await assetModel.getLocations?.();
               if (Array.isArray(locations)) {
                  locationMap = new Map((locations as any[]).map((l: any) => [Number(l.id), l]));
               }
            } catch { /* ignore */ }

            // Build enriched participants
            participants = rawParts.map((p: any) => {
               const ramco = p?.participant ? String(p.participant) : '';
               const emp = employeeMap.get(ramco);

               let participantObj: any = { ramco_id: ramco, full_name: emp?.full_name ?? null };
               if (emp?.position_id) {
                  const pos = positionMap.get(Number(emp.position_id));
                  if (pos) participantObj.position = { id: pos.id, name: pos.name || pos.position_name };
               }
               if (emp?.department_id) {
                  const dept = departmentMap.get(Number(emp.department_id));
                  if (dept) participantObj.department = { id: dept.id, name: dept.name };
               }
               if (emp?.location_id) {
                  const loc = locationMap.get(Number(emp.location_id));
                  if (loc) participantObj.location = { id: loc.id, name: loc.name };
               }

               return {
                  participant_id: Number(p.participant_id ?? 0),
                  participant: participantObj
               };
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

      // Validation
      const requiredFields = ['course_title', 'course_id', 'sdate', 'edate', 'venue'];
      const missingFields = requiredFields.filter(f => !payload[f]);
      if (missingFields.length > 0) {
         return res.status(400).json({
            status: 'error',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            data: null
         });
      }

      // Validate session if provided
      if (payload.session && !['morning', 'afternoon', 'fullday'].includes(payload.session)) {
         return res.status(400).json({
            status: 'error',
            message: 'Invalid session. Must be one of: morning, afternoon, fullday',
            data: null
         });
      }

      // Validate training_count matches participants array if provided
      const participants = Array.isArray(payload.participants) ? payload.participants : [];
      if (payload.training_count && participants.length !== Number(payload.training_count)) {
         return res.status(400).json({
            status: 'error',
            message: `training_count (${payload.training_count}) does not match participants array length (${participants.length})`,
            data: null
         });
      }

      // Extract fields for training_events table (exclude nested arrays and validation-only fields)
      const trainingData = {
         course_title: payload.course_title,
         course_id: payload.course_id,
         series: payload.series ?? null,
         session: payload.session ?? null,
         sdate: payload.sdate,
         edate: payload.edate,
         hrs: payload.hrs ?? null,
         days: payload.days ?? null,
         venue: payload.venue,
         training_count: payload.training_count ?? 0,
         seat: payload.seat ?? null,
         event_cost: payload.event_cost ?? null
      };

      // Create training event
      const trainingResult: any = await trainingModel.createTraining(trainingData);
      const trainingId = trainingResult?.insertId;

      if (!trainingId) {
         return res.status(500).json({
            status: 'error',
            message: 'Failed to create training event',
            data: null
         });
      }

      // Prepare costings with training_id foreign key
      const costingDetails = Array.isArray(payload.costing_details) ? payload.costing_details : [];
      const costingsToInsert = costingDetails.map((costing: any) => ({
         training_id: trainingId,
         ec_desc: costing.ec_desc,
         ec_amount: costing.ec_amount || costing.amount  // Support both field names
      }));

      // Prepare participants with training_id foreign key
      const participantsToInsert = participants.map((p: any) => ({
         training_id: trainingId,
         participant: p.participant
      }));

      // Insert costings and participants (allow partial success)
      const costingResult = await trainingModel.createMultipleCostings(costingsToInsert);
      const participantResult = await trainingModel.createMultipleParticipants(participantsToInsert);

      return res.json({
         status: 'success',
         message: 'Training created successfully',
         data: {
            training_id: trainingId,
            costing_count: costingResult.insertedCount,
            participant_count: participantResult.insertedCount
         }
      });
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
      const file = (req as any).file as Express.Multer.File | undefined;

      // Validation
      if (payload.session && !['morning', 'afternoon', 'fullday'].includes(payload.session)) {
         return res.status(400).json({
            status: 'error',
            message: 'Invalid session. Must be one of: morning, afternoon, fullday',
            data: null
         });
      }

      // Validate training_count matches participants array if provided
      const participants = Array.isArray(payload.participants) ? payload.participants : [];
      if (payload.training_count && participants.length > 0 && participants.length !== Number(payload.training_count)) {
         return res.status(400).json({
            status: 'error',
            message: `training_count (${payload.training_count}) does not match participants array length (${participants.length})`,
            data: null
         });
      }

      // Extract flat fields for training_events table (exclude nested arrays)
      const trainingData: any = {};
      const flatFields = ['course_title', 'course_id', 'series', 'session', 'sdate', 'edate', 'hrs', 'days', 'venue', 'training_count', 'seat', 'event_cost'];
      
      for (const field of flatFields) {
         if (payload.hasOwnProperty(field)) {
            trainingData[field] = payload[field] ?? null;
         }
      }

      // Handle file upload
      if (file) {
         try {
            const sanitized = sanitizeFilename(file.originalname);
            const dbPath = toDbPath(`trainings/${id}`, sanitized);
            trainingData.attendance_upload = dbPath;
         } catch (fileError) {
            return res.status(400).json({
               status: 'error',
               message: `File processing failed: ${(fileError as Error).message}`,
               data: null
            });
         }
      }

      // Update training event record
      const result: any = await trainingModel.updateTraining(id, trainingData);

      // Handle costings array if provided
      let costingResult = { deletedCount: 0, insertedCount: 0 };
      const costingDetails = Array.isArray(payload.costing_details) ? payload.costing_details : [];
      if (costingDetails.length > 0) {
         try {
            // Delete existing costings for this training
            const deleteResult: any = await trainingModel.deleteCostingsByTrainingId(id);
            costingResult.deletedCount = deleteResult?.affectedRows ?? 0;

            // Prepare and insert new costings
            const costingsToInsert = costingDetails.map((costing: any) => ({
               training_id: id,
               ec_desc: costing.ec_desc,
               ec_amount: costing.ec_amount || costing.amount
            }));

            const insertResult = await trainingModel.createMultipleCostings(costingsToInsert);
            costingResult.insertedCount = insertResult.insertedCount;
         } catch (costError) {
            console.error('Error updating costings:', costError);
            // Don't fail the entire update if costings fail
         }
      }

      // Handle participants array if provided
      let participantResult = { deletedCount: 0, insertedCount: 0 };
      if (participants.length > 0) {
         try {
            // Delete existing participants for this training
            const deleteResult: any = await trainingModel.deleteParticipantsByTrainingId(id);
            participantResult.deletedCount = deleteResult?.affectedRows ?? 0;

            // Prepare and insert new participants
            const participantsToInsert = participants.map((p: any) => ({
               training_id: id,
               participant: p.participant
            }));

            const insertResult = await trainingModel.createMultipleParticipants(participantsToInsert);
            participantResult.insertedCount = insertResult.insertedCount;
         } catch (partError) {
            console.error('Error updating participants:', partError);
            // Don't fail the entire update if participants fail
         }
      }

      return res.json({
         status: 'success',
         message: 'Training updated successfully',
         data: {
            training_id: id,
            event_updated: result?.affectedRows > 0,
            costing_deleted: costingResult.deletedCount,
            costing_inserted: costingResult.insertedCount,
            participant_deleted: participantResult.deletedCount,
            participant_inserted: participantResult.insertedCount,
            file_uploaded: !!file
         }
      });
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

// Helper: decode HTML entities
const decodeHtmlEntities = (str: string): string => {
   if (!str || typeof str !== 'string') return str as any;
   const namedMap: Record<string, string> = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#34;': '"',
      '&#39;': "'", '&apos;': "'", '&nbsp;': ' '
   };
   let out = str.replace(/&(amp|lt|gt|quot|apos|nbsp);|&#(?:34|39);/g, (m) => namedMap[m] ?? m);
   out = out.replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
   });
   out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
   });
   return out;
};

/* ======== Participants ======== */
export const getParticipants = async (req: Request, res: Response) => {
   try {
      const trainingIdQ = req.query?.training_id;
      const ramcoQ = typeof req.query?.ramco === 'string' ? String(req.query.ramco).trim() : undefined;
      const yearParam = typeof req.query?.year === 'string' ? Number(req.query.year) : (Array.isArray(req.query?.year) ? Number(req.query.year[0]) : undefined);
      const year = Number.isFinite(yearParam as number) ? Math.floor(yearParam as number) : undefined;

      // Fetch all participants
      const rows = trainingIdQ ? await trainingModel.getParticipantsByTrainingId(Number(trainingIdQ)) : await trainingModel.getParticipants();
      let filteredRows = ramcoQ ? (rows as any[]).filter(r => String(r.participant || '').trim() === ramcoQ) : (rows as any[]);

      // Batch fetch: collect all unique training IDs and ramco IDs
      const trainingIds = Array.from(new Set(
         filteredRows.map(r => Number(r.training_id ?? 0)).filter(n => Number.isFinite(n) && n > 0)
      ));
      const ramcoIds = Array.from(new Set(
         filteredRows.map(r => String(r.participant || '').trim()).filter(s => s.length > 0)
      ));

      // Fetch all trainings at once
      let trainingMap = new Map<number, TrainingEvent>();
      if (trainingIds.length > 0) {
         try {
            const trainings = await Promise.all(trainingIds.map(id => trainingModel.getTrainingById(id)));
            trainings.forEach(tr => {
               if (tr) {
                  const event = mapRowToTrainingEvent(tr);
                  trainingMap.set(Number(tr.training_id), event);
               }
            });
         } catch { /* ignore */ }
      }

      // Filter by year if provided (filter based on training sdate)
      if (Number.isFinite(year)) {
         filteredRows = filteredRows.filter(p => {
            const trainId = Number(p.training_id ?? 0);
            const training = trainingMap.get(trainId);
            if (!training || !training.sdate) return false;
            const trainingYear = dayjs(training.sdate, 'D/M/YYYY h:mm A').year();
            return trainingYear === year;
         });
      }

      // Fetch all employees, departments, positions, and locations at once
      let employeeMap = new Map<string, any>();
      let departmentMap = new Map<number, any>();
      let positionMap = new Map<number, any>();
      let locationMap = new Map<number, any>();

      if (ramcoIds.length > 0) {
         try {
            const employees = await assetModel.getEmployees();
            if (Array.isArray(employees)) {
               employeeMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
            }
         } catch { /* ignore */ }
      }

      try {
         const departments = await assetModel.getDepartments?.();
         if (Array.isArray(departments)) {
            departmentMap = new Map(departments.map((d: any) => [Number(d.id), d]));
         }
      } catch { /* ignore */ }

      try {
         const positions = await assetModel.getPositions?.();
         if (Array.isArray(positions)) {
            positionMap = new Map(positions.map((pos: any) => [Number(pos.id), pos]));
         }
      } catch { /* ignore */ }

      try {
         const locations = await assetModel.getLocations?.();
         if (Array.isArray(locations)) {
            locationMap = new Map(locations.map((l: any) => [Number(l.id), l]));
         }
      } catch { /* ignore */ }

      // Build response by mapping cached data (no per-row awaits)
      const data = filteredRows.map(p => {
         const ramco = p?.participant ? String(p.participant) : '';
         const emp = employeeMap.get(ramco);
         const trainId = Number(p.training_id ?? 0);
         const ev = trainingMap.get(trainId);

         // Build participant object with position, department, and location
         let participantObj: any = { ramco_id: ramco, full_name: emp?.full_name ?? null };
         if (emp?.position_id) {
            const pos = positionMap.get(Number(emp.position_id));
            if (pos) participantObj.position = { id: pos.id, name: pos.name || pos.position_name };
         }
         if (emp?.department_id) {
            const dept = departmentMap.get(Number(emp.department_id));
            if (dept) participantObj.department = { id: dept.id, name: dept.name };
         }
         if (emp?.location_id) {
            const loc = locationMap.get(Number(emp.location_id));
            if (loc) participantObj.location = { id: loc.id, name: loc.name };
         }

         return {
            participant_id: Number(p.participant_id ?? 0),
            participant: participantObj,
            training_details: {
               training_id: trainId,
               start_date: ev?.sdate,
               end_date: ev?.edate,
               course_title: ev?.course_title ?? null,
               hrs: ev?.hrs ?? null,
               days: ev?.days ?? null,
               venue: ev?.venue ? decodeHtmlEntities(ev.venue) : null,
               attendance_upload: ev?.attendance_upload ?? null
            },
         };
      });

      return res.json({ status: 'success', message: `${data.length} entries fetched`, data });
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

      // Enrich with employee, training, position, department, location data
      const ramco = item?.participant ? String(item.participant) : '';
      let emp: any = null;
      let training: any = null;
      let positionObj: any = null;
      let departmentObj: any = null;
      let locationObj: any = null;

      if (ramco) {
         try {
            const employees = await assetModel.getEmployees();
            if (Array.isArray(employees)) {
               emp = employees.find((e: any) => String(e.ramco_id) === ramco);
            }
         } catch { /* ignore */ }
      }

      if (emp?.position_id) {
         try {
            const positions = await assetModel.getPositions?.();
            if (Array.isArray(positions)) {
               const pos = (positions as any[]).find((p: any) => Number(p.id) === Number(emp.position_id));
               if (pos) positionObj = { id: pos.id, name: pos.name || pos.position_name };
            }
         } catch { /* ignore */ }
      }

      if (emp?.department_id) {
         try {
            const departments = await assetModel.getDepartments?.();
            if (Array.isArray(departments)) {
               const dept = (departments as any[]).find((d: any) => Number(d.id) === Number(emp.department_id));
               if (dept) departmentObj = { id: dept.id, code: dept.code, name: dept.name };
            }
         } catch { /* ignore */ }
      }

      if (emp?.location_id) {
         try {
            const locations = await assetModel.getLocations?.();
            if (Array.isArray(locations)) {
               const loc = (locations as any[]).find((l: any) => Number(l.id) === Number(emp.location_id));
               if (loc) locationObj = { id: loc.id, name: loc.name, code: loc.code };
            }
         } catch { /* ignore */ }
      }

      const trainId = Number(item.training_id ?? 0);
      if (Number.isFinite(trainId) && trainId > 0) {
         try {
            const tr = await trainingModel.getTrainingById(trainId);
            if (tr) training = mapRowToTrainingEvent(tr);
         } catch { /* ignore */ }
      }

      const enriched = {
         participant_id: Number(item.participant_id ?? 0),
         training_id: trainId,
         participant: {
            ramco_id: ramco,
            full_name: emp?.full_name ?? null,
            position: positionObj,
            department: departmentObj,
            location: locationObj
         },
         training_details: training ? {
            training_id: trainId,
            start_date: training.sdate,
            end_date: training.edate,
            course_title: training.course_title ?? null,
            hrs: training.hrs ?? null,
            days: training.days ?? null,
            venue: training.venue ? decodeHtmlEntities(training.venue) : null,
            attendance_upload: training.attendance_upload ?? null
         } : null,
         attendance: item.attendance ?? null
      };

      return res.json({ status: 'success', message: 'Participant fetched', data: enriched });
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
