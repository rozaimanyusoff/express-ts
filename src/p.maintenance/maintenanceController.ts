// src/p.maintenance/maintenanceController.ts
import { Request, Response } from 'express';
import * as maintenanceModel from './maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import { toDbPath, buildStoragePath, safeMove, sanitizeFilename, toPublicUrl } from '../utils/uploadUtil';
import dayjs from 'dayjs';
import * as path from 'path';
import * as userModel from '../p.user/userModel';
import * as billingModel from '../p.billing/billingModel';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as mailer from '../utils/mailer';
import vehicleMaintenanceEmail from '../utils/emailTemplates/vehicleMaintenanceRequest';
import vehicleMaintenanceAuthorizationEmail from '../utils/emailTemplates/vehicleMaintenanceAuthorization';
import { buildSectionsForRecord, getAdminCcList } from '../utils/maintenanceEmailHelper';
import poolCarApplicantEmail from '../utils/emailTemplates/poolCarApplicant';
import poolCarSupervisorEmail from '../utils/emailTemplates/poolCarSupervisor';
import { getSupervisorBySubordinate } from '../utils/employeeHelper';
import { getWorkflowPic } from '../utils/workflowHelper';
import { sendRecommendationEmail, sendApprovalEmail, sendRequesterApprovalEmail } from '../utils/workflowService';
import { getSocketIOInstance } from '../utils/socketIoInstance';
import * as notificationService from '../utils/notificationService';

// Admin CC list for pool car submission notifications (comma-separated in env or define directly)
const POOLCAR_ADMIN_CC: string[] = (process.env.POOLCAR_ADMIN_CC || '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

// Helper: compute API base URL ensuring '/api' prefix exists
function getApiBaseUrl(): string {
	const root = (process.env.BACKEND_URL || process.env.BE_URL || 'http://localhost:3030').trim();
	const noTrail = root.replace(/\/$/, '');
	const hasApi = /\/api$/i.test(noTrail);
	return hasApi ? noTrail : `${noTrail}/api`;
}

/* ================== BADGE INDICATOR / UNSEEN BILLS COUNT ================== */
/**
 * GET /api/mtn/bills/unseen-count
 * Returns count of new/unprocessed maintenance form uploads awaiting billing
 * Scoped to current user (ramco_id from auth context)
 */
export const getUnseenBillsCount = async (req: Request, res: Response) => {
	try {
		// Get current user ID from auth context (optional)
		const userId = (req as any).user?.userId ?? (req as any).userId;
		
		// Query count - scoped to current user if provided, otherwise global count
		const count = await maintenanceModel.getUnseenBillsCount(userId || undefined);

		return res.json({
			status: 'success',
			message: 'Unseen bills count retrieved successfully',
			data: { count }
		});
	} catch (error) {
		console.error('Error getting unseen bills count:', error);
		return res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Failed to get unseen bills count',
			data: { count: 0 }
		});
	}
};


