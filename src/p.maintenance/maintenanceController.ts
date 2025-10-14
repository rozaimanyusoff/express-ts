// src/p.maintenance/maintenanceController.ts
import { Request, Response } from 'express';
import * as maintenanceModel from './maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';
import * as billingModel from '../p.billing/billingModel';
import * as crypto from 'crypto';
import * as mailer from '../utils/mailer';
import vehicleMaintenanceEmail from '../utils/emailTemplates/vehicleMaintenanceRequest';
import poolCarApplicantEmail from '../utils/emailTemplates/poolCarApplicant';
import poolCarSupervisorEmail from '../utils/emailTemplates/poolCarSupervisor';
import { getSupervisorBySubordinate } from '../utils/employeeHelper';

// Admin CC list for pool car submission notifications (comma-separated in env or define directly)
const POOLCAR_ADMIN_CC: string[] = (process.env.POOLCAR_ADMIN_CC || '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

/* ============== MAINTENANCE RECORDS MANAGEMENT =============== */

/* ================== FLEET INSURANCE + ROADTAX ================== */

// Helper to normalize asset IDs from various keys
function normalizeAssetIds(input: any): number[] {
	const body = input || {};
	let ids: any = body.assets_ids ?? body.asset_ids ?? body.assets ?? body.assetIds ?? [];
	if (typeof ids === 'string') {
		ids = ids.split(',').map((s: string) => s.trim()).filter(Boolean);
	}
	if (!Array.isArray(ids)) ids = [];
	return ids.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n));
}

