// src/p.billing/billingController.ts
import { Request, Response } from 'express';
import * as billingModel from './billingModel';
import * as assetsModel from '../p.asset/assetModel';
import dayjs from 'dayjs';
import { stat } from 'fs';
import { register } from 'module';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { setUtilityBillRef } from './billingModel';
import { toPublicUrl } from '../utils/uploadUtil';

/* ============== VEHICLE MAINTENANCE =============== */

export const getVehicleMtnBillings = async (req: Request, res: Response) => {
	// Accept optional filters: year or from/to (svc_date). Default to current year.
	const { year, from, to } = req.query as any;
	let startDate: string | undefined;
	let endDate: string | undefined;

	if (from && to) {
		startDate = from;
		endDate = to;
		// single range fetch
		const vehicleMtn = await billingModel.getVehicleMtnBillingByDate(startDate as string, endDate as string);
		// continue with vehicleMtn
		// Fetch lookup lists after
		const workshops = await billingModel.getWorkshops() as any[];
		const assets = await assetsModel.getAssets() as any[];
		const costcenters = await assetsModel.getCostcenters() as any[];
		const locations = await assetsModel.getLocations() as any[];
		// Build lookup maps for fast access
		// Build asset map keyed by id (primary key)
		const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
		const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
		const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
		const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
		// Only return selected fields with nested structure
		const filtered = vehicleMtn.map(b => {
			const asset_id = (b as any).asset_id;
			const cc_id = (b as any).cc_id;
			const loc_id = (b as any).loc_id;
			return {
				inv_id: b.inv_id,
				inv_no: b.inv_no,
				inv_date: b.inv_date,
				svc_order: b.svc_order,
				asset: assetMap.has(asset_id) ? {
					id: asset_id,
					register_number: (assetMap.get(asset_id) as any)?.register_number,
					fuel_type: (assetMap.get(asset_id) as any)?.fuel_type,
					costcenter: ccMap.has(cc_id) ? {
						id: cc_id,
						name: (ccMap.get(cc_id) as any)?.name
					} : null,
					location: locationMap.has(loc_id) ? {
						id: loc_id,
						name: (locationMap.get(loc_id) as any)?.code
					} : null
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
			};
		});
		return res.json({ status: 'success', message: `Vehicle maintenance billings retrieved successfully`, data: filtered });
	}

	// If year param provided, support comma-separated years
	let vehicleMtn: any[] = [];
	if (year) {
		const years = String(year).split(',').map((s: string) => Number(s.trim())).filter((y: number) => !isNaN(y));
		if (years.length === 0) {
			// fallback to current year
			years.push(dayjs().year());
		}
		const seenInv = new Set<number>();
		for (const y of years) {
			const s = dayjs().year(y).startOf('year').toISOString();
			const e = dayjs().year(y).endOf('year').toISOString();
			const rows = Array.isArray(await billingModel.getVehicleMtnBillingByDate(s, e)) ? await billingModel.getVehicleMtnBillingByDate(s, e) : [];
			for (const r of rows) {
				if (!seenInv.has(r.inv_id)) {
					seenInv.add(r.inv_id);
					vehicleMtn.push(r);
				}
			}
		}
	} else {
		// default: current year
		const y = dayjs().year();
		const s = dayjs().year(y).startOf('year').toISOString();
		const e = dayjs().year(y).endOf('year').toISOString();
		vehicleMtn = Array.isArray(await billingModel.getVehicleMtnBillingByDate(s, e)) ? await billingModel.getVehicleMtnBillingByDate(s, e) : [];
	}

	// Fetch lookup lists
	const workshops = await billingModel.getWorkshops() as any[];
	const assets = await assetsModel.getAssets() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const locations = await assetsModel.getLocations() as any[];
	// Build lookup maps for fast access
	// Build asset map keyed by id (primary key)
	const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
	const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
	// Only return selected fields with nested structure
	const filtered = vehicleMtn.map(b => {
		const asset_id = (b as any).asset_id;
		const cc_id = (b as any).cc_id;
		const loc_id = (b as any).loc_id;
		return {
			inv_id: b.inv_id,
			inv_no: b.inv_no,
			inv_date: b.inv_date,
			svc_order: b.svc_order,
			asset: assetMap.has(asset_id) ? {
				id: asset_id,
				register_number: (assetMap.get(asset_id) as any)?.register_number,
				fuel_type: (assetMap.get(asset_id) as any)?.fuel_type,
				costcenter: ccMap.has(cc_id) ? {
					id: cc_id,
					name: (ccMap.get(cc_id) as any)?.name
				} : null,
				location: locationMap.has(loc_id) ? {
					id: loc_id,
					name: (locationMap.get(loc_id) as any)?.code
				} : null
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
		};
	});
	res.json({ status: 'success', message: `Vehicle maintenance billings retrieved successfully`, data: filtered });
};

export const getVehicleMtnBillingById = async (req: Request, res: Response) => {
	const billing = await billingModel.getVehicleMtnBillingById(Number(req.params.id));
	if (!billing) {
		return res.status(404).json({ status: 'error', message: 'Billing not found' });
	}

	// Fetch lookup data
	const assets = await assetsModel.getAssets() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const locations = await assetsModel.getLocations() as any[];
	const workshops = await billingModel.getWorkshops() as any[];

	// Build lookup maps for fast access
	const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
	const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));

	// Use inv_id if available, otherwise fallback to id
	const invoiceId = billing.inv_id;
	const parts = await billingModel.getVehicleMtnBillingParts(invoiceId);

	// Structure the billing data with nested objects
	const asset_id = (billing as any).asset_id;
	const cc_id = (billing as any).cc_id;
	const loc_id = (billing as any).loc_id;

	// Enrich parts: resolve autopart_id -> part_name using bulk fetch
	const autopartIds = Array.from(new Set((parts || []).map((p: any) => Number(p.autopart_id)).filter(n => Number.isFinite(n))));
	const autopartsLookup = autopartIds.length ? await billingModel.getServicePartsByIds(autopartIds) : [];
	const autopartsMap = new Map((autopartsLookup || []).map((a: any) => [Number(a.autopart_id), a]));

	const enrichedParts = (parts || []).map((p: any) => {
		const ap = autopartsMap.get(Number(p.autopart_id));
		// if part_name is missing, try to populate from autoparts table
		const part_name = p.part_name || (ap ? ap.part_name : null) || (ap ? ap.part_name : null);
		return { ...p, part_name };
	});

	const structuredBilling = {
		inv_id: billing.inv_id,
		inv_no: billing.inv_no,
		inv_date: billing.inv_date,
		svc_order: billing.svc_order,
		asset: assetMap.has(asset_id) ? {
			id: asset_id,
			register_number: (assetMap.get(asset_id) as any)?.register_number,
			costcenter: ccMap.has(cc_id) ? {
				id: cc_id,
				name: (ccMap.get(cc_id) as any)?.name
			} : null,
			location: locationMap.has(loc_id) ? {
				id: loc_id,
				name: (locationMap.get(loc_id) as any)?.code
			} : null
		} : null,
		workshop: wsMap.has(billing.ws_id) ? {
			id: billing.ws_id,
			name: (wsMap.get(billing.ws_id) as any)?.ws_name
		} : null,
		svc_date: billing.svc_date,
		svc_odo: billing.svc_odo,
		inv_total: billing.inv_total,
		inv_stat: billing.inv_stat,
		inv_remarks: billing.inv_remarks,
		running_no: billing.running_no,
		parts: enrichedParts,
		// Provide full public URL for the uploaded attachment if present
		//upload: (billing as any).upload ?? (billing as any).attachment ?? null,
		upload_url: toPublicUrl((billing as any).upload ?? (billing as any).attachment ?? null)
	};

	res.json({ status: 'success', message: 'Vehicle maintenance billing retrieved successfully', data: structuredBilling });
};

// This function might be unused due to no manual entry for vehicle maintenance invoicing process except updating
export const updateVehicleMtnBilling = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const body = req.body || {};
	// Map frontend fields to backend fields
	const updateData: any = {
		inv_no: body.inv_no,
		inv_date: body.inv_date,
		svc_order: body.svc_order,
		svc_date: body.svc_date,
		svc_odo: body.svc_odo,
		inv_remarks: body.inv_remarks,
		inv_total: body.inv_total,
		inv_stat: body.inv_stat
	};

	// If this was a multipart/form-data request, req.file may contain the uploaded file
	// Normalize and attach to updateData so the DB update sets the correct upload column.
	// Note: multer puts the file on req.file and other fields remain in req.body (strings).
	const uploadedFile = (req as any).file;
	if (uploadedFile && uploadedFile.path) {
		const normalized = normalizeStoredPath(uploadedFile.path);
		if (normalized) updateData.attachment = normalized; // passed to updateVehicleMtnBilling -> upload column
	}
	// ensure we also set upload in updateData to match DB column used by model
	if (updateData.attachment) updateData.upload = updateData.attachment;

	// Handle parts: body.parts can be an array or a JSON string when using multipart/form-data
	let parts: any[] = [];
	if (Array.isArray(body.parts)) parts = [...body.parts];
	else if (typeof body.parts === 'string') {
		try { parts = JSON.parse(body.parts); } catch (e) { parts = []; }
	}
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part && part.is_custom && part.autopart_id && part.autopart_id < 0) {
			// Insert custom part into service parts table
			const autopartId = await billingModel.createServicePart({
				part_name: part.part_name,
				part_uprice: part.part_uprice,
				part_stat: 1,
			});
			parts[i] = { ...part, autopart_id: autopartId };
		}
	}

	// Full replacement: delete all parts for this invoice, then insert new ones
	await billingModel.deleteAllVehicleMtnBillingParts(id);
	if (parts.length > 0) {
		await billingModel.createVehicleMtnBillingParts(id, parts);
	}

	// If the client provided attachment path as a string field (not file), normalize it too
	if (!updateData.attachment && body.attachment && typeof body.attachment === 'string' && body.attachment.trim() !== '') {
		updateData.attachment = normalizeStoredPath(body.attachment.trim()) || body.attachment.trim();
	}
	// mirror to `upload` field which is the actual column name used in the model
	if (updateData.attachment && !updateData.upload) updateData.upload = updateData.attachment;

	await billingModel.updateVehicleMtnBilling(id, updateData);

	res.json({ status: 'success', message: 'Vehicle maintenance billing updated successfully' });
};

export const deleteVehicleMtnBilling = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteVehicleMtnBilling(id);
	res.json({ status: 'success', message: 'Billing deleted successfully' });
};

export const getVehicleMtnBillingByDate = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	const vehicleMtn = await billingModel.getVehicleMtnBillingByDate(from as string, to as string);
	// Use assetModel.getAssets() instead of billingModel.getTempVehicleRecords() (DB schema changed)
	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const locations = await assetsModel.getLocations() as any[];
	const workshops = await billingModel.getWorkshops() as any[];
	// Build lookup maps for fast access
	// Build asset map keyed by id and by asset_id if present to keep compatibility
	const assetMap = new Map();
	for (const a of (assets || [])) {
		if (a.id) assetMap.set(a.id, a);
		if (a.asset_id) assetMap.set(a.asset_id, a);
	}
	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
	const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
	// Only return selected fields with nested structure
	const filtered = vehicleMtn.map(b => {
		const asset_id = (b as any).asset_id ?? b.vehicle_id;
		return {
			inv_id: b.inv_id,
			inv_no: b.inv_no,
			inv_date: b.inv_date,
			svc_order: b.svc_order,
			asset: assetMap.has(asset_id) ? {
				asset_id: asset_id,
				register_number: (assetMap.get(asset_id) as any)?.register_number || (assetMap.get(asset_id) as any)?.vehicle_regno || null,
				transmission: (assetMap.get(asset_id) as any)?.transmission || (assetMap.get(asset_id) as any)?.vtrans_type || null,
				fuel_type: (assetMap.get(asset_id) as any)?.fuel_type || (assetMap.get(asset_id) as any)?.vfuel_type || null,
				purchase_date: (assetMap.get(asset_id) as any)?.purchase_date || (assetMap.get(asset_id) as any)?.v_dop || null
			} : null,
			costcenter: ccMap.has(b.costcenter_id) ? {
				id: b.costcenter_id,
				name: (ccMap.get(b.costcenter_id) as any)?.name
			} : null,
			district: locationMap.has(b.location_id) ? {
				id: b.location_id,
				name: (locationMap.get(b.location_id) as any)?.code
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
		};
	});
	res.json({ status: 'success', message: 'Vehicle maintenance by date range retrieved successfully', data: filtered });
};

// Check if an invoice number already exists for maintenance billings.
// Query params: inv_no (required), exclude_id (optional, numeric) to ignore a specific record (useful during edit)
export const checkVehicleMtnInvNo = async (req: Request, res: Response) => {
	const inv_no = (req.query.inv_no || '').toString().trim();
	if (!inv_no) return res.status(400).json({ status: 'error', message: 'inv_no is required' });
	const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : undefined;
	const billId = req.query.bill_id ? Number(req.query.bill_id) : undefined;
	const count = await billingModel.countVehicleMtnByInvNo(inv_no, excludeId, billId);
 	if (count > 0) return res.json({ status: 'exists', message: 'inv_no already exists', exists: true });
 	return res.json({ status: 'ok', message: 'inv_no available', exists: false });
};

// Check if a utility bill number already exists (ubill_no)
export const checkUtilityUbillNo = async (req: Request, res: Response) => {
	const ubill_no = (req.query.ubill_no || '').toString().trim();
	if (!ubill_no) return res.status(400).json({ status: 'error', message: 'ubill_no is required' });
	const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : undefined;
	const billId = req.query.bill_id ? Number(req.query.bill_id) : undefined;
	const count = await billingModel.countUtilityByUbillNo(ubill_no, excludeId, billId);
	if (count > 0) return res.json({ status: 'exists', message: 'ubill_no already exists', exists: true });
	return res.json({ status: 'ok', message: 'ubill_no available', exists: false });
};

