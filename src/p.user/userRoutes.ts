import { Router } from "express";
import { getAllUser, updateUser1, assignUserToGroups1, adminResetPasswords, changeUsersGroups, changeUsersRole, suspendOrActivateUsers, updateUserProfile, getTasks, postTask, putTask, getUserAuthLogs, getAllPendingUser, getAuthLogs, getAllAuthLogs } from "./userController";
import asyncHandler from "../utils/asyncHandler";
import tokenValidator from '../middlewares/tokenValidator';
import multer from 'multer';

const upload = multer();
const router = Router();
router.get("/", asyncHandler(getAllUser));
router.put('/update-profile', tokenValidator, upload.single('profileImage'), asyncHandler(updateUserProfile));
router.put("/:id", asyncHandler(updateUser1));
router.put("/assign", asyncHandler(assignUserToGroups1));
router.post("/reset-password", asyncHandler(adminResetPasswords));
router.post("/change-groups", asyncHandler(changeUsersGroups));
router.post("/change-role", asyncHandler(changeUsersRole));
router.post("/suspend", asyncHandler(suspendOrActivateUsers));
router.get('/tasks', tokenValidator, asyncHandler(getTasks));
router.post('/tasks', tokenValidator, asyncHandler(postTask));
router.put('/tasks/:id', tokenValidator, asyncHandler(putTask));
router.get('/user/:userId/auth-logs', tokenValidator, asyncHandler(getUserAuthLogs));
router.get('/user/:userId/logs-auth', tokenValidator, asyncHandler(getAuthLogs));
router.get("/logs", asyncHandler(getAllAuthLogs)); // Assuming this is for admin to view all auth logs
router.get("/pending", asyncHandler(getAllPendingUser));


export default router;