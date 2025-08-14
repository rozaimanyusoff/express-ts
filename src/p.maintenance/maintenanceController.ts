// src/p.maintenance/maintenanceController.ts
import { Request, Response } from 'express';
import * as maintenanceModel from './maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import * as billingModel from '../p.billing/billingModel';

/* ============== MAINTENANCE RECORDS MANAGEMENT =============== */

export const getMaintenanceRecords = async (req: Request, res: Response) => {
  try {
    // Support ?status={status} param (optional) - values: pending, verified, recommended, approved
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    
    const records = await maintenanceModel.getMaintenanceRecords(status);
    
    // Fetch all lookup data in parallel
    const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      billingModel.getWorkshops(),
      assetModel.getEmployees()
    ]);
    
    // Ensure arrays
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
    const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
    
    // Build lookup maps for fast access
    const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
    const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
    const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    
    // Only return selected fields with nested structure
    const resolvedRecords = records.map((record: any) => ({
      ...record,
      vehicle: assetMap.has(record.vehicle_id) ? {
        id: record.vehicle_id,
        asset_code: (assetMap.get(record.vehicle_id) as any)?.asset_code,
        asset_name: (assetMap.get(record.vehicle_id) as any)?.asset_name,
        vehicle_regno: (assetMap.get(record.vehicle_id) as any)?.vehicle_regno
      } : null,
      requester: employeeMap.has(record.ramco_id) ? {
        ramco_id: record.ramco_id,
        name: (employeeMap.get(record.ramco_id) as any)?.full_name,
        email: (employeeMap.get(record.ramco_id) as any)?.email
      } : null,
      recommendation_by: employeeMap.has(record.recommendation) ? {
        ramco_id: record.recommendation,
        name: (employeeMap.get(record.recommendation) as any)?.full_name,
        email: (employeeMap.get(record.recommendation) as any)?.email
      } : null,
      approval_by: employeeMap.has(record.approval) ? {
        ramco_id: record.approval,
        name: (employeeMap.get(record.approval) as any)?.full_name,
        email: (employeeMap.get(record.approval) as any)?.email
      } : null,
      costcenter: ccMap.has(record.cc_id) ? {
        id: record.cc_id,
        name: (ccMap.get(record.cc_id) as any)?.name
      } : null,
      workshop: wsMap.has(record.ws_id) ? {
        id: record.ws_id,
        name: (wsMap.get(record.ws_id) as any)?.ws_name
      } : null
    }));
    
    res.json({
      status: 'success',
      message: 'Maintenance records data retrieved successfully',
      data: resolvedRecords
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const getMaintenanceRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await maintenanceModel.getMaintenanceRecordById(Number(id));
    
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Maintenance record not found',
        data: null
      });
    }

    // Fetch all lookup data in parallel
    const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      billingModel.getWorkshops(),
      assetModel.getEmployees()
    ]);
    
    // Ensure arrays
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
    const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
    
    // Build lookup maps for fast access
    const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
    const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
    const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    // Build resolved record with nested structure
    const resolvedRecord = {
      ...(record as any),
      vehicle: assetMap.has((record as any).vehicle_id) ? {
        id: (record as any).vehicle_id,
        asset_code: (assetMap.get((record as any).vehicle_id) as any)?.asset_code,
        asset_name: (assetMap.get((record as any).vehicle_id) as any)?.asset_name,
        vehicle_regno: (assetMap.get((record as any).vehicle_id) as any)?.vehicle_regno
      } : null,
      requester: employeeMap.has((record as any).ramco_id) ? {
        ramco_id: (record as any).ramco_id,
        name: (employeeMap.get((record as any).ramco_id) as any)?.full_name,
        email: (employeeMap.get((record as any).ramco_id) as any)?.email
      } : null,
      recommendation_by: employeeMap.has((record as any).recommendation) ? {
        ramco_id: (record as any).recommendation,
        name: (employeeMap.get((record as any).recommendation) as any)?.full_name,
        email: (employeeMap.get((record as any).recommendation) as any)?.email
      } : null,
      approval_by: employeeMap.has((record as any).approval) ? {
        ramco_id: (record as any).approval,
        name: (employeeMap.get((record as any).approval) as any)?.full_name,
        email: (employeeMap.get((record as any).approval) as any)?.email
      } : null,
      costcenter: ccMap.has((record as any).cc_id) ? {
        id: (record as any).cc_id,
        name: (ccMap.get((record as any).cc_id) as any)?.name
      } : null,
      workshop: wsMap.has((record as any).ws_id) ? {
        id: (record as any).ws_id,
        name: (wsMap.get((record as any).ws_id) as any)?.ws_name
      } : null
    };
    
    res.json({
      status: 'success',
      message: 'Maintenance record data retrieved successfully',
      data: resolvedRecord
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const createMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const recordData = req.body;
    const result = await maintenanceModel.createMaintenanceRecord(recordData);
    
    res.status(201).json({
      status: 'success',
      message: 'Maintenance record created successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const updateMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recordData = req.body;
    const result = await maintenanceModel.updateMaintenanceRecord(Number(id), recordData);
    
    res.json({
      status: 'success',
      message: 'Maintenance record updated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const deleteMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await maintenanceModel.deleteMaintenanceRecord(Number(id));
    
    res.json({
      status: 'success',
      message: 'Maintenance record deleted successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

/* ============== MAINTENANCE TYPES MANAGEMENT =============== */

export const getMaintenanceTypes = async (req: Request, res: Response) => {
  try {
    const types = await maintenanceModel.getMaintenanceTypes();
    
    res.json({
      status: 'success',
      message: 'Maintenance types data retrieved successfully',
      data: types
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const getMaintenanceTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await maintenanceModel.getMaintenanceTypeById(Number(id));
    
    if (!type) {
      return res.status(404).json({
        status: 'error',
        message: 'Maintenance type not found',
        data: null
      });
    }
    
    res.json({
      status: 'success',
      message: 'Maintenance type data retrieved successfully',
      data: type
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const createMaintenanceType = async (req: Request, res: Response) => {
  try {
    const typeData = req.body;
    const result = await maintenanceModel.createMaintenanceType(typeData);
    
    res.status(201).json({
      status: 'success',
      message: 'Maintenance type created successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const updateMaintenanceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const typeData = req.body;
    const result = await maintenanceModel.updateMaintenanceType(Number(id), typeData);
    
    res.json({
      status: 'success',
      message: 'Maintenance type updated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const deleteMaintenanceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await maintenanceModel.deleteMaintenanceType(Number(id));
    
    res.json({
      status: 'success',
      message: 'Maintenance type deleted successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

/* ============== ADD MORE CONTROLLERS HERE =============== */

// Placeholder for additional controllers - will be implemented based on your requirements
// Example:
// export const getMaintenanceSchedules = async (req: Request, res: Response) => { ... };
// export const getTechnicians = async (req: Request, res: Response) => { ... };
// export const getMaintenanceByAsset = async (req: Request, res: Response) => { ... };
// export const getMaintenanceByDateRange = async (req: Request, res: Response) => { ... };
