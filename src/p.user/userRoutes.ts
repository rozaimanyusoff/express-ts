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

// MODULES
router.get('/modules', asyncHandler(userController.getModules));
router.get('/modules/:id', asyncHandler(userController.getModuleById));
router.post('/modules', asyncHandler(userController.createModule));
router.put('/modules/:id', asyncHandler(userController.updateModule));
router.delete('/modules/:id', asyncHandler(userController.deleteModule));

// MODULE MEMBERS
router.get('/modules/members', asyncHandler(userController.getAllModuleMembers)); // all members
router.get('/modules/:id/members', asyncHandler(userController.getModuleMembersByModule)); // members by module id
router.get('/modules/members/:ramco_id', asyncHandler(userController.getModuleMembersByRamco)); // members by ramco
router.post('/modules/:id/members', asyncHandler(userController.postModuleMember)); // add member to module
router.put('/modules/members/:id', asyncHandler(userController.putModuleMember));
router.delete('/modules/members/:id', asyncHandler(userController.deleteModuleMemberHandler));

// PERMISSIONS
router.get('/permissions', asyncHandler(userController.getPermissionsHandler));
router.get('/permissions/:id', asyncHandler(userController.getPermissionHandler));
router.post('/permissions', asyncHandler(userController.postPermissionHandler));
router.put('/permissions/:id', asyncHandler(userController.putPermissionHandler));
router.delete('/permissions/:id', asyncHandler(userController.deletePermissionHandler));

export default router;