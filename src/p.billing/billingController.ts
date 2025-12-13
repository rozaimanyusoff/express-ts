import dayjs from 'dayjs';
// src/p.billing/billingController.ts
import { Request, Response } from 'express';
import { stat } from 'fs';
import fs from 'fs';
import { register } from 'module';
import path from 'path';

import * as assetsModel from '../p.asset/assetModel';
import * as maintenanceModel from '../p.maintenance/maintenanceModel';
import logger from '../utils/logger';
import { getSocketIOInstance } from '../utils/socketIoInstance';
import { toPublicUrl } from '../utils/uploadUtil';
import * as billingModel from './billingModel';
import { setUtilityBillRef } from './billingModel';

/* ============== HELPER FUNCTIONS =============== */

/**
 * Calculate invoice status based on field values
 * - invoiced: inv_no & inv_date not null & inv_total > 0 (form_upload_date is optional)
 * - accrued: inv_no & inv_date null, form_upload_date not null & inv_total > 0
 * - form uploaded: inv_no & inv_date null, form_upload_date not null & inv_total = 0
 * - draft: inv_no & inv_date & form_upload_date null & inv_total = 0
 */
const calculateInvStat = (inv_no: any, inv_date: any, form_upload_date: any, inv_total: any): string => {
	const hasInvNo = inv_no !== null && inv_no !== undefined && String(inv_no).trim() !== '';
	const hasInvDate = inv_date !== null && inv_date !== undefined;
	const hasFormUpload = form_upload_date !== null && form_upload_date !== undefined;
	const amount = Number(inv_total) || 0;
	const hasAmount = amount > 0;

	// invoiced: has invoice number & date, with amount > 0 (form_upload_date is optional)
	if (hasInvNo && hasInvDate && hasAmount) {
		return 'invoiced';
	}
	// accrued: no invoice number & date, but form uploaded with amount > 0
	if (!hasInvNo && !hasInvDate && hasFormUpload && hasAmount) {
		return 'accrued';
	}
	if (!hasInvNo && !hasInvDate && hasFormUpload && !hasAmount) {
		return 'form uploaded';
	}
	return 'draft'; // default when inv_no, inv_date, form_upload_date are null and inv_total = 0
};

/* ============== VEHICLE MAINTENANCE =============== */

export const getVehicleMtnBillings = async (req: Request, res: Response) => {
	try {
		// Optional filters applied at model level using entry_date
		const qYear = (req.query as any)?.year;
		const year = (qYear !== undefined && qYear !== null && String(qYear).trim() !== '') ? Number(String(qYear).trim()) : undefined;
		const from = (req.query as any)?.from ? String((req.query as any).from) : undefined;
		const to = (req.query as any)?.to ? String((req.query as any).to) : undefined;
		// Load rows (model will prioritize from/to over year)
		const list = await billingModel.getVehicleMtnBillings(year, from, to);
		const vehicleMtn = Array.isArray(list) ? (list as any[]) : [];

		// Fetch lookup lists
		const workshops = await billingModel.getWorkshops();
		const assets = await assetsModel.getAssets();
		const costcenters = await assetsModel.getCostcenters() as any[];
		const locations = await assetsModel.getLocations() as any[];
		// Fetch maintenance requests to get form_upload_date
		const mtnRequests = await maintenanceModel.getVehicleMtnRequests();
		const mtnReqMap = new Map((mtnRequests || []).map((r: any) => [r.req_id, r]));
		// Build lookup maps for fast access (support id and asset_id)
		const assetMap = new Map();
		for (const a of (assets || [])) {
			if (a.id !== undefined && a.id !== null) assetMap.set(a.id, a);
			if (a.asset_id !== undefined && a.asset_id !== null) assetMap.set(a.asset_id, a);
		}
		const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
		const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
		const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
		// Map nested structure
		const data = vehicleMtn.map(b => {
			const asset_id = (b).asset_id ?? (b).vehicle_id;
			const cc_id = (b).cc_id ?? (b).costcenter_id;
			const loc_id = (b).location_id ?? (b).loc_id;
			const svc_order = (b).svc_order;
			const mtnReq = mtnReqMap.get(Number(svc_order));
			const form_upload_date = mtnReq?.form_upload_date ?? null;
			const inv_stat = calculateInvStat((b).inv_no, (b).inv_date, form_upload_date, (b).inv_total);
			return {
				asset: assetMap.has(asset_id) ? {
					costcenter: ccMap.has(cc_id) ? { id: cc_id, name: (ccMap.get(cc_id))?.name } : null,
					fuel_type: (assetMap.get(asset_id))?.fuel_type || (assetMap.get(asset_id))?.vfuel_type || null,
					id: asset_id,
					location: (loc_id && locationMap.has(loc_id)) ? { code: (locationMap.get(loc_id))?.code, id: (locationMap.get(loc_id))?.id } : null,
					register_number: (assetMap.get(asset_id))?.register_number || (assetMap.get(asset_id))?.vehicle_regno || null
				} : null,
				entry_date: (b).entry_date,
				form_upload_date: form_upload_date,
				inv_date: (b).inv_date,
				inv_id: (b).inv_id,
				inv_no: (b).inv_no,
				inv_remarks: (b).inv_remarks,
				inv_stat: inv_stat,
				inv_total: (b).inv_total,
				running_no: (b).running_no,
				svc_date: (b).svc_date,
				svc_odo: (b).svc_odo,
				svc_order: svc_order,
				workshop: wsMap.has((b).ws_id) ? { id: (b).ws_id, name: (wsMap.get((b).ws_id))?.ws_name } : null
			};
		});
		return res.json({ data, message: `Vehicle maintenance billings retrieved successfully total entries: ${data.length}`, status: 'success' });
	} catch (err: any) {
		logger.error(err);
		return res.status(500).json({ data: null, message: err?.message || 'Failed to retrieve vehicle maintenance billings', status: 'error' });
	}
};

// Same as getVehicleMtnBillings but applies filters on inv_date rather than entry_date
export const getVehicleMtnBillingsInv = async (req: Request, res: Response) => {
	try {
		const qYear = (req.query as any)?.year;
		const year = (qYear !== undefined && qYear !== null && String(qYear).trim() !== '') ? Number(String(qYear).trim()) : undefined;
		const from = (req.query as any)?.from ? String((req.query as any).from) : undefined;
		const to = (req.query as any)?.to ? String((req.query as any).to) : undefined;
		// Load rows filtered by inv_date
		const list = await billingModel.getVehicleMtnBillingsByInvDate(year, from, to);
		const vehicleMtn = Array.isArray(list) ? (list as any[]) : [];

		// Fetch lookup lists
		const workshops = await billingModel.getWorkshops();
		const assets = await assetsModel.getAssets();
		const costcenters = await assetsModel.getCostcenters() as any[];
		const locations = await assetsModel.getLocations() as any[];
		// Build lookup maps for fast access (support id and asset_id)
		const assetMap = new Map();
		for (const a of (assets || [])) {
			if (a.id !== undefined && a.id !== null) assetMap.set(a.id, a);
			if (a.asset_id !== undefined && a.asset_id !== null) assetMap.set(a.asset_id, a);
		}
		const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
		const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
		const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));
		// Map nested structure (same shape as default list endpoint)
		const data = vehicleMtn.map(b => {
			const asset_id = (b).asset_id ?? (b).vehicle_id;
			const cc_id = (b).cc_id ?? (b).costcenter_id;
			const loc_id = (b).location_id ?? (b).loc_id;
			return {
				asset: assetMap.has(asset_id) ? {
					costcenter: ccMap.has(cc_id) ? { id: cc_id, name: (ccMap.get(cc_id))?.name } : null,
					fuel_type: (assetMap.get(asset_id))?.fuel_type || (assetMap.get(asset_id))?.vfuel_type || null,
					id: asset_id,
					location: (loc_id && locationMap.has(loc_id)) ? { code: (locationMap.get(loc_id))?.code, id: (locationMap.get(loc_id))?.id } : null,
					register_number: (assetMap.get(asset_id))?.register_number || (assetMap.get(asset_id))?.vehicle_regno || null
				} : null,
				entry_date: (b).entry_date,
				inv_date: (b).inv_date,
				inv_id: (b).inv_id,
				inv_no: (b).inv_no,
				inv_remarks: (b).inv_remarks,
				inv_stat: (b).inv_stat,
				inv_total: (b).inv_total,
				running_no: (b).running_no,
				svc_date: (b).svc_date,
				svc_odo: (b).svc_odo,
				svc_order: (b).svc_order,
				workshop: wsMap.has((b).ws_id) ? { id: (b).ws_id, name: (wsMap.get((b).ws_id))?.ws_name } : null
			};
		});
		return res.json({ data, message: `Vehicle maintenance billings (inv_date) retrieved successfully`, status: 'success' });
	} catch (err: any) {
		logger.error(err);
		return res.status(500).json({ data: null, message: err?.message || 'Failed to retrieve vehicle maintenance billings (inv_date)', status: 'error' });
	}
};

