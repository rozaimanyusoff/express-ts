import { Request, Response } from 'express';

import * as model from './webstockModel';

export const list = async (req: Request, res: Response) => {
  const items = await model.getLocationTypes();
  res.json({ data: items, message: 'Location types retrieved successfully', status: 'success' });
};

export const getById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await model.getLocationTypeById(id);
  if (!item) return res.status(404).json({ message: 'Location type not found', status: 'error' });
  res.json({ data: item, status: 'success' });
};

export const create = async (req: Request, res: Response) => {
  const { old_id = null, type } = req.body;
  if (!type) return res.status(400).json({ message: 'type is required', status: 'error' });
  const id = await model.createLocationType({ old_id, type });
  res.status(201).json({ id, message: 'Location type created', status: 'success' });
};

export const update = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { old_id = null, type } = req.body;
  if (!type) return res.status(400).json({ message: 'type is required', status: 'error' });
  await model.updateLocationType(id, { old_id, type });
  res.json({ message: 'Location type updated', status: 'success' });
};

export const remove = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.deleteLocationType(id);
  res.json({ message: 'Location type deleted', status: 'success' });
};

// =============== LOCATIONS =================

export const listLocations = async (_req: Request, res: Response) => {
  const items = await model.getLocations();
  res.json({ data: items, message: 'Locations retrieved successfully', status: 'success' });
};

export const getLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await model.getLocationById(id);
  if (!item) return res.status(404).json({ message: 'Location not found', status: 'error' });
  res.json({ data: item, message: 'Location by ID retrieved successfully', status: 'success' });
};

export const createLocation = async (req: Request, res: Response) => {
  const id = await model.createLocation(req.body);
  res.status(201).json({ id, message: 'Location created', status: 'success' });
};

export const updateLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.updateLocation(id, req.body);
  res.json({ message: 'Location updated', status: 'success' });
};

export const deleteLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.deleteLocation(id);
  res.json({ message: 'Location deleted', status: 'success' });
};

// =============== FIXED ASSET =================

export const listFixedAssets = async (_req: Request, res: Response) => {
  const items = await model.getFixedAssets();
  res.json({ data: items, message: 'Fixed assets retrieved successfully', status: 'success' });
};

export const getFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await model.getFixedAssetById(id);
  if (!item) return res.status(404).json({ message: 'Fixed asset not found', status: 'error' });
  res.json({ data: item, message: 'Fixed asset retrieved successfully', status: 'success' });
};

export const createFixedAsset = async (req: Request, res: Response) => {
  const id = await model.createFixedAsset(req.body);
  res.status(201).json({ id, message: 'Fixed asset created', status: 'success' });
};

export const updateFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await model.updateFixedAsset(id, req.body);
  res.json({ message: 'Fixed asset updated', status: 'success' });
};

export const deleteFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await model.deleteFixedAsset(id);
  res.json({ message: 'Fixed asset deleted', status: 'success' });
};
