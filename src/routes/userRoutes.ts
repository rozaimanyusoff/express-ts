import { Router } from "express";
import { getAllUser, updateUser1, assignUserToGroups1, adminResetPasswords, changeUsersGroups, changeUsersRole, suspendOrActivateUsers } from "../controllers/userController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/", asyncHandler(getAllUser));
router.put("/:id", asyncHandler(updateUser1));
router.put("/assign", asyncHandler(assignUserToGroups1));
router.post("/reset-password", asyncHandler(adminResetPasswords));
router.post("/change-groups", asyncHandler(changeUsersGroups));
router.post("/change-role", asyncHandler(changeUsersRole));
router.post("/suspend", asyncHandler(suspendOrActivateUsers));

export default router;