export const getVehicleMtnBillingById = async (req: Request, res: Response) => {
	const billing = await billingModel.getVehicleMtnBillingById(Number(req.params.id));
	if (!billing) {
		return res.status(404).json({ message: 'Billing not found', status: 'error' });
	}

	// Fetch lookup data
	const assets = await assetsModel.getAssets();
	const costcenters = await assetsModel.getCostcenters() as any[];
	const locations = await assetsModel.getLocations() as any[];
	const workshops = await billingModel.getWorkshops();

	// Build lookup maps for fast access
	const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
	const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
	const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
	const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));

	// Use inv_id if available, otherwise fallback to id
	const invoiceId = billing.inv_id;
	const parts = await billingModel.getVehicleMtnBillingParts(invoiceId);

	// Optionally resolve maintenance request (svc_order maps to req_id)
	let svcOrderDetails: any = null;
	try {
		const svcOrderVal = (billing as any).svc_order;
		const reqId = Number(svcOrderVal);
		if (Number.isFinite(reqId) && reqId > 0) {
			const req = await maintenanceModel.getVehicleMtnRequestById(reqId);
			if (req) {
				const rAssetId = (req as any).asset_id ?? (req as any).vehicle_id;
				const rCcId = (req as any).costcenter_id ?? (req as any).cc_id;
				const rLocId = (req as any).location_id ?? (req as any).loc_id;
				const rWsId = (req as any).ws_id;
				
				// Build full URL for form_upload if it exists with proper URL encoding
				const formUpload = (req as any).form_upload;
				let formUploadUrl: null | string = null;
				if (formUpload) {
					let finalPath = formUpload;
					
					// If only filename is stored (no path), prepend default upload path
					if (!formUpload.includes('/')) {
						finalPath = `uploads/admin/vehiclemtn2/${formUpload}`;
					}
					
					// Split path and filename to encode only the filename part
					const pathParts = finalPath.split('/');
					const filename = pathParts.pop();
					const encodedFilename = encodeURIComponent(filename);
					const encodedPath = [...pathParts, encodedFilename].join('/');
					formUploadUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/${encodedPath}`;
				}
				
				svcOrderDetails = {
					approval_date: (req as any).approval_date ?? null,
					form_upload: formUploadUrl,
					form_upload_date: (req as any).form_upload_date ?? null,
					req_date: (req as any).req_date,
					req_id: (req as any).req_id,
					status: (req as any).req_stat ?? (req as any).status ?? null
				};
			}
		}
	} catch (e) {
		// non-fatal enrichment failure
	}

	// Structure the billing data with nested objects
	const asset_id = (billing as any).asset_id;
	const cc_id = (billing as any).cc_id;
	const loc_id = (billing as any).location_id ?? (billing as any).loc_id;

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

	// Calculate invoice status
	const form_upload_date = svcOrderDetails?.form_upload_date ?? null;
	const inv_stat = calculateInvStat(billing.inv_no, billing.inv_date, form_upload_date, billing.inv_total);

	const structuredBilling = {
		asset: assetMap.has(asset_id) ? {
			costcenter: ccMap.has(cc_id) ? {
				id: cc_id,
				name: (ccMap.get(cc_id))?.name
			} : null,
			id: asset_id,
			location: (loc_id && locationMap.has(loc_id)) ? {
				code: (locationMap.get(loc_id))?.code,
				id: (locationMap.get(loc_id))?.id
			} : null,
			register_number: (assetMap.get(asset_id))?.register_number
		} : null,
		inv_date: billing.inv_date,
		inv_id: billing.inv_id,
		inv_no: billing.inv_no,
		inv_remarks: billing.inv_remarks,
		inv_stat: inv_stat,
		inv_total: billing.inv_total,
		parts: enrichedParts,
		running_no: billing.running_no,
		svc_date: billing.svc_date,
		svc_odo: billing.svc_odo,
		svc_order: billing.svc_order,
		svc_order_details: svcOrderDetails,
		// Provide full public URL for the uploaded attachment if present
		//upload: (billing as any).upload ?? (billing as any).attachment ?? null,
		upload_url: toPublicUrl((billing as any).upload ?? (billing as any).attachment ?? null),
		workshop: wsMap.has(billing.ws_id) ? {
			id: billing.ws_id,
			name: (wsMap.get(billing.ws_id))?.ws_name
		} : null
	};

	res.json({ data: structuredBilling, message: 'Vehicle maintenance billing retrieved successfully', status: 'success' });
};

// POST /api/bills/mtn/ - Get multiple maintenance billings by IDs without parts
export const getVehicleMtnBillingsByIds = async (req: Request, res: Response) => {
	try {
		// Extract IDs from request body
		const idsInput = req.body?.ids;
		let ids: number[] = [];

		// Support both array and comma-separated string formats
		if (Array.isArray(idsInput)) {
			ids = idsInput.map((id: any) => Number(id)).filter((n: number) => Number.isFinite(n) && n > 0);
		} else if (typeof idsInput === 'string') {
			ids = idsInput.split(',').map((id: string) => Number(id.trim())).filter((n: number) => Number.isFinite(n) && n > 0);
		}

		if (ids.length === 0) {
			return res.status(400).json({ data: null, message: 'ids array is required in request body', status: 'error' });
		}

		// Fetch billings for all provided IDs
		const billings = await Promise.all(
			ids.map(id => billingModel.getVehicleMtnBillingById(id))
		);

		// Filter out null results (not found billings)
		const validBillings = billings.filter(b => b !== null);

		// Fetch lookup data
		const assets = await assetsModel.getAssets();
		const costcenters = await assetsModel.getCostcenters() as any[];
		const locations = await assetsModel.getLocations() as any[];
		const workshops = await billingModel.getWorkshops();

		// Build lookup maps for fast access
		const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
		const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
		const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
		const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));

		// Structure the billing data without parts
		const structuredBillings = validBillings.map(billing => {
			const asset_id = (billing as any).asset_id;
			const cc_id = (billing as any).cc_id;
			const loc_id = (billing as any).location_id ?? (billing as any).loc_id;

			// Extract service details from svc_type array (already populated by billingModel)
			let serviceDetails = null;
			if (Array.isArray((billing as any).svc_type) && (billing as any).svc_type.length > 0) {
				serviceDetails = (billing as any).svc_type
					.map((st: any) => st.name)
					.filter((name: string) => name)
					.join(', ');
			}

			return {
				asset: assetMap.has(asset_id) ? {
					costcenter: ccMap.has(cc_id) ? {
						id: cc_id,
						name: (ccMap.get(cc_id))?.name
					} : null,
					id: asset_id,
					location: (loc_id && locationMap.has(loc_id)) ? {
						code: (locationMap.get(loc_id))?.code,
						id: (locationMap.get(loc_id))?.id
					} : null,
					register_number: (assetMap.get(asset_id))?.register_number
				} : null,
				inv_date: billing.inv_date,
				inv_id: billing.inv_id,
				inv_no: billing.inv_no,
				inv_remarks: billing.inv_remarks,
				inv_stat: billing.inv_stat,
				inv_total: billing.inv_total,
				running_no: billing.running_no,
				service_details: serviceDetails,
				svc_date: billing.svc_date,
				svc_odo: billing.svc_odo,
				svc_order: billing.svc_order,
				upload_url: toPublicUrl((billing as any).upload ?? (billing as any).attachment ?? null),
				workshop: wsMap.has(billing.ws_id) ? {
					id: billing.ws_id,
					name: (wsMap.get(billing.ws_id))?.ws_name
				} : null
			};
		});

		res.json({ 
			data: structuredBillings, 
			message: `${structuredBillings.length} vehicle maintenance billings retrieved successfully`, 
			status: 'success' 
		});
	} catch (err: any) {
		logger.error(err);
		return res.status(500).json({ data: null, message: err?.message || 'Failed to retrieve vehicle maintenance billings', status: 'error' });
	}
};


// Get maintenance billings by request id (svc_order)
export const getVehicleMtnBillingByRequestId = async (req: Request, res: Response) => {
	const svc_order = String(req.params.svc_order || '').trim();
	if (!svc_order) return res.status(400).json({ message: 'svc_order is required', status: 'error' });

	const billings = await billingModel.getVehicleMtnBillingByRequestId(svc_order);

	// Fetch lookups similar to list endpoint for enrichment
			const [workshopsRaw, assetsRaw, costcentersRaw, locationsRaw] = await Promise.all([
				billingModel.getWorkshops(),
				assetsModel.getAssets(),
				assetsModel.getCostcenters(),
				assetsModel.getLocations()
			]);

			const workshops = Array.isArray(workshopsRaw) ? (workshopsRaw) : [];
			const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
			const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
			const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];

			const assetMap = new Map((assets || []).map((asset: any) => [asset.id, asset]));
			const ccMap = new Map((costcenters || []).map((cc: any) => [cc.id, cc]));
			const locationMap = new Map((locations || []).map((d: any) => [d.id, d]));
			const wsMap = new Map((workshops || []).map((ws: any) => [ws.ws_id, ws]));

	// Fetch parts for all invoices in one go
	const invIds = Array.from(new Set((billings || []).map((b: any) => Number(b.inv_id)).filter((n: number) => Number.isFinite(n))));
	const partsByInvId = new Map<number, any[]>();
	const allPartsArrays = await Promise.all(invIds.map((id) => billingModel.getVehicleMtnBillingParts(id)));
	for (let i = 0; i < invIds.length; i++) {
		partsByInvId.set(invIds[i], Array.isArray(allPartsArrays[i]) ? allPartsArrays[i] : []);
	}
	// Build autopart lookup (unique ids across all invoices)
	const autopartIds = Array.from(new Set(
		([] as any[]).concat(...(Array.from(partsByInvId.values()))).map((p: any) => Number(p.autopart_id)).filter((n: number) => Number.isFinite(n))
	));
	const autopartsLookup = autopartIds.length ? await billingModel.getServicePartsByIds(autopartIds) : [];
	const autopartsMap = new Map((autopartsLookup || []).map((a: any) => [Number(a.autopart_id), a]));

	const data = (billings || []).map((b: any) => {
		const asset_id = b.asset_id;
		const cc_id = b.cc_id ?? b.costcenter_id;
		const loc_id = b.loc_id ?? b.location_id;
		const invParts = partsByInvId.get(Number(b.inv_id)) || [];
		const enrichedParts = (invParts || []).map((p: any) => {
			const ap = autopartsMap.get(Number(p.autopart_id));
			const part_name = p.part_name || (ap ? ap.part_name : null) || (ap ? ap.part_name : null);
			return { ...p, part_name };
		});
		return {
			asset: assetMap.has(asset_id) ? {
				costcenter: ccMap.has(cc_id) ? { id: cc_id, name: (ccMap.get(cc_id))?.name } : null,
				fuel_type: (assetMap.get(asset_id))?.fuel_type,
				id: asset_id,
				location: locationMap.has(loc_id) ? { id: loc_id, name: (locationMap.get(loc_id))?.code } : null,
				register_number: (assetMap.get(asset_id))?.register_number
			} : null,
			inv_date: b.inv_date,
			inv_id: b.inv_id,
			inv_no: b.inv_no,
			inv_remarks: b.inv_remarks,
			inv_stat: b.inv_stat,
			inv_total: b.inv_total,
			parts: enrichedParts,
			running_no: b.running_no,
			svc_date: b.svc_date,
			svc_odo: b.svc_odo,
			svc_order: b.svc_order,
					upload_url: toPublicUrl((b).upload ?? (b).attachment ?? null),
					workshop: wsMap.has(b.ws_id) ? { id: b.ws_id, name: (wsMap.get(b.ws_id))?.ws_name } : null
		};
	});

	return res.json({ data, message: `Vehicle maintenance billings for request ${svc_order} retrieved successfully`, status: 'success' });
};

// This function might be unused due to no manual entry for vehicle maintenance invoicing process except updating
export const updateVehicleMtnBilling = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const body = req.body || {};
	// Map frontend fields to backend fields
	const updateData: any = {
		inv_date: body.inv_date,
		inv_no: body.inv_no,
		inv_remarks: body.inv_remarks,
		inv_stat: body.inv_stat,
		inv_total: body.inv_total,
		svc_date: body.svc_date,
		svc_odo: body.svc_odo,
		svc_order: body.svc_order,
		ws_id: body.ws_id
	};

	// Handle file upload from either 'attachment' or 'upload' field names.
	// With multer.single, files land on req.file; with multer.fields, files land on req.files as arrays.
	let uploadedPath: null | string = null;
	const anyReq: any = req as any;
	if (anyReq.file?.path) {
		uploadedPath = anyReq.file.path;
	} else if (anyReq.files) {
		// Prefer 'attachment', then 'upload'
		const f1 = Array.isArray(anyReq.files.attachment) && anyReq.files.attachment.length > 0 ? anyReq.files.attachment[0] : null;
		const f2 = Array.isArray(anyReq.files.upload) && anyReq.files.upload.length > 0 ? anyReq.files.upload[0] : null;
		const f = f1 || f2;
		if (f?.path) uploadedPath = f.path;
	}
	if (uploadedPath) {
		const normalized = normalizeStoredPath(uploadedPath);
		if (normalized) updateData.attachment = normalized; // will mirror to upload below
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
		const autopartId = Number(part?.autopart_id);
		// Check if autopart_id is a negative number (indicating a new/custom part not yet saved)
		if (part && Number.isFinite(autopartId) && autopartId < 0) {
			// Insert custom part into service parts table
			const newAutopartId = await billingModel.createServicePart({
				part_name: part.part_name,
				part_stat: 1,
				part_uprice: part.part_uprice,
			});
			parts[i] = { ...part, autopart_id: newAutopartId };
		}
	}

	// Full replacement: delete all parts for this invoice, then insert new ones
	await billingModel.deleteAllVehicleMtnBillingParts(id);
	if (parts.length > 0) {
		await billingModel.createVehicleMtnBillingParts(id, parts);
	}

	// If the client provided a stored path as string (not file), accept under either 'attachment' or 'upload'
	const stringUpload = typeof body.upload === 'string' ? body.upload : (typeof body.attachment === 'string' ? body.attachment : null);
	if (!updateData.attachment && stringUpload && stringUpload.trim() !== '') {
		updateData.attachment = normalizeStoredPath(stringUpload.trim()) || stringUpload.trim();
	}
	// mirror to `upload` field which is the actual column name used in the model
	if (updateData.attachment && !updateData.upload) updateData.upload = updateData.attachment;

	await billingModel.updateVehicleMtnBilling(id, updateData);

	// Emit Socket.IO events if status changed to processed/invoiced
	try {
		const statusChanged = updateData.inv_stat && ['invoiced', 'paid', 'processed'].includes(String(updateData.inv_stat).toLowerCase());
		if (statusChanged) {
			const io = getSocketIOInstance();
			if (io) {
				try {
					const unseenCount = await maintenanceModel.getUnseenBillsCount();
					const maintenanceCount = await maintenanceModel.getVehicleMtnRequests();
					const maintenanceCountNum = Array.isArray(maintenanceCount) ? maintenanceCount.length : 0;

					// Emit updated counts
					io.emit('mtn:counts', {
						maintenanceBilling: maintenanceCountNum,
						unseenBills: unseenCount
					});
				} catch (countErr) {
					console.warn('Failed to emit mtn:counts after billing update:', countErr);
				}
			}
		}
	} catch (socketErr) {
		console.warn('Failed to emit Socket.IO event on billing update:', socketErr);
	}

	res.json({ message: 'Vehicle maintenance billing updated successfully', status: 'success' });
};

export const deleteVehicleMtnBilling = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteVehicleMtnBilling(id);
	res.json({ message: 'Billing deleted successfully', status: 'success' });
};

export const getVehicleMtnBillingByDate = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ message: 'Both from and to dates are required', status: 'error' });
	}
	const vehicleMtn = await billingModel.getVehicleMtnBillingByDate(from as string, to as string);
	// Use assetModel.getAssets() instead of billingModel.getTempVehicleRecords() (DB schema changed)
	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const locations = await assetsModel.getLocations() as any[];
	const workshops = await billingModel.getWorkshops();
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
			asset: assetMap.has(asset_id) ? {
				asset_id: asset_id,
				fuel_type: (assetMap.get(asset_id))?.fuel_type || (assetMap.get(asset_id))?.vfuel_type || null,
				purchase_date: (assetMap.get(asset_id))?.purchase_date || (assetMap.get(asset_id))?.v_dop || null,
				register_number: (assetMap.get(asset_id))?.register_number || (assetMap.get(asset_id))?.vehicle_regno || null,
				transmission: (assetMap.get(asset_id))?.transmission || (assetMap.get(asset_id))?.vtrans_type || null
			} : null,
			costcenter: ccMap.has(b.costcenter_id) ? {
				id: b.costcenter_id,
				name: (ccMap.get(b.costcenter_id))?.name
			} : null,
			inv_date: b.inv_date,
			inv_id: b.inv_id,
			inv_no: b.inv_no,
			inv_remarks: b.inv_remarks,
			inv_stat: b.inv_stat,
			inv_total: b.inv_total,
			location: locationMap.has(b.location_id) ? {
				id: b.location_id,
				name: (locationMap.get(b.location_id))?.code
			} : null,
			running_no: b.running_no,
			svc_date: b.svc_date,
			svc_odo: b.svc_odo,
			svc_order: b.svc_order,
			workshop: wsMap.has(b.ws_id) ? {
				id: b.ws_id,
				name: (wsMap.get(b.ws_id))?.ws_name
			} : null
		};
	});
	res.json({ data: filtered, message: 'Vehicle maintenance by date range retrieved successfully', status: 'success' });
};

// Check if an invoice number already exists for maintenance billings.
// Query params: inv_no (required), exclude_id (optional, numeric) to ignore a specific record (useful during edit)
export const checkVehicleMtnInvNo = async (req: Request, res: Response) => {
	const inv_no = (req.query.inv_no || '').toString().trim();
	if (!inv_no) return res.status(400).json({ message: 'inv_no is required', status: 'error' });
	const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : undefined;
	const billId = req.query.bill_id ? Number(req.query.bill_id) : undefined;
	const count = await billingModel.countVehicleMtnByInvNo(inv_no, excludeId, billId);
 	if (count > 0) return res.json({ exists: true, message: 'inv_no already exists', status: 'exists' });
 	return res.json({ exists: false, message: 'inv_no available', status: 'ok' });
};

// Check if a utility bill number already exists (ubill_no)
export const checkUtilityUbillNo = async (req: Request, res: Response) => {
	const ubill_no = (req.query.ubill_no || '').toString().trim();
	if (!ubill_no) return res.status(400).json({ message: 'ubill_no is required', status: 'error' });
	const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : undefined;
	const billId = req.query.bill_id ? Number(req.query.bill_id) : undefined;
	const count = await billingModel.countUtilityByUbillNo(ubill_no, excludeId, billId);
	if (count > 0) return res.json({ exists: true, message: 'ubill_no already exists', status: 'exists' });
	return res.json({ exists: false, message: 'ubill_no available', status: 'ok' });
};

//Purposely to export maintenance consumption report data to Excel
export const getVehicleMtnBillingByVehicleSummary = async (req: Request, res: Response) => {
	const { cc, from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ message: 'Both from and to dates are required', status: 'error' });
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
	const assetMap = new Map((assets).flatMap((a: any) => {
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
			owner = { name: empObj.full_name, ramco_id: empObj.ramco_id };
		}

		if (!summary[asset_id]) {
			const vehicleObj = asset_id && assetMap.has(asset_id) ? assetMap.get(asset_id) as any : null;
			const ccId = (maintenance as any).cc_id ?? maintenance.costcenter_id;
			const ccObj = ccId && ccMap.has(ccId) ? ccMap.get(ccId) : null;
			const locId = (maintenance as any).location_id ?? (maintenance as any).loc_id;
			const locationObj = locId && locationMap.has(locId) ? locationMap.get(locId) : null;
			summary[asset_id] = {
				_yearMap: {}, // temp for grouping by year
				age: vehicleObj ? (vehicleObj.purchase_date ? dayjs().diff(dayjs(vehicleObj.purchase_date), 'year') : (vehicleObj.v_dop ? dayjs().diff(dayjs(vehicleObj.v_dop), 'year') : null)) : null,
				asset: asset_id,
				brand,
				category,
				classification: vehicleObj ? (vehicleObj.classification || null) : null,
				costcenter: ccObj ? { id: ccId, name: ccObj.name } : null,
				fuel: vehicleObj ? (vehicleObj.fuel_type || vehicleObj.vfuel_type || null) : null,
				location: locationObj ? { code: locationObj.code ?? locationObj.name, id: locId } : null,
				model,
				owner,
				purchase_date: vehicleObj?.purchase_date ? dayjs(vehicleObj.purchase_date).format('DD/MM/YYYY') : (vehicleObj?.v_dop ? dayjs(vehicleObj.v_dop).format('DD/MM/YYYY') : null),
				record_status: vehicleObj ? (vehicleObj.record_status || null) : null,
				total_amount: 0,
				total_maintenance: 0,
				transmission: vehicleObj ? (vehicleObj.transmission || vehicleObj.vtrans_type || null) : null,
				vehicle: vehicleObj ? (vehicleObj.register_number || vehicleObj.vehicle_regno || null) : null
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
			amount: maintenance.inv_total,
			inv_date: maintenance.inv_date,
			inv_id: maintenance.inv_id,
			inv_no: maintenance.inv_no,
			svc_date: maintenance.svc_date,
			svc_odo: maintenance.svc_odo,
			svc_order: maintenance.svc_order
		});
	}
	// Format output
	const result = Object.values(summary).map((asset: any) => {
		const details = Object.entries(asset._yearMap).map(([year, data]: [string, any]) => ({
			expenses: data.expenses.toFixed(2),
			maintenance: data.maintenance,
			year: Number(year)
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
		data: result,
		message: `Vehicle maintenance summary from date range ${from} to ${to} retrieved successfully with a total entries: ` + result.length,
		status: 'success',
	});
};


/* ================ WORKSHOP ==================== */

export const getWorkshops = async (req: Request, res: Response) => {
	const workshops = await billingModel.getWorkshops();
	res.json({ data: workshops, message: 'Workshops retrieved successfully', status: 'success' });
};

export const getWorkshopById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const workshop = await billingModel.getWorkshopById(id);
	if (!workshop) {
		return res.status(404).json({ message: 'Workshop not found', status: 'error' });
	}
	res.json({ data: workshop, message: 'Workshop retrieved successfully', status: 'success' });
};

export const createWorkshop = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createWorkshop(req.body);
		res.status(201).json({ id: insertId, message: 'Workshop created successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to create workshop', status: 'error' });
	}
};

export const updateWorkshop = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateWorkshop(id, req.body);
		res.json({ message: 'Workshop updated successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to update workshop', status: 'error' });
	}
};

export const deleteWorkshop = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.deleteWorkshop(id);
		res.json({ message: 'Workshop deleted successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to delete workshop', status: 'error' });
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
					vendor = { id: bill.stmt_issuer, logo, name };
				}
			}
			// Remove fuel_id and stmt_issuer from the result
			const { fuel_id, stmt_issuer, ...rest } = bill;
			return { ...rest, vendor };
		})
	);
	res.json({ data, message: 'Fuel billing retrieved successfully', status: 'success' });
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
	const assetMap = new Map((assets).flatMap((v: any) => {
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
		return res.status(404).json({ message: 'Fuel billing not found', status: 'error' });
	}

	// Map fuel_issuer using stmt_issuer (not fuel_id)
	let fuel_vendor = null;
	if (fuelBilling.stmt_issuer) {
		const fv = await billingModel.getFuelVendorById(fuelBilling.stmt_issuer);
		if (fv) {
			const name = fv.name;
			const logo = fv.logo ? `${process.env.BACKEND_URL}/${fv.logo}` : null;
			fuel_vendor = { id: fuelBilling.stmt_issuer, logo, vendor: name };
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
				costcenter: assetData.costcenter_id && ccMap.has(assetData.costcenter_id)
					? ccMap.get(assetData.costcenter_id)
					: null,
				fuel_type: assetData.fuel_type,
				id: assetData.id,
				purpose: assetData.purpose || null,
				register_number: assetData.register_number,
			};
		}

		return {
			amount: d.amount,
			asset,
			category: fleetCard ? fleetCard.category : null,
			end_odo: d.end_odo,
			fleetcard: fleetCard ? { card_no: fleetCard.card_no, id: fleetCard.id } : null,
			s_id: d.s_id,
			start_odo: d.start_odo,
			stmt_date: d.stmt_date,
			stmt_id: d.stmt_id,
			total_km: d.total_km,
			total_litre: d.total_litre
		};
	});

	// Build costcenter summary grouped by costcenter and purpose
	const costcenterSummaryMap = new Map<string, number>();

	details.forEach((detail: any) => {
		if (detail.asset?.costcenter) {
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
	res.json({ data: { ...rest, costcenter_summ, details, fuel_vendor }, message: msg, status: 'success' });
};

// Get fuel consumption records and summary for a specific vehicle (asset_id)
export const getFuelConsumptionByVehicle = async (req: Request, res: Response) => {
	const vehicleId = Number(req.params.asset_id || req.params.id);
	if (!vehicleId || isNaN(vehicleId)) {
		return res.status(400).json({ message: 'Invalid vehicle id', status: 'error' });
	}

	// Fetch fuel detail rows for the vehicle
	const rows = await billingModel.getFuelVehicleAmountByVehicleId(vehicleId);

	// Try to resolve register_number from assetModel (asset id -> register_number)
	let registerNumber: null | string = null;
	try {
		const asset = await assetsModel.getAssetById(vehicleId);
		if (asset.register_number) registerNumber = asset.register_number;
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
			amount: r.amount,
			card_id: r.card_id,
			costcenter_id: r.costcenter_id,
			effct: r.effct,
			end_odo: r.end_odo,
			purpose: r.purpose,
			s_id: r.s_id,
			start_odo: r.start_odo,
			stmt_date: r.stmt_date,
			stmt_id: r.stmt_id,
			stmt_no: r.stmt_no,
			total_km: r.total_km,
			total_litre: r.total_litre,
			vehicle_id: r.vehicle_id
		};
	});

	const avgEfficiency = countEff > 0 ? (rows.reduce((acc: number, r: any) => acc + parseFloat(r.effct || r.efficiency || '0'), 0) / countEff) : null;

	res.json({
		data: {
			average_efficiency: avgEfficiency ? Number(avgEfficiency.toFixed(2)) : null,
			records,
			register_number: registerNumber || ((rows && rows.length > 0) ? (rows[0]).register_number : null),
			total_amount: totalAmount.toFixed(2),
			total_km: totalKm.toFixed(2),
			total_litre: totalLitre.toFixed(2),
			vehicle_id: vehicleId
		},
		message: `Fuel consumption for vehicle ${vehicleId} retrieved successfully`,
		status: 'success'
	});
};

// Get maintenance records and summary for a specific vehicle (asset_id)
export const getVehicleMaintenanceByAsset = async (req: Request, res: Response) => {
	const assetId = Number(req.params.asset_id || req.params.id);
	if (!assetId || isNaN(assetId)) {
		return res.status(400).json({ message: 'Invalid vehicle id', status: 'error' });
	}

	const rows = await billingModel.getVehicleMtnBillingByAssetId(assetId);

	// Try to resolve register_number from assetModel
	let registerNumber: null | string = null;
	try {
		const asset = await assetsModel.getAssetById(assetId);
		if (asset.register_number) registerNumber = asset.register_number;
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
			inv_date: r.inv_date,
			inv_id: r.inv_id,
			inv_no: r.inv_no,
			inv_remarks: r.inv_remarks,
			inv_stat: r.inv_stat,
			inv_total: r.inv_total,
			odometer: r.svc_odo,
			req_id: r.svc_order,
			svc_date: r.svc_date
		};
	});

	const regNoForMsg = registerNumber || ((rows && rows.length > 0) ? (rows[0] as any).register_number : null);
	res.json({
		data: {
			id: assetId,
			records,
			register_number: regNoForMsg,
			total_amount: totalAmount.toFixed(2),
			total_maintenance: totalMaintenance
		},
		message: `Vehicle maintenance for vehicle by asset ID: ${assetId}${regNoForMsg ? ' (' + regNoForMsg + ')' : ''} retrieved successfully`,
		status: 'success'
	});
};


export const createFuelBilling = async (req: Request, res: Response) => {
	try {
		// Map frontend payload to backend model
		const { details, diesel_amount, petrol_amount, stmt_count, stmt_date, stmt_diesel, stmt_disc, stmt_issuer, stmt_litre, stmt_no, stmt_ron95, stmt_ron97, stmt_stotal, stmt_total, stmt_total_km } = req.body;

		// Convert stmt_issuer to number (fuel_id)
		const fuel_id = Number(stmt_issuer);

		// Prepare payload for model
		const payload = {
			details: Array.isArray(details) ? details.map((d: any) => ({
				amount: d.amount,
				asset_id: d.asset_id,
				card_id: d.card_id,
				category: d.category,
				cc_id: d.cc_id,
				costcenter_id: d.costcenter_id,
				efficiency: d.efficiency,
				end_odo: d.end_odo,
				entry_code: d.entry_code || null, // entry_code is not used currently
				loc_id: d.loc_id,
				location_id: d.location_id || null, // location_id is not used currently
				start_odo: d.start_odo,
				stmt_date: d.stmt_date,
				total_km: d.total_km,
				total_litre: d.total_litre,
				vehicle_id: d.vehicle_id
			})) : [],
			diesel_amount,
			petrol_amount,
			stmt_count,
			stmt_date,
			stmt_diesel,
			stmt_disc,
			stmt_issuer: fuel_id,
			stmt_litre,
			stmt_no,
			stmt_ron95,
			stmt_ron97,
			stmt_stotal,
			stmt_total,
			stmt_total_km
		};

		// Insert parent record
		const insertId = await billingModel.createFuelBilling(payload);

		// Insert child detail records using createFuelVehicleAmount
		if (Array.isArray(payload.details)) {
			for (const detail of payload.details) {
				await billingModel.createFuelVehicleAmount({
					amount: detail.amount,
					asset_id: detail.asset_id,
					card_id: detail.card_id,
					category: detail.category,
					costcenter_id: detail.costcenter_id,
					efficiency: detail.efficiency,
					end_odo: detail.end_odo,
					entry_code: detail.entry_code,
					location_id: detail.location_id,
					start_odo: detail.start_odo,
					stmt_date: detail.stmt_date,
					stmt_id: insertId,
					total_km: detail.total_km,
					total_litre: detail.total_litre,
					vehicle_id: detail.vehicle_id
				});
			}
		}
		res.status(201).json({ id: insertId, message: 'Fuel billing created successfully', status: 'success' });
	} catch (error) {
		// Check if it's a duplicate entry error
		if (error instanceof Error && error.message.includes('already exists')) {
			res.status(409).json({ message: error.message, status: 'error' });
		} else {
			res.status(500).json({ error, message: error instanceof Error ? error.message : 'Failed to create fuel billing', status: 'error' });
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
						amount: detail.amount,
						asset_id: detail.asset_id,
						card_id: detail.card_id,
						category: detail.category,
						costcenter_id: detail.costcenter_id,
						efficiency: detail.efficiency,
						end_odo: detail.end_odo,
						entry_code: detail.entry_code || null,
						start_odo: detail.start_odo,
						stmt_date: detail.stmt_date,
						stmt_id: id,
						total_km: detail.total_km,
						total_litre: detail.total_litre,
						vehicle_id: detail.vehicle_id
					});
				} else {
					// Insert new row
					await billingModel.createFuelVehicleAmount({
						amount: detail.amount,
						asset_id: detail.asset_id,
						card_id: detail.card_id,
						category: detail.category,
						costcenter_id: detail.costcenter_id,
						efficiency: detail.efficiency,
						end_odo: detail.end_odo,
						entry_code: detail.entry_code || null,
						start_odo: detail.start_odo,
						stmt_date: detail.stmt_date,
						stmt_id: id,
						total_km: detail.total_km,
						total_litre: detail.total_litre,
						vehicle_id: detail.vehicle_id
					});
				}
			}
		}
		res.json({ message: 'Fuel billing updated successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to update fuel billing', status: 'error' });
	}
};

// Delete a fuel billing statement and its detail rows
export const deleteFuelBilling = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		if (!Number.isFinite(id) || id <= 0) {
			return res.status(400).json({ data: null, message: 'Invalid fuel statement id', status: 'error' });
		}
		// Optional: ensure exists
		const existing = await billingModel.getFuelBillingById(id);
		if (!existing) {
			return res.status(404).json({ data: null, message: 'Fuel billing not found', status: 'error' });
		}
		// Delete details first, then parent
		await billingModel.deleteFuelVehicleAmount(id);
		await billingModel.deleteFuelBilling(id);
		return res.json({ data: { stmt_id: id }, message: 'Fuel billing deleted successfully', status: 'success' });
	} catch (error: any) {
		return res.status(500).json({ data: null, message: error?.message || 'Failed to delete fuel billing', status: 'error' });
	}
};

//Purposely to export fuel consumption report data to Excel
export const getFuelBillingVehicleSummary = async (req: Request, res: Response) => {
	const { cc, from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ message: 'Both from and to dates are required', status: 'error' });
	}
	// Fetch all lookup data
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
	const assetsArr = assets;
	const assetMap = new Map<any, any>();
	for (const a of assetsArr) {
		if (a?.asset_id !== undefined && a.asset_id !== null) {
			assetMap.set(a.asset_id, a);
			assetMap.set(String(a.asset_id), a);
		}
		if (a?.id !== undefined && a.id !== null) {
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

	// Parse cost center filter - support comma-separated cost center IDs
	let costcenterIds: number[] = [];
	if (cc) {
		// Support comma-separated cost center IDs
		const ccIds = (cc as string).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		costcenterIds = ccIds;
	}

	// Fetch all vehicle amount detail rows within date range (primary source for amount and usage)
	const detailsInRange = await billingModel.getFuelVehicleAmountByDateRange(from as string, to as string);
	// Group by asset_id
	const summary: Record<string, any> = {};
	for (const d of (Array.isArray(detailsInRange) ? detailsInRange : [])) {
		// If cost center filter is provided, skip if not matching
		const ccId = d.cc_id ?? d.costcenter_id;
		if (costcenterIds.length > 0 && !costcenterIds.includes(ccId)) continue;
		const asset_id = d.asset_id;
		// Resolve category, brand, and model objects using asset mapping
		let category = null;
		let brand = null;
		let model = null;
		let categoryId = d.category;
		let brandId: any = null;
		let modelId: any = null;
		let ramcoId: any = null;
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
			owner = { name: empObj.full_name, ramco_id: empObj.ramco_id };
		}

		if (!summary[asset_id]) {
			const vehicleObj = asset_id && assetMap.has(asset_id) ? assetMap.get(asset_id) : null;
			const ccObj = ccId && ccMap.has(ccId) ? ccMap.get(ccId) : null;
			const locId = d.location_id ?? d.loc_id;
			const locationObj = locId && locationMap.has(locId) ? locationMap.get(locId) : null;
			summary[asset_id] = {
				_yearMap: {}, // temp for grouping by year
				age: vehicleObj ? (vehicleObj.purchase_date ? dayjs().diff(dayjs(vehicleObj.purchase_date), 'year') : (vehicleObj.v_dop ? dayjs().diff(dayjs(vehicleObj.v_dop), 'year') : null)) : null,
				asset_id: asset_id,
				brand,
				category,
				classification: vehicleObj ? (vehicleObj.classification || null) : null,
				costcenter: ccObj ? { id: ccId, name: ccObj.name } : null,
				fuel: vehicleObj ? (vehicleObj.fuel_type || vehicleObj.vfuel_type || null) : null,
				location: locationObj ? { id: locId, name: locationObj.name ?? locationObj.code } : null,
				model,
				owner,
				purchase_date: vehicleObj?.purchase_date ? dayjs(vehicleObj.purchase_date).format('DD/MM/YYYY') : (vehicleObj?.v_dop ? dayjs(vehicleObj.v_dop).format('DD/MM/YYYY') : null),
				record_status: vehicleObj ? (vehicleObj.record_status || null) : null,
				total_amount: 0,
				total_litre: 0,
				transmission: vehicleObj ? (vehicleObj.transmission || vehicleObj.vtrans_type || null) : null,
				vehicle: vehicleObj ? (vehicleObj.register_number || null) : null
			};
		}
		summary[asset_id].total_litre += parseFloat(d.total_litre || '0');
		summary[asset_id].total_amount += parseFloat(d.amount || '0');
		// Group by detail row stmt_date (primary date source)
		const detailDate = d.stmt_date;
		const year = detailDate ? dayjs(detailDate).year() : null;
		if (year !== null) {
			if (!summary[asset_id]._yearMap[year]) {
				summary[asset_id]._yearMap[year] = { monthlyMap: {}, total_annual: 0 };
			}
			const amountNum = parseFloat(d.amount || '0');
			summary[asset_id]._yearMap[year].total_annual += amountNum;
			const monthNum = dayjs(detailDate).month() + 1;
			const monthName = dayjs(detailDate).format('MMMM');
			const existing = summary[asset_id]._yearMap[year].monthlyMap[monthNum];
			if (!existing) {
				summary[asset_id]._yearMap[year].monthlyMap[monthNum] = {
					amount: parseFloat(d.amount || '0'),
					month: monthName,
					s_id: d.s_id,
					stmt_date: detailDate ? dayjs(detailDate).format('YYYY-MM-DD') : null,
					stmt_id: d.stmt_id,
					total_litre: parseFloat(d.total_litre || '0')
				};
			} else {
				// Merge into single monthly entry: sum totals, keep latest stmt info
				existing.total_litre = parseFloat(String(existing.total_litre)) + parseFloat(d.total_litre || '0');
				existing.amount = parseFloat(String(existing.amount)) + parseFloat(d.amount || '0');
				// Prefer the later date within the month
				const existingDate = existing.stmt_date ? dayjs(existing.stmt_date) : null;
				const thisDate = detailDate ? dayjs(detailDate) : null;
				if (!existingDate || (thisDate && thisDate.isAfter(existingDate))) {
					existing.stmt_date = thisDate ? thisDate.format('YYYY-MM-DD') : existing.stmt_date;
					existing.stmt_id = d.stmt_id;
					existing.s_id = d.s_id;
				}
			}
		}
	}
	// Format output
	const result = Object.values(summary).map((asset: any) => {
		const details = Object.entries(asset._yearMap).map(([year, data]: [string, any]) => {
			// Convert monthlyMap to sorted array (descending month)
			const monthNums = Object.keys(data.monthlyMap).map(n => Number(n)).sort((a, b) => b - a);
			const monthly_expenses = monthNums.map((mn) => {
				const m = data.monthlyMap[mn];
				return {
					amount: typeof m.amount === 'number' ? m.amount.toFixed(2) : m.amount,
					month: m.month,
					s_id: m.s_id,
					stmt_date: m.stmt_date,
					stmt_id: m.stmt_id,
					total_litre: typeof m.total_litre === 'number' ? m.total_litre.toFixed(2) : m.total_litre
				};
			});
			return {
				monthly_expenses,
				total_annual: (data.total_annual || data.total_annual === 0) ? Number(data.total_annual).toFixed(2) : '0.00',
				year: Number(year)
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
		data: result,
		message: `Fuel billing summary from ${from} to ${to} retrieved successfully with ${result.length} entries`,
		status: 'success',
	});
};


// Costcenter-based fuel billing summary grouped by year - Export to Excel
export const getFuelBillingCostcenterSummary = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ message: 'Both from and to dates are required', status: 'error' });
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
				summary[ccName] = { _yearMap: {}, costcenter: ccName };
			}
			// Group by year and month
			const date = dayjs(bill.stmt_date);
			const year = date.year();
			const month = date.month() + 1; // 1-based month
			if (!summary[ccName]._yearMap[year]) {
				summary[ccName]._yearMap[year] = { _monthMap: {}, expenses: 0 };
			}
			if (!summary[ccName]._yearMap[year]._monthMap[month]) {
				summary[ccName]._yearMap[year]._monthMap[month] = { expenses: 0, fuel: [] };
			}
			const amount = parseFloat(d.amount || '0');
			summary[ccName]._yearMap[year].expenses += amount;
			summary[ccName]._yearMap[year]._monthMap[month].expenses += amount;
			summary[ccName]._yearMap[year]._monthMap[month].fuel.push({
				amount: d.amount,
				s_id: d.s_id,
				total_litre: d.total_litre
			});
		}
	}
	// Format output and sort by costcenter name
	const result = Object.values(summary)
		.map((cc: any) => {
			const details = Object.entries(cc._yearMap).map(([year, yearData]: [string, any]) => {
				const months = Object.entries(yearData._monthMap).map(([month, monthData]: [string, any]) => ({
					expenses: monthData.expenses.toFixed(2),
					month: Number(month),
					//fuel: monthData.fuel
				}));
				return {
					expenses: yearData.expenses.toFixed(2),
					months,
					year: Number(year)
				};
			});
			const { _yearMap, ...rest } = cc;
			return { ...rest, details };
		})
		.sort((a: any, b: any) => String(a.costcenter).localeCompare(String(b.costcenter)));
	res.json({
		data: result,
		message: 'Fuel billing costcenter summary by date range retrieved successfully',
		status: 'success'
	});
};

/* ============ FUEL ISSUER ================ */

export const getFuelVendors = async (req: Request, res: Response) => {
	const fuelVendors = await billingModel.getFuelVendor();
	const baseUrl = process.env.BACKEND_URL || '';
	const vendorsWithUrls = (fuelVendors || []).map((v: any) => ({
		...v,
		image2: v.image2 ? `${baseUrl.replace(/\/$/, '')}/${String(v.image2).replace(/^\//, '')}` : v.image2,
		logo: v.logo ? `${baseUrl.replace(/\/$/, '')}/${v.logo.replace(/^\//, '')}` : v.logo
	}));
	res.json({ data: vendorsWithUrls, message: 'Fuel vendors retrieved successfully', status: 'success' });
};

// Insert a new minimal fuel statement detail row for a given statement
// POST /api/bills/fuel/:stmt_id/new-bill-entry
// Payload: { stmt_id, card_id, asset_id, cc_id, loc_id, purpose, stmt_date }
export const createFuelNewBillEntry = async (req: Request, res: Response) => {
	try {
		const stmtIdParam = Number(req.params.stmt_id || req.params.id);
		const body = req.body || {};
		const stmt_id = Number.isFinite(stmtIdParam) ? stmtIdParam : Number(body.stmt_id);
		const card_id = Number(body.card_id);
		const asset_id = Number(body.asset_id);
		const cc_id = Number(body.cc_id);
		const loc_id = Number(body.loc_id);
		const purpose = typeof body.purpose === 'string' ? String(body.purpose) : null;
		const stmt_date = typeof body.stmt_date === 'string' ? String(body.stmt_date).slice(0,10) : null;

		if (!Number.isFinite(stmt_id) || stmt_id <= 0) return res.status(400).json({ data: null, message: 'Invalid stmt_id', status: 'error' });
		if (!Number.isFinite(card_id) || card_id <= 0) return res.status(400).json({ data: null, message: 'card_id is required', status: 'error' });
		if (!Number.isFinite(asset_id) || asset_id <= 0) return res.status(400).json({ data: null, message: 'asset_id is required', status: 'error' });
		if (!Number.isFinite(cc_id) || cc_id <= 0) return res.status(400).json({ data: null, message: 'cc_id is required', status: 'error' });
		if (!Number.isFinite(loc_id) || loc_id <= 0) return res.status(400).json({ data: null, message: 'loc_id is required', status: 'error' });
		if (!purpose) return res.status(400).json({ data: null, message: 'purpose is required', status: 'error' });
		if (!stmt_date) return res.status(400).json({ data: null, message: 'stmt_date is required', status: 'error' });

		// Reuse model function with minimal fields; leave others null
		const insertId = await billingModel.createFuelVehicleAmount({
			amount: null,
			asset_id,
			card_id,
			category: purpose,
			costcenter_id: cc_id,
			efficiency: null,
			end_odo: null,
			entry_code: null,
			location_id: loc_id,
			start_odo: null,
			stmt_date,
			stmt_id,
			total_km: null,
			total_litre: null,
			vehicle_id: null
		});

		return res.status(201).json({ data: { s_id: insertId }, message: 'Fuel bill entry created', status: 'success' });
	} catch (err: any) {
		return res.status(500).json({ data: null, message: err?.message || 'Failed to create fuel bill entry', status: 'error' });
	}
}

export const getFuelVendorById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const fuelVendor = await billingModel.getFuelVendorById(id);
	if (!fuelVendor) {
		return res.status(404).json({ message: 'Fuel vendor not found', status: 'error' });
	}
	const baseUrl = process.env.BACKEND_URL || '';
	const vendorWithUrl = {
		...fuelVendor,
		image2: fuelVendor.image2 ? `${baseUrl.replace(/\/$/, '')}/${String(fuelVendor.image2).replace(/^\//, '')}` : fuelVendor.image2,
		logo: fuelVendor.logo ? `${baseUrl.replace(/\/$/, '')}/${String(fuelVendor.logo).replace(/^\//, '')}` : fuelVendor.logo
	};
	res.json({ data: vendorWithUrl, message: 'Fuel vendor retrieved successfully', status: 'success' });
};

export const createFuelVendor = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createFuelVendor(req.body);
		res.status(201).json({ id: insertId, message: 'Fuel vendor created successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to create fuel vendor', status: 'error' });
	}
};

