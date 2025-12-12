import dayjs from 'dayjs';
// src/p.training/trainingController.ts
import { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';

import type { TrainingEvent } from './trainingModel';

import * as assetModel from '../p.asset/assetModel';
import { sanitizeFilename, toDbPath, toPublicUrl } from '../utils/uploadUtil';
import * as trainingModel from './trainingModel';

// Note: HTML entity decoding for courses is handled in trainingModel

const formatDMY12h = (value: any): null | string => {
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
      attendance: row?.attendance != null ? Number(row.attendance) : null,
      attendance_upload: attachmentUrl,
      contents: row?.contents ?? null,
      cost_lodging: row?.cost_lodging ?? null,
      cost_other: row?.cost_other ?? null,
      cost_total: row?.cost_total ?? null,
      cost_trainer: row?.cost_trainer ?? null,
      cost_venue: row?.cost_venue ?? null,
      course_id: Number(row?.course_id ?? 0),
      course_title: String(row?.course_title ?? ''),
      days: row?.days ?? null,
      edate: formatDMY12h(row?.edate),
      event_cost: row?.event_cost ?? null,
      hrs: row?.hrs ?? null,
      sdate: formatDMY12h(row?.sdate),
      seat: row?.seat != null ? Number(row.seat) : null,
      series: row?.series ?? null,
      session: row?.session ?? null,
      training_count: Number(row?.training_count ?? 0),
      training_id: Number(row?.training_id ?? 0),
      venue: row?.venue ?? null,
   };
};

// List trainings
export const getTrainings = async (req: Request, res: Response) => {
   try {
      const yearParam = typeof req.query.year === 'string' ? Number(req.query.year) : (Array.isArray(req.query.year) ? Number(req.query.year[0]) : undefined);
      const year = Number.isFinite(yearParam!) ? Math.floor(yearParam!) : undefined;
      const rows = await trainingModel.getTrainings(year);
      const data = (rows).map(mapRowToTrainingEvent);
      return res.json({ data, message: `${data.length} training events fetched successfully`, status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

// Get single training by ID
export const getTrainingById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      }
      const row = await trainingModel.getTrainingById(id);
      if (!row) return res.status(404).json({ data: null, message: 'Not found', status: 'error' });
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
               const positions = await assetModel.getPositions();
               if (Array.isArray(positions)) {
                  positionMap = new Map((positions as any[]).map((pos: any) => [Number(pos.id), pos]));
               }
            } catch { /* ignore */ }

            // Fetch departments
            try {
               const departments = await assetModel.getDepartments();
               if (Array.isArray(departments)) {
                  departmentMap = new Map((departments as any[]).map((d: any) => [Number(d.id), d]));
               }
            } catch { /* ignore */ }

            // Fetch locations
            try {
               const locations = await assetModel.getLocations();
               if (Array.isArray(locations)) {
                  locationMap = new Map((locations as any[]).map((l: any) => [Number(l.id), l]));
               }
            } catch { /* ignore */ }

            // Build enriched participants
            participants = rawParts.map((p: any) => {
               const ramco = p?.participant ? String(p.participant) : '';
               const emp = employeeMap.get(ramco);

               const participantObj: any = { full_name: emp?.full_name ?? null, ramco_id: ramco };
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
                  participant: participantObj,
                  participant_id: Number(p.participant_id ?? 0)
               };
            });
         }
      } catch (_) { /* ignore */ }

      const attendanceCount = Array.isArray(participants) ? participants.length : 0;
      return res.json({ data: { ...item, attendance: attendanceCount, participants }, message: 'Training fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
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
            data: null,
            message: `Missing required fields: ${missingFields.join(', ')}`,
            status: 'error'
         });
      }

      // Validate session if provided
      if (payload.session && !['afternoon', 'fullday', 'morning'].includes(payload.session)) {
         return res.status(400).json({
            data: null,
            message: 'Invalid session. Must be one of: morning, afternoon, fullday',
            status: 'error'
         });
      }

      // Validate training_count matches participants array if provided
      const participants = Array.isArray(payload.participants) ? payload.participants : [];
      if (payload.training_count && participants.length !== Number(payload.training_count)) {
         return res.status(400).json({
            data: null,
            message: `training_count (${payload.training_count}) does not match participants array length (${participants.length})`,
            status: 'error'
         });
      }

      // Extract fields for training_events table (exclude nested arrays and validation-only fields)
      const trainingData = {
         course_id: payload.course_id,
         course_title: payload.course_title,
         days: payload.days ?? null,
         edate: payload.edate,
         event_cost: payload.event_cost ?? null,
         hrs: payload.hrs ?? null,
         sdate: payload.sdate,
         seat: payload.seat ?? null,
         series: payload.series ?? null,
         session: payload.session ?? null,
         training_count: payload.training_count ?? 0,
         venue: payload.venue
      };

      // Create training event
      const trainingResult: any = await trainingModel.createTraining(trainingData);
      const trainingId = trainingResult?.insertId;

      if (!trainingId) {
         return res.status(500).json({
            data: null,
            message: 'Failed to create training event',
            status: 'error'
         });
      }

      // Prepare costings with training_id foreign key
      const costingDetails = Array.isArray(payload.costing_details) ? payload.costing_details : [];
      const costingsToInsert = costingDetails.map((costing: any) => ({
         ec_amount: costing.ec_amount || costing.amount,  // Support both field names
         ec_desc: costing.ec_desc,
         training_id: trainingId
      }));

      // Prepare participants with training_id foreign key
      const participantsToInsert = participants.map((p: any) => ({
         participant: p.participant,
         training_id: trainingId
      }));

      // Insert costings and participants (allow partial success)
      const costingResult = await trainingModel.createMultipleCostings(costingsToInsert);
      const participantResult = await trainingModel.createMultipleParticipants(participantsToInsert);

      return res.json({
         data: {
            costing_count: costingResult.insertedCount,
            participant_count: participantResult.insertedCount,
            training_id: trainingId
         },
         message: 'Training created successfully',
         status: 'success'
      });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