//Purposely to export maintenance consumption report data to Excel
export const getVehicleMtnBillingByVehicleSummary = async (req: Request, res: Response) => {
	const { from, to, cc } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	// Fetch all lookup data
	const [assetsRaw, costcentersRaw, locationsRaw, categoriesRaw, brandsRaw, modelsRaw, employeesRaw] = await Promise.all([
		assetsModel.getAssets(),
		assetsModel.getCostcenters(),
		assetsModel.getLocations(),
		assetsModel.getCategories(),
		assetsModel.getBrands(),
		assetsModel.getModels(),
		assetsModel.getEmployees()
	]);
	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	// Build assetMap keyed by both id and vehicle_id for compatibility
	const assetMap = new Map((assets as any[]).flatMap((a: any) => {
		const entries: any[] = [[a.id, a]];
		if (a.asset_id) entries.push([a.asset_id, a]);
		return entries;
	}));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locationMap = new Map(locations.map((d: any) => [d.id, d]));
	// Use id as key for categoryMap (since getCategories returns id, not category_id)
	const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	// Use ramco_id as key for employeeMap (since we match by ramco_id from vehicle records)
	const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

	// Parse cost center filter - support comma-separated cost center IDs
	let costcenterIds: number[] = [];
	if (cc) {
		// Support comma-separated cost center IDs
		const ccIds = (cc as string).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		costcenterIds = ccIds;
	}

	// Get all vehicle maintenance records in date range
	const maintenanceRecords = await billingModel.getVehicleMtnBillingByDate(from as string, to as string);
	// Group by asset_id
	const summary: Record<string, any> = {};
	for (const maintenance of maintenanceRecords) {
		// If cost center filter is provided, skip if not matching
		const ccId = (maintenance as any).cc_id ?? maintenance.costcenter_id;
		if (costcenterIds.length > 0 && !costcenterIds.includes(ccId)) continue;
		const asset_id = (maintenance as any).asset_id ?? maintenance.vehicle_id;

		// Resolve category, brand, and model objects
		let category = null;
		let brand = null;
		let model = null;
		let categoryId = null;
		let brandId = null;
		let modelId = null;
		let ramcoId = null;
		if (assetMap.has(asset_id)) {
			const asset = assetMap.get(asset_id) as any;
			categoryId = asset.category_id || asset.categoryId || null;
			brandId = asset.brand_id || asset.brandId || null;
			modelId = asset.model_id || asset.modelId || null;
			ramcoId = asset.ramco_id || asset.ramcoId || null;
		}
		if (categoryId && categoryMap.has(categoryId)) {
			const catObj = categoryMap.get(categoryId);
			category = { id: catObj.id, name: catObj.name };
		}
		if (brandId && brandMap.has(brandId)) {
			const brandObj = brandMap.get(brandId);
			brand = { id: brandObj.id, name: brandObj.name };
		}
		if (modelId && modelMap.has(modelId)) {
			const modelObj = modelMap.get(modelId);
			model = { id: modelObj.id, name: modelObj.name };
		}
		// Resolve owner object by ramco_id
		let owner = null;
		if (ramcoId && employeeMap.has(ramcoId)) {
			const empObj = employeeMap.get(ramcoId);
			owner = { ramco_id: empObj.ramco_id, name: empObj.full_name };
		}

		if (!summary[asset_id]) {
			const vehicleObj = asset_id && assetMap.has(asset_id) ? assetMap.get(asset_id) as any : null;
			const ccId = (maintenance as any).cc_id ?? maintenance.costcenter_id;
			const ccObj = ccId && ccMap.has(ccId) ? ccMap.get(ccId) : null;
			const locId = (maintenance as any).loc_id ?? maintenance.location_id;
			const locationObj = locId && locationMap.has(locId) ? locationMap.get(locId) : null;
			summary[asset_id] = {
				asset: asset_id,
				vehicle: vehicleObj ? (vehicleObj.register_number || vehicleObj.vehicle_regno || null) : null,
				category,
				brand,
				model,
				owner,
				transmission: vehicleObj ? (vehicleObj.transmission || vehicleObj.vtrans_type || null) : null,
				fuel: vehicleObj ? (vehicleObj.fuel_type || vehicleObj.vfuel_type || null) : null,
				purchase_date: vehicleObj?.purchase_date ? dayjs(vehicleObj.purchase_date).format('DD/MM/YYYY') : (vehicleObj?.v_dop ? dayjs(vehicleObj.v_dop).format('DD/MM/YYYY') : null),
				age: vehicleObj ? (vehicleObj.purchase_date ? dayjs().diff(dayjs(vehicleObj.purchase_date), 'year') : (vehicleObj.v_dop ? dayjs().diff(dayjs(vehicleObj.v_dop), 'year') : null)) : null,
				costcenter: ccObj ? { id: ccId, name: ccObj.name } : null,
				district: locationObj ? { id: locId, code: locationObj.code ?? locationObj.name } : null,
				classification: vehicleObj ? (vehicleObj.classification || null) : null,
				record_status: vehicleObj ? (vehicleObj.record_status || null) : null,
				total_maintenance: 0,
				total_amount: 0,
				_yearMap: {} // temp for grouping by year
			};
		}
		summary[asset_id].total_maintenance += 1;
		summary[asset_id].total_amount += parseFloat(maintenance.inv_total || '0');
		// Group by year
		const year = dayjs(maintenance.inv_date).year();
		if (!summary[asset_id]._yearMap[year]) {
			summary[asset_id]._yearMap[year] = { expenses: 0, maintenance: [] };
		}
		summary[asset_id]._yearMap[year].expenses += parseFloat(maintenance.inv_total || '0');
		summary[asset_id]._yearMap[year].maintenance.push({
			inv_id: maintenance.inv_id,
			inv_no: maintenance.inv_no,
			inv_date: maintenance.inv_date,
			svc_order: maintenance.svc_order,
			svc_date: maintenance.svc_date,
			svc_odo: maintenance.svc_odo,
			amount: maintenance.inv_total
		});
	}
	// Format output
	const result = Object.values(summary).map((asset: any) => {
		const details = Object.entries(asset._yearMap).map(([year, data]: [string, any]) => ({
			year: Number(year),
			expenses: data.expenses.toFixed(2),
			maintenance: data.maintenance
		}));
		// Remove temp _yearMap from output
		const { _yearMap, ...rest } = asset;
		return { ...rest, details };
	});

	// Sort by vehicle field in ascending order
	result.sort((a: any, b: any) => {
		const aVehicle = a.vehicle || '';
		const bVehicle = b.vehicle || '';
		return aVehicle.toLowerCase().localeCompare(bVehicle.toLowerCase());
	});

	res.json({
		status: 'success',
		message: 'Vehicle maintenance summary by date range retrieved successfully',
		data: result,
	});
};


/* ================ WORKSHOP ==================== */

export const getWorkshops = async (req: Request, res: Response) => {
	const workshops = await billingModel.getWorkshops();
	res.json({ status: 'success', message: 'Workshops retrieved successfully', data: workshops });
};

export const getWorkshopById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const workshop = await billingModel.getWorkshopById(id);
	if (!workshop) {
		return res.status(404).json({ status: 'error', message: 'Workshop not found' });
	}
	res.json({ status: 'success', message: 'Workshop retrieved successfully', data: workshop });
};

export const createWorkshop = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createWorkshop(req.body);
		res.status(201).json({ status: 'success', message: 'Workshop created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create workshop', error });
	}
};

export const updateWorkshop = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateWorkshop(id, req.body);
		res.json({ status: 'success', message: 'Workshop updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update workshop', error });
	}
};

export const deleteWorkshop = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.deleteWorkshop(id);
		res.json({ status: 'success', message: 'Workshop deleted successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to delete workshop', error });
	}
};

/* ============= FUEL BILLING =============== */

export const getFuelBillings = async (req: Request, res: Response) => {
	const fuelBillings = await billingModel.getFuelBilling();
	const data = await Promise.all(
		fuelBillings.map(async (bill: any) => {
			let vendor = null;
			if (bill.stmt_issuer) {
				const fv = await billingModel.getFuelVendorById(bill.stmt_issuer);
				if (fv) {
					// New schema: { id, name, logo, image2 }
					const name = fv.name;
					const baseUrl = process.env.BACKEND_URL || '';
					const logo = fv.logo ? `${baseUrl.replace(/\/$/, '')}/${String(fv.logo).replace(/^\//, '')}` : fv.logo;
					vendor = { id: bill.stmt_issuer, name, logo };
				}
			}
			// Remove fuel_id and stmt_issuer from the result
			const { fuel_id, stmt_issuer, ...rest } = bill;
			return { ...rest, vendor };
		})
	);
	res.json({ status: 'success', message: 'Fuel billing retrieved successfully', data });
};


