import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

import * as billingModel from '../p.billing/billingModel';
import * as purchaseModel from '../p.purchase/purchaseModel';
import { assetTransferAcceptedCurrentOwnerEmail, assetTransferAcceptedHodEmail, assetTransferAcceptedRequestorEmail } from '../utils/emailTemplates/assetTransferT7TransferCompleted';
import { assetTransferApprovalSummaryEmail } from '../utils/emailTemplates/assetTransferT3HodDecision';
import { assetTransferApprovedNewOwnerEmail } from '../utils/emailTemplates/assetTransferT5AwaitingAcceptance';
import { assetTransferApprovedRequestorEmail } from '../utils/emailTemplates/assetTransferT4HodApproved';
import assetTransferAssetManagerEmail from '../utils/emailTemplates/assetTransferAssetManagerEmail';
import assetTransferCurrentOwnerEmail from '../utils/emailTemplates/assetTransferCurrentOwner';
import assetTransferT1SubmissionEmail from '../utils/emailTemplates/assetTransferT1Submission';
import assetTransferT2HodApprovalRequestEmail from '../utils/emailTemplates/assetTransferT2HodApprovalRequest';
import { assetTransferT6HodRejectedEmail } from '../utils/emailTemplates/assetTransferT6HodRejected';
import { getWorkflowPicByDepartment } from '../utils/workflowHelper';
import { sendMail } from '../utils/mailer';
import * as assetModel from './assetModel';
import { generateTransferItemCard, ItemFormatConfig } from '../utils/emailTemplates/assetTransferItemFormat';

/* ========== HELPER FUNCTIONS ========== */
/**
 * Generate a credential code for acceptance portal access
 * Uses transfer ID, new owner ramco_id, and a timestamp to create a deterministic code
 */
function generateAcceptanceCredentialCode(transferId: number, ramcoId: string): string {
	try {
		const data = `${transferId}:${ramcoId}:acceptance`;
		const hash = crypto.createHash('sha256').update(data).digest('hex');
		// Return first 16 characters of hash for URL-safe credential code
		return hash.substring(0, 16);
	} catch (err) {
		console.warn('Failed to generate credential code:', err);
		return '';
	}
}

/**
 * Format date fields in an object from ISO string to YYYY-MM-DD format
 * Useful for converting MySQL DATE columns that come as ISO timestamps
 */
function formatDateFields(obj: any, dateFieldNames: string[]): any {
	if (!obj) return obj;
	const formatted = { ...obj };
	for (const field of dateFieldNames) {
		if (formatted[field] && formatted[field] !== null) {
			// Convert to Date if it's a string, then extract just the date part
			const date = typeof formatted[field] === 'string' 
				? new Date(formatted[field]) 
				: formatted[field];
			if (date instanceof Date && !isNaN(date.getTime())) {
				formatted[field] = date.toISOString().split('T')[0]; // YYYY-MM-DD
			}
		}
	}
	return formatted;
}

/* ========== ASSETS ========== */
export const getAssets = async (req: Request, res: Response) => {
	// Support ?type=[type_id] and ?status=[status] params
	const typeIdParam = req.query.type;
	const categoryParam = req.query.category; // ?category=[category_id] for chain filtering
	const statusParam = req.query.status;
	const purposeParam = req.query.purpose;
	const classificationParam = req.query.classification;
	const managerParam = req.query.manager;
	const ownerParam = req.query.owner;
	const supervisorParam = req.query.supervisor;
	const hodParam = req.query.hod;
	const registerNumberParam = req.query.register;
	const brandParam = req.query.brand; // ?brand={brandId}
	const qParam = req.query.q; // free-text search
	const pageParam = req.query.page;
	const pageSizeParam = req.query.pageSize ?? req.query.limit;
	const offsetParam = req.query.offset; // alternative pagination
	const sortByParam = req.query.sortBy;
	const sortDirParam = req.query.sortDir;
	let typeIds: number[] | undefined = undefined;
	let categoryId: number | undefined = undefined;
	let status: string | undefined = undefined;
	let purpose: string | string[] | undefined = undefined;
	let classification: string | undefined = undefined;
	let manager: number | undefined = undefined;
	let owner: string | string[] | undefined = undefined;
	let registerNumber: string | undefined = undefined;
	let brandId: number | undefined = undefined;
	let q: string | undefined = undefined;
	let usePaged = false;
	let page = 1;
	let pageSize = 25;
	let sortBy: string | undefined = undefined;
	let sortDir: 'asc' | 'desc' | undefined = undefined;
	if (typeof managerParam === 'string' && managerParam !== '') {
		manager = Number(managerParam);
		//if (isNaN(manager)) manager = undefined;
	}
	if (typeof ownerParam === 'string' && ownerParam !== '') {
		// allow comma-separated list or single ramco_id
		owner = ownerParam;
	}

	// Hierarchical filters (mutually exclusive if owner provided)
	if (!owner) {
		// Supervisor: assets of supervisor + immediate subordinates
		if (typeof supervisorParam === 'string' && supervisorParam.trim() !== '') {
			try {
				const subsRaw = await assetModel.getEmployees(undefined, undefined, undefined, undefined, [supervisorParam.trim()], undefined, undefined);
				const subs = Array.isArray(subsRaw) ? subsRaw : [];
				const ownerIds = subs
					.filter((e: any) => e && typeof e.ramco_id === 'string' && e.employment_status !== 'resigned')
					.map((e: any) => e.ramco_id);
				// Include supervisor themselves + subordinates
				ownerIds.push(supervisorParam.trim());
				if (ownerIds.length > 0) owner = ownerIds;
			} catch (e) {
				// ignore and proceed without supervisor filter
			}
		}
		// HOD: assets of all employees in HOD's department (including HOD)
		else if (typeof hodParam === 'string' && hodParam.trim() !== '') {
			try {
				const hodEmp = await assetModel.getEmployeeByRamco(hodParam.trim());
				if (hodEmp && typeof hodEmp.department_id === 'number') {
					const deptId = String(hodEmp.department_id);
					const deptEmpsRaw = await assetModel.getEmployees(undefined, undefined, [deptId], undefined, undefined, undefined, undefined);
					const deptEmps = Array.isArray(deptEmpsRaw) ? deptEmpsRaw : [];
					const ownerIds = deptEmps
						.filter((e: any) => e && typeof e.ramco_id === 'string' && e.employment_status !== 'resigned')
						.map((e: any) => e.ramco_id);
					if (ownerIds.length > 0) owner = ownerIds;
				}
			} catch (e) {
				// ignore and proceed without hod filter
			}
		}
	}
	if (typeof typeIdParam === 'string' && typeIdParam !== '' && typeIdParam !== 'all') {
		// Support comma-separated type IDs
		typeIds = typeIdParam.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
		if (typeIds.length === 0) typeIds = undefined;
	}
	if (typeof categoryParam === 'string' && categoryParam !== '' && categoryParam !== 'all') {
		const n = Number(categoryParam);
		if (!isNaN(n)) categoryId = n;
	}
	if (typeof classificationParam === 'string' && classificationParam !== '') {
		classification = classificationParam;
	}
	if (typeof statusParam === 'string' && statusParam !== '') {
		status = statusParam;
	}
	if (typeof purposeParam === 'string' && purposeParam !== '') {
		// Support comma-separated list of purposes: ?purpose=pool,project
		const parts = purposeParam.split(',').map(s => s.trim()).filter(Boolean);
		purpose = parts.length > 1 ? parts : (parts[0] || undefined);
	}
	if (typeof registerNumberParam === 'string' && registerNumberParam !== '') {
		registerNumber = registerNumberParam;
	}
	if (typeof brandParam === 'string' && brandParam !== '' && brandParam !== 'all') {
		const n = Number(brandParam);
		if (!isNaN(n)) brandId = n;
	}

	if (typeof qParam === 'string' && qParam.trim() !== '') {
		q = qParam.trim();
		usePaged = true;
	}
	if (typeof pageParam === 'string' && pageParam.trim() !== '') {
		const n = Number(pageParam);
		if (!isNaN(n) && n > 0) { page = Math.floor(n); usePaged = true; }
	}
	if (typeof pageSizeParam === 'string' && pageSizeParam.trim() !== '') {
		const n = Number(pageSizeParam);
		if (!isNaN(n) && n > 0) { pageSize = Math.floor(n); usePaged = true; }
	}
	// Support limit/offset pair
	if (!usePaged && typeof offsetParam === 'string' && offsetParam.trim() !== '' && typeof pageSizeParam === 'string') {
		const limit = Number(pageSizeParam);
		const offset = Number(offsetParam);
		if (!isNaN(limit) && limit > 0 && !isNaN(offset) && offset >= 0) {
			pageSize = Math.floor(limit);
			page = Math.floor(offset / pageSize) + 1;
			usePaged = true;
		}
	}
	if (typeof sortByParam === 'string' && sortByParam.trim() !== '') { sortBy = sortByParam.trim(); usePaged = true; }
	if (typeof sortDirParam === 'string' && sortDirParam.trim() !== '') {
		const d = sortDirParam.toLowerCase();
		if (d === 'asc' || d === 'desc') { sortDir = d; usePaged = true; }
	}

	// Fetch assets (paged when requested) and related data
	let assetsRaw: any[] = [];
	let total = 0;
	if (usePaged) {
		const { rows, total: t } = await assetModel.getAssetsPaged({
			brandId,
			classification,
			manager,
			owner,
			purpose,
			q,
			registerNumber,
			status,
			type_ids: typeIds
		}, { page, pageSize, sortBy, sortDir: (sortDir as any) });
		assetsRaw = rows;
		total = t;
	} else {
		assetsRaw = await assetModel.getAssets(typeIds, classification, status, manager, registerNumber, owner, brandId, purpose);
		total = Array.isArray(assetsRaw) ? assetsRaw.length : 0;
	}
	const typesRaw = await assetModel.getTypes();
	const categoriesRaw = await assetModel.getCategories();
	const brandsRaw = await assetModel.getBrands();
	const modelsRaw = await assetModel.getModels();
	const costcentersRaw = await assetModel.getCostcenters();
	const departmentsRaw = await assetModel.getDepartments();
	const districtsRaw = await assetModel.getDistricts();
	const locationsRaw = await assetModel.getLocations();
	const employeesRaw = await assetModel.getEmployees();

	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	
	// Apply category filter if specified (for chain filtering with type)
	let filteredAssets = assets;
	if (categoryId !== undefined) {
		filteredAssets = assets.filter((asset: any) => asset.category_id === categoryId);
	}
	
	// Update total count to reflect filtered results
	const filteredTotal = filteredAssets.length;

	const purchaseIds = Array.from(new Set(
		filteredAssets
			.map((a: any) => a.purchase_id)
			.filter((pid: any) => pid !== null && pid !== undefined && pid !== 0)
	));
	const purchaseItemsRaw = purchaseIds.length > 0 ? (await assetModel.getPurchaseItemsByAssetIds(purchaseIds) as any[]) : [];
	const purchaseItemMap = new Map(purchaseItemsRaw.map((pi: any) => [pi.id, pi]));

	// Fetch specs for each asset
	const specsMap = new Map();
	for (const asset of filteredAssets) {
		if (asset.type_id && asset.id) {
			try {
				const specRows = await assetModel.getSpecsForAsset(asset.type_id, asset.id);
				let specs: any = {};
				
				// Extract the first row as the spec data (tables store one row per asset)
				if (Array.isArray(specRows) && specRows.length > 0) {
					const specData = specRows[0];
					// Only include the per-type spec fields; categories/brands/models are already present above
					// Remove duplicate fields that are already at the top level
					const { type_id, category_id, brand_id, model_id, entry_code, asset_code, register_number, ...filteredSpec } = specData;
					specs = filteredSpec;
				}
				
				// For vehicles (type_id = 2), add insurance and roadtax expiry as fields in the specs object
				if (asset.type_id === 2) {
					try {
						const expiryData = await assetModel.getVehicleRoadtaxAndInsuranceExpiry(asset.id);
						specs.insurance_expiry = expiryData.insurance_expiry || null;
						specs.roadtax_expiry = expiryData.roadtax_expiry || null;
						// Format these date fields
						specs = formatDateFields(specs, ['roadtax_expiry', 'insurance_expiry']);
					} catch (err) {
						// Silently fail if expiry data can't be fetched
					}
				}
				
				specsMap.set(asset.id, specs);
			} catch (err) {
				specsMap.set(asset.id, {});
			}
		}
	}
	
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];

	// Fetch asset transfer statuses for all filtered assets
	const assetTransferStatusMap = new Map<number, string | null>();
	for (const asset of filteredAssets) {
		const status = await assetModel.getAssetTransferStatus(asset.id);
		assetTransferStatusMap.set(asset.id, status);
	}

	// Build lookup maps
	const typeMap = new Map(types.map((t: any) => [t.id, t]));
	const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
	const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
	const districtMap = new Map(districts.map((d: any) => [d.id, d]));
	const locationMap = new Map(locations.map((l: any) => [l.id, l]));
	const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

	// Build asset data
	const data = filteredAssets.map((asset: any) => {
		const type = typeMap.get(asset.type_id);
		// Enrich with unit_price from purchase items
		const purchaseItem = asset.purchase_id ? purchaseItemMap.get(asset.purchase_id) : null;
		const unitPrice = (purchaseItem)?.unit_price ?? asset.unit_price;
		const nbv = assetModel.calculateNBV(unitPrice, asset.purchase_year);
		const age = assetModel.calculateAge(asset.purchase_year);

		return {
			age: age,
			asset_code: asset.asset_code,
			asset_transfer_status: assetTransferStatusMap.get(asset.id) || null,
			brand: asset.brand_id && brandMap.has(asset.brand_id)
				? {
					id: asset.brand_id,
					name: brandMap.get(asset.brand_id)?.name || null
				}
				: null,
			category: asset.category_id && categoryMap.has(asset.category_id)
				? {
					id: asset.category_id,
					name: categoryMap.get(asset.category_id)?.name || null
				}
				: null,
			classification: asset.classification,
			condition_status: asset.condition_status,
			//depreciation_length: asset.depreciation_length,
			costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
				? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
				: null,
			department: asset.department_id && departmentMap.has(asset.department_id)
				? { id: asset.department_id, name: departmentMap.get(asset.department_id)?.code || null }
				: null,
			disposed_date: asset.disposed_date,
			entry_code: asset.entry_code,
			fuel_type: asset.fuel_type,
			id: asset.id,
			/* district: asset.district_id && districtMap.has(asset.district_id)
			  ? { id: asset.district_id, code: districtMap.get(asset.district_id)?.code || null }
			  : null, */
			location: asset.location_id && locationMap.has(asset.location_id)
				? { id: asset.location_id, name: locationMap.get(asset.location_id)?.name || null }
				: null,
			model: asset.model_id && modelMap.has(asset.model_id)
				? {
					id: asset.model_id,
					name: modelMap.get(asset.model_id)?.name || null
				}
				: null,
			nbv: nbv,
			owner: asset.ramco_id && employeeMap.has(asset.ramco_id)
				? {
					full_name: employeeMap.get(asset.ramco_id)?.full_name || null,
					ramco_id: employeeMap.get(asset.ramco_id)?.ramco_id || null
				}
				: null,
			purchase_date: asset.purchase_date,
			purchase_id: asset.purchase_id,
			purchase_year: asset.purchase_year,
			purpose: asset.purpose,
			record_status: asset.record_status,
			register_number: asset.register_number,
			specs: specsMap.get(asset.id) || {},
			status: asset.status,
			transmission: asset.transmission,
			type: type ? {
				id: type.id,
				name: type.name
			} : null,
			unit_price: unitPrice,
		};
	});

	const meta = { page, pageSize, total: filteredTotal, totalPages: Math.max(1, Math.ceil(filteredTotal / (pageSize || 1))) };
	res.json({
		data,
		message: `Assets data retrieved successfully (${data.length} entries${usePaged ? ` of ${filteredTotal} total` : ''})`,
		meta,
		status: 'success'
	});
};

export const getAssetById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const asset = await assetModel.getAssetById(id);
	if (!asset) return res.status(404).json({ message: 'Asset not found', status: 'error' });

	// Enrich with unit_price from purchase items
	const purchaseItem = (asset as any).purchase_id 
		? (await assetModel.getPurchaseItemsByAssetIds([(asset as any).purchase_id]) as any[])[0]
		: null;
	if (purchaseItem) {
		(asset as any).unit_price = purchaseItem.unit_price;
	}

	// Fetch purchase details using register_number
	const purchaseDetails = (asset as any).register_number
		? await assetModel.getPurchaseDetailsByRegisterNumber((asset as any).register_number)
		: null;

	// Fetch all related data for mapping
	const [ownershipsRaw, employeesRaw, typesRaw, categoriesRaw, brandsRaw, modelsRaw, departmentsRaw, costcentersRaw, districtsRaw, locationsRaw] = await Promise.all([
		assetModel.getAssetOwnerships(),
		assetModel.getEmployees(),
		assetModel.getTypes(),
		assetModel.getCategories(),
		assetModel.getBrands(),
		assetModel.getModels(),
		assetModel.getDepartments(),
		assetModel.getCostcenters(),
		assetModel.getDistricts(),
		assetModel.getLocations()
	]);
	const ownerships = Array.isArray(ownershipsRaw) ? ownershipsRaw : [];
	const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];

	// Build lookup maps
	const typeMap = new Map(types.map((t: any) => [t.id, t]));
	const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
	const brandMap = new Map(brands.map((b: any) => [b.id, b]));
	const modelMap = new Map(models.map((m: any) => [m.id, m]));
	const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
	const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
	const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
	const districtMap = new Map(districts.map((d: any) => [d.id, d]));
	const locationMap = new Map(locations.map((l: any) => [l.id, l]));

	// Group ownerships by asset_id
	const ownershipsByAsset: Record<number, any[]> = {};
	for (const o of ownerships) {
		if (!isOwnershipRow(o)) continue;
		if (!ownershipsByAsset[o.asset_id]) ownershipsByAsset[o.asset_id] = [];
		const emp = employeeMap.get(o.ramco_id);
		if (emp) {
			ownershipsByAsset[o.asset_id].push({
				contact: emp.contact,
				costcenter: asset.costcenter_id ? (costcenterMap.get(asset.costcenter_id)?.name || null) : null,
				department: asset.department_id ? (departmentMap.get(asset.department_id)?.code || null) : null,
				district: asset.district_id ? (districtMap.get(asset.district_id)?.code || null) : null,
				effective_date: (o as any).effective_date || null,
				email: emp.email,
				location: asset.location_id ? (locationMap.get(asset.location_id)?.name || null) : null,
				name: emp.full_name,
				ramco_id: emp.ramco_id
			});
		}
	}

	// Build specs dynamically based on type_id (per-type spec tables named '{type_id}_specs')
	const type = typeMap.get(asset.type_id);
	let specs: any = null;
	if (type && Number.isFinite(type.id)) {
		try {
			// fetch from dynamic per-type spec table
			const specRows = await assetModel.getSpecsForAsset(type.id, asset.id);
			if (Array.isArray(specRows) && specRows.length > 0) {
				// use the first row as the spec data (tables store one row per asset)
				const specData = specRows[0];
				// Only include the per-type spec fields; categories/brands/models are already present above
				// Remove duplicate fields that are already at the top level
				const { type_id, category_id, brand_id, model_id, entry_code, asset_code, register_number, ...filteredSpec } = specData;
				
				// Format date fields from ISO timestamps to YYYY-MM-DD
				const dateFields = ['avls_install_date', 'avls_removal_date', 'avls_transfer_date'];
				specs = formatDateFields(filteredSpec, dateFields);

				// For computers (type 1) include installed software
				if (type.id === 1) {
					const installedSoftware = await assetModel.getInstalledSoftwareForAsset(asset.id);
					specs.installed_software = installedSoftware || [];
				}

				// For vehicles (type 2) include roadtax and insurance expiry
				if (type.id === 2) {
					const vehicleExpiry = await assetModel.getVehicleRoadtaxAndInsuranceExpiry(asset.id);
					specs.roadtax_expiry = vehicleExpiry.roadtax_expiry;
					specs.insurance_expiry = vehicleExpiry.insurance_expiry;
					// Format these newly added date fields
					specs = formatDateFields(specs, ['roadtax_expiry', 'insurance_expiry']);
				}
			}
		} catch (_err) {
			// Log but don't fail if specs fetch fails
			console.warn(`Failed to fetch specs for asset ${asset.id}:`, _err);
		}
	}

		const effectivePurchaseDate = purchaseDetails?.do_date || asset.purchase_date;
		const effectivePurchaseYear = effectivePurchaseDate 
			? new Date(effectivePurchaseDate).getFullYear() 
			: asset.purchase_year;

		const assetWithNested = {
			id: asset.id,
			entry_code: asset.entry_code,
			classification: asset.classification,
			status: asset.record_status,
			condition: asset.condition_status,
			register_number: asset.register_number,
			type: type ? {
				id: type.id,
				name: type.name
			} : null,
			category: asset.category_id && categoryMap.has(asset.category_id)
				? { id: asset.category_id, name: categoryMap.get(asset.category_id)?.name || null }
				: null,
			brand: asset.brand_id && brandMap.has(asset.brand_id)
				? { id: asset.brand_id, name: brandMap.get(asset.brand_id)?.name || null }
				: null,
			model: asset.model_id && modelMap.has(asset.model_id)
				? { id: asset.model_id, name: modelMap.get(asset.model_id)?.name || null }
				: null,
			purchase_date: effectivePurchaseDate,
			purchase_year: effectivePurchaseYear,
		costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
			? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
			: null,
		unit_price: asset.unit_price,
		depreciation_length: asset.depreciation_length,
		depreciation_rate: asset.depreciation_rate,
		nbv: assetModel.calculateNBV(asset.unit_price, effectivePurchaseYear),
		age: assetModel.calculateAge(effectivePurchaseYear),
		disposed_date: asset.disposed_date,
		specs,
		department: asset.department_id && departmentMap.has(asset.department_id)
			? { code: departmentMap.get(asset.department_id)?.code || null, id: asset.department_id }
			: null,
		location: asset.location_id && locationMap.has(asset.location_id)
			? { id: asset.location_id, name: locationMap.get(asset.location_id)?.name || null }
			: null,
		owner: ownershipsByAsset[asset.id] || [],
		purchase_details: purchaseDetails ? {
			id: purchaseDetails.id,
			register_number: purchaseDetails.register_number,
			classification: purchaseDetails.classification,
			purchase_id: purchaseDetails.purchase_id,
			request_id: purchaseDetails.request_id,
			warranty_period: purchaseDetails.warranty_period,
			item_condition: purchaseDetails.item_condition,
			description: purchaseDetails.description,
			created_at: purchaseDetails.created_at,
			created_by: purchaseDetails.created_by,
			po: purchaseDetails.po_no ? {
				number: purchaseDetails.po_no,
				date: purchaseDetails.po_date
			} : null,
			do: purchaseDetails.do_no ? {
				number: purchaseDetails.do_no,
				date: purchaseDetails.do_date
			} : null,
			grn: purchaseDetails.grn_no ? {
				number: purchaseDetails.grn_no,
				date: purchaseDetails.grn_date
			} : null,
			supplier: purchaseDetails.supplier_id ? {
				id: purchaseDetails.supplier_id,
				name: purchaseDetails.supplier_name,
				contact_no: purchaseDetails.supplier_contact,
				contact_name: purchaseDetails.supplier_contact_name
			} : null
		} : null,
	};

	res.json({
		data: assetWithNested,
		message: `Asset data with id: ${asset.id} retrieved successfully`,
		status: 'success'
	});
};

export const createAsset = async (req: Request, res: Response) => {
	const assetData = req.body;
	const result = await assetModel.createAsset(assetData);
	res.status(201).json({
		message: 'Asset created successfully',
		result,
		status: 'success'
	});
};

export const updateAsset = async (req: Request, res: Response) => {
	const { id } = req.params;
	const data = req.body;
	const result = await assetModel.updateAsset(Number(id), data);
	res.json({
		message: 'Asset updated successfully',
		result,
		status: 'success'
	});
};

/**
 * Update basic specs for an asset (type_id, brand_id, model_id, category_id)
 * PUT /api/assets/specs/basic/:asset_id
 */
export const updateAssetBasicSpecs = async (req: Request, res: Response) => {
	try {
		const asset_id = Number(req.params.asset_id);
		if (!asset_id) return res.status(400).json({ message: 'asset_id is required', status: 'error' });
		
		const result = await assetModel.updateAssetBasicSpecs(asset_id, req.body);
		
		res.json({
			message: result.message,
			data: result,
			status: 'success'
		});
	} catch (error) {
		res.status(400).json({
			message: error instanceof Error ? error.message : 'Failed to update asset specs',
			status: 'error'
		});
	}
};

export const deleteAsset = async (req: Request, res: Response) => {
	const { id } = req.params;
	const result = await assetModel.deleteAsset(Number(id));
	res.json({
		message: 'Asset deleted successfully',
		result,
		status: 'success'
	});
};


