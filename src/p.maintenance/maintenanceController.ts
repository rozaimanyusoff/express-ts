// src/p.maintenance/maintenanceController.ts
import { Request, Response } from 'express';
import * as maintenanceModel from './maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import * as billingModel from '../p.billing/billingModel';
import * as crypto from 'crypto';
import * as mailer from '../utils/mailer';

/* ============== MAINTENANCE RECORDS MANAGEMENT =============== */

export const getVehicleMtnRequests = async (req: Request, res: Response) => {
	try {
		// Support ?status={status} param (optional) - values: pending, verified, recommended, approved
		const status = typeof req.query.status === 'string' ? req.query.status : undefined;

		const records = await maintenanceModel.getVehicleMtnRequests(status);

		// Fetch all lookup data in parallel
		const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
			assetModel.getAssets(),
			assetModel.getCostcenters(),
			billingModel.getWorkshops(),
			assetModel.getEmployees(),
			maintenanceModel.getServiceTypes()
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

export const getVehicleMtnRequestById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const record = await maintenanceModel.getVehicleMtnRequestById(Number(id));

		if (!record) {
			return res.status(404).json({
				status: 'error',
				message: 'Maintenance record not found',
				data: null
			});
		}

		// Fetch all lookup data in parallel
		const [assetsRaw, categoriesRaw, brandsRaw, modelsRaw, costcentersRaw, locationsRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
			assetModel.getAssets(),
			assetModel.getCategories(),
			assetModel.getBrands(),
			assetModel.getModels(),
			assetModel.getCostcenters(),
			assetModel.getLocations(),
			billingModel.getWorkshops(),
			assetModel.getEmployees(),
			maintenanceModel.getServiceTypes()
		]);

		// Ensure arrays
		const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
		const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
		const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
		const models = Array.isArray(modelsRaw) ? modelsRaw : [];
		const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
		const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
		const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
		const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
		const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];

		// Build lookup maps for fast access
		const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
		const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
		const brandMap = new Map(brands.map((brand: any) => [brand.id, brand]));
		const modelMap = new Map(models.map((m: any) => [m.id, m]));
		const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
		const locationMap = new Map(locations.map((loc: any) => [loc.id, loc]));
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
				asset: assetMap.has((record as any).asset_id) ? (() => {
					const a = assetMap.get((record as any).asset_id) as any;
					return {
						id: (record as any).asset_id,
						register_number: a?.register_number,
						classification: a?.classification,
						record_status: a?.record_status,
						purchase_date: a?.purchase_date,
						// asset age in full years calculated from purchase_date
						age_years: (() => {
							if (!a?.purchase_date) return null;
							const pd = new Date(a.purchase_date);
							if (Number.isNaN(pd.getTime())) return null;
							const diffMs = Date.now() - pd.getTime();
							const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
							return years;
						})(),
						category: a?.category_id ? { id: a.category_id, name: (categoryMap.get(a.category_id) as any)?.name } : null,
						brand: a?.brand_id ? { id: a.brand_id, name: (brandMap.get(a.brand_id) as any)?.name } : null,
						model: a?.model_id ? { id: a.model_id, name: (modelMap.get(a.model_id) as any)?.name } : null,
						costcenter: a?.costcenter_id ? { id: a.costcenter_id, name: (ccMap.get(a.costcenter_id) as any)?.name } : null,
							location: a?.location_id ? { id: a.location_id, name: (locationMap.get(a.location_id) as any)?.name } : null
					};
				})() : null,
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

export const createVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const recordData = req.body;
		const result = await maintenanceModel.createVehicleMtnRequest(recordData);

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

export const updateVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const recordData = req.body;
		const result = await maintenanceModel.updateVehicleMtnRequest(Number(id), recordData);

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

export const deleteVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await maintenanceModel.deleteVehicleMtnRequest(Number(id));

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