export const createFleetInsurance = async (req: Request, res: Response) => {
	try {
		const body = req.body || {};
		const payload = {
			assets_ids: normalizeAssetIds(body),
			insurance: {
				insurer: body.insurance?.insurer,
				policy_no: body.insurance?.policy_no,
				coverage_start: body.insurance?.coverage_start,
				coverage_end: body.insurance?.coverage_end,
				premium_amount: body.insurance?.premium_amount ?? null,
				coverage_details: body.insurance?.coverage_details ?? null,
				updated_by: (typeof req.user === 'object' && req.user && 'ramco_id' in req.user) ? (req.user as any).ramco_id : (body.insurance?.updated_by ?? null)
			}
		} as any;

		if (!payload.insurance?.insurer || !payload.insurance?.policy_no) {
			return res.status(400).json({ status: 'error', message: 'insurer and policy_no are required', data: null });
		}

		const id = await maintenanceModel.createFleetInsuranceWithAssets(payload);

		// Build response shape
		const record = await maintenanceModel.getFleetInsuranceById(id);
		if (!record) {
			return res.status(500).json({ status: 'error', message: 'Failed to fetch created insurance', data: null });
		}

		// Enrich assets: get asset details for category/register_number
		const assetIds = (record.assets || []).map((r: any) => Number(r.asset_id)).filter((n: any) => Number.isFinite(n));
		const [assetsRaw, categoriesRaw] = await Promise.all([
			assetModel.getAssetsByIds(assetIds),
			assetModel.getCategories(),
		]);
		const assetsArr = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
		const categoriesArr = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
		const assetMap = new Map(assetsArr.map(a => [Number(a.id), a]));
		const categoryMap = new Map(categoriesArr.map(c => [Number(c.id), c]));

		const response = {
			id: record.insurance.id,
			insurer: record.insurance.insurer,
			policy_no: record.insurance.policy_no,
			coverage_start: record.insurance.coverage_start,
			coverage_end: record.insurance.coverage_end,
			premium_amount: record.insurance.premium_amount ?? null,
			coverage_details: record.insurance.coverage_details ?? null,
			created_at: record.insurance.created_at,
			updated_at: record.insurance.updated_at,
			assets: (record.assets || []).map((rt: any) => {
				const a = assetMap.get(Number(rt.asset_id));
				const category = a?.category_id ? categoryMap.get(Number(a.category_id)) : null;
				return {
					id: Number(rt.asset_id),
					register_number: a?.register_number ?? rt.register_number ?? null,
					category: category?.name ?? null,
					roadtax_expiry: rt.roadtax_expiry ?? null,
					roadtax_amount: rt.roadtax_amount ?? null,
				};
			})
		};

		return res.status(201).json({
			status: 'success',
			message: 'Insurance details added successfully.',
			data: response,
		});
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

export const updateFleetInsurance = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const body = req.body || {};
		const payload = {
			assets_ids: normalizeAssetIds(body),
			insurance: {
				insurer: body.insurance?.insurer,
				policy_no: body.insurance?.policy_no,
				coverage_start: body.insurance?.coverage_start,
				coverage_end: body.insurance?.coverage_end,
				premium_amount: body.insurance?.premium_amount ?? null,
				coverage_details: body.insurance?.coverage_details ?? null,
				updated_by: (typeof req.user === 'object' && req.user && 'ramco_id' in req.user) ? (req.user as any).ramco_id : (body.insurance?.updated_by ?? null)
			}
		} as any;

		await maintenanceModel.updateFleetInsuranceWithAssets(Number(id), payload);
		const record = await maintenanceModel.getFleetInsuranceById(Number(id));
		if (!record) {
			return res.status(404).json({ status: 'error', message: 'Insurance not found', data: null });
		}

		const assetIds = (record.assets || []).map((r: any) => Number(r.asset_id)).filter((n: any) => Number.isFinite(n));
		const [assetsRaw, categoriesRaw] = await Promise.all([
			assetModel.getAssetsByIds(assetIds),
			assetModel.getCategories(),
		]);
		const assetsArr = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
		const categoriesArr = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
		const assetMap = new Map(assetsArr.map(a => [Number(a.id), a]));
		const categoryMap = new Map(categoriesArr.map(c => [Number(c.id), c]));

		const response = {
			id: record.insurance.id,
			insurer: record.insurance.insurer,
			policy_no: record.insurance.policy_no,
			coverage_start: record.insurance.coverage_start,
			coverage_end: record.insurance.coverage_end,
			premium_amount: record.insurance.premium_amount ?? null,
			coverage_details: record.insurance.coverage_details ?? null,
			created_at: record.insurance.created_at,
			updated_at: record.insurance.updated_at,
			assets: (record.assets || []).map((rt: any) => {
				const a = assetMap.get(Number(rt.asset_id));
				const category = a?.category_id ? categoryMap.get(Number(a.category_id)) : null;
				return {
					id: Number(rt.asset_id),
					register_number: a?.register_number ?? rt.register_number ?? null,
					category: category?.name ?? null,
					roadtax_expiry: rt.roadtax_expiry ?? null,
					roadtax_amount: rt.roadtax_amount ?? null,
				};
			})
		};

		return res.json({ status: 'success', message: 'Insurance details updated successfully.', data: response });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

export const getFleetInsuranceById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const record = await maintenanceModel.getFleetInsuranceById(Number(id));
		if (!record) {
			return res.status(404).json({ status: 'error', message: 'Insurance not found', data: null });
		}

		const assetIds = (record.assets || []).map((r: any) => Number(r.asset_id)).filter((n: any) => Number.isFinite(n));
		const [assetsRaw, categoriesRaw] = await Promise.all([
			assetModel.getAssetsByIds(assetIds),
			assetModel.getCategories(),
		]);
		const assetsArr = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
		const categoriesArr = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
		const assetMap = new Map(assetsArr.map(a => [Number(a.id), a]));
		const categoryMap = new Map(categoriesArr.map(c => [Number(c.id), c]));

		const response = {
			id: record.insurance.id,
			insurer: record.insurance.insurer,
			policy_no: record.insurance.policy_no,
			coverage_start: record.insurance.coverage_start,
			coverage_end: record.insurance.coverage_end,
			premium_amount: record.insurance.premium_amount ?? null,
			coverage_details: record.insurance.coverage_details ?? null,
			created_at: record.insurance.created_at,
			updated_at: record.insurance.updated_at,
			assets: (record.assets || []).map((rt: any) => {
				const a = assetMap.get(Number(rt.asset_id));
				const category = a?.category_id ? categoryMap.get(Number(a.category_id)) : null;
				return {
					id: Number(rt.asset_id),
					register_number: a?.register_number ?? rt.register_number ?? null,
					category: category?.name ?? null,
					roadtax_expiry: rt.roadtax_expiry ?? null,
					roadtax_amount: rt.roadtax_amount ?? null,
				};
			})
		};

		return res.json({ status: 'success', message: 'Insurance details retrieved successfully.', data: response });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

export const listFleetInsurances = async (req: Request, res: Response) => {
	try {
		const rows = await maintenanceModel.listFleetInsurances();
		const counts = await maintenanceModel.getRoadtaxCountsByInsurer();
		const countMap = new Map((Array.isArray(counts) ? counts : []).map((r: any) => [Number(r.insurer_id), Number(r.assets_count) || 0]));

		const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
			id: r.id,
			insurer: r.insurer,
			policy_no: r.policy_no,
			coverage_start: r.coverage_start,
			coverage_end: r.coverage_end,
			premium_amount: r.premium_amount ?? null,
			coverage_details: r.coverage_details ?? null,
			created_at: r.created_at,
			updated_at: r.updated_at,
			assets_count: countMap.get(Number(r.id)) || 0,
		}));

		return res.json({ status: 'success', message: 'Insurance list retrieved successfully.', data });
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: null });
	}
};

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