/* ======= ASSET MANAGERS ======= */
export const getAssetManagers = async (req: Request, res: Response) => {
	// Fetch all asset managers
	const managers = await assetModel.getAssetManagers();
	if (!Array.isArray(managers)) {
		return res.status(500).json({ message: 'Failed to fetch asset managers', status: 'error' });
	}
	// Fetch departments, locations, costcenters and all employees for mapping
	const [departmentsRaw, locationsRaw, costcentersRaw, employeesRaw] = await Promise.all([
		assetModel.getDepartments(),
		assetModel.getLocations(),
		assetModel.getCostcenters(),
		assetModel.getEmployees()
	]);
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
	const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
	const deptMap = new Map(departments.map((d: any) => [d.id, d]));
	const locMap = new Map(locations.map((l: any) => [l.id, l]));
	const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
	// Enrich managers with employee details, including nested department and location
	let enrichedManagers = (managers as any[]).map(mgr => {
		const emp = mgr.ramco_id && empMap.has(mgr.ramco_id) ? empMap.get(mgr.ramco_id) : null;
		return {
			...mgr,
			employee: emp ? {
				contact: emp.contact,
				costcenter: emp.costcenter_id ? { id: emp.costcenter_id, name: costcenterMap.get(emp.costcenter_id)?.name || null } : null,
				department: emp.department_id ? { id: emp.department_id, name: deptMap.get(emp.department_id)?.code || null } : null,
				email: emp.email,
				full_name: emp.full_name,
				location: emp.location_id ? { id: emp.location_id, name: locMap.get(emp.location_id)?.name || null } : null,
				ramco_id: emp.ramco_id
			} : null
		};
	});
	// Optional filter by ?ramco=... query param
	const ramco = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : null;
	if (ramco) {
		enrichedManagers = enrichedManagers.filter((mgr: any) => String(mgr.ramco_id) === ramco);
	}
	res.json({ data: enrichedManagers, message: 'Asset managers retrieved successfully', status: 'success' });
}

export const getAssetManagerById = async (req: Request, res: Response) => {
	const managerId = Number(req.params.id);
	if (!managerId) {
		return res.status(400).json({ message: 'Invalid asset manager ID', status: 'error' });
	}
	// Fetch the asset manager
	const manager = await assetModel.getAssetManagerById(managerId);
	if (!manager) {
		return res.status(404).json({ message: 'Asset manager not found', status: 'error' });
	}
	// Fetch employee details and related department/location
	const emp = manager.ramco_id ? await assetModel.getEmployeeByRamco(manager.ramco_id) : null;
	let employee = null;
	if (emp) {
		const [dept, loc, costcenter] = await Promise.all([
			emp.department_id ? assetModel.getDepartmentById(emp.department_id) : null,
			emp.location_id ? assetModel.getLocationById(emp.location_id) : null,
			emp.costcenter_id ? assetModel.getCostcenterById(emp.costcenter_id) : null
		]);
		employee = {
			contact: emp.contact,
			costcenter: costcenter ? { id: costcenter.id, name: costcenter.name || null } : null,
			department: dept ? { id: dept.id, name: dept.code || null } : null,
			email: emp.email,
			full_name: emp.full_name,
			location: loc ? { id: loc.id, name: loc.name || null } : null,
			ramco_id: emp.ramco_id
		};
	}
	res.json({ data: { ...manager, employee }, message: 'Asset manager retrieved successfully', status: 'success' });
}

export const createAssetManager = async (req: Request, res: Response) => {
	const data = req.body;
	// Create the asset manager
	const insertId = await assetModel.createAssetManager(data);
	res.status(201).json({ data: { id: insertId }, message: 'Asset manager created successfully', status: 'success' });
}

export const updateAssetManager = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const data = req.body;
	// Update the asset manager
	const result = await assetModel.updateAssetManager(data, id);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ message: 'Asset manager not found', status: 'error' });
	}
	res.json({ message: 'Asset manager updated successfully', status: 'success' });
}

export const deleteAssetManager = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) {
		return res.status(400).json({ message: 'Invalid asset manager ID', status: 'error' });
	}
	// Validate asset manager exists
	const manager = await assetModel.getAssetManagerById(id);
	if (!manager) {
		return res.status(404).json({ message: 'Asset manager not found', status: 'error' });
	}
	// Delete the asset manager
	const result = await assetModel.deleteAssetManager(id);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ message: 'Asset manager not found', status: 'error' });
	}
	res.json({ message: 'Asset manager deleted successfully', status: 'success' });
}

/* ============ SPEC PROPERTIES ============= */
export const getSpecProperties = async (req: Request, res: Response) => {
	const typeParam = req.query.type || req.params.type_id;
	if (typeParam === undefined || typeParam === null || String(typeParam).trim() === '') {
		// Return grouped by type with type_name and properties[]
		const rowsRaw = await assetModel.getAllSpecProperties();
		const typesRaw = await assetModel.getTypes();
		const rows = Array.isArray(rowsRaw) ? rowsRaw as any[] : [];
		const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
		const typeNameMap = new Map<number, string>();
		for (const t of types) {
			if (t && typeof t.id === 'number') {
				typeNameMap.set(t.id, t.name || null);
			}
		}
		const grouped: any[] = [];
		const groupMap = new Map<number, { properties: any[]; type_id: number; type_name: null | string; }>();
		for (const r of rows) {
			const tid = Number(r.type_id);
			if (!Number.isFinite(tid)) continue;
			if (!groupMap.has(tid)) {
				const group = { properties: [] as any[], type_id: tid, type_name: typeNameMap.get(tid) ?? null };
				groupMap.set(tid, group);
				grouped.push(group);
			}
			// Exclude type_id inside individual property
			const { type_id, ...prop } = r;
			groupMap.get(tid)!.properties.push(prop);
		}
		return res.json({ data: grouped, message: 'All spec properties retrieved', status: 'success' });
	}
	const typeId = Number(typeParam);
	if (!typeId || isNaN(typeId)) return res.status(400).json({ message: 'type_id is invalid', status: 'error' });
	const rows = await assetModel.getSpecPropertiesByType(typeId);
	res.json({ data: rows, message: 'Spec properties retrieved', status: 'success' });
};

export const createSpecProperty = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		// payload: { type_id, name, label, data_type, nullable, default_value, options }
		const result: any = await assetModel.createSpecProperty(payload);
		
		// If apply failed, return error instead of success
		if (!result.applied && result.applyError) {
			return res.status(400).json({ 
				data: result, 
				message: `Spec property created but failed to apply: ${result.applyError}`, 
				status: 'warning' 
			});
		}
		
		res.status(201).json({ data: result, message: 'Spec property created', status: 'success' });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ data: null, message, status: 'error' });
	}
};

export const applySpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ message: 'id is required', status: 'error' });
	const spec = await assetModel.getSpecPropertyById(id);
	if (!spec) return res.status(404).json({ message: 'Spec property not found', status: 'error' });
	const result: any = await assetModel.applySpecPropertyToType(spec);
	if (result.ok) {
		res.json({ data: null, message: 'Spec applied to type table', status: 'success' });
	} else {
		res.status(500).json({ data: result.error, message: 'Failed to apply spec', status: 'error' });
	}
};

export const updateSpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ message: 'id is required', status: 'error' });
	const result = await assetModel.updateSpecProperty(id, req.body);
	const hasErrors = result.alterResult && !result.alterResult.success;
	res.status(hasErrors ? 207 : 200).json({ 
		data: result, 
		message: hasErrors ? 'Spec property updated but table alteration failed' : 'Spec property updated', 
		status: hasErrors ? 'partial' : 'success' 
	});
};

export const deleteSpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ message: 'id is required', status: 'error' });
	const drop = req.query.drop === '1' || req.query.drop === 'true';
	const result = await assetModel.deleteSpecProperty(id, drop);
	res.json({ data: result, message: 'Spec property deleted', status: 'success' });
};

export const applyPendingSpecProperties = async (req: Request, res: Response) => {
	const typeParam = req.query.type || req.body.type_id;
	let typeId: number | undefined = undefined;
	if (typeParam !== undefined && typeParam !== null && String(typeParam).trim() !== '') {
		typeId = Number(typeParam);
		if (isNaN(typeId)) return res.status(400).json({ message: 'type_id is invalid', status: 'error' });
	}
	const results = await assetModel.applyPendingSpecProperties(typeId);
	res.json({ data: results, message: 'Apply results', status: 'success' });
};


// --- Add this helper near the top of the file ---
function isPlainObjectArray(arr: any): arr is Record<string, any>[] {
	return Array.isArray(arr) && arr.every(e => e && typeof e === 'object' && !Array.isArray(e));
}

// Register batch of assets into purchase registry table
export const registerAssetsBatch = async (req: Request, res: Response) => {
	try {
		const { assets, created_by, pr_id } = req.body || {};
		const prIdNum = Number(pr_id);
		if (!prIdNum || !Array.isArray(assets) || assets.length === 0) {
			return res.status(400).json({ data: null, message: 'Invalid payload: pr_id and non-empty assets[] are required', status: 'error' });
		}

		// Basic normalization is handled in model; perform minimal structure check here
		const insertIds = await purchaseModel.createPurchaseAssetRegistryBatch(prIdNum, assets, created_by || null);

		return res.status(201).json({
			data: { insertIds, pr_id: prIdNum },
			message: `Registered ${insertIds.length} assets for PR ${prIdNum}`,
			status: 'success'
		});
	} catch (error) {
		return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to register assets batch', status: 'error' });
	}
}

/* =========== TYPES =========== */
export const getTypes = async (req: Request, res: Response) => {
	const rows = await assetModel.getTypes();
	// Enhance: fetch all employees for manager lookup
	const employees = await assetModel.getEmployees();
	const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
	
	// Fetch all categories once to avoid N+1 queries
	const allCategories = await assetModel.getCategories();
	const categoriesByTypeId = new Map<number, any[]>();
	(Array.isArray(allCategories) ? allCategories : []).forEach((cat: any) => {
		if (cat.type_id) {
			if (!categoriesByTypeId.has(cat.type_id)) {
				categoriesByTypeId.set(cat.type_id, []);
			}
			categoriesByTypeId.get(cat.type_id)!.push({
				id: cat.id.toString(),
				name: cat.name,
				code: cat.code,
				image: cat.image ? `https://${req.get('host')}/uploads/categories/${cat.image}` : null
			});
		}
	});
	
	const data = (rows as any[]).map((type) => {
		let manager = null;
		if (type.manager && employeeMap.has(type.manager)) {
			const emp = employeeMap.get(type.manager);
			manager = { full_name: emp.full_name, ramco_id: emp.ramco_id };
		}
		// Add full image URL if image exists
		let image = type.image;
		if (image) {
			image = `https://${req.get('host')}/uploads/types/${image}`;
		}
		return {
			...type,
			image,
			manager,
			categories: categoriesByTypeId.get(type.id) || []
		};
	});
	res.json({
		data,
		message: 'Asset type retrieved successfully',
		status: 'success'
	});
};

export const getTypeById = async (req: Request, res: Response) => {
	const row = await assetModel.getTypeById(Number(req.params.id));
	if (!row) {
		return res.status(404).json({ data: null, message: 'Type not found', status: 'error' });
	}
	// Enhance: fetch all employees for manager lookup
	const employees = await assetModel.getEmployees();
	const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
	let manager = null;
	if (row.manager && employeeMap.has(row.ramco_id)) {
		const emp = employeeMap.get(row.ramco_id);
		manager = { full_name: emp.full_name, ramco_id: emp.ramco_id };
	}
	
	// Fetch categories for this type
	const typeCategories = await assetModel.getCategories();
	const categories = (Array.isArray(typeCategories) ? typeCategories : [])
		.filter((cat: any) => cat.type_id === row.id)
		.map((cat: any) => ({
			id: cat.id.toString(),
			name: cat.name,
			code: cat.code,
			image: cat.image ? `https://${req.get('host')}/uploads/categories/${cat.image}` : null
		}));
	
	const data = { ...row, manager, categories };
	res.json({
		data,
		message: 'Asset type retrieved successfully',
		status: 'success'
	});
};

export const createType = async (req: Request, res: Response) => {
	try {
		const { description, image, manager, name, ramco_id } = req.body;
		// Accept ramco_id from either manager object or direct field
		const resolvedRamcoId = (manager?.ramco_id) ? manager.ramco_id : ramco_id;
		const result = await assetModel.createType({ description, image, name, ramco_id: resolvedRamcoId });
		// Ensure correct type for insertId
		const typeId = (result as import('mysql2').ResultSetHeader).insertId;
		// Fetch the created type to return with full image URL
		const type = await assetModel.getTypeById(typeId);
		if (type.image) {
			type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
		}
		res.status(201).json({ data: type, message: 'Type created', status: 'success' });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ data: null, message, status: 'error' });
	}
};

export const updateType = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { description, image, manager, name, ramco_id } = req.body;
		// Accept ramco_id from either manager object or direct field
		const resolvedRamcoId = (manager?.ramco_id) ? manager.ramco_id : ramco_id;
		await assetModel.updateType(id, { description, image, name, ramco_id: resolvedRamcoId });
		// Fetch the updated type to return with full image URL
		const type = await assetModel.getTypeById(id);
		if (type.image) {
			type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
		}
		res.json({ data: type, message: 'Type updated', status: 'success' });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ data: null, message, status: 'error' });
	}
};

export const deleteType = async (req: Request, res: Response) => {
	const result = await assetModel.deleteType(Number(req.params.id));
	res.json(result);
};

/* =========== CATEGORIES =========== */
export const getCategories = async (req: Request, res: Response) => {
	// Support ?type={type_id} param (optional) - can be comma-separated
	let typeIds: number[] = [];
	if (typeof req.query.type === 'string' && req.query.type !== '' && req.query.type !== 'all') {
		const ids = (req.query.type).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		typeIds = ids;
	}
	const managerParam = req.query.manager;
	const rowsRaw = await assetModel.getCategories(managerParam as any);
	let rows: any[] = Array.isArray(rowsRaw) ? rowsRaw : [];
	if (typeIds.length > 0) {
		rows = rows.filter((c: any) => typeIds.includes(c.type_id));
	}

	// Map categories to include brands using proper brand_id/category_id relationship
	const data = [];
	for (const category of rows) {
		let brandsForCategory: any[] = [];
		if (category.id) {
			// Use the proper method to get brands for this category by category_id
			const categoryBrandsRaw = await assetModel.getBrandsByCategoryId(category.id);
			const categoryBrands = Array.isArray(categoryBrandsRaw) ? categoryBrandsRaw : [];
			brandsForCategory = categoryBrands.map((brand: any) => ({
				id: brand.id,
				name: brand.name,
			}));
		}

		data.push({
			...category,
			brands: brandsForCategory
		});
	}
	res.json({
		data,
		message: 'Categories data retrieved successfully',
		status: 'success'
	});
};

export const getCategoryById = async (req: Request, res: Response) => {
	const row = await assetModel.getCategoryById(Number(req.params.id));
	res.json(row);
};

export const createCategory = async (req: Request, res: Response) => {
	// Accept frontend payload with type_id (or typeId), map to type_id for DB
	const { manager_id, name, type_id, typeId } = req.body;
	// Prefer type_id, fallback to typeId
	const result = await assetModel.createCategory({
		manager_id: manager_id ?? null,
		name,
		type_id: type_id ?? typeId
	});
	res.json({
		message: 'Category created successfully',
		result,
		status: 'success'
	});
};

export const updateCategory = async (req: Request, res: Response) => {
	const result = await assetModel.updateCategory(Number(req.params.id), req.body);
	res.json(result);
};

export const deleteCategory = async (req: Request, res: Response) => {
	const result = await assetModel.deleteCategory(Number(req.params.id));
	res.json(result);
};

/* =========== BRANDS =========== */
// Helper: get all brand-category associations from join table
async function getAllBrandCategoryAssociations() {
	// Get all brands and categories
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	// Build brand->categories map
	const brandToCategories: Record<string, string[]> = {};
	for (const b of brands as any[]) {
		const cats = await assetModel.getCategoriesByBrand(b.code);
		const catArr = Array.isArray(cats) ? cats : [];
		brandToCategories[b.code] = catArr.map((c: any) => c.category_code);
	}
	// Build category->brands map
	const categoryToBrands: Record<string, string[]> = {};
	for (const c of categories as any[]) {
		const brs = await assetModel.getBrandsByCategory(c.code);
		const brArr = Array.isArray(brs) ? brs : [];
		categoryToBrands[c.code] = brArr.map((b: any) => b.brand_code);
	}
	return { brandToCategories, categoryToBrands };
}

export const getBrands = async (req: Request, res: Response) => {
	// Support ?type={type_id} param (optional)
	let typeId: number | undefined = undefined;
	if (typeof req.query.type === 'string' && req.query.type !== '' && req.query.type !== 'all') {
		const parsed = Number(req.query.type);
		if (!isNaN(parsed)) typeId = parsed;
	}

	// Support ?categories={category_id} param (optional) - can be comma-separated
	let categoryIds: number[] = [];
	if (typeof req.query.categories === 'string' && req.query.categories !== '' && req.query.categories !== 'all') {
		const catIds = (req.query.categories).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		categoryIds = catIds;
	}

	// Fetch all brands, categories, types, and models
	const brandsRaw = await assetModel.getBrands();
	let brands: any[] = Array.isArray(brandsRaw) ? brandsRaw : [];
	if (typeId !== undefined) {
		brands = brands.filter((b: any) => b.type_id === typeId);
	}

	const [categories, types, allModels] = await Promise.all([
		assetModel.getCategories(),
		assetModel.getTypes(),
		assetModel.getModels()
	]);

	// Build type map by id
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) {
		typeMap.set(t.id, { id: t.id, name: t.name });
	}

	// Build models map by brand_id
	const modelsMap = new Map<number, any[]>();
	for (const model of allModels as any[]) {
		if (model.brand_id) {
			if (!modelsMap.has(model.brand_id)) {
				modelsMap.set(model.brand_id, []);
			}
			modelsMap.get(model.brand_id)!.push({
				id: model.id.toString(),
				name: model.name
			});
		}
	}

	// Filter brands by categories if specified
	if (categoryIds.length > 0) {
		const filteredBrands = [];
		for (const brand of brands) {
			if (brand.id) {
				// Get categories for this brand using the proper method with brand_id
				const brandCategoriesRaw = await assetModel.getCategoriesByBrandId(brand.id);
				const brandCategories = Array.isArray(brandCategoriesRaw) ? brandCategoriesRaw : [];
				const brandCategoryIds = brandCategories.map((cat: any) => cat.id);

				// Check if any of the brand's categories match the requested category IDs
				if (categoryIds.some(catId => brandCategoryIds.includes(catId))) {
					filteredBrands.push(brand);
				}
			}
		}
		brands = filteredBrands;
	}

	// Build categories map by brand_id
	const brandCategoriesMap = new Map<number, any[]>();
	for (const brand of brands) {
		const brandCategoriesRaw = await assetModel.getCategoriesByBrandId(brand.id);
		const brandCategories = Array.isArray(brandCategoriesRaw) ? brandCategoriesRaw : [];
		brandCategoriesMap.set(brand.id, brandCategories.map((cat: any) => ({
			id: cat.id.toString(),
			name: cat.name
		})));
	}

	// Map brands to include models with nested categories
	const data = [];
	for (const brand of brands) {
		// Get models for this brand
		const modelsForBrand = modelsMap.get(brand.id) || [];

		// Build categories map for each model (get category by model's category_id)
		const modelsWithCategories = await Promise.all(
			modelsForBrand.map(async (model: any) => {
				// Get category for this model using its category_id
				let modelCategory = null;
				if (model.category_id) {
					const cat = await assetModel.getCategoryById(Number(model.category_id));
					if (cat) {
						modelCategory = {
							id: cat.id.toString(),
							name: cat.name
						};
					}
				}
				
				return {
					id: model.id.toString(),
					name: model.name,
					category: modelCategory
				};
			})
		);

		data.push({
			id: brand.id.toString(),
			name: brand.name,
			type: brand.type_id ? (typeMap.get(brand.type_id) || null) : null,
			categories: brandCategoriesMap.get(brand.id) || [],
			models: modelsWithCategories
		});
	}

	res.json({
		data,
		message: 'Models data retrieved successfully',
		status: 'success'
	});
};

export const getBrandById = async (req: Request, res: Response) => {
	const row = await assetModel.getBrandById(Number(req.params.id));
	res.json(row);
};

export const createBrand = async (req: Request, res: Response) => {
	// Accept frontend payload as-is (type_id, category_id)
	const result = await assetModel.createBrand(req.body);
	res.json({
		message: 'Brand created successfully',
		result,
		status: 'success'
	});
};

export const updateBrand = async (req: Request, res: Response) => {
	// Accept frontend payload as-is (type_id, category_id)
	const result = await assetModel.updateBrand(Number(req.params.id), req.body);
	res.json({
		message: 'Brand updated successfully',
		result,
		status: 'success'
	});
};

export const deleteBrand = async (req: Request, res: Response) => {
	const result = await assetModel.deleteBrand(Number(req.params.id));
	res.json(result);
};


/* =========== BRAND-CATEGORY RELATIONSHIP ENDPOINTS =========== */
export const assignCategoryToBrand = async (req: Request, res: Response) => {
	const { brand_code, category_code } = req.params;
	await assetModel.addBrandCategory(brand_code as string, category_code as string);
	res.json({ message: 'Category assigned to brand', status: 'success' });
};

export const unassignCategoryFromBrand = async (req: Request, res: Response) => {
	const { brand_code, category_code } = req.params;
	await assetModel.removeBrandCategory(brand_code as string, category_code as string);
	res.json({ message: 'Category unassigned from brand', status: 'success' });
};

export const getCategoriesForBrand = async (req: Request, res: Response) => {
	const { brand_code } = req.params;
	const categories = await assetModel.getCategoriesByBrand(brand_code as string);
	res.json({ data: categories, status: 'success' });
};

export const getBrandsForCategory = async (req: Request, res: Response) => {
	const { category_code } = req.params;
	const brands = await assetModel.getBrandsByCategory(category_code as string);
	res.json({ data: brands, status: 'success' });
};

export const getAllBrandCategoryMappings = async (req: Request, res: Response) => {
	// Get all brands and categories
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	// Build lookup maps
	const brandMap = new Map<string, { code: string; id: number; name: string; }>();
	for (const b of brands as any[]) {
		brandMap.set(b.code, { code: b.code, id: b.id, name: b.name });
	}
	const categoryMap = new Map<string, { code: string; id: number; name: string; }>();
	for (const c of categories as any[]) {
		categoryMap.set(c.code, { code: c.code, id: c.id, name: c.name });
	}
	// Brute-force all pairs using getCategoriesByBrand for each brand
	const mappings: any[] = [];
	for (const b of brands as any[]) {
		const cats = await assetModel.getCategoriesByBrand(b.code);
		const catArr = Array.isArray(cats) ? cats : [];
		for (const c of catArr) {
			let catCode = '';
			if (typeof c === 'object' && c !== null) {
				// Try to extract category_code from known RowDataPacket structure
				if ('category_code' in c && typeof c.category_code === 'string') {
					catCode = c.category_code;
				} else if ('code' in c && typeof c.code === 'string') {
					catCode = c.code;
				}
			} else if (typeof c === 'string') {
				catCode = c;
			}
			if (!catCode) continue;
			mappings.push({
				brand: brandMap.get(b.code) || { code: b.code },
				category: categoryMap.get(catCode) || { code: catCode }
			});
		}
	}
	res.json({ data: mappings, status: 'success' });
};

/* =========== MODELS =========== */
export const getModels = async (req: Request, res: Response) => {
	// Support ?type={type_id} param (optional)
	let typeId: number | undefined = undefined;
	if (typeof req.query.type === 'string' && req.query.type !== '' && req.query.type !== 'all') {
		const parsed = Number(req.query.type);
		if (!isNaN(parsed)) typeId = parsed;
	}

	// Support ?brand={brand_id} param (optional) - can be comma-separated
	let brandIds: number[] = [];
	if (typeof req.query.brand === 'string' && req.query.brand !== '' && req.query.brand !== 'all') {
		const ids = (req.query.brand).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		brandIds = ids;
	}

	// Fetch models from DB with optional filters (type and brand)
	const modelsRaw = await assetModel.getModels(typeId, brandIds.length > 0 ? brandIds : undefined);
	const models: any[] = Array.isArray(modelsRaw) ? modelsRaw : [];
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	const types = await assetModel.getTypes();

	// Build lookup maps for brand and category
	const brandMap = new Map<number, { id: number; name: string }>();
	for (const b of brands as any[]) {
		brandMap.set(b.id, { id: b.id, name: b.name });
	}
	const categoryMap = new Map<number, { id: number; name: string }>();
	for (const c of categories as any[]) {
		categoryMap.set(c.id, { id: c.id, name: c.name });
	}
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) {
		typeMap.set(t.id, { id: t.id, name: t.name });
	}

	// Map models to include select fields plus brand, category and type objects
	const data = (models).map((model) => {
		// remove deprecated/changed fields from response (e.g. code) and avoid exposing raw foreign keys
		const { brand_id, category_id, code, type_id, ...rest } = model;
		return {
			...rest,
			brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
			category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null,
			// attach type object from type_id
			type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null
		};
	});

	res.json({
		data,
		message: 'Models data retrieved successfully',
		status: 'success'
	});
};

export const getModelById = async (req: Request, res: Response) => {
	const row = await assetModel.getModelById(Number(req.params.id));
	if (!row) return res.status(404).json({ message: 'Model not found', status: 'error' });
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	const types = await assetModel.getTypes();
	const brandMap = new Map<number, { id: number; name: string }>();
	for (const b of brands as any[]) brandMap.set(b.id, { id: b.id, name: b.name });
	const categoryMap = new Map<number, { id: number; name: string }>();
	for (const c of categories as any[]) categoryMap.set(c.id, { id: c.id, name: c.name });
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) typeMap.set(t.id, { id: t.id, name: t.name });

	const { brand_id, category_id, code, type_id, ...rest } = row as any;
	const data = {
		...rest,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null
	};
	res.json({ data, message: 'Model retrieved successfully', status: 'success' });
};

