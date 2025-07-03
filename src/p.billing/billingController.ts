// src/p.billing/billingController.ts
import { Request, Response } from 'express';
import * as billingModel from './billingModel';
import * as assetsModel from '../p.asset/assetModel';
import dayjs from 'dayjs';

export const getVehicleMaintenance = async (req: Request, res: Response) => {
  const vehicleMtn = await billingModel.getVehicleMaintenance();
  const workshops = await billingModel.getWorkshops() as any[];
  const assets = await assetsModel.getAssets() as any[];
  const costcenters = await assetsModel.getCostcenters() as any[];
  const districts = await assetsModel.getDistricts() as any[];
  // Build lookup maps for fast access
  const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
  const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
  const districtMap = new Map((districts || []).map((d: any) => [d.id, d]));
  const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
  // Only return selected fields with nested structure
  const filtered = vehicleMtn.map(b => ({
    inv_id: b.inv_id,
    inv_no: b.inv_no,
    inv_date: b.inv_date,
    svc_order: b.svc_order,
    asset: assetMap.has(b.asset_id) ? {
      asset_id: b.asset_id,
      register_number: (assetMap.get(b.asset_id) as any)?.serial_number
    } : null,
    costcenter: ccMap.has(b.cc_id) ? {
      id: b.cc_id,
      name: (ccMap.get(b.cc_id) as any)?.name
    } : null,
    district: districtMap.has(b.loc_id) ? {
      id: b.loc_id,
      name: (districtMap.get(b.loc_id) as any)?.code
    } : null,
    workshop: wsMap.has(b.ws_id) ? {
      id: b.ws_id,
      name: (wsMap.get(b.ws_id) as any)?.ws_name
    } : null,
    svc_date: b.svc_date,
    svc_odo: b.svc_odo,
    inv_total: b.inv_total,
    inv_stat: b.inv_stat,
    inv_remarks: b.inv_remarks,
    running_no: b.running_no
  }));
  res.json({ status: 'success', message: 'Billings retrieved successfully', data: filtered });
};

export const getVehicleMaintenanceById = async (req: Request, res: Response) => {
  const billing = await billingModel.getVehicleMaintenanceById(Number(req.params.id));
  if (!billing) {
    return res.status(404).json({ status: 'error', message: 'Billing not found' });
  }
  // Use inv_id if available, otherwise fallback to id
  const invoiceId = billing.inv_id;
  const parts = await billingModel.getVehicleMaintenanceParts(invoiceId);
  res.json({ status: 'success', message: 'Billing retrieved successfully', data: { ...billing, parts } });
};

export const createVehicleMaintenance = async (req: Request, res: Response) => {
  const {
    inv_no, inv_date, svc_order, asset_id, cc_id, loc_id, ws_id, svc_date, svc_odo,
    inv_total, inv_stat, inv_remarks, running_no
  } = req.body;
  const insertId = await billingModel.createVehicleMaintenance({
    inv_no, inv_date, svc_order, asset_id, cc_id, loc_id, ws_id, svc_date, svc_odo,
    inv_total, inv_stat, inv_remarks, running_no
  });
  res.status(201).json({ status: 'success', message: 'Billing created successfully', id: insertId });
};

export const updateVehicleMaintenance = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    inv_no, inv_date, svc_order, asset_id, cc_id, loc_id, ws_id, svc_date, svc_odo,
    inv_total, inv_stat, inv_remarks, running_no
  } = req.body;
  await billingModel.updateVehicleMaintenance(id, {
    inv_no, inv_date, svc_order, asset_id, cc_id, loc_id, ws_id, svc_date, svc_odo,
    inv_total, inv_stat, inv_remarks, running_no
  });
  res.json({ status: 'success', message: 'Billing updated successfully' });
};

export const deleteVehicleMaintenance = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await billingModel.deleteVehicleMaintenance(id);
  res.json({ status: 'success', message: 'Billing deleted successfully' });
};