export const getFuelBillingById = async (req: Request, res: Response) => {
	// Fetch all lookup data
	const [costcentersRaw, districtsRaw, assetsRaw] = await Promise.all([
		assetsModel.getCostcenters(),
		assetsModel.getLocations(),
		assetsModel.getAssets()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(districtsRaw) ? districtsRaw : [];
	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];

	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const locationMap = new Map(locations.map((d: any) => [d.id, d]));
	// Build assetMap keyed by both vehicle_id and id
	const assetMap = new Map((assets as any[]).flatMap((v: any) => {
		const entries: any[] = [[v.id, v]];
		if (v.asset_id) entries.push([v.asset_id, v]);
		return entries;
	}));

	// Fetch all fleet cards
	const fleetCards = await billingModel.getFleetCards();
	const fleetCardMap = new Map(fleetCards.map((fc: any) => [fc.id, fc]));

	const id = Number(req.params.id);
	const fuelBilling = await billingModel.getFuelBillingById(id);
	if (!fuelBilling) {
		return res.status(404).json({ status: 'error', message: 'Fuel billing not found' });
	}

	// Map fuel_issuer using stmt_issuer (not fuel_id)
	let fuel_vendor = null;
	if (fuelBilling.stmt_issuer) {
		const fv = await billingModel.getFuelVendorById(fuelBilling.stmt_issuer);
		if (fv) {
			const name = fv.name;
			const logo = fv.logo ? `${process.env.BACKEND_URL}/${fv.logo}` : null;
			fuel_vendor = { id: fuelBilling.stmt_issuer, vendor: name, logo };
		}
	}

	// Remove fuel_id and stmt_issuer from the result
	const { fuel_id, stmt_issuer, ...rest } = fuelBilling;

	const detailsRaw = await billingModel.getFuelVehicleAmount(id);
	const details = (Array.isArray(detailsRaw) ? detailsRaw : []).map((d: any) => {
		let fleetCard = null;
		if (d.card_id && fleetCardMap.has(d.card_id)) {
			fleetCard = fleetCardMap.get(d.card_id);
		}

		let asset = null;
		if (d.asset_id && assetMap.has(d.asset_id)) {
			const assetData = assetMap.get(d.asset_id) as any;
			asset = {
				id: assetData.id,
				register_number: assetData.register_number,
				fuel_type: assetData.fuel_type,
				costcenter: assetData.costcenter_id && ccMap.has(assetData.costcenter_id)
					? ccMap.get(assetData.costcenter_id)
					: null,
				purpose: assetData.purpose || null,
			};
		}

		return {
			s_id: d.s_id,
			stmt_id: d.stmt_id,
			fleetcard: fleetCard ? { id: fleetCard.id, card_no: fleetCard.card_no } : null,
			asset,
			category: fleetCard ? fleetCard.category : null,
			stmt_date: d.stmt_date,
			start_odo: d.start_odo,
			end_odo: d.end_odo,
			total_km: d.total_km,
			total_litre: d.total_litre,
			amount: d.amount
		};
	});

	// Build costcenter summary grouped by costcenter and purpose
	const costcenterSummaryMap = new Map<string, number>();

	details.forEach((detail: any) => {
		if (detail.asset && detail.asset.costcenter) {
			const costcenterName = detail.asset.costcenter.name;
			const purpose = detail.asset.purpose;

			// Create the summary key based on costcenter and purpose
			let summaryName = costcenterName;
			if (purpose === 'staff cost') {
				summaryName = `${costcenterName} (Staff Cost)`;
			}

			const amount = parseFloat(detail.amount) || 0;
			const currentAmount = costcenterSummaryMap.get(summaryName) || 0;
			costcenterSummaryMap.set(summaryName, currentAmount + amount);
		}
	});

	// Convert map to array format and sort by cost center name
	const costcenter_summ = Array.from(costcenterSummaryMap.entries())
		.map(([name, total_amount]) => ({
			name,
			total_amount: total_amount.toFixed(2)
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	const msg = `Fuel billing retrieved successfully (${costcenter_summ.length} costcenter group(s), ${details.length} transaction detail(s))`;
	res.json({ status: 'success', message: msg, data: { ...rest, fuel_vendor, costcenter_summ, details } });
};

// Get fuel consumption records and summary for a specific vehicle (asset_id)
export const getFuelConsumptionByVehicle = async (req: Request, res: Response) => {
	const vehicleId = Number(req.params.asset_id || req.params.id);
	if (!vehicleId || isNaN(vehicleId)) {
		return res.status(400).json({ status: 'error', message: 'Invalid vehicle id' });
	}

	// Fetch fuel detail rows for the vehicle
	const rows = await billingModel.getFuelVehicleAmountByVehicleId(vehicleId);

	// Try to resolve register_number from assetModel (asset id -> register_number)
	let registerNumber: string | null = null;
	try {
		const asset = await assetsModel.getAssetById(vehicleId as number);
		if (asset && asset.register_number) registerNumber = asset.register_number;
	} catch (err) {
		// ignore - fallback to any register_number present in rows
	}

	// Build a summary: total litres, total amount, total distance (if available), average efficiency
	let totalLitre = 0;
	let totalAmount = 0;
	let totalKm = 0;
	let countEff = 0;

	const records = (rows || []).map((r: any) => {
		const litre = parseFloat(r.total_litre || '0');
		const amount = parseFloat(r.amount || r.total_litre * 0 || '0');
		const km = parseFloat(r.total_km || '0');
		const eff = parseFloat(r.effct || r.efficiency || '0');
		totalLitre += litre;
		totalAmount += amount;
		totalKm += km;
		if (eff > 0) countEff += 1;
		return {
			s_id: r.s_id,
			stmt_id: r.stmt_id,
			stmt_no: r.stmt_no,
			stmt_date: r.stmt_date,
			card_id: r.card_id,
			vehicle_id: r.vehicle_id,
			costcenter_id: r.costcenter_id,
			purpose: r.purpose,
			start_odo: r.start_odo,
			end_odo: r.end_odo,
			total_km: r.total_km,
			total_litre: r.total_litre,
			effct: r.effct,
			amount: r.amount
		};
	});

	const avgEfficiency = countEff > 0 ? (rows.reduce((acc: number, r: any) => acc + parseFloat(r.effct || r.efficiency || '0'), 0) / countEff) : null;

	res.json({
		status: 'success',
		message: `Fuel consumption for vehicle ${vehicleId} retrieved successfully`,
		data: {
			vehicle_id: vehicleId,
			register_number: registerNumber || ((rows && rows.length > 0) ? (rows[0] as any).register_number : null),
			total_litre: totalLitre.toFixed(2),
			total_amount: totalAmount.toFixed(2),
			total_km: totalKm.toFixed(2),
			average_efficiency: avgEfficiency ? Number(avgEfficiency.toFixed(2)) : null,
			records
		}
	});
};

// Get maintenance records and summary for a specific vehicle (asset_id)
export const getVehicleMaintenanceByAsset = async (req: Request, res: Response) => {
	const assetId = Number(req.params.asset_id || req.params.id);
	if (!assetId || isNaN(assetId)) {
		return res.status(400).json({ status: 'error', message: 'Invalid vehicle id' });
	}

	const rows = await billingModel.getVehicleMtnBillingByAssetId(assetId);

	// Try to resolve register_number from assetModel
	let registerNumber: string | null = null;
	try {
		const asset = await assetsModel.getAssetById(assetId as number);
		if (asset && asset.register_number) registerNumber = asset.register_number;
	} catch (err) {
		// ignore
	}

	// Build totals
	let totalMaintenance = 0;
	let totalAmount = 0;
	const records = (rows || []).map((r: any) => {
		totalMaintenance += 1;
		totalAmount += parseFloat(r.inv_total || '0');
		return {
			inv_id: r.inv_id,
			req_id: r.svc_order,
			inv_no: r.inv_no,
			inv_date: r.inv_date,
			svc_date: r.svc_date,
			odometer: r.svc_odo,
			inv_total: r.inv_total,
			inv_stat: r.inv_stat,
			inv_remarks: r.inv_remarks
		};
	});

	const regNoForMsg = registerNumber || ((rows && rows.length > 0) ? (rows[0] as any).register_number : null);
	res.json({
		status: 'success',
		message: `Vehicle maintenance for vehicle by asset ID: ${assetId}${regNoForMsg ? ' (' + regNoForMsg + ')' : ''} retrieved successfully`,
		data: {
			id: assetId,
			register_number: regNoForMsg,
			total_maintenance: totalMaintenance,
			total_amount: totalAmount.toFixed(2),
			records
		}
	});
};


export const createFuelBilling = async (req: Request, res: Response) => {
	try {
		// Map frontend payload to backend model
		const { stmt_no, stmt_date, stmt_litre, stmt_stotal, stmt_disc, stmt_total, stmt_issuer, petrol_amount, diesel_amount, stmt_ron95, stmt_ron97, stmt_diesel, stmt_count, stmt_total_km, details } = req.body;

		// Convert stmt_issuer to number (fuel_id)
		const fuel_id = Number(stmt_issuer);

		// Prepare payload for model
		const payload = {
			stmt_no,
			stmt_date,
			stmt_litre,
			stmt_stotal,
			stmt_disc,
			stmt_total,
			stmt_issuer: fuel_id,
			petrol_amount,
			diesel_amount,
			stmt_ron95,
			stmt_ron97,
			stmt_diesel,
			stmt_count,
			stmt_total_km,
			details: Array.isArray(details) ? details.map((d: any) => ({
				vehicle_id: d.vehicle_id,
				asset_id: d.asset_id,
				entry_code: d.entry_code || null, // entry_code is not used currently
				stmt_date: d.stmt_date,
				card_id: d.card_id,
				cc_id: d.cc_id,
				costcenter_id: d.costcenter_id,
				loc_id: d.loc_id,
				location_id: d.location_id || null, // location_id is not used currently
				category: d.category,
				start_odo: d.start_odo,
				end_odo: d.end_odo,
				total_km: d.total_km,
				total_litre: d.total_litre,
				efficiency: d.efficiency,
				amount: d.amount
			})) : []
		};

		// Insert parent record
		const insertId = await billingModel.createFuelBilling(payload);

		// Insert child detail records using createFuelVehicleAmount
		if (Array.isArray(payload.details)) {
			for (const detail of payload.details) {
				await billingModel.createFuelVehicleAmount({
					stmt_id: insertId,
					stmt_date: detail.stmt_date,
					card_id: detail.card_id,
					vehicle_id: detail.vehicle_id,
					asset_id: detail.asset_id,
					entry_code: detail.entry_code,
					costcenter_id: detail.costcenter_id,
					location_id: detail.location_id,
					category: detail.category,
					start_odo: detail.start_odo,
					end_odo: detail.end_odo,
					total_km: detail.total_km,
					total_litre: detail.total_litre,
					efficiency: detail.efficiency,
					amount: detail.amount
				});
			}
		}
		res.status(201).json({ status: 'success', message: 'Fuel billing created successfully', id: insertId });
	} catch (error) {
		// Check if it's a duplicate entry error
		if (error instanceof Error && error.message.includes('already exists')) {
			res.status(409).json({ status: 'error', message: error.message });
		} else {
			res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create fuel billing', error });
		}
	}
};

export const updateFuelBilling = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		// Update parent record
		await billingModel.updateFuelBilling(id, req.body);

		// Fetch details from request
		const details = req.body.details;
		let submittedSids: number[] = [];
		if (Array.isArray(details)) {
			submittedSids = details.filter((d: any) => d.s_id).map((d: any) => d.s_id);
			// Delete rows not present in submitted details (before inserts)
			const existingDetails = await billingModel.getFuelVehicleAmount(id);
			const existingSids = (existingDetails || []).map((d: any) => d.s_id);
			const toDelete = existingSids.filter((sid: any) => !submittedSids.includes(sid));
			for (const sid of toDelete) {
				await billingModel.deleteFuelVehicleAmountBySid(sid);
			}
			// Now update existing and insert new
			for (const detail of details) {
				if (detail.s_id) {
					// Update existing row
					await billingModel.updateFuelVehicleAmount(detail.s_id, {
						stmt_id: id,
						stmt_date: detail.stmt_date,
						card_id: detail.card_id,
						vehicle_id: detail.vehicle_id,
						asset_id: detail.asset_id,
						entry_code: detail.entry_code || null,
						costcenter_id: detail.costcenter_id,
						category: detail.category,
						start_odo: detail.start_odo,
						end_odo: detail.end_odo,
						total_km: detail.total_km,
						total_litre: detail.total_litre,
						efficiency: detail.efficiency,
						amount: detail.amount
					});
				} else {
					// Insert new row
					await billingModel.createFuelVehicleAmount({
						stmt_id: id,
						stmt_date: detail.stmt_date,
						card_id: detail.card_id,
						vehicle_id: detail.vehicle_id,
						asset_id: detail.asset_id,
						entry_code: detail.entry_code || null,
						costcenter_id: detail.costcenter_id,
						category: detail.category,
						start_odo: detail.start_odo,
						end_odo: detail.end_odo,
						total_km: detail.total_km,
						total_litre: detail.total_litre,
						efficiency: detail.efficiency,
						amount: detail.amount
					});
				}
			}
		}
		res.json({ status: 'success', message: 'Fuel billing updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update fuel billing', error });
	}
};

//Purposely to export fuel consumption report data to Excel
export const getFuelBillingVehicleSummary = async (req: Request, res: Response) => {
	const { from, to, cc } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	// Fetch all lookup data (use assetsModel.getAssets() after schema change)
	const [assetsRaw, costcentersRaw, districtsRaw, categoriesRaw, brandsRaw, modelsRaw, employeesRaw] = await Promise.all([
		assetsModel.getAssets(),
		assetsModel.getCostcenters(),
		assetsModel.getLocations(),
		assetsModel.getCategories(),
		assetsModel.getBrands(),
		assetsModel.getModels(),
		assetsModel.getEmployees()
	]);
	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(districtsRaw) ? districtsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	// Build asset map keyed by vehicle_id and id for compatibility
	const assetsArr = assets as any[];
	const assetMap = new Map<any, any>();
	for (const a of assetsArr) {
		if (a && (a.asset_id !== undefined && a.asset_id !== null)) {
			assetMap.set(a.asset_id, a);
			assetMap.set(String(a.asset_id), a);
		}
		if (a && (a.id !== undefined && a.id !== null)) {
			assetMap.set(a.id, a);
			assetMap.set(String(a.id), a);
		}
	}
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locationMap = new Map(locations.map((d: any) => [d.id, d]));
	// Use id as key for categoryMap (since getCategories returns id, not category_id)
	const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	// Use ramco_id as key for employeeMap (since we match by ramco_id from vehicle records)
	const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

	// Get all fuel billings in date range
	const fuelBillings = await billingModel.getFuelBillingByDate(from as string, to as string);
	// Group by asset_id
	const summary: Record<string, any> = {};
	for (const bill of fuelBillings) {
		const detailsRaw = await billingModel.getFuelVehicleAmount(bill.stmt_id);
		for (const d of (Array.isArray(detailsRaw) ? detailsRaw : [])) {
			// If cc filter is provided, skip if not matching
			const ccId = d.cc_id ?? d.costcenter_id;
			if (cc && String(ccId) !== String(cc)) continue;
			const asset_id = d.asset_id;
			// Resolve category, brand, and model objects
			let category = null;
			let brand = null;
			let model = null;
			let categoryId = d.category;
			let brandId = null;
			let modelId = null;
			let ramcoId = null;
			if (assetMap.has(asset_id)) {
				const asset = assetMap.get(asset_id);
				if (!categoryId) categoryId = asset.category_id;
				brandId = asset.brand_id;
				modelId = asset.model_id;
				ramcoId = asset.ramco_id;
			}
			if (categoryId && categoryMap.has(categoryId)) {
				const catObj = categoryMap.get(categoryId);
				category = { id: catObj.id, name: catObj.name };
			}
			if (brandId && brandMap.has(brandId)) {
				const brandObj = brandMap.get(brandId);
				brand = { id: brandObj.id, name: brandObj.name };
			}
			if (modelId && modelMap.has(modelId)) {
				const modelObj = modelMap.get(modelId);
				model = { id: modelObj.id, name: modelObj.name };
			}
			// Resolve owner object by ramco_id
			let owner = null;
			if (ramcoId && employeeMap.has(ramcoId)) {
				const empObj = employeeMap.get(ramcoId);
				owner = { ramco_id: empObj.ramco_id, name: empObj.full_name };
			}

			if (!summary[asset_id]) {
				const vehicleObj = asset_id && assetMap.has(asset_id) ? assetMap.get(asset_id) : null;
				const ccId = d.cc_id ?? d.costcenter_id;
				const ccObj = ccId && ccMap.has(ccId) ? ccMap.get(ccId) : null;
				const locId = d.loc_id ?? d.location_id;
				const locationObj = locId && locationMap.has(locId) ? locationMap.get(locId) : null;
				summary[asset_id] = {
					asset_id: asset_id,
					vehicle: vehicleObj ? (vehicleObj.vehicle_regno || vehicleObj.register_number || null) : null,
					category,
					brand,
					model,
					owner,
					transmission: vehicleObj ? (vehicleObj.transmission || vehicleObj.vtrans_type || null) : null,
					fuel: vehicleObj ? (vehicleObj.fuel_type || vehicleObj.vfuel_type || null) : null,
					purchase_date: vehicleObj?.purchase_date ? dayjs(vehicleObj.purchase_date).format('DD/MM/YYYY') : (vehicleObj?.v_dop ? dayjs(vehicleObj.v_dop).format('DD/MM/YYYY') : null),
					age: vehicleObj ? (vehicleObj.purchase_date ? dayjs().diff(dayjs(vehicleObj.purchase_date), 'year') : (vehicleObj.v_dop ? dayjs().diff(dayjs(vehicleObj.v_dop), 'year') : null)) : null,
					costcenter: ccObj ? { id: ccId, name: ccObj.name } : null,
					location: locationObj ? { id: locId, name: locationObj.name ?? locationObj.code } : null,
					classification: vehicleObj ? (vehicleObj.classification || null) : null,
					record_status: vehicleObj ? (vehicleObj.record_status || null) : null,
					total_litre: 0,
					total_amount: 0,
					_yearMap: {} // temp for grouping by year
				};
			}
			summary[asset_id].total_litre += parseFloat(d.total_litre || '0');
			summary[asset_id].total_amount += parseFloat(d.amount || '0');
			// Determine date for this detail (prefer detail row date)
			const detailDate = d.stmt_date || bill.stmt_date;
			const year = detailDate ? dayjs(detailDate).year() : dayjs(bill.stmt_date).year();
			if (!summary[asset_id]._yearMap[year]) {
				summary[asset_id]._yearMap[year] = { total_annual: 0, monthlyMap: {} };
			}
			const amountNum = parseFloat(d.amount || '0');
			summary[asset_id]._yearMap[year].total_annual += amountNum;
			const monthNum = detailDate ? dayjs(detailDate).month() + 1 : 0;
			const monthName = detailDate ? dayjs(detailDate).format('MMMM') : null;
			if (!summary[asset_id]._yearMap[year].monthlyMap[monthNum]) summary[asset_id]._yearMap[year].monthlyMap[monthNum] = [];
			summary[asset_id]._yearMap[year].monthlyMap[monthNum].push({
				month: monthName,
				monthNum,
				s_id: d.s_id,
				stmt_id: d.stmt_id,
				stmt_date: detailDate ? dayjs(detailDate).format('YYYY-MM-DD') : null,
				total_litre: d.total_litre,
				amount: d.amount
			});
		}
	}
	// Format output
	const result = Object.values(summary).map((asset: any) => {
		const details = Object.entries(asset._yearMap).map(([year, data]: [string, any]) => {
			// Convert monthlyMap to sorted array (descending month)
			const monthNums = Object.keys(data.monthlyMap).map(n => Number(n)).sort((a, b) => b - a);
			const monthly_expenses = monthNums.flatMap((mn) => {
				return (data.monthlyMap[mn] || []).map((m: any) => ({
					month: m.month,
					s_id: m.s_id,
					stmt_id: m.stmt_id,
					stmt_date: m.stmt_date,
					total_litre: m.total_litre,
					amount: m.amount
				}));
			});
			return {
				year: Number(year),
				total_annual: (data.total_annual || data.total_annual === 0) ? Number(data.total_annual).toFixed(2) : '0.00',
				monthly_expenses
			};
		});
		// Remove temp _yearMap from output
		const { _yearMap, ...rest } = asset;
		return { ...rest, details };
	});

	// Sort by vehicle field in ascending order
	result.sort((a: any, b: any) => {
		const aVehicle = a.vehicle || '';
		const bVehicle = b.vehicle || '';
		return aVehicle.toLowerCase().localeCompare(bVehicle.toLowerCase());
	});

	res.json({
		status: 'success',
		message: 'Fuel billing summary by date range retrieved successfully',
		data: result,
	});
};


// Costcenter-based fuel billing summary grouped by year - Export to Excel
export const getFuelBillingCostcenterSummary = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	// Fetch all lookup data
	const [costcentersRaw] = await Promise.all([
		await assetsModel.getCostcenters()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	// Get all fuel billings in date range
	const fuelBillings = await billingModel.getFuelBillingByDate(from as string, to as string);
	// Group by costcenter name
	const summary: Record<string, any> = {};
	for (const bill of fuelBillings) {
		const detailsRaw = await billingModel.getFuelVehicleAmount(bill.stmt_id);
		for (const d of (Array.isArray(detailsRaw) ? detailsRaw : [])) {
			const ccId = d.cc_id ?? d.costcenter_id;
			const ccObj = ccId && ccMap.has(ccId) ? ccMap.get(ccId) : null;
			const ccName = ccObj ? ccObj.name : 'Unknown';
			if (!summary[ccName]) {
				summary[ccName] = { costcenter: ccName, _yearMap: {} };
			}
			// Group by year and month
			const date = dayjs(bill.stmt_date);
			const year = date.year();
			const month = date.month() + 1; // 1-based month
			if (!summary[ccName]._yearMap[year]) {
				summary[ccName]._yearMap[year] = { expenses: 0, _monthMap: {} };
			}
			if (!summary[ccName]._yearMap[year]._monthMap[month]) {
				summary[ccName]._yearMap[year]._monthMap[month] = { expenses: 0, fuel: [] };
			}
			const amount = parseFloat(d.amount || '0');
			summary[ccName]._yearMap[year].expenses += amount;
			summary[ccName]._yearMap[year]._monthMap[month].expenses += amount;
			summary[ccName]._yearMap[year]._monthMap[month].fuel.push({
				s_id: d.s_id,
				total_litre: d.total_litre,
				amount: d.amount
			});
		}
	}
	// Format output and sort by costcenter name
	const result = Object.values(summary)
		.map((cc: any) => {
			const details = Object.entries(cc._yearMap).map(([year, yearData]: [string, any]) => {
				const months = Object.entries(yearData._monthMap).map(([month, monthData]: [string, any]) => ({
					month: Number(month),
					expenses: monthData.expenses.toFixed(2),
					//fuel: monthData.fuel
				}));
				return {
					year: Number(year),
					expenses: yearData.expenses.toFixed(2),
					months
				};
			});
			const { _yearMap, ...rest } = cc;
			return { ...rest, details };
		})
		.sort((a: any, b: any) => String(a.costcenter).localeCompare(String(b.costcenter)));
	res.json({
		status: 'success',
		message: 'Fuel billing costcenter summary by date range retrieved successfully',
		data: result
	});
};

/* ============ FUEL ISSUER ================ */

export const getFuelVendors = async (req: Request, res: Response) => {
	const fuelVendors = await billingModel.getFuelVendor();
	const baseUrl = process.env.BACKEND_URL || '';
	const vendorsWithUrls = (fuelVendors || []).map((v: any) => ({
		...v,
		logo: v.logo ? `${baseUrl.replace(/\/$/, '')}/${v.logo.replace(/^\//, '')}` : v.logo,
		image2: v.image2 ? `${baseUrl.replace(/\/$/, '')}/${String(v.image2).replace(/^\//, '')}` : v.image2
	}));
	res.json({ status: 'success', message: 'Fuel vendors retrieved successfully', data: vendorsWithUrls });
};

export const getFuelVendorById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const fuelVendor = await billingModel.getFuelVendorById(id);
	if (!fuelVendor) {
		return res.status(404).json({ status: 'error', message: 'Fuel vendor not found' });
	}
	const baseUrl = process.env.BACKEND_URL || '';
	const vendorWithUrl = {
		...fuelVendor,
		logo: fuelVendor.logo ? `${baseUrl.replace(/\/$/, '')}/${String(fuelVendor.logo).replace(/^\//, '')}` : fuelVendor.logo,
		image2: fuelVendor.image2 ? `${baseUrl.replace(/\/$/, '')}/${String(fuelVendor.image2).replace(/^\//, '')}` : fuelVendor.image2
	};
	res.json({ status: 'success', message: 'Fuel vendor retrieved successfully', data: vendorWithUrl });
};

export const createFuelVendor = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createFuelVendor(req.body);
		res.status(201).json({ status: 'success', message: 'Fuel vendor created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create fuel vendor', error });
	}
};

export const updateFuelVendor = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateFuelVendor(id, req.body);
		res.json({ status: 'success', message: 'Fuel vendor updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update fuel vendor', error });
	}
};

/* =================== FLEET CARD TABLE ========================== */