export const createModel = async (req: Request, res: Response) => {
	const data = req.body;
	if (req.file) {
		// Construct a web-accessible path.
		// This assumes the 'uploads' directory is served statically.
		data.image_url = `/uploads/models/${req.file.filename}`;
		// keep legacy field name and also provide `image` for model insertion
		data.image = data.image_url;
	}
	const result = await assetModel.createModel(data);
	const insertId = (result as any)?.insertId || (result as any)?.insert_id || null;
	// Fetch created row and map to response shape
	const row = insertId ? await assetModel.getModelById(Number(insertId)) : null;
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	const types = await assetModel.getTypes();
	const brandMap = new Map<number, { id: number; name: string }>();
	for (const b of brands as any[]) brandMap.set(b.id, { id: b.id, name: b.name });
	const categoryMap = new Map<number, { id: number; name: string }>();
	for (const c of categories as any[]) categoryMap.set(c.id, { id: c.id, name: c.name });
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) typeMap.set(t.id, { id: t.id, name: t.name });
	const { brand_id, category_id, code, type_id, ...rest } = row as any;
	const mapped = {
		...rest,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null
	};
	res.status(201).json({ data: { id: insertId, ...mapped }, message: 'Model created successfully', status: 'success' });
};

export const updateModel = async (req: Request, res: Response) => {
	const { id } = req.params;
	const data = req.body;
	if (req.file) {
		data.image_url = `/uploads/models/${req.file.filename}`;
		data.image = data.image_url;
	}
	await assetModel.updateModel(Number(id), data);
	// return updated mapped row
	const row = await assetModel.getModelById(Number(id));
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	const types = await assetModel.getTypes();
	const brandMap = new Map<number, { id: number; name: string }>();
	for (const b of brands as any[]) brandMap.set(b.id, { id: b.id, name: b.name });
	const categoryMap = new Map<number, { id: number; name: string }>();
	for (const c of categories as any[]) categoryMap.set(c.id, { id: c.id, name: c.name });
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) typeMap.set(t.id, { id: t.id, name: t.name });
	const { brand_id, category_id, code, type_id, ...rest } = row as any;
	const mapped = {
		...rest,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null
	};
	res.json({ data: { id: Number(id), ...mapped }, message: 'Model updated successfully', status: 'success' });
};

export const deleteModel = async (req: Request, res: Response) => {
	const modelId = Number(req.params.id);
	
	// Check if model exists in assets table
	const assetCount = await assetModel.checkModelInAssets(modelId);
	if (assetCount > 0) {
		return res.status(400).json({
			status: 'error',
			message: `Cannot delete model. This model is currently used by ${assetCount} asset(s).`,
			data: null
		});
	}
	
	const result = await assetModel.deleteModel(modelId);
	res.json({
		status: 'success',
		message: 'Model deleted successfully',
		data: result
	});
};


/* ASSETS */
// Helper type guard for RowDataPacket with asset_id and ramco_id (used by getAssetById)
function isOwnershipRow(obj: any): obj is { asset_id: number; effective_date?: string; ramco_id: string; } {
	return obj && typeof obj === 'object' && 'asset_id' in obj && 'ramco_id' in obj;
}


/* =========== COSTCENTERS =========== */
export const getCostcenters = async (req: Request, res: Response) => {
	const rows = await assetModel.getCostcenters();
	res.json({
		data: rows,
		message: 'Costcenters data retrieved successfully',
		status: 'success'
	});
};

export const getCostcenterById = async (req: Request, res: Response) => {
	const row = await assetModel.getCostcenterById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Costcenter data retrieved successfully',
		status: 'success'
	});
};

export const createCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.createCostcenter(req.body);
	res.json({
		message: 'Costcenter created successfully',
		result,
		status: 'success'
	});
};

export const updateCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.updateCostcenter(Number(req.params.id), req.body);
	res.json({
		message: 'Costcenter updated successfully',
		result,
		status: 'success'
	});
};

export const deleteCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.deleteCostcenter(Number(req.params.id));
	res.json({
		message: 'Costcenter deleted successfully',
		result,
		status: 'success'
	});
};


/* =========== DEPARTMENTS =========== */
export const getDepartments = async (req: Request, res: Response) => {
	const rows = await assetModel.getDepartments();
	res.json({
		data: rows,
		message: 'Departments data retrieved successfully',
		status: 'success'
	});
};

export const getDepartmentById = async (req: Request, res: Response) => {
	const row = await assetModel.getDepartmentById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Department data retrieved successfully',
		status: 'success'
	});
};

export const createDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.createDepartment(req.body);
	res.json({
		message: 'Department created successfully',
		result,
		status: 'success'
	});
};

export const updateDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.updateDepartment(Number(req.params.id), req.body);
	res.json({
		message: 'Department updated successfully',
		result,
		status: 'success'
	});
};

export const deleteDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.deleteDepartment(Number(req.params.id));
	res.json({
		message: 'Department deleted successfully',
		result,
		status: 'success'
	});
};


/* =========== SECTIONS =========== */
export const getSections = async (req: Request, res: Response) => {
	const sections = await assetModel.getSections();
	const departments = await assetModel.getDepartments();
	const departmentMap = new Map<number, { id: number; name: string }>();
	for (const d of departments as any[]) {
		departmentMap.set(d.id, { id: d.id, name: d.name });
	}
	const data = (sections as any[]).map((section) => ({
		department: section.department_id ? departmentMap.get(section.department_id) || null : null,
		id: section.id,
		name: section.name
	}));
	res.json({
		data,
		message: 'Sections data retrieved successfully',
		status: 'success'
	});
};

export const getSectionById = async (req: Request, res: Response) => {
	const section = await assetModel.getSectionById(Number(req.params.id));
	if (!section) {
		return res.status(404).json({ message: 'Section not found', status: 'error' });
	}
	let department = null;
	if (section.department_id) {
		const dep = await assetModel.getDepartmentById(section.department_id);
		if (dep) department = { id: dep.id, name: dep.name };
	}
	res.json({
		data: {
			department,
			id: section.id,
			name: section.name
		},
		message: 'Section data retrieved successfully',
		status: 'success'
	});
};

export const createSection = async (req: Request, res: Response) => {
	// Accept frontend payload with departmentId, map to department_id
	const { departmentId, name } = req.body;
	const result = await assetModel.createSection({
		department_id: departmentId,
		name
	});
	res.json({
		message: 'Section created successfully',
		result,
		status: 'success'
	});
};

export const updateSection = async (req: Request, res: Response) => {
	// Accept frontend payload with departmentId, map to department_id
	const { departmentId, name } = req.body;
	const result = await assetModel.updateSection(Number(req.params.id), {
		department_id: departmentId,
		name
	});
	res.json({
		message: 'Section updated successfully',
		result,
		status: 'success'
	});
};

export const deleteSection = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSection(Number(req.params.id));
	res.json({
		message: 'Section deleted successfully',
		result,
		status: 'success'
	});
};

/* =========== LOCATIONS =========== */
export const getLocations = async (req: Request, res: Response) => {
	// Fetch all locations
	const locations = await assetModel.getLocations();
	if (!Array.isArray(locations)) {
		return res.status(500).json({ message: 'Failed to fetch locations', status: 'error' });
	}
	res.json({ data: locations, message: 'Locations retrieved successfully', status: 'success' });
}

/* =========== DISTRICTS =========== */
export const getDistricts = async (req: Request, res: Response) => {
	const districts = await assetModel.getDistricts();
	const zoneDistricts = await assetModel.getAllZoneDistricts();
	const zones = await assetModel.getZones();
	// Build zone map with code
	const zoneMap = new Map<number, { code: string; id: number; name: string; }>();
	for (const z of zones as any[]) {
		zoneMap.set(z.id, { code: z.code, id: z.id, name: z.name });
	}
	const districtToZone = new Map<number, number>();
	for (const zd of zoneDistricts as any[]) {
		districtToZone.set(zd.district_id, zd.zone_id);
	}
	const data = (districts as any[]).map((d) => ({
		code: d.code,
		id: d.id,
		name: d.name,
		zone: zoneMap.get(districtToZone.get(d.id)!) || null
	}));
	res.json({ data, message: 'Districts data retrieved successfully', status: 'success' });
};

export const getDistrictById = async (req: Request, res: Response) => {
	const row = await assetModel.getDistrictById(Number(req.params.id));
	res.json({ data: row, message: 'District data retrieved successfully', status: 'success' });
};

export const createDistrict = async (req: Request, res: Response) => {
	const { code, name, zone_id } = req.body;
	// Create the district
	const result = await assetModel.createDistrict({ code, name });
	// Get the new district's id
	const districtId = (result as any).insertId;
	// If zone_id is provided, create the join
	if (zone_id) {
		await assetModel.addDistrictToZone(zone_id, districtId);
	}
	res.json({ message: 'District created successfully', result, status: 'success' });
};

export const updateDistrict = async (req: Request, res: Response) => {
	const { code, name, zone_id } = req.body;
	const districtId = Number(req.params.id);
	// Update the district
	const result = await assetModel.updateDistrict(districtId, { code, name });
	// Remove all previous zone links for this district
	await assetModel.removeAllZonesFromDistrict(districtId);
	// Add new zone link if provided
	if (zone_id) {
		await assetModel.addDistrictToZone(zone_id, districtId);
	}
	res.json({ message: 'District updated successfully', result, status: 'success' });
};

export const deleteDistrict = async (req: Request, res: Response) => {
	const districtId = Number(req.params.id);
	// Remove all zone links for this district
	await assetModel.removeAllZonesFromDistrict(districtId);
	// Delete the district
	const result = await assetModel.deleteDistrict(districtId);
	res.json({ message: 'District deleted successfully', result, status: 'success' });
};


/* =========== SITES =========== */
export const getSites = async (req: Request, res: Response) => {
	// Fetch all sites
	let sites: any[] = [];
	const sitesRaw = await assetModel.getSites();
	if (Array.isArray(sitesRaw)) {
		sites = sitesRaw;
	} else if (sitesRaw && typeof sitesRaw === 'object' && 'length' in sitesRaw) {
		sites = Array.from(sitesRaw as any);
	}
	// Fetch all related data for mapping
	const assets = Array.isArray(await assetModel.getAssets()) ? await assetModel.getAssets() : [];
	const types = Array.isArray(await assetModel.getTypes()) ? await assetModel.getTypes() as any[] : [];
	const categories = Array.isArray(await assetModel.getCategories()) ? await assetModel.getCategories() as any[] : [];
	const brands = Array.isArray(await assetModel.getBrands()) ? await assetModel.getBrands() as any[] : [];
	const models = Array.isArray(await assetModel.getModels()) ? await assetModel.getModels() as any[] : [];
	const modules = Array.isArray(await assetModel.getModules()) ? await assetModel.getModules() as any[] : [];
	const districts = Array.isArray(await assetModel.getDistricts()) ? await assetModel.getDistricts() as any[] : [];

	// Build lookup maps
	const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
	const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
	const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
	const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
	const moduleMap = new Map(modules.map((m: any) => [m.id, { id: m.id, name: m.code }]));
	const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));
	const assetMap = new Map(assets.map((a: any) => [a.id, a]));

	// Format each site
	const data = sites.map((site: any) => {
		// Asset nesting
		let asset = null;
		if (site.asset_id && assetMap.has(site.asset_id)) {
			const a: any = assetMap.get(site.asset_id);
			asset = {
				brand: brandMap.get(a.brand_id) || null,
				category: categoryMap.get(a.category_id) || null,
				id: a.id,
				model: modelMap.get(a.model_id) || null,
				serial_no: a.register_number,
				type: typeMap.get(a.type_id) || null
			};
		}
		// Module nesting
		const module = site.module_id ? moduleMap.get(site.module_id) || null : null;
		// District nesting
		const district = site.district_id ? districtMap.get(site.district_id) || null : null;
		// Geocode
		let geocode = null;
		if (site.lat !== undefined && site.lon !== undefined) {
			geocode = { lat: site.lat, lon: site.lon };
		}
		return {
			address: site.address,
			address2: site.address2,
			agency: site.agency,
			area: site.area,
			asset,
			assign_to: site.assign_to,
			attended_onsite_date: site.attended_onsite_date,
			boundary_coordinate: site.boundary_coordinate,
			cp_baseline: site.cp_baseline,
			date_created: site.date_created,
			db_id: site.db_id,
			dirname: site.dirname,
			district_id: district,
			dmafull: site.dmafull,
			dmz_baseline: site.dmz_baseline,
			dmz_type: site.dmz_type,
			eit_certificate: site.eit_certificate,
			geocode,
			id: site.id,
			last_upload: site.last_upload,
			main_site_code: site.main_site_code,
			max_mnf: site.max_mnf,
			min_mnf: site.min_mnf,
			mnf_baseline: site.mnf_baseline,
			module,
			monitoring_group: site.monitoring_group,
			nnf_baseline: site.nnf_baseline,
			notes: site.notes,
			operational_certificate: site.operational_certificate,
			remarks: site.remarks,
			site_category: site.site_category,
			site_certificate: site.site_certificate,
			site_code: site.site_code,
			site_name: site.site_name,
			site_picture: site.site_picture,
			site_schematic: site.site_schematic,
			site_status: site.site_status,
			team_id: site.team_id,
			team_id2: site.team_id2,
			wss_group: site.wss_group
		};
	});
	res.json({
		data,
		message: 'Sites data retrieved successfully',
		status: 'success'
	});
};

export const getSiteById = async (req: Request, res: Response) => {
	const row = await assetModel.getSiteById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Site data retrieved successfully',
		status: 'success'
	});
};

export const createSite = async (req: Request, res: Response) => {
	const result = await assetModel.createSite(req.body);
	res.json({
		message: 'Site created successfully',
		result,
		status: 'success'
	});
};

export const updateSite = async (req: Request, res: Response) => {
	const result = await assetModel.updateSite(Number(req.params.id), req.body);
	res.json({
		message: 'Site updated successfully',
		result,
		status: 'success'
	});
};

export const deleteSite = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSite(Number(req.params.id));
	res.json({
		message: 'Site deleted successfully',
		result,
		status: 'success'
	});
};

/* =========== ZONES =========== */
export const getZones = async (req: Request, res: Response) => {
	const zones = await assetModel.getZones();
	const zoneDistricts = await assetModel.getAllZoneDistricts();
	const districts = await assetModel.getDistricts();
	const employees = await assetModel.getEmployees();
	// Build district map with code
	const districtMap = new Map<number, { code: string; id: number; name: string; }>();
	for (const d of districts as any[]) {
		districtMap.set(d.id, { code: d.code, id: d.id, name: d.name });
	}
	const employeeMap = new Map<number, { id: number; name: string }>();
	for (const e of employees as any[]) {
		employeeMap.set(e.id, { id: e.id, name: e.name });
	}
	const zoneToDistricts = new Map<number, { code: string; id: number; name: string; }[]>();
	for (const zd of zoneDistricts as any[]) {
		if (!zoneToDistricts.has(zd.zone_id)) zoneToDistricts.set(zd.zone_id, []);
		const district = districtMap.get(zd.district_id);
		if (district) zoneToDistricts.get(zd.zone_id)!.push(district);
	}
	const data = (zones as any[]).map((z) => ({
		code: z.code,
		districts: zoneToDistricts.get(z.id) || [],
		employees: z.employee_id ? employeeMap.get(z.employee_id) || null : null,
		id: z.id,
		name: z.name
	}));
	res.json({ data, message: 'Zones data retrieved successfully', status: 'success' });
};

export const getZoneById = async (req: Request, res: Response) => {
	const row = await assetModel.getZoneById(Number(req.params.id));
	res.json({ data: row, message: 'Zone data retrieved successfully', status: 'success' });
};

export const createZone = async (req: Request, res: Response) => {
	const { code, districts, employee_id, name } = req.body;
	// Create the zone
	const result = await assetModel.createZone({ code, employee_id, name });
	const zoneId = (result as any).insertId;
	// Add districts to zone if provided
	if (Array.isArray(districts)) {
		for (const districtId of districts) {
			await assetModel.addDistrictToZone(zoneId, districtId);
		}
	}
	res.json({ message: 'Zone created successfully', result, status: 'success' });
};

export const updateZone = async (req: Request, res: Response) => {
	const { code, districts, employee_id, name } = req.body;
	const zoneId = Number(req.params.id);
	// Update the zone
	const result = await assetModel.updateZone(zoneId, { code, employee_id, name });
	// Remove all previous district links for this zone
	await assetModel.removeAllDistrictsFromZone(zoneId);
	// Add new district links if provided
	if (Array.isArray(districts)) {
		for (const districtId of districts) {
			await assetModel.addDistrictToZone(zoneId, districtId);
		}
	}
	res.json({ message: 'Zone updated successfully', result, status: 'success' });
};

export const deleteZone = async (req: Request, res: Response) => {
	const result = await assetModel.deleteZone(Number(req.params.id));
	res.json({ message: 'Zone deleted successfully', result, status: 'success' });
};