// Update training
export const updateTraining = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      }

      const payload = req.body ?? {};
      const file = (req as any).file as Express.Multer.File | undefined;

      // Validation
      if (payload.session && !['afternoon', 'fullday', 'morning'].includes(payload.session)) {
         return res.status(400).json({
            data: null,
            message: 'Invalid session. Must be one of: morning, afternoon, fullday',
            status: 'error'
         });
      }

      // Validate training_count matches participants array if provided
      const participants = Array.isArray(payload.participants) ? payload.participants : [];
      if (payload.training_count && participants.length > 0 && participants.length !== Number(payload.training_count)) {
         return res.status(400).json({
            data: null,
            message: `training_count (${payload.training_count}) does not match participants array length (${participants.length})`,
            status: 'error'
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
               data: null,
               message: `File processing failed: ${(fileError as Error).message}`,
               status: 'error'
            });
         }
      }

      // Update training event record
      const result: any = await trainingModel.updateTraining(id, trainingData);

      // Handle costings array if provided
      const costingResult = { deletedCount: 0, insertedCount: 0 };
      const costingDetails = Array.isArray(payload.costing_details) ? payload.costing_details : [];
      if (costingDetails.length > 0) {
         try {
            // Delete existing costings for this training
            const deleteResult: any = await trainingModel.deleteCostingsByTrainingId(id);
            costingResult.deletedCount = deleteResult?.affectedRows ?? 0;

            // Prepare and insert new costings
            const costingsToInsert = costingDetails.map((costing: any) => ({
               ec_amount: costing.ec_amount || costing.amount,
               ec_desc: costing.ec_desc,
               training_id: id
            }));

            const insertResult = await trainingModel.createMultipleCostings(costingsToInsert);
            costingResult.insertedCount = insertResult.insertedCount;
         } catch (costError) {
            console.error('Error updating costings:', costError);
            // Don't fail the entire update if costings fail
         }
      }

      // Handle participants array if provided
      const participantResult = { deletedCount: 0, insertedCount: 0 };
      if (participants.length > 0) {
         try {
            // Delete existing participants for this training
            const deleteResult: any = await trainingModel.deleteParticipantsByTrainingId(id);
            participantResult.deletedCount = deleteResult?.affectedRows ?? 0;

            // Prepare and insert new participants
            const participantsToInsert = participants.map((p: any) => ({
               participant: p.participant,
               training_id: id
            }));

            const insertResult = await trainingModel.createMultipleParticipants(participantsToInsert);
            participantResult.insertedCount = insertResult.insertedCount;
         } catch (partError) {
            console.error('Error updating participants:', partError);
            // Don't fail the entire update if participants fail
         }
      }

      return res.json({
         data: {
            costing_deleted: costingResult.deletedCount,
            costing_inserted: costingResult.insertedCount,
            event_updated: result?.affectedRows > 0,
            file_uploaded: !!file,
            participant_deleted: participantResult.deletedCount,
            participant_inserted: participantResult.insertedCount,
            training_id: id
         },
         message: 'Training updated successfully',
         status: 'success'
      });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