export const getInsurances = async (req: Request, res: Response) => {
	try {
		const insurances = await maintenanceModel.getInsurances();
		const insArray = Array.isArray(insurances) ? insurances : (insurances ? [insurances] : []);

		res.json({ status: 'success', message: `Insurances fetched successfully with ${insArray.length} entries`, data: insurances });
	} catch (error) {
		// include error from backend
		console.error('Error fetching insurances:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const getInsuranceById = async (req: Request, res: Response) => {
	const { id } = req.params;
	try {
		const insurance = await maintenanceModel.getInsuranceById(Number(id));
		if (!insurance) {
			res.status(404).json({ error: 'Insurance not found' });
			return;
		}

		// Fetch related roadtax records to resolve linked assets, then map to { id, register_number }
		const rtsRaw = await maintenanceModel.getRoadTaxByInsuranceId(Number(id));
		const rts = Array.isArray(rtsRaw) ? rtsRaw as any[] : (rtsRaw ? [rtsRaw] as any[] : []);
		const assetIds = Array.from(new Set(
			rts
				.map((r: any) => Number(r.asset_id))
				.filter((n: any) => Number.isFinite(n) && n > 0)
		));

		let assetsArr: any[] = [];
		if (assetIds.length > 0) {
			try {
				const assetsRaw = await assetModel.getAssetsByIds(assetIds);
				const assets = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
				const assetMap = new Map(assets.map((a: any) => [Number(a.id), a]));
				assetsArr = assetIds
					.map((aid) => {
						const a = assetMap.get(aid);
						if (!a) return null;
						return { asset_id: aid, register_number: (a as any).register_number || null };
					})
					.filter(Boolean) as any[];
			} catch (e) {
				// If asset lookup fails, continue with empty assets array
				assetsArr = [];
			}
		}

		const data = { ...(insurance as any), assets: assetsArr };
		res.json({ status: 'success', message: 'Insurance fetched successfully', data });
	} catch (error) {
		console.error('Error fetching insurance by ID:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const createInsurance = async (req: Request, res: Response) => {
	const body = req.body || {};
	try {
		// Normalize payload
		const insurer = body.insurer ?? body.company ?? body.name ?? null;
		const policy = body.policy ?? body.policy_no ?? body.ins_policy ?? null;
		const expiry = body.expiry ?? body.expiry_date ?? body.exp_date ?? null;
	const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
	const assetIds: number[] = Array.from(new Set<number>(assetsRaw.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)));

		// Create insurance
		const insertId = await maintenanceModel.createInsurance({ insurer, policy, expiry });

		// Link assets in roadtax table by setting insurance_id for provided assets
		let updateResult: any = null;
		if (assetIds.length > 0) {
			updateResult = await maintenanceModel.updateRoadTaxByAssets(Number(insertId), assetIds);
		}

		res.status(201).json({
			status: 'success',
			message: 'Insurance created and roadtax updated successfully',
			data: {
				id: Number(insertId),
				insurer,
				policy,
				expiry,
				assets: assetIds,
				roadtax_updates: updateResult
			}
		});
	} catch (error) {
		console.error('Error creating insurance:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateInsurance = async (req: Request, res: Response) => {
	const { id } = req.params;
	const body = req.body || {};
	try {
		// Normalize payload
		const insurer = (body.insurer ?? body.company ?? body.name) as string | undefined;
		const policy = (body.policy ?? body.policy_no ?? body.ins_policy) as string | undefined;
		const expiry = (body.expiry ?? body.expiry_date ?? body.exp_date) as string | undefined;
	const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
	const assetIds: number[] = Array.from(new Set<number>(assetsRaw.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)));

		// Build update object only with provided fields
		const payload: any = {};
		if (insurer !== undefined) payload.insurer = insurer;
		if (policy !== undefined) payload.policy = policy;
		if (expiry !== undefined) payload.expiry = expiry;

		const updatedInsurance = Object.keys(payload).length > 0
			? await maintenanceModel.updateInsurance(Number(id), payload)
			: { affectedRows: 0 } as any;

		// Update roadtax insurance_id for provided assets (if any)
		let updateResult: any = null;
		if (assetIds.length > 0) {
			updateResult = await maintenanceModel.updateRoadTaxByAssets(Number(id), assetIds);
		}

		res.json({
			status: 'success',
			message: 'Insurance updated successfully',
			data: {
				id: Number(id),
				...payload,
				assets: assetIds,
				roadtax_updates: updateResult,
				insurance_update: updatedInsurance
			}
		});
	} catch (error) {
		console.error('Error updating insurance:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const deleteInsurance = async (req: Request, res: Response) => {
	const { id } = req.params;
	try {
		const deleted = await maintenanceModel.deleteInsurance(Number(id));
		if (deleted) {
			// Return message on successful deletion
			res.status(204).send({ message: 'Insurance deleted successfully' });
		} else {
			res.status(404).json({ error: 'Insurance not found' });
		}
	} catch (error) {
		console.error('Error deleting insurance:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

/* ============= ROAD TAX ================== */
// Road tax CRUD operations will be here when database structure is provided
export const getRoadTaxes = async (req: Request, res: Response) => {
	try {
		const roadTaxes = await maintenanceModel.getRoadTaxes();
		const rtArray = Array.isArray(roadTaxes) ? roadTaxes as any[] : (roadTaxes ? [roadTaxes] as any[] : []);

		// Fetch lookups to enrich nested structures
		const [insurancesRaw, assetsRaw, categoriesRaw, brandsRaw, costcentersRaw, departmentsRaw, locationsRaw] = await Promise.all([
			maintenanceModel.getInsurances(),
			assetModel.getAssets(),
			assetModel.getCategories(),
			assetModel.getBrands(),
			assetModel.getCostcenters(),
			(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
			assetModel.getLocations()
		]);

		const insMap = new Map((Array.isArray(insurancesRaw) ? insurancesRaw : []).map((i: any) => [Number(i.id), i]));
		const assetMap = new Map((Array.isArray(assetsRaw) ? assetsRaw : []).map((a: any) => [Number(a.id), a]));
		const catMap = new Map((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [Number(c.id), c]));
		const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [Number(b.id), b]));
		const ccMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((cc: any) => [Number(cc.id), cc]));
		const deptMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
		const locMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));

		const data = rtArray.map((r: any) => {
			const ins = insMap.get(Number(r.insurance_id));
			const asset = assetMap.get(Number(r.asset_id));
			const insurance = ins ? {
				id: Number(ins.id),
				insurer: ins.insurer ?? ins.company ?? ins.name ?? null,
				policy: (ins.policy) ?? null,
				expiry: (ins.expiry) ?? null,
				upload: r.ins_upload || null
			} : null;
			const assetObj = asset ? {
				id: Number(r.asset_id),
				register_number: asset.register_number || null,
				costcenter: asset.costcenter_id ? { id: Number(asset.costcenter_id), name: (ccMap.get(Number(asset.costcenter_id)) as any)?.name || null } : null,
				department: asset.department_id ? { id: Number(asset.department_id), name: (deptMap.get(Number(asset.department_id)) as any)?.code || null } : null,
				location: asset.location_id ? { id: Number(asset.location_id), name: (locMap.get(Number(asset.location_id)) as any)?.name || null } : null,
				category: asset.category_id ? { id: Number(asset.category_id), name: (catMap.get(Number(asset.category_id)) as any)?.name || null } : null,
				brand: asset.brand_id ? { id: Number(asset.brand_id), name: (brandMap.get(Number(asset.brand_id)) as any)?.name || null } : null
			} : null;
			return {
				rt_id: Number(r.rt_id ?? r.id ?? r.rtId ?? 0) || r.rt_id,
				insurance,
				asset: assetObj,
				roadtax_expiry: r.rt_exp ?? r.roadtax_expiry ?? r.expiry_date ?? null
			};
		});

		res.json({ status: 'success', message: `Road taxes fetched successfully with ${data.length} entries`, data });
	} catch (error) {
		// include error from backend
		console.error('Error fetching road taxes:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const getRoadTaxById = async (req: Request, res: Response) => {
	const { id } = req.params;
	try {
		const r = await maintenanceModel.getRoadTaxById(Number(id));
		if (!r) {
			res.status(404).json({ error: 'Road tax not found' });
			return;
		}
		// Enrich single record
		const [ins, assetsRaw, categoriesRaw, brandsRaw, costcentersRaw, departmentsRaw, locationsRaw] = await Promise.all([
			r.insurance_id ? maintenanceModel.getInsuranceById(Number(r.insurance_id)) : Promise.resolve(null),
			assetModel.getAssetsByIds([Number(r.asset_id)]),
			assetModel.getCategories(),
			assetModel.getBrands(),
			assetModel.getCostcenters(),
			(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
			assetModel.getLocations()
		]);
		const asset = (Array.isArray(assetsRaw) ? assetsRaw : [assetsRaw]).find((a: any) => Number(a?.id) === Number(r.asset_id));
		const catMap = new Map((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [Number(c.id), c]));
		const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [Number(b.id), b]));
		const ccMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((cc: any) => [Number(cc.id), cc]));
		const deptMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
		const locMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));

		const insurance = ins ? {
			id: Number((ins as any).id),
			insurer: (ins as any).insurer ?? (ins as any).company ?? (ins as any).name ?? null,
			policy: (((ins as any).ins_policy ?? (ins as any).policy_no) ?? (ins as any).policy) ?? null,
			expiry: (((ins as any).expiry ?? (ins as any).expiry_date) ?? (ins as any).exp_date) ?? null,
			upload: (r as any).ins_upload || null
		} : null;
		const assetObj = asset ? {
			id: Number((r as any).asset_id),
			register_number: (asset as any).register_number || null,
			costcenter: (asset as any).costcenter_id ? { id: Number((asset as any).costcenter_id), name: (ccMap.get(Number((asset as any).costcenter_id)) as any)?.name || null } : null,
			department: (asset as any).department_id ? { id: Number((asset as any).department_id), name: (deptMap.get(Number((asset as any).department_id)) as any)?.code || null } : null,
			location: (asset as any).location_id ? { id: Number((asset as any).location_id), name: (locMap.get(Number((asset as any).location_id)) as any)?.name || null } : null,
			category: (asset as any).category_id ? { id: Number((asset as any).category_id), name: (catMap.get(Number((asset as any).category_id)) as any)?.name || null } : null,
			brand: (asset as any).brand_id ? { id: Number((asset as any).brand_id), name: (brandMap.get(Number((asset as any).brand_id)) as any)?.name || null } : null
		} : null;

		const data = {
			rt_id: Number((r as any).rt_id ?? (r as any).id ?? 0) || (r as any).rt_id,
			insurance,
			asset: assetObj,
			roadtax_expiry: (r as any).rt_exp ?? (r as any).roadtax_expiry ?? (r as any).expiry_date ?? null
		};

		res.json({ status: 'success', message: 'Road tax fetched successfully', data });
	} catch (error) {
		console.error('Error fetching road tax by ID:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const createRoadTax = async (req: Request, res: Response) => {
	const body = req.body || {};
	try {
		// Support bulk update: { rt_exp, assets: [] }
		const rtExp = (body.rt_exp ?? body.roadtax_expiry ?? body.expiry_date ?? null) as string | null;
		const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
		const assetIds: number[] = Array.from(new Set<number>(assetsRaw.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)));

		if (rtExp && assetIds.length > 0) {
			const result = await maintenanceModel.updateRoadTaxExpiryByAssets(rtExp, assetIds);
			return res.status(201).json({
				status: 'success',
				message: 'Road tax expiry updated successfully for provided assets',
				data: { rt_exp: rtExp, assets: assetIds, result }
			});
		}

		// Fallback: create a single roadtax row if full data provided
		const newRoadTax = await maintenanceModel.createRoadTax(body);
		res.status(201).json({ status: 'success', message: 'Road tax created successfully', data: newRoadTax });
	} catch (error) {
		console.error('Error creating road tax:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateRoadTax = async (req: Request, res: Response) => {
	const { id } = req.params;
	const body = req.body || {};
	try {
		// If assets array provided, perform bulk rt_exp update; else update by rt_id
		const rtExp = (body.rt_exp ?? body.roadtax_expiry ?? body.expiry_date ?? null) as string | null;
		const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
		const assetIds: number[] = Array.from(new Set<number>(assetsRaw.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)));

		if (rtExp && assetIds.length > 0) {
			const result = await maintenanceModel.updateRoadTaxExpiryByAssets(rtExp, assetIds);
			return res.json({
				status: 'success',
				message: 'Road tax expiry updated successfully for provided assets',
				data: { rt_exp: rtExp, assets: assetIds, result }
			});
		}

		const updatedRoadTax = await maintenanceModel.updateRoadTax(Number(id), body);
		if (updatedRoadTax) {
			res.json({ status: 'success', message: 'Road tax updated successfully', data: updatedRoadTax });
		} else {
			res.status(404).json({ error: 'Road tax not found' });
		}
	} catch (error) {
		console.error('Error updating road tax:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const deleteRoadTax = async (req: Request, res: Response) => {
	const { id } = req.params;
	try {
		const deleted = await maintenanceModel.deleteRoadTax(Number(id));
		if (deleted) {
			// Return message on successful deletion
			res.status(204).send({ message: 'Road tax deleted successfully' });
		} else {
			res.status(404).json({ error: 'Road tax not found' });
		}
	} catch (error) {
		console.error('Error deleting road tax:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

/* ============= VEHICLE MAINTENANCE REQUESTS ============== */

export const getVehicleMtnRequests = async (req: Request, res: Response) => {
	try {
		// Support ?status={status} param (optional) - values: pending, verified, recommended, approved
		const status = typeof req.query.status === 'string' ? req.query.status : undefined;
		const ramco = typeof req.query.ramco === 'string' ? req.query.ramco : undefined;
		// Support ?year=2025,2024 (comma-separated years) or omit
		let years: number[] | undefined = undefined;
		if (typeof req.query.year === 'string' && req.query.year.trim() !== '') {
			years = req.query.year
				.split(',')
				.map((s) => parseInt(s.trim(), 10))
				.filter((n) => Number.isFinite(n) && n >= 2000 && n <= 3000);
			if (years.length === 0) years = undefined;
		}
		// Support ?pendingstatus={verification|recommendation|approval}
		const pendingStatus = typeof req.query.pendingstatus === 'string' ? req.query.pendingstatus : undefined;

		const records = await maintenanceModel.getVehicleMtnRequests(status, ramco, years, pendingStatus);

		// Fetch all lookup data in parallel
		const [assetsRaw, costcentersRaw, workshopsRaw, employeesRaw, svcTypeRaw, billingsRaw] = await Promise.all([
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
		const allBillings = Array.isArray(billingsRaw) ? billingsRaw : (billingsRaw ? [billingsRaw] : []);
		// Build billing index by req_id/svc_order for quick lookup (prefer svc_order)
		const billingBySvcOrder = new Map<string, any>();
		const billingByReqId = new Map<string, any>();
		for (const inv of allBillings) {
			const invAny: any = inv as any;
			const so = invAny && invAny.svc_order !== undefined && invAny.svc_order !== null ? String(invAny.svc_order) : '';
			const rid = invAny && invAny.req_id !== undefined && invAny.req_id !== null ? String(invAny.req_id) : '';
			if (so && !billingBySvcOrder.has(so)) billingBySvcOrder.set(so, inv);
			if (rid && !billingByReqId.has(rid)) billingByReqId.set(rid, inv);
		}

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

			const base = {
				req_id: record.req_id,
				req_date: record.req_date,
				svc_type: svcTypeArray,
				req_comment: record.req_comment,
				upload_date: record.upload_date,
				verification_date: record.verification_date,
				recommendation_date: record.recommendation_date,
				approval_date: record.approval_date,
				form_upload_date: record.form_upload_date,
				drv_date: record.drv_date,
				emailStat: record.emailStat,
				inv_status: record.inv_status,
				status: record.status,
				// Use asset_id (vehicle_id is deprecated)
				asset: assetMap.has(record.asset_id) ? {
					id: record.asset_id,
					register_number: (assetMap.get(record.asset_id) as any)?.register_number
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
				// Use costcenter_id (cc_id is deprecated)
				costcenter: ccMap.has(record.costcenter_id) ? {
					id: record.costcenter_id,
					name: (ccMap.get(record.costcenter_id) as any)?.name
				} : null,
				workshop: wsMap.has(record.ws_id) ? {
					id: record.ws_id,
					name: (wsMap.get(record.ws_id) as any)?.ws_name
				} : null
			};
			const key = String(record.req_id);
			const invoice = billingBySvcOrder.get(key) || billingByReqId.get(key) || null;
			return { ...base, invoice };
		});

		const total = resolvedRecords.length;
		res.json({
			status: 'success',
			message: `Maintenance records data retrieved successfully (total: ${total})`,
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
		const [assetsRaw, categoriesRaw, brandsRaw, modelsRaw, costcentersRaw, departmentsRaw, locationsRaw, workshopsRaw, employeesRaw, svcTypeRaw, billingsRaw] = await Promise.all([
			assetModel.getAssets(),
			assetModel.getCategories(),
			assetModel.getBrands(),
			assetModel.getModels(),
			assetModel.getCostcenters(),
			(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
			assetModel.getLocations(),
			billingModel.getWorkshops(),
			assetModel.getEmployees(),
			maintenanceModel.getServiceTypes(),
			billingModel.getVehicleMtnBillings()
		]);

		// Ensure arrays
		const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
		const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
		const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
		const models = Array.isArray(modelsRaw) ? modelsRaw : [];
		const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
		const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
		const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
		const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
		const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
		const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];
		const allBillings = Array.isArray(billingsRaw) ? billingsRaw : (billingsRaw ? [billingsRaw] : []);
		const billingBySvcOrder = new Map<string, any>();
		const billingByReqId = new Map<string, any>();
		for (const inv of allBillings) {
			const invAny: any = inv as any;
			const so = invAny && invAny.svc_order !== undefined && invAny.svc_order !== null ? String(invAny.svc_order) : '';
			const rid = invAny && invAny.req_id !== undefined && invAny.req_id !== null ? String(invAny.req_id) : '';
			if (so && !billingBySvcOrder.has(so)) billingBySvcOrder.set(so, inv);
			if (rid && !billingByReqId.has(rid)) billingByReqId.set(rid, inv);
		}

		// Build lookup maps for fast access
		const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
		const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
		const brandMap = new Map(brands.map((brand: any) => [brand.id, brand]));
		const modelMap = new Map(models.map((m: any) => [m.id, m]));
		const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
		const locationMap = new Map(locations.map((loc: any) => [loc.id, loc]));
		const deptMap = new Map(departments.map((d: any) => [Number(d.id), d]));
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
			odo_start: (record as any).odo_start,
			odo_end: (record as any).odo_end,
			extra_mileage: (record as any).extra_mileage,
			late_notice: (record as any).late_notice,
			// Use asset_id (vehicle_id is deprecated)
			req_comment: (record as any).req_comment,
			req_upload: toPublicUrl((record as any).req_upload),
			upload_date: (record as any).upload_date,
			verification_comment: (record as any).verification_comment,
			verification_date: (record as any).verification_date,
			verification_stat: (record as any).verification_stat,
			recommendation_date: (record as any).recommendation_date,
			approval_date: (record as any).approval_date,
			status: (record as any).status,
			emailStat: (record as any).emailStat,
			inv_status: (record as any).inv_status,
			acceptance_status: (record as any).drv_stat,
			cancellation_comment: (record as any).drv_cancel_comment,
			form_upload: toPublicUrl((record as any).form_upload),
			form_upload_date: (record as any).form_upload_date,
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
					department: a?.department_id ? { id: a.department_id, name: (deptMap.get(Number(a.department_id)) as any)?.name } : null,
					location: a?.location_id ? { id: a.location_id, name: (locationMap.get(a.location_id) as any)?.name } : null
				};
			})() : null,
			requester: employeeMap.has((record as any).ramco_id) ? {
				ramco_id: (record as any).ramco_id,
				name: (employeeMap.get((record as any).ramco_id) as any)?.full_name,
				contact: (employeeMap.get((record as any).ramco_id) as any)?.contact
			} : null,
			recommendation_by: employeeMap.has((record as any).recommendation) ? {
				ramco_id: (record as any).recommendation,
				name: (employeeMap.get((record as any).recommendation) as any)?.full_name
			} : null,
			approval_by: employeeMap.has((record as any).approval) ? {
				ramco_id: (record as any).approval,
				name: (employeeMap.get((record as any).approval) as any)?.full_name
			} : null,
			workshop: wsMap.has((record as any).ws_id) ? {
				id: (record as any).ws_id,
				name: (wsMap.get((record as any).ws_id) as any)?.ws_name
			} : null
		};

		// Attach invoice matched by svc_order/req_id
		const key = String((record as any).req_id);
		const invoice = billingBySvcOrder.get(key) || billingByReqId.get(key) || null;
		const resolvedWithInvoice = { ...resolvedRecord, invoice };

		res.json({
			status: 'success',
			message: 'Maintenance record data retrieved successfully',
			data: resolvedWithInvoice
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
		const body = req.body || {};
		// Normalize and map payload
		const req_date = body.req_date || body.reqDate || body.request_date || null;
		const ramco_id = body.ramco_id || body.requester || null;
		const costcenter_id = body.costcenter_id || body.cc_id || body.cost_center_id || null;
		const location_id = body.location_id || body.loc_id || null;
		const ctc_m = body.ctc_m || body.contact || null;
		const asset_id = body.asset_id || body.vehicle_id || null;
		const register_number = body.register_number || body.reg_no || '';
		const entry_code = body.entry_code || '';
		const odo_start = body.odo_start || null;
		const odo_end = body.odo_end || null;
		const req_comment = body.req_comment || body.comment || '';
		const svc_opt = body.svc_opt || '';
		const extra_mileage = body.extra_mileage || null;
		const late_notice = body.late_notice || null;
		const late_notice_date = body.late_notice_date || null;

		// Uploaded file
		// Defer req_upload_path until we know req_id; set null for initial insert
		let req_upload_path: string | null = null;

		const recordData = {
			req_date,
			ramco_id,
			costcenter_id,
			location_id,
			ctc_m,
			asset_id,
			register_number,
			entry_code,
			odo_start,
			odo_end,
			req_comment,
			svc_opt,
			extra_mileage,
			late_notice,
			late_notice_date,
			req_upload_path
		};

		const result = await maintenanceModel.createVehicleMtnRequest(recordData);

		// Try to resolve the created record id
		let createdId: number | undefined;
		// Handle numeric insertId or object shapes
		if (typeof result === 'number') {
			const n = Number(result);
			if (Number.isFinite(n) && n > 0) createdId = n;
		} else if (result && typeof result === 'object') {
			// common shapes: { req_id: number } or { insertId: number } or the full record
			if ((result as any).req_id) createdId = Number((result as any).req_id);
			else if ((result as any).insertId) createdId = Number((result as any).insertId);
			else if ((result as any).id) createdId = Number((result as any).id);
		}

		// Attempt to fetch full resolved record to include in email
		let fullRecord: any = null;
		if (createdId) {
			// If file uploaded, rename to '<req_id>-<originalname>' and update DB path
			if (req.file) {
				try {
					const originalAbs = req.file.path; // current temp storage
					// Build a filename that does not include the original name: <req_id>-<10digits>-<9digits>.<ext>
					const epochSec = Math.floor(Date.now() / 1000); // 10 digits
					const rand9 = Math.floor(100000000 + Math.random() * 900000000); // 9 digits
					const extRaw = (req.file.originalname ? path.extname(req.file.originalname) : '') || path.extname(originalAbs) || '';
					const ext = (extRaw && /^[.a-zA-Z0-9]+$/.test(extRaw)) ? extRaw.toLowerCase() : '';
					const finalFilename = `${createdId}-${epochSec}-${rand9}${ext}`;
					const destAbs = await buildStoragePath('admin/vehiclemtn2', finalFilename);
					await safeMove(originalAbs, destAbs);
					const dbPath = '/' + toDbPath('admin/vehiclemtn2', finalFilename);
					await maintenanceModel.updateVehicleMtnUpload(createdId, dbPath);
				} catch (moveErr) {
					console.error('Failed to finalize maintenance upload rename/update', moveErr);
				}
			}
			fullRecord = await resolveVehicleMtnRecord(createdId);
		} else if (result && typeof result === 'object' && (result as any).req_id) {
			fullRecord = await resolveVehicleMtnRecord(Number((result as any).req_id));
		} else {
			// fallback: try to fetch by any req_id present in the submitted payload
			if ((recordData as any).req_id) {
				fullRecord = await resolveVehicleMtnRecord(Number((recordData as any).req_id));
			}
		}

		// Build and send notification email to requester if we have the resolved record
		try {
			if (fullRecord) {
				const rec = fullRecord as any;
				// debug: log resolved record and chosen recipient
				//console.log('createVehicleMtnRequest: resolved record for email:', JSON.stringify(rec && typeof rec === 'object' ? (rec) : 'null'));
				const emailSubject = `Vehicle Maintenance Request Submitted - Service Order: ${rec.req_id}`;
				// format date as dd/m/yyyy
				let formattedDate = '';
				if (rec.req_date) {
					const d = new Date(rec.req_date);
					if (!Number.isNaN(d.getTime())) formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
				}

				// build applicant string with ramco id and contact
				const applicantName = rec.requester?.name || rec.requester?.full_name || '';
				const applicantDetails: string[] = [];
				if (rec.requester?.ramco_id) applicantDetails.push(String(rec.requester.ramco_id));
				if (rec.requester?.contact) applicantDetails.push(String(rec.requester.contact));
				const applicant = applicantName + (applicantDetails.length ? ` (${applicantDetails.join(' • ')})` : '');

				// compute annual summary for all years from billings and request counts for the asset
				let annualSummary: Array<{ year: number; amount: number; requests: number }> = [];
				let recentRequests: Array<any> = [];
				try {
					if (rec.asset && rec.asset.id) {
						// get all billings and all requests for this asset
						const [allBillingsRaw, allRequestsRaw] = await Promise.all([
							billingModel.getVehicleMtnBillings(),
							maintenanceModel.getVehicleMtnRequestByAssetId(rec.asset.id)
						]);
						const billingArray = Array.isArray(allBillingsRaw) ? allBillingsRaw : (allBillingsRaw ? [allBillingsRaw] : []);
						const requestArray = Array.isArray(allRequestsRaw) ? allRequestsRaw : (allRequestsRaw ? [allRequestsRaw] : []);

						// group billings by year where billing references this asset
						const billingByYear = new Map<number, number>();
						billingArray.forEach((b: any) => {
							const assetMatch = (b.asset_id !== undefined && b.asset_id !== null && Number(b.asset_id) === Number(rec.asset.id)) || (b.vehicle_id !== undefined && b.vehicle_id !== null && Number(b.vehicle_id) === Number(rec.asset.id));
							if (!assetMatch) return;
							const invDate = b.inv_date ? new Date(b.inv_date) : null;
							const year = invDate && !Number.isNaN(invDate.getTime()) ? invDate.getFullYear() : null;
							if (year) {
								billingByYear.set(year, (billingByYear.get(year) || 0) + (Number(b.inv_total) || 0));
							}
						});

						// group requests by year for this asset
						const requestsByYear = new Map<number, number>();
						requestArray.forEach((r: any) => {
							if (Number(r.asset_id) !== Number(rec.asset.id)) return;
							const rd = r.req_date ? new Date(r.req_date) : null;
							const year = rd && !Number.isNaN(rd.getTime()) ? rd.getFullYear() : null;
							if (year) requestsByYear.set(year, (requestsByYear.get(year) || 0) + 1);
						});

						// union years
						const years = new Set<number>([...billingByYear.keys(), ...requestsByYear.keys()]);
						const yearList = Array.from(years).sort((a, b) => b - a);
						// filter out unreasonable years and limit to last 5 years
						const currentYear = new Date().getFullYear();
						const validYears = yearList.filter(y => Number.isFinite(y) && y >= 2000 && y <= currentYear).slice(0, 5);
						annualSummary = validYears.map(y => ({ year: y, amount: billingByYear.get(y) || 0, requests: requestsByYear.get(y) || 0 }));
					}
				} catch (e) {
					console.warn('Failed to compute annualSummary', e);
				}

				// compute recent requests for this asset (exclude current request)
				try {
					if (rec.asset && rec.asset.id) {
						// fetch svc types for mapping ids -> names
						const svcTypesRaw = await maintenanceModel.getServiceTypes();
						const svcTypeMap = new Map((Array.isArray(svcTypesRaw) ? svcTypesRaw : []).map((s: any) => [s.svcTypeId || s.id || s.id, s]));

						// fetch workshops for mapping ws_id -> ws_name
						const workshopsRaw = await billingModel.getWorkshops();
						const wsMapLocal = new Map((Array.isArray(workshopsRaw) ? workshopsRaw : []).map((w: any) => [w.ws_id || w.id || String(w.ws_id), w]));

						const rrRaw = await maintenanceModel.getVehicleMtnRequestByAssetId(rec.asset.id);
						const rr = Array.isArray(rrRaw) ? rrRaw : (rrRaw ? [rrRaw] : []);
						const currentReqId = Number((rec && rec.req_id) ? rec.req_id : 0);
						const others = (rr as any[]).filter((r: any) => Number(r.req_id) !== currentReqId);
						// map to display-friendly rows and sort by original date desc
						recentRequests = others
							.map((r: any) => {
								const rd = r.req_date ? new Date(r.req_date) : null;
								const dateFormatted = rd && !Number.isNaN(rd.getTime()) ? `${rd.getDate()}/${rd.getMonth() + 1}/${rd.getFullYear()}` : (r.req_date || '');
								// resolve svc_opt ids to names
								const svcIds = r.svc_opt ? String(r.svc_opt).split(',').map((id: string) => parseInt(id.trim())).filter((n: number) => Number.isFinite(n)) : [];
								const svcNames = svcIds.map((id: number) => {
									const s = svcTypeMap.get(id) || svcTypeMap.get(String(id));
									return s ? (s.svcType || s.name || String(id)) : String(id);
								}).join(', ');
								// robust status fallback (different model shapes)
								const statusVal = r.status || r.req_status || r.request_status || r.inv_status || r.state || r.status_name || '';
								// resolve workshop: prefer r.ws_name or r.workshop, fallback to workshop map via ws_id
								let workshopName = '';
								if (r.ws_name) workshopName = r.ws_name;
								else if (r.workshop) workshopName = r.workshop;
								else if (r.ws_id && wsMapLocal && wsMapLocal.has(r.ws_id)) workshopName = (wsMapLocal.get(r.ws_id) as any)?.ws_name || '';
								return {
									req_id: r.req_id,
									date: dateFormatted,
									dateRaw: rd && !Number.isNaN(rd.getTime()) ? rd.getTime() : 0,
									requestType: svcNames || (r.svc_opt || ''),
									status: statusVal,
									comment: r.req_comment || '',
									workshop: workshopName
								};
							})
							.sort((a: any, b: any) => (b.dateRaw || 0) - (a.dateRaw || 0))
							.slice(0, 5)
							.map(({ dateRaw, ...rest }: any) => rest);
					}
				} catch (e) {
					console.warn('Failed to compute recentRequests', e);
				}

				const emailBody = vehicleMaintenanceEmail({
					requestNo: rec.req_id,
					date: formattedDate || rec.req_date,
					applicant,
					deptLocation: rec.asset && rec.asset.costcenter ? `${rec.asset.costcenter.name}${rec.asset.location ? ' / ' + rec.asset.location.name : ''}` : '',
					vehicleInfo: rec.asset ? (`${rec.asset.register_number || ''} ${(rec.asset.brand && rec.asset.brand.name) || ''} ${(rec.asset.model && rec.asset.model.name) || ''}`.trim() + (rec.asset.age_years !== null && rec.asset.age_years !== undefined ? ` — ${rec.asset.age_years} yrs` : '')) : '',
					requestType: Array.isArray(rec.svc_type) ? rec.svc_type.map((s: any) => s.name).join(', ') : '',
					recentRequests,
					annualSummary,
					footerName: 'ADMS (v4)'
				});

				// Resolve recipient email strictly by email fields, not contact numbers
				const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
				let recipientEmail: string | null = null;
				// Prefer resolving by ramco_id from directory
				if (rec?.requester?.ramco_id) {
					try {
						const emp = await assetModel.getEmployeeByRamco(String(rec.requester.ramco_id));
						if (emp && isValidEmail((emp as any).email)) recipientEmail = (emp as any).email;
					} catch { }
				}
				// Fallback to body.email if provided and valid
				if (!recipientEmail && isValidEmail((body as any)?.email)) {
					recipientEmail = String((body as any).email);
				}
				console.log('createVehicleMtnRequest: sending email to:', recipientEmail);

				// Admin CC if configured (supports comma/semicolon-separated list)
				const { ccString } = getAdminCcList();

				if (recipientEmail) {
					await mailer.sendMail(recipientEmail, emailSubject, emailBody, ccString ? { cc: ccString } : undefined);
				} else {
					console.warn('createVehicleMtnRequest: no recipientEmail resolved; skipping mail send');
				}
			}
		} catch (mailErr) {
			// do not fail the request creation if email fails; log and continue
			console.error('Failed to send maintenance notification email', mailErr);
		}

		// Notify admins via Socket.IO about new request and badge count update
		try {
			if (createdId) {
				await notificationService.notifyNewMtnRequest(createdId, ramco_id);
			}
		} catch (notifErr) {
			// do not fail the request creation if notification fails; log and continue
			console.error('Failed to emit notification for new maintenance request', notifErr);
		}

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

/* TEST EMAIL FOR CREATE VEHICLE MAINTENANCE REQUEST

curl -X POST 'http://localhost:3030/api/mtn/request' \
  -H 'Content-Type: application/json' \
  -d '{
	 "req_id": 11178,
	 "ramco_id": "000317",
	 "asset_id": 115,
	 "svc_opt": "1,6,4,16",
	 "req_comment": "Test request - please ignore",
	 "email": "rozaiman@ranhill.com.my",
	 "name": "Rozaiman",
	 "contact": "0100000000",
	 "testEmail": "rozaiman@ranhill.com.my",
	 "testName": "Rozaiman"
  }'
*/

export const updateVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		// Build update payload from body and optionally handle 'form_upload' file
		const data = { ...(req.body || {}) } as any;

		// If a maintenance form is uploaded, move/rename to the same directory and store full URL
		if (req.file) {
			try {
				const originalAbs = req.file.path; // temp filename from multer in admin/vehiclemtn2
				// Generate final filename: <req_id>-<epoch>-<rand9><ext>
				const epochSec = Math.floor(Date.now() / 1000);
				const rand9 = Math.floor(100000000 + Math.random() * 900000000);
				const extRaw = (req.file.originalname ? path.extname(req.file.originalname) : '') || path.extname(originalAbs) || '';
				const ext = (extRaw && /^[.a-zA-Z0-9]+$/.test(extRaw)) ? extRaw.toLowerCase() : '';
				const finalFilename = `${id}-${epochSec}-${rand9}${ext}`;
				const destAbs = await buildStoragePath('admin/vehiclemtn2', finalFilename);
				await safeMove(originalAbs, destAbs);
				const dbPath = toDbPath('admin/vehiclemtn2', finalFilename); // e.g., uploads/admin/vehiclemtn2/<file>
				// Persist DB path (not full URL) on form_upload field
				data.form_upload = dbPath;
				// Allow client-provided date or default to now
				if (!('form_upload_date' in data) || !data.form_upload_date) {
					data.form_upload_date = dayjs().format('YYYY-MM-DD HH:mm:ss');
				}
			} catch (fileErr) {
				console.error('updateVehicleMtnRequest: failed handling form_upload file', fileErr);
			}
		}
		const result = await maintenanceModel.updateVehicleMtnRequest(Number(id), data);

		// If this update includes verification_stat = 1, notify recommender to review/recommend via workflow service
		try {
			const verificationFlag = data.verification_stat === 1 || data.verification_stat === '1' || data.verification_stat === true;
			if (verificationFlag) {
				await sendRecommendationEmail(Number(id));
			}
		} catch (emailErr) {
			console.error('Failed to send recommender notification email (service)', emailErr);
		}

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

/**
 * Upload maintenance form with Socket.IO events
 * PUT /api/mtn/request/:id/form-upload
 * Emits:
 *  - mtn:form-uploaded → { requestId, assetId, uploadedBy, uploadedAt }
 *  - mtn:counts → { maintenanceBilling, unseenBills }
 */
export const uploadVehicleMtnForm = async (req: Request, res: Response) => {
	try {
		const { id: requestId } = req.params;
		const reqId = Number(requestId);
		
		// Get current user for audit trail
		const uploadedBy = (req as any).user?.userId ?? (req as any).userId ?? 'unknown';

		// Call updateVehicleMtnRequest to handle file upload
		// We'll handle the response and add Socket.IO emissions
		let updateResult: any = null;
		let assetId: number | null = null;

		try {
			const { id } = req.params;
			const data = { ...(req.body || {}) } as any;

			// If a maintenance form is uploaded
			if (req.file) {
				try {
					const originalAbs = req.file.path;
					const epochSec = Math.floor(Date.now() / 1000);
					const rand9 = Math.floor(100000000 + Math.random() * 900000000);
					const extRaw = (req.file.originalname ? path.extname(req.file.originalname) : '') || path.extname(originalAbs) || '';
					const ext = (extRaw && /^[.a-zA-Z0-9]+$/.test(extRaw)) ? extRaw.toLowerCase() : '';
					const finalFilename = `${id}-${epochSec}-${rand9}${ext}`;
					const destAbs = await buildStoragePath('admin/vehiclemtn2', finalFilename);
					await safeMove(originalAbs, destAbs);
					const dbPath = toDbPath('admin/vehiclemtn2', finalFilename);
					data.form_upload = dbPath;
					if (!('form_upload_date' in data) || !data.form_upload_date) {
						data.form_upload_date = dayjs().format('YYYY-MM-DD HH:mm:ss');
					}
				} catch (fileErr) {
					console.error('uploadVehicleMtnForm: failed handling form_upload file', fileErr);
				}
			}

			updateResult = await maintenanceModel.updateVehicleMtnRequest(Number(id), data);

			// Fetch the updated record to get asset_id for socket event
			const updatedRecord = await maintenanceModel.getVehicleMtnRequestById(Number(id)) as any;
			assetId = updatedRecord?.asset_id ?? null;

			// If this update includes verification_stat = 1, notify recommender
			try {
				const verificationFlag = data.verification_stat === 1 || data.verification_stat === '1' || data.verification_stat === true;
				if (verificationFlag) {
					await sendRecommendationEmail(Number(id));
				}
			} catch (emailErr) {
				console.error('Failed to send recommender notification email', emailErr);
			}
		} catch (updateErr) {
			console.error('uploadVehicleMtnForm: update failed', updateErr);
			return res.status(500).json({
				status: 'error',
				message: updateErr instanceof Error ? updateErr.message : 'Unknown error occurred',
				data: null
			});
		}

		// Emit Socket.IO events on successful form upload
		try {
			const io = getSocketIOInstance();
			if (io) {
				// Emit form-uploaded event for real-time UI update
				io.emit('mtn:form-uploaded', {
					requestId: reqId,
					assetId,
					uploadedBy,
					uploadedAt: dayjs().toISOString()
				});

				// Get updated counts and emit mtn:counts
				try {
					const unseenCount = await maintenanceModel.getUnseenBillsCount();
					const maintenanceCount = await maintenanceModel.getVehicleMtnRequests();
					const maintenanceCountNum = Array.isArray(maintenanceCount) ? maintenanceCount.length : 0;

					io.emit('mtn:counts', {
						maintenanceBilling: maintenanceCountNum,
						unseenBills: unseenCount
					});
				} catch (countErr) {
					console.warn('Failed to emit mtn:counts event:', countErr);
				}
			} else {
				console.warn('Socket.IO instance not available for emitting events');
			}
		} catch (socketErr) {
			console.warn('Failed to emit Socket.IO events:', socketErr);
			// Don't fail the request if socket emit fails
		}

		return res.json({
			status: 'success',
			message: 'Maintenance form uploaded successfully',
			data: updateResult
		});
	} catch (error) {
		console.error('uploadVehicleMtnForm error:', error);
		return res.status(500).json({
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

// RECOMMEND / APPROVE (single)
export const recommendVehicleMtnRequestSingle = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const reqId = Number(id);
		if (!Number.isFinite(reqId) || reqId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid request id', data: null });
		}

		const body = req.body || {};
		if (body.req_id && Number(body.req_id) !== reqId) {
			return res.status(400).json({ status: 'error', message: 'Payload req_id does not match URL id', data: null });
		}

		// Resolve actor from query.authorize or body.recommendation
		const actor = typeof req.query.authorize === 'string' && req.query.authorize.trim() !== ''
			? String(req.query.authorize)
			: (body.recommendation ?? body.recommender ?? null);
		if (!actor) return res.status(400).json({ status: 'error', message: 'Missing recommender (authorize or recommendation)', data: null });

		// Normalize fields
		const recommendation_stat = Number(body.recommendation_stat ?? body.recommend_stat);
		if (![1, 2].includes(recommendation_stat)) {
			return res.status(400).json({ status: 'error', message: 'recommendation_stat must be 1 or 2', data: null });
		}
		const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
		const recommendation_date = body.recommendation_date || body.recomendation_date || now;

		const payload: any = {
			recommendation: String(actor),
			recommendation_stat,
			recommendation_date
		};

		const result = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);

		// Optional: notify approver if recommended (stat=1)
		if (recommendation_stat === 1) {
			try { await sendApprovalEmail(reqId); } catch { /* ignore */ }
		}

		return res.json({ status: 'success', message: 'Recommendation updated', data: { requestId: reqId, result } });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

export const approveVehicleMtnRequestSingle = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const reqId = Number(id);
		if (!Number.isFinite(reqId) || reqId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid request id', data: null });
		}

		const body = req.body || {};
		if (body.req_id && Number(body.req_id) !== reqId) {
			return res.status(400).json({ status: 'error', message: 'Payload req_id does not match URL id', data: null });
		}

		const actor = typeof req.query.authorize === 'string' && req.query.authorize.trim() !== ''
			? String(req.query.authorize)
			: (body.approval ?? body.approver ?? null);
		if (!actor) return res.status(400).json({ status: 'error', message: 'Missing approver (authorize or approval)', data: null });

		const approval_stat = Number(body.approval_stat ?? body.approve_stat);
		if (![1, 2].includes(approval_stat)) {
			return res.status(400).json({ status: 'error', message: 'approval_stat must be 1 or 2', data: null });
		}
		const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
		const approval_date = body.approval_date || now;

		const payload: any = {
			approval: String(actor),
			approval_stat,
			approval_date
		};
		const result = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);

		// If approved, push to billing (best-effort; ignore duplicate silently)
		let billing: any = null;
		if (approval_stat === 1) {
			try {
				billing = await maintenanceModel.pushVehicleMtnToBilling(reqId);
			} catch (e: any) {
				if (!(e instanceof Error && e.message && e.message.toLowerCase().includes('duplicate'))) {
					console.warn('approveVehicleMtnRequestSingle: push to billing failed', e);
				}
			}
		}

		// Best-effort notify requester of approval outcome
		try { await sendRequesterApprovalEmail(reqId, approval_stat); } catch { /* ignore */ }
		return res.json({ status: 'success', message: 'Approval updated', data: { requestId: reqId, result, billing } });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

// RECOMMEND / APPROVE (bulk)
export const recommendVehicleMtnRequestBulk = async (req: Request, res: Response) => {
	try {
		const items = Array.isArray(req.body?.items) ? req.body.items as any[] : [];
		if (!items.length) return res.status(400).json({ status: 'error', message: 'Body.items must be a non-empty array', data: null });

		const results: any[] = [];
		for (const it of items) {
			const reqId = Number(it.req_id);
			if (!Number.isFinite(reqId) || reqId <= 0) { results.push({ req_id: it.req_id, error: 'invalid req_id' }); continue; }

			const actor = it.recommendation ?? it.recommender;
			const stat = Number(it.recommendation_stat ?? it.recommend_stat);
			const when = it.recommendation_date || it.recomendation_date || dayjs().format('YYYY-MM-DD HH:mm:ss');
			if (!actor || ![1, 2].includes(stat)) { results.push({ req_id: reqId, error: 'invalid payload' }); continue; }

			const payload = { recommendation: String(actor), recommendation_stat: stat, recommendation_date: when } as any;
			try {
				const r = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);
				results.push({ req_id: reqId, ok: true, result: r });
				if (stat === 1) { try { await sendApprovalEmail(reqId); } catch { /* ignore */ } }
			} catch (e) {
				results.push({ req_id: reqId, error: e instanceof Error ? e.message : 'update failed' });
			}
		}
		return res.json({ status: 'success', message: 'Bulk recommendation processed', data: results });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

export const approveVehicleMtnRequestBulk = async (req: Request, res: Response) => {
	try {
		const items = Array.isArray(req.body?.items) ? req.body.items as any[] : [];
		if (!items.length) return res.status(400).json({ status: 'error', message: 'Body.items must be a non-empty array', data: null });

		const results: any[] = [];
		for (const it of items) {
			const reqId = Number(it.req_id);
			if (!Number.isFinite(reqId) || reqId <= 0) { results.push({ req_id: it.req_id, error: 'invalid req_id' }); continue; }

			const actor = it.approval ?? it.approver;
			const stat = Number(it.approval_stat ?? it.approve_stat);
			const when = it.approval_date || dayjs().format('YYYY-MM-DD HH:mm:ss');
			if (!actor || ![1, 2].includes(stat)) { results.push({ req_id: reqId, error: 'invalid payload' }); continue; }

			const payload = { approval: String(actor), approval_stat: stat, approval_date: when } as any;
			try {
				const r = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);
				let billing: any = null;
				if (stat === 1) {
					try {
						billing = await maintenanceModel.pushVehicleMtnToBilling(reqId);
					} catch (e: any) {
						if (!(e instanceof Error && e.message && e.message.toLowerCase().includes('duplicate'))) {
							console.warn('approveVehicleMtnRequestBulk: push to billing failed', e);
						}
					}
				}
				results.push({ req_id: reqId, ok: true, result: r, billing });
				try { await sendRequesterApprovalEmail(reqId, stat); } catch { /* ignore */ }
			} catch (e) {
				results.push({ req_id: reqId, error: e instanceof Error ? e.message : 'update failed' });
			}
		}
		return res.json({ status: 'success', message: 'Bulk approval processed', data: results });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

// Cancel a maintenance application by driver/applicant
export const cancelVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const reqId = Number(id);
		if (!Number.isFinite(reqId) || reqId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid request id', data: null });
		}

		const { req_id, drv_stat, drv_cancel_comment, drv_date } = req.body || {};
		if (req_id && Number(req_id) !== reqId) {
			return res.status(400).json({ status: 'error', message: 'Payload req_id does not match URL id', data: null });
		}

		// Validate drv_stat if provided; 2 means cancelled by driver
		const payload: any = {};
		if (drv_stat !== undefined) payload.drv_stat = Number(drv_stat);
		if (drv_cancel_comment !== undefined) payload.drv_cancel_comment = String(drv_cancel_comment);
		if (drv_date !== undefined) payload.drv_date = drv_date; // assume ISO string or valid datetime format for DB

		if (Object.keys(payload).length === 0) {
			return res.status(400).json({ status: 'error', message: 'No cancellation fields provided', data: null });
		}

		const result = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);

		// Best-effort: notify applicant and CC admin about cancellation
		try {
			const rec = await resolveVehicleMtnRecord(reqId);
			if (rec) {
				const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
				let toEmail: string | null = null;
				if (rec?.requester?.ramco_id) {
					try {
						const emp = await assetModel.getEmployeeByRamco(String(rec.requester.ramco_id));
						if (emp && isValidEmail((emp as any).email)) toEmail = (emp as any).email;
					} catch { /* ignore */ }
				}
				const ADMIN_EMAIL_ENV = (process.env.ADMIN_EMAIL || '').trim();
				const adminCc = ADMIN_EMAIL_ENV && isValidEmail(ADMIN_EMAIL_ENV) ? ADMIN_EMAIL_ENV : undefined;

				const subject = `Vehicle Maintenance Request Cancelled - Service Order: ${rec.req_id}`;
				const when = payload.drv_date ? new Date(payload.drv_date) : new Date();
				const whenStr = Number.isNaN(when.getTime()) ? String(payload.drv_date || '') : `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()} ${when.toTimeString().slice(0, 5)}`;
				const applicantName = rec.requester?.name || 'Tuan/Puan';
				const commentHtml = payload.drv_cancel_comment ? `<p style="margin:6px 0 0 0">Reason: <em>${String(payload.drv_cancel_comment)}</em></p>` : '';
				const html = `
				  <!doctype html>
				  <html>
				  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background:#f7f9fc; padding:16px; color:#172b4d;">
					<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e6ecf5;border-radius:8px;overflow:hidden;">
					  <div style="background:#de350b;color:#fff;padding:12px 16px;font-weight:700">Vehicle Maintenance — Cancellation Notice</div>
					  <div style="padding:16px">
						<p style="margin:0 0 10px 0">Kepada <strong>${applicantName}</strong>,</p>
						<p style="margin:0 0 10px 0">Permohonan servis kenderaan anda telah dibatalkan.</p>
						<p style="margin:0 0 8px 0"><strong>Service Order:</strong> #${rec.req_id}</p>
						<p style="margin:0 0 8px 0"><strong>Tarikh/masa pembatalan:</strong> ${whenStr}</p>
						${commentHtml}
					  </div>
					  <div style="padding:12px 16px;border-top:1px solid #e6ecf5;color:#6b778c;font-size:12px">ADMS (v4)</div>
					</div>
				  </body>
				  </html>
				`;

				if (toEmail || adminCc) {
					// If driver email missing, send to admin as primary
					const primary = toEmail || adminCc!;
					const cc = toEmail && adminCc && primary !== adminCc ? adminCc : undefined;
					await mailer.sendMail(primary, subject, html, cc ? { cc } : undefined);
				} else {
					console.warn('cancelVehicleMtnRequest: no valid recipient (driver/admin) to notify');
				}
			}
		} catch (mailErr) {
			console.error('Failed to send cancellation email', mailErr);
		}

		return res.json({ status: 'success', message: 'Maintenance request cancelled successfully', data: result });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred', data: null });
	}
};

// Admin updates on a maintenance request (verification, workshop selection, major service options, rejection)
export const adminUpdateVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const reqId = Number(id);
		if (!Number.isFinite(reqId) || reqId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid request id', data: null });
		}

		const body = req.body || {};

		// Normalize fields from various possible client keys
		const verification_comment = (body.verification_comment ?? body.adminRemarks ?? null) as string | null;

		// ws_id can come as ws_id | workshop_id | workshopId
		let ws_id: number | null = null;
		const wsCandidate = body.ws_id ?? body.workshop_id ?? body.workshopId;
		if (wsCandidate !== undefined && wsCandidate !== null) {
			const n = Number(wsCandidate);
			ws_id = Number.isFinite(n) && n > 0 ? n : null;
		}

		// verification_stat can be provided directly or via decision/action strings
		let verification_stat: number | null = null;
		if (body.verification_stat !== undefined && body.verification_stat !== null) {
			const n = Number(body.verification_stat);
			if (n === 1 || n === 2) verification_stat = n;
		} else if (typeof body.decision === 'string') {
			const d = body.decision.toLowerCase();
			if (d === 'proceed' || d === 'approve' || d === 'verified') verification_stat = 1;
			else if (d === 'reject' || d === 'rejected') verification_stat = 2;
		} else if (typeof body.action === 'string') {
			const a = body.action.toLowerCase();
			if (a === 'proceed' || a === 'approve' || a === 'verified') verification_stat = 1;
			else if (a === 'reject' || a === 'rejected') verification_stat = 2;
		}

		// major_opt can be provided as string or array; normalize to comma-joined or null
		let major_opt: string | null = null;
		const majorRaw = body.major_opt ?? body.majorOpt ?? body.majorOptions;
		if (Array.isArray(majorRaw)) {
			const nums = majorRaw
				.map((v: any) => Number(v))
				.filter((n: number) => Number.isFinite(n) && n > 0);
			major_opt = nums.length ? nums.join(',') : null;
		} else if (typeof majorRaw === 'string') {
			const tokens = majorRaw
				.split(',')
				.map((s: string) => parseInt(s.trim(), 10))
				.filter((n: number) => Number.isFinite(n) && n > 0);
			major_opt = tokens.length ? tokens.join(',') : null;
		}

		const major_svc_comment = (body.major_svc_comment ?? body.majorServiceRemarks ?? null) as string | null;

		// verification_date is current timestamp
		const verification_date = dayjs().format('YYYY-MM-DD HH:mm:ss');

		// rejection_comment only meaningful when rejecting
		let rejection_comment: string | null = null;
		if (verification_stat === 2) {
			rejection_comment = (body.rejection_comment ?? body.rejectionRemarks ?? null) as string | null;
		}

		const payload: any = {
			verification_comment,
			ws_id,
			verification_stat,
			major_opt,
			major_svc_comment,
			verification_date,
			rejection_comment
		};

		// Remove undefined keys (leave nulls to explicitly clear)
		Object.keys(payload).forEach((k) => {
			if (payload[k] === undefined) delete payload[k];
		});

		const result = await maintenanceModel.updateVehicleMtnRequest(reqId, payload);

		// If proceeding (verification_stat=1), notify next PIC for recommendation using workflow service
		try {
			if (verification_stat === 1) {
				await sendRecommendationEmail(reqId);
			}
		} catch (mailErr) {
			console.error('Failed to send recommendation notification (service)', mailErr);
		}

		// Notify admins via Socket.IO about request update and badge count change
		try {
			if (verification_stat === 1) {
				// Admin verified - this counts as a response, so badge count decreases
				await notificationService.notifyMtnRequestUpdate(reqId, 'verified', (req as any).user?.ramco_id);
			} else if (verification_stat === 2) {
				// Admin rejected
				await notificationService.notifyMtnRequestUpdate(reqId, 'rejected', (req as any).user?.ramco_id);
			}
		} catch (notifErr) {
			console.error('Failed to emit notification for maintenance request update', notifErr);
		}

		return res.json({ status: 'success', message: 'Maintenance record updated successfully', data: result });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred', data: null });
	}
};

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

// ...recommendVehicleMtnRequest removed; use authorizeVehicleMtnRequest instead

// Approver endpoint: update approval fields and notify requester
// ...approveVehicleMtnRequest removed; use authorizeVehicleMtnRequest instead

// Unified authorize endpoint. Use query param ?action=recommend or ?action=approve
export const authorizeVehicleMtnRequest = async (req: Request, res: Response) => {
	try {
		const requestId = Number(req.params.id || req.params.reqId);
		if (!Number.isFinite(requestId) || requestId <= 0) return res.status(400).json({ status: 'error', message: 'Invalid request id' });

		const action = (req.query.action as string) || (req.body && req.body.action) || '';
		if (!action || !['recommend', 'approve'].includes(action)) {
			return res.status(400).json({ status: 'error', message: 'Invalid action. Use ?action=recommend or ?action=approve' });
		}

		// get approval_status from body
		const { approval_status } = req.body || {};
		if (approval_status === undefined || approval_status === null) {
			return res.status(400).json({ status: 'error', message: 'Missing approval_status in request body' });
		}

		// resolve workflow by action
		const desiredLevelOrder = action === 'recommend' ? 2 : 3;
		const workflowsRaw = await userModel.getWorkflows();
		const workflows = Array.isArray(workflowsRaw) ? workflowsRaw as any[] : [];
		const maintenanceWorkflows = workflows.filter(l => String(l.module_name).toLowerCase() === 'maintenance');

		// prefer exact level_order match; fallback to highest
		let authLevel = maintenanceWorkflows.find((l: any) => Number(l.level_order) === desiredLevelOrder) || null;
		if (!authLevel && maintenanceWorkflows.length > 0) {
			authLevel = maintenanceWorkflows.reduce((a: any, b: any) => (Number(a.level_order) >= Number(b.level_order) ? a : b));
		}

		const ramcoResolved = authLevel?.ramco_id || (authLevel?.employee && authLevel.employee.ramco_id) || null;
		if (!ramcoResolved) {
			return res.status(404).json({ status: 'error', message: `No workflow found for action ${action}` });
		}

		// perform DB update via model
		try {
			if (action === 'recommend') {
				await maintenanceModel.recommendVehicleMtnRequest(requestId, ramcoResolved, Number(approval_status));
			} else {
				await maintenanceModel.approveVehicleMtnRequest(requestId, ramcoResolved, Number(approval_status));
			}
		} catch (updErr) {
			console.warn('authorizeVehicleMtnRequest: DB update failed', updErr);
			// continue to notify regardless
		}

		// fetch fresh record to notify
		const record = await maintenanceModel.getVehicleMtnRequestById(requestId);
		if (!record) return res.status(404).json({ status: 'error', message: 'Maintenance record not found' });

		const employeesRaw = await assetModel.getEmployees();
		const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];

		const jwtSecret2 = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';

		if (action === 'recommend') {
			// Trigger approval workflow using unified helper and authorization template
			try {
				await sendApprovalEmail(requestId);
			} catch (e) {
				console.warn('authorizeVehicleMtnRequest (recommend): sendApprovalEmail failed', e);
			}
			return res.json({ status: 'success', message: 'Recommendation processed and approver notified', data: { requestId } });
		}

		// action === 'approve'
		// notify requester about approval outcome
		const requester = employees.find((e: any) => String(e.ramco_id) === String((record as any).ramco_id));
		const targetUser = requester || { ramco_id: (record as any).ramco_id, full_name: null, email: null };
		const credData = { ramco_id: targetUser.ramco_id, contact: targetUser.email || targetUser.phone || targetUser.contact || '', req_id: requestId } as any;
		const token = jwt.sign(credData, jwtSecret2, { expiresIn: '7d' });
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?action=approve&authorize=${encodeURIComponent(String(targetUser.ramco_id || ''))}&_cred=${encodeURIComponent(token)}`;

		const approved = Number(approval_status) === 1;
		const emailSubject = approved ? `Maintenance Request Approved — Service Order: ${requestId}` : `Maintenance Request ${Number(approval_status) === 0 ? 'Rejected' : 'Updated'} — Service Order: ${requestId}`;
		const recipientName = targetUser.full_name || '';
		const emailBody = `
			<h3>Maintenance Request ${approved ? 'Approved' : 'Updated'}</h3>
			<p>Dear ${recipientName},</p>
			<p>Your maintenance request (Request ID: ${requestId}) has been ${approved ? 'approved' : (Number(approval_status) === 0 ? 'rejected' : 'updated')} by the approver.</p>
			<p>You can view the request details on the portal:</p>
			<p><a href="${portalUrl}" target="_blank">Open Maintenance Portal</a></p>
			<p>Thank you.</p>
			<br>
			<p>Best regards,<br/>Maintenance Team</p>
		`;

		const recipientEmail = targetUser.email || (requester && requester.email) || null;
		console.log('authorizeVehicleMtnRequest (approve): sending mail to requester', { to: recipientEmail, subject: emailSubject, portalUrl });
		try {
			if (recipientEmail && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(recipientEmail)) await mailer.sendMail(recipientEmail, emailSubject, emailBody);
			console.log('authorizeVehicleMtnRequest (approve): mail sent to', recipientEmail);
		} catch (mailErr) {
			console.error('authorizeVehicleMtnRequest (approve): mailer error sending to', recipientEmail, mailErr);
		}

		return res.json({ status: 'success', message: 'Approval processed and requester notified', data: { requestId, sentTo: recipientEmail } });
	} catch (error) {
		console.error('authorizeVehicleMtnRequest error', error);
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
	}
};

export const resendMaintenancePortalLink = async (req: Request, res: Response) => {
	try {
		const { requestId } = req.params;

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

		// Create JWT credential
		const credData = {
			ramco_id: (requester as any).ramco_id,
			contact: (requester as any).email || '',
			req_id: Number(requestId)
		};
		const jwtSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
		const token = jwt.sign(credData, jwtSecret, { expiresIn: '7d' });

		// Vehicle maintenance portal URL that includes JWT credentials. Send/resend to requestor for approved requests.
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?_cred=${encodeURIComponent(token)}`;

		// Send email to requester. We need similar design & layout as /utils/emailTemplates/vehicleMaintenance.ts
		const emailSubject = 'Vehicle Maintenance Request Portal Access';

		const emailBody = `
			<h3>Maintenance Request Portal Access</h3>
			<p>Dear ${(requester as any).full_name || (requester as any).name},</p>
			<p>You can access your maintenance request portal using the link below:</p>
			<p><a href="${portalUrl}" target="_blank">Access Maintenance Portal</a></p>
			<p>Request ID: ${requestId}</p>
			<p>Original Requester: ${(requester as any).full_name || (requester as any).name} (${(requester as any).ramco_id})</p>
			<p>If you have any questions, please contact our maintenance team.</p>
			<br>
			<p>Best regards,<br>Maintenance Team</p>
		`;

		// Use actual requester email
		const recipientEmail = (requester as any).email;

		console.log('resendMaintenancePortalLink: sending mail', { to: recipientEmail, subject: emailSubject, portalUrl });
		try {
			if (recipientEmail && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(recipientEmail)) {
				await mailer.sendMail(recipientEmail, emailSubject, emailBody);
			}
			console.log('resendMaintenancePortalLink: mail sent to', recipientEmail);
		} catch (mailErr) {
			console.error('resendMaintenancePortalLink: mailer error sending to', recipientEmail, mailErr);
		}

		res.json({
			status: 'success',
			message: 'Portal link sent successfully',
			data: { requestId: Number(requestId), sentTo: recipientEmail, portalUrl }
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
	}
};

// Resend email to recommender (level: Recommend) or approver (level: Approval)
export const resendWorkflowMail = async (req: Request, res: Response) => {
	try {
		const { requestId } = req.params;
		const { level } = req.query; // 'recommend' | 'approval'
		const id = Number(requestId);
		if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid requestId', data: null });

		const rec = await resolveVehicleMtnRecord(id);
		if (!rec) return res.status(404).json({ status: 'error', message: 'Maintenance record not found', data: null });

		const desired = String(level || '').toLowerCase();
		const lvlName = desired === 'approval' ? 'Approval' : 'Recommend';
		const nextPic = await getWorkflowPic('vehicle maintenance', lvlName);
		const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
		let to = nextPic?.email && isValidEmail(nextPic.email) ? nextPic.email : null;
		if (!to && nextPic?.ramco_id) {
			try {
				const emp = await assetModel.getEmployeeByRamco(String(nextPic.ramco_id));
				if (emp && isValidEmail((emp as any).email)) to = String((emp as any).email);
				if (!to) {
					const all = await assetModel.getEmployees();
					const found = (Array.isArray(all) ? all as any[] : []).find(e => String(e.ramco_id) === String(nextPic!.ramco_id));
					if (found && isValidEmail(found.email)) to = String(found.email);
				}
			} catch { /* ignore */ }
		}
		const { ccString } = getAdminCcList();
		if (!to && !ccString) return res.status(400).json({ status: 'error', message: 'No recipient found for workflow level', data: null });

		// Build JWT portal URL and CTA buttons
		const credData = { ramco_id: nextPic?.ramco_id || '', contact: to || '', req_id: id } as any;
		const jwtSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
		const token = jwt.sign(credData, jwtSecret, { expiresIn: '3d' });
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const authRamco = (nextPic && (nextPic as any).ramco_id) ? String((nextPic as any).ramco_id) : '';
		const portalUrl = `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}?action=${encodeURIComponent(desired === 'approval' ? 'approve' : 'recommend')}&authorize=${encodeURIComponent(authRamco)}&_cred=${encodeURIComponent(token)}`;

		// Compose email body using authorization template (no raw link)
		const { applicant, deptLocation, vehicleInfo, requestType, formattedDate } = await buildSectionsForRecord(rec);
		const subject = desired === 'approval'
			? `Vehicle Maintenance Request Pending Approval - Service Order: ${id}`
			: `Vehicle Maintenance Request Pending Recommendation - Service Order: ${id}`;
		const emailBody = vehicleMaintenanceAuthorizationEmail({
			requestNo: id,
			date: formattedDate,
			greetingName: (nextPic && (nextPic as any).full_name) || applicant,
			role: desired === 'approval' ? 'Approval' : 'Recommendation',
			applicant,
			deptLocation,
			vehicleInfo,
			requestType,
			portalUrl,
			footerName: 'ADMS (v4)'
		});

		await mailer.sendMail(to!, subject, emailBody);
		return res.json({ status: 'success', message: `Workflow mail resent to ${desired || 'recommend'}`, data: { requestId: id, sentTo: to } });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred', data: null });
	}
};

// Authorize via secure email link (GET), supports action=recommend|approve and status=1|2
export const authorizeViaEmailLink = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id || req.params.requestId);
		const action = String(req.query.action || '').toLowerCase();
		const statusRaw = req.query.status;
		const enc = String(req.query._cred || '');
		if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid request id' });
		if (!['recommend', 'approve'].includes(action)) return res.status(400).json({ status: 'error', message: 'Invalid action' });
		const status = Number(statusRaw);
		if (![0, 1, 2].includes(status)) return res.status(400).json({ status: 'error', message: 'Invalid status' });

		// Response negotiation: default to redirect to frontend portal
		const wantsJson = String((req.query as any).format || '').toLowerCase() === 'json'
			|| (typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json'));
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

		// Parse _cred: prefer JWT, fallback to legacy AES token
		let payload: any = {};
		const jwtSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
		let parsed = false;
		try {
			payload = jwt.verify(enc, jwtSecret);
			parsed = true;
		} catch (e) {
			// Legacy AES iv:data format
			try {
				const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
				const algorithm = 'aes-256-cbc';
				const key = crypto.createHash('sha256').update(secretKey).digest();
				const [ivHex, dataHex] = (enc || '').split(':');
				if (ivHex && dataHex) {
					const iv = Buffer.from(ivHex, 'hex');
					const decipher = crypto.createDecipheriv(algorithm, key, iv);
					let decrypted = decipher.update(dataHex, 'hex', 'utf8');
					decrypted += decipher.final('utf8');
					try { payload = JSON.parse(decrypted); parsed = true; } catch { /* ignore */ }
				}
			} catch { /* ignore */ }
		}
		if (!parsed) {
			if (wantsJson) return res.status(400).json({ status: 'error', message: 'Invalid token' });
			const redirectUrl = `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}`;
			return res.redirect(302, redirectUrl);
		}

		const actorRamco = payload?.ramco_id ? String(payload.ramco_id) : undefined;
		const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

		// Build update payload for recommend path as per expectation
		if (action === 'recommend') {
			const body = {
				recommendation: actorRamco,
				recommendation_stat: status,
				recommendation_date: now,
			} as any;
			await maintenanceModel.updateVehicleMtnRequest(id, body);
			// Notify approver next if recommended (status=1)
			if (status === 1) {
				try {
					const workflowsRaw = await userModel.getWorkflows();
					const arr = Array.isArray(workflowsRaw) ? (workflowsRaw as any[]) : [];
					const approver = arr.find(w => String(w.module_name).toLowerCase() === 'vehicle maintenance' && String(w.level_name).toLowerCase() === 'approval');
					const approverRamco = approver?.employee?.ramco_id || null;
					if (approverRamco) {
						// Send approval email using existing resendWorkflowMail building blocks
						(req.query as any).level = 'approval';
						(req.params as any).requestId = String(id);
						// Fire and forget: do not block the CTA response on resend
						try { await resendWorkflowMail(req, res); } catch { /* ignore errors */ }
					}
				} catch { /* ignore */ }
			}
			if (wantsJson) {
				return res.json({ status: 'success', message: 'Recommendation recorded', data: { id, status } });
			}
			const redirectUrl = `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}`;
			return res.redirect(302, redirectUrl);
		}

		// Approve path
		if (action === 'approve') {
			const body = {
				approval: actorRamco,
				approval_status: status,
				approval_date: now,
			} as any;
			await maintenanceModel.updateVehicleMtnRequest(id, body);
			if (wantsJson) {
				return res.json({ status: 'success', message: 'Approval recorded', data: { id, status } });
			}
			const redirectUrl = `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}`;
			return res.redirect(302, redirectUrl);
		}

		return res.status(400).json({ status: 'error', message: 'Unsupported action' });
	} catch (error) {
		const wantsJson = String((req.query as any).format || '').toLowerCase() === 'json'
			|| (typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json'));
		if (wantsJson) return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const redirectUrl = `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${Number(req.params.id || 0)}`;
		return res.redirect(302, redirectUrl);
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
				odo_start: record.odo_start,
				odo_end: record.odo_end,
				//mileage will be odo_end - odo_start
				mileage: (record.odo_end !== null && record.odo_start !== null) ? (record.odo_end - record.odo_start) : null,
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
				costcenter: ccMap.has(record.costcenter_id) ? {
					id: record.costcenter_id,
					name: (ccMap.get(record.costcenter_id) as any)?.name
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

// Helper: fetch raw record from model and resolve nested lookups into a consistent shape
async function resolveVehicleMtnRecord(id: number) {
	const record = await maintenanceModel.getVehicleMtnRequestById(Number(id));
	if (!record) return null;

	// Fetch all lookup data in parallel
	const [assetsRaw, categoriesRaw, brandsRaw, modelsRaw, costcentersRaw, departmentsRaw, locationsRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
		assetModel.getAssets(),
		assetModel.getCategories(),
		assetModel.getBrands(),
		assetModel.getModels(),
		assetModel.getCostcenters(),
		(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
		assetModel.getLocations(),
		billingModel.getWorkshops(),
		assetModel.getEmployees(),
		maintenanceModel.getServiceTypes()
	]);

	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];

	const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
	const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
	const brandMap = new Map(brands.map((brand: any) => [brand.id, brand]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locationMap = new Map(locations.map((loc: any) => [loc.id, loc]));
	const deptMap = new Map(departments.map((d: any) => [Number(d.id), d]));
	const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
	const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
	const svcTypeMap = new Map(svcTypes.map((svc: any) => [svc.svcTypeId, svc]));

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
				department: a?.department_id ? { id: a.department_id, name: (deptMap.get(Number(a.department_id)) as any)?.name } : null,
				location: a?.location_id ? { id: a.location_id, name: (locationMap.get(a.location_id) as any)?.name } : null
			};
		})() : null,
		requester: employeeMap.has((record as any).ramco_id) ? {
			ramco_id: (record as any).ramco_id,
			name: (employeeMap.get((record as any).ramco_id) as any)?.full_name,
			contact: (employeeMap.get((record as any).ramco_id) as any)?.contact
		} : null,
		recommendation_by: employeeMap.has((record as any).recommendation) ? {
			ramco_id: (record as any).recommendation,
			name: (employeeMap.get((record as any).recommendation) as any)?.full_name
		} : null,
		approval_by: employeeMap.has((record as any).approval) ? {
			ramco_id: (record as any).approval,
			name: (employeeMap.get((record as any).approval) as any)?.full_name
		} : null,
		workshop: wsMap.has((record as any).ws_id) ? {
			id: (record as any).ws_id,
			name: (wsMap.get((record as any).ws_id) as any)?.ws_name
		} : null
	};

	return resolvedRecord;
}


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


/* ================ POOLCAR CONTROLLERS ================ */

// Normalize payload for poolcar create/update. Whitelist known fields and map to DB columns.
const mapPoolCarPayload = (body: any) => {
	const data: any = {};
	// Direct mappings (whitelist)
	const directKeys = [
		'ctc_m',
		'dept_id',
		'loc_id',
		'pcar_booktype',
		'pcar_datereq',
		'pcar_day',
		'pcar_dest',
		'pcar_driver',
		'pcar_empid',
		'pcar_hour',
		'pcar_opt',
		'pcar_purp',
		'pcar_type',
		'pcar_datefr',
		'pcar_dateto',
		'asset_id',
		'recommendation',
		'approval'
	];
	for (const k of directKeys) {
		if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
			data[k] = body[k];
		}
	}
	// Remap pcar_pass -> pass (DB column is named `pass`)
	if (Object.prototype.hasOwnProperty.call(body, 'pcar_pass') && body.pcar_pass !== undefined) {
		data.pass = body.pcar_pass;
	}
	return data;
};

export const getPoolCars = async (req: Request, res: Response) => {
	try {
		// Optional filters
		const assetParam = typeof req.query.asset === 'string' ? req.query.asset.trim() : '';
		const assetId = assetParam && !Number.isNaN(Number(assetParam)) ? Number(assetParam) : undefined;
		const cars = await maintenanceModel.getPoolCars({ asset_id: (assetId && assetId > 0) ? assetId : undefined });
		const ramco = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : '';

		// Lookups for enrichment
		const [employeesRaw, departmentsRaw, locationsRaw, typesRaw, assetsRaw] = await Promise.all([
			assetModel.getEmployees(),
			(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
			assetModel.getLocations(),
			assetModel.getTypes(),
			assetModel.getAssets(),
		]);
		const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
		const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
		const locations = Array.isArray(locationsRaw) ? locationsRaw as any[] : [];
		const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
		const assets = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
		const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
		const deptMap = new Map(departments.map((d: any) => [Number(d.id), d]));
		const locMap = new Map(locations.map((l: any) => [Number(l.id), l]));
		const typeMap = new Map(types.map((t: any) => [Number(t.id), t]));
		const assetMap = new Map(assets.map((a: any) => [Number(a.id), a]));

		// Filter by ?ramco on pcar_empid if provided (post-query filter)
		const filtered = (Array.isArray(cars) ? cars as any[] : []).filter((c: any) => {
			if (!ramco) return true;
			return String(c.pcar_empid) === ramco || String(c.pcar_driver) === ramco || String(c.pass) === ramco;
		});

		// Build cleaned response shape per requirements
		const data = filtered.map((c: any) => {
			// Employee resolver
			const emp = (rid: any) => {
				const e = rid ? empMap.get(String(rid)) : null;
				return e ? { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null } : null;
			};
			// Department and Location resolver
			const dept = (id: any) => {
				const d = (id != null) ? deptMap.get(Number(id)) : null;
				return d ? { id: Number(d.id), code: d.code || null } : null;
			};
			const loc = (id: any) => {
				const l = (id != null) ? locMap.get(Number(id)) : null;
				return l ? { id: Number(l.id), name: l.name || null } : null;
			};

			const out: any = {
				pcar_id: c.pcar_id,
				pcar_datereq: c.pcar_datereq ?? c.pcar_datererq ?? null,
				pcar_empid: emp(c.pcar_empid),
				ctc_m: c.ctc_m ?? null,
				dept_id: c.dept_id ?? null,
				loc_id: c.loc_id ?? null,
				pcar_booktype: c.pcar_booktype ?? null,
				pcar_type: (c.pcar_type !== undefined ? Number(c.pcar_type) : null),
				pcar_datefr: c.pcar_datefr ?? c.pcard_datefr ?? null,
				pcar_dateto: c.pcar_dateto ?? c.pcard_dateto ?? null,
				pcar_retdate: c.pcar_retdate ?? null,
				pcar_day: c.pcar_day ?? null,
				pcar_hour: c.pcar_hour ?? null,
				pcar_dest: c.pcar_dest ?? null,
				pcar_purp: c.pcar_purp ?? null,
				pcar_driver: emp(c.pcar_driver),
				cancel_date: c.cancel_date ?? null,
				approval_stat: (c.approval_stat !== undefined && c.approval_stat !== null) ? Number(c.approval_stat) : 0,
				pcar_cancel: (c.pcar_cancel === null || c.pcar_cancel === undefined) ? null : String(c.pcar_cancel),
				pcar_canrem: c.pcar_canrem ?? null,
				assigned_poolcar: assetMap.has(Number(c.asset_id)) ? {
					id: Number(c.asset_id),
					register_number: (assetMap.get(Number(c.asset_id)) as any)?.register_number || null
				} : null,
				status: c.status ?? null,
				department: dept(c.dept_id),
				location: loc(c.loc_id)
			};

			// Remove nulls
			Object.keys(out).forEach((k) => { if (out[k] === null) delete out[k]; });
			return out;
		});

		res.json({
			status: 'success',
			message: 'Pool car data retrieved successfully',
			data
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
	}
};

export const getPoolCarById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const car = await maintenanceModel.getPoolCarById(Number(id));

		if (!car) {
			return res.status(404).json({
				status: 'error',
				message: 'Pool car not found',
				data: null
			});
		}
		// Lookups for enrichment
		const [employeesRaw, departmentsRaw, locationsRaw, typesRaw, assetsRaw] = await Promise.all([
			assetModel.getEmployees(),
			(assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
			assetModel.getLocations(),
			assetModel.getTypes(),
			assetModel.getAssets(),
		]);
		const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
		const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
		const locations = Array.isArray(locationsRaw) ? locationsRaw as any[] : [];
		const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
		const assets = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
		const empMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
		const deptMap = new Map(departments.map((d: any) => [Number(d.id), d]));
		const locMap = new Map(locations.map((l: any) => [Number(l.id), l]));
		const typeMap = new Map(types.map((t: any) => [Number(t.id), t]));
		const assetMap = new Map(assets.map((a: any) => [Number(a.id), a]));

		const obj: any = { ...car };
		if (car.pcar_empid && empMap.has(String(car.pcar_empid))) {
			const e = empMap.get(String(car.pcar_empid));
			obj.pcar_empid = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
		if (car.pcar_driver && empMap.has(String(car.pcar_driver))) {
			const e = empMap.get(String(car.pcar_driver));
			obj.pcar_driver = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
		if (car.dept_id != null && deptMap.has(Number(car.dept_id))) {
			const d = deptMap.get(Number(car.dept_id));
			obj.department = { id: Number(d.id), code: d.code || null };
		}
		if (car.loc_id != null && locMap.has(Number(car.loc_id))) {
			const l = locMap.get(Number(car.loc_id));
			obj.location = { id: Number(l.id), name: l.name || null };
		}
		// Keep pcar_type as a number (no object enrichment)
		if (car.pcar_type != null) {
			obj.pcar_type = Number(car.pcar_type);
		}
		if (car.asset_id && assetMap.has(Number(car.asset_id))) {
			const a = assetMap.get(Number(car.asset_id));
			obj.assigned_poolcar = { id: Number(a.id), register_number: a.register_number || a.vehicle_regno || null };
		}
		if (car.recommendation && empMap.has(String(car.recommendation))) {
			const e = empMap.get(String(car.recommendation));
			obj.recommendation = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
		if (car.approval && empMap.has(String(car.approval))) {
			const e = empMap.get(String(car.approval));
			obj.approval = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
		// Build passenger array from concatenated RAMCO IDs in 'pass' (e.g., "012345, 23456")
		const passStr = typeof car.pass === 'string' ? car.pass : (car.pass != null ? String(car.pass) : '');
		if (passStr && passStr.trim() !== '') {
			const ids = passStr
				.split(/[,;\s]+/)
				.map((s: string) => s.trim())
				.filter((s: string) => s.length > 0);
			const unique = Array.from(new Set(ids)) as string[];
			const passenger = unique.map((rid: string) => {
				const emp = empMap.get(rid);
				return { ramco_id: rid, full_name: emp ? (emp.full_name || emp.name || null) : null };
			});
			if (passenger.length > 0) obj.passenger = passenger;
		}
		// Enrich TNG and Fleetcard objects if IDs exist
		try {
			if ((car as any).tng_id) {
				const tid = Number((car as any).tng_id);
				if (Number.isFinite(tid) && tid > 0) {
					const tng = await maintenanceModel.getTngRecordById(tid);
					if (tng) {
						obj.tng = {
							id: (tng as any).tng_id ?? (tng as any).id ?? tid,
							tng_sn: (tng as any).tng_sn ?? null
						};
					}
				}
			}
		} catch { }
		try {
			if ((car as any).fleetcard_id) {
				const fid = Number((car as any).fleetcard_id);
				if (Number.isFinite(fid) && fid > 0) {
					const fc = await billingModel.getFleetCardById(fid);
					if (fc) {
						obj.fleetcard = {
							id: (fc as any).id ?? fid,
							card_no: (fc as any).card_no ?? null
						};
					}
				}
			}
		} catch { }

		// Include return info explicitly if present
		if ((car as any).pcar_retdate !== undefined) obj.pcar_retdate = (car as any).pcar_retdate;
		if ((car as any).pcar_odo_end !== undefined) obj.pcar_odo_end = (car as any).pcar_odo_end;

		Object.keys(obj).forEach((k) => { if (obj[k] === null) delete obj[k]; });

		res.json({
			status: 'success',
			message: 'Pool car data retrieved successfully',
			data: obj
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
	}
};

export const createPoolCar = async (req: Request, res: Response) => {
	try {
		const carData = mapPoolCarPayload(req.body);
		const result = await maintenanceModel.createPoolCar(carData);

		// Send notifications via email to applicant and supervisor
		try {
			const id = Number(result);
			const subject = `Pool Car Request #${id}`;
			const applicantRamco = String(carData.pcar_empid || '');
			const applicant = applicantRamco ? await assetModel.getEmployeeByRamco(applicantRamco) : null;
			const applicantEmail = applicant?.email || null;
			const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || '';

			// Resolve driver email if different
			const driverRamco = String(carData.pcar_driver || '');
			const isSameApplicantDriver = applicantRamco && driverRamco && applicantRamco === driverRamco;
			const driver = !isSameApplicantDriver && driverRamco ? await assetModel.getEmployeeByRamco(driverRamco) : null;
			const driverEmail = driver?.email || null;

			// Applicant email (CC driver if different)
			if (applicantEmail) {
				const html = poolCarApplicantEmail({
					id,
					subject,
					pcar_datererq: carData.pcar_datererq || carData.pcar_datereq || null,
					pcar_empid: applicantRamco,
					applicant_name: applicant?.full_name || applicant?.name || null,
					pcar_dest: carData.pcar_dest || null,
					pcar_purp: carData.pcar_purp || null,
					date_from: carData.pcard_datefr || carData.pcar_datefr || null,
					date_to: carData.pcard_dateto || carData.pcar_dateto || null,
					pcar_day: carData.pcar_day ?? null,
					pcar_hour: carData.pcar_hour ?? null,
				});
				const ccList: string[] = [];
				if (!isSameApplicantDriver && driverEmail) ccList.push(driverEmail);
				if (POOLCAR_ADMIN_CC.length) ccList.push(...POOLCAR_ADMIN_CC);
				const cc = ccList.length ? ccList.join(',') : undefined;
				await mailer.sendMail(applicantEmail, subject, html, cc ? { cc } : undefined);
			}

			// Supervisor email
			if (applicantRamco) {
				const supervisor = await getSupervisorBySubordinate(applicantRamco);
				if (supervisor && supervisor.email) {
					const html = poolCarSupervisorEmail({
						id,
						subject,
						pcar_datererq: carData.pcar_datererq || carData.pcar_datereq || null,
						pcar_empid: applicantRamco,
						applicant_name: applicant?.full_name || applicant?.name || null,
						pcar_dest: carData.pcar_dest || null,
						pcar_purp: carData.pcar_purp || null,
						date_from: carData.pcard_datefr || carData.pcar_datefr || null,
						date_to: carData.pcard_dateto || carData.pcar_dateto || null,
						pcar_day: carData.pcar_day ?? null,
						pcar_hour: carData.pcar_hour ?? null
					});
					const cc = POOLCAR_ADMIN_CC.length ? POOLCAR_ADMIN_CC.join(',') : undefined;
					await mailer.sendMail(supervisor.email, subject, html, cc ? { cc } : undefined);
				}
			}
		} catch (mailErr) {
			console.error('createPoolCar: email notification error', mailErr);
		}

		res.status(201).json({
			status: 'success',
			message: 'Pool car created successfully',
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

export const updatePoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const carData = mapPoolCarPayload(req.body);
		const result = await maintenanceModel.updatePoolCar(Number(id), carData);

		res.json({
			status: 'success',
			message: 'Pool car updated successfully',
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

// Mark a pool car application as returned (record return date/time and odometer)
// Route: PUT /api/mtn/poolcars/:id/returned
// Payload: { pcar_retdate: 'YYYY-MM-DD HH:mm:ss', pcar_odo_end: number }
export const returnPoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const body = req.body || {};
		const pcarId = Number(id || body.pcar_id);
		if (!Number.isFinite(pcarId) || pcarId <= 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid pcar_id', data: null });
		}

		const pcar_retdate = body.pcar_retdate || body.return_date || null;
		const pcar_odo_end = (body.pcar_odo_end !== undefined && body.pcar_odo_end !== null)
			? Number(body.pcar_odo_end)
			: (body.odo_end !== undefined ? Number(body.odo_end) : null);

		if (!pcar_retdate) {
			return res.status(400).json({ status: 'error', message: 'pcar_retdate is required', data: null });
		}
		if (pcar_odo_end !== null && !Number.isFinite(pcar_odo_end)) {
			return res.status(400).json({ status: 'error', message: 'pcar_odo_end must be a number if provided', data: null });
		}

		const payload: any = { pcar_retdate };
		if (pcar_odo_end !== null) payload.pcar_odo_end = pcar_odo_end;

		await maintenanceModel.updatePoolCar(pcarId, payload);

		return res.json({ status: 'success', message: 'Pool car marked as returned', data: { id: pcarId, pcar_retdate, pcar_odo_end } });
	} catch (error: any) {
		return res.status(500).json({ status: 'error', message: error?.message || 'Failed to update return info', data: null });
	}
};

// User-driven cancellation for Pool Car application
// Route: PUT /api/mtn/poolcars/:id/cancellation
// Payload: { cancel_date: 'YYYY-MM-DD HH:mm:ss', pcar_canrem: string, pcar_cancel: 'cancelled' | null }
export const cancelPoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const body = req.body || {};
		const pcarId = Number(id || body.pcar_id);
		if (!Number.isFinite(pcarId)) {
			return res.status(400).json({ status: 'error', message: 'Invalid pcar_id', data: null });
		}

		// Interpret the cancellation flag (expects literal 'cancelled' per payload spec)
		const isCancelled = typeof body.pcar_cancel === 'string' && String(body.pcar_cancel).toLowerCase() === 'cancelled';

		const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const update: any = {};

		if (isCancelled) {
			update.pcar_cancel = 1;
			update.cancel_date = body.cancel_date || nowStr;
			update.pcar_canrem = body.pcar_canrem ?? null;
			// Optionally capture actor
			const actor = (req.user && typeof req.user === 'object') ? ((req.user as any).ramco_id || (req.user as any).username || null) : null;
			if (actor) update.cancel_by = actor;
			// Do not alter approval/allocation fields here (user-level cancellation)
		} else {
			// Clearing cancellation
			update.pcar_cancel = 0;
			update.cancel_date = null;
			if (Object.prototype.hasOwnProperty.call(body, 'pcar_canrem')) update.pcar_canrem = body.pcar_canrem;
		}

		await maintenanceModel.updatePoolCar(pcarId, update);
		return res.json({ status: 'success', message: isCancelled ? 'Pool car cancelled' : 'Pool car cancellation cleared', data: { id: pcarId } });
	} catch (err: any) {
		return res.status(500).json({ status: 'error', message: err?.message || 'Failed to update pool car cancellation', data: null });
	}
};

// Supervisor verification endpoint (Approve/Reject)
export const verifyPoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const ramco = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : '';
		// Allow decision via query or body
		const decision = (typeof req.query.decision === 'string' ? req.query.decision : req.body?.decision) as string | undefined;
		const payload = req.body || {};

		if (!ramco) {
			return res.status(400).json({ status: 'error', message: 'Missing supervisor ramco in query ?ramco=' });
		}
		if (!decision) {
			return res.status(400).json({ status: 'error', message: 'Missing decision (approved|rejected)' });
		}
		const now = new Date();
		const recommendation_stat = decision === 'approved' ? 1 : decision === 'rejected' ? 2 : 0;
		if (!recommendation_stat) {
			return res.status(400).json({ status: 'error', message: 'Invalid decision value' });
		}

		const update: any = {
			recommendation: ramco,
			recommendation_stat,
			recommendation_date: payload.recommendation_date || now.toISOString().slice(0, 19).replace('T', ' ')
		};

		await maintenanceModel.updatePoolCar(Number(id), update);

		res.json({ status: 'success', message: 'Verification updated', data: { id: Number(id), ...update } });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

// GET variant for email link clicks - performs verification and returns a simple HTML page
export const verifyPoolCarGet = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const ramco = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : '';
		const decision = typeof req.query.decision === 'string' ? req.query.decision : undefined;
		if (!ramco || !decision) {
			res.status(400).send('<!doctype html><html><body><h3>Invalid verification link</h3><p>Missing ramco or decision.</p></body></html>');
			return;
		}
		const recommendation_stat = decision === 'approved' ? 1 : decision === 'rejected' ? 2 : 0;
		if (!recommendation_stat) {
			res.status(400).send('<!doctype html><html><body><h3>Invalid decision</h3><p>Use approved or rejected.</p></body></html>');
			return;
		}
		const recommendation_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await maintenanceModel.updatePoolCar(Number(id), { recommendation: ramco, recommendation_stat, recommendation_date });
		const title = decision === 'approved' ? 'Approved' : 'Rejected';
		res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Pool Car ${title}</title>
				<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:#f9fafb;color:#111827;padding:24px} .card{max-width:680px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.06)} .bar{height:6px;background:linear-gradient(90deg,#22c55e,#16a34a,#065f46);border-top-left-radius:8px;border-top-right-radius:8px} .content{padding:20px 24px} .muted{color:#6b7280} .ok{color:#065f46;font-weight:600}</style></head>
				<body><div class="card"><div class="bar"></div><div class="content">
				<h2 style="margin:0 0 8px;">Verification ${title}</h2>
				<p class="muted">Your action has been recorded for request #${Number(id)}.</p>
				<p class="ok">ADMS4</p>
				</div></div></body></html>`);
	} catch (error) {
		res.status(500).send('<!doctype html><html><body><h3>Server error</h3><p>Please try again later.</p></body></html>');
	}
};

export const deletePoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await maintenanceModel.deletePoolCar(Number(id));

		res.json({
			status: 'success',
			message: 'Pool car deleted successfully',
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

// Admin update for Pool Car application (assign cards/asset, approve/reject, cancel)
export const updateAdminPoolCar = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const body = req.body || {};
		const pcarId = Number(id || body.pcar_id);
		if (!Number.isFinite(pcarId)) {
			return res.status(400).json({ status: 'error', message: 'Invalid pcar_id', data: null });
		}

		// Normalize booleans/values
		const isCancelled = Boolean(body.pcar_cancel === true || body.pcar_cancel === 1 || body.pcar_cancel === '1' || body.pcar_cancel === 'true');

		// Whitelist / map fields
		const update: any = {};
		const approver = (req.user && typeof req.user === 'object') ? ((req.user as any).ramco_id || (req.user as any).username || null) : null;
		const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

		// Always allow admin to update these if provided
		const directKeys = ['tng_id', 'fleetcard_id', 'asset_id', 'pcar_canrem'];
		for (const k of directKeys) {
			if (Object.prototype.hasOwnProperty.call(body, k)) update[k] = body[k];
		}

		// Approval block
		if (!isCancelled) {
			if (Object.prototype.hasOwnProperty.call(body, 'approval')) update.approval = body.approval ?? approver ?? null;
			if (Object.prototype.hasOwnProperty.call(body, 'approval_stat')) update.approval_stat = Number(body.approval_stat) || null;
			if (Object.prototype.hasOwnProperty.call(body, 'approval_date')) update.approval_date = body.approval_date || nowStr;
			// Ensure mandatory when not cancelled: fleetcard_id and asset_id (if explicitly passed)
			if ((body.hasOwnProperty('fleetcard_id') && (body.fleetcard_id === null || body.fleetcard_id === undefined)) ||
				(body.hasOwnProperty('asset_id') && (body.asset_id === null || body.asset_id === undefined))) {
				// Soft validation: warn but proceed; comment out to enforce hard fail
				// return res.status(400).json({ status: 'error', message: 'fleetcard_id and asset_id are required unless cancelled' });
			}
			update.pcar_cancel = 0;
			update.cancel_date = null;
			update.cancel_by = null;
		} else {
			// Cancellation branch
			update.pcar_cancel = 1;
			update.cancel_date = body.cancel_date || nowStr;
			update.cancel_by = body.cancel_by || approver || null;
			update.pcar_canrem = body.pcar_canrem ?? update.pcar_canrem ?? null;
			// Nullify approval and allocations when cancelled
			update.approval = null;
			update.approval_stat = 0;
			update.approval_date = null;
			update.fleetcard_id = null;
			update.asset_id = null;
		}

		// Persist update
		await maintenanceModel.updatePoolCar(pcarId, update);

		// Fetch latest state for email context
		const car = await maintenanceModel.getPoolCarById(pcarId);
		if (!car) {
			return res.json({ status: 'success', message: 'Updated, but record fetch failed for notification', data: { id: pcarId } });
		}

		// Build and send notification to applicant
		try {
			const applicantRamco = String(car.pcar_empid || '');
			const applicant = applicantRamco ? await assetModel.getEmployeeByRamco(applicantRamco) : null;
			const toEmail = applicant?.email || null;
			const ccList: string[] = [];
			// Optionally CC driver
			const driverRamco = String((car as any).pcar_driver || '');
			if (driverRamco && driverRamco !== applicantRamco) {
				const driver = await assetModel.getEmployeeByRamco(driverRamco);
				if (driver?.email) ccList.push(driver.email);
			}
			if (POOLCAR_ADMIN_CC.length) ccList.push(...POOLCAR_ADMIN_CC);

			if (toEmail) {
				const subjectBase = `Pool Car Request #${pcarId}`;
				let statusLine = '';
				if (isCancelled || car.pcar_cancel === 1) statusLine = 'Cancelled';
				else if (update.approval_stat === 1 || car.approval_stat === 1) statusLine = 'Approved';
				else if (update.approval_stat === 2 || car.approval_stat === 2) statusLine = 'Rejected';
				const subject = statusLine ? `${subjectBase} — ${statusLine}` : `${subjectBase} — Updated`;

				// Optional asset register number
				let assetInfo = '';
				const assetId = Number((car as any).asset_id || 0);
				if (!isNaN(assetId) && assetId > 0) {
					try {
						const asset = await assetModel.getAssetById(assetId);
						const reg = asset?.register_number || asset?.vehicle_regno || '';
						if (reg) assetInfo = `<tr><td style="color:#6b7280;">Assigned Vehicle</td><td><strong>${reg}</strong></td></tr>`;
					} catch { }
				}

				const appDate = (car as any).pcar_datererq || (car as any).pcar_datereq || null;
				const dateFrom = (car as any).pcard_datefr || (car as any).pcar_datefr || null;
				const dateTo = (car as any).pcard_dateto || (car as any).pcar_dateto || null;
				const name = applicant?.full_name || (applicant as any)?.name || '';

				const html = `
					<div style="background:#f9fafb; padding:24px;">
						<div style="max-width:680px; margin:0 auto; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
							<div style="background:linear-gradient(90deg, #22c55e, #16a34a, #065f46); height:6px; border-top-left-radius:8px; border-top-right-radius:8px;"></div>
							<div style="background:#ffffff; padding:20px 24px; border-bottom-left-radius:8px; border-bottom-right-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
								<h2 style="margin:0 0 4px; font-size:20px;">Pool Car Request Update <span style="color:#065f46;">(ID #${pcarId})</span></h2>
								<p style="margin:0 0 16px; color:#374151;">Your application has been ${statusLine || 'updated'}.</p>
								<table cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0 8px; width:100%;">
									<tbody>
										<tr><td style="color:#6b7280; width:260px;">Applicant</td><td>${name} <span style="color:#6b7280;">(${applicantRamco})</span></td></tr>
										<tr><td style="color:#6b7280;">Application Date</td><td>${appDate || '-'}</td></tr>
										<tr><td style="color:#6b7280;">Destination & Purpose</td><td>${(car as any).pcar_dest || '-'} — ${(car as any).pcar_purp || '-'}</td></tr>
										<tr><td style="color:#6b7280;">Trip From / To</td><td>${dateFrom || '-'} → ${dateTo || '-'}</td></tr>
										${assetInfo}
									</tbody>
								</table>
								<div style="margin-top:16px; border-top:1px solid #e5e7eb; padding-top:12px; color:#065f46; font-weight:600;">ADMS4</div>
							</div>
						</div>
					</div>`;

				const cc = ccList.length ? ccList.join(',') : undefined;
				await mailer.sendMail(toEmail, subject, html, cc ? { cc } : undefined);
			}
		} catch (mailErr) {
			console.error('updateAdminPoolCar: email error', mailErr);
		}

		res.json({ status: 'success', message: 'Pool car updated', data: { id: pcarId } });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

// Resend applicant and supervisor emails for a pool car application (admin utility)
export const resendPoolCarMail = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const car = await maintenanceModel.getPoolCarById(Number(id));
		if (!car) {
			return res.status(404).json({ status: 'error', message: 'Pool car not found', data: null });
		}

		const idNum = Number(id);
		const subject = `Pool Car Request #${idNum}`;
		const applicantRamco = String(car.pcar_empid || '');
		const driverRamco = String((car as any).pcar_driver || '');
		const isSameApplicantDriver = applicantRamco && driverRamco && applicantRamco === driverRamco;
		const applicant = applicantRamco ? await assetModel.getEmployeeByRamco(applicantRamco) : null;
		const applicantEmail = applicant?.email || null;
		const driver = !isSameApplicantDriver && driverRamco ? await assetModel.getEmployeeByRamco(driverRamco) : null;
		const driverEmail = driver?.email || null;
		const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || '';

		const appDate = (car as any).pcar_datererq || (car as any).pcar_datereq || null;
		const dateFrom = (car as any).pcard_datefr || (car as any).pcar_datefr || null;
		const dateTo = (car as any).pcard_dateto || (car as any).pcar_dateto || null;

		let sentApplicant = false;
		let sentSupervisor = false;

		try {
			if (applicantEmail) {
				const htmlApplicant = poolCarApplicantEmail({
					id: idNum,
					subject,
					pcar_datererq: appDate,
					pcar_empid: applicantRamco,
					applicant_name: applicant?.full_name || applicant?.name || null,
					pcar_dest: (car as any).pcar_dest || null,
					pcar_purp: (car as any).pcar_purp || null,
					date_from: dateFrom,
					date_to: dateTo,
					pcar_day: (car as any).pcar_day ?? null,
					pcar_hour: (car as any).pcar_hour ?? null,
				});
				const ccList: string[] = [];
				if (!isSameApplicantDriver && driverEmail) ccList.push(driverEmail);
				if (POOLCAR_ADMIN_CC.length) ccList.push(...POOLCAR_ADMIN_CC);
				const cc = ccList.length ? ccList.join(',') : undefined;
				await mailer.sendMail(applicantEmail, subject, htmlApplicant, cc ? { cc } : undefined);
				sentApplicant = true;
			}

			if (applicantRamco) {
				const supervisor = await getSupervisorBySubordinate(applicantRamco);
				const supervisorId = (applicant as any)?.supervisor_id || '';
				if (supervisor && supervisor.email) {
					const htmlSupervisor = poolCarSupervisorEmail({
						id: idNum,
						subject,
						pcar_datererq: appDate,
						pcar_empid: applicantRamco,
						applicant_name: applicant?.full_name || applicant?.name || null,
						pcar_dest: (car as any).pcar_dest || null,
						pcar_purp: (car as any).pcar_purp || null,
						date_from: dateFrom,
						date_to: dateTo,
						pcar_day: (car as any).pcar_day ?? null,
						pcar_hour: (car as any).pcar_hour ?? null
					});
					const cc = POOLCAR_ADMIN_CC.length ? POOLCAR_ADMIN_CC.join(',') : undefined;
					await mailer.sendMail(supervisor.email, subject, htmlSupervisor, cc ? { cc } : undefined);
					sentSupervisor = true;
				}
			}
		} catch (mailErr) {
			console.error('resendPoolCarMail: email error', mailErr);
		}

		return res.json({
			status: 'success',
			message: 'Resend email process completed',
			data: { id: idNum, sentApplicant, sentSupervisor }
		});
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

// Helper to get available pool car types for dropdowns
export const getAvailablePoolCars = async (req: Request, res: Response) => {
	try {
		const cars = await maintenanceModel.getAvailablePoolCars();
		res.json({ status: 'success', message: 'Available pool cars retrieved', data: cars });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};



/* ================= TOUCH N GO ================= */
export const getTouchNGoCards = async (req: Request, res: Response) => {
	try {
		const cards = await maintenanceModel.getTngRecords();
		res.json({
			status: 'success',
			message: 'Touch N Go cards retrieved successfully',
			data: cards
		});
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
	}
}

export const getTouchNGoCardById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const cardId = Number(id);
		if (Number.isNaN(cardId)) {
			return res.status(400).json({ status: 'error', message: 'Invalid card id', data: null });
		}
		const card = await maintenanceModel.getTngRecordById(cardId);
		if (!card) {
			return res.status(404).json({ status: 'error', message: 'Touch N Go card not found', data: null });
		}
		// fetch usage / details
		let usage = [] as any[];
		try {
			usage = await maintenanceModel.getTngDetailsByTngId(cardId);
		} catch (e) {
			usage = [];
		}
		// Attempt to sort usage by a likely date column if present
		const dateCols = ['txn_date', 'trans_date', 'transaction_date', 'date_used', 'created_at'];
		const detectedDateCol = usage.length ? dateCols.find(c => Object.prototype.hasOwnProperty.call(usage[0], c)) : undefined;
		if (detectedDateCol) {
			usage.sort((a, b) => {
				const da = new Date(a[detectedDateCol]);
				const db = new Date(b[detectedDateCol]);
				return db.getTime() - da.getTime();
			});
		}
		const enriched = {
			...card,
			usage_count: usage.length,
			usage
		};
		res.json({ status: 'success', message: 'Touch N Go card retrieved successfully', data: enriched });
	} catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
	}
};

export const createTouchNGoCard = async (req: Request, res: Response) => {
	try {
		const cardData = req.body || {};
		const result = await maintenanceModel.createTngRecord(cardData);

		res.status(201).json({
			status: 'success',
			message: 'Touch N Go card created successfully',
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

export const updateTouchNGoCard = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const cardData = req.body || {};
		const result = await maintenanceModel.updateTngRecord(Number(id), cardData);

		res.json({
			status: 'success',
			message: 'Touch N Go card updated successfully',
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

export const deleteTouchNGoCard = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await maintenanceModel.deleteTngRecord(Number(id));

		res.json({
			status: 'success',
			message: 'Touch N Go card deleted successfully',
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