/* =========== EMPLOYEES =========== */
export const getEmployees = async (req: Request, res: Response) => {
	// Support ?status=active param and filters: ?cc, ?dept, ?loc (array or CSV), ?supervisor (ramco_id)
	const status = typeof req.query.status === 'string' && req.query.status !== '' ? req.query.status : undefined;
	const ccParam = req.query.cc;
	const deptParam = req.query.dept;
	const locParam = req.query.loc;
	const supervisorParam = req.query.supervisor;
	const ramcoParam = req.query.ramco;
	const posParam = req.query.pos;

	// Helper to normalize possible array/CSV/string/number into array
	const normalizeArr = (v: any): string[] | undefined => {
		if (v === undefined || v === null) return undefined;
		if (Array.isArray(v)) return v.map((x: any) => String(x).trim()).filter(Boolean);
		if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
		if (typeof v === 'number') return [String(v)];
		return undefined;
	};

	const cc = normalizeArr(ccParam);
	const dept = normalizeArr(deptParam);
	const loc = normalizeArr(locParam);
	const supervisor = normalizeArr(supervisorParam);
	const ramco = normalizeArr(ramcoParam);
	const pos = normalizeArr(posParam);

	const employees = await (assetModel as any).getEmployees(status, cc, dept, loc, supervisor, ramco, pos);
	const departments = await assetModel.getDepartments();
	const positions = await assetModel.getPositions();
	const costcenters = await assetModel.getCostcenters();
	const locations = await assetModel.getLocations();

	// Build lookup maps
	const departmentMap = new Map<number, { code: string; id: number; name: string, }>();
	for (const d of departments as any[]) {
		departmentMap.set(d.id, { code: d.code, id: d.id, name: d.name });
	}
	const positionMap = new Map<number, { id: number; name: string }>();
	for (const p of positions as any[]) {
		positionMap.set(p.id, { id: p.id, name: p.name });
	}
	const costcenterMap = new Map<number, { id: number; name: string }>();
	for (const c of costcenters as any[]) {
		costcenterMap.set(c.id, { id: c.id, name: c.name });
	}
	const locationMap = new Map<number, { code?: string; id: number; name: string, }>();
	for (const l of locations as any[]) {
		locationMap.set(l.id, { code: l.code, id: l.id, name: l.name });
	}

	const data = (employees as any[]).map(emp => ({
		avatar: emp.avatar
			? (emp.avatar.startsWith('http')
				? emp.avatar
				: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
			: null,
		contact: emp.contact,
		costcenter: emp.costcenter_id ? costcenterMap.get(emp.costcenter_id) || null : null,
		department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
		dob: emp.dob,
		email: emp.email,
		employment_status: emp.employment_status,
		employment_type: emp.employment_type,
		full_name: emp.full_name,
		gender: emp.gender,
		grade: emp.grade,
		hire_date: emp.hire_date,
		id: emp.id,
		location: emp.location_id ? locationMap.get(emp.location_id) || null : null,
		position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
		ramco_id: emp.ramco_id,
		resignation_date: emp.resignation_date
	}));

	res.json({
		data,
		message: 'Employees data retrieved successfully',
		status: 'success'
	});
};

export const getEmployeeById = async (req: Request, res: Response) => {
	const emp = await assetModel.getEmployeeById(Number(req.params.id));
	if (!emp) {
		return res.status(404).json({ message: 'Employee not found', status: 'error' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;

	res.json({
		data: {
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			contact: emp.contact,
			costcenter,
			department,
			district,
			dob: emp.dob,
			email: emp.email,
			employment_status: emp.employment_status,
			employment_type: emp.employment_type,
			full_name: emp.full_name,
			gender: emp.gender,
			grade: emp.grade,
			hire_date: emp.hire_date,
			id: emp.id,
			position,
			ramco_id: emp.ramco_id,
			resignation_date: emp.resignation_date
		},
		message: 'Employee data retrieved successfully',
		status: 'success'
	});
};

export const getEmployeeByRamco = async (req: Request, res: Response) => {
	const ramcoId = req.params.ramco_id as string;
	const emp = await assetModel.getEmployeeByRamco(ramcoId);
	if (!emp) {
		return res.status(404).json({ message: 'Employee not found', status: 'error' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		data: {
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			contact: emp.contact,
			costcenter,
			department,
			district,
			dob: emp.dob,
			email: emp.email,
			employment_status: emp.employment_status,
			employment_type: emp.employment_type,
			full_name: emp.full_name,
			gender: emp.gender,
			grade: emp.grade,
			hire_date: emp.hire_date,
			id: emp.id,
			position,
			ramco_id: emp.ramco_id,
			resignation_date: emp.resignation_date
		},
		message: 'Employee data retrieved successfully',
		status: 'success'
	});
}

export const getEmployeeByEmail = async (req: Request, res: Response) => {
	const email = req.params.email as string;
	const emp = await assetModel.getEmployeeByEmail(email);
	if (!emp) {
		return res.status(404).json({ message: 'Employee not found', status: 'error' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		data: {
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			contact: emp.contact,
			costcenter,
			department,
			district,
			dob: emp.dob,
			email: emp.email,
			employment_status: emp.employment_status,
			employment_type: emp.employment_type,
			full_name: emp.full_name,
			gender: emp.gender,
			grade: emp.grade,
			hire_date: emp.hire_date,
			id: emp.id,
			position,
			ramco_id: emp.ramco_id,
			resignation_date: emp.resignation_date
		},
		message: 'Employee data retrieved successfully',
		status: 'success'
	});
}

export const getEmployeeByContact = async (req: Request, res: Response) => {
	const email = req.params.email as string;
	const emp = await assetModel.getEmployeeByEmail(email);
	if (!emp) {
		return res.status(404).json({ message: 'Employee not found', status: 'error' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		data: {
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			contact: emp.contact,
			costcenter,
			department,
			district,
			dob: emp.dob,
			email: emp.email,
			employment_status: emp.employment_status,
			employment_type: emp.employment_type,
			full_name: emp.full_name,
			gender: emp.gender,
			grade: emp.grade,
			hire_date: emp.hire_date,
			id: emp.id,
			position,
			ramco_id: emp.ramco_id,
			resignation_date: emp.resignation_date
		},
		message: 'Employee data retrieved successfully',
		status: 'success'
	});
}

export const createEmployee = async (req: Request, res: Response) => {
	try {
		const {
			avatar,
			contact,
			costcenter_id,
			department_id,
			dob,
			email,
			employment_status,
			employment_type,
			full_name,
			gender,
			grade,
			hire_date,
			location_id,
			position_id,
			ramco_id,
			resignation_date
		} = req.body;

		// Validate required fields
		if (!full_name || !email) {
			return res.status(400).json({
				message: 'full_name and email are required',
				status: 'error'
			});
		}

		const result = await assetModel.createEmployee({
			avatar,
			contact,
			costcenter_id,
			department_id,
			dob,
			email,
			employment_status,
			employment_type,
			full_name,
			gender,
			grade,
			hire_date,
			location_id,
			position_id,
			ramco_id,
			resignation_date
		});
		res.json({
			message: 'Employee created successfully',
			result,
			status: 'success'
		});
	} catch (error) {
		console.error('createEmployee error:', error);
		return res.status(500).json({
			error: process.env.NODE_ENV === 'development' ? error : undefined,
			message: error instanceof Error ? error.message : 'Failed to create employee',
			status: 'error'
		});
	}
};

export const updateEmployee = async (req: Request, res: Response) => {
	const {
		avatar,
		contact,
		costcenter_id,
		department_id,
		dob,
		email,
		employment_status,
		employment_type,
		full_name,
		gender,
		grade,
		hire_date,
		location_id,
		position_id,
		ramco_id,
		resignation_date,
	} = req.body;
	const result = await assetModel.updateEmployee(Number(req.params.id), {
		avatar,
		contact,
		costcenter_id,
		department_id,
		dob,
		email,
		employment_status,
		employment_type,
		full_name,
		gender,
		grade,
		hire_date,
		location_id,
		position_id,
		ramco_id,
		resignation_date
	});
	res.json({
		message: 'Employee updated successfully',
		result,
		status: 'success'
	});
};

export const deleteEmployee = async (req: Request, res: Response) => {
	const result = await assetModel.deleteEmployee(Number(req.params.id));
	res.json({
		message: 'Employee deleted successfully',
		result,
		status: 'success'
	});
};

// PUT /api/assets/employees/update-resign
// Body: { ramco_id: string[] | string, resignation_date: string (yyyy-mm-dd), employment_status?: string }
export const updateEmployeeResignation = async (req: Request, res: Response) => {
	const { employment_status, ramco_id, resignation_date } = req.body || {};

	// Normalize ramco_id(s)
	let ids: string[] = [];
	if (Array.isArray(ramco_id)) {
		ids = ramco_id.map((v: any) => String(v).trim()).filter(Boolean);
	} else if (typeof ramco_id === 'string') {
		// Accept CSV string as well
		ids = ramco_id.split(',').map(s => s.trim()).filter(Boolean);
	}

	if (ids.length === 0 || typeof resignation_date !== 'string' || resignation_date.trim() === '') {
		return res.status(400).json({ data: null, message: 'ramco_id[] and resignation_date are required', status: 'error' });
	}

	// Default to 'resigned' if not provided
	const status = typeof employment_status === 'string' && employment_status.trim() !== ''
		? employment_status
		: 'resigned';

	const result = await (assetModel as any).updateEmployeesResignation(ids, resignation_date, status);
	const affected = (result && typeof result === 'object' && 'affectedRows' in result) ? (result).affectedRows : 0;
	res.json({
		data: { affected },
		message: `Updated resignation details for ${affected} employee(s)`,
		status: 'success'
	});
};

// GET /employees/search?q=term
export const searchEmployees = async (req: Request, res: Response) => {
	const qRaw = (req.query.q || '').toString().trim();
	if (!qRaw || qRaw.length < 2) {
		return res.json({ data: [], message: 'Query too short', status: 'success' });
	}
	const employees = await assetModel.searchEmployeesAutocomplete(qRaw);
	const data = Array.isArray(employees)
		? employees
			.map((emp: any) => {
				const ramco_id = emp?.ramco_id ? String(emp.ramco_id).trim() : '';
				const full_name = emp?.full_name ? String(emp.full_name).trim() : '';
				if (!ramco_id || !full_name) return null;

				const makeRef = (idVal: any, nameVal: any) => {
					if (idVal === null || idVal === undefined) return null;
					const numId = Number(idVal);
					const id = Number.isNaN(numId) ? idVal : numId;
					const name = nameVal !== undefined && nameVal !== null ? String(nameVal) : null;
					return { id, name };
				};

				return {
					costcenter: makeRef(emp.costcenter_id, emp.costcenter_name),
					department: makeRef(emp.department_id, emp.department_name),
					full_name,
					location: makeRef(emp.location_id, emp.location_name),
					position: makeRef(emp.position_id, emp.position_name),
					ramco_id
				};
			})
			.filter(Boolean)
		: [];
	res.json({ data, message: 'Employee search results', status: 'success' });
};

// Lookup employee by ramco_id, email, or contact
export const getEmployeeByUsername = async (req: Request, res: Response) => {
	const username = req.params.username as string;
	let emp = null;
	// Try ramco_id (all digits or leading zeros)
	if (/^\d{5,}$/.test(username) || /^0+\d+$/.test(username)) {
		emp = await assetModel.getEmployeeByRamco(username);
	}
	// Try email
	if (!emp && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(username)) {
		emp = await assetModel.getEmployeeByEmail(username);
	}
	// Try contact (all digits, length >= 7)
	if (!emp && /^\d{7,}$/.test(username)) {
		emp = await assetModel.getEmployeeByContact(Number(username));
	}
	if (!emp) {
		return res.status(404).json({ message: 'Employee not found', status: 'error' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const location = emp.location_id ? await assetModel.getLocationById(emp.location_id) : null;

	// Limit nested objects to specific fields as requested
	const departmentResp = department
		? { code: (department as any).code ?? null, id: department.id, name: department.name ?? null }
		: null;
	const costcenterResp = costcenter
		? { id: costcenter.id, name: costcenter.name ?? null }
		: null;
	const locationResp = location
		? { code: (location as any).code ?? null, id: location.id, name: location.name ?? null }
		: null;
	res.json({
		data: {
			avatar: emp.avatar,
			contact: emp.contact,
			costcenter: costcenterResp,
			department: departmentResp,
			dob: emp.dob,
			email: emp.email,
			employment_status: emp.employment_status,
			employment_type: emp.employment_type,
			full_name: emp.full_name,
			gender: emp.gender,
			grade: emp.grade,
			hire_date: emp.hire_date,
			id: emp.id,
			location: locationResp,
			position,
			ramco_id: emp.ramco_id,
			resignation_date: emp.resignation_date
		},
		message: 'Employee data retrieved successfully',
		status: 'success'
	});
};


/* =========== POSITIONS =========== */
export const getPositions = async (req: Request, res: Response) => {
	const rows = await assetModel.getPositions();
	res.json({
		data: rows,
		message: 'Positions data retrieved successfully',
		status: 'success'
	});
};

export const getPositionById = async (req: Request, res: Response) => {
	const row = await assetModel.getPositionById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Position data retrieved successfully',
		status: 'success'
	});
};

export const createPosition = async (req: Request, res: Response) => {
	const result = await assetModel.createPosition(req.body);
	res.json({
		message: 'Position created successfully',
		result,
		status: 'success'
	});
};

export const updatePosition = async (req: Request, res: Response) => {
	const result = await assetModel.updatePosition(Number(req.params.id), req.body);
	res.json({
		message: 'Position updated successfully',
		result,
		status: 'success'
	});
};

export const deletePosition = async (req: Request, res: Response) => {
	const result = await assetModel.deletePosition(Number(req.params.id));
	res.json({
		message: 'Position deleted successfully',
		result,
		status: 'success'
	});
};




// MODULES
export const getModules = async (req: Request, res: Response) => {
	const rows = await assetModel.getModules();
	res.json({
		data: rows,
		message: 'Modules data retrieved successfully',
		status: 'success'
	});
};
export const getModuleById = async (req: Request, res: Response) => {
	const row = await assetModel.getModuleById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Module data retrieved successfully',
		status: 'success'
	});
};
export const createModule = async (req: Request, res: Response) => {
	const { code, name } = req.body;
	const result = await assetModel.createModule({ code, name });
	res.json({
		message: 'Module created successfully',
		result,
		status: 'success'
	});
};
export const updateModule = async (req: Request, res: Response) => {
	const { code, name } = req.body;
	const result = await assetModel.updateModule(Number(req.params.id), { code, name });
	res.json({
		message: 'Module updated successfully',
		result,
		status: 'success'
	});
};
export const deleteModule = async (req: Request, res: Response) => {
	const result = await assetModel.deleteModule(Number(req.params.id));
	res.json({
		message: 'Module deleted successfully',
		result,
		status: 'success'
	});
};


// SOFTWARES
export const getSoftwares = async (req: Request, res: Response) => {
	const rows = await assetModel.getSoftwares();
	res.json({
		data: rows,
		message: 'Softwares data retrieved successfully',
		status: 'success'
	});
};

export const getSoftwareById = async (req: Request, res: Response) => {
	const row = await assetModel.getSoftwareById(Number(req.params.id));
	res.json({
		data: row,
		message: 'Software data retrieved successfully',
		status: 'success'
	});
};

export const createSoftware = async (req: Request, res: Response) => {
	const { name } = req.body;
	const result = await assetModel.createSoftware({ name });
	res.status(201).json({
		message: 'Software created successfully',
		result,
		status: 'success'
	});
};

export const updateSoftware = async (req: Request, res: Response) => {
	const { name } = req.body;
	const result = await assetModel.updateSoftware(Number(req.params.id), { name });
	res.json({
		message: 'Software updated successfully',
		result,
		status: 'success'
	});
};

export const deleteSoftware = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSoftware(Number(req.params.id));
	res.json({
		message: 'Software deleted successfully',
		result,
		status: 'success'
	});
};


/* ============ ASSET TRANSFER REQUESTS ============ */
export const getAssetTransfers = async (req: Request, res: Response) => {
	// Fetch all transfer requests with their items
	const requests = await assetModel.getAssetTransfers();
	const reqArr = Array.isArray(requests) ? (requests as any[]) : [];

	// Optional filter by ?ramco=<username> or ?new_owner=<ramco_id>
	// Include requests where (transfer_by == ramco) OR (any item.new_owner == ramco)
	const ramcoParam = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : '';
	const newOwnerParam = typeof req.query.new_owner === 'string' ? req.query.new_owner.trim() : '';
	const filterRamcoId = ramcoParam || newOwnerParam; // use either ramco or new_owner param
	// Additional filters: ?dept=<department_id>&status=<pending|approved>
	const deptParamRaw = typeof req.query.dept === 'string' ? req.query.dept.trim() : '';
	const deptParam = deptParamRaw && /^\d+$/.test(deptParamRaw) ? Number(deptParamRaw) : null;
	const statusParamRaw = typeof req.query.status === 'string' ? req.query.status.trim() : '';
	const statusParam = statusParamRaw ? statusParamRaw.toLowerCase() : '';

	// Build lookup for employees referenced by transfer_by
	const transferBySet = new Set<string>();
	for (const r of reqArr) {
		if (r.transfer_by) transferBySet.add(String(r.transfer_by));
	}

	// Fetch employees, costcenters, departments for enrichment (in parallel)
	const [employeesRaw, costcentersRaw, departmentsRaw] = await Promise.all([
		assetModel.getEmployees(),
		assetModel.getCostcenters(),
		assetModel.getDepartments()
	]);
	const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
	const empMap = new Map<string, any>(employees.map((e: any) => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>(costcenters.map((c: any) => [Number(c.id), c]));
	const departmentMap = new Map<number, any>(departments.map((d: any) => [Number(d.id), d]));

	// Get item counts per request (total_items) and cache items for minimal enrichment
	// Build for ALL requests first so we can filter by new_owner when ramcoParam is present
	const countsMap = new Map<number, number>();
	const itemsMap = new Map<number, any[]>();
	await Promise.all(
		reqArr.map(async (r: any) => {
			try {
				const itemsRaw = await assetModel.getAssetTransferItemByRequestId(r.id);
				const arr = Array.isArray(itemsRaw) ? (itemsRaw as any[]) : [];
				countsMap.set(r.id, arr.length);
				itemsMap.set(r.id, arr);
			} catch {
				countsMap.set(r.id, 0);
				itemsMap.set(r.id, []);
			}
		})
	);

	// Start with ramco filter (if provided): include requests where transfer_by matches OR any item's new_owner matches
	let filteredReqArr = filterRamcoId
		? reqArr.filter((r: any) => {
			if (String(r.transfer_by) === filterRamcoId) return true;
			const itemsForReq = itemsMap.get(r.id) || [];
			return itemsForReq.some((it: any) => String(it.new_owner) === filterRamcoId);
		})
		: reqArr;

	// Apply department filter if deptParam is a valid numeric id
	if (deptParam !== null) {
		filteredReqArr = filteredReqArr.filter((r: any) => Number(r.department_id) === deptParam);
	}

	// Apply transfer status filter if provided (exact match lowercase)
	if (statusParam) {
		if (statusParam === 'pending') {
			filteredReqArr = filteredReqArr.filter((r: any) => !r.approved_date && !r.approved_by);
		} else if (statusParam === 'approved') {
			filteredReqArr = filteredReqArr.filter((r: any) => r.approved_date && r.approved_by);
		} else {
			// fallback to matching transfer_status for any other status values
			filteredReqArr = filteredReqArr.filter((r: any) => String(r.transfer_status || '').toLowerCase() === statusParam);
		}
	}

	if (filteredReqArr.length === 0) {
		return res.json({ data: [], message: 'Asset transfer requests retrieved successfully', status: 'success' });
	}

	// Collect lookup IDs from items for filtered requests to enrich nested structures
	const allItemsForFiltered: any[] = filteredReqArr.flatMap((r: any) => itemsMap.get(r.id) || []);
	const assetIdsSet = new Set<number>();
	const typeIdsSet = new Set<number>();
	const locationIdsSet = new Set<number>();
	for (const it of allItemsForFiltered) {
		if (typeof it.asset_id === 'number') assetIdsSet.add(Number(it.asset_id));
		if (typeof it.type_id === 'number') typeIdsSet.add(Number(it.type_id));
		if (typeof it.current_location_id === 'number') locationIdsSet.add(Number(it.current_location_id));
		if (typeof it.new_location_id === 'number') locationIdsSet.add(Number(it.new_location_id));
	}

	// Fetch assets, types, categories, brands, models, locations in parallel
	const [assetsRaw, typesRaw, categoriesRaw, brandsRaw, modelsRaw, locationsRaw] = await Promise.all([
		Promise.all(Array.from(assetIdsSet).map(id => assetModel.getAssetById(id))).catch(() => []),
		assetModel.getTypes().catch(() => []),
		assetModel.getCategories().catch(() => []),
		assetModel.getBrands().catch(() => []),
		assetModel.getModels().catch(() => []),
		assetModel.getLocations().catch(() => [])
	]);
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const categoryMap = new Map<number, any>((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [Number(c.id), c]));
	const brandMap = new Map<number, any>((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [Number(b.id), b]));
	const modelMap = new Map<number, any>((Array.isArray(modelsRaw) ? modelsRaw : []).map((m: any) => [Number(m.id), m]));
	const locationMap = new Map<number, any>((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));

	const data = filteredReqArr.map((r: any) => {
		const approval_status = (r.approved_date && r.approved_by) ? 'approved' : 'pending';
		const emp = empMap.get(String(r.transfer_by));
		const transfer_by_obj = emp ? {
			full_name: emp.full_name || emp.name || null,
			ramco_id: emp.ramco_id,
		} : null;
		const cc = r.costcenter_id != null ? costcenterMap.get(Number(r.costcenter_id)) : null;
		const dept = r.department_id != null ? departmentMap.get(Number(r.department_id)) : null;
		const costcenter = cc ? { id: Number(cc.id), name: cc.name || null } : null;
		const department = dept ? { code: dept.code || null, id: Number(dept.id) } : null;
		// Raw items for this request
		const itemsRawForReq = itemsMap.get(r.id) || [];
		// Build new_owner array from items (legacy quick view)
		const new_owner = itemsRawForReq
			.map((it: any, idx: number) => {
				if (!it.new_owner) return null;
				const newOwnerEmp = empMap.get(String(it.new_owner));
				return {
					[`item_${idx + 1}`]: it.id,
					full_name: newOwnerEmp?.full_name || newOwnerEmp?.name || null,
					ramco_id: newOwnerEmp?.ramco_id || String(it.new_owner),
				};
			})
			.filter((v: any) => v !== null);
		// Enrich items structure as requested
		const enrichedItems = itemsRawForReq.map((it: any) => {
			// Lookups
			const assetObj = typeof it.asset_id === 'number' ? assetMap.get(Number(it.asset_id)) : null;
			// Resolve owners
			const currOwnerEmp = it.current_owner ? empMap.get(String(it.current_owner)) : null;
			const newOwnerEmp = it.new_owner ? empMap.get(String(it.new_owner)) : null;
			const currCC = typeof it.current_costcenter_id === 'number' ? costcenterMap.get(Number(it.current_costcenter_id)) : null;
			const newCC = typeof it.new_costcenter_id === 'number' ? costcenterMap.get(Number(it.new_costcenter_id)) : null;
			const currDept = typeof it.current_department_id === 'number' ? departmentMap.get(Number(it.current_department_id)) : null;
			const newDept = typeof it.new_department_id === 'number' ? departmentMap.get(Number(it.new_department_id)) : null;
			// Locations names
			const currLocRow = typeof it.current_location_id === 'number' ? locationMap.get(Number(it.current_location_id)) : null;
			const newLocRow = typeof it.new_location_id === 'number' ? locationMap.get(Number(it.new_location_id)) : null;
			// Asset nested with type/category/brand/model
			const assetNested = assetObj
				? {
					brand: (() => {
						const b = brandMap.get(Number(assetObj.brand_id));
						return b ? { id: Number(b.id), name: b.name || null } : (assetObj.brand_id ? { id: Number(assetObj.brand_id), name: null } : null);
					})(),
					category: (() => {
						const c = categoryMap.get(Number(assetObj.category_id));
						return c ? { id: Number(c.id), name: c.name || null } : (assetObj.category_id ? { id: Number(assetObj.category_id), name: null } : null);
					})(),
					id: assetObj.id,
					model: (() => {
						const m = modelMap.get(Number(assetObj.model_id));
						return m ? { id: Number(m.id), name: m.name || null } : (assetObj.model_id ? { id: Number(assetObj.model_id), name: null } : null);
					})(),
					register_number: assetObj.register_number || null,
					type: (() => {
						const t = typeMap.get(Number(assetObj.type_id));
						return t ? { id: Number(t.id), name: t.name || null } : (assetObj.type_id ? { id: Number(assetObj.type_id), name: null } : null);
					})()
				}
				: (it.asset_id ? { brand: null, category: null, id: it.asset_id, model: null, register_number: null, type: it.type_id ? { id: it.type_id, name: null } : null } : null);
			return {
				acceptance_attachments: it.acceptance_attachments || null,
				acceptance_by: it.acceptance_by || null,
				acceptance_checklist_items: it.acceptance_checklist_items || null,
				acceptance_date: it.acceptance_date || null,
				acceptance_remarks: it.acceptance_remarks || null,
				asset: assetNested,
				attachment: it.attachment,
				created_at: it.created_at,
				current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof it.current_costcenter_id === 'number' ? { id: it.current_costcenter_id, name: null } : null),
				current_department: currDept ? { code: currDept.code || null, id: currDept.id } : (typeof it.current_department_id === 'number' ? { code: null, id: it.current_department_id } : null),
				current_location: currLocRow ? { id: currLocRow.id, name: currLocRow.name || null } : (typeof it.current_location_id === 'number' ? { id: it.current_location_id, name: null } : null),
				current_owner: currOwnerEmp ? { full_name: currOwnerEmp.full_name || currOwnerEmp.name || null, ramco_id: currOwnerEmp.ramco_id } : (it.current_owner ? { full_name: null, ramco_id: String(it.current_owner) } : null),
				effective_date: it.effective_date,
				id: it.id,
				new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof it.new_costcenter_id === 'number' ? { id: it.new_costcenter_id, name: null } : null),
				new_department: newDept ? { code: newDept.code || null, id: newDept.id } : (typeof it.new_department_id === 'number' ? { code: null, id: it.new_department_id } : null),
				new_location: newLocRow ? { id: newLocRow.id, name: newLocRow.name || null } : (typeof it.new_location_id === 'number' ? { id: it.new_location_id, name: null } : null),
				new_owner: newOwnerEmp ? { full_name: newOwnerEmp.full_name || newOwnerEmp.name || null, ramco_id: newOwnerEmp.ramco_id } : (it.new_owner ? { full_name: null, ramco_id: String(it.new_owner) } : null),
				reason: it.reason,
				remarks: it.remarks,
				return_to_asset_manager: it.return_to_asset_manager,
				transfer_id: it.transfer_id,
				updated_at: it.updated_at
			};
		});
		return {
			approval_status,
			approved_by: r.approved_by,
			approved_date: r.approved_date,
			costcenter,
			created_at: r.created_at,
			department,
			id: r.id,
			items: enrichedItems,
			new_owner,
			total_items: countsMap.get(r.id) || 0,
			transfer_by: transfer_by_obj,
			transfer_date: r.transfer_date,
			transfer_status: r.transfer_status,
			updated_at: r.updated_at,
		};
	});

	res.json({
		data,
		message: 'Asset transfer requests retrieved successfully',
		status: 'success'
	});
};

export const getAssetTransferById = async (req: Request, res: Response) => {
	const request = await assetModel.getAssetTransferById(Number(req.params.id));
	if (!request) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	// Fetch items and lookup data for enrichment
	const [itemsRaw, employeesRaw, costcentersRaw, departmentsRaw, locationsRaw] = await Promise.all([
		assetModel.getAssetTransferItemByRequestId(request.id),
		assetModel.getEmployees(),
		assetModel.getCostcenters(),
		assetModel.getDepartments(),
		assetModel.getLocations()
	]);

	const items = Array.isArray(itemsRaw) ? itemsRaw as any[] : [];
	const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw as any[] : [];

	const empMap = new Map<string, any>(employees.map((e: any) => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>(costcenters.map((c: any) => [Number(c.id), c]));
	const departmentMap = new Map<number, any>(departments.map((d: any) => [Number(d.id), d]));
	const locationMap = new Map<number, any>(locations.map((l: any) => [Number(l.id), l]));

	const transferByEmp = request.transfer_by ? empMap.get(String(request.transfer_by)) : null;
	const transfer_by_user = transferByEmp ? {
		full_name: transferByEmp.full_name || transferByEmp.name || null,
		ramco_id: transferByEmp.ramco_id,
	} : null;

	const cc = request.costcenter_id != null ? costcenterMap.get(Number(request.costcenter_id)) : null;
	const dept = request.department_id != null ? departmentMap.get(Number(request.department_id)) : null;
	const costcenter = cc ? { id: Number(cc.id), name: cc.name || null } : null;
	const department = dept ? { code: dept.code || null, id: Number(dept.id) } : null;

	// Gather asset and type ids and fetch related lookups (assets, types, checklists by type)
	const assetIds = Array.from(new Set(items.map((it: any) => it.asset_id).filter((v: any) => typeof v === 'number')));
	const typeIds = Array.from(new Set(items.map((it: any) => it.type_id).filter((v: any) => typeof v === 'number')));
	const [assetsRaw, typesRaw, checklistsByTypeRaw] = await Promise.all([
		Promise.all(assetIds.map(id => assetModel.getAssetById(id))).catch(() => []),
		assetModel.getTypes().catch(() => []),
		Promise.all(typeIds.map(id => assetModel.getTransferChecklists(id))).catch(() => []),
	]);
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const allChecklistsFlat: any[] = Array.isArray(checklistsByTypeRaw)
		? (checklistsByTypeRaw as any[]).reduce((acc: any[], arr: any) => { if (Array.isArray(arr)) acc.push(...arr); return acc; }, [])
		: [];
	const checklistMap = new Map<number, any>(allChecklistsFlat.filter(c => c?.id).map((c: any) => [Number(c.id), c]));
	// Fetch categories/brands/models for referenced assets
	const assetsArr = (Array.isArray(assetsRaw) ? assetsRaw : []).filter((a: any) => a?.id);
	const catIds = Array.from(new Set(assetsArr.map((a: any) => a.category_id).filter((v: any) => typeof v === 'number')));
	const brandIds = Array.from(new Set(assetsArr.map((a: any) => a.brand_id).filter((v: any) => typeof v === 'number')));
	const modelIds = Array.from(new Set(assetsArr.map((a: any) => a.model_id).filter((v: any) => typeof v === 'number')));
	const [categoriesRaw, brandsRaw, modelsRaw] = await Promise.all([
		Promise.all(catIds.map(id => assetModel.getCategoryById(id))).catch(() => []),
		Promise.all(brandIds.map(id => assetModel.getBrandById(id))).catch(() => []),
		Promise.all(modelIds.map(id => assetModel.getModelById(id))).catch(() => []),
	]);
	const categoryMap = new Map<number, any>((Array.isArray(categoriesRaw) ? categoriesRaw : []).filter(Boolean).map((c: any) => [Number(c.id), c]));
	const brandMap = new Map<number, any>((Array.isArray(brandsRaw) ? brandsRaw : []).filter(Boolean).map((b: any) => [Number(b.id), b]));
	const modelMap = new Map<number, any>((Array.isArray(modelsRaw) ? modelsRaw : []).filter(Boolean).map((m: any) => [Number(m.id), m]));

	const itemsEnriched = items.map((it: any) => {
		const currOwner = it.current_owner ? empMap.get(String(it.current_owner)) : null;
		const newOwner = it.new_owner ? empMap.get(String(it.new_owner)) : null;
		const currCC = it.current_costcenter_id != null ? costcenterMap.get(Number(it.current_costcenter_id)) : null;
		const newCC = it.new_costcenter_id != null ? costcenterMap.get(Number(it.new_costcenter_id)) : null;
		const currDept = it.current_department_id != null ? departmentMap.get(Number(it.current_department_id)) : null;
		const newDept = it.new_department_id != null ? departmentMap.get(Number(it.new_department_id)) : null;
		const currLoc = it.current_location_id != null ? locationMap.get(Number(it.current_location_id)) : null;
		const newLoc = it.new_location_id != null ? locationMap.get(Number(it.new_location_id)) : null;
		const assetObj = it.asset_id != null ? assetMap.get(Number(it.asset_id)) : null;
		const typeObj = it.type_id != null ? typeMap.get(Number(it.type_id)) : null;

		// acceptance checklist mapping
		let acceptanceChecklist: any[] | null = null;
		const rawChecklistVal = (it).acceptance_checklist_items;
		if (rawChecklistVal != null) {
			let ids: number[] = [];
			if (typeof rawChecklistVal === 'string') {
				ids = rawChecklistVal.split(',').map((s: string) => Number(s.trim())).filter(n => Number.isFinite(n));
			} else if (Array.isArray(rawChecklistVal)) {
				ids = rawChecklistVal.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
			}
			if (ids.length) {
				acceptanceChecklist = ids.map(id => checklistMap.get(id)).filter(Boolean).map((c: any) => ({ id: c.id, item: c.item, type_id: c.type_id }));
			}
		}

		return {
			acceptance_attachments: ((): null | string[] => {
				const v = (it).acceptance_attachments;
				if (!v) return null;
				if (Array.isArray(v)) return v as string[];
				if (typeof v === 'string') { try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; } }
				return null;
			})(),
			acceptance_by: (it).acceptance_by || null,
			acceptance_checklist_items: acceptanceChecklist,
			acceptance_date: (it).acceptance_date || null,
			acceptance_remarks: (it).acceptance_remarks ?? null,
			asset: assetObj ? {
				brand: (() => {
					const bid = assetObj.brand_id != null ? Number(assetObj.brand_id) : null;
					const b = bid != null ? brandMap.get(bid) : null;
					return b ? { id: b.id, name: b.name || null } : (bid != null ? { id: bid, name: null } : null);
				})(),
				category: (() => {
					const cid = assetObj.category_id != null ? Number(assetObj.category_id) : null;
					const c = cid != null ? categoryMap.get(cid) : null;
					return c ? { id: c.id, name: c.name || null } : (cid != null ? { id: cid, name: null } : null);
				})(),
				id: assetObj.id,
				model: (() => {
					const mid = assetObj.model_id != null ? Number(assetObj.model_id) : null;
					const m = mid != null ? modelMap.get(mid) : null;
					return m ? { id: m.id, name: m.name || null } : (mid != null ? { id: mid, name: null } : null);
				})(),
				register_number: assetObj.register_number || null,
				type: (() => {
					const tid = assetObj.type_id != null ? Number(assetObj.type_id) : null;
					const t = tid != null ? typeMap.get(tid) : null;
					return t ? { id: t.id, name: t.name || null } : (tid != null ? { id: tid, name: null } : null);
				})()
			} : (it.asset_id ? { id: it.asset_id, register_number: null } : null),
			attachment: it.attachment,
			created_at: it.created_at,
			current_costcenter: currCC ? { id: Number(currCC.id), name: currCC.name || null } : (it.current_costcenter_id != null ? { id: Number(it.current_costcenter_id), name: null } : null),
			current_department: currDept ? { code: currDept.code || null, id: Number(currDept.id) } : (it.current_department_id != null ? { code: null, id: Number(it.current_department_id) } : null),
			current_location: currLoc ? { id: Number(currLoc.id), name: currLoc.name || null } : (it.current_location_id != null ? { id: Number(it.current_location_id), name: null } : null),
			current_owner: currOwner ? { full_name: currOwner.full_name || currOwner.name || null, ramco_id: currOwner.ramco_id } : (it.current_owner ? { full_name: null, ramco_id: String(it.current_owner) } : null),
			effective_date: it.effective_date,
			id: it.id,
			new_costcenter: newCC ? { id: Number(newCC.id), name: newCC.name || null } : (it.new_costcenter_id != null ? { id: Number(it.new_costcenter_id), name: null } : null),
			new_department: newDept ? { code: newDept.code || null, id: Number(newDept.id) } : (it.new_department_id != null ? { code: null, id: Number(it.new_department_id) } : null),
			new_location: newLoc ? { id: Number(newLoc.id), name: newLoc.name || null } : (it.new_location_id != null ? { id: Number(it.new_location_id), name: null } : null),
			new_owner: newOwner ? { full_name: newOwner.full_name || newOwner.name || null, ramco_id: newOwner.ramco_id } : (it.new_owner ? { full_name: null, ramco_id: String(it.new_owner) } : null),
			reason: it.reason,
			remarks: it.remarks,
			return_to_asset_manager: it.return_to_asset_manager,
			transfer_id: it.transfer_id,
			updated_at: it.updated_at,
		};
	});

	const data = {
		...request,
		costcenter,
		department,
		items: itemsEnriched,
		total_items: itemsEnriched.length,
		transfer_by_user,
	};

	res.json({
		data,
		message: 'Asset transfer request data retrieved successfully',
		status: 'success'
	});
};

export const createAssetTransfer = async (req: Request, res: Response) => {
	// Accepts payload:
	// { transfer_by, transfer_date, costcenter_id, department_id, transfer_status, details: JSON|string }
	const body: any = req.body || {};
	const transfer_by = String(body.transfer_by || '').trim();
	const transfer_date = body.transfer_date || new Date();
	const costcenter_id = body.costcenter_id != null ? Number(body.costcenter_id) : null;
	const department_id = body.department_id != null ? Number(body.department_id) : null;
	const transfer_status = String(body.transfer_status || 'submitted');

	// Parse details which may arrive as a JSON string
	let details: any[] = [];
	if (Array.isArray(body.details)) {
		details = body.details;
	} else if (typeof body.details === 'string') {
		try { details = JSON.parse(body.details); } catch { details = []; }
	}

	if (!transfer_by || !Array.isArray(details) || details.length === 0) {
		return res.status(400).json({ message: 'Invalid request data: missing transfer_by or details', status: 'error' });
	}

	// Create the transfer request and get its ID (aligns with model signature)
	const insertId = await assetModel.createAssetTransfer({
		costcenter_id,
		department_id,
		transfer_by,
		transfer_date,
		transfer_status
	});

	// Insert each detail row
	for (const dRaw of details) {
		const d = dRaw || {};
		await assetModel.createAssetTransferItem({
			asset_id: Number(d.asset_id) || null,
			attachment1: d.attachment1 || null,
			attachment2: d.attachment2 || null,
			attachment3: d.attachment3 || null,
			current_costcenter_id: d.current_costcenter_id != null ? Number(d.current_costcenter_id) : null,
			current_department_id: d.current_department_id != null ? Number(d.current_department_id) : null,
			current_location_id: d.current_location_id != null ? Number(d.current_location_id) : null,
			current_owner: d.current_owner || null,
			effective_date: d.effective_date || null,
			new_costcenter_id: d.new_costcenter_id != null ? Number(d.new_costcenter_id) : null,
			new_department_id: d.new_department_id != null ? Number(d.new_department_id) : null,
			new_location_id: d.new_location_id != null ? Number(d.new_location_id) : null,
			new_owner: d.new_owner || null,
			reason: d.reason || null,
			remarks: d.remarks || null,
			return_to_asset_manager: d.return_to_asset_manager ? 1 : 0,
			transfer_id: insertId,
			transfer_type: d.transfer_type || null,
			type_id: Number(d.type_id) || null
		});
	}

	// --- EMAIL NOTIFICATION LOGIC ---
	try {
		// Fetch the full request and its items for email
		const request = await assetModel.getAssetTransferById(insertId);
		const itemsRaw = await assetModel.getAssetTransferItemByRequestId(insertId);
		const items = Array.isArray(itemsRaw) ? itemsRaw : [];
		// Fetch all employees, costcenters, departments, districts, types, and assets for mapping
		const [employees, costcenters, departments, districts, typesAll, assetsForItems] = await Promise.all([
			assetModel.getEmployees(),
			assetModel.getCostcenters(),
			assetModel.getDepartments(),
			assetModel.getLocations(),
			(assetModel as any).getTypes?.() || ([] as any[]),
			(async () => {
				const assetIds = Array.from(new Set(items.map((i: any) => Number(i.asset_id)).filter((n: any) => Number.isFinite(n))));
				return assetIds.length ? await (assetModel as any).getAssetsByIds(assetIds) : [];
			})()
		]);
		// Ensure all lookup arrays are arrays
		const empArr = Array.isArray(employees) ? employees : [];
		const costcenterArr = Array.isArray(costcenters) ? costcenters : [];
		const departmentArr = Array.isArray(departments) ? departments : [];
		const districtArr = Array.isArray(districts) ? districts : [];
		const empMap = new Map(empArr.map((e: any) => [e.ramco_id, e]));
		const costcenterMap = new Map(costcenterArr.map((c: any) => [c.id, c]));
		const departmentMap = new Map(departmentArr.map((d: any) => [d.id, d]));
		const districtMap = new Map(districtArr.map((d: any) => [d.id, d]));
		// Build maps
		const typeMap = new Map<number, any>((Array.isArray(typesAll) ? typesAll : []).map((t: any) => [Number(t.id), t]));
		const assetsMap = new Map<number, any>((Array.isArray(assetsForItems) ? assetsForItems : []).map((a: any) => [Number(a.id), a]));
		// Enrich items for email
		const enrichedItems = items.map((item: any) => {
			// Identifier logic
			const assetRow = item.asset_id ? assetsMap.get(Number(item.asset_id)) : null;
			let identifierDisplay = assetRow?.register_number ? assetRow.register_number : item.identifier;
			if (item.transfer_type === 'Employee' && item.identifier && empMap.has(item.identifier)) {
				const emp = empMap.get(item.identifier);
				identifierDisplay = emp && typeof emp === 'object' && 'full_name' in emp ? emp.full_name : item.identifier;
			}
			// Asset type name (from types table)
			const assetTypeName = item.type_id != null && typeMap.has(Number(item.type_id))
				? String((typeMap.get(Number(item.type_id))).name || '')
				: '';
			// Preserve transfer_type from payload ("Asset" or "Employee")
			const transferTypePayload = item.transfer_type || null;
			// Owners
			const currOwnerEmp = item.current_owner && empMap.has(item.current_owner) ? empMap.get(item.current_owner) : null;
			const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.current_owner || '-';
			const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
			const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
			// Costcenters (IDs may arrive as strings; normalize to number for Map lookups)
			const currCostcenterKey = Number(item.current_costcenter_id);
			const currCostcenterObj = Number.isFinite(currCostcenterKey) && costcenterMap.has(currCostcenterKey) ? costcenterMap.get(currCostcenterKey) : null;
			const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? (currCostcenterObj).name : (item.current_costcenter_id ?? '-');
			const newCostcenterKey = Number(item.new_costcenter_id);
			const newCostcenterObj = Number.isFinite(newCostcenterKey) && costcenterMap.has(newCostcenterKey) ? costcenterMap.get(newCostcenterKey) : null;
			const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? (newCostcenterObj).name : (item.new_costcenter_id ?? '-');
			// Departments (show code)
			const currDepartmentKey = Number(item.current_department_id);
			const currDepartmentObj = Number.isFinite(currDepartmentKey) && departmentMap.has(currDepartmentKey) ? departmentMap.get(currDepartmentKey) : null;
			const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? (currDepartmentObj).code : (item.current_department_id ?? '-');
			const newDepartmentKey = Number(item.new_department_id);
			const newDepartmentObj = Number.isFinite(newDepartmentKey) && departmentMap.has(newDepartmentKey) ? departmentMap.get(newDepartmentKey) : null;
			const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? (newDepartmentObj).code : (item.new_department_id ?? '-');
			// Districts/Locations (show code or name)
			const currLocationKey = Number(item.current_location_id);
			const currDistrictObj = Number.isFinite(currLocationKey) && districtMap.has(currLocationKey) ? districtMap.get(currLocationKey) : null;
			const currDistrictCode = currDistrictObj ? ((currDistrictObj).code || (currDistrictObj).name || item.current_location_id || '-') : (item.current_location_id || '-');
			const newLocationKey = Number(item.new_location_id);
			const newDistrictObj = Number.isFinite(newLocationKey) && districtMap.has(newLocationKey) ? districtMap.get(newLocationKey) : null;
			const newDistrictCode = newDistrictObj ? ((newDistrictObj).code || (newDistrictObj).name || item.new_location_id || '-') : (item.new_location_id || '-');
			return {
				...item,
				assetTypeName,
				currCostcenterName,
				currDepartmentCode,
				currDistrictCode,
				currOwnerName,
				identifierDisplay,
				newCostcenterName,
				newDepartmentCode,
				newDistrictCode,
				newOwnerName,
				transfer_type: transferTypePayload
			};
		});

		// Fetch requestor info first
		const requestorObj = await assetModel.getEmployeeByRamco(transfer_by);
		// Enrich requestor with readable org fields based on request's costcenter/department/district when available
		if (typeof requestorObj === 'object' && requestorObj) {
			(requestorObj as any).costcenter = request.costcenter_id != null ? costcenterMap.get(request.costcenter_id) || null : (requestorObj as any).costcenter || null;
			(requestorObj as any).department = request.department_id != null ? departmentMap.get(request.department_id) || null : (requestorObj as any).department || null;
			(requestorObj as any).district = request.district_id != null ? districtMap.get(request.district_id) || null : (requestorObj as any).district || null;
		}
		// Determine approver from workflow: module_name='asset transfer', level_name='approver', department_id from request or requestor
		let supervisorObj: any = null;
		const deptIdForApproval = department_id != null
			? Number(department_id)
			: (requestorObj?.department_id != null ? Number(requestorObj.department_id) : null);
		
		console.log('DEBUG: Attempting to resolve approver. deptIdForApproval:', deptIdForApproval, 'requestorObj?.department_id:', requestorObj?.department_id);
		
		if (deptIdForApproval != null && Number.isFinite(deptIdForApproval)) {
			supervisorObj = await getWorkflowPicByDepartment('asset transfer', 'approver', deptIdForApproval);
			console.log('DEBUG: Workflow approver result for asset transfer/approver/dept', deptIdForApproval, ':', supervisorObj);
			
			// Ensure email is resolved from employees table by ramco_id
			if (supervisorObj?.ramco_id && !supervisorObj?.email) {
				try {
					console.log('DEBUG: Email not populated in workflow result, resolving from employees table for ramco_id:', supervisorObj.ramco_id);
					const empData = await assetModel.getEmployeeByRamco(String(supervisorObj.ramco_id));
					if (empData?.email) {
						supervisorObj.email = empData.email;
						console.log('DEBUG: Resolved email from employees table:', supervisorObj.email);
					}
				} catch (err) {
					console.log('DEBUG: Failed to resolve email from employees table:', err);
				}
			}
		} else {
			console.log('DEBUG: deptIdForApproval is null/invalid, cannot resolve workflow approver');
		}
		// Generate action token and base URL for supervisor email (legacy buttons)
		const crypto = await import('crypto');
		const actionToken = crypto.randomBytes(32).toString('hex');
		const actionBaseUrl = `${req.protocol}://${req.get('host')}/api/assets/asset-transfer`;
		// Build frontend approval portal URL with signed credential token if approver is available
		let portalUrl: string | undefined = undefined;
		if (supervisorObj?.ramco_id) {
			const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
			const credData = { ramco_id: String(supervisorObj.ramco_id), transfer_id: insertId } as any;
			const token = jwt.sign(credData, secret, { expiresIn: '3d' } as SignOptions);
			const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/?$/, '');
			// Include applicant department_id in portal URL as ?dept= and credential as _cred
			const deptForPortal = (Number.isFinite(deptIdForApproval as any) && deptIdForApproval != null)
				? Number(deptIdForApproval)
				: (requestorObj?.department_id ?? request.department_id ?? '');
			const deptParam = deptForPortal !== '' ? encodeURIComponent(String(deptForPortal)) : '';
			portalUrl = `${frontendUrl}/assets/transfer/portal/${encodeURIComponent(String(insertId))}?action=approve&authorize=${encodeURIComponent(String(supervisorObj.ramco_id))}` +
				(deptParam ? `&dept=${deptParam}` : '') +
				`&_cred=${encodeURIComponent(token)}`;
		}
		// Compose email content for requestor (no actionToken/actionBaseUrl)
		const requestorEmailData = {
			items: enrichedItems,
			request,
			requestor: requestorObj,
			supervisor: supervisorObj || { email: '-', name: 'Supervisor' }
		};
		// Compose email content for supervisor (with actionToken/actionBaseUrl)
		const supervisorEmailData = {
			actionBaseUrl,
			actionToken,
			items: enrichedItems,
			request,
			requestor: requestorObj,
			supervisor: supervisorObj || { email: '-', name: 'Supervisor' }
		};
		// Send to requestor (notification only)
		if (requestorObj.email) {
			const { html, subject } = assetTransferT1SubmissionEmail(requestorEmailData);
			await sendMail(requestorObj.email, subject, html);
		}
		// Send to supervisor (with action buttons + portal link) — even if same email as requestor (for testing and single-mailbox cases)
		if (supervisorObj?.email) {
			console.log('DEBUG: Sending approval email to approver:', supervisorObj.ramco_id, 'email:', supervisorObj.email);
			const { html, subject } = assetTransferT2HodApprovalRequestEmail({ ...supervisorEmailData, portalUrl });
			await sendMail(supervisorObj.email, subject, html);
			console.log('DEBUG: Email sent successfully to approver');
		} else {
			console.warn(`createAssetTransfer: No approver found. deptIdForApproval=${deptIdForApproval}, supervisorObj.ramco_id=${supervisorObj?.ramco_id}, supervisorObj.email=${supervisorObj?.email}. Ensure workflow record exists with module_name='asset transfer', level_name='approver', department_id=${deptIdForApproval}`);
		}

		// Send notification to New Asset Owner's HOD (if different from Current Asset Owner's HOD)
		try {
			// Collect unique new_department_ids from items
			const newDepartmentIds = Array.from(new Set(
				items
					.map((item: any) => Number(item.new_department_id))
					.filter((id: any) => Number.isFinite(id) && id > 0)
			));

			// For each new_department_id, get the HOD via workflow
			const newOwnerHodEmails: Set<string> = new Set();
			for (const newDeptId of newDepartmentIds) {
				// Skip if it's the same as the approval department (to avoid duplicate emails)
				if (newDeptId === deptIdForApproval) {
					console.log('DEBUG: Skipping New Asset Owner HOD notification for dept', newDeptId, 'as it is the same as Current Asset Owner HOD');
					continue;
				}
				
				try {
					const newOwnerHod = await getWorkflowPicByDepartment('asset transfer', 'approver', newDeptId);
					if (newOwnerHod?.ramco_id) {
						// Ensure email is resolved from employees table by ramco_id
						if (!newOwnerHod?.email) {
							try {
								const empData = await assetModel.getEmployeeByRamco(String(newOwnerHod.ramco_id));
								if (empData?.email) {
									newOwnerHod.email = empData.email;
								}
							} catch (err) {
								console.log('DEBUG: Failed to resolve email for new owner HOD:', err);
							}
						}
						
						if (newOwnerHod.email) {
							newOwnerHodEmails.add(newOwnerHod.email);
							console.log('DEBUG: Added New Asset Owner HOD email to notify:', newOwnerHod.ramco_id, 'email:', newOwnerHod.email);
						}
					}
				} catch (err) {
					console.warn('Failed to fetch New Asset Owner HOD for department', newDeptId, err);
				}
			}

			// Send notification to each new owner HOD
			if (newOwnerHodEmails.size > 0) {
				for (const hodEmail of newOwnerHodEmails) {
					try {
						const { html, subject } = assetTransferT2HodApprovalRequestEmail({ ...supervisorEmailData, portalUrl });
						await sendMail(hodEmail, subject, html);
						console.log('DEBUG: New Asset Owner HOD notification sent to:', hodEmail);
					} catch (err) {
						console.error('Failed to send New Asset Owner HOD notification to', hodEmail, ':', err);
					}
				}
			}
		} catch (err) {
			console.error('New Asset Owner HOD notification failed:', err);
		}

		// Send notification to asset managers based on type_id
		try {
			// Collect unique type_ids from items
			const typeIds = Array.from(new Set(
				items
					.map((item: any) => Number(item.type_id))
					.filter((id: any) => Number.isFinite(id) && id > 0)
			));

			if (typeIds.length > 0) {
				// Get type names for email
				const typeMap = new Map<number, string>((Array.isArray(typesAll) ? typesAll : []).map((t: any) => [Number(t.id), t.name || '']));
				const typeNames = typeIds.map(id => typeMap.get(id) || `Type ${id}`);

				// For each type_id, get asset managers
				for (const typeId of typeIds) {
					const managers = await assetModel.getAssetManagersByTypeId(typeId);
					if (Array.isArray(managers) && managers.length > 0) {
						// Get employee details for each manager
						for (const managerRow of managers) {
							const manager = managerRow as any;
							if (manager.ramco_id) {
								const managerEmployee = await assetModel.getEmployeeByRamco(manager.ramco_id);
								if (managerEmployee?.email) {
									const { html, subject } = assetTransferAssetManagerEmail({
										applicant: requestorObj,
										date: transfer_date,
										requestId: insertId,
										typeNames
									});
									await sendMail(managerEmployee.email, subject, html);
									console.log('DEBUG: Asset manager notification sent to:', manager.ramco_id, 'email:', managerEmployee.email);
								}
							}
						}
					}
				}
			}
		} catch (err) {
			console.error('Asset manager notification failed:', err);
		}

		// Send notification to all unique current owners
		try {
			// Collect unique current owners from items
			const uniqueCurrentOwners = Array.from(new Set(
				items
					.map((item: any) => String(item.current_owner || '').trim())
					.filter((owner: string) => owner.length > 0)
			));

			if (uniqueCurrentOwners.length > 0) {
				// For each current owner, send a notification with their items
				for (const currentOwnerRamco of uniqueCurrentOwners) {
					// Get employee details for current owner
					const currentOwnerEmployee = await assetModel.getEmployeeByRamco(currentOwnerRamco);
					if (currentOwnerEmployee?.email) {
						// Filter items for this current owner
						const ownerItems = items.filter((item: any) => String(item.current_owner || '').trim() === currentOwnerRamco);
						
						const { html, subject } = assetTransferCurrentOwnerEmail({
							items: ownerItems,
							request,
							requestor: requestorObj,
							currentOwner: currentOwnerEmployee
						});
						await sendMail(currentOwnerEmployee.email, subject, html);
						console.log('DEBUG: Current owner notification sent to:', currentOwnerRamco, 'email:', currentOwnerEmployee.email, 'for', ownerItems.length, 'item(s)');
					}
				}
			}
		} catch (err) {
			console.error('Current owner notification failed:', err);
		}
	} catch (err) {
		// Log but do not block the response
		console.error('Asset transfer email notification failed:', err);
	}
	// --- END EMAIL LOGIC ---

	res.status(201).json({
		message: 'Asset transfer request created successfully',
		request_id: insertId,
		status: 'success'
	});
};

export const updateAssetTransfer = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	const { items, status } = req.body;
	if (!requestId || !status || !Array.isArray(items)) {
		return res.status(400).json({ message: 'Invalid request data', status: 'error' });
	}
	// Validate request exists
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	// Validate each item
	for (const item of items) {
		if (!item.asset_id || !item.curr_owner || !item.new_department_id || !item.new_district_id || !item.new_costcenter_id) {
			return res.status(400).json({ message: 'Invalid item data', status: 'error' });
		}
		// Validate current owner exists
		const currOwner = await assetModel.getEmployeeByRamco(item.curr_owner);
		if (!currOwner) {
			return res.status(404).json({ message: `Current owner ${item.curr_owner} not found`, status: 'error' });
		}
		// Validate new department, district, costcenter exist
		if (item.new_department_id && !(await assetModel.getDepartmentById(item.new_department_id))) {
			return res.status(404).json({ message: `New department ${item.new_department_id} not found`, status: 'error' });
		}
		if (item.new_district_id && !(await assetModel.getDistrictById(item.new_district_id))) {
			return res.status(404).json({ message: `New district ${item.new_district_id} not found`, status: 'error' });
		}
		if (item.new_costcenter_id && !(await assetModel.getCostcenterById(item.new_costcenter_id))) {
			return res.status(404).json({ message: `New cost center ${item.new_costcenter_id} not found`, status: 'error' });
		}
	}
	// Update the transfer request
	const result = await assetModel.updateAssetTransfer(requestId, items);
	res.json({
		message: 'Asset transfer request updated successfully',
		result,
		status: 'success'
	});
}

export const deleteAssetTransfer = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	if (!requestId) {
		return res.status(400).json({ message: 'Invalid request ID', status: 'error' });
	}
	// Validate request exists
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	// Delete the transfer request
	await assetModel.deleteAssetTransfer(requestId);
	res.json({
		message: 'Asset transfer request deleted successfully',
		status: 'success'
	});
}

// PUT /api/assets/transfers/approval
// Body: { status: string, approved_by: string, approved_date?: string|Date, transfer_id: number[]|number|string }
export const updateAssetTransfersApproval = async (req: Request, res: Response) => {
	const { approved_by, approved_date, status, transfer_id } = req.body || {};
	let ids: number[] = [];
	if (Array.isArray(transfer_id)) {
		ids = transfer_id.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	} else if (typeof transfer_id === 'number') {
		ids = [transfer_id];
	} else if (typeof transfer_id === 'string' && transfer_id.trim() !== '') {
		ids = transfer_id.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	}
	if (!status || !approved_by || ids.length === 0) {
		return res.status(400).json({ data: null, message: 'status, approved_by and transfer_id are required', status: 'error' });
	}
	// Allowed statuses (can expand later)
	const allowedStatuses = new Set(['approved', 'completed', 'rejected']);
	if (!allowedStatuses.has(String(status).toLowerCase())) {
		return res.status(400).json({ data: null, message: `Unsupported status '${status}'. Allowed: approved, rejected, completed`, status: 'error' });
	}
	const dateVal = approved_date && String(approved_date).trim() !== '' ? approved_date : new Date();
	// Fetch requests BEFORE update for email context (per-request granularity)
	const requestsBefore: any[] = [];
	for (const id of ids) {
		try { const r = await assetModel.getAssetTransferById(id); if (r) requestsBefore.push(r); } catch {/* ignore */ }
	}
	// Perform bulk update
	const result: any = await assetModel.bulkUpdateAssetTransfersApproval(ids, String(status), String(approved_by), dateVal);
	const affected = (result && typeof result.affectedRows === 'number') ? result.affectedRows : 0;

	// EMAIL NOTIFICATIONS (best-effort, non-blocking)
	(async () => {
		try {
			// Approver details
			const approverEmp = await assetModel.getEmployeeByRamco(String(approved_by));
			// Fetch all necessary lookup data once for efficiency
			const [allEmployees, costcenters, departments, locations, typesAll] = await Promise.all([
				assetModel.getEmployees().catch(() => []),
				assetModel.getCostcenters().catch(() => []),
				assetModel.getDepartments().catch(() => []),
				assetModel.getLocations().catch(() => []),
				(assetModel as any).getTypes?.().catch(() => []) || Promise.resolve([])
			]);

			const empArr = Array.isArray(allEmployees) ? allEmployees : [];
			const costcenterArr = Array.isArray(costcenters) ? costcenters : [];
			const departmentArr = Array.isArray(departments) ? departments : [];
			const districtArr = Array.isArray(locations) ? locations : [];

			const empMap = new Map(empArr.map((e: any) => [e.ramco_id, e]));
			const costcenterMap = new Map(costcenterArr.map((c: any) => [c.id, c]));
			const departmentMap = new Map(departmentArr.map((d: any) => [d.id, d]));
			const districtMap = new Map(districtArr.map((d: any) => [d.id, d]));
			const typeMap = new Map<number, any>((Array.isArray(typesAll) ? typesAll : []).map((t: any) => [Number(t.id), t]));

			// For each request, fetch items + related employees and send notifications
			for (const request of requestsBefore) {
				if (!request || !ids.includes(Number(request.id))) continue;
				// Fetch items
				const itemsRaw = await assetModel.getAssetTransferItemByRequestId(Number(request.id));
				const items: any[] = Array.isArray(itemsRaw) ? (itemsRaw as any[]) : [];

				// Build asset lookup
				const assetsForItems = await (async () => {
					const assetIds = Array.from(new Set(items.map((i: any) => Number(i.asset_id)).filter(n => Number.isFinite(n))));
					return assetIds.length ? await (assetModel as any).getAssetsByIds(assetIds) : [];
				})();
				const assetsMap = new Map<number, any>((Array.isArray(assetsForItems) ? assetsForItems : []).map((a: any) => [Number(a.id), a]));

				// Enrich items for email (similar to createAssetTransfer logic)
				const enrichedItems = items.map((item: any) => {
					// Identifier logic
					const assetRow = item.asset_id ? assetsMap.get(Number(item.asset_id)) : null;
					let identifierDisplay = assetRow?.register_number ? assetRow.register_number : item.identifier;
					if (item.transfer_type === 'Employee' && item.identifier && empMap.has(item.identifier)) {
						const emp = empMap.get(item.identifier);
						identifierDisplay = emp && typeof emp === 'object' && 'full_name' in emp ? emp.full_name : item.identifier;
					}
					// Asset type name (from types table)
					const assetTypeName = item.type_id != null && typeMap.has(Number(item.type_id))
						? String((typeMap.get(Number(item.type_id))).name || '')
						: '';
					// Preserve transfer_type from payload ("Asset" or "Employee")
					const transferTypePayload = item.transfer_type || null;
					// Owners
					const currOwnerEmp = item.current_owner && empMap.has(item.current_owner) ? empMap.get(item.current_owner) : null;
					const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.current_owner || '-';
					const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
					const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
					// Costcenters
					const currCostcenterKey = Number(item.current_costcenter_id);
					const currCostcenterObj = Number.isFinite(currCostcenterKey) && costcenterMap.has(currCostcenterKey) ? costcenterMap.get(currCostcenterKey) : null;
					const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? (currCostcenterObj).name : (item.current_costcenter_id ?? '-');
					const newCostcenterKey = Number(item.new_costcenter_id);
					const newCostcenterObj = Number.isFinite(newCostcenterKey) && costcenterMap.has(newCostcenterKey) ? costcenterMap.get(newCostcenterKey) : null;
					const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? (newCostcenterObj).name : (item.new_costcenter_id ?? '-');
					// Departments (show code)
					const currDepartmentKey = Number(item.current_department_id);
					const currDepartmentObj = Number.isFinite(currDepartmentKey) && departmentMap.has(currDepartmentKey) ? departmentMap.get(currDepartmentKey) : null;
					const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? (currDepartmentObj).code : (item.current_department_id ?? '-');
					const newDepartmentKey = Number(item.new_department_id);
					const newDepartmentObj = Number.isFinite(newDepartmentKey) && departmentMap.has(newDepartmentKey) ? departmentMap.get(newDepartmentKey) : null;
					const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? (newDepartmentObj).code : (item.new_department_id ?? '-');
					// Districts/Locations
					const currLocationKey = Number(item.current_location_id);
					const currDistrictObj = Number.isFinite(currLocationKey) && districtMap.has(currLocationKey) ? districtMap.get(currLocationKey) : null;
					const currDistrictCode = currDistrictObj ? ((currDistrictObj).code || (currDistrictObj).name || item.current_location_id || '-') : (item.current_location_id || '-');
					const newLocationKey = Number(item.new_location_id);
					const newDistrictObj = Number.isFinite(newLocationKey) && districtMap.has(newLocationKey) ? districtMap.get(newLocationKey) : null;
					const newDistrictCode = newDistrictObj ? ((newDistrictObj).code || (newDistrictObj).name || item.new_location_id || '-') : (item.new_location_id || '-');

					return {
						...item,
						assetTypeName,
						currCostcenterName,
						currDepartmentCode,
						currDistrictCode,
						currOwnerName,
						identifierDisplay,
						newCostcenterName,
						newDepartmentCode,
						newDistrictCode,
						newOwnerName,
						transfer_type: transferTypePayload
					};
				});

				// Get requestor info
				const requestorEmp = request.transfer_by ? empMap.get(String(request.transfer_by)) : null;

				// Get asset managers for types involved (for CC)
				const typeIds = Array.from(new Set(
					items
						.map((item: any) => Number(item.type_id))
						.filter((id: any) => Number.isFinite(id) && id > 0)
				));
				const assetManagerEmails: Set<string> = new Set();
				for (const typeId of typeIds) {
					try {
						const managers = await assetModel.getAssetManagersByTypeId(typeId);
						if (Array.isArray(managers) && managers.length > 0) {
							for (const managerRow of managers) {
								const manager = managerRow as any;
								if (manager.ramco_id) {
									const managerEmployee = await assetModel.getEmployeeByRamco(manager.ramco_id);
									if (managerEmployee?.email) {
										assetManagerEmails.add(managerEmployee.email);
									}
								}
							}
						}
					} catch (err) {
						console.warn('Failed to fetch asset managers for type', typeId, err);
					}
				}

				// Requestor email (if approved) with CC to asset managers
				if (String(status).toLowerCase() === 'approved' && requestorEmp?.email) {
					try {
						const { html, subject } = assetTransferApprovedRequestorEmail({ approver: approverEmp, items: enrichedItems, request, requestor: requestorEmp });
						const ccArray = Array.from(assetManagerEmails);
						const mailOptions: any = {};
						if (ccArray.length > 0) {
							mailOptions.cc = ccArray.join(', ');
						}
						await sendMail(requestorEmp.email, subject, html, mailOptions);
					} catch (e) { console.warn('Failed to send requestor approval email', e); }
				}

				// New owner emails (group items per new_owner) with CC to asset managers
				if (String(status).toLowerCase() === 'approved') {
					const itemsByNewOwner: Record<string, any[]> = {};
					for (const it of enrichedItems) {
						if (it.new_owner) {
							const key = String(it.new_owner);
							if (!itemsByNewOwner[key]) itemsByNewOwner[key] = [];
							itemsByNewOwner[key].push(it);
						}
					}
					for (const [newOwnerRamco, ownerItems] of Object.entries(itemsByNewOwner)) {
						const newOwnerEmp = empMap.get(newOwnerRamco);
						if (newOwnerEmp?.email) {
							try {
								// Generate credential code for acceptance portal
								const credentialCode = generateAcceptanceCredentialCode(Number(request.id), newOwnerRamco);
								const { html, subject } = assetTransferApprovedNewOwnerEmail({ 
									approver: approverEmp, 
									credentialCode,
									itemsForNewOwner: ownerItems, 
									newOwner: newOwnerEmp, 
									request, 
									requestor: requestorEmp,
									transferId: Number(request.id)
								});
								const ccArray = Array.from(assetManagerEmails);
								const mailOptions: any = {};
								if (ccArray.length > 0) {
									mailOptions.cc = ccArray.join(', ');
								}
								await sendMail(newOwnerEmp.email, subject, html, mailOptions);
							} catch (e) { console.warn('Failed to send new owner approval email', e); }
						}
					}

					// NEW: Send notification to New Asset Owner's HOD
					try {
						const newDepartmentIds = Array.from(new Set(
							enrichedItems
								.map((item: any) => Number(item.new_department_id))
								.filter((id: any) => Number.isFinite(id) && id > 0)
						));

						// For each new_department_id, get the HOD via workflow
						const newOwnerHodEmails: Set<string> = new Set();
						for (const newDeptId of newDepartmentIds) {
							try {
								const newOwnerHod = await getWorkflowPicByDepartment('asset transfer', 'approver', newDeptId);
								if (newOwnerHod?.ramco_id) {
									// Ensure email is resolved from employees table by ramco_id
									if (!newOwnerHod?.email) {
										try {
											const empData = await assetModel.getEmployeeByRamco(String(newOwnerHod.ramco_id));
											if (empData?.email) {
												newOwnerHod.email = empData.email;
											}
										} catch (err) {
											console.log('DEBUG: Failed to resolve email for new owner HOD:', err);
										}
									}
									
									if (newOwnerHod.email) {
										newOwnerHodEmails.add(newOwnerHod.email);
										console.log('DEBUG: Added New Asset Owner HOD email to notify:', newOwnerHod.ramco_id, 'email:', newOwnerHod.email);
									}
								}
							} catch (err) {
								console.warn('Failed to fetch New Asset Owner HOD for department', newDeptId, err);
							}
						}

						// Send notification to each new owner HOD
						if (newOwnerHodEmails.size > 0) {
							for (const hodEmail of newOwnerHodEmails) {
								try {
									const { html, subject } = assetTransferApprovedRequestorEmail({ approver: approverEmp, items: enrichedItems, request, requestor: requestorEmp });
									const ccArray = Array.from(assetManagerEmails);
									const mailOptions: any = {};
									if (ccArray.length > 0) {
										mailOptions.cc = ccArray.join(', ');
									}
									await sendMail(hodEmail, subject, html, mailOptions);
									console.log('DEBUG: New Asset Owner HOD approval notification sent to:', hodEmail);
								} catch (err) {
									console.error('Failed to send New Asset Owner HOD notification to', hodEmail, ':', err);
								}
							}
						}
					} catch (err) {
						console.error('New Asset Owner HOD approval notification failed:', err);
					}
				}
			} // end for each request

			// Send summary to approver (only once) if multiple approvals
			if (approverEmp && (approverEmp as any).email && affected > 0) {
				try {
					const { html, subject } = assetTransferApprovalSummaryEmail({ approvedDate: dateVal, approver: (approverEmp as any), requestIds: ids });
					await sendMail((approverEmp as any).email, subject, html);
				} catch (e) { console.warn('Failed to send approver summary email', e); }
			}
		} catch (err) {
			console.error('updateAssetTransfersApproval: email notifications failed', err);
		}
	})();

	return res.json({
		data: { transfer_id: ids, updated_count: affected },
		message: `Updated approval for ${affected} transfer request(s)`,
		status: 'success'
	});
};

// PUT /api/assets/transfers/:id/acceptance
// Accepts multipart/form-data (optional attachments) and JSON fields
export const setAssetTransferAcceptance = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	if (!requestId) {
		return res.status(400).json({ message: 'Invalid transfer request id', status: 'error' });
	}
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	const body: any = req.body || {};
	
	// Parse item_ids (array of transfer item IDs to accept)
	let itemIds: number[] = [];
	if (body['item_ids'] !== undefined) {
		if (Array.isArray(body['item_ids'])) {
			itemIds = body['item_ids'].map(v => Number(v)).filter(n => Number.isFinite(n));
		} else if (typeof body['item_ids'] === 'string') {
			itemIds = body['item_ids']
				.split(',')
				.map((s: string) => Number(s.trim()))
				.filter((n: number) => Number.isFinite(n));
		}
	}
	
	if (itemIds.length === 0) {
		return res.status(400).json({ message: 'No item_ids provided', status: 'error' });
	}
	
	// Parse checklist items (comma-separated or array)
	let checklistIds: number[] | undefined = undefined;
	if (body['checklist-items'] !== undefined) {
		if (Array.isArray(body['checklist-items'])) {
			checklistIds = (body['checklist-items']).map(v => Number(v)).filter(n => Number.isFinite(n));
		} else if (typeof body['checklist-items'] === 'string') {
			checklistIds = body['checklist-items']
				.split(',')
				.map((s: string) => Number(s.trim()))
				.filter((n: number) => Number.isFinite(n));
		}
	}
	const acceptance_by = body.acceptance_by ? String(body.acceptance_by) : null;
	const acceptance_date = body.acceptance_date ? String(body.acceptance_date) : null;
	const acceptance_remarks = body.acceptance_remarks != null ? String(body.acceptance_remarks) : null;

	// Handle uploaded files on field names 'attachment1', 'attachment2', 'attachment3' (multer saves to disk already with unique names)
	let filePaths: string[] | undefined = undefined;
	const filesObj: any = (req as any).files || {};
	const uploadUtil = await import('../utils/uploadUtil.js');
	const ensureDbPath = (filename: string) => uploadUtil.toDbPath('assets/transfers/acceptance', filename);
	
	const attachments: (string | null)[] = [null, null, null]; // [attachment1, attachment2, attachment3]
	for (let i = 1; i <= 3; i++) {
		const fieldName = `attachment${i}`;
		if (filesObj[fieldName] && Array.isArray(filesObj[fieldName]) && filesObj[fieldName].length > 0) {
			attachments[i - 1] = ensureDbPath(filesObj[fieldName][0].filename);
		}
	}
	
	// Build filePaths array with non-null values
	filePaths = attachments.filter(f => f !== null) as string[];

	// Update acceptance for each item
	const results = [];
	for (const itemId of itemIds) {
		const result = await assetModel.setAssetTransferAcceptance(itemId, {
			acceptance_by,
			// store as comma separated string (no brackets) handled in model
			acceptance_checklist_items: checklistIds,
			acceptance_date,
			acceptance_remarks,
			// Use individual attachment columns (directly from uploaded files)
			attachment1: attachments[0],
			attachment2: attachments[1],
			attachment3: attachments[2]
		});
		results.push(result);
	}

	// Fetch all transfer items to update ownership for accepted ones
	const itemsResult = await assetModel.getAssetTransferItemByRequestId(requestId);
	const allItems = Array.isArray(itemsResult) ? itemsResult : [];
	
	// Filter to only the items that were just accepted
	const acceptedItems = allItems.filter((item: any) => itemIds.includes(item.id));

	// NOTE: Asset ownership update deferred to scheduled job
	// The scheduled job (processAssetTransfers) will:
	// 1. Wait for effective_date to arrive
	// 2. Insert asset_history records
	// 3. Update assetdata table with new ownership
	// 4. Mark items as transferred_on
	// This ensures audit trail accuracy and prevents premature ownership changes

	// Send email notifications to: requestor, current owner, and new owner's HOD
	try {
		if (acceptedItems.length === 0) {
			return res.json({ message: 'Acceptance data saved', results, status: 'success' });
		}

		// Collect unique employee IDs
		const employeeIds = new Set<string>();
		if (request.transfer_by) employeeIds.add(String(request.transfer_by));
		acceptedItems.forEach((item: any) => {
			if (item.current_owner) employeeIds.add(String(item.current_owner));
			if (item.new_owner) employeeIds.add(String(item.new_owner));
		});

		// Fetch all employees at once
		const employeesResult = await assetModel.getEmployees();
		const employees = Array.isArray(employeesResult) ? employeesResult : [];
		const employeeMap = new Map(employees.map((e: any) => [String(e.ramco_id), e]));

		// Get requestor/applicant
		const requestor: any = request.transfer_by ? employeeMap.get(String(request.transfer_by)) : null;

		// Get unique current owners and new owners
		const currentOwners = new Set<string>();
		const newOwners = new Set<string>();
		acceptedItems.forEach((item: any) => {
			if (item.current_owner) currentOwners.add(String(item.current_owner));
			if (item.new_owner) newOwners.add(String(item.new_owner));
		});
		// Enrich items with asset details (brand, model, register_number)
		const enrichedItems: any[] = [];
		for (const item of acceptedItems as any[]) {
			const assetDetails = item.asset_id ? await assetModel.getAssetById(item.asset_id) : null;
			enrichedItems.push({
				...item,
				asset: assetDetails ? {
					register_number: assetDetails.register_number,
					brand: { name: assetDetails.brand_name },
					model: { name: assetDetails.model_name }
				} : null,
				current_owner: {
					full_name: employeeMap.get(String((item as any).current_owner))?.full_name || (item as any).current_owner
				}
			});
		}

		// 1. Notify Requestor/Applicant
		if (requestor?.email) {
			const newOwnerForEmail: any = newOwners.size > 0 ? employeeMap.get(Array.from(newOwners)[0]) : null;
			const { html, subject } = assetTransferAcceptedRequestorEmail({
				acceptanceDate: acceptance_date || new Date(),
				acceptanceRemarks: acceptance_remarks,
				items: enrichedItems,
				newOwner: newOwnerForEmail,
				request,
				requestor
			});
			await sendMail(requestor.email, subject, html).catch(err =>
				{ console.error('Failed to send acceptance email to requestor:', err); }
			);
		}

		// 2. Notify Current/Previous Owners
		for (const ownerId of currentOwners) {
			const currentOwner: any = employeeMap.get(ownerId);
			if (currentOwner?.email) {
				const itemsForOwner = enrichedItems.filter((i: any) => String(i.current_owner) === ownerId);
				const newOwnerForEmail: any = newOwners.size > 0 ? employeeMap.get(Array.from(newOwners)[0]) : null;
				const { html, subject } = assetTransferAcceptedCurrentOwnerEmail({
					acceptanceDate: acceptance_date || new Date(),
					acceptanceRemarks: acceptance_remarks,
					currentOwner,
					items: itemsForOwner,
					newOwner: newOwnerForEmail,
					request
				});
				await sendMail(currentOwner.email, subject, html).catch(err =>
					{ console.error(`Failed to send acceptance email to current owner ${ownerId}:`, err); }
				);
			}
		}

		// 3. Notify New Owner's HOD
		for (const ownerId of newOwners) {
			const newOwner: any = employeeMap.get(ownerId);
			if (newOwner) {
				// Get HOD - check supervisor_ramco_id or hod field
				const hodId = newOwner.supervisor_ramco_id || newOwner.hod || null;
				const hod: any = hodId ? employeeMap.get(String(hodId)) : null;

				if (hod?.email) {
					const itemsForOwner = enrichedItems.filter((i: any) => String(i.new_owner) === ownerId);
					const { html, subject } = assetTransferAcceptedHodEmail({
						acceptanceDate: acceptance_date || new Date(),
						acceptanceRemarks: acceptance_remarks,
						items: itemsForOwner,
						newOwner,
						newOwnerHod: hod,
						request
					});
					await sendMail(hod.email, subject, html).catch(err =>
						{ console.error(`Failed to send acceptance email to HOD for new owner ${ownerId}:`, err); }
					);
				}
			}
		}

		// 4. Notify Asset Managers (by asset type)
		try {
			const assetTypeIds = new Set<number>();
			acceptedItems.forEach((item: any) => {
				if (item.asset?.type_id) assetTypeIds.add(Number(item.asset.type_id));
				else if (item.type_id) assetTypeIds.add(Number(item.type_id));
			});

			for (const typeId of assetTypeIds) {
				const managers = await assetModel.getAssetManagersByTypeId(typeId);
				if (Array.isArray(managers) && managers.length > 0) {
					for (const managerRow of managers) {
						const manager = managerRow as any;
						if (manager.ramco_id) {
							const managerEmployee = await assetModel.getEmployeeByRamco(manager.ramco_id);
							if (managerEmployee?.email) {
								const itemsForType = enrichedItems.filter((it: any) => {
									const itTypeId = it.asset?.type_id || it.type_id;
									return Number(itTypeId) === typeId;
								});
								const { html, subject } = assetTransferAcceptedCurrentOwnerEmail({
									acceptanceDate: acceptance_date || new Date(),
									acceptanceRemarks: acceptance_remarks,
									currentOwner: managerEmployee,
									items: itemsForType,
									newOwner: Array.from(newOwners).length > 0 ? employeeMap.get(Array.from(newOwners)[0]) : null,
									request
								});
								await sendMail(managerEmployee.email, subject, html).catch(err =>
									{ console.error(`Failed to send acceptance email to asset manager ${manager.ramco_id}:`, err); }
								);
							}
						}
					}
				}
			}
		} catch (managerErr) {
			console.error('Error sending acceptance email to asset managers:', managerErr);
		}
	} catch (emailErr) {
		console.error('Error sending acceptance notification emails:', emailErr);
		// Don't fail the request if emails fail
	}

	return res.json({ message: 'Acceptance data saved', results, status: 'success' });
};

/* ============ ASSET TRANSFER ITEMS (direct access) ============ */
export const getAssetTransferItemsByTransfer = async (req: Request, res: Response) => {
	const transferId = Number(req.params.id);
	if (!transferId) return res.status(400).json({ message: 'Invalid transfer id', status: 'error' });
	// Ensure request exists (optional strictness)
	const request = await assetModel.getAssetTransferById(transferId);
	if (!request) return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	const itemsRaw = await assetModel.getAssetTransferItemByRequestId(transferId);
	const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : [];
	
	// Filter to only include pending acceptance items (acceptance_date IS NULL and acceptance_by IS NULL)
	let filteredItems = items.filter((item: any) => item.acceptance_date === null && item.acceptance_by === null);
	
	// Optional filter by new_owner query parameter
	const newOwnerParam = req.query.new_owner;
	
	if (newOwnerParam && typeof newOwnerParam === 'string' && newOwnerParam.trim() !== '') {
		const newOwnerRamco = newOwnerParam.trim();
		filteredItems = filteredItems.filter((item: any) => item.new_owner === newOwnerRamco);
	}

	// Enrich items with nested objects (asset, owners, departments, costcenters, locations)
	if (filteredItems.length === 0) {
		return res.json({ data: [], message: 'Transfer items retrieved', status: 'success' });
	}

	// Collect all unique IDs needed for enrichment
	const employeeIds = new Set<string>();
	const costcenterIds = new Set<number>();
	const departmentIds = new Set<number>();
	const locationIds = new Set<number>();
	const assetIds = new Set<number>();
	const typeIds = new Set<number>();

	for (const item of filteredItems) {
		if (item.current_owner) employeeIds.add(String(item.current_owner));
		if (item.new_owner) employeeIds.add(String(item.new_owner));
		if (typeof item.current_costcenter_id === 'number') costcenterIds.add(item.current_costcenter_id);
		if (typeof item.new_costcenter_id === 'number') costcenterIds.add(item.new_costcenter_id);
		if (typeof item.current_department_id === 'number') departmentIds.add(item.current_department_id);
		if (typeof item.new_department_id === 'number') departmentIds.add(item.new_department_id);
		if (typeof item.current_location_id === 'number') locationIds.add(item.current_location_id);
		if (typeof item.new_location_id === 'number') locationIds.add(item.new_location_id);
		if (typeof item.asset_id === 'number') assetIds.add(item.asset_id);
		if (typeof item.type_id === 'number') typeIds.add(item.type_id);
	}

	// Fetch all lookup data in parallel
	const [employeesRaw, costcentersRaw, departmentsRaw, locationsRaw, assetsRaw, typesRaw, brandsRaw, categoriesRaw, modelsRaw] = await Promise.all([
		assetModel.getEmployees(undefined, undefined, undefined, undefined, undefined, Array.from(employeeIds), undefined).catch(() => []),
		assetModel.getCostcenters().catch(() => []),
		assetModel.getDepartments().catch(() => []),
		assetModel.getLocations().catch(() => []),
		Promise.all(Array.from(assetIds).map(id => assetModel.getAssetById(id))).catch(() => []),
		assetModel.getTypes().catch(() => []),
		(assetModel as any).getBrands?.().catch(() => []) || [],
		(assetModel as any).getCategories?.().catch(() => []) || [],
		(assetModel as any).getModels?.().catch(() => []) || []
	]);

	// Create maps for fast lookup
	const empMap = new Map<string, any>((employeesRaw as any[]).map(e => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>((costcentersRaw as any[]).map(c => [Number(c.id), c]));
	const departmentMap = new Map<number, any>((departmentsRaw as any[]).map(d => [Number(d.id), d]));
	const locationMap = new Map<number, any>((locationsRaw as any[]).map(l => [Number(l.id), l]));
	const assetMap = new Map<number, any>((assetsRaw as any[]).filter(a => a?.id).map(a => [Number(a.id), a]));
	const typeMap = new Map<number, any>((typesRaw as any[]).map(t => [Number(t.id), t]));
	const brandMap = new Map<number, any>((brandsRaw as any[]).map(b => [Number(b.id), b]));
	const categoryMap = new Map<number, any>((categoriesRaw as any[]).map(c => [Number(c.id), c]));
	const modelMap = new Map<number, any>((modelsRaw as any[]).map(m => [Number(m.id), m]));

	// Enrich each item
	const enrichedItems = filteredItems.map((item: any) => {
		const currentOwnerEmp = item.current_owner ? empMap.get(String(item.current_owner)) : null;
		const newOwnerEmp = item.new_owner ? empMap.get(String(item.new_owner)) : null;
		const currCC = typeof item.current_costcenter_id === 'number' ? costcenterMap.get(item.current_costcenter_id) : null;
		const newCC = typeof item.new_costcenter_id === 'number' ? costcenterMap.get(item.new_costcenter_id) : null;
		const currDept = typeof item.current_department_id === 'number' ? departmentMap.get(item.current_department_id) : null;
		const newDept = typeof item.new_department_id === 'number' ? departmentMap.get(item.new_department_id) : null;
		const currLoc = typeof item.current_location_id === 'number' ? locationMap.get(item.current_location_id) : null;
		const newLoc = typeof item.new_location_id === 'number' ? locationMap.get(item.new_location_id) : null;
		const assetObj = typeof item.asset_id === 'number' ? assetMap.get(item.asset_id) : null;
		const typeObj = typeof item.type_id === 'number' ? typeMap.get(item.type_id) : null;

		// Build nested asset object with brand, category, model, type
		let assetDetail: any = null;
		if (assetObj) {
			assetDetail = {
				id: assetObj.id,
				register_number: assetObj.register_number || null,
				brand: assetObj.brand_id ? (brandMap.get(assetObj.brand_id) ? { id: brandMap.get(assetObj.brand_id)!.id, name: brandMap.get(assetObj.brand_id)!.name || null } : null) : null,
				category: assetObj.category_id ? (categoryMap.get(assetObj.category_id) ? { id: categoryMap.get(assetObj.category_id)!.id, name: categoryMap.get(assetObj.category_id)!.name || null } : null) : null,
				model: assetObj.model_id ? (modelMap.get(assetObj.model_id) ? { id: modelMap.get(assetObj.model_id)!.id, name: modelMap.get(assetObj.model_id)!.name || null } : null) : null,
				type: typeObj ? { id: typeObj.id, name: typeObj.name || null } : null
			};
		}

		return {
			acceptance_attachments: (() => {
				const v = item.acceptance_attachments;
				if (!v) return null;
				if (Array.isArray(v)) return v;
				if (typeof v === 'string') {
					try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
				}
				return null;
			})(),
			acceptance_by: (() => {
				const ramco = item.acceptance_by;
				if (!ramco) return null;
				const emp = empMap.get(String(ramco));
				return emp ? { full_name: emp.full_name || emp.name || null, ramco_id: emp.ramco_id } : { full_name: null, ramco_id: String(ramco) };
			})(),
			acceptance_checklist_items: item.acceptance_checklist_items || null,
			acceptance_date: item.acceptance_date || null,
			acceptance_remarks: item.acceptance_remarks || null,
			approval_date: item.approval_date || null,
			approval_status: item.approval_status || 'pending',
			approved_by: item.approved_by || null,
			asset: assetDetail,
			attachment: item.attachment,
			created_at: item.created_at,
			current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : null,
			current_department: currDept ? { id: currDept.id, code: currDept.code || null } : null,
			current_location: currLoc ? { id: currLoc.id, name: currLoc.name || null } : null,
			current_owner: currentOwnerEmp ? { full_name: currentOwnerEmp.full_name || currentOwnerEmp.name || null, ramco_id: currentOwnerEmp.ramco_id } : null,
			effective_date: item.effective_date,
			id: item.id,
			new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : null,
			new_department: newDept ? { id: newDept.id, code: newDept.code || null } : null,
			new_location: newLoc ? { id: newLoc.id, name: newLoc.name || null } : null,
			new_owner: newOwnerEmp ? { full_name: newOwnerEmp.full_name || newOwnerEmp.name || null, ramco_id: newOwnerEmp.ramco_id } : null,
			reason: item.reason,
			remarks: item.remarks,
			return_to_asset_manager: item.return_to_asset_manager,
			transfer_id: item.transfer_id,
			updated_at: item.updated_at
		};
	});

	return res.json({ data: enrichedItems, message: 'Transfer items retrieved', status: 'success' });
};

export const getAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ message: 'Invalid item id', status: 'error' });
	const item = await assetModel.getAssetTransferItemById(itemId);
	if (!item) return res.status(404).json({ message: 'Transfer item not found', status: 'error' });
	return res.json({ data: item, message: 'Transfer item retrieved', status: 'success' });
};

// GET /api/assets/transfers/:transferId/items/:itemId (enriched single item within a transfer)
export const getAssetTransferItemByTransfer = async (req: Request, res: Response) => {
	const transferId = Number(req.params.transferId);
	const itemId = Number(req.params.itemId);
	if (!transferId || !itemId) {
		return res.status(400).json({ message: 'Invalid transferId or itemId', status: 'error' });
	}
	const transfer = await assetModel.getAssetTransferById(transferId);
	if (!transfer) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	const item = await assetModel.getAssetTransferItemById(itemId);
	if (!item || Number(item.transfer_id) !== transferId) {
		return res.status(404).json({ message: 'Transfer item not found for this transfer', status: 'error' });
	}
	// Collect lookup IDs
	const employeeIds = new Set<string>();
	if (item.current_owner) employeeIds.add(String(item.current_owner));
	if (item.new_owner) employeeIds.add(String(item.new_owner));
	if (transfer.transfer_by) employeeIds.add(String(transfer.transfer_by));
	if ((item as any).acceptance_by) employeeIds.add(String((item as any).acceptance_by));
	const costcenterIds = new Set<number>();
	if (typeof item.current_costcenter_id === 'number') costcenterIds.add(item.current_costcenter_id);
	if (typeof item.new_costcenter_id === 'number') costcenterIds.add(item.new_costcenter_id);
	const departmentIds = new Set<number>();
	if (typeof item.current_department_id === 'number') departmentIds.add(item.current_department_id);
	if (typeof item.new_department_id === 'number') departmentIds.add(item.new_department_id);
	const locationIds = new Set<number>();
	if (typeof item.current_location_id === 'number') locationIds.add(item.current_location_id);
	if (typeof item.new_location_id === 'number') locationIds.add(item.new_location_id);
	const assetIds = new Set<number>();
	if (typeof item.asset_id === 'number') assetIds.add(item.asset_id);
	const typeIds = new Set<number>();
	if (typeof item.type_id === 'number') typeIds.add(item.type_id);

	const [employeesRaw, costcentersRaw, departmentsRaw, locationsRaw, assetsRaw, typesRaw, checklistsRaw] = await Promise.all([
		assetModel.getEmployees(undefined, undefined, undefined, undefined, undefined, Array.from(employeeIds), undefined).catch(() => []),
		assetModel.getCostcenters().catch(() => []),
		assetModel.getDepartments().catch(() => []),
		assetModel.getLocations().catch(() => []),
		Promise.all(Array.from(assetIds).map(id => assetModel.getAssetById(id))).catch(() => []),
		assetModel.getTypes().catch(() => []),
		item.type_id ? assetModel.getTransferChecklists(item.type_id).catch(() => []) : []
	]);

	const empMap = new Map<string, any>((employeesRaw as any[]).map(e => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>((costcentersRaw as any[]).map(c => [Number(c.id), c]));
	const departmentMap = new Map<number, any>((departmentsRaw as any[]).map(d => [Number(d.id), d]));
	const locationMap = new Map<number, any>((locationsRaw as any[]).map(l => [Number(l.id), l]));
	const assetMap = new Map<number, any>((assetsRaw as any[]).filter(a => a?.id).map(a => [Number(a.id), a]));
	const typeMap = new Map<number, any>((typesRaw as any[]).map(t => [Number(t.id), t]));
	const checklistMap = new Map<number, any>((checklistsRaw as any[]).filter(c => c?.id).map(c => [Number(c.id), c]));

	const transfer_by_emp = transfer.transfer_by ? empMap.get(String(transfer.transfer_by)) : null;
	const currentOwnerEmp = item.current_owner ? empMap.get(String(item.current_owner)) : null;
	const newOwnerEmp = item.new_owner ? empMap.get(String(item.new_owner)) : null;
	const currCC = typeof item.current_costcenter_id === 'number' ? costcenterMap.get(item.current_costcenter_id) : null;
	const newCC = typeof item.new_costcenter_id === 'number' ? costcenterMap.get(item.new_costcenter_id) : null;
	const currDept = typeof item.current_department_id === 'number' ? departmentMap.get(item.current_department_id) : null;
	const newDept = typeof item.new_department_id === 'number' ? departmentMap.get(item.new_department_id) : null;
	const currLoc = typeof item.current_location_id === 'number' ? locationMap.get(item.current_location_id) : null;
	const newLoc = typeof item.new_location_id === 'number' ? locationMap.get(item.new_location_id) : null;
	const assetObj = typeof item.asset_id === 'number' ? assetMap.get(item.asset_id) : null;
	const typeObj = typeof item.type_id === 'number' ? typeMap.get(item.type_id) : null;

	// Enrich acceptance checklist items
	let acceptanceChecklist: any[] | null = null;
	const rawChecklistVal = (item as any).acceptance_checklist_items;
	if (rawChecklistVal != null) {
		let ids: number[] = [];
		if (typeof rawChecklistVal === 'string') {
			ids = rawChecklistVal.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
		} else if (Array.isArray(rawChecklistVal)) {
			ids = rawChecklistVal.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
		}
		if (ids.length) {
			acceptanceChecklist = ids.map(id => checklistMap.get(id)).filter(Boolean).map((c: any) => ({ id: c.id, item: c.item, type_id: c.type_id }));
		}
	}

	const enriched = {
		acceptance_attachments: ((): null | string[] => {
			const v = (item as any).acceptance_attachments;
			if (!v) return null;
			if (Array.isArray(v)) return v as string[];
			if (typeof v === 'string') {
				try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
			}
			return null;
		})(),
		acceptance_by: (() => {
			const ramco = (item as any).acceptance_by;
			if (!ramco) return null;
			const emp = empMap.get(String(ramco));
			return emp ? { full_name: emp.full_name || emp.name || null, ramco_id: emp.ramco_id } : { full_name: null, ramco_id: String(ramco) };
		})(),
		acceptance_checklist_items: acceptanceChecklist,
		acceptance_date: (item as any).acceptance_date || null,
		acceptance_remarks: (item as any).acceptance_remarks ?? null,
		approval_date: (item as any).approved_date || null,
		approval_status: (item as any).approval_status || 'pending',
		approved_by: (item as any).approved_by || null,
		asset: assetObj ? { id: assetObj.id, register_number: assetObj.register_number || null } : (item.asset_id ? { id: item.asset_id, register_number: null } : null),
		attachment: item.attachment,
		created_at: item.created_at,
		current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof item.current_costcenter_id === 'number' ? { id: item.current_costcenter_id, name: null } : null),
		current_department: currDept ? { id: currDept.id, name: currDept.name || currDept.code || null } : (typeof item.current_department_id === 'number' ? { id: item.current_department_id, name: null } : null),
		current_location: currLoc ? { id: currLoc.id, name: currLoc.name || null } : (typeof item.current_location_id === 'number' ? { id: item.current_location_id, name: null } : null),
		current_owner: currentOwnerEmp ? { name: currentOwnerEmp.full_name || currentOwnerEmp.name || null, ramco_id: currentOwnerEmp.ramco_id } : (item.current_owner ? { name: null, ramco_id: String(item.current_owner) } : null),
		effective_date: item.effective_date,
		id: item.id,
		new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof item.new_costcenter_id === 'number' ? { id: item.new_costcenter_id, name: null } : null),
		new_department: newDept ? { id: newDept.id, name: newDept.name || newDept.code || null } : (typeof item.new_department_id === 'number' ? { id: item.new_department_id, name: null } : null),
		new_location: newLoc ? { id: newLoc.id, name: newLoc.name || null } : (typeof item.new_location_id === 'number' ? { id: item.new_location_id, name: null } : null),
		new_owner: newOwnerEmp ? { name: newOwnerEmp.full_name || newOwnerEmp.name || null, ramco_id: newOwnerEmp.ramco_id } : (item.new_owner ? { name: null, ramco_id: String(item.new_owner) } : null),
		reason: item.reason,
		remarks: item.remarks,
		return_to_asset_manager: item.return_to_asset_manager,
		transfer_by: transfer_by_emp ? { name: transfer_by_emp.full_name || transfer_by_emp.name || null, ramco_id: transfer_by_emp.ramco_id } : null,
		transfer_id: item.transfer_id,
		type: typeObj ? { id: typeObj.id, name: typeObj.name || null } : (item.type_id ? { id: item.type_id, name: null } : null),
		updated_at: item.updated_at
	};

	return res.json({ data: enriched, message: 'Transfer item (enriched) retrieved', status: 'success' });
};

export const createAssetTransferItem = async (req: Request, res: Response) => {
	const transferId = Number(req.params.id);
	if (!transferId) return res.status(400).json({ message: 'Invalid transfer id', status: 'error' });
	// Minimal required field: asset_id or type_id presence (business rule can expand later)
	const body: any = req.body || {};
	// Validate parent transfer exists
	const parent = await assetModel.getAssetTransferById(transferId);
	if (!parent) return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	const result = await assetModel.createAssetTransferItem({
		asset_id: body.asset_id != null ? Number(body.asset_id) : null,
		attachment: body.attachment || null,
		current_costcenter_id: body.current_costcenter_id != null ? Number(body.current_costcenter_id) : null,
		current_department_id: body.current_department_id != null ? Number(body.current_department_id) : null,
		current_location_id: body.current_location_id != null ? Number(body.current_location_id) : null,
		current_owner: body.current_owner || null,
		effective_date: body.effective_date || null,
		new_costcenter_id: body.new_costcenter_id != null ? Number(body.new_costcenter_id) : null,
		new_department_id: body.new_department_id != null ? Number(body.new_department_id) : null,
		new_location_id: body.new_location_id != null ? Number(body.new_location_id) : null,
		new_owner: body.new_owner || null,
		reason: body.reason || null,
		remarks: body.remarks || null,
		return_to_asset_manager: body.return_to_asset_manager ? 1 : 0,
		transfer_id: transferId,
		type_id: body.type_id != null ? Number(body.type_id) : null
	});
	return res.status(201).json({ data: { id: (result as any).insertId }, message: 'Transfer item created', status: 'success' });
};

export const updateAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ message: 'Invalid item id', status: 'error' });
	const existing = await assetModel.getAssetTransferItemById(itemId);
	if (!existing) return res.status(404).json({ message: 'Transfer item not found', status: 'error' });
	const body: any = req.body || {};
	const result = await assetModel.updateAssetTransferItem(itemId, body);
	if ((result).affectedRows === 0) {
		return res.status(400).json({ message: 'No fields updated', status: 'error' });
	}
	return res.json({ message: 'Transfer item updated', status: 'success' });
};

