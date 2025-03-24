import { Router } from "express";
import { getAllUser, updateUser1, assignUserToGroups1 } from "../controllers/userController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/", asyncHandler(getAllUser));
router.put("/:id", asyncHandler(updateUser1));
router.put("/assign", asyncHandler(assignUserToGroups1));

export default router;