export const getFleetCards = async (req: Request, res: Response) => {
	try {
		const vendorQ = req.query.vendor as string | undefined;

		// If vendor param provided, validate and use model helper to fetch
		if (vendorQ !== undefined) {
			const vendorId = Number(vendorQ);
			if (!Number.isFinite(vendorId)) {
				return res.status(400).json({ status: 'error', message: 'vendor must be a valid number' });
			}
			const fleetCards = await billingModel.getFleetCardsByVendor(vendorId);
			// Keep existing enrichment logic but limited to returned cards
			const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
			const fuelVendors = await billingModel.getFuelVendor() as any[];
			const costcenters = await assetsModel.getCostcenters() as any[];
			const locations = await assetsModel.getLocations() as any[];

			const assetMap = new Map();
			for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
			// fuel_vendors now use `id` as primary key
			const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));
			const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

			const data = fleetCards.map((card: any) => {
				let vendor = {};
				if (card.fuel_id && fuelVendorMap.has(card.fuel_id)) {
					const fv = fuelVendorMap.get(card.fuel_id);
					const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
					vendor = { fuel_id: fv.id ?? fv.fuel_id, name: name };
				}

				let asset = null;
				if (card.asset_id && assetMap.has(card.asset_id)) {
					const assetObj = assetMap.get(card.asset_id);
					asset = {
						id: card.asset_id,
						vehicle_id: assetObj.vehicle_id || null,
						entry_code: assetObj.entry_code || null,
						register_number: assetObj.register_number || assetObj.vehicle_regno,
						costcenter: assetObj.costcenter_id && costcenterMap.has(assetObj.costcenter_id)
							? { id: assetObj.costcenter_id, name: costcenterMap.get(assetObj.costcenter_id).name }
							: null,
						locations: (() => {
							const locId = assetObj.location_id ?? assetObj.location?.id ?? assetObj.locationId ?? null;
							if (!locId) return null;
							const found = locations.find((loc: any) => loc.id === locId);
							return found ? { id: locId, code: found.code } : null;
						})(),
						fuel_type: assetObj.fuel_type || assetObj.vfuel_type,
						purpose: assetObj.purpose || null,
					};
				}

				return {
					id: card.id,
					card_no: card.card_no,
					vendor,
					asset,
					vehicle_id: card.vehicle_id,
					reg_date: card.reg_date,
					remarks: card.remarks,
					pin_no: card.pin,
					status: card.status,
					expiry: card.expiry_date
				};
			});

			// Resolve vendor name from fuelVendorMap using several possible fields
			const vendorObj = fuelVendorMap.get(vendorId);
			const vendorName = vendorObj ? (vendorObj.f_issuer || vendorObj.fuel_issuer || vendorObj.name || vendorObj.fuel_name || null) : null;
			// include length in message & vendor name (resolved vendor) in vendor:
			return res.json({ status: 'success', message: `Fleet cards retrieved successfully${vendorName ? ` (vendor: ${vendorName})` : ''} - Total: ${data.length}`, data });
		}

		// No vendor filter - return all fleet cards with enrichment
		const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
		const fleetCards = await billingModel.getFleetCards();
		const fuelVendors = await billingModel.getFuelVendor() as any[];
		const costcenters = await assetsModel.getCostcenters() as any[];
		const locations = await assetsModel.getLocations() as any[];

		// assetModel.getAssets() returns assets keyed by id; create map for id and asset_id for compatibility
		const assetMap = new Map();
		for (const a of assets) {
			if (a.id) assetMap.set(a.id, a);
			if (a.asset_id) assetMap.set(a.asset_id, a);
		}
		const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));
		const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

		const data = fleetCards.map((card: any) => {
			let vendor = {};
			if (card.fuel_id && fuelVendorMap.has(card.fuel_id)) {
				const fv = fuelVendorMap.get(card.fuel_id);
				const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
				vendor = { fuel_id: fv.id ?? fv.fuel_id, name: name };
			}

			let asset = null;
			if (card.asset_id && assetMap.has(card.asset_id)) {
				const assetObj = assetMap.get(card.asset_id);
				asset = {
					id: card.asset_id,
					register_number: assetObj.register_number || assetObj.vehicle_regno,
					costcenter: assetObj.costcenter_id && costcenterMap.has(assetObj.costcenter_id)
						? { id: assetObj.costcenter_id, name: costcenterMap.get(assetObj.costcenter_id).name }
						: null,
					fuel_type: assetObj.fuel_type || assetObj.vfuel_type,
					locations: (() => {
						const locId = assetObj.location_id ?? assetObj.location?.id ?? assetObj.locationId ?? null;
						if (!locId) return null;
						const found = locations.find((loc: any) => loc.id === locId);
						return found ? { id: locId, code: found.code } : null;
					})(),
					purpose: assetObj.purpose || null,
				};
			}

			return {
				id: card.id,
				card_no: card.card_no,
				vendor,
				asset,
				vehicle_id: card.vehicle_id,
				reg_date: card.reg_date,
				remarks: card.remarks,
				pin_no: card.pin,
				status: card.status,
				expiry: card.expiry_date
			};
		});

		res.json({ status: 'success', message: 'Fleet cards retrieved successfully', data });
	} catch (err: any) {
		logger.error(err);
		res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve fleet cards' });
	}
};
export const getFleetCardById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isFinite(id)) {
		return res.status(400).json({ status: 'error', message: 'Invalid fleet card id' });
	}
	const fleetCard = await billingModel.getFleetCardById(id);
	if (!fleetCard) {
		return res.status(404).json({ status: 'error', message: 'Fleet card not found' });
	}

	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
	const fuelVendors = await billingModel.getFuelVendor() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];

	const assetMap = new Map();
	for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
	const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	let vendor = {};
	if (fleetCard.fuel_id && fuelVendorMap.has(fleetCard.fuel_id)) {
		const fv = fuelVendorMap.get(fleetCard.fuel_id);
		const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
		vendor = { fuel_id: fv.id ?? fv.fuel_id, fuel_issuer: name };
	}

	const asset = fleetCard.asset_id && assetMap.has(fleetCard.asset_id)
		? {
			id: fleetCard.asset_id,
			register_number: assetMap.get(fleetCard.asset_id).register_number || assetMap.get(fleetCard.asset_id).vehicle_regno,
			costcenter: assetMap.get(fleetCard.asset_id).costcenter_id && costcenterMap.has(assetMap.get(fleetCard.asset_id).costcenter_id)
				? { id: assetMap.get(fleetCard.asset_id).costcenter_id, name: costcenterMap.get(assetMap.get(fleetCard.asset_id).costcenter_id).name }
				: null,
			fuel_type: assetMap.get(fleetCard.asset_id).fuel_type || assetMap.get(fleetCard.asset_id).vfuel_type,
			purpose: assetMap.get(fleetCard.asset_id).purpose || null
		}
		: null;

	const data = {
		id: fleetCard.id,
		card_no: fleetCard.card_no,
		vendor,
		asset,
		reg_date: fleetCard.reg_date,
		remarks: fleetCard.remarks,
		pin_no: fleetCard.pin,
		status: fleetCard.status,
		expiry: fleetCard.expiry_date
	};

	res.json({ status: 'success', message: 'Fleet card retrieved successfully', data });
};

export const getFleetCardsByAssetId = async (req: Request, res: Response) => {
	const assetId = Number(req.params.asset_id);
	if (!assetId || isNaN(assetId)) {
		return res.status(400).json({ status: 'error', message: 'Invalid asset_id' });
	}
	const fleetCards = await billingModel.getFleetCardsByAssetId(assetId);
	const asset = await assetsModel.getAssetById(assetId) as any || null;
	const fuelVendors = await billingModel.getFuelVendor() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];

	const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	// Build asset summary
	const assetSummary = asset ? {
		id: asset.id,
		register_number: asset.register_number || asset.vehicle_regno || null,
		costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
			? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id).name }
			: null,
		fuel_type: asset.fuel_type || asset.vfuel_type || null,
		purpose: asset.purpose || null,
	} : null;

	// Map each fleet card into a card summary
	const cards = fleetCards.map((card: any) => {
		let vendor = {};
		if (card.fuel_id && fuelVendorMap.has(card.fuel_id)) {
			const fv = fuelVendorMap.get(card.fuel_id);
			const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
			vendor = { fuel_id: fv.id ?? fv.fuel_id, fuel_issuer: name };
		}

		return {
			id: card.id,
			card_no: card.card_no,
			vendor,
			reg_date: card.reg_date,
			remarks: card.remarks,
			pin_no: card.pin,
			status: card.status,
			expiry: card.expiry_date
		};
	});

	const data = [{ asset: assetSummary, cards }];
	res.json({ status: 'success', message: 'Fleet cards for asset retrieved successfully', data });
};
export const createFleetCard = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createFleetCard(req.body);
		res.status(201).json({ status: 'success', message: 'Fleet card created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create fleet card', error });
	}
};
export const updateFleetCard = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateFleetCard(id, req.body);
		res.json({ status: 'success', message: 'Fleet card updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update fleet card', error });
	}
}

// Normalize an absolute or arbitrary saved file path into a relative DB-friendly path
// under 'uploads/...'. Removes configured UPLOAD_BASE_PATH, strips mount points
// like 'mnt/winshare', and ensures the returned path starts with 'uploads/'.
// Helper to produce a public URL from a stored path. Mirrors logic used when returning
// logos: strips mount segments and ensures path is under 'uploads/'.
function publicUrl(rawPath?: string | null): string | null {
	if (!rawPath) return null;
	const baseUrl = process.env.BACKEND_URL || '';
	let normalized = String(rawPath).replace(/\\/g, '/').replace(/^\/+/, '');
	normalized = normalized.replace(/(^|\/)mnt\/winshare\/?/ig, '');
	if (!normalized.startsWith('uploads/')) normalized = `uploads/${normalized.replace(/^\/+/, '')}`;
	return `${baseUrl.replace(/\/$/, '')}/${normalized.replace(/^\/+/, '')}`;
}
function normalizeStoredPath(filePath?: string | null): string | null {
	if (!filePath) return null;
	let p = String(filePath);
	// normalize separators
	p = p.replace(/\\/g, '/');
	// remove configured upload base if present
	const base = process.env.UPLOAD_BASE_PATH;
	if (base) {
		const nb = String(base).replace(/\\/g, '/').replace(/\/+$/, '');
		if (p.startsWith(nb)) {
			p = p.slice(nb.length);
		}
	}
	// strip any mnt/winshare segments anywhere
	p = p.replace(/(^|\/)mnt\/winshare\/?/ig, '');
	// remove leading slashes
	p = p.replace(/^\/+/, '');
	// if uploads/ exists inside, slice to it
	const idx = p.indexOf('uploads/');
	if (idx >= 0) p = p.slice(idx);
	// ensure it starts with uploads/
	if (!p.startsWith('uploads/')) p = `uploads/${p}`;
	return p;
}
// Instantly update fleet card from billing
export const updateFleetCardFromBilling = async (req: Request, res: Response) => {
	try {
		await billingModel.updateFleetCardFromBilling(req.body);
		res.json({ status: 'success', message: 'Fleet card updated from billing successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to update fleet card from billing', error });
	}
};

export const getFleetCardByIssuer = async (req: Request, res: Response) => {
	const fuel_id = Number(req.params.id);
	if (!fuel_id) {
		return res.status(400).json({ status: 'error', message: 'fuel_id is required' });
	}

	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const assetMap = new Map(assets.map((asset: any) => [asset.vehicle_id, asset]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const fleetCards = await billingModel.getFleetCards();
	const fuelVendors = await billingModel.getFuelVendor() as any[];
	const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));

	const data = fleetCards
		.filter((card: any) => card.fuel_id === fuel_id)
		.map((card: any) => {
			let asset = null;
			if (card.asset_id && assetMap.has(card.asset_id)) {
				const a = assetMap.get(card.asset_id);
				asset = {
					id: a.asset_id,
					old_id: a.vehicle_id,
					register_number: a.register_number,
					fuel_type: a.fuel_type,
					costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
						? costcenterMap.get(a.costcenter_id)
						: null,
					purpose: a.purpose || null
				};
			}

			let vendor = {};
			if (card.fuel_id && fuelVendorMap.has(card.fuel_id)) {
				const fv = fuelVendorMap.get(card.fuel_id);
				const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
				vendor = { fuel_id: fv.id ?? fv.fuel_id, fuel_issuer: name };
			}

			return {
				id: card.id,
				card_no: card.card_no,
				vendor,
				//reg_date: card.reg_date,
				//category: card.category,
				//remarks: card.remarks,
				//pin_no: card.pin,
				status: card.status,
				//expiry: card.expiry_date,
				asset
			};
		});

	res.json({ status: 'success', message: 'Fleet cards by fuel vendor retrieved successfully', data });
};

// Return all assets populated with their assigned fleet cards (uses fleet_asset join table)
export const getFleetCardsByAssets = async (req: Request, res: Response) => {
	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() as any[] : [];
	const links = await billingModel.getFleetAssetLinks();
	const cards = await billingModel.getFleetCards();

	const assetMap = new Map();
	for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
	const cardMap = new Map(cards.map((c: any) => [c.id, c]));

	// group cards by asset id
	const grouped = new Map<number, any[]>();
	for (const l of links) {
		const aid = Number(l.asset_id);
		const cid = Number(l.card_id);
		if (!Number.isFinite(aid) || !Number.isFinite(cid)) continue;
		if (!grouped.has(aid)) grouped.set(aid, []);
		const c = cardMap.get(cid);
		if (c) {
			const arr = grouped.get(aid) as any[];
			arr.push(c);
		}
	}

	const costcenters = await assetsModel.getCostcenters() as any[];
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	const data = Array.from(grouped.keys()).map((aid: number) => {
		const a = assetMap.get(aid);
		const assetSummary = a ? {
			id: a.id,
			register_number: a.register_number || a.vehicle_regno || null,
			costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
			fuel_type: a.fuel_type || a.vfuel_type || null,
			purpose: a.purpose || null,
		} : null;

		const cardsForAsset = (grouped.get(aid) || []).map((card: any) => ({
			id: card.id,
			card_no: card.card_no,
			vehicle_id: card.vehicle_id,
			reg_date: card.reg_date,
			remarks: card.remarks,
			pin_no: card.pin,
			status: card.status,
			expiry: card.expiry_date
		}));

		return { asset: assetSummary, cards: cardsForAsset };
	});

	res.json({ status: 'success', message: 'Assets with fleet cards retrieved successfully', data });
};
/* =================== SERVICE OPTION TABLE ========================== */

export const getServiceOptions = async (req: Request, res: Response) => {
	const serviceOptions = await billingModel.getServiceOptions();
	res.json({ status: 'success', message: 'Service options retrieved successfully', data: serviceOptions });
};
export const getServiceOptionById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const serviceOption = await billingModel.getServiceOptionById(id);
	if (!serviceOption) {
		return res.status(404).json({ status: 'error', message: 'Service option not found' });
	}
	res.json({ status: 'success', message: 'Service option retrieved successfully', data: serviceOption });
};
export const createServiceOption = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createServiceOption(req.body);
		res.status(201).json({ status: 'success', message: 'Service option created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create service option', error });
	}
}
export const updateServiceOption = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateServiceOption(id, req.body);
		res.json({ status: 'success', message: 'Service option updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update service option', error });
	}
}

/* =================== SERVICE PARTS (autoparts) CONTROLLERS =================== */
export const getServiceParts = async (req: Request, res: Response) => {
	// parse query params for pagination and filtering
	const q = typeof req.query.q === 'string' ? req.query.q : undefined;
	const page = Number(req.query.page) || 1;
	const per_page = Number(req.query.per_page) || 50;
	const category = req.query.category !== undefined ? Number(req.query.category) : undefined;

	const [total, parts] = await Promise.all([
		billingModel.countServiceParts(q, category),
		billingModel.getServicePartsPaged(q, page, per_page, category)
	]);

	const serviceOptions = await billingModel.getServiceOptions();
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s as any).svcTypeId, s]));
	const enriched = (parts || []).map((p: any) => {
		const svc = svcMap.has(p.vtype_id) ? svcMap.get(p.vtype_id) : null;
		const part_category = svc ? { svcTypeId: svc.svcTypeId, svcType: svc.svcType } : null;
		const { vtype_id, ...rest } = p;
		return { ...rest, part_category };
	});

	res.json({
		status: 'success',
		message: 'Service parts retrieved successfully',
		data: enriched,
		meta: {
			total,
			page,
			per_page,
			pages: Math.ceil(total / per_page)
		}
	});
};

export const getServicePartById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const part = await billingModel.getServicePartById(id);
	if (!part) return res.status(404).json({ status: 'error', message: 'Part not found' });
	const serviceOptions = await billingModel.getServiceOptions();
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s as any).svcTypeId, s]));
	const svc = svcMap.has(part.vtype_id) ? svcMap.get(part.vtype_id) : null;
	const part_category = svc ? { svcTypeId: svc.svcTypeId, svcType: svc.svcType } : null;
	const { vtype_id, ...rest } = part as any;
	const enriched = { ...rest, part_category };
	res.json({ status: 'success', message: 'Service part retrieved successfully', data: enriched });
};

export const createServicePart = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createServicePart(req.body);
		res.status(201).json({ status: 'success', message: 'Service part created', id: insertId });
	} catch (error) {
		logger.error('createServicePart error', error);
		res.status(500).json({ status: 'error', message: 'Failed to create service part', error });
	}
};

