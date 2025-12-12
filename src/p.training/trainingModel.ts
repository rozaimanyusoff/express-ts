// src/p.training/trainingModel.ts
import { pool, pool2 } from '../utils/db';
import { toPublicUrl } from '../utils/uploadUtil';

// Interface definitions live in the model per convention
export interface TrainingEvent {
   attendance: null | number;
   attendance_upload: null | string; // full URL when present
   contents: null | string;
   cost_lodging: null | string;
   cost_other: null | string;
   cost_total: null | string;
   cost_trainer: null | string;
   cost_venue: null | string;
   course_id: number;
   course_title: string;
   days: null | string;
   edate: null | string; // formatted d/m/yyyy h:mm a (controller formats)
   event_cost: null | string;
   hrs: null | string;
   sdate: null | string; // formatted d/m/yyyy h:mm a (controller formats)
   seat: null | number;
   series: null | string;
   session: null | string;
   training_count: number;
   training_id: number;
   venue: null | string;
}

const dbTraining = 'training2';
const trainingEventTable = `${dbTraining}.training_events`; //index column is training_id
const trainerTable = `${dbTraining}.trainer`; //index column is trainer_id
const courseTable = `${dbTraining}.course`; //index column is course_id
const courseCostingTable = `${dbTraining}.course_cost`; //index column is costing_id linked to table course.course_id.
const participantTable = `${dbTraining}.participant`; //index column is participant_id linked to table training_events.training_id.
const costingTable = `${dbTraining}.event_costing`; //index column is costing_id linked to table training_events.training_id.

// Decode common HTML entities (named and numeric)
const decodeHtmlEntities = (str: any): any => {
   if (typeof str !== 'string') return str;
   const namedMap: Record<string, string> = {
      '&#34;': '"',
      '&#39;': "'",
      '&amp;': '&',
      '&apos;': "'",
      '&gt;': '>',
      '&lt;': '<',
      '&nbsp;': ' ',
      '&quot;': '"'
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

// Shallow decode for objects/arrays
const decodeStringsShallow = (val: any): any => {
   if (typeof val === 'string') return decodeHtmlEntities(val);
   if (Array.isArray(val)) return val.map(decodeStringsShallow);
   if (val && typeof val === 'object') {
      const out: any = {};
      for (const k of Object.keys(val)) {
         const v = (val)[k];
         out[k] = typeof v === 'string' ? decodeHtmlEntities(v) : v;
      }
      return out;
   }
   return val;
};

/* ========== TRAINING EVENTS =========== */
export const getTrainings = async (year?: number) => {
   let sql = `SELECT * FROM ${trainingEventTable}`;
   const params: any[] = [];
   if (Number.isFinite(year!)) {
      sql += ' WHERE YEAR(sdate) = ?';
      params.push(Math.floor(year!));
   }
   sql += ' ORDER BY training_id DESC';
   const [rows] = await pool2.query(sql, params);
   return rows as any[];
};

export const getTrainingById = async (id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${trainingEventTable} WHERE training_id = ? LIMIT 1`, [id]);
   const arr = rows as any[];
   return arr[0] || null;
};

export const createTraining = async (data: any) => {
   const [result] = await pool2.query(`INSERT INTO ${trainingEventTable} SET ?`, [data]);
   return result as any;
};

export const updateTraining = async (id: number, data: any) => {
   const [result] = await pool2.query(`UPDATE ${trainingEventTable} SET ? WHERE training_id = ?`, [data, id]);
   return result as any;
};

export const deleteTraining = async (id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${trainingEventTable} WHERE training_id = ?`, [id]);
   return result as any;
};

/* ========== TRAINERS =========== */
export const getTrainers = async () => {
   const [rows] = await pool2.query(`SELECT DISTINCT * FROM ${trainerTable} ORDER BY trainer_id DESC LIMIT 200`);
   return rows as any[];
};

export const getTrainerById = async (id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${trainerTable} WHERE trainer_id = ? LIMIT 1`, [id]);
   return (rows as any[])[0] || null;
};

export const createTrainer = async (data: any) => {
   const [result] = await pool2.query(`INSERT INTO ${trainerTable} SET ?`, [data]);
   return result as any;
};

export const updateTrainer = async (id: number, data: any) => {
   const [result] = await pool2.query(`UPDATE ${trainerTable} SET ? WHERE trainer_id = ?`, [data, id]);
   return result as any;
};

export const deleteTrainer = async (id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${trainerTable} WHERE trainer_id = ?`, [id]);
   return result as any;
};

