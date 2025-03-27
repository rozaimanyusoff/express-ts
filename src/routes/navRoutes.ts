import { Router } from "express";
import { getNavigationPermissionsHandler, trackRoute, toggleStatusHandler, getNavigations, getNavigationsUnstructured, createNavigationHandler, updateNavigationHandler, updateNavigationPermissionsHandler, removeNavigationPermissionsHandler, getNavigationByUserIdHandler } from "../controllers/navController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();

router.get("/access/:id", asyncHandler(getNavigationByUserIdHandler)); // Get navigation by user's access groups. Has body data of accessgroups
router.get("/access", asyncHandler(getNavigationPermissionsHandler));
router.put("/track-route", asyncHandler(trackRoute));
router.get("/navflat", asyncHandler(getNavigationsUnstructured));
router.get("/", asyncHandler(getNavigations));
router.post("/", asyncHandler(createNavigationHandler));
router.put("/:id/status", asyncHandler(toggleStatusHandler));
router.put("/:id", asyncHandler(updateNavigationHandler));
router.put("/permissions/assign", asyncHandler(updateNavigationPermissionsHandler)); //assign menu to groups
router.delete("/permissions/remove", asyncHandler(removeNavigationPermissionsHandler)); //remove menu from groups


export default router;