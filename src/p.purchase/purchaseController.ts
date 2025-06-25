// src/p.purchase/purchaseController.ts
import { Request, Response } from 'express';
import * as purchaseModel from './purchaseModel';

export const getAllPurchaseRequests = async (req: Request, res: Response) => {
  const requests = await purchaseModel.getAllPurchaseRequests();
  res.json({ status: 'success', message: 'Purchase requests retrieved successfully', data: requests });
};

export const getPurchaseRequestById = async (req: Request, res: Response) => {
  const request = await purchaseModel.getPurchaseRequestById(Number(req.params.id));
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Purchase request not found' });
  }
  // Fetch details
  const details = await purchaseModel.getPurchaseRequestDetails(request.id);
  res.json({ status: 'success', message: 'Purchase request retrieved successfully', data: { ...request, details } });
};

export const createPurchaseRequest = async (req: Request, res: Response) => {
  const { parent, details } = req.body;
  // parent: purchase_request fields, details: array of purchase_request_details
  const insertId = await purchaseModel.createPurchaseRequest(parent);
  if (Array.isArray(details)) {
    for (const detail of details) {
      await purchaseModel.createPurchaseRequestDetail({ ...detail, request_id: insertId });
    }
  }
  res.status(201).json({ status: 'success', message: 'Purchase request created successfully', id: insertId });
};

export const deletePurchaseRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await purchaseModel.deletePurchaseRequest(id);
  await purchaseModel.deletePurchaseRequestDetails(id);
  res.json({ status: 'success', message: 'Purchase request and details deleted successfully' });
};