export const deleteAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ message: 'Invalid item id', status: 'error' });
	const existing = await assetModel.getAssetTransferItemById(itemId);
	if (!existing) return res.status(404).json({ message: 'Transfer item not found', status: 'error' });
	const result = await assetModel.deleteAssetTransferItem(itemId);
	if ((result as any).affectedRows === 0) return res.status(404).json({ message: 'Transfer item not found', status: 'error' });
	return res.json({ message: 'Transfer item deleted', status: 'success' });
};

export const getAssetTransferItems = async (req: Request, res: Response) => {
	const rawItems = await assetModel.getAllAssetTransferItems();
	const baseItems = Array.isArray(rawItems) ? (rawItems as any[]) : [];
	// Optional filter by new_owner ramco_id: ?new_owner=000277
	const newOwnerParam = typeof req.query.new_owner === 'string' ? req.query.new_owner.trim() : '';
	const itemsArr = newOwnerParam
		? baseItems.filter((it: any) => String(it?.new_owner || '') === newOwnerParam)
		: baseItems;

	// Gather lookup IDs
	const employeeIds = new Set<string>();
	const costcenterIds = new Set<number>();
	const departmentIds = new Set<number>();
	const locationIds = new Set<number>();
	const assetIds = new Set<number>();
	const typeIds = new Set<number>();
	const transferRequestIds = new Set<number>();

	for (const it of itemsArr) {
		if (it.current_owner) employeeIds.add(String(it.current_owner));
		if (it.new_owner) employeeIds.add(String(it.new_owner));
		if (typeof it.current_costcenter_id === 'number') costcenterIds.add(it.current_costcenter_id);
		if (typeof it.new_costcenter_id === 'number') costcenterIds.add(it.new_costcenter_id);
		if (typeof it.current_department_id === 'number') departmentIds.add(it.current_department_id);
		if (typeof it.new_department_id === 'number') departmentIds.add(it.new_department_id);
		if (typeof it.current_location_id === 'number') locationIds.add(it.current_location_id);
		if (typeof it.new_location_id === 'number') locationIds.add(it.new_location_id);
		if (typeof it.asset_id === 'number') assetIds.add(it.asset_id);
		if (typeof it.type_id === 'number') typeIds.add(it.type_id);
		if (typeof it.transfer_id === 'number') transferRequestIds.add(it.transfer_id);
	}

	// Fetch lookups in parallel (defensive: fall back to empty arrays)
	const [employeesRaw, costcentersRaw, departmentsRaw, locationsRaw, assetsRaw, typesRaw, requestsRaw, checklistsByTypeRaw] = await Promise.all([
		assetModel.getEmployees(undefined, undefined, undefined, undefined, undefined, Array.from(employeeIds), undefined).catch(() => []),
		assetModel.getCostcenters().catch(() => []),
		assetModel.getDepartments().catch(() => []),
		assetModel.getLocations().catch(() => []),
		Promise.all(Array.from(assetIds).map(id => assetModel.getAssetById(id))).catch(() => []),
		assetModel.getTypes().catch(() => []),
		Promise.all(Array.from(transferRequestIds).map(id => assetModel.getAssetTransferById(id))).catch(() => []),
		Promise.all(Array.from(typeIds).map(id => assetModel.getTransferChecklists(id))).catch(() => [])
	]);

	// Build maps
	const empMap = new Map<string, any>((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((c: any) => [Number(c.id), c]));
	const departmentMap = new Map<number, any>((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
	const locationMap = new Map<number, any>((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const requestMap = new Map<number, any>((Array.isArray(requestsRaw) ? requestsRaw : []).filter(r => r.id).map((r: any) => [Number(r.id), r]));
	// Flatten checklist arrays and map by id for fast lookup
	const allChecklistsFlat: any[] = Array.isArray(checklistsByTypeRaw)
		? (checklistsByTypeRaw as any[]).reduce((acc: any[], arr: any) => {
			if (Array.isArray(arr)) acc.push(...arr);
			return acc;
		}, [])
		: [];
	const checklistMap = new Map<number, any>(allChecklistsFlat.filter(c => c?.id).map((c: any) => [Number(c.id), c]));

	const enriched = itemsArr.map(it => {
		const transferReq = requestMap.get(Number(it.transfer_id));
		const transfer_by_ramco = transferReq?.transfer_by ? String(transferReq.transfer_by) : null;
		const transfer_by_emp = transfer_by_ramco ? empMap.get(transfer_by_ramco) : null;
		const currentOwnerEmp = it.current_owner ? empMap.get(String(it.current_owner)) : null;
		const newOwnerEmp = it.new_owner ? empMap.get(String(it.new_owner)) : null;
		const currCC = typeof it.current_costcenter_id === 'number' ? costcenterMap.get(it.current_costcenter_id) : null;
		const newCC = typeof it.new_costcenter_id === 'number' ? costcenterMap.get(it.new_costcenter_id) : null;
		const currDept = typeof it.current_department_id === 'number' ? departmentMap.get(it.current_department_id) : null;
		const newDept = typeof it.new_department_id === 'number' ? departmentMap.get(it.new_department_id) : null;
		const currLoc = typeof it.current_location_id === 'number' ? locationMap.get(it.current_location_id) : null;
		const newLoc = typeof it.new_location_id === 'number' ? locationMap.get(it.new_location_id) : null;
		const assetObj = typeof it.asset_id === 'number' ? assetMap.get(it.asset_id) : null;
		const typeObj = typeof it.type_id === 'number' ? typeMap.get(it.type_id) : null;
		return {
			acceptance_attachments: ((): null | string[] => {
				const v = (it).acceptance_attachments;
				if (!v) return null;
				if (Array.isArray(v)) return v as string[];
				if (typeof v === 'string') {
					try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
				}
				return null;
			})(),
			acceptance_by: it.acceptance_by || null,
			acceptance_checklist_items: ((): any[] | null => {
				const v = (it).acceptance_checklist_items;
				if (v == null) return null;
				let ids: number[] = [];
				if (typeof v === 'string') {
					ids = v.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
				} else if (Array.isArray(v)) {
					ids = v.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
				}
				if (!ids.length) return null;
				return ids
					.map(id => checklistMap.get(id))
					.filter(Boolean)
					.map((c: any) => ({ id: c.id, item: c.item, type_id: c.type_id }));
			})(),
			// Acceptance fields (NOT approval fields - those belong to transfer_requests)
			acceptance_date: it.acceptance_date || null,
			acceptance_remarks: (it).acceptance_remarks ?? null,
			approval_date: it.approval_date || null,
			approval_status: it.approval_status || 'pending',
			approved_by: it.approved_by || null,
			asset: assetObj ? { id: assetObj.id, register_number: assetObj.register_number || null } : (it.asset_id ? { id: it.asset_id, register_number: null } : null),
			attachment: it.attachment,
			created_at: it.created_at,
			current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof it.current_costcenter_id === 'number' ? { id: it.current_costcenter_id, name: null } : null),
			current_department: currDept ? { id: currDept.id, name: currDept.name || currDept.code || null } : (typeof it.current_department_id === 'number' ? { id: it.current_department_id, name: null } : null),
			current_location: currLoc ? { id: currLoc.id, name: currLoc.name || null } : (typeof it.current_location_id === 'number' ? { id: it.current_location_id, name: null } : null),
			current_owner: currentOwnerEmp ? { name: currentOwnerEmp.full_name || currentOwnerEmp.name || null, ramco_id: currentOwnerEmp.ramco_id } : (it.current_owner ? { name: null, ramco_id: String(it.current_owner) } : null),
			effective_date: it.effective_date,
			id: it.id,
			new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof it.new_costcenter_id === 'number' ? { id: it.new_costcenter_id, name: null } : null),
			new_department: newDept ? { id: newDept.id, name: newDept.name || newDept.code || null } : (typeof it.new_department_id === 'number' ? { id: it.new_department_id, name: null } : null),
			new_location: newLoc ? { id: newLoc.id, name: newLoc.name || null } : (typeof it.new_location_id === 'number' ? { id: it.new_location_id, name: null } : null),
			new_owner: newOwnerEmp ? { name: newOwnerEmp.full_name || newOwnerEmp.name || null, ramco_id: newOwnerEmp.ramco_id } : (it.new_owner ? { name: null, ramco_id: String(it.new_owner) } : null),
			reason: it.reason,
			remarks: it.remarks,
			return_to_asset_manager: it.return_to_asset_manager,
			transfer_by: transfer_by_emp ? { name: transfer_by_emp.full_name || transfer_by_emp.name || null, ramco_id: transfer_by_emp.ramco_id } : null,
			transfer_id: it.transfer_id,
			type: typeObj ? { id: typeObj.id, name: typeObj.name || null } : (it.type_id ? { id: it.type_id, name: null } : null),
			updated_at: it.updated_at
		};
	});

	return res.json({ data: enriched, message: 'All transfer items retrieved', status: 'success' });
};

// TypeScript interface for asset transfer detail item
export interface AssetTransferDetailItem {
	acceptance_remarks: null | string;
	accepted_at: null | string;
	accepted_by: null | string;
	asset_type: string;
	attachment: null | string;
	created_at: string;
	curr_costcenter: null | number;
	curr_department: null | number;
	curr_district: null | number;
	curr_owner: null | string;
	effective_date: null | string;
	id: number;
	identifier: string;
	new_costcenter: null | number;
	new_department: null | number;
	new_district: null | number;
	new_owner: null | string;
	reasons: null | string;
	transfer_request_id: number;
	transfer_type: string;
	updated_at: string;
	// ...add any other fields as needed
}

export const updateAssetTransferApprovalStatusById = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	const { status, supervisorId } = req.body; // status: 'approved' or 'rejected', supervisorId: ramco_id
	if (!requestId || !status || !supervisorId) {
		return res.status(400).json({ message: 'Invalid request data', status: 'error' });
	}
	// Fetch the request
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
	}
	// Update approval fields
	const now = new Date();
	await assetModel.updateAssetTransfer(requestId, {
		...request,
		approval_date: now,
		approval_id: supervisorId,
		request_status: status
	});

	// Also update individual transfer items with approval status
	const mapApprovalStatus = (status: string): string => {
		const statusLower = String(status).toLowerCase();
		if (statusLower === 'approved') return 'approved';
		if (statusLower === 'rejected') return 'rejected';
		if (statusLower === 'completed') return 'completed';
		return statusLower;
	};

	await assetModel.bulkUpdateTransferItemsApproval([requestId], mapApprovalStatus(status), supervisorId, now);

	// Fetch requestor and supervisor
	const requestor = await assetModel.getEmployeeByRamco(request.requestor);
	const supervisor = await assetModel.getEmployeeByRamco(supervisorId);
	// Fetch transfer items
	const itemsRaw = await assetModel.getAssetTransferItemByRequestId(requestId);
	const items = Array.isArray(itemsRaw)
		? itemsRaw
			.filter(item => item && typeof item === 'object' && 'transfer_type' in item && 'identifier' in item)
			.map(item => item as any)
		: [];
	// Send notification to requestor
	if (requestor.email) {
		await sendMail(requestor.email, `Asset Transfer Request ${status.toUpperCase()}`, `Your asset transfer request #${request.request_no} has been ${status} by your supervisor.`);
	}
	// Notify each item owner/employee
	for (const item of items) {
		let ownerRamcoId: null | string = null;
		if (item.transfer_type === 'Employee' && item.identifier) {
			ownerRamcoId = item.identifier;
		} else if (item.transfer_type === 'Asset' && item.curr_owner) {
			ownerRamcoId = item.curr_owner;
		}
		if (ownerRamcoId) {
			const emp = await assetModel.getEmployeeByRamco(ownerRamcoId);
			if (emp.email) {
				// Send simple status update email
				await sendMail(emp.email, `Asset Transfer Status Update #${request.request_no}`, `Your asset transfer request status has been updated to ${status}.`);
			}
		}
	}
	res.json({ message: `Asset transfer request ${status}. Notifications sent.`, status: 'success' });
};

// --- EMAIL APPROVAL/REJECTION HANDLERS FOR EMAIL LINKS ---
// GET /api/assets/asset-transfer/approve?id=...&token=...
export const approveAssetTransferByEmail = async (req: Request, res: Response) => {
	const { id, token } = req.query;
	// TODO: Validate token (implement real token validation in production)
	if (!id || !token) {
		return res.status(400).send('Invalid approval link.');
	}
	// Fetch the request
	const request = await assetModel.getAssetTransferById(Number(id));
	if (!request) return res.status(404).send('Request not found.');
	// Fetch requestor's employee record to get supervisor
	const requestor = await assetModel.getEmployeeByRamco(request.requestor);
	const supervisorId = requestor.wk_spv_id;
	if (!supervisorId) return res.status(400).send('Supervisor not found.');
	// Call approval logic directly
	await updateAssetTransferApprovalStatusById({
		...req,
		body: { status: 'approved', supervisorId },
		params: { id },
	} as any, res);
};
// GET /api/assets/asset-transfer/reject?id=...&token=...
export const rejectAssetTransferByEmail = async (req: Request, res: Response) => {
	const { id, token } = req.query;
	// TODO: Validate token (implement real token validation in production)
	if (!id || !token) {
		return res.status(400).send('Invalid rejection link.');
	}
	// Fetch the request
	const request = await assetModel.getAssetTransferById(Number(id));
	if (!request) return res.status(404).send('Request not found.');
	// Fetch requestor's employee record to get supervisor
	const requestor = await assetModel.getEmployeeByRamco(request.requestor);
	const supervisorId = requestor.wk_spv_id;
	if (!supervisorId) return res.status(400).send('Supervisor not found.');
	// Call rejection logic directly
	await updateAssetTransferApprovalStatusById({
		...req,
		body: { status: 'rejected', supervisorId },
		params: { id },
	} as any, res);
};

// POST /api/assets/transfers/:id/resend-approval-notification
// Resend approval notification to supervisor and HOD (no body needed - auto-determines recipients)
export const resendApprovalNotification = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).json({ 
			message: 'Transfer ID is required', 
			status: 'error' 
		});
	}

	try {
		// Fetch transfer request
		const request = await assetModel.getAssetTransferById(Number(id));
		if (!request) {
			return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
		}

		// Fetch requestor (use transfer_by from database)
		const requestorRamcoId = request.transfer_by || request.requestor;
		if (!requestorRamcoId) {
			return res.status(400).json({ message: 'Requestor (transfer_by) not found in transfer request', status: 'error' });
		}

		const requestor = await assetModel.getEmployeeByRamco(requestorRamcoId);
		if (!requestor) {
			return res.status(400).json({ message: 'Requestor employee not found', status: 'error' });
		}

		// Fetch transfer items
		const itemsResult = await assetModel.getAssetTransferItemByRequestId(Number(id));
		const items = Array.isArray(itemsResult) ? itemsResult : [];

		if (items.length === 0) {
			return res.status(400).json({ message: 'No transfer items found', status: 'error' });
		}

		// Get all reference data for enrichment
		const assetIds = items
			.map((item: any) => Number(item.asset_id))
			.filter((id: any) => Number.isFinite(id) && id > 0);
		
		const [employees, types, costcenters, departments, districts, assetsData] = await Promise.all([
			assetModel.getEmployees(),
			assetModel.getTypes(),
			assetModel.getCostcenters(),
			assetModel.getDepartments(),
			assetModel.getDistricts(),
			assetIds.length > 0 ? assetModel.getAssetsByIds(assetIds) : Promise.resolve([])
		]);

		// Build maps
		const empMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [String(e.ramco_id), e]));
		const typeMap = new Map((Array.isArray(types) ? types : []).map((t: any) => [Number(t.id), t]));
		const costcenterMap = new Map((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [Number(c.id), c]));
		const departmentMap = new Map((Array.isArray(departments) ? departments : []).map((d: any) => [Number(d.id), d]));
		const districtMap = new Map((Array.isArray(districts) ? districts : []).map((d: any) => [Number(d.id), d]));
		const assetMap = new Map((Array.isArray(assetsData) ? assetsData : []).map((a: any) => [Number(a.id), a]));

		// Enrich requestor with readable org fields from request (same as createAssetTransfer)
		if (typeof requestor === 'object' && requestor) {
			(requestor as any).costcenter = request.costcenter_id != null ? costcenterMap.get(request.costcenter_id) || null : (requestor as any).costcenter || null;
			(requestor as any).department = request.department_id != null ? departmentMap.get(request.department_id) || null : (requestor as any).department || null;
			(requestor as any).district = request.district_id != null ? districtMap.get(request.district_id) || null : (requestor as any).district || null;
		}

		// Enrich items with display data (reusing same pattern as createAssetTransfer)
		const enrichedItems = items.map((item: any) => {
			const currOwnerEmp = item.current_owner && empMap.has(item.current_owner) ? empMap.get(item.current_owner) : null;
			const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.current_owner || '-';
			const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
			const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
			
			const currCostcenterKey = Number(item.current_costcenter_id);
			const currCostcenterObj = Number.isFinite(currCostcenterKey) && costcenterMap.has(currCostcenterKey) ? costcenterMap.get(currCostcenterKey) : null;
			const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? (currCostcenterObj).name : (item.current_costcenter_id ?? '-');
			const newCostcenterKey = Number(item.new_costcenter_id);
			const newCostcenterObj = Number.isFinite(newCostcenterKey) && costcenterMap.has(newCostcenterKey) ? costcenterMap.get(newCostcenterKey) : null;
			const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? (newCostcenterObj).name : (item.new_costcenter_id ?? '-');
			
			const currDepartmentKey = Number(item.current_department_id);
			const currDepartmentObj = Number.isFinite(currDepartmentKey) && departmentMap.has(currDepartmentKey) ? departmentMap.get(currDepartmentKey) : null;
			const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? (currDepartmentObj).code : (item.current_department_id ?? '-');
			const newDepartmentKey = Number(item.new_department_id);
			const newDepartmentObj = Number.isFinite(newDepartmentKey) && departmentMap.has(newDepartmentKey) ? departmentMap.get(newDepartmentKey) : null;
			const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? (newDepartmentObj).code : (item.new_department_id ?? '-');
			
			const currLocationKey = Number(item.current_location_id);
			const currDistrictObj = Number.isFinite(currLocationKey) && districtMap.has(currLocationKey) ? districtMap.get(currLocationKey) : null;
			const currDistrictCode = currDistrictObj ? ((currDistrictObj).code || (currDistrictObj).name || item.current_location_id || '-') : (item.current_location_id || '-');
			const newLocationKey = Number(item.new_location_id);
			const newDistrictObj = Number.isFinite(newLocationKey) && districtMap.has(newLocationKey) ? districtMap.get(newLocationKey) : null;
			const newDistrictCode = newDistrictObj ? ((newDistrictObj).code || (newDistrictObj).name || item.new_location_id || '-') : (item.new_location_id || '-');
			
			const typeObj = item.type_id ? typeMap.get(Number(item.type_id)) : null;
			const typeName = typeObj ? (typeObj.name || '') : (item.transfer_type || '');
			
			// Fetch asset register_number from assets table
			const assetKey = Number(item.asset_id);
			const assetObj = Number.isFinite(assetKey) && assetMap.has(assetKey) ? assetMap.get(assetKey) : null;
			const registerNumber = assetObj ? (assetObj.register_number || assetObj.identifier || assetObj.asset_code || '-') : (item.register_number || item.identifier || item.asset_code || '-');
			
			return {
				...item,
				currCostcenterName,
				currDepartmentCode,
				currDistrictCode,
				currOwnerName,
				identifierDisplay: registerNumber,
				newCostcenterName,
				newDepartmentCode,
				newDistrictCode,
				newOwnerName,
				register_number: registerNumber,
				transfer_type: typeName,
				reasons: item.reason
			};
		});

		// Get supervisor from workflow (same as createAssetTransfer)
		const deptIdForApproval = requestor?.department_id ?? request.department_id;
		let supervisorObj = null;
		
		if (deptIdForApproval != null && Number.isFinite(deptIdForApproval)) {
			supervisorObj = await getWorkflowPicByDepartment('asset transfer', 'approver', deptIdForApproval);
			
			// Ensure email is resolved from employees table by ramco_id
			if (supervisorObj?.ramco_id && !supervisorObj?.email) {
				try {
					const empData = await assetModel.getEmployeeByRamco(String(supervisorObj.ramco_id));
					if (empData?.email) {
						supervisorObj.email = empData.email;
					}
				} catch (err) {
					console.error('Error resolving supervisor email:', err);
				}
			}
		}

		// Fallback: use requestor's supervisor
		if (!supervisorObj && requestor?.wk_spv_id) {
			supervisorObj = await assetModel.getEmployeeByRamco(requestor.wk_spv_id);
		}

		// Build frontend approval portal URL with signed credential token if approver is available
		let portalUrl: string | undefined = undefined;
		if (supervisorObj?.ramco_id) {
			const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
			const credData = { ramco_id: String(supervisorObj.ramco_id), transfer_id: Number(id) } as any;
			const token = jwt.sign(credData, secret, { expiresIn: '3d' } as SignOptions);
			const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/?$/, '');
			const deptForPortal = (Number.isFinite(deptIdForApproval as any) && deptIdForApproval != null)
				? Number(deptIdForApproval)
				: (requestor?.department_id ?? request.department_id ?? '');
			const deptParam = deptForPortal !== '' ? encodeURIComponent(String(deptForPortal)) : '';
			portalUrl = `${frontendUrl}/assets/transfer/portal/${encodeURIComponent(String(id))}?action=approve&authorize=${encodeURIComponent(String(supervisorObj.ramco_id))}` +
				(deptParam ? `&dept=${deptParam}` : '') +
				`&_cred=${encodeURIComponent(token)}`;
		}

		// Send emails
		const sentTo = [];

		// Send to supervisor
		if (supervisorObj?.email) {
			try {
				const { html, subject } = assetTransferT2HodApprovalRequestEmail({
					items: enrichedItems,
					request,
					requestor,
					supervisor: supervisorObj,
					portalUrl
				});
				await sendMail(supervisorObj.email, subject, html);
				sentTo.push({ type: 'Supervisor', name: supervisorObj.full_name, email: supervisorObj.email });
			} catch (err) {
				console.error('Failed to send notification to supervisor:', err);
			}
		}

		// Send to HOD (head of requestor's department)
		if (requestor?.supervisor_ramco_id || requestor?.hod_ramco_id) {
			const hodId = requestor.supervisor_ramco_id || requestor.hod_ramco_id;
			const hodObj = await assetModel.getEmployeeByRamco(hodId);
			
			if (hodObj?.email && hodObj.email !== supervisorObj?.email) { // Don't duplicate if same person
				try {
					const { html, subject } = assetTransferT2HodApprovalRequestEmail({
						items: enrichedItems,
						request,
						requestor,
						supervisor: hodObj,
						portalUrl
					});
					await sendMail(hodObj.email, subject, html);
					sentTo.push({ type: 'HOD', name: hodObj.full_name, email: hodObj.email });
				} catch (err) {
					console.error('Failed to send notification to HOD:', err);
				}
			}
		}

		if (sentTo.length === 0) {
			return res.status(400).json({
				message: 'No valid recipients found (supervisor or HOD)',
				status: 'error'
			});
		}

		return res.json({
			message: `Approval notification resent successfully`,
			status: 'success',
			data: {
				transferId: id,
				sentTo,
				sentAt: new Date().toISOString()
			}
		});
	} catch (error: any) {
		console.error('Error resending approval notification:', error);
		return res.status(500).json({
			message: 'Failed to resend approval notification',
			status: 'error',
			error: error.message
		});
	}
};