export const updateFuelVendor = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateFuelVendor(id, req.body);
		res.json({ message: 'Fuel vendor updated successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to update fuel vendor', status: 'error' });
	}
};

// Delete a single fuel detail row by s_id
export const removeFuelBillEntry = async (req: Request, res: Response) => {
	try {
		// URL carries stmt_id, body carries s_id (fallback to query for clients that can't send DELETE bodies)
		const stmt_id = Number(req.params.id || (req.params as any).stmt_id);
		const bodySid = (req.body && (req.body.s_id ?? (req.body.sid ?? req.body.id)));
		const querySid = (req.query && ((req.query as any).s_id ?? (req.query as any).sid));
		const s_id = Number(bodySid !== undefined ? bodySid : querySid);

		if (!Number.isFinite(stmt_id) || stmt_id <= 0) {
			return res.status(400).json({ data: null, message: 'Invalid stmt_id', status: 'error' });
		}
		if (!Number.isFinite(s_id) || s_id <= 0) {
			return res.status(400).json({ data: null, message: 's_id is required', status: 'error' });
		}

		await billingModel.deleteFuelVehicleAmountByStmtAndSid(stmt_id, s_id);
		return res.json({ data: { s_id, stmt_id }, message: 'Bill entry removed', status: 'success' });
	} catch (error: any) {
		return res.status(500).json({ data: null, message: error?.message || 'Failed to remove bill entry', status: 'error' });
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
				return res.status(400).json({ message: 'vendor must be a valid number', status: 'error' });
			}
			const fleetCards = await billingModel.getFleetCardsByVendor(vendorId);
			// Keep existing enrichment logic but limited to returned cards
			const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
			const fuelVendors = await billingModel.getFuelVendor();
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
						costcenter: assetObj.costcenter_id && costcenterMap.has(assetObj.costcenter_id)
							? { id: assetObj.costcenter_id, name: costcenterMap.get(assetObj.costcenter_id).name }
							: null,
						entry_code: assetObj.entry_code || null,
						fuel_type: assetObj.fuel_type || assetObj.vfuel_type,
						id: card.asset_id,
						locations: (() => {
							const locId = assetObj.location_id ?? assetObj.location?.id ?? assetObj.locationId ?? null;
							if (!locId) return null;
							const found = locations.find((loc: any) => loc.id === locId);
							return found ? { code: found.code, id: locId } : null;
						})(),
						purpose: assetObj.purpose || null,
						register_number: assetObj.register_number || assetObj.vehicle_regno,
						vehicle_id: assetObj.vehicle_id || null,
					};
				}

				return {
					asset,
					card_no: card.card_no,
					expiry: card.expiry_date,
					id: card.id,
					pin_no: card.pin,
					reg_date: card.reg_date,
					remarks: card.remarks,
					status: card.status,
					vehicle_id: card.vehicle_id,
					vendor
				};
			});

			// Resolve vendor name from fuelVendorMap using several possible fields
			const vendorObj = fuelVendorMap.get(vendorId);
			const vendorName = vendorObj ? (vendorObj.f_issuer || vendorObj.fuel_issuer || vendorObj.name || vendorObj.fuel_name || null) : null;
			// include length in message & vendor name (resolved vendor) in vendor:
			return res.json({ data, message: `Fleet cards retrieved successfully${vendorName ? ` (vendor: ${vendorName})` : ''} - Total: ${data.length}`, status: 'success' });
		}

		// No vendor filter - return all fleet cards with enrichment
		const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
		const fleetCards = await billingModel.getFleetCards();
		const fuelVendors = await billingModel.getFuelVendor();
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
					costcenter: assetObj.costcenter_id && costcenterMap.has(assetObj.costcenter_id)
						? { id: assetObj.costcenter_id, name: costcenterMap.get(assetObj.costcenter_id).name }
						: null,
					fuel_type: assetObj.fuel_type || assetObj.vfuel_type,
					id: card.asset_id,
					locations: (() => {
						const locId = assetObj.location_id ?? assetObj.location?.id ?? assetObj.locationId ?? null;
						if (!locId) return null;
						const found = locations.find((loc: any) => loc.id === locId);
						return found ? { code: found.code, id: locId } : null;
					})(),
					purpose: assetObj.purpose || null,
					register_number: assetObj.register_number || assetObj.vehicle_regno,
				};
			}

			return {
				asset,
				card_no: card.card_no,
				expiry: card.expiry_date,
				id: card.id,
				pin_no: card.pin,
				reg_date: card.reg_date,
				remarks: card.remarks,
				status: card.status,
				vehicle_id: card.vehicle_id,
				vendor
			};
		});

		res.json({ data, message: 'Fleet cards retrieved successfully', status: 'success' });
	} catch (err: any) {
		logger.error(err);
		res.status(500).json({ message: err.message || 'Failed to retrieve fleet cards', status: 'error' });
	}
};
export const getFleetCardById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!Number.isFinite(id)) {
		return res.status(400).json({ message: 'Invalid fleet card id', status: 'error' });
	}
	const fleetCard = await billingModel.getFleetCardById(id);
	if (!fleetCard) {
		return res.status(404).json({ message: 'Fleet card not found', status: 'error' });
	}

	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
	const fuelVendors = await billingModel.getFuelVendor();
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
			costcenter: assetMap.get(fleetCard.asset_id).costcenter_id && costcenterMap.has(assetMap.get(fleetCard.asset_id).costcenter_id)
				? { id: assetMap.get(fleetCard.asset_id).costcenter_id, name: costcenterMap.get(assetMap.get(fleetCard.asset_id).costcenter_id).name }
				: null,
			fuel_type: assetMap.get(fleetCard.asset_id).fuel_type || assetMap.get(fleetCard.asset_id).vfuel_type,
			id: fleetCard.asset_id,
			purpose: assetMap.get(fleetCard.asset_id).purpose || null,
			register_number: assetMap.get(fleetCard.asset_id).register_number || assetMap.get(fleetCard.asset_id).vehicle_regno
		}
		: null;

	const data = {
		asset,
		card_no: fleetCard.card_no,
		expiry: fleetCard.expiry_date,
		id: fleetCard.id,
		pin_no: fleetCard.pin,
		reg_date: fleetCard.reg_date,
		remarks: fleetCard.remarks,
		status: fleetCard.status,
		vendor
	};

	res.json({ data, message: 'Fleet card retrieved successfully', status: 'success' });
};

