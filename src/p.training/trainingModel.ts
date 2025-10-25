// src/p.training/trainingModel.ts
import { pool, pool2 } from '../utils/db';
import { toPublicUrl } from '../utils/uploadUtil';

// Interface definitions live in the model per convention
export interface TrainingEvent {
   training_id: number;
   course_title: string;
   course_id: number;
   series: string | null;
   sdate: string | null; // formatted d/m/yyyy h:mm a (controller formats)
   edate: string | null; // formatted d/m/yyyy h:mm a (controller formats)
   hrs: string | null;
   days: string | null;
   venue: string | null;
   training_count: number;
   attendance: number | null;
   session: string | null;
   seat: number | null;
   contents: string | null;
   event_cost: string | null;
   cost_trainer: string | null;
   cost_venue: string | null;
   cost_lodging: string | null;
   cost_other: string | null;
   cost_total: string | null;
   attendance_upload: string | null; // full URL when present
}

const dbTraining = 'training';
const trainingEventTable = `${dbTraining}.training_events`; //index column is training_id
const trainerTable = `${dbTraining}.trainer`; //index column is trainer_id
const courseTable = `${dbTraining}.course`; //index column is course_id
const participantTable = `${dbTraining}.participant`; //index column is participant_id linked to table training_events.training_id.

/* ========== TRAINING EVENTS =========== */
export const getTrainings = async (year?: number) => {
   let sql = `SELECT * FROM ${trainingEventTable}`;
   const params: any[] = [];
   if (Number.isFinite(year as number)) {
      sql += ' WHERE YEAR(sdate) = ?';
      params.push(Math.floor(year as number));
   }
   sql += ' ORDER BY training_id DESC LIMIT 100';
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
   const [rows] = await pool2.query(`SELECT * FROM ${trainerTable} ORDER BY trainer_id DESC LIMIT 200`);
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
export const getCourses = async () => {
   const [rows] = await pool2.query(`SELECT * FROM ${courseTable} ORDER BY course_id DESC LIMIT 200`);
   return rows as any[];
};

export const getCourseById = async (id: number) => {
   const [rows] = await pool2.query(`SELECT * FROM ${courseTable} WHERE course_id = ? LIMIT 1`, [id]);
   return (rows as any[])[0] || null;
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
