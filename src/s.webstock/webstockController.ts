import { Request, Response } from 'express';
import * as model from './webstockModel';

export const list = async (req: Request, res: Response) => {
  const items = await model.getLocationTypes();
  res.json({ status: 'success', message: 'Location types retrieved successfully', data: items });
};

export const getById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await model.getLocationTypeById(id);
  if (!item) return res.status(404).json({ status: 'error', message: 'Location type not found' });
  res.json({ status: 'success', data: item });
};

export const create = async (req: Request, res: Response) => {
  const { old_id = null, type } = req.body;
  if (!type) return res.status(400).json({ status: 'error', message: 'type is required' });
  const id = await model.createLocationType({ old_id, type });
  res.status(201).json({ status: 'success', message: 'Location type created', id });
};

export const update = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { old_id = null, type } = req.body;
  if (!type) return res.status(400).json({ status: 'error', message: 'type is required' });
  await model.updateLocationType(id, { old_id, type });
  res.json({ status: 'success', message: 'Location type updated' });
};

export const remove = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.deleteLocationType(id);
  res.json({ status: 'success', message: 'Location type deleted' });
};

// =============== LOCATIONS =================

export const listLocations = async (_req: Request, res: Response) => {
  const items = await model.getLocations();
  res.json({ status: 'success', message: 'Locations retrieved successfully', data: items });
};

export const getLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await model.getLocationById(id);
  if (!item) return res.status(404).json({ status: 'error', message: 'Location not found' });
  res.json({ status: 'success', message: 'Location by ID retrieved successfully', data: item });
};

export const createLocation = async (req: Request, res: Response) => {
  const id = await model.createLocation(req.body);
  res.status(201).json({ status: 'success', message: 'Location created', id });
};

export const updateLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.updateLocation(id, req.body);
  res.json({ status: 'success', message: 'Location updated' });
};

export const deleteLocation = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await model.deleteLocation(id);
  res.json({ status: 'success', message: 'Location deleted' });
};

// =============== FIXED ASSET =================

export const listFixedAssets = async (_req: Request, res: Response) => {
  const items = await model.getFixedAssets();
  res.json({ status: 'success', message: 'Fixed assets retrieved successfully', data: items });
};

export const getFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await model.getFixedAssetById(id);
  if (!item) return res.status(404).json({ status: 'error', message: 'Fixed asset not found' });
  res.json({ status: 'success', message: 'Fixed asset retrieved successfully', data: item });
};

export const createFixedAsset = async (req: Request, res: Response) => {
  const id = await model.createFixedAsset(req.body);
  res.status(201).json({ status: 'success', message: 'Fixed asset created', id });
};

export const updateFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await model.updateFixedAsset(id, req.body);
  res.json({ status: 'success', message: 'Fixed asset updated' });
};

export const deleteFixedAsset = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await model.deleteFixedAsset(id);
  res.json({ status: 'success', message: 'Fixed asset deleted' });
};