export const getFleetCardsByAssetId = async (req: Request, res: Response) => {
	const assetId = Number(req.params.asset_id);
	if (!assetId || isNaN(assetId)) {
		return res.status(400).json({ message: 'Invalid asset_id', status: 'error' });
	}
	const fleetCards = await billingModel.getFleetCardsByAssetId(assetId);
	const asset = await assetsModel.getAssetById(assetId) as any || null;
	const fuelVendors = await billingModel.getFuelVendor();
	const costcenters = await assetsModel.getCostcenters() as any[];

	const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	// Build asset summary
	const assetSummary = asset ? {
		costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
			? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id).name }
			: null,
		fuel_type: asset.fuel_type || asset.vfuel_type || null,
		id: asset.id,
		purpose: asset.purpose || null,
		register_number: asset.register_number || asset.vehicle_regno || null,
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
			card_no: card.card_no,
			expiry: card.expiry_date,
			id: card.id,
			pin_no: card.pin,
			reg_date: card.reg_date,
			remarks: card.remarks,
			status: card.status,
			vendor
		};
	});

	const data = [{ asset: assetSummary, cards }];
	res.json({ data, message: 'Fleet cards for asset retrieved successfully', status: 'success' });
};
export const createFleetCard = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createFleetCard(req.body);
		res.status(201).json({ id: insertId, message: 'Fleet card created successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to create fleet card', status: 'error' });
	}
};
export const updateFleetCard = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateFleetCard(id, req.body);
		res.json({ message: 'Fleet card updated successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to update fleet card', status: 'error' });
	}
}