export const resendAcceptanceNotification = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).json({ 
			message: 'Transfer ID is required', 
			status: 'error' 
		});
	}

	try {
		// Fetch transfer request
		const request = await assetModel.getAssetTransferById(Number(id));
		if (!request) {
			return res.status(404).json({ message: 'Transfer request not found', status: 'error' });
		}

		// Fetch transfer items to get new owners
		const itemsResult = await assetModel.getAssetTransferItemByRequestId(Number(id));
		const items = Array.isArray(itemsResult) ? itemsResult : [];

		if (items.length === 0) {
			return res.status(400).json({ message: 'No transfer items found', status: 'error' });
		}

		// Get all reference data for enrichment
		const assetIds = items
			.map((item: any) => Number(item.asset_id))
			.filter((id: any) => Number.isFinite(id) && id > 0);
		
		const [employees, types, costcenters, departments, districts, assetsData] = await Promise.all([
			assetModel.getEmployees(),
			assetModel.getTypes(),
			assetModel.getCostcenters(),
			assetModel.getDepartments(),
			assetModel.getDistricts(),
			assetIds.length > 0 ? assetModel.getAssetsByIds(assetIds) : Promise.resolve([])
		]);

		// Build maps
		const empMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [String(e.ramco_id), e]));
		const typeMap = new Map((Array.isArray(types) ? types : []).map((t: any) => [Number(t.id), t]));
		const costcenterMap = new Map((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [Number(c.id), c]));
		const departmentMap = new Map((Array.isArray(departments) ? departments : []).map((d: any) => [Number(d.id), d]));
		const districtMap = new Map((Array.isArray(districts) ? districts : []).map((d: any) => [Number(d.id), d]));
		const assetMap = new Map((Array.isArray(assetsData) ? assetsData : []).map((a: any) => [Number(a.id), a]));

		// Enrich items with display data
		const enrichedItems = items.map((item: any) => {
			const currOwnerEmp = item.current_owner && empMap.has(item.current_owner) ? empMap.get(item.current_owner) : null;
			const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.current_owner || '-';
			const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
			const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
			
			const currCostcenterKey = Number(item.current_costcenter_id);
			const currCostcenterObj = Number.isFinite(currCostcenterKey) && costcenterMap.has(currCostcenterKey) ? costcenterMap.get(currCostcenterKey) : null;
			const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? (currCostcenterObj).name : (item.current_costcenter_id ?? '-');
			const newCostcenterKey = Number(item.new_costcenter_id);
			const newCostcenterObj = Number.isFinite(newCostcenterKey) && costcenterMap.has(newCostcenterKey) ? costcenterMap.get(newCostcenterKey) : null;
			const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? (newCostcenterObj).name : (item.new_costcenter_id ?? '-');
			
			const currDepartmentKey = Number(item.current_department_id);
			const currDepartmentObj = Number.isFinite(currDepartmentKey) && departmentMap.has(currDepartmentKey) ? departmentMap.get(currDepartmentKey) : null;
			const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? (currDepartmentObj).code : (item.current_department_id ?? '-');
			const newDepartmentKey = Number(item.new_department_id);
			const newDepartmentObj = Number.isFinite(newDepartmentKey) && departmentMap.has(newDepartmentKey) ? departmentMap.get(newDepartmentKey) : null;
			const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? (newDepartmentObj).code : (item.new_department_id ?? '-');
			
			const currLocationKey = Number(item.current_location_id);
			const currDistrictObj = Number.isFinite(currLocationKey) && districtMap.has(currLocationKey) ? districtMap.get(currLocationKey) : null;
			const currDistrictCode = currDistrictObj ? ((currDistrictObj).code || (currDistrictObj).name || item.current_location_id || '-') : (item.current_location_id || '-');
			const newLocationKey = Number(item.new_location_id);
			const newDistrictObj = Number.isFinite(newLocationKey) && districtMap.has(newLocationKey) ? districtMap.get(newLocationKey) : null;
			const newDistrictCode = newDistrictObj ? ((newDistrictObj).code || (newDistrictObj).name || item.new_location_id || '-') : (item.new_location_id || '-');
			
			const typeObj = item.type_id ? typeMap.get(Number(item.type_id)) : null;
			const typeName = typeObj ? (typeObj.name || '') : (item.transfer_type || '');
			
			// Fetch asset register_number from assets table
			const assetKey = Number(item.asset_id);
			const assetObj = Number.isFinite(assetKey) && assetMap.has(assetKey) ? assetMap.get(assetKey) : null;
			const registerNumber = assetObj ? (assetObj.register_number || assetObj.identifier || assetObj.asset_code || '-') : (item.register_number || item.identifier || item.asset_code || '-');
			
			return {
				...item,
				currCostcenterName,
				currDepartmentCode,
				currDistrictCode,
				currOwnerName,
				identifierDisplay: registerNumber,
				newCostcenterName,
				newDepartmentCode,
				newDistrictCode,
				newOwnerName,
				register_number: registerNumber,
				transfer_type: typeName,
				reasons: item.reason
			};
		});

		// Get unique new owners from items
		const newOwnerIds = Array.from(new Set(items.map((item: any) => String(item.new_owner)).filter(Boolean)));
		if (newOwnerIds.length === 0) {
			return res.status(400).json({
				message: 'No new owners found in transfer items',
				status: 'error'
			});
		}

		// Get requestor data
		const requestorRamcoId = request.transfer_by || request.requestor;
		let requestor = null;
		if (requestorRamcoId) {
			requestor = await assetModel.getEmployeeByRamco(requestorRamcoId);
		}

		// Build acceptance portal link and send to new owners
		const sentTo: any[] = [];
		const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
		const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/?$/, '');

		for (const newOwnerId of newOwnerIds) {
			try {
				const newOwner = empMap.get(newOwnerId);
				if (!newOwner?.email) continue;

				// Generate credential code for acceptance portal
				const credentialCode = generateAcceptanceCredentialCode(Number(id), newOwnerId);
				const acceptancePortalUrl = `${frontendUrl}/assets/transfer/acceptance/${id}?new_owner=${encodeURIComponent(newOwnerId)}&_cred=${encodeURIComponent(credentialCode)}`;

				// Filter items for this new owner
				const itemsForNewOwner = enrichedItems.filter((item: any) => String(item.new_owner) === newOwnerId);

				const { html, subject } = assetTransferApprovedNewOwnerEmail({
					request,
					itemsForNewOwner,
					newOwner,
					requestor,
					approver: null,
					transferId: Number(id),
					credentialCode
				});

				await sendMail(newOwner.email, subject, html);
				sentTo.push({
					type: 'New Owner',
					name: newOwner.full_name,
					email: newOwner.email,
					itemCount: itemsForNewOwner.length
				});
			} catch (err) {
				console.error(`Failed to send acceptance notification to ${newOwnerId}:`, err);
			}
		}

		if (sentTo.length === 0) {
			return res.status(400).json({
				message: 'Failed to send acceptance notification to any new owners',
				status: 'error'
			});
		}

		return res.json({
			message: `Acceptance notification resent successfully`,
			status: 'success',
			data: {
				transferId: id,
				sentTo,
				sentAt: new Date().toISOString()
			}
		});
	} catch (error: any) {
		console.error('Error resending acceptance notification:', error);
		return res.status(500).json({
			message: 'Failed to resend acceptance notification',
			status: 'error',
			error: error.message
		});
	}
};

