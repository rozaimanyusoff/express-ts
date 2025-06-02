import { Router } from "express";
import { getAllRole, getRole, createNewRole, updateRoleById } from "../p.role/roleController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/", asyncHandler(getAllRole));
router.get("/:id", asyncHandler(getRole));
router.post("/", asyncHandler(createNewRole));
router.put("/:id", asyncHandler(updateRoleById));

export default router;