// src/p.billing/billingController.ts
import { Request, Response } from 'express';
import * as billingModel from './billingModel';
import * as assetsModel from '../p.asset/assetModel';

export const getAllBillings = async (req: Request, res: Response) => {
  const billings = await billingModel.getVehicleMaintenanceBilling();
  res.json({ status: 'success', message: 'Billings retrieved successfully', data: billings });
};

export const getBillingById = async (req: Request, res: Response) => {
  const billing = await billingModel.getBillingById(Number(req.params.id));
  if (!billing) {
    return res.status(404).json({ status: 'error', message: 'Billing not found' });
  }
  res.json({ status: 'success', message: 'Billing retrieved successfully', data: billing });
};

export const createBilling = async (req: Request, res: Response) => {
  const { invoice_no, customer_id, amount, status } = req.body;
  const insertId = await billingModel.createBilling({ invoice_no, customer_id, amount, status });
  res.status(201).json({ status: 'success', message: 'Billing created successfully', id: insertId });
};

export const updateBilling = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { invoice_no, customer_id, amount, status } = req.body;
  await billingModel.updateBilling(id, { invoice_no, customer_id, amount, status });
  res.json({ status: 'success', message: 'Billing updated successfully' });
};

export const deleteBilling = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await billingModel.deleteBilling(id);
  res.json({ status: 'success', message: 'Billing deleted successfully' });
};