// Delete training
export const deleteTraining = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
         return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      }
      const result: any = await trainingModel.deleteTraining(id);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Training deleted', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

/* ======== Trainers ======== */
export const getTrainers = async (_req: Request, res: Response) => {
   try {
      const data = await trainingModel.getTrainers();
      return res.json({ data, message: 'Trainers fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const getTrainerById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const item = await trainingModel.getTrainerById(id);
      if (!item) return res.status(404).json({ data: null, message: 'Not found', status: 'error' });
      return res.json({ data: item, message: 'Trainer fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const createTrainer = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createTrainer(payload);
      return res.json({ data: { insertId: result?.insertId }, message: 'Trainer created', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const updateTrainer = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateTrainer(id, payload);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Trainer updated', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const deleteTrainer = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const result: any = await trainingModel.deleteTrainer(id);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Trainer deleted', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

/* ======== Courses ======== */
export const getCourses = async (req: Request, res: Response) => {
   try {
      // Support ?q= or ?search= for autocomplete/search functionality
      const searchTerm = typeof req.query.q === 'string' ? req.query.q :
         (typeof req.query.search === 'string' ? req.query.search : undefined);

      const data = await trainingModel.getCourses(searchTerm);
      return res.json({ data, message: 'Courses fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const getCourseById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const item = await trainingModel.getCourseById(id);
      if (!item) return res.status(404).json({ data: null, message: 'Not found', status: 'error' });
      return res.json({ data: item, message: 'Course fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const createCourse = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      
      // Extract costings array if present
      const { costings, ...courseData } = payload;
      
      // Validate required fields
      if (!courseData.course_title) {
         return res.status(400).json({ data: null, message: 'course_title is required', status: 'error' });
      }
      
      // Create course
      const result: any = await trainingModel.createCourse(courseData);
      const course_id = result?.insertId;
      
      if (!course_id) {
         return res.status(500).json({ data: null, message: 'Failed to create course', status: 'error' });
      }
      
      // Insert costings if provided
      let costingInsertCount = 0;
      if (Array.isArray(costings) && costings.length > 0) {
         const costingsWithCourseId = costings.map(c => ({
            cost: c.cost || null,
            cost_desc: c.cost_desc || null,
            course_id
         }));
         const costingResult = await trainingModel.createMultipleCourseCostings(costingsWithCourseId);
         costingInsertCount = costingResult?.affectedRows || 0;
      }
      
      return res.json({ 
         data: { 
            costing_inserted: costingInsertCount,
            course_id
         }, 
         message: 'Course created', 
         status: 'success' 
      });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const updateCourse = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      
      const payload = req.body ?? {};
      
      // Extract costings array if present
      const { costings, ...courseData } = payload;
      
      // Update course
      const result: any = await trainingModel.updateCourse(id, courseData);
      
      // Handle costings replacement if provided
      let costingDeleted = 0;
      let costingInserted = 0;
      
      if (Array.isArray(costings)) {
         // Delete existing costings
         const delResult = await trainingModel.deleteCourseCostingsByCourseId(id);
         costingDeleted = delResult?.affectedRows || 0;
         
         // Insert new costings
         if (costings.length > 0) {
            const costingsWithCourseId = costings.map(c => ({
               cost: c.cost || null,
               cost_desc: c.cost_desc || null,
               course_id: id
            }));
            const costingResult = await trainingModel.createMultipleCourseCostings(costingsWithCourseId);
            costingInserted = costingResult?.affectedRows || 0;
         }
      }
      
      return res.json({ 
         data: { 
            costing_deleted: costingDeleted,
            costing_inserted: costingInserted,
            course_id: id,
            course_updated: result?.affectedRows > 0
         }, 
         message: 'Course updated', 
         status: 'success' 
      });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const deleteCourse = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const result: any = await trainingModel.deleteCourse(id);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Course deleted', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

// Helper: decode HTML entities
const decodeHtmlEntities = (str: string): string => {
   if (!str || typeof str !== 'string') return str as any;
   const namedMap: Record<string, string> = {
      '&#34;': '"', '&#39;': "'", '&amp;': '&', '&apos;': "'", '&gt;': '>',
      '&lt;': '<', '&nbsp;': ' ', '&quot;': '"'
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
      const trainingIdQ = req.query.training_id;
      const ramcoQ = typeof req.query.ramco === 'string' ? String(req.query.ramco).trim() : undefined;
      const yearParam = typeof req.query.year === 'string' ? Number(req.query.year) : (Array.isArray(req.query.year) ? Number(req.query.year[0]) : undefined);
      const year = Number.isFinite(yearParam!) ? Math.floor(yearParam!) : undefined;
      const showAllParam = req.query.show_all === 'true' || req.query.show_all === '1';
      const statusFilter = typeof req.query.status === 'string' ? String(req.query.status).toLowerCase() : undefined;

      // Fetch all participants
      const rows = trainingIdQ ? await trainingModel.getParticipantsByTrainingId(Number(trainingIdQ)) : await trainingModel.getParticipants();
      let filteredRows = ramcoQ ? (rows).filter(r => String(r.participant || '').trim() === ramcoQ) : (rows);

      // Batch fetch: collect all unique training IDs
      const trainingIds = Array.from(new Set(
         filteredRows.map(r => Number(r.training_id ?? 0)).filter(n => Number.isFinite(n) && n > 0)
      ));

      // Fetch all trainings at once
      const trainingMap = new Map<number, TrainingEvent>();
      const trainingRawDateMap = new Map<number, any>(); // Store raw dates for year filtering
      if (trainingIds.length > 0) {
         try {
            const trainings = await Promise.all(trainingIds.map(id => trainingModel.getTrainingById(id)));
            trainings.forEach(tr => {
               if (tr) {
                  const event = mapRowToTrainingEvent(tr);
                  trainingMap.set(Number(tr.training_id), event);
                  // Store raw date for accurate year filtering
                  trainingRawDateMap.set(Number(tr.training_id), tr.sdate);
               }
            });
         } catch { /* ignore */ }
      }

      // Filter by year if provided (filter based on training sdate using raw date)
      if (Number.isFinite(year)) {
         filteredRows = filteredRows.filter(p => {
            const trainId = Number(p.training_id ?? 0);
            const rawDate = trainingRawDateMap.get(trainId);
            if (!rawDate) return false;
            const trainingYear = dayjs(rawDate).year();
            return trainingYear === year;
         });
      }

      // Fetch all employees, departments, positions, and locations
      const [employeesRaw, departments, positions, locations] = await Promise.all([
         assetModel.getEmployees(),
         assetModel.getDepartments().catch(() => []),
         assetModel.getPositions().catch(() => []),
         assetModel.getLocations().catch(() => [])
      ]);

      // Filter employees by employment_status if status=active is provided
      const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
      let filteredEmployees = employees;
      if (statusFilter === 'active') {
         filteredEmployees = employees.filter((e: any) => 
            String(e.employment_status || '').toLowerCase() === 'active'
         );
      }

      const employeeMap = new Map(filteredEmployees.map((e: any) => [String(e.ramco_id), e]));
      const departmentMap = new Map(Array.isArray(departments) ? departments.map((d: any) => [Number(d.id), d]) : []);
      const positionMap = new Map(Array.isArray(positions) ? positions.map((pos: any) => [Number(pos.id), pos]) : []);
      const locationMap = new Map(Array.isArray(locations) ? locations.map((l: any) => [Number(l.id), l]) : []);

      // Get unique ramco IDs from participants
      const participatedRamcoIds = new Set(
         filteredRows.map(r => String(r.participant || '').trim()).filter(s => s.length > 0)
      );

      // Group participants by ramco_id to avoid duplicates
      const participantsByRamco = new Map<string, any[]>();
      filteredRows.forEach(p => {
         const ramco = String(p.participant || '').trim();
         if (ramco) {
            if (!participantsByRamco.has(ramco)) {
               participantsByRamco.set(ramco, []);
            }
            participantsByRamco.get(ramco)!.push(p);
         }
      });

      // Build response for participants who attended training (unique per employee)
      const participantsWithTraining = Array.from(participantsByRamco.entries()).map(([ramco, participations]) => {
         const emp = employeeMap.get(ramco);
         
         // Build participant object with position, department, and location
         const participantObj: any = { full_name: emp?.full_name ?? null, ramco_id: ramco };
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

         // Calculate total training hours for this participant (sum all their trainings)
         const totalHours = participations.reduce((sum, pr) => {
            const tId = Number(pr.training_id ?? 0);
            const training = trainingMap.get(tId);
            const hrs = training?.hrs ? parseFloat(String(training.hrs)) : 0;
            return sum + (isNaN(hrs) ? 0 : hrs);
         }, 0);

         // Get all training details for this participant
         const trainingDetails = participations.map(p => {
            const trainId = Number(p.training_id ?? 0);
            const ev = trainingMap.get(trainId);
            return {
               attendance_upload: ev?.attendance_upload ?? null,
               course_title: ev?.course_title ?? null,
               days: ev?.days ?? null,
               end_date: ev?.edate,
               hrs: ev?.hrs ?? null,
               participant_id: Number(p.participant_id ?? 0),
               start_date: ev?.sdate,
               training_id: trainId,
               venue: ev?.venue ? decodeHtmlEntities(ev.venue) : null
            };
         });

         return {
            participant: participantObj,
            total_training_hours: totalHours.toFixed(2),
            training_details: trainingDetails,
            trainings_count: participations.length
         };
      });

      // If show_all=true, add employees who haven't participated
      let data: any[] = participantsWithTraining;
      if (showAllParam && Array.isArray(employees)) {
         const employeesWithNoTraining = employees
            .filter((emp: any) => {
               const ramco = String(emp.ramco_id || '').trim();
               return ramco.length > 0 && !participatedRamcoIds.has(ramco);
            })
            .map((emp: any) => {
               const participantObj: any = {
                  full_name: emp.full_name ?? null,
                  ramco_id: emp.ramco_id
               };

               if (emp.position_id) {
                  const pos = positionMap.get(Number(emp.position_id));
                  if (pos) participantObj.position = { id: pos.id, name: pos.name || pos.position_name };
               }
               if (emp.department_id) {
                  const dept = departmentMap.get(Number(emp.department_id));
                  if (dept) participantObj.department = { id: dept.id, name: dept.name };
               }
               if (emp.location_id) {
                  const loc = locationMap.get(Number(emp.location_id));
                  if (loc) participantObj.location = { id: loc.id, name: loc.name };
               }

               return {
                  participant: participantObj,
                  total_training_hours: "0.00",
                  training_details: [],
                  trainings_count: 0
               };
            });

         data = [...participantsWithTraining, ...employeesWithNoTraining];
      }

      const message = showAllParam 
         ? `${participantsWithTraining.length} participated, ${data.length - participantsWithTraining.length} not participated`
         : `${data.length} entries fetched`;

      return res.json({ data, message, status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

// GET /api/training/participants/no-training?year=2025
export const getEmployeesWithNoTraining = async (req: Request, res: Response) => {
   try {
      const yearParam = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
      const year = Number.isFinite(yearParam!) ? Math.floor(yearParam!) : undefined;

      if (!year) {
         return res.status(400).json({ data: null, message: 'year parameter is required', status: 'error' });
      }

      // Fetch all active employees
      const employees = await assetModel.getEmployees();
      if (!Array.isArray(employees)) {
         return res.status(500).json({ data: null, message: 'Failed to fetch employees', status: 'error' });
      }

      // Fetch all participants
      const allParticipants = await trainingModel.getParticipants();
      
      // Fetch all trainings for the specified year
      const allTrainings = await trainingModel.getTrainings(year);
      const trainingIds = allTrainings.map(t => Number(t.training_id)).filter(id => id > 0);

      // Get participants who attended trainings in the specified year
      const participantsInYear = (allParticipants).filter(p => 
         trainingIds.includes(Number(p.training_id))
      );

      // Extract unique ramco_ids of employees who attended training
      const attendedRamcoIds = new Set(
         participantsInYear.map(p => String(p.participant || '').trim()).filter(s => s.length > 0)
      );

      // Fetch enrichment data
      const [departments, positions, locations] = await Promise.all([
         assetModel.getDepartments().catch(() => []),
         assetModel.getPositions().catch(() => []),
         assetModel.getLocations().catch(() => [])
      ]);

      const depts = Array.isArray(departments) ? departments : [];
      const poss = Array.isArray(positions) ? positions : [];
      const locs = Array.isArray(locations) ? locations : [];

      const departmentMap = new Map(depts.map((d: any) => [Number(d.id), d]));
      const positionMap = new Map(poss.map((p: any) => [Number(p.id), p]));
      const locationMap = new Map(locs.map((l: any) => [Number(l.id), l]));

      // Filter employees who have NOT attended any training in the specified year
      const employeesWithNoTraining = employees
         .filter((emp: any) => {
            const ramco = String(emp.ramco_id || '').trim();
            return ramco.length > 0 && !attendedRamcoIds.has(ramco);
         })
         .map((emp: any) => {
            const participantObj: any = {
               full_name: emp.full_name ?? null,
               ramco_id: emp.ramco_id
            };

            if (emp.position_id) {
               const pos = positionMap.get(Number(emp.position_id));
               if (pos) participantObj.position = { id: pos.id, name: pos.name || pos.position_name };
            }
            if (emp.department_id) {
               const dept = departmentMap.get(Number(emp.department_id));
               if (dept) participantObj.department = { id: dept.id, name: dept.name };
            }
            if (emp.location_id) {
               const loc = locationMap.get(Number(emp.location_id));
               if (loc) participantObj.location = { id: loc.id, name: loc.name };
            }

            return {
               participant: participantObj,
               total_training_hours: "0.00",
               training_details: null
            };
         });

      return res.json({ 
         data: employeesWithNoTraining, 
         message: `${employeesWithNoTraining.length} employee(s) with no training in ${year}`, 
         status: 'success' 
      });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const getParticipantById = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });

      const item = await trainingModel.getParticipantById(id);
      if (!item) return res.status(404).json({ data: null, message: 'Not found', status: 'error' });

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
            const positions = await assetModel.getPositions();
            if (Array.isArray(positions)) {
               const pos = (positions as any[]).find((p: any) => Number(p.id) === Number(emp.position_id));
               if (pos) positionObj = { id: pos.id, name: pos.name || pos.position_name };
            }
         } catch { /* ignore */ }
      }

      if (emp?.department_id) {
         try {
            const departments = await assetModel.getDepartments();
            if (Array.isArray(departments)) {
               const dept = (departments as any[]).find((d: any) => Number(d.id) === Number(emp.department_id));
               if (dept) departmentObj = { code: dept.code, id: dept.id, name: dept.name };
            }
         } catch { /* ignore */ }
      }

      if (emp?.location_id) {
         try {
            const locations = await assetModel.getLocations();
            if (Array.isArray(locations)) {
               const loc = (locations as any[]).find((l: any) => Number(l.id) === Number(emp.location_id));
               if (loc) locationObj = { code: loc.code, id: loc.id, name: loc.name };
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
         attendance: item.attendance ?? null,
         participant: {
            department: departmentObj,
            full_name: emp?.full_name ?? null,
            location: locationObj,
            position: positionObj,
            ramco_id: ramco
         },
         participant_id: Number(item.participant_id ?? 0),
         training_details: training ? {
            attendance_upload: training.attendance_upload ?? null,
            course_title: training.course_title ?? null,
            days: training.days ?? null,
            end_date: training.edate,
            hrs: training.hrs ?? null,
            start_date: training.sdate,
            training_id: trainId,
            venue: training.venue ? decodeHtmlEntities(training.venue) : null
         } : null,
         training_id: trainId
      };

      return res.json({ data: enriched, message: 'Participant fetched', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const createParticipant = async (req: Request, res: Response) => {
   try {
      const payload = req.body ?? {};
      const result: any = await trainingModel.createParticipant(payload);
      return res.json({ data: { insertId: result?.insertId }, message: 'Participant created', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const updateParticipant = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const payload = req.body ?? {};
      const result: any = await trainingModel.updateParticipant(id, payload);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Participant updated', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};

export const deleteParticipant = async (req: Request, res: Response) => {
   try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
      const result: any = await trainingModel.deleteParticipant(id);
      return res.json({ data: { affectedRows: result?.affectedRows }, message: 'Participant deleted', status: 'success' });
   } catch (error) {
      return res.status(500).json({ data: null, message: (error as Error).message ?? 'Unknown error', status: 'error' });
   }
};