export const updateServicePart = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateServicePart(id, req.body);
		res.json({ status: 'success', message: 'Service part updated' });
	} catch (error) {
		logger.error('updateServicePart error', error);
		res.status(500).json({ status: 'error', message: 'Failed to update service part', error });
	}
};

export const deleteServicePart = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteServicePart(id);
	res.json({ status: 'success', message: 'Service part deleted' });
};

// Quick search for typeahead or global search
export const searchServiceParts = async (req: Request, res: Response) => {
	const q = String(req.query.q || '').trim();
	if (!q) return res.json({ status: 'success', message: 'No query provided', data: [] });
	const limit = Number(req.query.limit) || 10;
	const rows = await billingModel.searchServiceParts(q, limit);
	// attach minimal part_category
	const serviceOptions = await billingModel.getServiceOptions();
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s as any).svcTypeId, s]));
	const enriched = (rows || []).map((p: any) => {
		const svc = svcMap.has(p.vtype_id) ? svcMap.get(p.vtype_id) : null;
		const part_category = svc ? { svcTypeId: svc.svcTypeId, svcType: svc.svcType } : null;
		const { vtype_id, ...rest } = p;
		return { ...rest, part_category };
	});
	res.json({ status: 'success', message: 'Search results', data: enriched });
};


/* ============== TEMP VEHICLE RECORDS =============== */
export const getTempVehicleRecords = async (req: Request, res: Response) => {
	// Use assetsModel.getAssets() as the canonical source for vehicle records
	const recordsRaw = await assetsModel.getAssets();
	const records = Array.isArray(recordsRaw) ? recordsRaw : [];
	// Fetch costcenters, employees, brands, models, categories, departments, and fleet cards lookup
	const [costcentersRaw, employeesRaw, brandsRaw, modelsRaw, categoriesRaw, departmentsRaw, fleetCardsRaw] = await Promise.all([
		assetsModel.getCostcenters(),
		assetsModel.getEmployees(),
		assetsModel.getBrands(),
		assetsModel.getModels(),
		assetsModel.getCategories(),
		assetsModel.getDepartments(),
		billingModel.getFleetCards()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const fleetCards = Array.isArray(fleetCardsRaw) ? fleetCardsRaw : [];

	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
	const deptMap = new Map(departments.map((d: any) => [d.id, d]));
	const fleetCardMap = new Map(fleetCards.map((fc: any) => [fc.id, fc]));

	// Enrich each record with costcenter, owner, brand, model, category, department, and fleetcard object
	const enriched = records.map((rec: any) => {
		const costcenterObj = rec.costcenter_id && ccMap.has(rec.costcenter_id)
			? ccMap.get(rec.costcenter_id)
			: null;
		const costcenter = costcenterObj ? { id: costcenterObj.id, name: costcenterObj.name } : null;

		const ownerObj = rec.ramco_id && empMap.has(rec.ramco_id)
			? empMap.get(rec.ramco_id)
			: null;
		const owner = ownerObj ? { ramco_id: ownerObj.ramco_id, full_name: ownerObj.full_name } : null;

		const brandObj = rec.brand_id && brandMap.has(rec.brand_id)
			? brandMap.get(rec.brand_id)
			: null;
		const brand = brandObj ? { id: brandObj.id, name: brandObj.name } : null;

		const modelObj = rec.model_id && modelMap.has(rec.model_id)
			? modelMap.get(rec.model_id)
			: null;
		const model = modelObj ? { id: modelObj.id, name: modelObj.name } : null;

		const categoryObj = rec.category_id && categoryMap.has(rec.category_id)
			? categoryMap.get(rec.category_id)
			: null;
		const category = categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null;

		const deptObj = rec.dept_id && deptMap.has(rec.dept_id)
			? deptMap.get(rec.dept_id)
			: null;
		const department = deptObj ? { id: deptObj.id, name: deptObj.code } : null;

		const fleetCardObj = rec.card_id && fleetCardMap.has(rec.card_id)
			? fleetCardMap.get(rec.card_id)
			: null;
		const fleetcard = fleetCardObj ? { id: fleetCardObj.id, card_no: fleetCardObj.card_no } : null;

		// Map legacy and new asset fields to canonical fields used by the frontend
		const rest = { ...rec } as any;
		const mapped = {
			...rest,
			asset_id: rest.asset_id || rest.vehicle_id || rest.id || null,
			register_number: rest.register_number || rest.vehicle_regno || null,
			transmission: rest.transmission || rest.vtrans_type || null,
			fuel_type: rest.fuel_type || rest.vfuel_type || null,
			purchase_date: rest.purchase_date || rest.v_dop || null,
			costcenter,
			owner,
			brand,
			model,
			category,
			department,
			fleetcard
		};
		// Remove legacy id fields to avoid duplication in response
		delete mapped.vehicle_id;
		delete mapped.vehicle_regno;
		delete mapped.vtrans_type;
		delete mapped.vfuel_type;
		delete mapped.v_dop;
		return mapped;
	});

	res.json({ status: 'success', message: 'Temp vehicle records retrieved successfully', data: enriched });
};

export const getTempVehicleRecordById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const record = await billingModel.getTempVehicleRecordById(id);
	if (!record) {
		return res.status(404).json({ status: 'error', message: 'Temp vehicle record not found' });
	}
	// Fetch costcenters, employees, brands, models, categories, departments, and fleet cards lookup
	const [costcentersRaw, employeesRaw, brandsRaw, modelsRaw, categoriesRaw, departmentsRaw, fleetCardsRaw] = await Promise.all([
		assetsModel.getCostcenters(),
		assetsModel.getEmployees(),
		assetsModel.getBrands(),
		assetsModel.getModels(),
		assetsModel.getCategories(),
		assetsModel.getDepartments(),
		billingModel.getFleetCards()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const fleetCards = Array.isArray(fleetCardsRaw) ? fleetCardsRaw : [];

	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
	const deptMap = new Map(departments.map((d: any) => [d.id, d]));
	const fleetCardMap = new Map(fleetCards.map((fc: any) => [fc.id, fc]));

	const costcenterObj = record.cc_id && ccMap.has(record.cc_id)
		? ccMap.get(record.cc_id)
		: null;
	const costcenter = costcenterObj ? { id: costcenterObj.id, name: costcenterObj.name } : null;

	const ownerObj = record.ramco_id && empMap.has(record.ramco_id)
		? empMap.get(record.ramco_id)
		: null;
	const owner = ownerObj ? { ramco_id: ownerObj.ramco_id, full_name: ownerObj.full_name } : null;

	const brandObj = record.brand_id && brandMap.has(record.brand_id)
		? brandMap.get(record.brand_id)
		: null;
	const brand = brandObj ? { id: brandObj.id, name: brandObj.name } : null;

	const modelObj = record.model_id && modelMap.has(record.model_id)
		? modelMap.get(record.model_id)
		: null;
	const model = modelObj ? { id: modelObj.id, name: modelObj.name } : null;

	const categoryObj = record.category_id && categoryMap.has(record.category_id)
		? categoryMap.get(record.category_id)
		: null;
	const category = categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null;

	const deptObj = record.dept_id && deptMap.has(record.dept_id)
		? deptMap.get(record.dept_id)
		: null;
	const department = deptObj ? { id: deptObj.id, name: deptObj.name } : null;

	const fleetCardObj = record.card_id && fleetCardMap.has(record.card_id)
		? fleetCardMap.get(record.card_id)
		: null;
	const fleetcard = fleetCardObj ? { id: fleetCardObj.id, card_no: fleetCardObj.card_no } : null;

	const { cc_id, ramco_id, brand_id, model_id, category_id, dept_id, card_id, ...rest } = record;
	res.json({ status: 'success', message: 'Temp vehicle record retrieved successfully', data: { ...rest, costcenter, owner, brand, model, category, department, fleetcard } });
};

export const createTempVehicleRecord = async (req: Request, res: Response) => {
	const payload = req.body;

	const insertId = await billingModel.createTempVehicleRecord(payload);
	res.status(201).json({ status: 'success', message: 'Temp vehicle record created successfully', id: insertId });
};

export const updateTempVehicleRecord = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const payload = req.body;

	await billingModel.updateTempVehicleRecord(id, payload);
	res.json({ status: 'success', message: 'Temp vehicle record updated successfully' });
};

export const deleteTempVehicleRecord = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteTempVehicleRecord(id);
	res.json({ status: 'success', message: 'Temp vehicle record deleted successfully' });
};


// =================== UTILITIES TABLE CONTROLLER ===================
export const getUtilityBills = async (req: Request, res: Response) => {
	const { costcenter, from, to, service } = req.query;
	let bills = await billingModel.getUtilityBills();
	const accounts = await billingModel.getBillingAccounts();
	const accountMap = new Map((accounts || []).map((a: any) => [a.bill_id, a]));
	const costcentersRaw = await assetsModel.getCostcenters();
	const locationsRaw = await assetsModel.getLocations();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));


	// Load beneficiaries and build lookup maps for enrichment
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	// Map by name and by id for flexible matching
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

	// Filter by costcenter if provided
	if (costcenter) {
		bills = bills.filter((bill: any) => String(bill.cc_id) === String(costcenter));
	}

	// Filter by date range if from/to provided
	if (from || to) {
		const fromDate = from ? new Date(from as string) : null;
		const toDate = to ? new Date(to as string) : null;
		bills = bills.filter((bill: any) => {
			const billDate = bill.ubill_date ? new Date(bill.ubill_date) : null;
			if (!billDate) return false;
			if (fromDate && billDate < fromDate) return false;
			if (toDate && billDate > toDate) return false;
			return true;
		});
	}

	const filtered = bills.map((bill: any) => {
		// Build account object
		let account = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			// attempt to enrich beneficiary using beneficiaries list
			let benObj: any = null;
			const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
			if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
			if (!benObj) {
				const accBenId = acc.id ?? acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
				if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
			}
			account = {
				bill_id: acc.bill_id,
				account: acc.account,
				beneficiary: benObj ? {
					id: benObj.id ?? benObj.bfcy_id,
					name: benObj.bfcy_name ?? benObj.name,
					logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
					entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
					entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null
				} : acc.provider,
				service: acc.category,
				desc: acc.bill_desc
			};
		}
		// Build costcenter object. Prefer account-level costcenter if present.
		let costcenter = null;
		const acctCcId = account && (account as any).costcenter ? (account as any).costcenter.id : null;
		const ccLookupId = acctCcId ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId) as any;
			costcenter = { id: cc.id, name: cc.name };
		}
		// Only include required fields
		// Build location object. Prefer account-level location if present.
		let location = null;
		const acctLocId = account && (account as any).location ? (account as any).location.id : null;
		const locLookupId = acctLocId ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId) as any;
			location = { id: d.id, name: d.name };
		}

		// Ensure account object contains costcenter & location for callers that expect them there
		if (account) {
			(account as any).costcenter = costcenter;
			(account as any).location = location;
		}

		return {
			util_id: bill.util_id,
			account,
			//costcenter,
			//location,
			ubill_date: bill.ubill_date,
			ubill_no: bill.ubill_no,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_submit: bill.ubill_submit ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_color: bill.ubill_color,
			ubill_bw: bill.ubill_bw,
			ubill_stotal: bill.ubill_stotal,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_tax: bill.ubill_tax,
			ubill_round: bill.ubill_round,
			ubill_deduct: bill.ubill_deduct,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_count: bill.ubill_count,
			ubill_disc: bill.ubill_disc,
			ubill_usage: bill.ubill_usage,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat
		};
	});

	// Filter by service if provided
	let final = filtered;
	if (service) {
		final = filtered.filter((item: any) => item.account && item.account.service && String(item.account.service).toLowerCase().includes(String(service).toLowerCase()));
	}

	res.json({ status: 'success', message: 'Utility bills retrieved successfully', data: final });
};

// Get utility bills only for printing category (cc_id, loc_id, ubill_rent, ubill_color, ubill_bw, ubill_stotal, ubill_gtotal, ubill_no, ubill_date)
export const getPrintingBills = async (req: Request, res: Response) => {
	try {
		const costcenter = req.query.costcenter || req.query.cc || null;
		const from = req.query.from || null;
		const to = req.query.to || null;
		// load all bills and accounts
		let bills = await billingModel.getUtilityBills();
		const accounts = await billingModel.getBillingAccounts();

		// determine bill_ids that belong to 'printing' category (case-insensitive)
		const printingBillIds = new Set(
			(accounts || []).filter((a: any) => String(a.category || '').toLowerCase() === 'printing').map((a: any) => a.bill_id)
		);

		// filter bills by printing category
		bills = (bills || []).filter((bill: any) => printingBillIds.has(bill.bill_id));

		// apply costcenter filter
		if (costcenter) {
			bills = bills.filter((bill: any) => String(bill.cc_id) === String(costcenter));
		}

		// apply date range filter
		if (from || to) {
			const fromDate = from ? new Date(from as string) : null;
			const toDate = to ? new Date(to as string) : null;
			bills = bills.filter((bill: any) => {
				const billDate = bill.ubill_date ? new Date(bill.ubill_date) : null;
				if (!billDate) return false;
				if (fromDate && billDate < fromDate) return false;
				if (toDate && billDate > toDate) return false;
				return true;
			});
		}

		// Enrichment lookups
		const costcentersRaw = await assetsModel.getCostcenters();
		const locationsRaw = await assetsModel.getLocations();
		const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
		const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
		const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
		const locMap = new Map(locations.map((l: any) => [l.id, l]));

		// Build account map for enrichment (include raw account for provider/service if needed)
		const accountMap = new Map((accounts || []).map((a: any) => [a.bill_id, a]));

		// beneficiaries for possible enrichment (same approach as getUtilityBills)
		const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
		const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
		const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
		const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

		const result = (bills || []).map((bill: any) => {
			let account = null;
			if (bill.bill_id && accountMap.has(bill.bill_id)) {
				const acc = accountMap.get(bill.bill_id);
				let benObj: any = null;
				const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
				if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
				if (!benObj) {
					const accBenId = acc.id ?? acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
					if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
				}
				account = {
					bill_id: acc.bill_id,
					account: acc.account,
					//beneficiary: benObj ? {
					//	id: benObj.id ?? benObj.bfcy_id,
					//	name: benObj.bfcy_name ?? benObj.name,
					//	logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null)
					//} : acc.provider,
					service: acc.category,
				};
			}

			// costcenter & location lookup
			let costcenter = null;
			const ccLookupId = bill.cc_id;
			if (ccLookupId && ccMap.has(ccLookupId)) {
				const cc = ccMap.get(ccLookupId) as any;
				costcenter = { id: cc.id, name: cc.name };
			}
			let location = null;
			const locLookupId = bill.loc_id;
			if (locLookupId && locMap.has(locLookupId)) {
				const d = locMap.get(locLookupId) as any;
				location = { id: d.id, name: d.name };
			}

			if (account) {
				(account as any).costcenter = costcenter;
				(account as any).location = location;
			}

			return {
				util_id: bill.util_id,
				//cc_id: bill.cc_id,
				//loc_id: bill.loc_id,
				account,
				//costcenter,
				//location,
				ubill_date: bill.ubill_date,
				ubill_no: bill.ubill_no,
				ubill_rent: bill.ubill_rent,
				ubill_color: bill.ubill_color,
				ubill_bw: bill.ubill_bw,
				//ubill_stotal: bill.ubill_stotal,
				ubill_gtotal: bill.ubill_gtotal,
				//ubill_ref: bill.ubill_ref ?? null,
				//ubill_url: publicUrl(bill.ubill_ref ?? null)
			};
		});

		// Return the printing bills list directly (no year/month aggregation)
		res.json({ status: 'success', message: 'Printing utility bills retrieved successfully', data: result });
	} catch (err) {
		res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch printing bills', data: null });
	}
};