// Helper: fetch raw record from model and resolve nested lookups into a consistent shape
async function resolveVehicleMtnRecord(id: number) {
	const record = await maintenanceModel.getVehicleMtnRequestById(Number(id));
	if (!record) return null;

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

	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
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

	return resolvedRecord;
}

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

		// Try to resolve the created record id
		let createdId: number | undefined;
		if (result && typeof result === 'object') {
			// common shapes: { req_id: number } or { insertId: number } or the full record
			if ((result as any).req_id) createdId = Number((result as any).req_id);
			else if ((result as any).insertId) createdId = Number((result as any).insertId);
			else if ((result as any).id) createdId = Number((result as any).id);
		}

		// Attempt to fetch full resolved record to include in email
		let fullRecord: any = null;
		if (createdId) {
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
				// allow test override via query, body or env (same precedence as resendMaintenancePortalLink)
				const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
				const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;

				// debug: log resolved record and chosen recipient
				console.log('createVehicleMtnRequest: resolved record for email:', JSON.stringify(rec && typeof rec === 'object' ? (rec) : 'null'));
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
						const others = (rr as any[]).filter((r: any) => Number(r.req_id) !== Number(rec.req_id));
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

				let recipientEmail = (rec.requester && (rec.requester.email || rec.requester.contact)) || (recordData && (recordData.email || recordData.contact)) || null;
				// apply test override if present
				if (localTestEmail) {
					recipientEmail = localTestEmail;
				}

				console.log('createVehicleMtnRequest: sending email to:', recipientEmail, 'testMode=', !!localTestEmail);

				if (recipientEmail) {
					await mailer.sendMail(recipientEmail, emailSubject, emailBody);
				} else {
					console.warn('createVehicleMtnRequest: no recipientEmail resolved; skipping mail send');
				}
			}
		} catch (mailErr) {
			// do not fail the request creation if email fails; log and continue
			console.error('Failed to send maintenance notification email', mailErr);
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
		// Pass request body directly to model for update. Model will use data.{bodyField} mapping.
		const data = req.body || {};
		const result = await maintenanceModel.updateVehicleMtnRequest(Number(id), data);

		// If this update includes verification_stat = 1, notify recommender to review/recommend
		try {
			const verificationFlag = data.verification_stat === 1 || data.verification_stat === '1' || data.verification_stat === true;
			if (verificationFlag) {
				// fetch fresh record to get recommender ramco_id
				const record = await maintenanceModel.getVehicleMtnRequestById(Number(id));
				if (record && (record as any).recommendation) {
					// resolve recommender from employees list
					const employeesRaw = await assetModel.getEmployees();
					const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
					const recommender: any = employees.find((e: any) => String(e.ramco_id) === String((record as any).recommendation));

					if (recommender) {
						// TEST EMAIL OVERRIDE precedence: query/body then env
						const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
						const GLOBAL_TEST_NAME = process.env.TEST_NAME || null;
						const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;
						const localTestName = (req.query && (req.query.testName as string)) || (req.body && (req.body.testName || req.body.TEST_NAME)) || GLOBAL_TEST_NAME || null;

						// find authorized person from approval levels (module = 'maintenance')
						let authorizerInfo: { ramco_id?: string; name?: string | null; email?: string | null } | null = null;
						try {
							const approvalLevelsRaw = await userModel.getApprovalLevels();
							const approvalLevels = Array.isArray(approvalLevelsRaw) ? approvalLevelsRaw as any[] : [];
							const maintenanceLevels = approvalLevels.filter(l => String(l.module_name).toLowerCase() === 'maintenance');
							if (maintenanceLevels.length > 0) {
								// Prefer level_order === 2 if present
								let authLevel = maintenanceLevels.find((l: any) => Number(l.level_order) === 2) || null;
								if (!authLevel) {
									// fallback: choose the highest level_order
									authLevel = maintenanceLevels.reduce((a: any, b: any) => (Number(a.level_order) >= Number(b.level_order) ? a : b));
								}
								// support if approval level contains nested employee info
								const authRamco = authLevel?.ramco_id || (authLevel?.employee && authLevel.employee.ramco_id) || null;
								if (authRamco) {
									const authorizer = employees.find((e: any) => String(e.ramco_id) === String(authRamco));
									if (authorizer) {
										authorizerInfo = { ramco_id: authorizer.ramco_id, name: authorizer.full_name || authorizer.fullname || authorizer.name || null, email: authorizer.email || authorizer.contact || null };
									}
								}
							}
						} catch (authErr) {
							console.warn('Failed to resolve authorizer info from approval levels', authErr);
						}

						// build encrypted credential for recommender
						const credData = {
							ramco_id: recommender.ramco_id,
							contact: recommender.email || recommender.phone || recommender.contact || '',
							req_id: Number(id)
						} as any;
						const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
						const algorithm = 'aes-256-cbc';
						const key = crypto.createHash('sha256').update(secretKey).digest();
						const iv = crypto.randomBytes(16);
						const cipher = crypto.createCipheriv(algorithm, key, iv);
						let encrypted = cipher.update(JSON.stringify(credData), 'utf8', 'hex');
						encrypted += cipher.final('hex');
						const encryptedData = iv.toString('hex') + ':' + encrypted;

						const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
						const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${id}?_cred=${encodeURIComponent(encryptedData)}`;

						const emailSubject = `Maintenance Request Verified — Recommendation Required (Service Order: ${id})`;
						const recipientName = localTestName || recommender.full_name || recommender.fullname || recommender.name || '';
						const authorizerHtml = authorizerInfo ? `<p>Authorized person: ${authorizerInfo.name || ''} ${authorizerInfo.email ? '(' + authorizerInfo.email + ')' : ''}</p>` : '';
						const emailBody = `
						<h3>Maintenance Request Requires Your Recommendation</h3>
						<p>Dear ${recipientName},</p>
						<p>The maintenance request (Request ID: ${id}) has been verified and requires your recommendation.</p>
						${authorizerHtml}
						<p>Please review the request and submit your recommendation via the maintenance portal:</p>
						<p><a href="${portalUrl}" target="_blank">Open Maintenance Portal</a></p>
						<p>Thank you.</p>
						<br>
						<p>Best regards,<br/>Maintenance Team</p>
					`;

						const recipientEmail = localTestEmail || recommender.email || recommender.contact || null;
						if (recipientEmail) {
							console.log('updateVehicleMtnRequest: sending mail', { to: recipientEmail, subject: emailSubject, portalUrl });
							try {
								await mailer.sendMail(recipientEmail, emailSubject, emailBody);
								console.log('updateVehicleMtnRequest: mail sent to', recipientEmail);
							} catch (mailErr) {
								console.error('updateVehicleMtnRequest: mailer error sending to', recipientEmail, mailErr);
							}
						} else {
							console.warn('updateVehicleMtnRequest: recommender found but no email/contact available for', recommender);
						}
					} else {
						console.warn('updateVehicleMtnRequest: recommender ramco_id not found in employees list', (record as any).recommendation);
					}
				}
			}
		} catch (emailErr) {
			console.error('Failed to send recommender notification email', emailErr);
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

		// resolve approval level by action
		const desiredLevelOrder = action === 'recommend' ? 2 : 3;
		const approvalLevelsRaw = await userModel.getApprovalLevels();
		const approvalLevels = Array.isArray(approvalLevelsRaw) ? approvalLevelsRaw as any[] : [];
		const maintenanceLevels = approvalLevels.filter(l => String(l.module_name).toLowerCase() === 'maintenance');

		// prefer exact level_order match; fallback to highest
		let authLevel = maintenanceLevels.find((l: any) => Number(l.level_order) === desiredLevelOrder) || null;
		if (!authLevel && maintenanceLevels.length > 0) {
			authLevel = maintenanceLevels.reduce((a: any, b: any) => (Number(a.level_order) >= Number(b.level_order) ? a : b));
		}

		const ramcoResolved = authLevel?.ramco_id || (authLevel?.employee && authLevel.employee.ramco_id) || null;
		if (!ramcoResolved) {
			return res.status(404).json({ status: 'error', message: `No approval level found for action ${action}` });
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

		// common test override
		const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
		const GLOBAL_TEST_NAME = process.env.TEST_NAME || null;
		const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;
		const localTestName = (req.query && (req.query.testName as string)) || (req.body && (req.body.testName || req.body.TEST_NAME)) || GLOBAL_TEST_NAME || null;

		const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
		const algorithm = 'aes-256-cbc';
		const key = crypto.createHash('sha256').update(secretKey).digest();

		if (action === 'recommend') {
			// find approver at level_order = 3 to notify
			const approverLevel = maintenanceLevels.find((l: any) => Number(l.level_order) === 3) || null;
			const approverRamco = approverLevel?.ramco_id || (approverLevel?.employee && approverLevel.employee.ramco_id) || ramcoResolved;
			const approver = approverRamco ? employees.find((e: any) => String(e.ramco_id) === String(approverRamco)) : null;

			const target = approver || { ramco_id: approverRamco || null, full_name: (approverLevel && approverLevel.level_name) || null, email: localTestEmail };

			const credData = { ramco_id: target.ramco_id, contact: target.email || target.phone || target.contact || '', req_id: requestId } as any;
			const iv = crypto.randomBytes(16);
			const cipher = crypto.createCipheriv(algorithm, key, iv);
			let encrypted = cipher.update(JSON.stringify(credData), 'utf8', 'hex');
			encrypted += cipher.final('hex');
			const encryptedData = iv.toString('hex') + ':' + encrypted;
			const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
			const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?_cred=${encodeURIComponent(encryptedData)}`;

			const emailSubject = `Maintenance Request Approval Required — Service Order: ${requestId}`;
			const recipientName = localTestName || target.full_name || '';
			const emailBody = `
				<h3>Maintenance Request Requires Your Approval</h3>
				<p>Dear ${recipientName},</p>
				<p>The maintenance request (Request ID: ${requestId}) has been recommended and now requires your approval.</p>
				<p>Please review and approve via the portal:</p>
				<p><a href="${portalUrl}" target="_blank">Open Maintenance Portal</a></p>
				<p>Thank you.</p>
				<br>
				<p>Best regards,<br/>Maintenance Team</p>
			`;

			const recipientEmail = localTestEmail || target.email || null;
			console.log('authorizeVehicleMtnRequest (recommend): sending mail', { to: recipientEmail, subject: emailSubject, portalUrl });
			try {
				if (recipientEmail) await mailer.sendMail(recipientEmail, emailSubject, emailBody);
				console.log('authorizeVehicleMtnRequest (recommend): mail sent to', recipientEmail);
			} catch (mailErr) {
				console.error('authorizeVehicleMtnRequest (recommend): mailer error', mailErr);
			}

			return res.json({ status: 'success', message: 'Recommendation processed and approver notified', data: { requestId, sentTo: recipientEmail, testMode: !!localTestEmail } });
		}

		// action === 'approve'
		// notify requester about approval outcome
		const requester = employees.find((e: any) => String(e.ramco_id) === String((record as any).ramco_id));
		const targetUser = requester || { ramco_id: (record as any).ramco_id, full_name: null, email: localTestEmail };
		const credData = { ramco_id: targetUser.ramco_id, contact: targetUser.email || targetUser.phone || targetUser.contact || '', req_id: requestId } as any;
		const iv2 = crypto.randomBytes(16);
		const cipher2 = crypto.createCipheriv(algorithm, key, iv2);
		let encrypted2 = cipher2.update(JSON.stringify(credData), 'utf8', 'hex');
		encrypted2 += cipher2.final('hex');
		const encryptedData2 = iv2.toString('hex') + ':' + encrypted2;
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?_cred=${encodeURIComponent(encryptedData2)}`;

		const approved = Number(approval_status) === 1;
		const emailSubject = approved ? `Maintenance Request Approved — Service Order: ${requestId}` : `Maintenance Request ${Number(approval_status) === 0 ? 'Rejected' : 'Updated'} — Service Order: ${requestId}`;
		const recipientName = localTestName || targetUser.full_name || '';
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

		const recipientEmail = localTestEmail || targetUser.email || (requester && (requester.email || requester.contact)) || null;
		console.log('authorizeVehicleMtnRequest (approve): sending mail to requester', { to: recipientEmail, subject: emailSubject, portalUrl });
		try {
			if (recipientEmail) await mailer.sendMail(recipientEmail, emailSubject, emailBody);
			console.log('authorizeVehicleMtnRequest (approve): mail sent to', recipientEmail);
		} catch (mailErr) {
			console.error('authorizeVehicleMtnRequest (approve): mailer error sending to', recipientEmail, mailErr);
		}

		return res.json({ status: 'success', message: 'Approval processed and requester notified', data: { requestId, sentTo: recipientEmail, testMode: !!localTestEmail } });
	} catch (error) {
		console.error('authorizeVehicleMtnRequest error', error);
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
	}
};

export const resendMaintenancePortalLink = async (req: Request, res: Response) => {
	try {
		const { requestId } = req.params;

		// TEST EMAIL OVERRIDE: prefer query/body override, then env TEST_EMAIL/TEST_NAME
		// Usage for testing:
		// - manual POST: include { testEmail, testName } in body
		// - quick override: set environment vars TEST_EMAIL and/or TEST_NAME
		const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
		const GLOBAL_TEST_NAME = process.env.TEST_NAME || null;

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
			contact: (requester as any).email || (requester as any).phone || '',
			req_id: Number(requestId)
		};

		const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
		const algorithm = 'aes-256-cbc';
		const key = crypto.createHash('sha256').update(secretKey).digest();
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(algorithm, key, iv);

		let encrypted = cipher.update(JSON.stringify(credData), 'utf8', 'hex');
		encrypted += cipher.final('hex');
		const encryptedData = iv.toString('hex') + ':' + encrypted;

		// Vehicle maintenance portal URL that includes encrypted credentials. Send/resend to requestor for approved requests.
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const portalUrl = `${frontendUrl}/mtn/vehicle/portal/${requestId}?_cred=${encodeURIComponent(encryptedData)}`;

		// Send email to requester (or test email). We need similar design & layout as /utils/emailTemplates/vehicleMaintenance.ts
		const emailSubject = 'Vehicle Maintenance Request Portal Access';
		// resolve possible per-request test override
		const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;
		const localTestName = (req.query && (req.query.testName as string)) || (req.body && (req.body.testName || req.body.TEST_NAME)) || GLOBAL_TEST_NAME || null;

		const emailBody = `
			<h3>Maintenance Request Portal Access</h3>
			<p>Dear ${localTestName || (requester as any).full_name || (requester as any).name},</p>
			<p>You can access your maintenance request portal using the link below:</p>
			<p><a href="${portalUrl}" target="_blank">Access Maintenance Portal</a></p>
			<p>Request ID: ${requestId}</p>
			<p>Original Requester: ${(requester as any).full_name || (requester as any).name} (${(requester as any).ramco_id})</p>
			<p>If you have any questions, please contact our maintenance team.</p>
			<br>
			<p>Best regards,<br>Maintenance Team</p>
		`;

		// Use test email (local override or global env) or actual requester email
		const recipientEmail = localTestEmail || (requester as any).email;

		console.log('resendMaintenancePortalLink: sending mail', { to: recipientEmail, subject: emailSubject, portalUrl });
		try {
			await mailer.sendMail(recipientEmail, emailSubject, emailBody);
			console.log('resendMaintenancePortalLink: mail sent to', recipientEmail);
		} catch (mailErr) {
			console.error('resendMaintenancePortalLink: mailer error sending to', recipientEmail, mailErr);
		}

		res.json({
			status: 'success',
			message: 'Portal link sent successfully',
			data: {
				requestId: Number(requestId),
				sentTo: recipientEmail,
				portalUrl,
				testMode: !!localTestEmail
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
		const cars = await maintenanceModel.getPoolCars();
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

		// Filter by ?ramco on pcar_empid if provided
		const filtered = (Array.isArray(cars) ? cars as any[] : []).filter((c: any) => {
			if (!ramco) return true;
			return String(c.pcar_empid) === ramco || String(c.pcar_driver) === ramco || String(c.pass) === ramco;
		});

		// Enrich fields and exclude nulls
		const data = filtered.map((c: any) => {
			const obj: any = { ...c };
			// Enrich employee-related by replacing original fields
			if (c.pcar_empid && empMap.has(String(c.pcar_empid))) {
				const e = empMap.get(String(c.pcar_empid));
				obj.pcar_empid = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
			}
			if (c.pcar_driver && empMap.has(String(c.pcar_driver))) {
				const e = empMap.get(String(c.pcar_driver));
				obj.pcar_driver = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
			}
			// Keep pass as-is (string). Do not add extra passenger object.

			// Enrich department/location/type and asset
			if (c.dept_id != null && deptMap.has(Number(c.dept_id))) {
				const d = deptMap.get(Number(c.dept_id));
				obj.department = { id: Number(d.id), code: d.code || null };
			}
			if (c.loc_id != null && locMap.has(Number(c.loc_id))) {
				const l = locMap.get(Number(c.loc_id));
				obj.location = { id: Number(l.id), name: l.name || null };
			}
			if (c.pcar_type != null && typeMap.has(Number(c.pcar_type))) {
				const t = typeMap.get(Number(c.pcar_type));
				obj.pcar_type = { id: Number(t.id), name: t.name || null };
			}
			if (c.asset_id && assetMap.has(Number(c.asset_id))) {
				const a = assetMap.get(Number(c.asset_id));
				obj.asset = { id: Number(a.id), register_number: a.register_number || a.vehicle_regno || null };
			}
			// Recommendation/approval users
			if (c.recommendation && empMap.has(String(c.recommendation))) {
				const e = empMap.get(String(c.recommendation));
				obj.recommendation = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
			}
			if (c.approval && empMap.has(String(c.approval))) {
				const e = empMap.get(String(c.approval));
				obj.approval = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
			}
			// Remove null fields as requested (exclude nulls)
			Object.keys(obj).forEach((k) => {
				if (obj[k] === null) delete obj[k];
			});
			return obj;
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
		if (car.pcar_type != null && typeMap.has(Number(car.pcar_type))) {
			const t = typeMap.get(Number(car.pcar_type));
			obj.pcar_type = { id: Number(t.id), name: t.name || null };
		}
		if (car.asset_id && assetMap.has(Number(car.asset_id))) {
			const a = assetMap.get(Number(car.asset_id));
			obj.asset = { id: Number(a.id), register_number: a.register_number || a.vehicle_regno || null };
		}
		if (car.recommendation && empMap.has(String(car.recommendation))) {
			const e = empMap.get(String(car.recommendation));
			obj.recommendation = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
		if (car.approval && empMap.has(String(car.approval))) {
			const e = empMap.get(String(car.approval));
			obj.approval = { ramco_id: e.ramco_id, full_name: e.full_name || e.name || null };
		}
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
						pcar_hour: carData.pcar_hour ?? null,
						backendUrl,
						supervisor_id: applicant?.supervisor_id || ''
					});
							const cc = POOLCAR_ADMIN_CC.length ? POOLCAR_ADMIN_CC.join(',') : undefined;
							await mailer.sendMail(supervisor.email, `${subject} — Verification Required`, html, cc ? { cc } : undefined);
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
	}	 catch (error) {
		res.status(500).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'Unknown error occurred',
			data: null
		});
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
							pcar_hour: (car as any).pcar_hour ?? null,
							backendUrl,
							supervisor_id: supervisorId
						});
									const cc = POOLCAR_ADMIN_CC.length ? POOLCAR_ADMIN_CC.join(',') : undefined;
									await mailer.sendMail(supervisor.email, `${subject} — Verification Required`, htmlSupervisor, cc ? { cc } : undefined);
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