function normalizeStoredPath(filePath?: null | string): null | string {
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
// Normalize an absolute or arbitrary saved file path into a relative DB-friendly path
// under 'uploads/...'. Removes configured UPLOAD_BASE_PATH, strips mount points
// like 'mnt/winshare', and ensures the returned path starts with 'uploads/'.
// Helper to produce a public URL from a stored path. Mirrors logic used when returning
// logos: strips mount segments and ensures path is under 'uploads/'.
function publicUrl(rawPath?: null | string): null | string {
	if (!rawPath) return null;
	const baseUrl = process.env.BACKEND_URL || '';
	let normalized = String(rawPath).replace(/\\/g, '/').replace(/^\/+/, '');
	normalized = normalized.replace(/(^|\/)mnt\/winshare\/?/ig, '');
	if (!normalized.startsWith('uploads/')) normalized = `uploads/${normalized.replace(/^\/+/, '')}`;
	return `${baseUrl.replace(/\/$/, '')}/${normalized.replace(/^\/+/, '')}`;
}
// Instantly update fleet card from billing
export const updateFleetCardFromBilling = async (req: Request, res: Response) => {
	try {
		await billingModel.updateFleetCardFromBilling(req.body);
		res.json({ message: 'Fleet card updated from billing successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: error instanceof Error ? error.message : 'Failed to update fleet card from billing', status: 'error' });
	}
};

export const getFleetCardByIssuer = async (req: Request, res: Response) => {
	const fuel_id = Number(req.params.id);
	if (!fuel_id) {
		return res.status(400).json({ message: 'fuel_id is required', status: 'error' });
	}

	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const assetMap = new Map(assets.map((asset: any) => [asset.vehicle_id, asset]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const fleetCards = await billingModel.getFleetCards();
	const fuelVendors = await billingModel.getFuelVendor();
	const fuelVendorMap = new Map(fuelVendors.map((fv: any) => [fv.id ?? fv.fuel_id, fv]));

	const data = fleetCards
		.filter((card: any) => card.fuel_id === fuel_id)
		.map((card: any) => {
			let asset = null;
			if (card.asset_id && assetMap.has(card.asset_id)) {
				const a = assetMap.get(card.asset_id);
				asset = {
					costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
						? costcenterMap.get(a.costcenter_id)
						: null,
					fuel_type: a.fuel_type,
					id: a.asset_id,
					old_id: a.vehicle_id,
					purpose: a.purpose || null,
					register_number: a.register_number
				};
			}

			let vendor = {};
			if (card.fuel_id && fuelVendorMap.has(card.fuel_id)) {
				const fv = fuelVendorMap.get(card.fuel_id);
				const name = fv.name || fv.f_issuer || fv.fuel_issuer || fv.fuel_name || null;
				vendor = { fuel_id: fv.id ?? fv.fuel_id, fuel_issuer: name };
			}

			return {
				//expiry: card.expiry_date,
				asset,
				card_no: card.card_no,
				id: card.id,
				//reg_date: card.reg_date,
				//category: card.category,
				//remarks: card.remarks,
				//pin_no: card.pin,
				status: card.status,
				vendor
			};
		});

	res.json({ data, message: 'Fleet cards by fuel vendor retrieved successfully', status: 'success' });
};

// Return all assets populated with their assigned fleet cards (uses fleet_asset join table)
export const getFleetCardsByAssets = async (req: Request, res: Response) => {
	const assets = Array.isArray(await assetsModel.getAssets()) ? await assetsModel.getAssets() : [];
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
			const arr = grouped.get(aid)!;
			arr.push(c);
		}
	}

	const costcenters = await assetsModel.getCostcenters() as any[];
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));

	const data = Array.from(grouped.keys()).map((aid: number) => {
		const a = assetMap.get(aid);
		const assetSummary = a ? {
			costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
			fuel_type: a.fuel_type || a.vfuel_type || null,
			id: a.id,
			purpose: a.purpose || null,
			register_number: a.register_number || a.vehicle_regno || null,
		} : null;

		const cardsForAsset = (grouped.get(aid) || []).map((card: any) => ({
			card_no: card.card_no,
			expiry: card.expiry_date,
			id: card.id,
			pin_no: card.pin,
			reg_date: card.reg_date,
			remarks: card.remarks,
			status: card.status,
			vehicle_id: card.vehicle_id
		}));

		return { asset: assetSummary, cards: cardsForAsset };
	});

	res.json({ data, message: 'Assets with fleet cards retrieved successfully', status: 'success' });
};
/* =================== SERVICE OPTION TABLE ========================== */

export const getServiceOptions = async (req: Request, res: Response) => {
	const serviceOptions = await billingModel.getServiceOptions();
	res.json({ data: serviceOptions, message: 'Service options retrieved successfully', status: 'success' });
};
export const getServiceOptionById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const serviceOption = await billingModel.getServiceOptionById(id);
	if (!serviceOption) {
		return res.status(404).json({ message: 'Service option not found', status: 'error' });
	}
	res.json({ data: serviceOption, message: 'Service option retrieved successfully', status: 'success' });
};
export const createServiceOption = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createServiceOption(req.body);
		res.status(201).json({ id: insertId, message: 'Service option created successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to create service option', status: 'error' });
	}
}
export const updateServiceOption = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateServiceOption(id, req.body);
		res.json({ message: 'Service option updated successfully', status: 'success' });
	} catch (error) {
		res.status(500).json({ error, message: 'Failed to update service option', status: 'error' });
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
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s).svcTypeId, s]));
	const enriched = (parts || []).map((p: any) => {
		const svc = svcMap.has(p.vtype_id) ? svcMap.get(p.vtype_id) : null;
		const part_category = svc ? { svcType: svc.svcType, svcTypeId: svc.svcTypeId } : null;
		const { vtype_id, ...rest } = p;
		return { ...rest, part_category };
	});

	res.json({
		data: enriched,
		message: 'Service parts retrieved successfully',
		meta: {
			page,
			pages: Math.ceil(total / per_page),
			per_page,
			total
		},
		status: 'success'
	});
};