// GET /api/bills/util/printing/summary
// Returns details grouped by year -> monthly_expenses (one entry per bill) and annual totals
export const getPrintingSummary = async (req: Request, res: Response) => {
	try {
		const costcenter = req.query.costcenter || req.query.cc || null;
		const from = req.query.from || null;
		const to = req.query.to || null;

		let bills = await billingModel.getUtilityBills();
		const accounts = await billingModel.getBillingAccounts();
		const printingBillIds = new Set(
			(accounts || []).filter((a: any) => String(a.category || '').toLowerCase() === 'printing').map((a: any) => a.bill_id)
		);
		bills = (bills || []).filter((bill: any) => printingBillIds.has(bill.bill_id));

		if (costcenter) bills = bills.filter((bill: any) => String(bill.cc_id) === String(costcenter));

		if (from || to) {
			const fromDate = from ? new Date(from as string) : null;
			const toDate = to ? new Date(to as string) : null;
			bills = bills.filter((bill: any) => {
				const billDate = bill.ubill_date ? new Date(bill.ubill_date) : null;
				if (!billDate) return false;
				if (fromDate && billDate < fromDate) return false;
				if (toDate && billDate > toDate) return false;
				return true;
			});
		}

		// Build details grouping by year -> monthly entries (one per bill)
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
		];
		// Group bills by year -> account -> monthly expenses
		const yearMap = new Map<number, Map<number, any>>();
		const accountMap = new Map((accounts || []).map((a: any) => [a.bill_id, a]));

		// We'll aggregate monthly sums per account per year. Use numeric accumulators and format later.
		for (const bill of (bills || [])) {
			const d = bill.ubill_date ? new Date(bill.ubill_date) : null;
			if (!d || isNaN(d.getTime())) continue;
			const year = d.getFullYear();
			if (!yearMap.has(year)) yearMap.set(year, new Map<number, any>());
			const accountsMap = yearMap.get(year) as Map<number, any>;
			const billId = (bill as any).bill_id;
			if (!billId) continue;
			if (!accountsMap.has(billId)) {
				const accRaw = accountMap.get(billId) || null;
				accountsMap.set(billId, {
					bill_id: billId,
					account: accRaw ? accRaw.account : null,
					monthlyMap: new Map<number, { month: string, rent: number, color: number, bw: number }>()
				});
			}
			const accEntry = accountsMap.get(billId);
			const monthIdx = d.getMonth();
			const monthName = monthNames[monthIdx];
			const rentNum = Number((bill as any).ubill_rent) || 0;
			const colorNum = Number((bill as any).ubill_color) || 0;
			const bwNum = Number((bill as any).ubill_bw) || 0;
			if (!accEntry.monthlyMap.has(monthIdx)) {
				accEntry.monthlyMap.set(monthIdx, { month: monthName, rent: 0, color: 0, bw: 0 });
			}
			const m = accEntry.monthlyMap.get(monthIdx);
			m.rent += rentNum;
			m.color += colorNum;
			m.bw += bwNum;
		}

		// Build final details array per year
		const detailsArr = Array.from(yearMap.entries())
			.sort((a, b) => b[0] - a[0])
			.map(([year, accountsMap]) => {
				// Determine month indices present in this year across all accounts so we can include zeros if needed
				const monthsSet = new Set<number>();
				for (const acc of accountsMap.values()) {
					for (const mi of acc.monthlyMap.keys()) monthsSet.add(mi);
				}
				const monthsList = Array.from(monthsSet).sort((x, y) => x - y);
				const accountsList = Array.from(accountsMap.values()).map((acc: any) => {
					const monthly_expenses = monthsList.map((mi: number) => {
						const m = acc.monthlyMap.get(mi) || { month: monthNames[mi], rent: 0, color: 0, bw: 0 };
						return {
							month: m.month,
							ubill_rent: (m.rent === 0 ? '0' : m.rent.toFixed(2)),
							ubill_color: (m.color === 0 ? '0' : m.color.toFixed(2)),
							ubill_bw: (m.bw === 0 ? '0' : m.bw.toFixed(2))
						};
					});
					return {
						bill_id: acc.bill_id,
						account: acc.account,
						monthly_expenses
					};
				});
				const total_annual_num = accountsList.reduce((s: number, a: any) => {
					return s + a.monthly_expenses.reduce((ss: number, m: any) => ss + (Number(m.ubill_rent) || 0) + (Number(m.ubill_color) || 0) + (Number(m.ubill_bw) || 0), 0);
				}, 0);
				return {
					year,
					total_annual: total_annual_num.toFixed(2),
					details: accountsList
				};
			});

		res.json({ status: 'success', message: 'ok', data: detailsArr });
	} catch (err) {
		res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch printing summary', data: null });
	}
};

export const getUtilityBillById = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	const bill = await billingModel.getUtilityBillById(bill_id);
	if (!bill) {
		return res.status(404).json({ status: 'error', message: 'Utility bill not found' });
	}
	// Enrich with account, costcenter, location and beneficiary like getUtilityBills
	const [accounts, costcentersRaw, locationsRaw] = await Promise.all([
		billingModel.getBillingAccounts(),
		assetsModel.getCostcenters(),
		assetsModel.getLocations()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));

	let account = null;
	// fetch beneficiaries for enrichment
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));
	if (bill.bill_id && accountMap.has(bill.bill_id)) {
		const acc = accountMap.get(bill.bill_id);
		// attempt to resolve beneficiary by provider name or bfcy_id
		let benObj: any = null;
		const providerName = acc.provider ? String(acc.provider).toLowerCase() : (acc.provider ? String(acc.provider).toLowerCase() : null);
		if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
		if (!benObj) {
			const accBenId = acc.id ?? acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
			if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
		}
		account = {
			bill_id: acc.bill_id,
			account: acc.account,
			beneficiary: benObj ? {
				id: benObj.id ?? benObj.bfcy_id,
				name: benObj.bfcy_name ?? benObj.name,
				logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
				entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
				entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null
			} : acc.provider,
			service: acc.service,
			desc: acc.bill_desc
		};
	}
	let costcenter = null;
	const acctCcId = account && (account as any).costcenter ? (account as any).costcenter.id : null;
	const ccLookupId = acctCcId ?? bill.cc_id;
	if (ccLookupId && ccMap.has(ccLookupId)) {
		const cc = ccMap.get(ccLookupId) as any;
		costcenter = { id: cc.id, name: cc.name };
	}

	// Build location (prefer account-level)
	let location = null;
	const acctLocId = account && (account as any).location ? (account as any).location.id : null;
	const locLookupId = acctLocId ?? bill.loc_id;
	if (locLookupId && locMap.has(locLookupId)) {
		const d = locMap.get(locLookupId) as any;
		location = { id: d.id, name: d.name };
	}
	// ensure account contains costcenter & location
	if (account) {
		(account as any).costcenter = costcenter;
		(account as any).location = location;
	}

	const filtered = {
		util_id: (bill as any).util_id,
		account,
		ubill_date: bill.ubill_date,
		ubill_no: bill.ubill_no,
		ubill_rent: bill.ubill_rent,
		ubill_color: bill.ubill_color,
		ubill_bw: bill.ubill_bw,
		ubill_stotal: bill.ubill_stotal,
		ubill_tax: bill.ubill_tax,
		ubill_round: bill.ubill_round,
		ubill_gtotal: bill.ubill_gtotal,
		ubill_disc: bill.ubill_disc,
		ubill_ref: bill.ubill_ref,
		ubill_paystat: bill.ubill_paystat
	};
	res.json({ status: 'success', message: 'Utility bill retrieved successfully', data: filtered });
};

export const createUtilityBill = async (req: Request, res: Response) => {
	const payload = req.body || {};
	// Multer may populate req.file (single) or req.files (fields). Prefer files.ubill_ref, then files.ubill_file, then req.file
	let file = (req as any).file as Express.Multer.File | undefined;
	const files = (req as any).files as { [key: string]: Express.Multer.File[] } | undefined;
	if (!file && files) {
		if (files.ubill_ref && files.ubill_ref.length > 0) file = files.ubill_ref[0];
		else if (files.ubill_file && files.ubill_file.length > 0) file = files.ubill_file[0];
	}

	// First, create DB record (without ubill_ref)
	let id: number;
	try {
		id = await billingModel.createUtilityBill(payload);
	} catch (err: any) {
		// Handle duplicate/unique constraint errors gracefully
		const msg = err && (err.message || err.sqlMessage || err.toString());
		const code = err && err.code;
		// Common MySQL duplicate error code is 'ER_DUP_ENTRY' or message contains 'Duplicate' / 'already exists'
		if (String(code) === 'ER_DUP_ENTRY' || (typeof msg === 'string' && (/duplicate|already exists|duplicate entry|unique constraint/i).test(msg))) {
			return res.status(409).json({ status: 'error', message: 'Utility bill already exists' });
		}
		// rethrow unknown errors to be handled by outer try/catch below
		throw err;
	}

	let finalRef: string | null = null;
	if (file) {
		try {
			const uploadDir = path.dirname(file.path);
			const ext = path.extname(file.originalname) || path.extname(file.path) || '';
			const timestamp = Date.now();
			const finalName = `ubill-${id}-${timestamp}${ext}`;
			const finalPath = path.join(uploadDir, finalName);

			// Rename/move the temp uploaded file to include insertId
			await fs.promises.rename(file.path, finalPath);

			// Normalize to a stable relative path (uploads/...) so `ubill_ref` is a retrievable static path
			const storedRef = normalizeStoredPath(finalPath);
			finalRef = storedRef;
			// Update DB ubill_ref if normalization produced a valid path
			if (finalRef) {
				await setUtilityBillRef(id, finalRef);
			}
		} catch (err) {
			logger.error('Error handling uploaded utility bill file', err);
			// Don't fail the whole request; respond with created id but note file error
			return res.status(201).json({ status: 'success', message: 'Utility bill created, but file save failed', id, fileError: String(err) });
		}
	}

	res.status(201).json({ status: 'success', message: 'Utility bill created', id, ubill_ref: finalRef, ubill_url: publicUrl(finalRef) });
};

export const updateUtilityBill = async (req: Request, res: Response) => {
	const util_id = Number(req.params.id);
	const data = req.body;
	await billingModel.updateUtilityBill(util_id, data);
	res.json({ status: 'success', message: 'Utility bill updated successfully' });
};

export const deleteUtilityBill = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	await billingModel.deleteUtilityBill(bill_id);
	res.json({ status: 'success', message: 'Utility bill deleted successfully' });
};


// Summarize utility bills by cost center, year, and month -- export to Excel
export const getUtilityBillingCostcenterSummary = async (req: Request, res: Response) => {
	const { service, from, to } = req.query;
	let rawBills = await billingModel.getUtilityBills();
	// Use a single accounts/accountMap declaration for both enrichment and grouping
	const accounts = await billingModel.getBillingAccounts();
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));

	// Enrich each bill with its account object
	let bills = rawBills.map((bill: any) => {
		let account = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			account = {
				bill_id: acc.bill_id,
				bill_ac: acc.bill_ac,
				provider: acc.provider,
				service: acc.service,
				desc: acc.bill_desc
			};
		}
		return { ...bill, account };
	});

	// Filter by date range if from/to provided
	if (from || to) {
		const fromDate = from ? new Date(from as string) : null;
		const toDate = to ? new Date(to as string) : null;
		bills = bills.filter((bill: any) => {
			const billDate = bill.ubill_date ? new Date(bill.ubill_date) : null;
			if (!billDate) return false;
			if (fromDate && billDate < fromDate) return false;
			if (toDate && billDate > toDate) return false;
			return true;
		});
	}

	// Filter by service if provided (match getUtilityBills logic: item.account.service, fallback to account.provider)
	if (service) {
		bills = bills.filter((item: any) => {
			if (item.account && item.account.service && String(item.account.service).toLowerCase().includes(String(service).toLowerCase())) {
				return true;
			}
			if (item.account && item.account.provider && String(item.account.provider).toLowerCase().includes(String(service).toLowerCase())) {
				return true;
			}
			return false;
		});
	}

	// Group by costcenter name, then year, then month (use bill.costcenter.name)
	const summary: Record<string, any> = {};
	// Prepare costcenter and account maps for lookup
	const costcentersRaw = await assetsModel.getCostcenters();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	// Group by costcenter, year, month, and service within each month
	for (const bill of bills) {
		let ccName = 'Unknown';
		if (bill.cc_id && ccMap.has(bill.cc_id)) {
			ccName = ccMap.get(bill.cc_id).name;
		}
		// Build account object for service/provider
		let serviceValue = 'Unknown';
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			if (acc.service) serviceValue = acc.service;
			else if (acc.provider) serviceValue = acc.provider;
		}
		// If service param is provided, skip bills that don't match
		if (service && !String(serviceValue).toLowerCase().includes(String(service).toLowerCase())) {
			continue;
		}
		if (!summary[ccName]) {
			summary[ccName] = { costcenter: ccName, _yearMap: {} };
		}
		const date = bill.ubill_date ? dayjs(bill.ubill_date) : null;
		if (!date) continue;
		const year = date.year();
		const month = date.month() + 1;
		const amount = parseFloat(bill.ubill_gtotal || '0');
		// Year grouping
		if (!summary[ccName]._yearMap[year]) {
			summary[ccName]._yearMap[year] = { expenses: 0, _monthMap: {} };
		}
		summary[ccName]._yearMap[year].expenses += amount;
		// Month grouping
		if (!summary[ccName]._yearMap[year]._monthMap[month]) {
			summary[ccName]._yearMap[year]._monthMap[month] = { expenses: 0, fuel: [] };
		}
		summary[ccName]._yearMap[year]._monthMap[month].expenses += amount;
		// Service grouping within month
		if (!summary[ccName]._yearMap[year]._monthMap[month]._serviceMap[serviceValue]) {
			summary[ccName]._yearMap[year]._monthMap[month]._serviceMap[serviceValue] = 0;
		}
		summary[ccName]._yearMap[year]._monthMap[month]._serviceMap[serviceValue] += amount;
	}

	// Transform to requested output structure
	const result = Object.values(summary).map((cc: any) => ({
		costcenter: cc.costcenter,
		details: Object.entries(cc._yearMap).map(([year, yval]: any) => ({
			year: Number(year),
			expenses: yval.expenses.toFixed(2),
			months: Object.entries(yval._monthMap).map(([month, mval]: any) => ({
				month: Number(month),
				expenses: mval.expenses.toFixed(2),
				/* details: Object.entries(mval._serviceMap).map(([service, amount]: any) => ({
				  service,
				  amount: amount.toFixed(2)
				})) */
			}))
		}))
	}));

	// Sort by costcenter name
	const sortedResult = result.sort((a: any, b: any) => String(a.costcenter).localeCompare(String(b.costcenter)));

	res.json({
		status: 'success',
		message: `Utility billing costcenter summary by date range retrieved successfully${service ? ` (filtered by service: ${service})` : ' (no service filter)'}`,
		data: sortedResult
	});
};

// Summarize utility bills by service, with optional costcenter filter and date range
export const getUtilityBillingServiceSummary = async (req: Request, res: Response) => {
	const { from, to, costcenter } = req.query;
	let rawBills = await billingModel.getUtilityBills();
	const accounts = await billingModel.getBillingAccounts();
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));

	// Enrich each bill with its account object
	let bills = rawBills.map((bill: any) => {
		let account = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			account = {
				bill_id: acc.bill_id,
				bill_ac: acc.bill_ac,
				provider: acc.provider,
				service: acc.service,
				desc: acc.bill_desc
			};
		}
		return { ...bill, account };
	});

	// Filter by date range if from/to provided
	if (from || to) {
		const fromDate = from ? new Date(from as string) : null;
		const toDate = to ? new Date(to as string) : null;
		bills = bills.filter((bill: any) => {
			const billDate = bill.ubill_date ? new Date(bill.ubill_date) : null;
			if (!billDate) return false;
			if (fromDate && billDate < fromDate) return false;
			if (toDate && billDate > toDate) return false;
			return true;
		});
	}

	// Filter by costcenter if provided and resolve name for message
	let costcenterName = '';
	if (costcenter) {
		bills = bills.filter((bill: any) => String(bill.cc_id) === String(costcenter));
		// Lookup costcenter name
		const costcentersRaw = await assetsModel.getCostcenters();
		const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
		const ccObj = costcenters.find((cc: any) => String(cc.id) === String(costcenter));
		if (ccObj && (ccObj as any).name) costcenterName = (ccObj as any).name;
	}

	// Group by service, then year, then month
	const summary: Record<string, any> = {};
	for (const bill of bills) {
		let service = 'Unknown';
		if (bill.account && bill.account.service) service = bill.account.service;
		else if (bill.account && bill.account.provider) service = bill.account.provider;
		const date = bill.ubill_date ? dayjs(bill.ubill_date) : null;
		if (!date) continue;
		const year = date.year();
		const month = date.month() + 1;
		const amount = parseFloat(bill.ubill_gtotal || '0');
		if (!summary[service]) summary[service] = { service, _yearMap: {} };
		if (!summary[service]._yearMap[year]) summary[service]._yearMap[year] = { expenses: 0, _monthMap: {} };
		summary[service]._yearMap[year].expenses += amount;
		if (!summary[service]._yearMap[year]._monthMap[month]) summary[service]._yearMap[year]._monthMap[month] = { expenses: 0 };
		summary[service]._yearMap[year]._monthMap[month].expenses += amount;
	}

	// Format output
	const result = Object.values(summary).map((s: any) => ({
		service: s.service,
		details: Object.entries(s._yearMap).map(([year, yval]: any) => ({
			year: Number(year),
			expenses: yval.expenses.toFixed(2),
			months: Object.entries(yval._monthMap).map(([month, mval]: any) => ({
				month: Number(month),
				expenses: mval.expenses.toFixed(2)
			}))
		}))
	})).sort((a, b) => a.service.localeCompare(b.service));

	res.json({
		status: 'success',
		message: `Utility billing service summary by date range${costcenter ? ` (filtered by costcenter: ${costcenterName || costcenter})` : ''}`,
		data: result
	});
};