/* === TRANSFER CHECKLIST === */
export const getTransferChecklist = async (req: Request, res: Response) => {
	// Optional filter by ?type={type_id}
	const typeParam = typeof req.query.type === 'string' ? Number(req.query.type) : undefined;
	if (typeParam !== undefined && Number.isNaN(typeParam)) {
		return res.status(400).json({ message: 'type must be a valid number', status: 'error' });
	}
	// Fetch basic transfer checklist items
	const checklistItems = await assetModel.getTransferChecklists(typeParam);
	if (!Array.isArray(checklistItems)) {
		return res.status(500).json({ message: 'Failed to fetch checklist items', status: 'error' });
	}

	// Fetch all types for mapping
	const typesRaw = await assetModel.getTypes();
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));

	// Enrich checklist items with type information
	const enrichedChecklistItems = (checklistItems as any[]).map(item => ({
		...item,
		type_id: item.type_id && typeMap.has(item.type_id)
			? typeMap.get(item.type_id)
			: { id: item.type_id, name: null }
	}));

	res.json({ data: enrichedChecklistItems, message: 'Transfer checklist items retrieved successfully', status: 'success' });
}

export const getTransferChecklistById = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	if (!checklistId) {
		return res.status(400).json({ message: 'Invalid checklist ID', status: 'error' });
	}
	// Fetch the checklist item
	const checklistItem = await assetModel.getTransferChecklistById(checklistId);
	if (!checklistItem) {
		return res.status(404).json({ message: 'Checklist item not found', status: 'error' });
	}
	// Fetch all types for mapping
	const typesRaw = await assetModel.getTypes();
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
	// Enrich with type information
	checklistItem.type_id = checklistItem.type_id && typeMap.has(checklistItem.type_id)
		? typeMap.get(checklistItem.type_id)
		: { id: checklistItem.type_id, name: null };

	res.json({ data: checklistItem, message: 'Transfer checklist item retrieved successfully', status: 'success' });
}


