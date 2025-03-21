import { Router } from "express";
import { getNavigationPermissionsHandler, trackRoute, toggleStatusHandler, getNavigationByIds, getNavigations, getNavigationsUnstructured, createNavigationHandler, updateNavigationHandler, updateNavigationPermissionsHandler, removeNavigationPermissionsHandler } from "../controllers/navController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/access", asyncHandler(getNavigationPermissionsHandler));
router.put("/track-route", asyncHandler(trackRoute));
router.put("/:id/status", asyncHandler(toggleStatusHandler));
router.get("/:id", asyncHandler(getNavigationByIds));
router.get("/", asyncHandler(getNavigations));
router.get("/navflat", asyncHandler(getNavigationsUnstructured));
router.post("/", asyncHandler(createNavigationHandler));
router.put("/:id", asyncHandler(updateNavigationHandler));
router.put("/permissions", asyncHandler(updateNavigationPermissionsHandler));
router.delete("/permissions", asyncHandler(removeNavigationPermissionsHandler));


export default router;