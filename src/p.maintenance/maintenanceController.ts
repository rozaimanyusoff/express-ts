// src/p.maintenance/maintenanceController.ts
import { Request, Response } from 'express';
import * as maintenanceModel from './maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import * as billingModel from '../p.billing/billingModel';
import * as crypto from 'crypto';
import * as mailer from '../utils/mailer';

/* ============== MAINTENANCE RECORDS MANAGEMENT =============== */

export const getMaintenanceRecords = async (req: Request, res: Response) => {
  try {
    // Support ?status={status} param (optional) - values: pending, verified, recommended, approved
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    
    const records = await maintenanceModel.getMaintenanceRecords(status);
    
    // Fetch all lookup data in parallel
    const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      billingModel.getWorkshops(),
      assetModel.getEmployees(),
      maintenanceModel.getMaintenanceTypes()
    ]);
    
    // Ensure arrays
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
    const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
    const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];

    // Build lookup maps for fast access
    const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
    const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
    const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    const svcTypeMap = new Map(svcTypes.map((svc: any) => [svc.svcTypeId, svc]));
    
    // Only return selected fields with nested structure
    const resolvedRecords = records.map((record: any) => {
      // Parse svc_opt (comma-separated IDs) and resolve to service type objects
      const svcTypeIds = record.svc_opt ? record.svc_opt.split(',').map((id: string) => parseInt(id.trim())) : [];
      
      const svcTypeArray = svcTypeIds
        .filter((id: number) => svcTypeMap.has(id))
        .map((id: number) => {
          const svcType = svcTypeMap.get(id);
          return {
            id: svcType.svcTypeId,
            name: svcType.svcType
          };
        });

      return {
        req_id: record.req_id,
        req_date: record.req_date,
        svc_type: svcTypeArray,
        req_comment: record.req_comment,
        upload_date: record.upload_date,
        verification_date: record.verification_date,
        recommendation_date: record.recommendation_date,
        approval_date: record.approval_date,
        form_upload_date: record.form_upload_date,
        emailStat: record.emailStat,
        inv_status: record.inv_status,
        status: record.status,
        vehicle: assetMap.has(record.vehicle_id) ? {
          id: record.vehicle_id,
          register_number: (assetMap.get(record.vehicle_id) as any)?.register_number
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
      };
    });
    
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
    const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      billingModel.getWorkshops(),
      assetModel.getEmployees(),
      maintenanceModel.getMaintenanceTypes()
    ]);
    
    // Ensure arrays
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
    const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
    const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];
    
    // Build lookup maps for fast access
    const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
    const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
    const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    const svcTypeMap = new Map(svcTypes.map((svc: any) => [svc.svcTypeId, svc]));

    // Parse svc_opt and resolve to service type objects
    const svcTypeIds = (record as any).svc_opt ? (record as any).svc_opt.split(',').map((id: string) => parseInt(id.trim())) : [];
    const svcTypeArray = svcTypeIds
      .filter((id: number) => svcTypeMap.has(id))
      .map((id: number) => {
        const svcType = svcTypeMap.get(id);
        return {
          id: svcType.svcTypeId,
          name: svcType.svcType
        };
      });

    // Build resolved record with nested structure
    const resolvedRecord = {
      req_id: (record as any).req_id,
      req_date: (record as any).req_date,
      svc_type: svcTypeArray,
      req_comment: (record as any).req_comment,
      upload_date: (record as any).upload_date,
      verification_date: (record as any).verification_date,
      recommendation_date: (record as any).recommendation_date,
      approval_date: (record as any).approval_date,
      form_upload_date: (record as any).form_upload_date,
      emailStat: (record as any).emailStat,
      inv_status: (record as any).inv_status,
      status: (record as any).status,
      vehicle: assetMap.has((record as any).vehicle_id) ? {
        id: (record as any).vehicle_id,
        register_number: (assetMap.get((record as any).vehicle_id) as any)?.register_number
      } : null,
      requester: employeeMap.has((record as any).ramco_id) ? {
        ramco_id: (record as any).ramco_id,
        name: (employeeMap.get((record as any).ramco_id) as any)?.full_name,
        email: (employeeMap.get((record as any).ramco_id) as any)?.email,
        contact: (employeeMap.get((record as any).ramco_id) as any)?.contact
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

/* ============== ADDITIONAL MAINTENANCE CONTROLLERS =============== */

export const forceInvoiceMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    const result = await maintenanceModel.forceInvoiceMaintenanceRecord(Number(requestId));
    
    res.json({
      status: 'success',
      message: 'Invoice created successfully for maintenance record',
      data: result
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return res.status(409).json({
        status: 'error',
        message: 'Invoice already exists for this maintenance record',
        data: null
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const resendMaintenancePortalLink = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    // TEST EMAIL CONSTANTS - Replace with your email for testing
    const TEST_EMAIL = 'rozaimanyusoff@gmail.com'; // Replace with your test email
    const TEST_NAME = 'Rozaiman'; // Replace with your test name
    
    // Get maintenance record details
    const record = await maintenanceModel.getMaintenanceRecordById(Number(requestId));
    
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Maintenance record not found',
        data: null
      });
    }
    
    // Get requester details
    const employees = await assetModel.getEmployees();
    const employeeArray = Array.isArray(employees) ? employees : [];
    const requester = employeeArray.find((emp: any) => emp.ramco_id === (record as any).ramco_id);
    
    if (!requester) {
      return res.status(404).json({
        status: 'error',
        message: 'Requester not found',
        data: null
      });
    }
    
    // Create encrypted credential
    const credData = {
      ramco_id: (requester as any).ramco_id,
      contact: (requester as any).email || (requester as any).phone || ''
    };
    
    const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(credData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedData = iv.toString('hex') + ':' + encrypted;
    
    // Build portal URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?_cred=${encodeURIComponent(encryptedData)}`;
    
    // Send email to requester (or test email)
    const emailSubject = 'Vehicle Maintenance Request Portal Access';
    const emailBody = `
      <h3>Maintenance Request Portal Access</h3>
      <p>Dear ${TEST_NAME || (requester as any).full_name || (requester as any).name},</p>
      <p>You can access your maintenance request portal using the link below:</p>
      <p><a href="${portalUrl}" target="_blank">Access Maintenance Portal</a></p>
      <p>Request ID: ${requestId}</p>
      <p>Original Requester: ${(requester as any).full_name || (requester as any).name} (${(requester as any).ramco_id})</p>
      <p>If you have any questions, please contact our maintenance team.</p>
      <br>
      <p>Best regards,<br>Maintenance Team</p>
    `;
    
    // Use test email or actual requester email
    const recipientEmail = TEST_EMAIL || (requester as any).email;
    
    await mailer.sendMail(recipientEmail, emailSubject, emailBody);
    
    res.json({
      status: 'success',
      message: 'Portal link sent successfully',
      data: {
        requestId: Number(requestId),
        sentTo: recipientEmail,
        portalUrl,
        testMode: !!TEST_EMAIL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null
    });
  }
};

export const getMaintenanceRecordsByVehicle = async (req: Request, res: Response) => {
  try {
    const { vehicle_id } = req.params;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    
    const records = await maintenanceModel.getMaintenanceRecordsByVehicleId(Number(vehicle_id), status);
    
    // Fetch all lookup data in parallel
    const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      billingModel.getWorkshops(),
      assetModel.getEmployees(),
      maintenanceModel.getMaintenanceTypes()
    ]);
    
    // Ensure arrays
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
    const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
    const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];

    // Build lookup maps for fast access
    const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
    const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
    const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    const svcTypeMap = new Map(svcTypes.map((svc: any) => [svc.svcTypeId, svc]));
    
    // Only return selected fields with nested structure
    const resolvedRecords = records.map((record: any) => {
      // Parse svc_opt (comma-separated IDs) and resolve to service type objects
      const svcTypeIds = record.svc_opt ? record.svc_opt.split(',').map((id: string) => parseInt(id.trim())) : [];
      
      const svcTypeArray = svcTypeIds
        .filter((id: number) => svcTypeMap.has(id))
        .map((id: number) => {
          const svcType = svcTypeMap.get(id);
          return {
            id: svcType.svcTypeId,
            name: svcType.svcType
          };
        });

      return {
        req_id: record.req_id,
        req_date: record.req_date,
        svc_type: svcTypeArray,
        req_comment: record.req_comment,
        upload_date: record.upload_date,
        verification_date: record.verification_date,
        recommendation_date: record.recommendation_date,
        approval_date: record.approval_date,
        form_upload_date: record.form_upload_date,
        emailStat: record.emailStat,
        inv_status: record.inv_status,
        status: record.status,
        vehicle: assetMap.has(record.vehicle_id) ? {
          id: record.vehicle_id,
          register_number: (assetMap.get(record.vehicle_id) as any)?.register_number
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
      };
    });
    
    res.json({
      status: 'success',
      message: `Maintenance records for vehicle ${vehicle_id} retrieved successfully`,
      data: resolvedRecords,
      count: resolvedRecords.length
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
