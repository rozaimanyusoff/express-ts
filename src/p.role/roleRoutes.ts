import { Router } from "express";

import { createNewRole, getAllRole, getRole, updateRoleById } from "../p.role/roleController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/", asyncHandler(getAllRole));
router.get("/:id", asyncHandler(getRole));
router.post("/", asyncHandler(createNewRole));
router.put("/:id", asyncHandler(updateRoleById));

export default router;