export const createTransferChecklist = async (req: Request, res: Response) => {
	const { created_by, is_required, item, type_id } = req.body;
	if (!item || !type_id) {
		return res.status(400).json({ message: 'Name and type_id are required', status: 'error' });
	}
	// Create the checklist item
	const insertId = await assetModel.createTransferChecklist({ created_by, is_required, item, type_id });
	res.status(201).json({ data: { id: insertId }, message: 'Transfer checklist item created successfully', status: 'success' });
}

export const updateTransferChecklist = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	const { is_required, item, type_id } = req.body;
	if (!checklistId || !item || !type_id) {
		return res.status(400).json({ message: 'Invalid checklist ID or missing fields', status: 'error' });
	}
	// Update the checklist item
	const result = await assetModel.updateTransferChecklist(checklistId, { is_required, item, type_id });
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ message: 'Checklist item not found', status: 'error' });
	}
	res.json({ message: 'Transfer checklist item updated successfully', status: 'success' });
}

export const deleteTransferChecklist = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	if (!checklistId) {
		return res.status(400).json({ message: 'Invalid checklist ID', status: 'error' });
	}
	// Delete the checklist item
	const result = await assetModel.deleteTransferChecklist(checklistId);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ message: 'Checklist item not found', status: 'error' });
	}
	res.json({ message: 'Transfer checklist item deleted successfully', status: 'success' });
}

/* ========== ASSET STATUS UPDATE ========== */
/**
 * Update asset status (classification, record_status, condition_status) with audit trail
 * PUT /api/assets/:asset_id/update-status
 */
export const updateAssetStatus = async (req: Request, res: Response) => {
	const assetId = Number(req.params.id);
	const { classification, record_status, condition_status, updated_by } = req.body;

	// Validation
	if (!assetId || isNaN(assetId)) {
		return res.status(400).json({
			status: 'error',
			message: 'Invalid asset ID',
			data: null
		});
	}

	if (!updated_by) {
		return res.status(400).json({
			status: 'error',
			message: 'updated_by (ramco_id) is required',
			data: null
		});
	}

	// At least one status field must be provided
	if (!classification && !record_status && !condition_status) {
		return res.status(400).json({
			status: 'error',
			message: 'At least one status field (classification, record_status, or condition_status) is required',
			data: null
		});
	}

	try {
		// Get current asset data to capture before state
		const currentAsset = await assetModel.getAssetById(assetId);
		if (!currentAsset) {
			return res.status(404).json({
				status: 'error',
				message: 'Asset not found',
				data: null
			});
		}

		// Prepare before/after data for audit trail
		const beforeData = {
			classification: currentAsset.classification,
			record_status: currentAsset.record_status,
			condition_status: currentAsset.condition_status
		};

		const afterData = {
			classification: classification !== undefined ? classification : currentAsset.classification,
			record_status: record_status !== undefined ? record_status : currentAsset.record_status,
			condition_status: condition_status !== undefined ? condition_status : currentAsset.condition_status
		};

		// Update asset status
		const updateResult = await assetModel.updateAssetStatus(assetId, {
			classification,
			record_status,
			condition_status,
			updated_by
		});

		if (!updateResult.updated) {
			return res.status(500).json({
				status: 'error',
				message: 'Failed to update asset status',
				data: null
			});
		}

		// Create audit trail entry
		await assetModel.createStatusHistory(assetId, beforeData, afterData, updated_by);

		return res.json({
			status: 'success',
			message: 'Asset status updated successfully',
			data: {
				asset_id: assetId,
				before: beforeData,
				after: afterData,
				updated_by,
				updated_at: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('Error updating asset status:', error);
		return res.status(500).json({
			status: 'error',
			message: 'Error updating asset status',
			data: null
		});
	}
}