/* ========== COURSES =========== */
export const getCourses = async (searchTerm?: string) => {
   let query = `SELECT * FROM ${courseTable}`;
   const params: any[] = [];
   
   if (searchTerm && searchTerm.trim() !== '') {
      query += ` WHERE course_title LIKE ? OR course_desc LIKE ?`;
      const searchPattern = `%${searchTerm.trim()}%`;
      params.push(searchPattern, searchPattern);
   }
   
   query += ` ORDER BY course_id DESC LIMIT 200`;
   const [rows] = await pool2.query(query, params);
   const arr = rows as any[];
   return arr.map(decodeStringsShallow);
};

export const getCourseById = async (id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${courseTable} WHERE course_id = ? LIMIT 1`, [id]);
   const item = (rows as any[])[0] || null;
   return item ? decodeStringsShallow(item) : null;
};

export const createCourse = async (data: any) => {
   const [result] = await pool2.query(`INSERT INTO ${courseTable} SET ?`, [data]);
   return result as any;
};

export const updateCourse = async (id: number, data: any) => {
   const [result] = await pool2.query(`UPDATE ${courseTable} SET ? WHERE course_id = ?`, [data, id]);
   return result as any;
};

export const deleteCourse = async (id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${courseTable} WHERE course_id = ?`, [id]);
   return result as any;
};

// Course Costings
export const getCourseCostingsByCourseId = async (course_id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${courseCostingTable} WHERE course_id = ? ORDER BY costing_id`, [course_id]);
   return rows as any[];
};

export const createMultipleCourseCostings = async (costings: any[]) => {
   if (!Array.isArray(costings) || costings.length === 0) return { affectedRows: 0 };
   const values = costings.map(c => [c.course_id, c.cost_desc, c.cost]);
   const [result] = await pool2.query(
      `INSERT INTO ${courseCostingTable} (course_id, cost_desc, cost) VALUES ?`,
      [values]
   );
   return result as any;
};

export const deleteCourseCostingsByCourseId = async (course_id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${courseCostingTable} WHERE course_id = ?`, [course_id]);
   return result as any;
};

/* ========== PARTICIPANTS =========== */
export const getParticipants = async () => {
   const [rows] = await pool2.query(`SELECT * FROM ${participantTable} ORDER BY participant_id DESC`);
   return rows as any[];
};

export const getParticipantById = async (id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${participantTable} WHERE participant_id = ? LIMIT 1`, [id]);
   return (rows as any[])[0] || null;
};

export const createParticipant = async (data: any) => {
   const [result] = await pool2.query(`INSERT INTO ${participantTable} SET ?`, [data]);
   return result as any;
};

export const updateParticipant = async (id: number, data: any) => {
   const [result] = await pool2.query(`UPDATE ${participantTable} SET ? WHERE participant_id = ?`, [data, id]);
   return result as any;
};

export const deleteParticipant = async (id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${participantTable} WHERE participant_id = ?`, [id]);
   return result as any;
};

export const getParticipantsByTrainingId = async (training_id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${participantTable} WHERE training_id = ? ORDER BY participant_id DESC`, [training_id]);
   return rows as any[];
};

/* ========== COSTING =========== */
export const createCosting = async (data: any) => {
   const [result] = await pool2.query(`INSERT INTO ${costingTable} SET ?`, [data]);
   return result as any;
};

export const createMultipleCostings = async (costings: any[]) => {
   if (!Array.isArray(costings) || costings.length === 0) {
      return { insertedCount: 0, insertIds: [] };
   }
   const insertIds: number[] = [];
   for (const costing of costings) {
      try {
         const result: any = await createCosting(costing);
         if (result?.insertId) insertIds.push(result.insertId);
      } catch (error) {
         console.error('Error inserting costing:', error);
      }
   }
   return { insertedCount: insertIds.length, insertIds };
};

export const createMultipleParticipants = async (participants: any[]) => {
   if (!Array.isArray(participants) || participants.length === 0) {
      return { insertedCount: 0, insertIds: [] };
   }
   const insertIds: number[] = [];
   for (const participant of participants) {
      try {
         const result: any = await createParticipant(participant);
         if (result?.insertId) insertIds.push(result.insertId);
      } catch (error) {
         console.error('Error inserting participant:', error);
      }
   }
   return { insertedCount: insertIds.length, insertIds };
};

export const deleteCostingsByTrainingId = async (training_id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${costingTable} WHERE training_id = ?`, [training_id]);
   return result as any;
};

export const deleteParticipantsByTrainingId = async (training_id: number) => {
   const [result] = await pool2.query(`DELETE FROM ${participantTable} WHERE training_id = ?`, [training_id]);
   return result as any;
};

export const getCostingsByTrainingId = async (training_id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${costingTable} WHERE training_id = ? ORDER BY costing_id DESC`, [training_id]);
   return rows as any[];
};
