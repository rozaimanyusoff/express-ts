// src/p.training/trainingRoutes.ts
import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as trainingController from './trainingController';
import { createUploader } from '../utils/fileUploader';

const router = Router();
const uploadTraining = createUploader('trainings');

// Trainers
router.get('/trainers/:id', asyncHandler(trainingController.getTrainerById));
router.get('/trainers', asyncHandler(trainingController.getTrainers));
router.post('/trainers', asyncHandler(trainingController.createTrainer));
router.put('/trainers/:id', asyncHandler(trainingController.updateTrainer));
router.delete('/trainers/:id', asyncHandler(trainingController.deleteTrainer));

// Courses
router.get('/courses/:id', asyncHandler(trainingController.getCourseById));
router.get('/courses', asyncHandler(trainingController.getCourses));
router.post('/courses', asyncHandler(trainingController.createCourse));
router.put('/courses/:id', asyncHandler(trainingController.updateCourse));
router.delete('/courses/:id', asyncHandler(trainingController.deleteCourse));

// Participants
router.get('/participants/no-training', asyncHandler(trainingController.getEmployeesWithNoTraining));
router.get('/participants/:id', asyncHandler(trainingController.getParticipantById));
router.get('/participants', asyncHandler(trainingController.getParticipants));
router.post('/participants', asyncHandler(trainingController.createParticipant));
router.put('/participants/:id', asyncHandler(trainingController.updateParticipant));
router.delete('/participants/:id', asyncHandler(trainingController.deleteParticipant));

// Training events
router.get('/:id', asyncHandler(trainingController.getTrainingById));
router.get('/', asyncHandler(trainingController.getTrainings));
router.post('/', asyncHandler(trainingController.createTraining));
router.put('/:id', uploadTraining.single('attendance_uploaded'), asyncHandler(trainingController.updateTraining));
router.delete('/:id', asyncHandler(trainingController.deleteTraining));


export default router;