// =================== BILLING ACCOUNT TABLE CONTROLLER ===================
export const getBillingAccounts = async (req: Request, res: Response) => {
	const accounts = await billingModel.getBillingAccounts();
	const baseUrl = process.env.BACKEND_URL || '';

	// fetch beneficiaries map (support old schema bfcy_* or new schema id/name)
	const beneficiaries = await billingModel.getBeneficiaries(undefined);
	const benMap = new Map((beneficiaries || []).map((b: any) => [Number(b.id ?? b.bfcy_id), b]));

	// fetch costcenters and locations
	const [costcentersRaw, locationsRaw] = await Promise.all([
		assetsModel.getCostcenters(),
		assetsModel.getLocations()
	]);
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];

	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));

	const enriched = accounts.map((account: any) => {
		const obj: any = { ...account };
		// attach beneficiary object when bfcy_id or beneficiary_id present
		const bfcyId = Number(obj.bfcy_id ?? obj.beneficiary_id);
		if (bfcyId && benMap.has(bfcyId)) {
			const b = benMap.get(bfcyId);
			// support multiple schema shapes for logo and name
			const rawLogo = b.bfcy_logo ?? b.logo ?? b.file_reference ?? null;
			const logo = rawLogo ? `${baseUrl.replace(/\/$/, '')}/${String(rawLogo).replace(/^\//, '')}` : null;
			const name = b.bfcy_name ?? b.bfcy_title ?? b.name ?? null;
			obj.beneficiary = { id: Number(b.id ?? b.bfcy_id), name, logo };
		} else {
			obj.beneficiary = null;
		}

		// attach resolved costcenter (cc_id or costcenter_id) and location (loc_id or location_id)
		const ccId = Number(obj.cc_id ?? obj.costcenter_id);
		obj.costcenter = ccId && ccMap.has(ccId) ? { id: ccId, name: ccMap.get(ccId).name } : null;

		const locId = Number(obj.loc_id ?? obj.location_id);
		if (locId && locationMap.has(locId)) {
			const d = locationMap.get(locId);
			const locName = d.name || d.code || null;
			obj.location = { id: locId, name: locName };
		} else {
			obj.location = null;
		}

		// remove raw numeric id fields from response (support both old and new names)
		delete obj.bfcy_id;
		delete obj.beneficiary_id;
		delete obj.cc_id;
		delete obj.costcenter_id;
		delete obj.loc_id;
		delete obj.location_id;
		delete obj.cc_id;
		delete obj.loc_id;

		return obj;
	});

	res.json({ status: 'success', message: 'Billing accounts retrieved successfully', data: enriched });
};

export const getBillingAccountById = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	const account = await billingModel.getBillingAccountById(bill_id);
	if (!account) {
		return res.status(404).json({ error: 'Billing account not found' });
	}
	const baseUrl = process.env.BACKEND_URL || '';

	// fetch beneficiaries, costcenters, and locations to resolve ids
	const [beneficiaries, costcentersRaw, locationsRaw] = await Promise.all([
		billingModel.getBeneficiaries(undefined),
		assetsModel.getCostcenters(),
		assetsModel.getLocations()
	]);
	const benMap = new Map((beneficiaries || []).map((b: any) => [Number(b.id ?? b.bfcy_id), b]));
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));

	const obj: any = { ...account };
	const bfcyId = Number(obj.bfcy_id ?? obj.beneficiary_id);
	if (bfcyId && benMap.has(bfcyId)) {
		const b = benMap.get(bfcyId);
		const rawLogo = b.bfcy_logo ?? b.logo ?? b.file_reference ?? null;
		const logo = rawLogo ? `${baseUrl.replace(/\/$/, '')}/${String(rawLogo).replace(/^\//, '')}` : null;
		const name = b.bfcy_name ?? b.bfcy_title ?? b.name ?? null;
		obj.beneficiary = { id: Number(b.id ?? b.bfcy_id), name, logo };
	} else {
		obj.beneficiary = null;
	}

	// resolve costcenter and location (support old/new field names)
	const ccId = Number(obj.cc_id ?? obj.costcenter_id);
	obj.costcenter = ccId && ccMap.has(ccId) ? { id: ccId, name: ccMap.get(ccId).name } : null;

	const locId = Number(obj.loc_id ?? obj.location_id);
	if (locId && locationMap.has(locId)) {
		const d = locationMap.get(locId);
		const locName = d.name || d.code || null;
		obj.location = { id: locId, name: locName };
	} else {
		obj.location = null;
	}

	// remove raw numeric id fields from response (support both names)
	delete obj.bfcy_id;
	delete obj.beneficiary_id;
	delete obj.cc_id;
	delete obj.costcenter_id;
	delete obj.loc_id;
	delete obj.location_id;

	res.json({ status: 'success', message: 'Billing account retrieved successfully', data: obj });
};

export const createBillingAccount = async (req: Request, res: Response) => {
	const payload = req.body;

	// Validate and normalize DATE fields to YYYY-MM-DD since DB column type is DATE
	if (payload.bill_cont_start) {
		const d = dayjs(payload.bill_cont_start);
		if (!d.isValid()) return res.status(400).json({ status: 'error', message: 'Invalid bill_cont_start date' });
		payload.bill_cont_start = d.format('YYYY-MM-DD');
	}
	if (payload.bill_cont_end) {
		const d2 = dayjs(payload.bill_cont_end);
		if (!d2.isValid()) return res.status(400).json({ status: 'error', message: 'Invalid bill_cont_end date' });
		payload.bill_cont_end = d2.format('YYYY-MM-DD');
	}
	const id = await billingModel.createBillingAccount(payload);
	res.status(201).json({ status: 'success', message: 'Billing account created successfully', id });
};

export const updateBillingAccount = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	const data = req.body;

	// Validate and normalize DATE fields to YYYY-MM-DD since DB column type is DATE
	if (data.bill_cont_start) {
		const d = dayjs(data.bill_cont_start);
		if (!d.isValid()) return res.status(400).json({ status: 'error', message: 'Invalid bill_cont_start date' });
		data.bill_cont_start = d.format('YYYY-MM-DD');
	}
	if (data.bill_cont_end) {
		const d2 = dayjs(data.bill_cont_end);
		if (!d2.isValid()) return res.status(400).json({ status: 'error', message: 'Invalid bill_cont_end date' });
		data.bill_cont_end = d2.format('YYYY-MM-DD');
	}
	await billingModel.updateBillingAccount(bill_id, data);
	res.json({ status: 'success', message: 'Billing account updated successfully' });
};

export const deleteBillingAccount = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	await billingModel.deleteBillingAccount(bill_id);
	res.json({ status: 'success', message: 'Billing account deleted successfully' });
};


/* export const postUtilityBillsByIds = async (req: Request, res: Response) => {
	// beneficiaryId from route params
	const beneficiaryId = Number(req.params.beneficiaryId ?? req.params.beneficiary_id ?? req.params.beneficiaryId);
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return res.status(400).json({ status: 'error', message: 'Invalid beneficiary id in path' });

	// fetch beneficiary record and enrich
	const ben = await billingModel.getBeneficiaryById(beneficiaryId);
	if (!ben) return res.status(404).json({ status: 'error', message: 'Beneficiary not found' });
	const baseUrl = process.env.BACKEND_URL || '';
	const rawLogo = ben.bfcy_logo ?? ben.logo ?? ben.bfcy_pic ?? null;
	let logo = rawLogo;
	if (rawLogo) {
		const normalized = String(rawLogo).replace(/^\/+/, '');
		if (normalized.startsWith('uploads/')) logo = `${baseUrl.replace(/\/$/, '')}/${normalized}`;
		else logo = `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
	}
	// resolve entry_by name if possible
	const employeesRaw = await assetsModel.getEmployees();
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map((employees || []).map((e: any) => [String(e.ramco_id), e]));
	let beneficiaryResp: any = { id: ben.id ?? ben.bfcy_id, name: ben.bfcy_name ?? ben.name ?? null, logo: logo, entry_by: null, entry_position: ben.entry_position || null, filing: ben.file_reference || null };
	if (ben.entry_by) {
		const k = String(ben.entry_by);
		if (empMap.has(k)) {
			const e = empMap.get(k);
			beneficiaryResp.entry_by = { ramco_id: e.ramco_id, full_name: e.full_name };
		} else {
			beneficiaryResp.entry_by = { ramco_id: ben.entry_by };
		}
	}

	// parse provided ids in request body
	const bodyIds = req.body?.util_id ?? req.body?.ids ?? req.body?.idsList;
	let ids: number[] = [];
	if (Array.isArray(bodyIds)) ids = bodyIds.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'string') ids = String(bodyIds).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'number') ids = [Number(bodyIds)];

	if (ids.length === 0) return res.status(400).json({ status: 'error', message: 'No util_id provided in request body' });

	// Fetch bills for provided ids and enrichment lookups
	const bills = await billingModel.getUtilityBillsByIds(ids);
	const accounts = await billingModel.getBillingAccounts();
	const costcentersRaw = await assetsModel.getCostcenters();
	const locationsRaw = await assetsModel.getLocations();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));

	// beneficiaries lookup to resolve account->beneficiary mapping
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

	// Build result: only include bills whose account resolves to the requested beneficiary
	const data = bills.map((bill: any) => {
		if (!bill.bill_id) return null;
		const acc = accountMap.get(bill.bill_id);
		if (!acc) return null;
		// attempt to resolve beneficiary for this account
		let benObj: any = null;
		const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
		if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
		if (!benObj) {
			const accBenId = acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
			if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
		}
		if (!benObj) return null; // account has no resolved beneficiary
		const benIdResolved = Number(benObj.id ?? benObj.bfcy_id ?? benObj.bfcyId ?? benObj.id);
		if (benIdResolved !== beneficiaryId) return null; // not the beneficiary we want

		// build account object (without embedding beneficiary; top-level beneficiary included separately)
		let costcenter = null;
		const ccLookupId = acc.cc_id ?? acc.costcenter_id ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId) as any;
			costcenter = { id: cc.id, name: cc.name };
		}
		let location = null;
		const locLookupId = acc.loc_id ?? acc.location_id ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId) as any;
			location = { id: d.id, name: d.name };
		}

		return {
			util_id: bill.util_id,
			account: {
				bill_id: acc.bill_id,
				account_no: acc.account,
				costcenter,
				location
			},
			ubill_date: bill.ubill_date,
			ubill_no: bill.ubill_no,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_submit: bill.ubill_submit ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_color: bill.ubill_color,
			ubill_bw: bill.ubill_bw,
			ubill_stotal: bill.ubill_stotal,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_tax: bill.ubill_tax,
			ubill_round: bill.ubill_round,
			ubill_deduct: bill.ubill_deduct,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_count: bill.ubill_count,
			ubill_disc: bill.ubill_disc,
			ubill_usage: bill.ubill_usage,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat
		};
	}).filter(Boolean) as any[];

	res.json({ status: 'success', message: `${data.length} utility bill(s) retrieved`, beneficiary: beneficiaryResp, data });
}; */