export const getServicePartById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const part = await billingModel.getServicePartById(id);
	if (!part) return res.status(404).json({ message: 'Part not found', status: 'error' });
	const serviceOptions = await billingModel.getServiceOptions();
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s).svcTypeId, s]));
	const svc = svcMap.has(part.vtype_id) ? svcMap.get(part.vtype_id) : null;
	const part_category = svc ? { svcType: svc.svcType, svcTypeId: svc.svcTypeId } : null;
	const { vtype_id, ...rest } = part as any;
	const enriched = { ...rest, part_category };
	res.json({ data: enriched, message: 'Service part retrieved successfully', status: 'success' });
};

export const createServicePart = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createServicePart(req.body);
		res.status(201).json({ id: insertId, message: 'Service part created', status: 'success' });
	} catch (error) {
		logger.error('createServicePart error', error);
		res.status(500).json({ error, message: 'Failed to create service part', status: 'error' });
	}
};

export const updateServicePart = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateServicePart(id, req.body);
		res.json({ message: 'Service part updated', status: 'success' });
	} catch (error) {
		logger.error('updateServicePart error', error);
		res.status(500).json({ error, message: 'Failed to update service part', status: 'error' });
	}
};

export const deleteServicePart = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteServicePart(id);
	res.json({ message: 'Service part deleted', status: 'success' });
};

// Quick search for typeahead or global search
export const searchServiceParts = async (req: Request, res: Response) => {
	const q = String(req.query.q || '').trim();
	if (!q) return res.json({ data: [], message: 'No query provided', status: 'success' });
	const limit = Number(req.query.limit) || 10;
	const rows = await billingModel.searchServiceParts(q, limit);
	// attach minimal part_category
	const serviceOptions = await billingModel.getServiceOptions();
	const svcMap = new Map((serviceOptions || []).map((s: any) => [(s).svcTypeId, s]));
	const enriched = (rows || []).map((p: any) => {
		const svc = svcMap.has(p.vtype_id) ? svcMap.get(p.vtype_id) : null;
		const part_category = svc ? { svcType: svc.svcType, svcTypeId: svc.svcTypeId } : null;
		const { vtype_id, ...rest } = p;
		return { ...rest, part_category };
	});
	res.json({ data: enriched, message: 'Search results', status: 'success' });
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
		const owner = ownerObj ? { full_name: ownerObj.full_name, ramco_id: ownerObj.ramco_id } : null;

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
		const fleetcard = fleetCardObj ? { card_no: fleetCardObj.card_no, id: fleetCardObj.id } : null;

		// Map legacy and new asset fields to canonical fields used by the frontend
		const rest = { ...rec };
		const mapped = {
			...rest,
			asset_id: rest.asset_id || rest.vehicle_id || rest.id || null,
			brand,
			category,
			costcenter,
			department,
			fleetcard,
			fuel_type: rest.fuel_type || rest.vfuel_type || null,
			model,
			owner,
			purchase_date: rest.purchase_date || rest.v_dop || null,
			register_number: rest.register_number || rest.vehicle_regno || null,
			transmission: rest.transmission || rest.vtrans_type || null
		};
		// Remove legacy id fields to avoid duplication in response
		delete mapped.vehicle_id;
		delete mapped.vehicle_regno;
		delete mapped.vtrans_type;
		delete mapped.vfuel_type;
		delete mapped.v_dop;
		return mapped;
	});

	res.json({ data: enriched, message: 'Temp vehicle records retrieved successfully', status: 'success' });
};

export const getTempVehicleRecordById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const record = await billingModel.getTempVehicleRecordById(id);
	if (!record) {
		return res.status(404).json({ message: 'Temp vehicle record not found', status: 'error' });
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
	const owner = ownerObj ? { full_name: ownerObj.full_name, ramco_id: ownerObj.ramco_id } : null;

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
	const fleetcard = fleetCardObj ? { card_no: fleetCardObj.card_no, id: fleetCardObj.id } : null;

	const { brand_id, card_id, category_id, cc_id, dept_id, model_id, ramco_id, ...rest } = record;
	res.json({ data: { ...rest, brand, category, costcenter, department, fleetcard, model, owner }, message: 'Temp vehicle record retrieved successfully', status: 'success' });
};

export const createTempVehicleRecord = async (req: Request, res: Response) => {
	const payload = req.body;

	const insertId = await billingModel.createTempVehicleRecord(payload);
	res.status(201).json({ id: insertId, message: 'Temp vehicle record created successfully', status: 'success' });
};

export const updateTempVehicleRecord = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const payload = req.body;

	await billingModel.updateTempVehicleRecord(id, payload);
	res.json({ message: 'Temp vehicle record updated successfully', status: 'success' });
};

export const deleteTempVehicleRecord = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteTempVehicleRecord(id);
	res.json({ message: 'Temp vehicle record deleted successfully', status: 'success' });
};


