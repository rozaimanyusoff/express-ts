import { Router } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as siteController from "./siteController";

const router = Router();

// INFO
router.get("/info", asyncHandler(siteController.getSiteInfo));

export default router;