import { Router } from "express";
import * as userController from "./userController";
import asyncHandler from "../utils/asyncHandler";
import tokenValidator from '../middlewares/tokenValidator';
import multer from 'multer';

const upload = multer();
const router = Router();
router.get("/", asyncHandler(userController.getAllUser));
router.put('/update-profile', tokenValidator, upload.single('profileImage'), asyncHandler(userController.updateUserProfile));
router.put("/:id", asyncHandler(userController.updateUser1));
router.put("/assign", asyncHandler(userController.assignUserToGroups1));
router.post("/reset-password", asyncHandler(userController.adminResetPasswords));
router.post("/change-groups", asyncHandler(userController.changeUsersGroups));
router.post("/change-role", asyncHandler(userController.changeUsersRole));
router.post("/suspend", asyncHandler(userController.suspendOrActivateUsers));
router.get('/tasks', tokenValidator, asyncHandler(userController.getTasks));
router.post('/tasks', tokenValidator, asyncHandler(userController.postTask));
router.put('/tasks/:id', tokenValidator, asyncHandler(userController.putTask));
router.get('/user/:userId/auth-logs', tokenValidator, asyncHandler(userController.getUserAuthLogs));
router.get('/user/:userId/logs-auth', tokenValidator, asyncHandler(userController.getAuthLogs));
router.get("/logs", asyncHandler(userController.getAllAuthLogs)); // Assuming this is for admin to view all auth logs
router.get("/pending", asyncHandler(userController.getAllPendingUser));

/* ===== APPROVAL LEVELS ===== */
router.get("/approvals/:id", asyncHandler(userController.getApprovalLevelById));
router.get("/approvals", asyncHandler(userController.getApprovalLevels));
router.post("/approvals", asyncHandler(userController.createApprovalLevel));
router.put("/approvals/:id", asyncHandler(userController.updateApprovalLevel));
router.delete("/approvals/:id", asyncHandler(userController.deleteApprovalLevel));

export default router;