// =================== UTILITIES TABLE CONTROLLER ===================
export const getUtilityBills = async (req: Request, res: Response) => {
	const { costcenter, from, service, to } = req.query;
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
				account: acc.account,
				beneficiary: benObj ? {
					entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
					entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null,
					id: benObj.id ?? benObj.bfcy_id,
					logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
					name: benObj.bfcy_name ?? benObj.name
				} : acc.provider,
				bill_id: acc.bill_id,
				desc: acc.bill_desc,
				service: acc.category
			};
		}
		// Build costcenter object. Prefer account-level costcenter if present.
		let costcenter = null;
		const acctCcId = account && (account as any).costcenter ? (account as any).costcenter.id : null;
		const ccLookupId = acctCcId ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId);
			costcenter = { id: cc.id, name: cc.name };
		}
		// Only include required fields
		// Build location object. Prefer account-level location if present.
		let location = null;
		const acctLocId = account && (account as any).location ? (account as any).location.id : null;
		const locLookupId = acctLocId ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId);
			location = { id: d.id, name: d.name };
		}

		// Ensure account object contains costcenter & location for callers that expect them there
		if (account) {
			(account as any).costcenter = costcenter;
			(account as any).location = location;
		}

		return {
			account,
			ubill_bw: bill.ubill_bw,
			ubill_color: bill.ubill_color,
			ubill_count: bill.ubill_count,
			//costcenter,
			//location,
			ubill_date: bill.ubill_date,
			ubill_deduct: bill.ubill_deduct,
			ubill_disc: bill.ubill_disc,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_no: bill.ubill_no,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_round: bill.ubill_round,
			ubill_stotal: bill.ubill_stotal,
			ubill_submit: bill.ubill_submit ?? null,
			ubill_tax: bill.ubill_tax,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_usage: bill.ubill_usage,
			util_id: bill.util_id
		};
	});

	// Filter by service if provided
	let final = filtered;
	if (service) {
		final = filtered.filter((item: any) => item.account?.service && String(item.account.service).toLowerCase().includes(String(service).toLowerCase()));
	}

	res.json({ data: final, message: 'Utility bills retrieved successfully', status: 'success' });
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
					account: acc.account,
					bill_id: acc.bill_id,
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
				const cc = ccMap.get(ccLookupId);
				costcenter = { id: cc.id, name: cc.name };
			}
			let location = null;
			const locLookupId = bill.loc_id;
			if (locLookupId && locMap.has(locLookupId)) {
				const d = locMap.get(locLookupId);
				location = { id: d.id, name: d.name };
			}

			if (account) {
				(account as any).costcenter = costcenter;
				(account as any).location = location;
			}

			return {
				//cc_id: bill.cc_id,
				//loc_id: bill.loc_id,
				account,
				ubill_bw: bill.ubill_bw,
				ubill_color: bill.ubill_color,
				//costcenter,
				//location,
				ubill_date: bill.ubill_date,
				//ubill_stotal: bill.ubill_stotal,
				ubill_gtotal: bill.ubill_gtotal,
				ubill_no: bill.ubill_no,
				ubill_rent: bill.ubill_rent,
				util_id: bill.util_id,
				//ubill_ref: bill.ubill_ref ?? null,
				//ubill_url: publicUrl(bill.ubill_ref ?? null)
			};
		});

		// Return the printing bills list directly (no year/month aggregation)
		res.json({ data: result, message: 'Printing utility bills retrieved successfully', status: 'success' });
	} catch (err) {
		res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to fetch printing bills', status: 'error' });
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
			const accountsMap = yearMap.get(year)!;
			const billId = (bill as any).bill_id;
			if (!billId) continue;
			if (!accountsMap.has(billId)) {
				const accRaw = accountMap.get(billId) || null;
				accountsMap.set(billId, {
					account: accRaw ? accRaw.account : null,
					bill_id: billId,
					monthlyMap: new Map<number, { bw: number; color: number, month: string, rent: number, }>()
				});
			}
			const accEntry = accountsMap.get(billId);
			const monthIdx = d.getMonth();
			const monthName = monthNames[monthIdx];
			const rentNum = Number((bill as any).ubill_rent) || 0;
			const colorNum = Number((bill as any).ubill_color) || 0;
			const bwNum = Number((bill as any).ubill_bw) || 0;
			if (!accEntry.monthlyMap.has(monthIdx)) {
				accEntry.monthlyMap.set(monthIdx, { bw: 0, color: 0, month: monthName, rent: 0 });
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
						const m = acc.monthlyMap.get(mi) || { bw: 0, color: 0, month: monthNames[mi], rent: 0 };
						return {
							month: m.month,
							ubill_bw: (m.bw === 0 ? '0' : m.bw.toFixed(2)),
							ubill_color: (m.color === 0 ? '0' : m.color.toFixed(2)),
							ubill_rent: (m.rent === 0 ? '0' : m.rent.toFixed(2))
						};
					});
					return {
						account: acc.account,
						bill_id: acc.bill_id,
						monthly_expenses
					};
				});
				const total_annual_num = accountsList.reduce((s: number, a: any) => {
					return s + a.monthly_expenses.reduce((ss: number, m: any) => ss + (Number(m.ubill_rent) || 0) + (Number(m.ubill_color) || 0) + (Number(m.ubill_bw) || 0), 0);
				}, 0);
				return {
					details: accountsList,
					total_annual: total_annual_num.toFixed(2),
					year
				};
			});

		res.json({ data: detailsArr, message: 'ok', status: 'success' });
	} catch (err) {
		res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to fetch printing summary', status: 'error' });
	}
};

export const getUtilityBillById = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	const bill = await billingModel.getUtilityBillById(bill_id);
	if (!bill) {
		return res.status(404).json({ message: 'Utility bill not found', status: 'error' });
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
			account: acc.account,
			beneficiary: benObj ? {
				entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
				entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null,
				id: benObj.id ?? benObj.bfcy_id,
				logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
				name: benObj.bfcy_name ?? benObj.name
			} : acc.provider,
			bill_id: acc.bill_id,
			desc: acc.bill_desc,
			service: acc.service
		};
	}
	let costcenter = null;
	const acctCcId = account && (account as any).costcenter ? (account as any).costcenter.id : null;
	const ccLookupId = acctCcId ?? bill.cc_id;
	if (ccLookupId && ccMap.has(ccLookupId)) {
		const cc = ccMap.get(ccLookupId);
		costcenter = { id: cc.id, name: cc.name };
	}

	// Build location (prefer account-level)
	let location = null;
	const acctLocId = account && (account as any).location ? (account as any).location.id : null;
	const locLookupId = acctLocId ?? bill.loc_id;
	if (locLookupId && locMap.has(locLookupId)) {
		const d = locMap.get(locLookupId);
		location = { id: d.id, name: d.name };
	}
	// ensure account contains costcenter & location
	if (account) {
		(account as any).costcenter = costcenter;
		(account as any).location = location;
	}

	const filtered = {
		account,
		ubill_bw: bill.ubill_bw,
		ubill_color: bill.ubill_color,
		ubill_date: bill.ubill_date,
		ubill_disc: bill.ubill_disc,
		ubill_gtotal: bill.ubill_gtotal,
		ubill_no: bill.ubill_no,
		ubill_paystat: bill.ubill_paystat,
		ubill_ref: bill.ubill_ref,
		ubill_rent: bill.ubill_rent,
		ubill_round: bill.ubill_round,
		ubill_stotal: bill.ubill_stotal,
		ubill_tax: bill.ubill_tax,
		util_id: (bill as any).util_id
	};
	res.json({ data: filtered, message: 'Utility bill retrieved successfully', status: 'success' });
};

export const createUtilityBill = async (req: Request, res: Response) => {
	const payload = req.body || {};
	// Multer may populate req.file (single) or req.files (fields). Prefer files.ubill_ref, then files.ubill_file, then req.file
	let file = (req as any).file as Express.Multer.File | undefined;
	const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
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
		const code = err?.code;
		// Common MySQL duplicate error code is 'ER_DUP_ENTRY' or message contains 'Duplicate' / 'already exists'
		if (String(code) === 'ER_DUP_ENTRY' || (typeof msg === 'string' && (/duplicate|already exists|duplicate entry|unique constraint/i).test(msg))) {
			return res.status(409).json({ message: 'Utility bill already exists', status: 'error' });
		}
		// rethrow unknown errors to be handled by outer try/catch below
		throw err;
	}

	let finalRef: null | string = null;
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
			return res.status(201).json({ fileError: String(err), id, message: 'Utility bill created, but file save failed', status: 'success' });
		}
	}

	res.status(201).json({ id, message: 'Utility bill created', status: 'success', ubill_ref: finalRef, ubill_url: publicUrl(finalRef) });
};

export const updateUtilityBill = async (req: Request, res: Response) => {
	const util_id = Number(req.params.id);
	const data = req.body;
	await billingModel.updateUtilityBill(util_id, data);
	res.json({ message: 'Utility bill updated successfully', status: 'success' });
};

export const deleteUtilityBill = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	await billingModel.deleteUtilityBill(bill_id);
	res.json({ message: 'Utility bill deleted successfully', status: 'success' });
};


// Summarize utility bills by cost center, year, and month -- export to Excel
export const getUtilityBillingCostcenterSummary = async (req: Request, res: Response) => {
	const { from, service, to } = req.query;
	const rawBills = await billingModel.getUtilityBills();
	// Use a single accounts/accountMap declaration for both enrichment and grouping
	const accounts = await billingModel.getBillingAccounts();
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));

	// Enrich each bill with its account object
	let bills = rawBills.map((bill: any) => {
		let account = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			account = {
				bill_ac: acc.bill_ac,
				bill_id: acc.bill_id,
				desc: acc.bill_desc,
				provider: acc.provider,
				service: acc.service
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
			if (item.account?.service && String(item.account.service).toLowerCase().includes(String(service).toLowerCase())) {
				return true;
			}
			if (item.account?.provider && String(item.account.provider).toLowerCase().includes(String(service).toLowerCase())) {
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
			summary[ccName] = { _yearMap: {}, costcenter: ccName };
		}
		const date = bill.ubill_date ? dayjs(bill.ubill_date) : null;
		if (!date) continue;
		const year = date.year();
		const month = date.month() + 1;
		const amount = parseFloat(bill.ubill_gtotal || '0');
		// Year grouping
		if (!summary[ccName]._yearMap[year]) {
			summary[ccName]._yearMap[year] = { _monthMap: {}, expenses: 0 };
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
			expenses: yval.expenses.toFixed(2),
			months: Object.entries(yval._monthMap).map(([month, mval]: any) => ({
				expenses: mval.expenses.toFixed(2),
				month: Number(month),
				/* details: Object.entries(mval._serviceMap).map(([service, amount]: any) => ({
				  service,
				  amount: amount.toFixed(2)
				})) */
			})),
			year: Number(year)
		}))
	}));

	// Sort by costcenter name
	const sortedResult = result.sort((a: any, b: any) => String(a.costcenter).localeCompare(String(b.costcenter)));

	res.json({
		data: sortedResult,
		message: `Utility billing costcenter summary by date range retrieved successfully${service ? ` (filtered by service: ${service})` : ' (no service filter)'}`,
		status: 'success'
	});
};

