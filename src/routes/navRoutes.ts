import { Router } from "express";
import { trackRoute, getNavigations, getNavigationsUnstructured, getNavigationByIdsHandler, getNavigationPermissionsHandler } from "../controllers/navController";
import asyncHandler from "../utils/asyncHandler";

const router = Router();
router.get("/track-route", asyncHandler(trackRoute));
router.get("/", asyncHandler(getNavigations));
router.get("/navflat", asyncHandler(getNavigationsUnstructured));
router.get("/:id", asyncHandler(getNavigationByIdsHandler));
router.get("/permissions/:id", asyncHandler(getNavigationPermissionsHandler));