export const getServiceTypes = async (req: Request, res: Response) => {
	try {
		const types = await maintenanceModel.getServiceTypes();

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

export const getServiceTypeById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const type = await maintenanceModel.getServiceTypeById(Number(id));

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

export const createServiceType = async (req: Request, res: Response) => {
	try {
		const typeData = req.body;
		const result = await maintenanceModel.createServiceType(typeData);

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

export const updateServiceType = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const typeData = req.body;
		const result = await maintenanceModel.updateServiceType(Number(id), typeData);

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

export const deleteServiceType = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await maintenanceModel.deleteServiceType(Number(id));

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

export const pushVehicleMtnToBilling = async (req: Request, res: Response) => {
	try {
		const { requestId } = req.params;

		const result = await maintenanceModel.pushVehicleMtnToBilling(Number(requestId));

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
		const record = await maintenanceModel.getVehicleMtnRequestById(Number(requestId));

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

export const getVehicleMtnRequestByAssetId = async (req: Request, res: Response) => {
	try {
		const { asset_id } = req.params;
		const status = typeof req.query.status === 'string' ? req.query.status : undefined;

		// Normalize and validate asset id to avoid passing NaN into SQL queries
		const assetId = Number(asset_id);
		if (!Number.isFinite(assetId) || assetId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid asset_id', data: null });
		}

		const records = await maintenanceModel.getVehicleMtnRequestByAssetId(assetId, status);

		// Fetch all lookup data in parallel
		const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw, billingRaw] = await Promise.all([
			assetModel.getAssets(),
			assetModel.getCostcenters(),
			billingModel.getWorkshops(),
			assetModel.getEmployees(),
			maintenanceModel.getServiceTypes(),
			billingModel.getVehicleMtnBillings()
		]);

		// Ensure arrays
		const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
		const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
		const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
		const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
		const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];
		// billingRaw is all billings; filter to items related to this asset (some schemas use vehicle_id)
		const allBillings = Array.isArray(billingRaw) ? billingRaw : (billingRaw ? [billingRaw] : []);
		const billingData = allBillings.filter((inv: any) => {
			// prefer asset_id, fallback to vehicle_id
			if (inv.asset_id !== undefined && inv.asset_id !== null) return Number(inv.asset_id) === assetId;
			if (inv.vehicle_id !== undefined && inv.vehicle_id !== null) return Number(inv.vehicle_id) === assetId;
			// if neither present, include invoices that reference the asset via svc_order containing the req_id later
			return true;
		});

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

		// Normalize billing entries for consistent shape
		const normalizedBilling = (billingData || []).map((inv: any) => ({
			inv_id: inv.inv_id,
			req_id: inv.req_id,
			svc_order: inv.svc_order,
			inv_no: inv.inv_no,
			inv_date: inv.inv_date,
			odometer: inv.odometer || inv.svc_odo || null,
			inv_total: inv.inv_total,
			inv_stat: inv.inv_stat,
			inv_remarks: inv.inv_remarks || null
		}));

		// Attach matching invoices to each record (match by svc_order or req_id)
		const finalRecords = resolvedRecords.map((rec: any) => {
			const matchedInvoices = normalizedBilling.filter((inv: any) => {
				const svcOrderMatch = inv.svc_order !== undefined && String(inv.svc_order) === String(rec.req_id);
				const reqIdMatch = inv.req_id !== undefined && String(inv.req_id) === String(rec.req_id);
				return svcOrderMatch || reqIdMatch;
			});

			// Use first matched invoice as single object (field name 'billings') to match expected output
			const billingObj = matchedInvoices.length > 0 ? matchedInvoices[0] : null;

			return { ...rec, invoice: billingObj };
		});

		// Resolve register_number for message and include in response
		const register_number = assetMap.has(assetId) ? (assetMap.get(assetId) as any)?.register_number : null;

		res.json({
			status: 'success',
			message: `Maintenance records for vehicle ${assetId}${register_number ? ' (' + register_number + ')' : ''} retrieved successfully`,
			assetId,
			register_number,
			data: finalRecords,
			count: finalRecords.length
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