// POST variant: accepts JSON body { ids: [1,2] } or { util_id: [1,2] } or comma-separated string
export const postUtilityBillsByIds = async (req: Request, res: Response) => {
	// beneficiaryId from route params
	const beneficiaryId = Number(req.params.beneficiaryId ?? req.params.beneficiary_id ?? req.params.beneficiaryId);
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return res.status(400).json({ status: 'error', message: 'Invalid beneficiary id in path' });

	// fetch beneficiary record and enrich
	const ben = await billingModel.getBeneficiaryById(beneficiaryId);
	if (!ben) return res.status(404).json({ status: 'error', message: 'Beneficiary not found' });
	const baseUrl = process.env.BACKEND_URL || '';
	const rawLogo = ben.bfcy_logo ?? ben.logo ?? ben.bfcy_pic ?? null;
	let logo = rawLogo;
	if (rawLogo) {
		const normalized = String(rawLogo).replace(/^\/+/, '');
		if (normalized.startsWith('uploads/')) logo = `${baseUrl.replace(/\/$/, '')}/${normalized}`;
		else logo = `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
	}
	// resolve entry_by name if possible
	const employeesRaw = await assetsModel.getEmployees();
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map((employees || []).map((e: any) => [String(e.ramco_id), e]));
	let beneficiaryResp: any = { id: ben.id ?? ben.bfcy_id, name: ben.bfcy_name ?? ben.name ?? null, logo: logo, entry_by: null, entry_position: ben.entry_position || null, filing: ben.file_reference || null };
	if (ben.entry_by) {
		const k = String(ben.entry_by);
		if (empMap.has(k)) {
			const e = empMap.get(k);
			beneficiaryResp.entry_by = { ramco_id: e.ramco_id, full_name: e.full_name };
		} else {
			beneficiaryResp.entry_by = { ramco_id: ben.entry_by };
		}
	}

	// parse provided ids in request body
	const bodyIds = req.body?.util_id ?? req.body?.ids ?? req.body?.idsList;
	let ids: number[] = [];
	if (Array.isArray(bodyIds)) ids = bodyIds.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'string') ids = String(bodyIds).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'number') ids = [Number(bodyIds)];

	if (ids.length === 0) return res.status(400).json({ status: 'error', message: 'No util_id provided in request body' });

	// Fetch bills for provided ids and enrichment lookups
	const bills = await billingModel.getUtilityBillsByIds(ids);
	const accounts = await billingModel.getBillingAccounts();
	const costcentersRaw = await assetsModel.getCostcenters();
	const locationsRaw = await assetsModel.getLocations();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));

	// beneficiaries lookup to resolve account->beneficiary mapping
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

	// Build result: only include bills whose account resolves to the requested beneficiary
	const data = bills.map((bill: any) => {
		if (!bill.bill_id) return null;
		const acc = accountMap.get(bill.bill_id);
		if (!acc) return null;
		// attempt to resolve beneficiary for this account
		let benObj: any = null;
		const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
		if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
		if (!benObj) {
			const accBenId = acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
			if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
		}
		if (!benObj) return null; // account has no resolved beneficiary
		const benIdResolved = Number(benObj.id ?? benObj.bfcy_id ?? benObj.bfcyId ?? benObj.id);
		if (benIdResolved !== beneficiaryId) return null; // not the beneficiary we want

		// build account object (without embedding beneficiary; top-level beneficiary included separately)
		let costcenter = null;
		const ccLookupId = acc.cc_id ?? acc.costcenter_id ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId) as any;
			costcenter = { id: cc.id, name: cc.name };
		}
		let location = null;
		const locLookupId = acc.loc_id ?? acc.location_id ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId) as any;
			location = { id: d.id, name: d.name };
		}

		return {
			util_id: bill.util_id,
			account: {
				bill_id: acc.bill_id,
				account_no: acc.account,
				costcenter,
				location
			},
			ubill_date: bill.ubill_date,
			ubill_no: bill.ubill_no,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_submit: bill.ubill_submit ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_color: bill.ubill_color,
			ubill_bw: bill.ubill_bw,
			ubill_stotal: bill.ubill_stotal,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_tax: bill.ubill_tax,
			ubill_round: bill.ubill_round,
			ubill_deduct: bill.ubill_deduct,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_count: bill.ubill_count,
			ubill_disc: bill.ubill_disc,
			ubill_usage: bill.ubill_usage,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat
		};
	}).filter(Boolean) as any[];

	// Enrich each item with previous 5 bills for the same account
	const dataWithPrevious = await Promise.all(
		data.map(async (item: any) => {
			const prev = await billingModel.getPreviousUtilityBillsForAccount(
				item.account?.bill_id,
				item.util_id,
				5
			);
			// format month and compute trending vs previous element (previous month)
			const previous_5_bills = (prev || []).map((p: any) => ({
				ubill_no: p.ubill_no,
				month: p.ubill_date ? dayjs(p.ubill_date).format('MMM-YYYY') : null,
				ubill_gtotal: p.ubill_gtotal as string,
				// temporary placeholder; will fill below
				trending: null as any
			}));
			for (let i = 0; i < previous_5_bills.length; i++) {
				if (i < previous_5_bills.length - 1) {
					const curr = parseFloat(previous_5_bills[i].ubill_gtotal ?? '0');
					const prevAmt = parseFloat(previous_5_bills[i + 1].ubill_gtotal ?? '0');
					if (Number.isFinite(curr) && Number.isFinite(prevAmt)) {
						const diff = curr - prevAmt;
						previous_5_bills[i].trending = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
					} else {
						previous_5_bills[i].trending = null;
					}
				} else {
					previous_5_bills[i].trending = null;
				}
			}
			return { ...item, previous_5_bills };
		})
	);

	res.json({ status: 'success', message: `${dataWithPrevious.length} utility bill(s) retrieved`, beneficiary: beneficiaryResp, data: dataWithPrevious });
};

// POST /api/bills/util/by-ids?service=a,b,c
// Body accepts { ids: [1,2] } or { util_id: [1,2] } or comma-separated string
// Returns utility bills for the given IDs filtered by service(s), enriched similar to getUtilityBills
export const postUtilityBillsByIdsByService = async (req: Request, res: Response) => {
	// Parse IDs from body
	const bodyIds = (req.body && (req.body.util_id ?? req.body.ids ?? req.body.idsList)) as any;
	let ids: number[] = [];
	if (Array.isArray(bodyIds)) ids = bodyIds.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'string') ids = String(bodyIds).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'number') ids = [Number(bodyIds)];

	if (!ids.length) return res.status(400).json({ status: 'error', message: 'No util_id provided in request body' });

	// Parse service(s) filter from query: support service=, services=, repeated params, and comma-separated
	const svcQuery: any = (req.query.service ?? req.query.services);
	let serviceList: string[] = [];
	if (Array.isArray(svcQuery)) serviceList = svcQuery.flatMap((s: any) => String(s).split(','));
	else if (typeof svcQuery === 'string') serviceList = String(svcQuery).split(',');
	const normalizedServices = serviceList.map(s => s.trim().toLowerCase()).filter(Boolean);

	// Fetch bills and lookups
	const bills = await billingModel.getUtilityBillsByIds(ids);
	const accounts = await billingModel.getBillingAccounts();
	const costcentersRaw = await assetsModel.getCostcenters();
	const locationsRaw = await assetsModel.getLocations();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const accountMap = new Map((accounts || []).map((a: any) => [a.bill_id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));

	// Beneficiaries for enrichment (align with getUtilityBills)
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

	// Build enriched rows similar to getUtilityBills
	const enriched = bills.map((bill: any) => {
		// Build account object
		let account: any = null;
		let acc: any = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			acc = accountMap.get(bill.bill_id) as any;
			// resolve beneficiary for account
			let benObj: any = null;
			const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
			if (acc.beneficiary_id && benById.has(String(acc.beneficiary_id))) benObj = benById.get(String(acc.beneficiary_id));
			else if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
			account = {
				bill_id: acc.bill_id,
				account: acc.account,
				// In this codebase, service corresponds to account category
				service: acc.category,
				desc: acc.description,
				beneficiary: benObj ? {
					id: benObj.id ?? benObj.bfcy_id,
					name: benObj.bfcy_name ?? benObj.name,
					logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
					entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
					entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null
				} : null
			};
		}

		// Build costcenter object (prefer account-level if present)
		let costcenter: any = null;
		const ccLookupId = (acc && acc.costcenter_id) ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId) as any;
			costcenter = { id: cc.id, name: cc.name };
		}

		// Build location object (prefer account-level if present)
		let location: any = null;
		const locLookupId = (acc && acc.location_id) ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId) as any;
			location = { id: d.id, name: d.name };
		}

		if (account) {
			account.costcenter = costcenter;
			account.location = location;
		}

		return {
			util_id: bill.util_id,
			account,
			ubill_date: bill.ubill_date,
			ubill_no: bill.ubill_no,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_submit: bill.ubill_submit ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_color: bill.ubill_color,
			ubill_bw: bill.ubill_bw,
			ubill_stotal: bill.ubill_stotal,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_tax: bill.ubill_tax,
			ubill_round: bill.ubill_round,
			ubill_deduct: bill.ubill_deduct,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_count: bill.ubill_count,
			ubill_disc: bill.ubill_disc,
			ubill_usage: bill.ubill_usage,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat
		};
	}).filter(Boolean);

	// Apply service filter if provided: match getUtilityBills behavior (account.service)
	const final = normalizedServices.length
		? enriched.filter((item: any) => item.account && item.account.service && normalizedServices.some(s => String(item.account.service).toLowerCase().includes(s)))
		: enriched;

	res.json({ status: 'success', message: `${final.length} utility bill(s) retrieved`, data: final });
};

// POST variant for printing bills: accepts JSON body { ids: [1,2] } or { util_id: [1,2] } or comma-separated string
export const postPrintingBillsByIds = async (req: Request, res: Response) => {
	// beneficiaryId from route params
	const beneficiaryId = Number(req.params.beneficiaryId ?? req.params.beneficiary_id ?? req.params.beneficiaryId);
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return res.status(400).json({ status: 'error', message: 'Invalid beneficiary id in path' });

	// fetch beneficiary record and enrich
	const ben = await billingModel.getBeneficiaryById(beneficiaryId);
	if (!ben) return res.status(404).json({ status: 'error', message: 'Beneficiary not found' });
	const baseUrl = process.env.BACKEND_URL || '';
	const rawLogo = ben.bfcy_logo ?? ben.logo ?? ben.bfcy_pic ?? null;
	let logo = rawLogo;
	if (rawLogo) {
		const normalized = String(rawLogo).replace(/^\/+/, '');
		if (normalized.startsWith('uploads/')) logo = `${baseUrl.replace(/\/$/, '')}/${normalized}`;
		else logo = `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
	}
	// resolve entry_by name if possible
	const employeesRaw = await assetsModel.getEmployees();
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map((employees || []).map((e: any) => [String(e.ramco_id), e]));
	let beneficiaryResp: any = { id: ben.id ?? ben.bfcy_id, name: ben.bfcy_name ?? ben.name ?? null, logo: logo, entry_by: null, entry_position: ben.entry_position || null, filing: ben.file_reference || null };
	if (ben.entry_by) {
		const k = String(ben.entry_by);
		if (empMap.has(k)) {
			const e = empMap.get(k);
			beneficiaryResp.entry_by = { ramco_id: e.ramco_id, full_name: e.full_name };
		} else {
			beneficiaryResp.entry_by = { ramco_id: ben.entry_by };
		}
	}

	// parse provided ids in request body
	const bodyIds = req.body?.util_id ?? req.body?.ids ?? req.body?.idsList;
	let ids: number[] = [];
	if (Array.isArray(bodyIds)) ids = bodyIds.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'string') ids = String(bodyIds).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'number') ids = [Number(bodyIds)];

	if (ids.length === 0) return res.status(400).json({ status: 'error', message: 'No util_id provided in request body' });

	// Fetch bills for provided ids and enrichment lookups
	const bills = await billingModel.getUtilityBillsByIds(ids);
	const accounts = await billingModel.getBillingAccounts();
	const costcentersRaw = await assetsModel.getCostcenters();
	const locationsRaw = await assetsModel.getLocations();
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));

	// beneficiaries lookup to resolve account->beneficiary mapping
	const beneficiariesRaw = await billingModel.getBeneficiaries(undefined);
	const beneficiaries = Array.isArray(beneficiariesRaw) ? beneficiariesRaw : [];
	const benByName = new Map(beneficiaries.map((b: any) => [String((b.bfcy_name ?? b.name) || '').toLowerCase(), b]));
	const benById = new Map(beneficiaries.map((b: any) => [String((b.id ?? b.bfcy_id) ?? ''), b]));

	// Build result: only include bills whose account resolves to the requested beneficiary AND category is 'printing'
	const data = bills.map((bill: any) => {
		if (!bill.bill_id) return null;
		const acc = accountMap.get(bill.bill_id);
		if (!acc) return null;
		// only printing category
		const category = String(acc.category || '').toLowerCase();
		if (category !== 'printing') return null;
		// attempt to resolve beneficiary for this account
		let benObj: any = null;
		const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
		if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
		if (!benObj) {
			const accBenId = acc.bfcy_id ?? acc.beneficiary_id ?? acc.bfcyId ?? acc.beneficiaryId ?? null;
			if (accBenId && benById.has(String(accBenId))) benObj = benById.get(String(accBenId));
		}
		if (!benObj) return null; // account has no resolved beneficiary
		const benIdResolved = Number(benObj.id ?? benObj.bfcy_id ?? benObj.bfcyId ?? benObj.id);
		if (benIdResolved !== beneficiaryId) return null; // not the beneficiary we want

		// build account object (without embedding beneficiary; top-level beneficiary included separately)
		let costcenter = null;
		const ccLookupId = acc.cc_id ?? acc.costcenter_id ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId) as any;
			costcenter = { id: cc.id, name: cc.name };
		}
		let location = null;
		const locLookupId = acc.loc_id ?? acc.location_id ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId) as any;
			location = { id: d.id, name: d.name };
		}

		return {
			util_id: bill.util_id,
			account: {
				bill_id: acc.bill_id,
				account_no: acc.account,
				costcenter,
				location
			},
			ubill_date: bill.ubill_date,
			ubill_no: bill.ubill_no,
			ubill_rent: bill.ubill_rent,
			ubill_color: bill.ubill_color,
			ubill_bw: bill.ubill_bw,
			ubill_gtotal: bill.ubill_gtotal
		};
	}).filter(Boolean) as any[];

	// Enrich each item with previous 5 bills for the same account (printing context)
	const dataWithPrevious = await Promise.all(
		data.map(async (item: any) => {
			const prev = await billingModel.getPreviousUtilityBillsForAccount(
				item.account?.bill_id,
				item.util_id,
				5
			);
			const previous_5_bills = (prev || []).map((p: any) => ({
				ubill_no: p.ubill_no,
				month: p.ubill_date ? dayjs(p.ubill_date).format('MMM-YYYY') : null,
				ubill_gtotal: p.ubill_gtotal as string,
				trending: null as any
			}));
			for (let i = 0; i < previous_5_bills.length; i++) {
				if (i < previous_5_bills.length - 1) {
					const curr = parseFloat(previous_5_bills[i].ubill_gtotal ?? '0');
					const prevAmt = parseFloat(previous_5_bills[i + 1].ubill_gtotal ?? '0');
					if (Number.isFinite(curr) && Number.isFinite(prevAmt)) {
						const diff = curr - prevAmt;
						previous_5_bills[i].trending = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
					} else {
						previous_5_bills[i].trending = null;
					}
				} else {
					previous_5_bills[i].trending = null;
				}
			}
			return { ...item, previous_5_bills };
		})
	);

	res.json({ status: 'success', message: `${dataWithPrevious.length} printing bill(s) retrieved`, beneficiary: beneficiaryResp, data: dataWithPrevious });
};

// =================== BENEFICIARY (BILLING PROVIDERS) CONTROLLER ===================
export const getBeneficiaries = async (req: Request, res: Response) => {
	// Optional query param: ?services=svc1,svc2 or ?services=svc
	const servicesQuery = req.query.services;
	// Pass through as string or string[] to model; model will normalize
	const beneficiaries = await billingModel.getBeneficiaries(servicesQuery as any);
	const baseUrl = process.env.BACKEND_URL || '';
	// fetch employees to resolve entry_by
	const employeesRaw = await assetsModel.getEmployees();
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map((employees || []).map((e: any) => [String(e.ramco_id), e]));
	const enriched = (beneficiaries || []).map((b: any) => {
		// bfcy_logo stores vendor logo path (images/vendor_logo/...), bfcy_pic is person-in-charge picture
		const rawLogo = b.bfcy_logo || null;
		let logo = rawLogo;
		if (rawLogo) {
			const normalized = String(rawLogo).replace(/^\/+/, '');
			if (normalized.startsWith('uploads/')) {
				logo = `${baseUrl.replace(/\/$/, '')}/${normalized}`;
			} else {
				logo = `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
			}
		}
		const obj: any = { ...b };
		if (obj.bfcy_logo) delete obj.bfcy_logo;
		obj.logo = logo;
		// resolve entry_by to { ramco_id, full_name } when possible
		const prepRaw = obj.entry_by ?? null;
		if (prepRaw) {
			const key = String(prepRaw);
			if (empMap.has(key)) {
				const e = empMap.get(key);
				obj.entry_by = { ramco_id: e.ramco_id, full_name: e.full_name };
			} else {
				obj.entry_by = { ramco_id: prepRaw };
			}
		} else {
			obj.entry_by = null;
		}
		return obj;
	});
	res.json({ status: 'success', message: 'Beneficiaries retrieved successfully', data: enriched });
};

export const getBeneficiaryById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const ben = await billingModel.getBeneficiaryById(id);
	if (!ben) return res.status(404).json({ status: 'error', message: 'Beneficiary not found' });
	const baseUrl = process.env.BACKEND_URL || '';
	const rawLogo = ben.bfcy_logo || ben.logo || ben.bfcy_pic || null;
	let logo = rawLogo;
	if (rawLogo) {
		const normalized = String(rawLogo).replace(/^\/+/, '');
		if (normalized.startsWith('uploads/')) {
			logo = `${baseUrl.replace(/\/$/, '')}/${normalized}`;
		} else {
			logo = `${baseUrl.replace(/\/$/, '')}/uploads/${normalized}`;
		}
	}
	const resp: any = { ...ben };
	if (resp.bfcy_logo) delete resp.bfcy_logo;
	resp.logo = logo;
	// resolve entry_by using employees lookup
	const employeesRaw = await assetsModel.getEmployees();
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map((employees || []).map((e: any) => [String(e.ramco_id), e]));
	const prepRaw = resp.entry_by ?? null;
	if (prepRaw) {
		const key = String(prepRaw);
		if (empMap.has(key)) {
			const e = empMap.get(key);
			resp.entry_by = { ramco_id: e.ramco_id, full_name: e.full_name };
		} else {
			resp.entry_by = { ramco_id: prepRaw };
		}
	} else {
		resp.entry_by = null;
	}
	res.json({ status: 'success', message: 'Beneficiary retrieved successfully', data: resp });
};

export const createBeneficiary = async (req: Request, res: Response) => {
	const payload = req.body || {};
	// Optional file upload handling for creation: store uploaded file under UPLOAD_BASE_PATH/images/logo/<filename>
	if (req.file) {
		payload.bfcy_logo = normalizeStoredPath(req.file.path);
	}
	try {
		const id = await billingModel.createBeneficiary(payload);
		res.status(201).json({ status: 'success', message: 'Beneficiary created successfully', id });
	} catch (err: any) {
		if (err && String(err.message) === 'duplicate_beneficiary') {
			return res.status(409).json({ status: 'error', message: 'Beneficiary with same name and category already exists' });
		}
		throw err;
	}
};

export const updateBeneficiary = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const payload = req.body || {};
	// Optional bfcy_logo file upload for update
	if (req.file) {
		// Save vendor logo path normalized to a relative 'uploads/...' path
		payload.bfcy_logo = normalizeStoredPath(req.file.path);
	}
	// Remove any 'logo' key to avoid unknown column errors when using SET ?
	if (payload.logo) delete payload.logo;
	try {
		await billingModel.updateBeneficiary(id, payload);
		res.json({ status: 'success', message: 'Beneficiary updated successfully' });
	} catch (err: any) {
		if (err && String(err.message) === 'duplicate_beneficiary') {
			return res.status(409).json({ status: 'error', message: 'Beneficiary with same name and category already exists' });
		}
		throw err;
	}
};

export const deleteBeneficiary = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteBeneficiary(id);
	res.json({ status: 'success', message: 'Beneficiary deleted successfully' });
};