export const getVehicleMaintenanceByDate = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
  }
  const vehicleMtn = await billingModel.getVehicleMaintenanceByDate(from as string, to as string);
  const assets = await assetsModel.getAssets() as any[];
  const costcenters = await assetsModel.getCostcenters() as any[];
  const districts = await assetsModel.getDistricts() as any[];
  const workshops = await billingModel.getWorkshops() as any[];
  // Build lookup maps for fast access
  const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
  const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
  const districtMap = new Map((districts || []).map((d: any) => [d.id, d]));
  const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
  // Only return selected fields with nested structure
  const filtered = vehicleMtn.map(b => ({
    inv_id: b.inv_id,
    inv_no: b.inv_no,
    inv_date: b.inv_date,
    svc_order: b.svc_order,
    asset: assetMap.has(b.asset_id) ? {
      asset_id: b.asset_id,
      register_number: (assetMap.get(b.asset_id) as any)?.serial_number
    } : null,
    costcenter: ccMap.has(b.cc_id) ? {
      id: b.cc_id,
      name: (ccMap.get(b.cc_id) as any)?.name
    } : null,
    district: districtMap.has(b.loc_id) ? {
      id: b.loc_id,
      name: (districtMap.get(b.loc_id) as any)?.code
    } : null,
    workshop: wsMap.has(b.ws_id) ? {
      id: b.ws_id,
      name: (wsMap.get(b.ws_id) as any)?.ws_name
    } : null,
    svc_date: b.svc_date,
    svc_odo: b.svc_odo,
    inv_total: b.inv_total,
    inv_stat: b.inv_stat,
    inv_remarks: b.inv_remarks,
    running_no: b.running_no
  }));
  res.json({ status: 'success', message: 'Vehicle maintenance by date range retrieved successfully', data: filtered });
};


export const getVehicleMaintenanceSummaryByDate = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
  }
  const vehicleMtn = await billingModel.getVehicleMaintenanceByDate(from as string, to as string);
  const assets = await assetsModel.getAssets() as any[];
  const costcenters = await assetsModel.getCostcenters() as any[];
  const districts = await assetsModel.getDistricts() as any[];
  const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
  const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
  const districtMap = new Map((districts || []).map((d: any) => [d.id, d]));

  // Group by asset
  const assetSummary: Record<string, any> = {};
  for (const b of vehicleMtn) {
    const asset_id = b.asset_id;
    const asset = assetMap.get(asset_id) || {};
    const costcenter = ccMap.get(b.cc_id) || {};
    const district = districtMap.get(b.loc_id) || {};
    if (!assetSummary[asset_id]) {
      assetSummary[asset_id] = {
        asset_id,
        serial_number: asset.serial_number || '',
        district: district ? { id: district.id, code: district.code } : null,
        costcenter: costcenter ? { id: costcenter.id, name: costcenter.name } : null,
        total_maintenance: 0,
        total_amount: 0,
        records: {}
      };
    }
    const date = dayjs(b.inv_date);
    const year = date.year();
    const month = date.month() + 1;
    if (!assetSummary[asset_id].records[year]) {
      assetSummary[asset_id].records[year] = { expenses: 0, maintenance: [] };
    }
    // Find if this month already exists in maintenance
    let monthEntry = assetSummary[asset_id].records[year].maintenance.find((m: any) => m.month === month);
    if (!monthEntry) {
      monthEntry = { month, total_maintenance: 0, amount: 0 };
      assetSummary[asset_id].records[year].maintenance.push(monthEntry);
    }
    monthEntry.total_maintenance += 1;
    monthEntry.amount += parseFloat(b.inv_total || '0');
    assetSummary[asset_id].records[year].expenses += parseFloat(b.inv_total || '0');
    assetSummary[asset_id].total_maintenance += 1;
    assetSummary[asset_id].total_amount += parseFloat(b.inv_total || '0');
  }

  // Format output
  const result = Object.values(assetSummary).map((asset: any) => ({
    asset_id: asset.asset_id,
    serial_number: asset.serial_number,
    district: asset.district,
    costcenter: asset.costcenter,
    total_maintenance: asset.total_maintenance,
    total_amount: asset.total_amount,
    records: Object.entries(asset.records).map(([year, data]: [string, any]) => ({
      year: Number(year),
      expenses: data.expenses.toFixed(2),
      maintenance: data.maintenance
    }))
  }));

  res.json({ status: 'success', message: 'Vehicle maintenance summary by date range retrieved successfully', data: result });
};