// Summarize utility bills by service, with optional costcenter filter and date range
export const getUtilityBillingServiceSummary = async (req: Request, res: Response) => {
	const { costcenter, from, to } = req.query;
	const rawBills = await billingModel.getUtilityBills();
	const accounts = await billingModel.getBillingAccounts();
	const accountMap = new Map(accounts.map((a: any) => [a.bill_id, a]));

	// Enrich each bill with its account object
	let bills = rawBills.map((bill: any) => {
		let account = null;
		if (bill.bill_id && accountMap.has(bill.bill_id)) {
			const acc = accountMap.get(bill.bill_id);
			account = {
				bill_ac: acc.bill_ac,
				bill_id: acc.bill_id,
				desc: acc.bill_desc,
				provider: acc.provider,
				service: acc.service
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
		if (bill.account?.service) service = bill.account.service;
		else if (bill.account?.provider) service = bill.account.provider;
		const date = bill.ubill_date ? dayjs(bill.ubill_date) : null;
		if (!date) continue;
		const year = date.year();
		const month = date.month() + 1;
		const amount = parseFloat(bill.ubill_gtotal || '0');
		if (!summary[service]) summary[service] = { _yearMap: {}, service };
		if (!summary[service]._yearMap[year]) summary[service]._yearMap[year] = { _monthMap: {}, expenses: 0 };
		summary[service]._yearMap[year].expenses += amount;
		if (!summary[service]._yearMap[year]._monthMap[month]) summary[service]._yearMap[year]._monthMap[month] = { expenses: 0 };
		summary[service]._yearMap[year]._monthMap[month].expenses += amount;
	}

	// Format output
	const result = Object.values(summary).map((s: any) => ({
		details: Object.entries(s._yearMap).map(([year, yval]: any) => ({
			expenses: yval.expenses.toFixed(2),
			months: Object.entries(yval._monthMap).map(([month, mval]: any) => ({
				expenses: mval.expenses.toFixed(2),
				month: Number(month)
			})),
			year: Number(year)
		})),
		service: s.service
	})).sort((a, b) => a.service.localeCompare(b.service));

	res.json({
		data: result,
		message: `Utility billing service summary by date range${costcenter ? ` (filtered by costcenter: ${costcenterName || costcenter})` : ''}`,
		status: 'success'
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
			obj.beneficiary = { id: Number(b.id ?? b.bfcy_id), logo, name };
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

	res.json({ data: enriched, message: 'Billing accounts retrieved successfully', status: 'success' });
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
		obj.beneficiary = { id: Number(b.id ?? b.bfcy_id), logo, name };
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

	res.json({ data: obj, message: 'Billing account retrieved successfully', status: 'success' });
};

export const createBillingAccount = async (req: Request, res: Response) => {
	const payload = req.body;

	// Validate and normalize DATE fields to YYYY-MM-DD since DB column type is DATE
	if (payload.bill_cont_start) {
		const d = dayjs(payload.bill_cont_start);
		if (!d.isValid()) return res.status(400).json({ message: 'Invalid bill_cont_start date', status: 'error' });
		payload.bill_cont_start = d.format('YYYY-MM-DD');
	}
	if (payload.bill_cont_end) {
		const d2 = dayjs(payload.bill_cont_end);
		if (!d2.isValid()) return res.status(400).json({ message: 'Invalid bill_cont_end date', status: 'error' });
		payload.bill_cont_end = d2.format('YYYY-MM-DD');
	}
	const id = await billingModel.createBillingAccount(payload);
	res.status(201).json({ id, message: 'Billing account created successfully', status: 'success' });
};

export const updateBillingAccount = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	const data = req.body;

	// Validate and normalize DATE fields to YYYY-MM-DD since DB column type is DATE
	if (data.bill_cont_start) {
		const d = dayjs(data.bill_cont_start);
		if (!d.isValid()) return res.status(400).json({ message: 'Invalid bill_cont_start date', status: 'error' });
		data.bill_cont_start = d.format('YYYY-MM-DD');
	}
	if (data.bill_cont_end) {
		const d2 = dayjs(data.bill_cont_end);
		if (!d2.isValid()) return res.status(400).json({ message: 'Invalid bill_cont_end date', status: 'error' });
		data.bill_cont_end = d2.format('YYYY-MM-DD');
	}
	await billingModel.updateBillingAccount(bill_id, data);
	res.json({ message: 'Billing account updated successfully', status: 'success' });
};

export const deleteBillingAccount = async (req: Request, res: Response) => {
	const bill_id = Number(req.params.id);
	await billingModel.deleteBillingAccount(bill_id);
	res.json({ message: 'Billing account deleted successfully', status: 'success' });
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
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return res.status(400).json({ message: 'Invalid beneficiary id in path', status: 'error' });

	// fetch beneficiary record and enrich
	const ben = await billingModel.getBeneficiaryById(beneficiaryId);
	if (!ben) return res.status(404).json({ message: 'Beneficiary not found', status: 'error' });
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
	const beneficiaryResp: any = { entry_by: null, entry_position: ben.entry_position || null, filing: ben.file_reference || null, id: ben.id ?? ben.bfcy_id, logo: logo, name: ben.bfcy_name ?? ben.name ?? null };
	if (ben.entry_by) {
		const k = String(ben.entry_by);
		if (empMap.has(k)) {
			const e = empMap.get(k);
			beneficiaryResp.entry_by = { full_name: e.full_name, ramco_id: e.ramco_id };
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

	if (ids.length === 0) return res.status(400).json({ message: 'No util_id provided in request body', status: 'error' });

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
			const cc = ccMap.get(ccLookupId);
			costcenter = { id: cc.id, name: cc.name };
		}
		let location = null;
		const locLookupId = acc.loc_id ?? acc.location_id ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId);
			location = { id: d.id, name: d.name };
		}

		return {
			account: {
				account_no: acc.account,
				bill_id: acc.bill_id,
				costcenter,
				location
			},
			ubill_bw: bill.ubill_bw,
			ubill_color: bill.ubill_color,
			ubill_count: bill.ubill_count,
			ubill_date: bill.ubill_date,
			ubill_deduct: bill.ubill_deduct,
			ubill_disc: bill.ubill_disc,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_no: bill.ubill_no,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_round: bill.ubill_round,
			ubill_stotal: bill.ubill_stotal,
			ubill_submit: bill.ubill_submit ?? null,
			ubill_tax: bill.ubill_tax,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_usage: bill.ubill_usage,
			util_id: bill.util_id
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
				month: p.ubill_date ? dayjs(p.ubill_date).format('MMM-YYYY') : null,
				// temporary placeholder; will fill below
				trending: null as any,
				ubill_gtotal: p.ubill_gtotal as string,
				ubill_no: p.ubill_no
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

	res.json({ beneficiary: beneficiaryResp, data: dataWithPrevious, message: `${dataWithPrevious.length} utility bill(s) retrieved`, status: 'success' });
};

// POST /api/bills/util/by-ids?service=a,b,c
// Body accepts { ids: [1,2] } or { util_id: [1,2] } or comma-separated string
// Returns utility bills for the given IDs filtered by service(s), enriched similar to getUtilityBills
export const postUtilityBillsByIdsByService = async (req: Request, res: Response) => {
	// Parse IDs from body
	const bodyIds = (req.body && (req.body.util_id ?? req.body.ids ?? req.body.idsList));
	let ids: number[] = [];
	if (Array.isArray(bodyIds)) ids = bodyIds.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'string') ids = String(bodyIds).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	else if (typeof bodyIds === 'number') ids = [Number(bodyIds)];

	if (!ids.length) return res.status(400).json({ message: 'No util_id provided in request body', status: 'error' });

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
			acc = accountMap.get(bill.bill_id);
			// resolve beneficiary for account
			let benObj: any = null;
			const providerName = acc.provider ? String(acc.provider).toLowerCase() : null;
			if (acc.beneficiary_id && benById.has(String(acc.beneficiary_id))) benObj = benById.get(String(acc.beneficiary_id));
			else if (providerName && benByName.has(providerName)) benObj = benByName.get(providerName);
			account = {
				account: acc.account,
				beneficiary: benObj ? {
					entry_by: benObj.entry_by ? (typeof benObj.entry_by === 'object' ? benObj.entry_by : { ramco_id: benObj.entry_by }) : null,
					entry_position: benObj.entry_position ? (typeof benObj.entry_position === 'object' ? benObj.entry_position : { ramco_id: benObj.entry_position }) : null,
					id: benObj.id ?? benObj.bfcy_id,
					logo: benObj.bfcy_logo ? publicUrl(benObj.bfcy_logo) : (benObj.logo ? publicUrl(benObj.logo) : null),
					name: benObj.bfcy_name ?? benObj.name
				} : null,
				bill_id: acc.bill_id,
				desc: acc.description,
				// In this codebase, service corresponds to account category
				service: acc.category
			};
		}

		// Build costcenter object (prefer account-level if present)
		let costcenter: any = null;
		const ccLookupId = (acc?.costcenter_id) ?? bill.cc_id;
		if (ccLookupId && ccMap.has(ccLookupId)) {
			const cc = ccMap.get(ccLookupId);
			costcenter = { id: cc.id, name: cc.name };
		}

		// Build location object (prefer account-level if present)
		let location: any = null;
		const locLookupId = (acc?.location_id) ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId);
			location = { id: d.id, name: d.name };
		}

		if (account) {
			account.costcenter = costcenter;
			account.location = location;
		}

		return {
			account,
			ubill_bw: bill.ubill_bw,
			ubill_color: bill.ubill_color,
			ubill_count: bill.ubill_count,
			ubill_date: bill.ubill_date,
			ubill_deduct: bill.ubill_deduct,
			ubill_disc: bill.ubill_disc,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_no: bill.ubill_no,
			ubill_payref: bill.ubill_payref,
			ubill_paystat: bill.ubill_paystat,
			ubill_ref: bill.ubill_ref ?? null,
			ubill_rent: bill.ubill_rent,
			ubill_round: bill.ubill_round,
			ubill_stotal: bill.ubill_stotal,
			ubill_submit: bill.ubill_submit ?? null,
			ubill_tax: bill.ubill_tax,
			ubill_taxrate: bill.ubill_taxrate,
			ubill_url: publicUrl(bill.ubill_ref ?? null),
			ubill_usage: bill.ubill_usage,
			util_id: bill.util_id
		};
	}).filter(Boolean);

	// Apply service filter if provided: match getUtilityBills behavior (account.service)
	const final = normalizedServices.length
		? enriched.filter((item: any) => item.account?.service && normalizedServices.some(s => String(item.account.service).toLowerCase().includes(s)))
		: enriched;

	res.json({ data: final, message: `${final.length} utility bill(s) retrieved`, status: 'success' });
};

// POST variant for printing bills: accepts JSON body { ids: [1,2] } or { util_id: [1,2] } or comma-separated string
export const postPrintingBillsByIds = async (req: Request, res: Response) => {
	// beneficiaryId from route params
	const beneficiaryId = Number(req.params.beneficiaryId ?? req.params.beneficiary_id ?? req.params.beneficiaryId);
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return res.status(400).json({ message: 'Invalid beneficiary id in path', status: 'error' });

	// fetch beneficiary record and enrich
	const ben = await billingModel.getBeneficiaryById(beneficiaryId);
	if (!ben) return res.status(404).json({ message: 'Beneficiary not found', status: 'error' });
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
	const beneficiaryResp: any = { entry_by: null, entry_position: ben.entry_position || null, filing: ben.file_reference || null, id: ben.id ?? ben.bfcy_id, logo: logo, name: ben.bfcy_name ?? ben.name ?? null };
	if (ben.entry_by) {
		const k = String(ben.entry_by);
		if (empMap.has(k)) {
			const e = empMap.get(k);
			beneficiaryResp.entry_by = { full_name: e.full_name, ramco_id: e.ramco_id };
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

	if (ids.length === 0) return res.status(400).json({ message: 'No util_id provided in request body', status: 'error' });

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
			const cc = ccMap.get(ccLookupId);
			costcenter = { id: cc.id, name: cc.name };
		}
		let location = null;
		const locLookupId = acc.loc_id ?? acc.location_id ?? bill.loc_id;
		if (locLookupId && locMap.has(locLookupId)) {
			const d = locMap.get(locLookupId);
			location = { id: d.id, name: d.name };
		}

		return {
			account: {
				account_no: acc.account,
				bill_id: acc.bill_id,
				costcenter,
				location
			},
			ubill_bw: bill.ubill_bw,
			ubill_color: bill.ubill_color,
			ubill_date: bill.ubill_date,
			ubill_gtotal: bill.ubill_gtotal,
			ubill_no: bill.ubill_no,
			ubill_rent: bill.ubill_rent,
			util_id: bill.util_id
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
				month: p.ubill_date ? dayjs(p.ubill_date).format('MMM-YYYY') : null,
				trending: null as any,
				ubill_gtotal: p.ubill_gtotal as string,
				ubill_no: p.ubill_no
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

	res.json({ beneficiary: beneficiaryResp, data: dataWithPrevious, message: `${dataWithPrevious.length} printing bill(s) retrieved`, status: 'success' });
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
				obj.entry_by = { full_name: e.full_name, ramco_id: e.ramco_id };
			} else {
				obj.entry_by = { ramco_id: prepRaw };
			}
		} else {
			obj.entry_by = null;
		}
		return obj;
	});
	res.json({ data: enriched, message: 'Beneficiaries retrieved successfully', status: 'success' });
};

export const getBeneficiaryById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const ben = await billingModel.getBeneficiaryById(id);
	if (!ben) return res.status(404).json({ message: 'Beneficiary not found', status: 'error' });
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
			resp.entry_by = { full_name: e.full_name, ramco_id: e.ramco_id };
		} else {
			resp.entry_by = { ramco_id: prepRaw };
		}
	} else {
		resp.entry_by = null;
	}
	res.json({ data: resp, message: 'Beneficiary retrieved successfully', status: 'success' });
};

export const createBeneficiary = async (req: Request, res: Response) => {
	const payload = req.body || {};
	// Optional file upload handling for creation: store uploaded file under UPLOAD_BASE_PATH/images/logo/<filename>
	if (req.file) {
		payload.bfcy_logo = normalizeStoredPath(req.file.path);
	}
	try {
		const id = await billingModel.createBeneficiary(payload);
		res.status(201).json({ id, message: 'Beneficiary created successfully', status: 'success' });
	} catch (err: any) {
		if (err && String(err.message) === 'duplicate_beneficiary') {
			return res.status(409).json({ message: 'Beneficiary with same name and category already exists', status: 'error' });
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
		res.json({ message: 'Beneficiary updated successfully', status: 'success' });
	} catch (err: any) {
		if (err && String(err.message) === 'duplicate_beneficiary') {
			return res.status(409).json({ message: 'Beneficiary with same name and category already exists', status: 'error' });
		}
		throw err;
	}
};

export const deleteBeneficiary = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	await billingModel.deleteBeneficiary(id);
	res.json({ message: 'Beneficiary deleted successfully', status: 'success' });
};
