import { Request, Response } from 'express';
import * as assetModel from './assetModel';
import * as billingModel from '../p.billing/billingModel';
import { sendMail } from '../utils/mailer';
import jwt, { SignOptions } from 'jsonwebtoken';
import assetTransferRequestEmail from '../utils/emailTemplates/assetTransferRequest';
import assetTransferSupervisorEmail from '../utils/emailTemplates/assetTransferSupervisorEmail';
import { assetTransferApprovalSummaryEmail } from '../utils/emailTemplates/assetTransferApprovalSummary';
import { assetTransferApprovedRequestorEmail } from '../utils/emailTemplates/assetTransferApprovedRequestor';
import { assetTransferApprovedNewOwnerEmail } from '../utils/emailTemplates/assetTransferApprovedNewOwner';
import { assetTransferCurrentOwnerEmail } from '../utils/emailTemplates/assetTransferCurrentOwner';
import { assetTransferAcceptedRequestorEmail, assetTransferAcceptedCurrentOwnerEmail, assetTransferAcceptedHodEmail } from '../utils/emailTemplates/assetTransferAccepted';
import * as purchaseModel from '../p.purchase/purchaseModel';


/* ========== ASSETS ========== */
export const getAssets = async (req: Request, res: Response) => {
	// Support ?type=[type_id] and ?status=[status] params
	const typeIdParam = req.query.type;
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
		// Supervisor: assets of immediate subordinates
		if (typeof supervisorParam === 'string' && supervisorParam.trim() !== '') {
			try {
				const subsRaw = await assetModel.getEmployees(undefined, undefined, undefined, undefined, [supervisorParam.trim()], undefined, undefined);
				const subs = Array.isArray(subsRaw) ? subsRaw : [];
				const ownerIds = subs
					.filter((e: any) => e && typeof e.ramco_id === 'string' && e.employment_status !== 'resigned')
					.map((e: any) => e.ramco_id);
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
			type_ids: typeIds,
			classification,
			status,
			purpose,
			manager,
			registerNumber,
			owner,
			brandId,
			q
		}, { page, pageSize, sortBy, sortDir: (sortDir as any) });
		assetsRaw = rows as any[];
		total = t;
	} else {
		assetsRaw = await assetModel.getAssets(typeIds, classification, status, manager, registerNumber, owner, brandId, purpose) as any[];
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
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
	const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
	const models = Array.isArray(modelsRaw) ? modelsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
	const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
	const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
	const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];

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
	const data = assets.map((asset: any) => {
		const type = typeMap.get(asset.type_id);

		return {
			id: asset.id,
			entry_code: asset.entry_code,
			classification: asset.classification,
			record_status: asset.record_status,
			purpose: asset.purpose,
			condition_status: asset.condition_status,
			asset_code: asset.asset_code,
			register_number: asset.register_number,
			purchase_date: asset.purchase_date,
			purchase_year: asset.purchase_year,
			purchase_id: asset.purchase_id,
			fuel_type: asset.fuel_type,
			transmission: asset.transmission,
			//unit_price: asset.unit_price,
			//depreciation_length: asset.depreciation_length,
			costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
				? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
				: null,
			department: asset.department_id && departmentMap.has(asset.department_id)
				? { id: asset.department_id, name: departmentMap.get(asset.department_id)?.code || null }
				: null,
			/* district: asset.district_id && districtMap.has(asset.district_id)
			  ? { id: asset.district_id, code: districtMap.get(asset.district_id)?.code || null }
			  : null, */
			location: asset.location_id && locationMap.has(asset.location_id)
				? { id: asset.location_id, name: locationMap.get(asset.location_id)?.name || null }
				: null,
			status: asset.status,
			disposed_date: asset.disposed_date,
			type: type ? {
				id: type.id,
				name: type.name
			} : null,
			category: asset.category_id && categoryMap.has(asset.category_id)
				? {
					id: asset.category_id,
					name: categoryMap.get(asset.category_id)?.name || null
				}
				: null,
			brand: asset.brand_id && brandMap.has(asset.brand_id)
				? {
					id: asset.brand_id,
					name: brandMap.get(asset.brand_id)?.name || null
				}
				: null,
			model: asset.model_id && modelMap.has(asset.model_id)
				? {
					id: asset.model_id,
					name: modelMap.get(asset.model_id)?.name || null
				}
				: null,
			owner: asset.ramco_id && employeeMap.has(asset.ramco_id)
				? {
					ramco_id: employeeMap.get(asset.ramco_id)?.ramco_id || null,
					full_name: employeeMap.get(asset.ramco_id)?.full_name || null
				}
				: null,
		};
	});

	const meta = { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / (pageSize || 1))) };
	res.json({
		status: 'success',
		message: `Assets data retrieved successfully (${data.length} entries${usePaged ? ` of ${total} total` : ''})`,
		data,
		meta
	});
};

export const getAssetById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const asset = await assetModel.getAssetById(id);
	if (!asset) return res.status(404).json({ status: 'error', message: 'Asset not found' });

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
				ramco_id: emp.ramco_id,
				name: emp.full_name,
				email: emp.email,
				contact: emp.contact,
				department: asset.department_id ? (departmentMap.get(asset.department_id)?.code || null) : null,
				costcenter: asset.costcenter_id ? (costcenterMap.get(asset.costcenter_id)?.name || null) : null,
				district: asset.district_id ? (districtMap.get(asset.district_id)?.code || null) : null,
				location: asset.location_id ? (locationMap.get(asset.location_id)?.name || null) : null,
				effective_date: (o as any).effective_date || null
			});
		}
	}

	// Build specs dynamically based on type_id (per-type spec tables named '{type_id}_specs')
	const type = typeMap.get(asset.type_id);
	let specs: any = null;
	if (type && Number.isFinite(type.id)) {
		// fetch from dynamic per-type spec table
		const specRows = await assetModel.getSpecsForAsset(type.id, asset.id);
		if (Array.isArray(specRows) && specRows.length > 0) {
			// use the first row as the spec data (tables store one row per asset)
			const specData = specRows[0];
			// Only include the per-type spec fields; categories/brands/models are already present above
			specs = {
				...specData
			};

			// For computers (type 1) include installed software
			if (type.id === 1) {
				const installedSoftware = await assetModel.getInstalledSoftwareForAsset(asset.id);
				specs.installed_software = installedSoftware || [];
			}
		}
	}

	const assetWithNested = {
		id: asset.id,
		entry_code: asset.entry_code,
		classification: asset.classification,
		status: asset.record_status,
		condition: asset.condition_status,
		register_number: asset.register_number,
		purchase_date: asset.purchase_date,
		purchase_year: asset.purchase_year,
		unit_price: asset.unit_price,
		depreciation_length: asset.depreciation_length,
		depreciation_rate: asset.depreciation_rate,
		costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
			? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
			: null,
		disposed_date: asset.disposed_date,
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
		owner: ownershipsByAsset[asset.id] || [],
		specs,
	};

	res.json({
		status: 'success',
		message: 'Asset data by ID retrieved successfully',
		data: assetWithNested
	});
};

export const createAsset = async (req: Request, res: Response) => {
	const assetData = req.body;
	const result = await assetModel.createAsset(assetData);
	res.status(201).json({
		status: 'success',
		message: 'Asset created successfully',
		result
	});
};

export const updateAsset = async (req: Request, res: Response) => {
	const { id } = req.params;
	const data = req.body;
	const result = await assetModel.updateAsset(Number(id), data);
	res.json({
		status: 'success',
		message: 'Asset updated successfully',
		result
	});
};

export const deleteAsset = async (req: Request, res: Response) => {
	const { id } = req.params;
	const result = await assetModel.deleteAsset(Number(id));
	res.json({
		status: 'success',
		message: 'Asset deleted successfully',
		result
	});
};


/* ======= ASSET MANAGERS ======= */
export const getAssetManagers = async (req: Request, res: Response) => {
		// Fetch all asset managers
		const managers = await assetModel.getAssetManagers();
		if (!Array.isArray(managers)) {
			return res.status(500).json({ status: 'error', message: 'Failed to fetch asset managers' });
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
					ramco_id: emp.ramco_id,
					full_name: emp.full_name,
					email: emp.email,
					contact: emp.contact,
					costcenter: emp.costcenter_id ? { id: emp.costcenter_id, name: costcenterMap.get(emp.costcenter_id)?.name || null } : null,
					department: emp.department_id ? { id: emp.department_id, name: deptMap.get(emp.department_id)?.code || null } : null,
					location: emp.location_id ? { id: emp.location_id, name: locMap.get(emp.location_id)?.name || null } : null
				} : null
			};
		});
		// Optional filter by ?ramco=... query param
		const ramco = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : null;
		if (ramco) {
			enrichedManagers = enrichedManagers.filter((mgr: any) => String(mgr.ramco_id) === ramco);
		}
		res.json({ status: 'success', message: 'Asset managers retrieved successfully', data: enrichedManagers });
}

export const getAssetManagerById = async (req: Request, res: Response) => {
	const managerId = Number(req.params.id);
	if (!managerId) {
		return res.status(400).json({ status: 'error', message: 'Invalid asset manager ID' });
	}
	// Fetch the asset manager
	const manager = await assetModel.getAssetManagerById(managerId);
	if (!manager) {
		return res.status(404).json({ status: 'error', message: 'Asset manager not found' });
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
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			costcenter: costcenter ? { id: costcenter.id, name: costcenter.name || null } : null,
			department: dept ? { id: dept.id, name: dept.code || null } : null,
			location: loc ? { id: loc.id, name: loc.name || null } : null
		};
	}
	res.json({ status: 'success', message: 'Asset manager retrieved successfully', data: { ...manager, employee } });
}

export const createAssetManager = async (req: Request, res: Response) => {
	const data = req.body;
	// Create the asset manager
	const insertId = await assetModel.createAssetManager(data);
	res.status(201).json({ status: 'success', message: 'Asset manager created successfully', data: { id: insertId } });
}

export const updateAssetManager = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const data = req.body;
	// Update the asset manager
	const result = await assetModel.updateAssetManager(data, id);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ status: 'error', message: 'Asset manager not found' });
	}
	res.json({ status: 'success', message: 'Asset manager updated successfully' });
}

export const deleteAssetManager = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) {
		return res.status(400).json({ status: 'error', message: 'Invalid asset manager ID' });
	}
	// Validate asset manager exists
	const manager = await assetModel.getAssetManagerById(id);
	if (!manager) {
		return res.status(404).json({ status: 'error', message: 'Asset manager not found' });
	}
	// Delete the asset manager
	const result = await assetModel.deleteAssetManager(id);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ status: 'error', message: 'Asset manager not found' });
	}
	res.json({ status: 'success', message: 'Asset manager deleted successfully' });
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
		const groupMap = new Map<number, { type_id: number; type_name: string | null; properties: any[] }>();
		for (const r of rows) {
			const tid = Number(r.type_id);
			if (!Number.isFinite(tid)) continue;
			if (!groupMap.has(tid)) {
				const group = { type_id: tid, type_name: typeNameMap.get(tid) ?? null, properties: [] as any[] };
				groupMap.set(tid, group);
				grouped.push(group);
			}
			// Exclude type_id inside individual property
			const { type_id, ...prop } = r as any;
			groupMap.get(tid)!.properties.push(prop);
		}
		return res.json({ status: 'success', message: 'All spec properties retrieved', data: grouped });
	}
	const typeId = Number(typeParam);
	if (!typeId || isNaN(typeId)) return res.status(400).json({ status: 'error', message: 'type_id is invalid' });
	const rows = await assetModel.getSpecPropertiesByType(typeId);
	res.json({ status: 'success', message: 'Spec properties retrieved', data: rows });
};

export const createSpecProperty = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		// payload: { type_id, name, label, data_type, nullable, default_value, options }
		const result: any = await assetModel.createSpecProperty(payload);
		res.status(201).json({ status: 'success', message: 'Spec property created', data: result });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ status: 'error', message, data: null });
	}
};

export const applySpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
	const spec = await assetModel.getSpecPropertyById(id);
	if (!spec) return res.status(404).json({ status: 'error', message: 'Spec property not found' });
	const result: any = await assetModel.applySpecPropertyToType(spec);
	if (result.ok) {
		res.json({ status: 'success', message: 'Spec applied to type table', data: null });
	} else {
		res.status(500).json({ status: 'error', message: 'Failed to apply spec', data: result.error });
	}
};

export const updateSpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
	const result = await assetModel.updateSpecProperty(id, req.body);
	res.json({ status: 'success', message: 'Spec property updated', data: result });
};

export const deleteSpecProperty = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
	const drop = req.query.drop === '1' || req.query.drop === 'true';
	const result = await assetModel.deleteSpecProperty(id, drop);
	res.json({ status: 'success', message: 'Spec property deleted', data: result });
};

export const applyPendingSpecProperties = async (req: Request, res: Response) => {
	const typeParam = req.query.type || req.body.type_id;
	let typeId: number | undefined = undefined;
	if (typeParam !== undefined && typeParam !== null && String(typeParam).trim() !== '') {
		typeId = Number(typeParam);
		if (isNaN(typeId)) return res.status(400).json({ status: 'error', message: 'type_id is invalid' });
	}
	const results = await assetModel.applyPendingSpecProperties(typeId);
	res.json({ status: 'success', message: 'Apply results', data: results });
};


// --- Add this helper near the top of the file ---
function isPlainObjectArray(arr: any): arr is Record<string, any>[] {
	return Array.isArray(arr) && arr.every(e => e && typeof e === 'object' && !Array.isArray(e));
}

// Register batch of assets into purchase registry table
export const registerAssetsBatch = async (req: Request, res: Response) => {
	try {
		const { pr_id, assets, created_by } = req.body || {};
		const prIdNum = Number(pr_id);
		if (!prIdNum || !Array.isArray(assets) || assets.length === 0) {
			return res.status(400).json({ status: 'error', message: 'Invalid payload: pr_id and non-empty assets[] are required', data: null });
		}

		// Basic normalization is handled in model; perform minimal structure check here
		const insertIds = await purchaseModel.createPurchaseAssetRegistryBatch(prIdNum, assets, created_by || null);

		return res.status(201).json({
			status: 'success',
			message: `Registered ${insertIds.length} assets for PR ${prIdNum}`,
			data: { pr_id: prIdNum, insertIds }
		});
	} catch (error) {
		return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to register assets batch', data: null });
	}
}

/* =========== TYPES =========== */
export const getTypes = async (req: Request, res: Response) => {
	const rows = await assetModel.getTypes();
	// Enhance: fetch all employees for manager lookup
	const employees = await assetModel.getEmployees();
	const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
	const data = (rows as any[]).map((type) => {
		let manager = null;
		if (type.manager && employeeMap.has(type.manager)) {
			const emp = employeeMap.get(type.manager);
			manager = { ramco_id: emp.ramco_id, full_name: emp.full_name };
		}
		// Add full image URL if image exists
		let image = type.image;
		if (image) {
			image = `https://${req.get('host')}/uploads/types/${image}`;
		}
		return {
			...type,
			image,
			manager
		};
	});
	res.json({
		status: 'success',
		message: 'Asset type retrieved successfully',
		data
	});
};

export const getTypeById = async (req: Request, res: Response) => {
	const row = await assetModel.getTypeById(Number(req.params.id));
	if (!row) {
		return res.status(404).json({ status: 'error', message: 'Type not found', data: null });
	}
	// Enhance: fetch all employees for manager lookup
	const employees = await assetModel.getEmployees();
	const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
	let manager = null;
	if (row.manager && employeeMap.has(row.ramco_id)) {
		const emp = employeeMap.get(row.ramco_id);
		manager = { ramco_id: emp.ramco_id, full_name: emp.full_name };
	}
	const data = { ...row, manager };
	res.json({
		status: 'success',
		message: 'Asset type retrieved successfully',
		data
	});
};

export const createType = async (req: Request, res: Response) => {
	try {
		const { name, description, image, manager, ramco_id } = req.body;
		// Accept ramco_id from either manager object or direct field
		const resolvedRamcoId = (manager && manager.ramco_id) ? manager.ramco_id : ramco_id;
		const result = await assetModel.createType({ name, description, image, ramco_id: resolvedRamcoId });
		// Ensure correct type for insertId
		const typeId = (result as import('mysql2').ResultSetHeader).insertId;
		// Fetch the created type to return with full image URL
		const type = await assetModel.getTypeById(typeId);
		if (type && type.image) {
			type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
		}
		res.status(201).json({ status: 'success', message: 'Type created', data: type });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ status: 'error', message, data: null });
	}
};

export const updateType = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { name, description, image, manager, ramco_id } = req.body;
		// Accept ramco_id from either manager object or direct field
		const resolvedRamcoId = (manager && manager.ramco_id) ? manager.ramco_id : ramco_id;
		await assetModel.updateType(id, { name, description, image, ramco_id: resolvedRamcoId });
		// Fetch the updated type to return with full image URL
		const type = await assetModel.getTypeById(id);
		if (type && type.image) {
			type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
		}
		res.json({ status: 'success', message: 'Type updated', data: type });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(500).json({ status: 'error', message, data: null });
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
		const ids = (req.query.type as string).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		typeIds = ids;
	}
	const managerParam = req.query.manager;
	let rowsRaw = await assetModel.getCategories(managerParam as any);
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
		status: 'success',
		message: 'Categories data retrieved successfully',
		data
	});
};

export const getCategoryById = async (req: Request, res: Response) => {
	const row = await assetModel.getCategoryById(Number(req.params.id));
	res.json(row);
};

export const createCategory = async (req: Request, res: Response) => {
	// Accept frontend payload with type_id (or typeId), map to type_id for DB
	const { name, type_id, typeId, manager_id } = req.body;
	// Prefer type_id, fallback to typeId
	const result = await assetModel.createCategory({
		name,
		type_id: type_id ?? typeId,
		manager_id: manager_id ?? null
	});
	res.json({
		status: 'success',
		message: 'Category created successfully',
		result
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
		const catIds = (req.query.categories as string).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		categoryIds = catIds;
	}

	// Fetch all brands, categories, types, and models
	let brandsRaw = await assetModel.getBrands();
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

	// Map brands to include categories and models
	const data = [];
	for (const brand of brands) {
		let categoriesForBrand: any[] = [];
		if (brand.id) {
			// Use the proper method to get categories for this brand by brand_id
			const brandCategoriesRaw = await assetModel.getCategoriesByBrandId(brand.id);
			const brandCategories = Array.isArray(brandCategoriesRaw) ? brandCategoriesRaw : [];
			categoriesForBrand = brandCategories.map((cat: any) => ({
				id: cat.id.toString(),
				name: cat.name
			}));
		}

		// Get models for this brand
		const modelsForBrand = modelsMap.get(brand.id) || [];

		data.push({
			id: brand.id.toString(),
			name: brand.name,
			type: brand.type_id ? (typeMap.get(brand.type_id) || null) : null,
			categories: categoriesForBrand,
			models: modelsForBrand
		});
	}

	res.json({
		status: 'success',
		message: 'Models data retrieved successfully',
		data
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
		status: 'success',
		message: 'Brand created successfully',
		result
	});
};

export const updateBrand = async (req: Request, res: Response) => {
	// Accept frontend payload as-is (type_id, category_id)
	const result = await assetModel.updateBrand(Number(req.params.id), req.body);
	res.json({
		status: 'success',
		message: 'Brand updated successfully',
		result
	});
};

export const deleteBrand = async (req: Request, res: Response) => {
	const result = await assetModel.deleteBrand(Number(req.params.id));
	res.json(result);
};


/* =========== BRAND-CATEGORY RELATIONSHIP ENDPOINTS =========== */
export const assignCategoryToBrand = async (req: Request, res: Response) => {
	const { brand_code, category_code } = req.params;
	await assetModel.addBrandCategory(brand_code, category_code);
	res.json({ status: 'success', message: 'Category assigned to brand' });
};

export const unassignCategoryFromBrand = async (req: Request, res: Response) => {
	const { brand_code, category_code } = req.params;
	await assetModel.removeBrandCategory(brand_code, category_code);
	res.json({ status: 'success', message: 'Category unassigned from brand' });
};

export const getCategoriesForBrand = async (req: Request, res: Response) => {
	const { brand_code } = req.params;
	const categories = await assetModel.getCategoriesByBrand(brand_code);
	res.json({ status: 'success', data: categories });
};

export const getBrandsForCategory = async (req: Request, res: Response) => {
	const { category_code } = req.params;
	const brands = await assetModel.getBrandsByCategory(category_code);
	res.json({ status: 'success', data: brands });
};

export const getAllBrandCategoryMappings = async (req: Request, res: Response) => {
	// Get all brands and categories
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	// Build lookup maps
	const brandMap = new Map<string, { id: number; name: string; code: string }>();
	for (const b of brands as any[]) {
		brandMap.set(b.code, { id: b.id, name: b.name, code: b.code });
	}
	const categoryMap = new Map<string, { id: number; name: string; code: string }>();
	for (const c of categories as any[]) {
		categoryMap.set(c.code, { id: c.id, name: c.name, code: c.code });
	}
	// Brute-force all pairs using getCategoriesByBrand for each brand
	let mappings: any[] = [];
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
	res.json({ status: 'success', data: mappings });
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
		const ids = (req.query.brand as string).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
		brandIds = ids;
	}

	// Fetch models from DB with optional filters (type and brand)
	let modelsRaw = await assetModel.getModels(typeId, brandIds.length > 0 ? brandIds : undefined);
	let models: any[] = Array.isArray(modelsRaw) ? modelsRaw : [];
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
	const data = (models as any[]).map((model) => {
		// remove deprecated/changed fields from response (e.g. code) and avoid exposing raw foreign keys
		const { code, type_id, brand_id, category_id, ...rest } = model as any;
		return {
			...rest,
			// attach type object from type_id
			type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null,
			brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
			category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null
		};
	});

	res.json({
		status: 'success',
		message: 'Models data retrieved successfully',
		data
	});
};

export const getModelById = async (req: Request, res: Response) => {
	const row = await assetModel.getModelById(Number(req.params.id));
	if (!row) return res.status(404).json({ status: 'error', message: 'Model not found' });
	const brands = await assetModel.getBrands();
	const categories = await assetModel.getCategories();
	const types = await assetModel.getTypes();
	const brandMap = new Map<number, { id: number; name: string }>();
	for (const b of brands as any[]) brandMap.set(b.id, { id: b.id, name: b.name });
	const categoryMap = new Map<number, { id: number; name: string }>();
	for (const c of categories as any[]) categoryMap.set(c.id, { id: c.id, name: c.name });
	const typeMap = new Map<number, { id: number; name: string }>();
	for (const t of types as any[]) typeMap.set(t.id, { id: t.id, name: t.name });

	const { code, type_id, brand_id, category_id, ...rest } = row as any;
	const data = {
		...rest,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null
	};
	res.json({ status: 'success', message: 'Model retrieved successfully', data });
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
	const { code, type_id, brand_id, category_id, ...rest } = row as any;
	const mapped = {
		...rest,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null
	};
	res.status(201).json({ status: 'success', message: 'Model created successfully', data: { id: insertId, ...mapped } });
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
	const { code, type_id, brand_id, category_id, ...rest } = row as any;
	const mapped = {
		...rest,
		type: type_id && typeMap.has(type_id) ? typeMap.get(type_id) : null,
		brand: brand_id && brandMap.has(brand_id) ? brandMap.get(brand_id) : null,
		category: category_id && categoryMap.has(category_id) ? categoryMap.get(category_id) : null
	};
	res.json({ status: 'success', message: 'Model updated successfully', data: { id: Number(id), ...mapped } });
};

export const deleteModel = async (req: Request, res: Response) => {
	const result = await assetModel.deleteModel(Number(req.params.id));
	res.json(result);
};


/* ASSETS */
// Helper type guard for RowDataPacket with asset_id and ramco_id (used by getAssetById)
function isOwnershipRow(obj: any): obj is { asset_id: number; ramco_id: string; effective_date?: string } {
	return obj && typeof obj === 'object' && 'asset_id' in obj && 'ramco_id' in obj;
}


/* =========== COSTCENTERS =========== */
export const getCostcenters = async (req: Request, res: Response) => {
	const rows = await assetModel.getCostcenters();
	res.json({
		status: 'success',
		message: 'Costcenters data retrieved successfully',
		data: rows
	});
};

export const getCostcenterById = async (req: Request, res: Response) => {
	const row = await assetModel.getCostcenterById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Costcenter data retrieved successfully',
		data: row
	});
};

export const createCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.createCostcenter(req.body);
	res.json({
		status: 'success',
		message: 'Costcenter created successfully',
		result
	});
};

export const updateCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.updateCostcenter(Number(req.params.id), req.body);
	res.json({
		status: 'success',
		message: 'Costcenter updated successfully',
		result
	});
};

export const deleteCostcenter = async (req: Request, res: Response) => {
	const result = await assetModel.deleteCostcenter(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Costcenter deleted successfully',
		result
	});
};


/* =========== DEPARTMENTS =========== */
export const getDepartments = async (req: Request, res: Response) => {
	const rows = await assetModel.getDepartments();
	res.json({
		status: 'success',
		message: 'Departments data retrieved successfully',
		data: rows
	});
};

export const getDepartmentById = async (req: Request, res: Response) => {
	const row = await assetModel.getDepartmentById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Department data retrieved successfully',
		data: row
	});
};

export const createDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.createDepartment(req.body);
	res.json({
		status: 'success',
		message: 'Department created successfully',
		result
	});
};

export const updateDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.updateDepartment(Number(req.params.id), req.body);
	res.json({
		status: 'success',
		message: 'Department updated successfully',
		result
	});
};

export const deleteDepartment = async (req: Request, res: Response) => {
	const result = await assetModel.deleteDepartment(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Department deleted successfully',
		result
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
		id: section.id,
		name: section.name,
		department: section.department_id ? departmentMap.get(section.department_id) || null : null
	}));
	res.json({
		status: 'success',
		message: 'Sections data retrieved successfully',
		data
	});
};

export const getSectionById = async (req: Request, res: Response) => {
	const section = await assetModel.getSectionById(Number(req.params.id));
	if (!section) {
		return res.status(404).json({ status: 'error', message: 'Section not found' });
	}
	let department = null;
	if (section.department_id) {
		const dep = await assetModel.getDepartmentById(section.department_id);
		if (dep) department = { id: dep.id, name: dep.name };
	}
	res.json({
		status: 'success',
		message: 'Section data retrieved successfully',
		data: {
			id: section.id,
			name: section.name,
			department
		}
	});
};

export const createSection = async (req: Request, res: Response) => {
	// Accept frontend payload with departmentId, map to department_id
	const { name, departmentId } = req.body;
	const result = await assetModel.createSection({
		name,
		department_id: departmentId
	});
	res.json({
		status: 'success',
		message: 'Section created successfully',
		result
	});
};

export const updateSection = async (req: Request, res: Response) => {
	// Accept frontend payload with departmentId, map to department_id
	const { name, departmentId } = req.body;
	const result = await assetModel.updateSection(Number(req.params.id), {
		name,
		department_id: departmentId
	});
	res.json({
		status: 'success',
		message: 'Section updated successfully',
		result
	});
};

export const deleteSection = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSection(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Section deleted successfully',
		result
	});
};

/* =========== LOCATIONS =========== */
export const getLocations = async (req: Request, res: Response) => {
	// Fetch all locations
	const locations = await assetModel.getLocations();
	if (!Array.isArray(locations)) {
		return res.status(500).json({ status: 'error', message: 'Failed to fetch locations' });
	}
	res.json({ status: 'success', message: 'Locations retrieved successfully', data: locations });
}

/* =========== DISTRICTS =========== */
export const getDistricts = async (req: Request, res: Response) => {
	const districts = await assetModel.getDistricts();
	const zoneDistricts = await assetModel.getAllZoneDistricts();
	const zones = await assetModel.getZones();
	// Build zone map with code
	const zoneMap = new Map<number, { id: number; name: string; code: string }>();
	for (const z of zones as any[]) {
		zoneMap.set(z.id, { id: z.id, name: z.name, code: z.code });
	}
	const districtToZone = new Map<number, number>();
	for (const zd of zoneDistricts as any[]) {
		districtToZone.set(zd.district_id, zd.zone_id);
	}
	const data = (districts as any[]).map((d) => ({
		id: d.id,
		name: d.name,
		code: d.code,
		zone: zoneMap.get(districtToZone.get(d.id)!) || null
	}));
	res.json({ status: 'success', message: 'Districts data retrieved successfully', data });
};

export const getDistrictById = async (req: Request, res: Response) => {
	const row = await assetModel.getDistrictById(Number(req.params.id));
	res.json({ status: 'success', message: 'District data retrieved successfully', data: row });
};

export const createDistrict = async (req: Request, res: Response) => {
	const { name, code, zone_id } = req.body;
	// Create the district
	const result = await assetModel.createDistrict({ name, code });
	// Get the new district's id
	const districtId = (result as any).insertId;
	// If zone_id is provided, create the join
	if (zone_id) {
		await assetModel.addDistrictToZone(zone_id, districtId);
	}
	res.json({ status: 'success', message: 'District created successfully', result });
};

export const updateDistrict = async (req: Request, res: Response) => {
	const { name, code, zone_id } = req.body;
	const districtId = Number(req.params.id);
	// Update the district
	const result = await assetModel.updateDistrict(districtId, { name, code });
	// Remove all previous zone links for this district
	await assetModel.removeAllZonesFromDistrict(districtId);
	// Add new zone link if provided
	if (zone_id) {
		await assetModel.addDistrictToZone(zone_id, districtId);
	}
	res.json({ status: 'success', message: 'District updated successfully', result });
};

export const deleteDistrict = async (req: Request, res: Response) => {
	const districtId = Number(req.params.id);
	// Remove all zone links for this district
	await assetModel.removeAllZonesFromDistrict(districtId);
	// Delete the district
	const result = await assetModel.deleteDistrict(districtId);
	res.json({ status: 'success', message: 'District deleted successfully', result });
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
	const assets = Array.isArray(await assetModel.getAssets()) ? await assetModel.getAssets() as any[] : [];
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
				id: a.id,
				serial_no: a.register_number,
				type: typeMap.get(a.type_id) || null,
				category: categoryMap.get(a.category_id) || null,
				brand: brandMap.get(a.brand_id) || null,
				model: modelMap.get(a.model_id) || null
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
			id: site.id,
			asset,
			module,
			district_id: district,
			site_category: site.site_category,
			site_code: site.site_code,
			site_name: site.site_name,
			dmafull: site.dmafull,
			geocode,
			address: site.address,
			address2: site.address2,
			boundary_coordinate: site.boundary_coordinate,
			site_status: site.site_status,
			site_picture: site.site_picture,
			site_schematic: site.site_schematic,
			site_certificate: site.site_certificate,
			notes: site.notes,
			agency: site.agency,
			wss_group: site.wss_group,
			monitoring_group: site.monitoring_group,
			area: site.area,
			assign_to: site.assign_to,
			dirname: site.dirname,
			db_id: site.db_id,
			attended_onsite_date: site.attended_onsite_date,
			team_id: site.team_id,
			team_id2: site.team_id2,
			last_upload: site.last_upload,
			main_site_code: site.main_site_code,
			mnf_baseline: site.mnf_baseline,
			nnf_baseline: site.nnf_baseline,
			dmz_baseline: site.dmz_baseline,
			cp_baseline: site.cp_baseline,
			date_created: site.date_created,
			min_mnf: site.min_mnf,
			max_mnf: site.max_mnf,
			dmz_type: site.dmz_type,
			operational_certificate: site.operational_certificate,
			eit_certificate: site.eit_certificate,
			remarks: site.remarks
		};
	});
	res.json({
		status: 'success',
		message: 'Sites data retrieved successfully',
		data
	});
};

export const getSiteById = async (req: Request, res: Response) => {
	const row = await assetModel.getSiteById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Site data retrieved successfully',
		data: row
	});
};

export const createSite = async (req: Request, res: Response) => {
	const result = await assetModel.createSite(req.body);
	res.json({
		status: 'success',
		message: 'Site created successfully',
		result
	});
};

export const updateSite = async (req: Request, res: Response) => {
	const result = await assetModel.updateSite(Number(req.params.id), req.body);
	res.json({
		status: 'success',
		message: 'Site updated successfully',
		result
	});
};

export const deleteSite = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSite(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Site deleted successfully',
		result
	});
};

/* =========== ZONES =========== */
export const getZones = async (req: Request, res: Response) => {
	const zones = await assetModel.getZones();
	const zoneDistricts = await assetModel.getAllZoneDistricts();
	const districts = await assetModel.getDistricts();
	const employees = await assetModel.getEmployees();
	// Build district map with code
	const districtMap = new Map<number, { id: number; name: string; code: string }>();
	for (const d of districts as any[]) {
		districtMap.set(d.id, { id: d.id, name: d.name, code: d.code });
	}
	const employeeMap = new Map<number, { id: number; name: string }>();
	for (const e of employees as any[]) {
		employeeMap.set(e.id, { id: e.id, name: e.name });
	}
	const zoneToDistricts = new Map<number, { id: number; name: string; code: string }[]>();
	for (const zd of zoneDistricts as any[]) {
		if (!zoneToDistricts.has(zd.zone_id)) zoneToDistricts.set(zd.zone_id, []);
		const district = districtMap.get(zd.district_id);
		if (district) zoneToDistricts.get(zd.zone_id)!.push(district);
	}
	const data = (zones as any[]).map((z) => ({
		id: z.id,
		name: z.name,
		code: z.code,
		employees: z.employee_id ? employeeMap.get(z.employee_id) || null : null,
		districts: zoneToDistricts.get(z.id) || []
	}));
	res.json({ status: 'success', message: 'Zones data retrieved successfully', data });
};

export const getZoneById = async (req: Request, res: Response) => {
	const row = await assetModel.getZoneById(Number(req.params.id));
	res.json({ status: 'success', message: 'Zone data retrieved successfully', data: row });
};

export const createZone = async (req: Request, res: Response) => {
	const { name, code, employee_id, districts } = req.body;
	// Create the zone
	const result = await assetModel.createZone({ name, code, employee_id });
	const zoneId = (result as any).insertId;
	// Add districts to zone if provided
	if (Array.isArray(districts)) {
		for (const districtId of districts) {
			await assetModel.addDistrictToZone(zoneId, districtId);
		}
	}
	res.json({ status: 'success', message: 'Zone created successfully', result });
};

export const updateZone = async (req: Request, res: Response) => {
	const { name, code, employee_id, districts } = req.body;
	const zoneId = Number(req.params.id);
	// Update the zone
	const result = await assetModel.updateZone(zoneId, { name, code, employee_id });
	// Remove all previous district links for this zone
	await assetModel.removeAllDistrictsFromZone(zoneId);
	// Add new district links if provided
	if (Array.isArray(districts)) {
		for (const districtId of districts) {
			await assetModel.addDistrictToZone(zoneId, districtId);
		}
	}
	res.json({ status: 'success', message: 'Zone updated successfully', result });
};

export const deleteZone = async (req: Request, res: Response) => {
	const result = await assetModel.deleteZone(Number(req.params.id));
	res.json({ status: 'success', message: 'Zone deleted successfully', result });
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
	const departmentMap = new Map<number, { id: number; name: string, code: string }>();
	for (const d of departments as any[]) {
		departmentMap.set(d.id, { id: d.id, name: d.name, code: d.code });
	}
	const positionMap = new Map<number, { id: number; name: string }>();
	for (const p of positions as any[]) {
		positionMap.set(p.id, { id: p.id, name: p.name });
	}
	const costcenterMap = new Map<number, { id: number; name: string }>();
	for (const c of costcenters as any[]) {
		costcenterMap.set(c.id, { id: c.id, name: c.name });
	}
	const locationMap = new Map<number, { id: number; name: string, code?: string }>();
	for (const l of locations as any[]) {
		locationMap.set(l.id, { id: l.id, name: l.name, code: l.code });
	}

	const data = (employees as any[]).map(emp => ({
		id: emp.id,
		ramco_id: emp.ramco_id,
		full_name: emp.full_name,
		email: emp.email,
		contact: emp.contact,
		gender: emp.gender,
		dob: emp.dob,
		avatar: emp.avatar
			? (emp.avatar.startsWith('http')
				? emp.avatar
				: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
			: null,
		hire_date: emp.hire_date,
		resignation_date: emp.resignation_date,
		employment_type: emp.employment_type,
		employment_status: emp.employment_status,
		grade: emp.grade,
		position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
		department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
		costcenter: emp.costcenter_id ? costcenterMap.get(emp.costcenter_id) || null : null,
		location: emp.location_id ? locationMap.get(emp.location_id) || null : null
	}));

	res.json({
		status: 'success',
		message: 'Employees data retrieved successfully',
		data
	});
};

export const getEmployeeById = async (req: Request, res: Response) => {
	const emp = await assetModel.getEmployeeById(Number(req.params.id));
	if (!emp) {
		return res.status(404).json({ status: 'error', message: 'Employee not found' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;

	res.json({
		status: 'success',
		message: 'Employee data retrieved successfully',
		data: {
			id: emp.id,
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			gender: emp.gender,
			dob: emp.dob,
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			hire_date: emp.hire_date,
			resignation_date: emp.resignation_date,
			employment_type: emp.employment_type,
			employment_status: emp.employment_status,
			grade: emp.grade,
			position,
			department,
			costcenter,
			district
		}
	});
};

export const getEmployeeByRamco = async (req: Request, res: Response) => {
	const ramcoId = req.params.ramco_id;
	const emp = await assetModel.getEmployeeByRamco(ramcoId);
	if (!emp) {
		return res.status(404).json({ status: 'error', message: 'Employee not found' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		status: 'success',
		message: 'Employee data retrieved successfully',
		data: {
			id: emp.id,
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			gender: emp.gender,
			dob: emp.dob,
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			hire_date: emp.hire_date,
			resignation_date: emp.resignation_date,
			employment_type: emp.employment_type,
			employment_status: emp.employment_status,
			grade: emp.grade,
			position,
			department,
			costcenter,
			district
		}
	});
}

export const getEmployeeByEmail = async (req: Request, res: Response) => {
	const email = req.params.email;
	const emp = await assetModel.getEmployeeByEmail(email);
	if (!emp) {
		return res.status(404).json({ status: 'error', message: 'Employee not found' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		status: 'success',
		message: 'Employee data retrieved successfully',
		data: {
			id: emp.id,
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			gender: emp.gender,
			dob: emp.dob,
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			hire_date: emp.hire_date,
			resignation_date: emp.resignation_date,
			employment_type: emp.employment_type,
			employment_status: emp.employment_status,
			grade: emp.grade,
			position,
			department,
			costcenter,
			district
		}
	});
}

export const getEmployeeByContact = async (req: Request, res: Response) => {
	const email = req.params.email;
	const emp = await assetModel.getEmployeeByEmail(email);
	if (!emp) {
		return res.status(404).json({ status: 'error', message: 'Employee not found' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;
	res.json({
		status: 'success',
		message: 'Employee data retrieved successfully',
		data: {
			id: emp.id,
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			gender: emp.gender,
			dob: emp.dob,
			avatar: emp.avatar
				? (emp.avatar.startsWith('http')
					? emp.avatar
					: `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
				: null,
			hire_date: emp.hire_date,
			resignation_date: emp.resignation_date,
			employment_type: emp.employment_type,
			employment_status: emp.employment_status,
			grade: emp.grade,
			position,
			department,
			costcenter,
			district
		}
	});
}

export const createEmployee = async (req: Request, res: Response) => {
	const {
		ramco_id,
		full_name,
		email,
		contact,
		gender,
		dob,
		avatar,
		hire_date,
		resignation_date,
		employment_type,
		employment_status,
		grade,
		position_id,
		department_id,
		costcenter_id,
		district_id
	} = req.body;
	const result = await assetModel.createEmployee({
		ramco_id,
		full_name,
		email,
		contact,
		gender,
		dob,
		avatar,
		hire_date,
		resignation_date,
		employment_type,
		employment_status,
		grade,
		position_id,
		department_id,
		costcenter_id,
		district_id
	});
	res.json({
		status: 'success',
		message: 'Employee created successfully',
		result
	});
};

export const updateEmployee = async (req: Request, res: Response) => {
	const {
		ramco_id,
		full_name,
		email,
		contact,
		gender,
		dob,
		avatar,
		hire_date,
		resignation_date,
		employment_type,
		employment_status,
		grade,
		position_id,
		department_id,
		costcenter_id,
		location_id,
	} = req.body;
	const result = await assetModel.updateEmployee(Number(req.params.id), {
		ramco_id,
		full_name,
		email,
		contact,
		gender,
		dob,
		avatar,
		hire_date,
		resignation_date,
		employment_type,
		employment_status,
		grade,
		position_id,
		department_id,
		costcenter_id,
		location_id
	});
	res.json({
		status: 'success',
		message: 'Employee updated successfully',
		result
	});
};

export const deleteEmployee = async (req: Request, res: Response) => {
	const result = await assetModel.deleteEmployee(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Employee deleted successfully',
		result
	});
};

// PUT /api/assets/employees/update-resign
// Body: { ramco_id: string[] | string, resignation_date: string (yyyy-mm-dd), employment_status?: string }
export const updateEmployeeResignation = async (req: Request, res: Response) => {
	const { ramco_id, resignation_date, employment_status } = req.body || {};

	// Normalize ramco_id(s)
	let ids: string[] = [];
	if (Array.isArray(ramco_id)) {
		ids = ramco_id.map((v: any) => String(v).trim()).filter(Boolean);
	} else if (typeof ramco_id === 'string') {
		// Accept CSV string as well
		ids = ramco_id.split(',').map(s => s.trim()).filter(Boolean);
	}

	if (ids.length === 0 || typeof resignation_date !== 'string' || resignation_date.trim() === '') {
		return res.status(400).json({ status: 'error', message: 'ramco_id[] and resignation_date are required', data: null });
	}

	// Default to 'resigned' if not provided
	const status = typeof employment_status === 'string' && employment_status.trim() !== ''
		? employment_status
		: 'resigned';

	const result = await (assetModel as any).updateEmployeesResignation(ids, resignation_date, status);
	const affected = (result && typeof result === 'object' && 'affectedRows' in result) ? (result as any).affectedRows : 0;
	res.json({
		status: 'success',
		message: `Updated resignation details for ${affected} employee(s)`,
		data: { affected }
	});
};

// GET /employees/search?q=term
export const searchEmployees = async (req: Request, res: Response) => {
	const qRaw = (req.query.q || '').toString().trim();
	if (!qRaw || qRaw.length < 2) {
		return res.json({ status: 'success', message: 'Query too short', data: [] });
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
					ramco_id,
					full_name,
					position: makeRef(emp.position_id, emp.position_name),
					costcenter: makeRef(emp.costcenter_id, emp.costcenter_name),
					department: makeRef(emp.department_id, emp.department_name),
					location: makeRef(emp.location_id, emp.location_name)
				};
			})
			.filter(Boolean)
		: [];
	res.json({ status: 'success', message: 'Employee search results', data });
};

// Lookup employee by ramco_id, email, or contact
export const getEmployeeByUsername = async (req: Request, res: Response) => {
	const username = req.params.username;
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
		return res.status(404).json({ status: 'error', message: 'Employee not found' });
	}
	const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
	const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
	const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
	const location = emp.location_id ? await assetModel.getLocationById(emp.location_id) : null;

	// Limit nested objects to specific fields as requested
	const departmentResp = department
		? { id: department.id, code: (department as any).code ?? null, name: department.name ?? null }
		: null;
	const costcenterResp = costcenter
		? { id: costcenter.id, name: costcenter.name ?? null }
		: null;
	const locationResp = location
		? { id: location.id, name: location.name ?? null, code: (location as any).code ?? null }
		: null;
	res.json({
		status: 'success',
		message: 'Employee data retrieved successfully',
		data: {
			id: emp.id,
			ramco_id: emp.ramco_id,
			full_name: emp.full_name,
			email: emp.email,
			contact: emp.contact,
			gender: emp.gender,
			dob: emp.dob,
			avatar: emp.avatar,
			hire_date: emp.hire_date,
			resignation_date: emp.resignation_date,
			employment_type: emp.employment_type,
			employment_status: emp.employment_status,
			grade: emp.grade,
			position,
			department: departmentResp,
			costcenter: costcenterResp,
			location: locationResp
		}
	});
};


/* =========== POSITIONS =========== */
export const getPositions = async (req: Request, res: Response) => {
	const rows = await assetModel.getPositions();
	res.json({
		status: 'success',
		message: 'Positions data retrieved successfully',
		data: rows
	});
};

export const getPositionById = async (req: Request, res: Response) => {
	const row = await assetModel.getPositionById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Position data retrieved successfully',
		data: row
	});
};

export const createPosition = async (req: Request, res: Response) => {
	const result = await assetModel.createPosition(req.body);
	res.json({
		status: 'success',
		message: 'Position created successfully',
		result
	});
};

export const updatePosition = async (req: Request, res: Response) => {
	const result = await assetModel.updatePosition(Number(req.params.id), req.body);
	res.json({
		status: 'success',
		message: 'Position updated successfully',
		result
	});
};

export const deletePosition = async (req: Request, res: Response) => {
	const result = await assetModel.deletePosition(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Position deleted successfully',
		result
	});
};




// MODULES
export const getModules = async (req: Request, res: Response) => {
	const rows = await assetModel.getModules();
	res.json({
		status: 'success',
		message: 'Modules data retrieved successfully',
		data: rows
	});
};
export const getModuleById = async (req: Request, res: Response) => {
	const row = await assetModel.getModuleById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Module data retrieved successfully',
		data: row
	});
};
export const createModule = async (req: Request, res: Response) => {
	const { name, code } = req.body;
	const result = await assetModel.createModule({ name, code });
	res.json({
		status: 'success',
		message: 'Module created successfully',
		result
	});
};
export const updateModule = async (req: Request, res: Response) => {
	const { name, code } = req.body;
	const result = await assetModel.updateModule(Number(req.params.id), { name, code });
	res.json({
		status: 'success',
		message: 'Module updated successfully',
		result
	});
};
export const deleteModule = async (req: Request, res: Response) => {
	const result = await assetModel.deleteModule(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Module deleted successfully',
		result
	});
};


// SOFTWARES
export const getSoftwares = async (req: Request, res: Response) => {
	const rows = await assetModel.getSoftwares();
	res.json({
		status: 'success',
		message: 'Softwares data retrieved successfully',
		data: rows
	});
};

export const getSoftwareById = async (req: Request, res: Response) => {
	const row = await assetModel.getSoftwareById(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Software data retrieved successfully',
		data: row
	});
};

export const createSoftware = async (req: Request, res: Response) => {
	const { name } = req.body;
	const result = await assetModel.createSoftware({ name });
	res.status(201).json({
		status: 'success',
		message: 'Software created successfully',
		result
	});
};

export const updateSoftware = async (req: Request, res: Response) => {
	const { name } = req.body;
	const result = await assetModel.updateSoftware(Number(req.params.id), { name });
	res.json({
		status: 'success',
		message: 'Software updated successfully',
		result
	});
};

export const deleteSoftware = async (req: Request, res: Response) => {
	const result = await assetModel.deleteSoftware(Number(req.params.id));
	res.json({
		status: 'success',
		message: 'Software deleted successfully',
		result
	});
};


/* ============ ASSET TRANSFER REQUESTS ============ */
export const getAssetTransfers = async (req: Request, res: Response) => {
	// Fetch all transfer requests with their items
	const requests = await assetModel.getAssetTransfers();
	const reqArr = Array.isArray(requests) ? (requests as any[]) : [];

	// Optional filter by ?ramco=<username>; later we will include requests where
	// (transfer_by == ramco) OR (any item.new_owner == ramco)
	const ramcoParam = typeof req.query.ramco === 'string' ? req.query.ramco.trim() : '';
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
	let filteredReqArr = ramcoParam
		? reqArr.filter((r: any) => {
			if (String(r.transfer_by) === ramcoParam) return true;
			const itemsForReq = itemsMap.get(r.id) || [];
			return itemsForReq.some((it: any) => String(it.new_owner) === ramcoParam);
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
		return res.json({ status: 'success', message: 'Asset transfer requests retrieved successfully', data: [] });
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
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a && a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const categoryMap = new Map<number, any>((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [Number(c.id), c]));
	const brandMap = new Map<number, any>((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [Number(b.id), b]));
	const modelMap = new Map<number, any>((Array.isArray(modelsRaw) ? modelsRaw : []).map((m: any) => [Number(m.id), m]));
	const locationMap = new Map<number, any>((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));

	const data = filteredReqArr.map((r: any) => {
		const approval_status = (r.approved_date && r.approved_by) ? 'approved' : 'pending';
		const emp = empMap.get(String(r.transfer_by));
		const transfer_by_obj = emp ? {
			ramco_id: emp.ramco_id,
			full_name: emp.full_name || emp.name || null,
		} : null;
		const cc = r.costcenter_id != null ? costcenterMap.get(Number(r.costcenter_id)) : null;
		const dept = r.department_id != null ? departmentMap.get(Number(r.department_id)) : null;
		const costcenter = cc ? { id: Number(cc.id), name: cc.name || null } : null;
		const department = dept ? { id: Number(dept.id), code: dept.code || null } : null;
		// Raw items for this request
		const itemsRawForReq = itemsMap.get(r.id) || [];
		// Build new_owner array from items (legacy quick view)
		const new_owner = itemsRawForReq
			.map((it: any, idx: number) => {
				if (!it.new_owner) return null;
				const newOwnerEmp = empMap.get(String(it.new_owner));
				return {
					[`item_${idx + 1}`]: it.id,
					ramco_id: newOwnerEmp?.ramco_id || String(it.new_owner),
					full_name: newOwnerEmp?.full_name || newOwnerEmp?.name || null,
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
					id: assetObj.id,
					register_number: assetObj.register_number || null,
					type: (() => {
						const t = typeMap.get(Number(assetObj.type_id));
						return t ? { id: Number(t.id), name: t.name || null } : (assetObj.type_id ? { id: Number(assetObj.type_id), name: null } : null);
					})(),
					category: (() => {
						const c = categoryMap.get(Number(assetObj.category_id));
						return c ? { id: Number(c.id), name: c.name || null } : (assetObj.category_id ? { id: Number(assetObj.category_id), name: null } : null);
					})(),
					brand: (() => {
						const b = brandMap.get(Number(assetObj.brand_id));
						return b ? { id: Number(b.id), name: b.name || null } : (assetObj.brand_id ? { id: Number(assetObj.brand_id), name: null } : null);
					})(),
					model: (() => {
						const m = modelMap.get(Number(assetObj.model_id));
						return m ? { id: Number(m.id), name: m.name || null } : (assetObj.model_id ? { id: Number(assetObj.model_id), name: null } : null);
					})()
				}
				: (it.asset_id ? { id: it.asset_id, register_number: null, type: it.type_id ? { id: it.type_id, name: null } : null, category: null, brand: null, model: null } : null);
			return {
				id: it.id,
				transfer_id: it.transfer_id,
				effective_date: it.effective_date,
				asset: assetNested,
				return_to_asset_manager: it.return_to_asset_manager,
				reason: it.reason,
				remarks: it.remarks,
				attachment: it.attachment,
				acceptance_date: it.acceptance_date || null,
				acceptance_by: it.acceptance_by || null,
				acceptance_checklist_items: it.acceptance_checklist_items || null,
				acceptance_remarks: it.acceptance_remarks || null,
				acceptance_attachments: it.acceptance_attachments || null,
				created_at: it.created_at,
				updated_at: it.updated_at,
				current_owner: currOwnerEmp ? { ramco_id: currOwnerEmp.ramco_id, full_name: currOwnerEmp.full_name || currOwnerEmp.name || null } : (it.current_owner ? { ramco_id: String(it.current_owner), full_name: null } : null),
				new_owner: newOwnerEmp ? { ramco_id: newOwnerEmp.ramco_id, full_name: newOwnerEmp.full_name || newOwnerEmp.name || null } : (it.new_owner ? { ramco_id: String(it.new_owner), full_name: null } : null),
				current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof it.current_costcenter_id === 'number' ? { id: it.current_costcenter_id, name: null } : null),
				new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof it.new_costcenter_id === 'number' ? { id: it.new_costcenter_id, name: null } : null),
				current_department: currDept ? { id: currDept.id, code: currDept.code || null } : (typeof it.current_department_id === 'number' ? { id: it.current_department_id, code: null } : null),
				new_department: newDept ? { id: newDept.id, code: newDept.code || null } : (typeof it.new_department_id === 'number' ? { id: it.new_department_id, code: null } : null),
				current_location: currLocRow ? { id: currLocRow.id, name: currLocRow.name || null } : (typeof it.current_location_id === 'number' ? { id: it.current_location_id, name: null } : null),
				new_location: newLocRow ? { id: newLocRow.id, name: newLocRow.name || null } : (typeof it.new_location_id === 'number' ? { id: it.new_location_id, name: null } : null)
			};
		});
		return {
			id: r.id,
			transfer_date: r.transfer_date,
			transfer_status: r.transfer_status,
			approval_status,
			created_at: r.created_at,
			updated_at: r.updated_at,
			total_items: countsMap.get(r.id) || 0,
			transfer_by: transfer_by_obj,
			approved_date: r.approved_date,
			approved_by: r.approved_by,
			costcenter,
			department,
			new_owner,
			items: enrichedItems,
		};
	});

	res.json({
		status: 'success',
		message: 'Asset transfer requests retrieved successfully',
		data
	});
};

export const getAssetTransferById = async (req: Request, res: Response) => {
	const request = await assetModel.getAssetTransferById(Number(req.params.id));
	if (!request) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
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
		ramco_id: transferByEmp.ramco_id,
		full_name: transferByEmp.full_name || transferByEmp.name || null,
	} : null;

	const cc = request.costcenter_id != null ? costcenterMap.get(Number(request.costcenter_id)) : null;
	const dept = request.department_id != null ? departmentMap.get(Number(request.department_id)) : null;
	const costcenter = cc ? { id: Number(cc.id), name: cc.name || null } : null;
	const department = dept ? { id: Number(dept.id), code: dept.code || null } : null;

	// Gather asset and type ids and fetch related lookups (assets, types, checklists by type)
	const assetIds = Array.from(new Set(items.map((it: any) => it.asset_id).filter((v: any) => typeof v === 'number')));
	const typeIds = Array.from(new Set(items.map((it: any) => it.type_id).filter((v: any) => typeof v === 'number')));
	const [assetsRaw, typesRaw, checklistsByTypeRaw] = await Promise.all([
		Promise.all(assetIds.map(id => assetModel.getAssetById(id))).catch(()=>[]),
		assetModel.getTypes().catch(()=>[]),
		Promise.all(typeIds.map(id => assetModel.getTransferChecklists(id))).catch(()=>[]),
	]);
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a && a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const allChecklistsFlat: any[] = Array.isArray(checklistsByTypeRaw)
		? (checklistsByTypeRaw as any[]).reduce((acc: any[], arr: any) => { if (Array.isArray(arr)) acc.push(...arr); return acc; }, [])
		: [];
	const checklistMap = new Map<number, any>(allChecklistsFlat.filter(c => c && c.id).map((c: any) => [Number(c.id), c]));
	// Fetch categories/brands/models for referenced assets
	const assetsArr = (Array.isArray(assetsRaw) ? assetsRaw : []).filter((a: any) => a && a.id);
	const catIds = Array.from(new Set(assetsArr.map((a: any) => a.category_id).filter((v: any) => typeof v === 'number')));
	const brandIds = Array.from(new Set(assetsArr.map((a: any) => a.brand_id).filter((v: any) => typeof v === 'number')));
	const modelIds = Array.from(new Set(assetsArr.map((a: any) => a.model_id).filter((v: any) => typeof v === 'number')));
	const [categoriesRaw, brandsRaw, modelsRaw] = await Promise.all([
		Promise.all(catIds.map(id => assetModel.getCategoryById(id))).catch(()=>[]),
		Promise.all(brandIds.map(id => assetModel.getBrandById(id))).catch(()=>[]),
		Promise.all(modelIds.map(id => assetModel.getModelById(id))).catch(()=>[]),
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
		const rawChecklistVal = (it as any).acceptance_checklist_items;
		if (rawChecklistVal != null) {
			let ids: number[] = [];
			if (typeof rawChecklistVal === 'string') {
				ids = rawChecklistVal.split(',').map((s: string) => Number(s.trim())).filter(n => Number.isFinite(n));
			} else if (Array.isArray(rawChecklistVal)) {
				ids = rawChecklistVal.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
			}
			if (ids.length) {
				acceptanceChecklist = ids.map(id => checklistMap.get(id)).filter(Boolean).map((c: any) => ({ id: c.id, type_id: c.type_id, item: c.item }));
			}
		}

		return {
			id: it.id,
			transfer_id: it.transfer_id,
			effective_date: it.effective_date,
			asset: assetObj ? {
				id: assetObj.id,
				register_number: assetObj.register_number || null,
				type: (() => {
					const tid = assetObj.type_id != null ? Number(assetObj.type_id) : null;
					const t = tid != null ? typeMap.get(tid) : null;
					return t ? { id: t.id, name: t.name || null } : (tid != null ? { id: tid, name: null } : null);
				})(),
				category: (() => {
					const cid = assetObj.category_id != null ? Number(assetObj.category_id) : null;
					const c = cid != null ? categoryMap.get(cid) : null;
					return c ? { id: c.id, name: c.name || null } : (cid != null ? { id: cid, name: null } : null);
				})(),
				brand: (() => {
					const bid = assetObj.brand_id != null ? Number(assetObj.brand_id) : null;
					const b = bid != null ? brandMap.get(bid) : null;
					return b ? { id: b.id, name: b.name || null } : (bid != null ? { id: bid, name: null } : null);
				})(),
				model: (() => {
					const mid = assetObj.model_id != null ? Number(assetObj.model_id) : null;
					const m = mid != null ? modelMap.get(mid) : null;
					return m ? { id: m.id, name: m.name || null } : (mid != null ? { id: mid, name: null } : null);
				})()
			} : (it.asset_id ? { id: it.asset_id, register_number: null } : null),
			return_to_asset_manager: it.return_to_asset_manager,
			reason: it.reason,
			remarks: it.remarks,
			attachment: it.attachment,
			acceptance_date: (it as any).acceptance_date || null,
			acceptance_by: (it as any).acceptance_by || null,
			acceptance_checklist_items: acceptanceChecklist,
			acceptance_remarks: (it as any).acceptance_remarks ?? null,
			acceptance_attachments: ((): string[] | null => {
				const v = (it as any).acceptance_attachments;
				if (!v) return null;
				if (Array.isArray(v)) return v as string[];
				if (typeof v === 'string') { try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; } }
				return null;
			})(),
			created_at: it.created_at,
			updated_at: it.updated_at,
			current_owner: currOwner ? { ramco_id: currOwner.ramco_id, full_name: currOwner.full_name || currOwner.name || null } : (it.current_owner ? { ramco_id: String(it.current_owner), full_name: null } : null),
			new_owner: newOwner ? { ramco_id: newOwner.ramco_id, full_name: newOwner.full_name || newOwner.name || null } : (it.new_owner ? { ramco_id: String(it.new_owner), full_name: null } : null),
			current_costcenter: currCC ? { id: Number(currCC.id), name: currCC.name || null } : (it.current_costcenter_id != null ? { id: Number(it.current_costcenter_id), name: null } : null),
			new_costcenter: newCC ? { id: Number(newCC.id), name: newCC.name || null } : (it.new_costcenter_id != null ? { id: Number(it.new_costcenter_id), name: null } : null),
			current_department: currDept ? { id: Number(currDept.id), code: currDept.code || null } : (it.current_department_id != null ? { id: Number(it.current_department_id), code: null } : null),
			new_department: newDept ? { id: Number(newDept.id), code: newDept.code || null } : (it.new_department_id != null ? { id: Number(it.new_department_id), code: null } : null),
			current_location: currLoc ? { id: Number(currLoc.id), name: currLoc.name || null } : (it.current_location_id != null ? { id: Number(it.current_location_id), name: null } : null),
			new_location: newLoc ? { id: Number(newLoc.id), name: newLoc.name || null } : (it.new_location_id != null ? { id: Number(it.new_location_id), name: null } : null),
		};
	});

	const data = {
		...request,
		total_items: itemsEnriched.length,
		transfer_by_user,
		costcenter,
		department,
		items: itemsEnriched,
	};

	res.json({
		status: 'success',
		message: 'Asset transfer request data retrieved successfully',
		data
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
		return res.status(400).json({ status: 'error', message: 'Invalid request data: missing transfer_by or details' });
	}

	// Create the transfer request and get its ID (aligns with model signature)
	const insertId = await assetModel.createAssetTransfer({
		transfer_by,
		transfer_date,
		costcenter_id,
		department_id,
		transfer_status
	});

	// Insert each detail row
	for (const dRaw of details) {
		const d = dRaw || {};
		await assetModel.createAssetTransferItem({
			transfer_id: insertId,
			effective_date: d.effective_date || null,
			asset_id: Number(d.asset_id) || null,
			type_id: Number(d.type_id) || null,
			current_owner: d.current_owner || null,
			current_costcenter_id: d.current_costcenter_id != null ? Number(d.current_costcenter_id) : null,
			current_department_id: d.current_department_id != null ? Number(d.current_department_id) : null,
			current_location_id: d.current_location_id != null ? Number(d.current_location_id) : null,
			new_owner: d.new_owner || null,
			new_costcenter_id: d.new_costcenter_id != null ? Number(d.new_costcenter_id) : null,
			new_department_id: d.new_department_id != null ? Number(d.new_department_id) : null,
			new_location_id: d.new_location_id != null ? Number(d.new_location_id) : null,
			return_to_asset_manager: d.return_to_asset_manager ? 1 : 0,
			reason: d.reason || null,
			remarks: d.remarks || null,
			attachment: d.attachment || null
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
		const typeMap: Map<number, any> = new Map((Array.isArray(typesAll) ? typesAll : []).map((t: any) => [Number(t.id), t]));
		const assetsMap: Map<number, any> = new Map((Array.isArray(assetsForItems) ? assetsForItems : []).map((a: any) => [Number(a.id), a]));
		// Enrich items for email
		const enrichedItems = items.map((item: any) => {
			// Identifier logic
			const assetRow = item.asset_id ? assetsMap.get(Number(item.asset_id)) : null;
			let identifierDisplay = assetRow && assetRow.register_number ? assetRow.register_number : item.identifier;
			if (item.transfer_type === 'Employee' && item.identifier && empMap.has(item.identifier)) {
				const emp = empMap.get(item.identifier);
				identifierDisplay = emp && typeof emp === 'object' && 'full_name' in emp ? emp.full_name : item.identifier;
			}
			// Transfer type name
			const typeName = item.type_id != null && typeMap.has(Number(item.type_id))
				? String((typeMap.get(Number(item.type_id)) as any).name || '')
				: (item.transfer_type || '');
			// Owners
			const currOwnerEmp = item.current_owner && empMap.has(item.current_owner) ? empMap.get(item.current_owner) : null;
			const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.current_owner || '-';
			const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
			const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
			// Costcenters (IDs may arrive as strings; normalize to number for Map lookups)
			const currCostcenterKey = Number(item.current_costcenter_id);
			const currCostcenterObj = Number.isFinite(currCostcenterKey) && costcenterMap.has(currCostcenterKey) ? costcenterMap.get(currCostcenterKey) : null;
			const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? (currCostcenterObj as any).name : (item.current_costcenter_id ?? '-');
			const newCostcenterKey = Number(item.new_costcenter_id);
			const newCostcenterObj = Number.isFinite(newCostcenterKey) && costcenterMap.has(newCostcenterKey) ? costcenterMap.get(newCostcenterKey) : null;
			const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? (newCostcenterObj as any).name : (item.new_costcenter_id ?? '-');
			// Departments (show code)
			const currDepartmentKey = Number(item.current_department_id);
			const currDepartmentObj = Number.isFinite(currDepartmentKey) && departmentMap.has(currDepartmentKey) ? departmentMap.get(currDepartmentKey) : null;
			const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? (currDepartmentObj as any).code : (item.current_department_id ?? '-');
			const newDepartmentKey = Number(item.new_department_id);
			const newDepartmentObj = Number.isFinite(newDepartmentKey) && departmentMap.has(newDepartmentKey) ? departmentMap.get(newDepartmentKey) : null;
			const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? (newDepartmentObj as any).code : (item.new_department_id ?? '-');
			// Districts/Locations (show code or name)
			const currLocationKey = Number(item.current_location_id);
			const currDistrictObj = Number.isFinite(currLocationKey) && districtMap.has(currLocationKey) ? districtMap.get(currLocationKey) : null;
			const currDistrictCode = currDistrictObj ? ((currDistrictObj as any).code || (currDistrictObj as any).name || item.current_location_id || '-') : (item.current_location_id || '-');
			const newLocationKey = Number(item.new_location_id);
			const newDistrictObj = Number.isFinite(newLocationKey) && districtMap.has(newLocationKey) ? districtMap.get(newLocationKey) : null;
			const newDistrictCode = newDistrictObj ? ((newDistrictObj as any).code || (newDistrictObj as any).name || item.new_location_id || '-') : (item.new_location_id || '-');
			return {
				...item,
				identifierDisplay,
				transfer_type: typeName,
				currOwnerName,
				newOwnerName,
				currCostcenterName,
				newCostcenterName,
				currDepartmentCode,
				newDepartmentCode,
				currDistrictCode,
				newDistrictCode
			};
		});

		// Fetch requestor info first
		const requestorObj = await assetModel.getEmployeeByRamco(transfer_by);
		// Enrich requestor with readable org fields based on request's costcenter/department/district when available
		if (typeof requestorObj === 'object' && requestorObj) {
			(requestorObj as any).costcenter = request && request.costcenter_id != null ? costcenterMap.get(request.costcenter_id) || null : (requestorObj as any).costcenter || null;
			(requestorObj as any).department = request && request.department_id != null ? departmentMap.get(request.department_id) || null : (requestorObj as any).department || null;
			(requestorObj as any).district = request && request.district_id != null ? districtMap.get(request.district_id) || null : (requestorObj as any).district || null;
		}
		// Determine approver as HOD (departmental_level = 1) using department_id from payload (preferred),
		// fallback to requestor's department_id if payload missing
		let supervisorObj: any = null;
		const deptIdForHod = department_id != null
			? Number(department_id)
			: (requestorObj?.department_id != null ? Number(requestorObj.department_id) : undefined);
		if (Number.isFinite(deptIdForHod as any)) {
			supervisorObj = await (assetModel as any).getDepartmentHeadByDepartmentId(Number(deptIdForHod));
		}
		// Fallback: if no HOD or no email or HOD equals requestor, try requestor.wk_spv_id
		if (!supervisorObj || !supervisorObj.email || (requestorObj && supervisorObj.email === requestorObj.email)) {
			if (requestorObj && requestorObj.wk_spv_id) {
				try {
					supervisorObj = await assetModel.getEmployeeByRamco(String(requestorObj.wk_spv_id));
				} catch {/* ignore */}
			}
		}
		// Generate action token and base URL for supervisor email (legacy buttons)
		const actionToken = require('crypto').randomBytes(32).toString('hex');
		const actionBaseUrl = `${req.protocol}://${req.get('host')}/api/assets/asset-transfer`;
		// Build frontend approval portal URL with signed credential token if approver is available
		let portalUrl: string | undefined = undefined;
		if (supervisorObj && supervisorObj.ramco_id) {
			const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
			const credData = { ramco_id: String(supervisorObj.ramco_id), transfer_id: insertId } as any;
			const token = jwt.sign(credData, secret, { expiresIn: '3d' } as SignOptions);
			const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/?$/, '');
			// Include applicant department_id in portal URL as ?dept= and credential as _cred
			const deptForPortal = (Number.isFinite(deptIdForHod as any) && deptIdForHod != null)
				? Number(deptIdForHod)
				: (requestorObj?.department_id ?? request?.department_id ?? '');
			const deptParam = deptForPortal !== '' ? encodeURIComponent(String(deptForPortal)) : '';
			portalUrl = `${frontendUrl}/assets/transfer/portal/${encodeURIComponent(String(insertId))}?action=approve&authorize=${encodeURIComponent(String(supervisorObj.ramco_id))}` +
				(deptParam ? `&dept=${deptParam}` : '') +
				`&_cred=${encodeURIComponent(token)}`;
		}
		// Compose email content for requestor (no actionToken/actionBaseUrl)
		const requestorEmailData = {
			request,
			items: enrichedItems,
			requestor: requestorObj,
			supervisor: supervisorObj || { name: 'Supervisor', email: '-' }
		};
		// Compose email content for supervisor (with actionToken/actionBaseUrl)
		const supervisorEmailData = {
			request,
			items: enrichedItems,
			requestor: requestorObj,
			supervisor: supervisorObj || { name: 'Supervisor', email: '-' },
			actionToken,
			actionBaseUrl
		};
		// Send to requestor (notification only)
		if (requestorObj && requestorObj.email) {
			const { subject, html } = assetTransferRequestEmail(requestorEmailData);
			await sendMail(requestorObj.email, subject, html);
		}
		// Send to supervisor (with action buttons + portal link) — even if same email as requestor (for testing and single-mailbox cases)
		if (supervisorObj && supervisorObj.email) {
			const { subject, html } = assetTransferSupervisorEmail({ ...supervisorEmailData, portalUrl });
			await sendMail(supervisorObj.email, subject, html);
		} else {
			// eslint-disable-next-line no-console
			console.warn('createAssetTransfer: No approver email resolved (HOD/wk_spv_id)');
		}
	} catch (err) {
		// Log but do not block the response
		console.error('Asset transfer email notification failed:', err);
	}
	// --- END EMAIL LOGIC ---

	res.status(201).json({
		status: 'success',
		message: 'Asset transfer request created successfully',
		request_id: insertId
	});
};

export const updateAssetTransfer = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	const { status, items } = req.body;
	if (!requestId || !status || !Array.isArray(items)) {
		return res.status(400).json({ status: 'error', message: 'Invalid request data' });
	}
	// Validate request exists
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	}
	// Validate each item
	for (const item of items) {
		if (!item.asset_id || !item.curr_owner || !item.new_department_id || !item.new_district_id || !item.new_costcenter_id) {
			return res.status(400).json({ status: 'error', message: 'Invalid item data' });
		}
		// Validate current owner exists
		const currOwner = await assetModel.getEmployeeByRamco(item.curr_owner);
		if (!currOwner) {
			return res.status(404).json({ status: 'error', message: `Current owner ${item.curr_owner} not found` });
		}
		// Validate new department, district, costcenter exist
		if (item.new_department_id && !(await assetModel.getDepartmentById(item.new_department_id))) {
			return res.status(404).json({ status: 'error', message: `New department ${item.new_department_id} not found` });
		}
		if (item.new_district_id && !(await assetModel.getDistrictById(item.new_district_id))) {
			return res.status(404).json({ status: 'error', message: `New district ${item.new_district_id} not found` });
		}
		if (item.new_costcenter_id && !(await assetModel.getCostcenterById(item.new_costcenter_id))) {
			return res.status(404).json({ status: 'error', message: `New cost center ${item.new_costcenter_id} not found` });
		}
	}
	// Update the transfer request
	const result = await assetModel.updateAssetTransfer(requestId, items);
	res.json({
		status: 'success',
		message: 'Asset transfer request updated successfully',
		result
	});
}

export const deleteAssetTransfer = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	if (!requestId) {
		return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
	}
	// Validate request exists
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	}
	// Delete the transfer request
	await assetModel.deleteAssetTransfer(requestId);
	res.json({
		status: 'success',
		message: 'Asset transfer request deleted successfully'
	});
}

// PUT /api/assets/transfers/approval
// Body: { status: string, approved_by: string, approved_date?: string|Date, transfer_id: number[]|number|string }
export const updateAssetTransfersApproval = async (req: Request, res: Response) => {
	const { status, approved_by, approved_date, transfer_id } = req.body || {};
	let ids: number[] = [];
	if (Array.isArray(transfer_id)) {
		ids = transfer_id.map((v: any) => Number(v)).filter(n => Number.isFinite(n));
	} else if (typeof transfer_id === 'number') {
		ids = [transfer_id];
	} else if (typeof transfer_id === 'string' && transfer_id.trim() !== '') {
		ids = transfer_id.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
	}
	if (!status || !approved_by || ids.length === 0) {
		return res.status(400).json({ status: 'error', message: 'status, approved_by and transfer_id are required', data: null });
	}
	// Allowed statuses (can expand later)
	const allowedStatuses = new Set(['approved', 'rejected', 'completed']);
	if (!allowedStatuses.has(String(status).toLowerCase())) {
		return res.status(400).json({ status: 'error', message: `Unsupported status '${status}'. Allowed: approved, rejected, completed`, data: null });
	}
	const dateVal = approved_date && String(approved_date).trim() !== '' ? approved_date : new Date();
	// Fetch requests BEFORE update for email context (per-request granularity)
	const requestsBefore: any[] = [];
	for (const id of ids) {
		try { const r = await assetModel.getAssetTransferById(id); if (r) requestsBefore.push(r); } catch {/* ignore */}
	}
	// Perform bulk update
	const result: any = await assetModel.bulkUpdateAssetTransfersApproval(ids, String(status), String(approved_by), dateVal);
	const affected = (result && typeof result.affectedRows === 'number') ? result.affectedRows : 0;

	// EMAIL NOTIFICATIONS (best-effort, non-blocking)
	(async () => {
		try {
			// Approver details
			const approverEmp = await assetModel.getEmployeeByRamco(String(approved_by));
			// For each request, fetch items + related employees and send notifications
			for (const request of requestsBefore) {
				if (!request || !ids.includes(Number(request.id))) continue;
				// Fetch items
				const itemsRaw = await assetModel.getAssetTransferItemByRequestId(Number(request.id));
				const items: any[] = Array.isArray(itemsRaw) ? (itemsRaw as any[]) : [];
				// Collect ramco IDs: requestor (transfer_by), new_owner(s), maybe current_owner(s)
				const ramcoSet = new Set<string>();
				if (request.transfer_by) ramcoSet.add(String(request.transfer_by));
				for (const it of items) {
					if (it.new_owner) ramcoSet.add(String(it.new_owner));
				}
				if (approved_by) ramcoSet.add(String(approved_by));
				const employees = await assetModel.getEmployees(undefined, undefined, undefined, undefined, undefined, Array.from(ramcoSet), undefined).catch(()=>[]);
				const empMap = new Map<string, any>((Array.isArray(employees) ? employees : []).map((e: any) => [String(e.ramco_id), e]));
				const requestorEmp = request.transfer_by ? empMap.get(String(request.transfer_by)) : null;
				// Build basic identifier enrichment (reuse minimal logic)
				const assetsForItems = await (async () => {
					const assetIds = Array.from(new Set(items.map((i: any) => Number(i.asset_id)).filter(n => Number.isFinite(n))));
					return assetIds.length ? await (assetModel as any).getAssetsByIds(assetIds) : [];
				})();
				const assetsMap: Map<number, any> = new Map((Array.isArray(assetsForItems) ? assetsForItems : []).map((a: any) => [Number(a.id), a]));
				const enrichedItems: any[] = items.map((it: any) => {
					const assetRow = it.asset_id ? assetsMap.get(Number(it.asset_id)) : null;
					let identifierDisplay = assetRow && assetRow.register_number ? assetRow.register_number : it.identifier;
					if (it.transfer_type === 'Employee' && it.identifier && empMap.has(String(it.identifier))) {
						const emp = empMap.get(String(it.identifier));
						identifierDisplay = emp?.full_name || it.identifier;
					}
					return { ...it, identifierDisplay };
				});
				// Requestor email (if approved)
				if (String(status).toLowerCase() === 'approved' && requestorEmp && requestorEmp.email) {
					try {
						const { subject, html } = assetTransferApprovedRequestorEmail({ request, items: enrichedItems, requestor: requestorEmp, approver: approverEmp });
						await sendMail(requestorEmp.email, subject, html);
					} catch (e) { console.warn('Failed to send requestor approval email', e); }
				}
				// New owner emails (group items per new_owner)
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
						if (newOwnerEmp && newOwnerEmp.email) {
							try {
								const { subject, html } = assetTransferApprovedNewOwnerEmail({ request, itemsForNewOwner: ownerItems, newOwner: newOwnerEmp, requestor: requestorEmp, approver: approverEmp });
								await sendMail(newOwnerEmp.email, subject, html);
							} catch (e) { console.warn('Failed to send new owner approval email', e); }
						}
					}
				}
			} // end for each request
			// Send summary to approver (only once) if multiple approvals
			if (approverEmp && (approverEmp as any).email && affected > 0) {
				try {
					const { subject, html } = assetTransferApprovalSummaryEmail({ approver: (approverEmp as any), requestIds: ids, approvedDate: dateVal });
					await sendMail((approverEmp as any).email, subject, html);
				} catch (e) { console.warn('Failed to send approver summary email', e); }
			}
		} catch (err) {
			console.error('updateAssetTransfersApproval: email notifications failed', err);
		}
	})();

	return res.json({
		status: 'success',
		message: `Updated approval for ${affected} transfer request(s)`,
		data: { updated_count: affected, transfer_id: ids }
	});
};

// PUT /api/assets/transfers/:id/acceptance
// Accepts multipart/form-data (optional attachments) and JSON fields
export const setAssetTransferAcceptance = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	if (!requestId) {
		return res.status(400).json({ status: 'error', message: 'Invalid transfer request id' });
	}
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	}
	const body: any = req.body || {};
	// Parse checklist items (comma-separated or array)
	let checklistIds: number[] | undefined = undefined;
	if (body['checklist-items'] !== undefined) {
		if (Array.isArray(body['checklist-items'])) {
			checklistIds = (body['checklist-items'] as any[]).map(v => Number(v)).filter(n => Number.isFinite(n));
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

	// Handle uploaded files on field name 'acceptance_attachments' (multer saves to disk already with unique names)
	// If using multer array, req.files may be object or array depending on setup. We'll read both.
	let filePaths: string[] | undefined = undefined;
	const filesAny: any = (req as any).files || (req as any).file || undefined;
	const ensureDbPath = (filename: string) => require('../utils/uploadUtil').toDbPath('assets/transfers/acceptance', filename);
	if (Array.isArray(filesAny)) {
		filePaths = filesAny.map(f => ensureDbPath(f.filename));
	} else if (filesAny && typeof filesAny === 'object' && Array.isArray(filesAny['acceptance_attachments'])) {
		filePaths = filesAny['acceptance_attachments'].map((f: any) => ensureDbPath(f.filename));
	} else if ((req as any).file) {
		filePaths = [ensureDbPath((req as any).file.filename)];
	}

	const result = await assetModel.setAssetTransferAcceptance(requestId, {
		acceptance_by,
		acceptance_date,
		acceptance_remarks,
		acceptance_attachments: filePaths,
		// store as comma separated string (no brackets) handled in model
		acceptance_checklist_items: checklistIds
	});

	// Send email notifications to: requestor, current owner, and new owner's HOD
	try {
		// Fetch transfer items with details
		const itemsResult = await assetModel.getAssetTransferItemByRequestId(requestId);
		const items = Array.isArray(itemsResult) ? itemsResult : [];
		if (items.length === 0) {
			return res.json({ status: 'success', message: 'Acceptance data saved', result });
		}

		// Collect unique employee IDs
		const employeeIds = new Set<string>();
		if (request.transfer_by) employeeIds.add(String(request.transfer_by));
		items.forEach((item: any) => {
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
		items.forEach((item: any) => {
			if (item.current_owner) currentOwners.add(String(item.current_owner));
			if (item.new_owner) newOwners.add(String(item.new_owner));
		});

		// Enrich items with display names
		const enrichedItems = items.map((item: any) => ({
			...item,
			identifierDisplay: item.identifier || item.asset_code || item.register_number || '-',
			currOwnerName: item.current_owner ? ((employeeMap.get(String(item.current_owner)) as any)?.full_name || item.current_owner) : '-',
			newOwnerName: item.new_owner ? ((employeeMap.get(String(item.new_owner)) as any)?.full_name || item.new_owner) : '-'
		}));

		// 1. Notify Requestor/Applicant
		if (requestor?.email) {
			const newOwnerForEmail: any = newOwners.size > 0 ? employeeMap.get(Array.from(newOwners)[0]) : null;
			const { subject, html } = assetTransferAcceptedRequestorEmail({
				request,
				items: enrichedItems,
				requestor,
				newOwner: newOwnerForEmail,
				acceptanceDate: acceptance_date || new Date(),
				acceptanceRemarks: acceptance_remarks
			});
			await sendMail(requestor.email, subject, html).catch(err => 
				console.error('Failed to send acceptance email to requestor:', err)
			);
		}

		// 2. Notify Current/Previous Owners
		for (const ownerId of currentOwners) {
			const currentOwner: any = employeeMap.get(ownerId);
			if (currentOwner?.email) {
				const itemsForOwner = enrichedItems.filter((i: any) => String(i.current_owner) === ownerId);
				const newOwnerForEmail: any = newOwners.size > 0 ? employeeMap.get(Array.from(newOwners)[0]) : null;
				const { subject, html } = assetTransferAcceptedCurrentOwnerEmail({
					request,
					items: itemsForOwner,
					currentOwner,
					newOwner: newOwnerForEmail,
					acceptanceDate: acceptance_date || new Date(),
					acceptanceRemarks: acceptance_remarks
				});
				await sendMail(currentOwner.email, subject, html).catch(err =>
					console.error(`Failed to send acceptance email to current owner ${ownerId}:`, err)
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
					const { subject, html } = assetTransferAcceptedHodEmail({
						request,
						items: itemsForOwner,
						newOwner,
						newOwnerHod: hod,
						acceptanceDate: acceptance_date || new Date(),
						acceptanceRemarks: acceptance_remarks
					});
					await sendMail(hod.email, subject, html).catch(err =>
						console.error(`Failed to send acceptance email to HOD for new owner ${ownerId}:`, err)
					);
				}
			}
		}
	} catch (emailErr) {
		console.error('Error sending acceptance notification emails:', emailErr);
		// Don't fail the request if emails fail
	}

	return res.json({ status: 'success', message: 'Acceptance data saved', result });
};

/* ============ ASSET TRANSFER ITEMS (direct access) ============ */
export const getAssetTransferItemsByTransfer = async (req: Request, res: Response) => {
	const transferId = Number(req.params.id);
	if (!transferId) return res.status(400).json({ status: 'error', message: 'Invalid transfer id' });
	// Ensure request exists (optional strictness)
	const request = await assetModel.getAssetTransferById(transferId);
	if (!request) return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	const items = await assetModel.getAssetTransferItemByRequestId(transferId);
	return res.json({ status: 'success', message: 'Transfer items retrieved', data: Array.isArray(items) ? items : [] });
};

export const getAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ status: 'error', message: 'Invalid item id' });
	const item = await assetModel.getAssetTransferItemById(itemId);
	if (!item) return res.status(404).json({ status: 'error', message: 'Transfer item not found' });
	return res.json({ status: 'success', message: 'Transfer item retrieved', data: item });
};

// GET /api/assets/transfers/:transferId/items/:itemId (enriched single item within a transfer)
export const getAssetTransferItemByTransfer = async (req: Request, res: Response) => {
	const transferId = Number(req.params.transferId);
	const itemId = Number(req.params.itemId);
	if (!transferId || !itemId) {
		return res.status(400).json({ status: 'error', message: 'Invalid transferId or itemId' });
	}
	const transfer = await assetModel.getAssetTransferById(transferId);
	if (!transfer) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	}
	const item = await assetModel.getAssetTransferItemById(itemId);
	if (!item || Number(item.transfer_id) !== transferId) {
		return res.status(404).json({ status: 'error', message: 'Transfer item not found for this transfer' });
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
		assetModel.getEmployees(undefined, undefined, undefined, undefined, undefined, Array.from(employeeIds), undefined).catch(()=>[]),
		assetModel.getCostcenters().catch(()=>[]),
		assetModel.getDepartments().catch(()=>[]),
		assetModel.getLocations().catch(()=>[]),
		Promise.all(Array.from(assetIds).map(id => assetModel.getAssetById(id))).catch(()=>[]),
		assetModel.getTypes().catch(()=>[]),
		item.type_id ? assetModel.getTransferChecklists(item.type_id).catch(()=>[]) : []
	]);

	const empMap = new Map<string, any>((employeesRaw as any[]).map(e => [String(e.ramco_id), e]));
	const costcenterMap = new Map<number, any>((costcentersRaw as any[]).map(c => [Number(c.id), c]));
	const departmentMap = new Map<number, any>((departmentsRaw as any[]).map(d => [Number(d.id), d]));
	const locationMap = new Map<number, any>((locationsRaw as any[]).map(l => [Number(l.id), l]));
	const assetMap = new Map<number, any>((assetsRaw as any[]).filter(a => a && a.id).map(a => [Number(a.id), a]));
	const typeMap = new Map<number, any>((typesRaw as any[]).map(t => [Number(t.id), t]));
	const checklistMap = new Map<number, any>((checklistsRaw as any[]).filter(c => c && c.id).map(c => [Number(c.id), c]));

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
			acceptanceChecklist = ids.map(id => checklistMap.get(id)).filter(Boolean).map((c: any) => ({ id: c.id, type_id: c.type_id, item: c.item }));
		}
	}

	const enriched = {
		id: item.id,
		transfer_id: item.transfer_id,
		transfer_by: transfer_by_emp ? { ramco_id: transfer_by_emp.ramco_id, name: transfer_by_emp.full_name || transfer_by_emp.name || null } : null,
		approved_by: transfer.approved_by,
		approved_date: transfer.approved_date,
		effective_date: item.effective_date,
		asset: assetObj ? { id: assetObj.id, register_number: assetObj.register_number || null } : (item.asset_id ? { id: item.asset_id, register_number: null } : null),
		type: typeObj ? { id: typeObj.id, name: typeObj.name || null } : (item.type_id ? { id: item.type_id, name: null } : null),
		current_owner: currentOwnerEmp ? { ramco_id: currentOwnerEmp.ramco_id, name: currentOwnerEmp.full_name || currentOwnerEmp.name || null } : (item.current_owner ? { ramco_id: String(item.current_owner), name: null } : null),
		current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof item.current_costcenter_id === 'number' ? { id: item.current_costcenter_id, name: null } : null),
		current_department: currDept ? { id: currDept.id, name: currDept.name || currDept.code || null } : (typeof item.current_department_id === 'number' ? { id: item.current_department_id, name: null } : null),
		current_location: currLoc ? { id: currLoc.id, name: currLoc.name || null } : (typeof item.current_location_id === 'number' ? { id: item.current_location_id, name: null } : null),
		new_owner: newOwnerEmp ? { ramco_id: newOwnerEmp.ramco_id, name: newOwnerEmp.full_name || newOwnerEmp.name || null } : (item.new_owner ? { ramco_id: String(item.new_owner), name: null } : null),
		new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof item.new_costcenter_id === 'number' ? { id: item.new_costcenter_id, name: null } : null),
		new_department: newDept ? { id: newDept.id, name: newDept.name || newDept.code || null } : (typeof item.new_department_id === 'number' ? { id: item.new_department_id, name: null } : null),
		new_location: newLoc ? { id: newLoc.id, name: newLoc.name || null } : (typeof item.new_location_id === 'number' ? { id: item.new_location_id, name: null } : null),
		acceptance_date: (item as any).acceptance_date || null,
		acceptance_by: (() => {
			const ramco = (item as any).acceptance_by;
			if (!ramco) return null;
			const emp = empMap.get(String(ramco));
			return emp ? { ramco_id: emp.ramco_id, full_name: emp.full_name || emp.name || null } : { ramco_id: String(ramco), full_name: null };
		})(),
		acceptance_checklist_items: acceptanceChecklist,
		acceptance_attachments: ((): string[] | null => {
			const v = (item as any).acceptance_attachments;
			if (!v) return null;
			if (Array.isArray(v)) return v as string[];
			if (typeof v === 'string') {
				try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
			}
			return null;
		})(),
		acceptance_remarks: (item as any).acceptance_remarks ?? null,
		return_to_asset_manager: item.return_to_asset_manager,
		reason: item.reason,
		remarks: item.remarks,
		attachment: item.attachment,
		created_at: item.created_at,
		updated_at: item.updated_at
	};

	return res.json({ status: 'success', message: 'Transfer item (enriched) retrieved', data: enriched });
};

export const createAssetTransferItem = async (req: Request, res: Response) => {
	const transferId = Number(req.params.id);
	if (!transferId) return res.status(400).json({ status: 'error', message: 'Invalid transfer id' });
	// Minimal required field: asset_id or type_id presence (business rule can expand later)
	const body: any = req.body || {};
	// Validate parent transfer exists
	const parent = await assetModel.getAssetTransferById(transferId);
	if (!parent) return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	const result = await assetModel.createAssetTransferItem({
		transfer_id: transferId,
		effective_date: body.effective_date || null,
		asset_id: body.asset_id != null ? Number(body.asset_id) : null,
		type_id: body.type_id != null ? Number(body.type_id) : null,
		current_owner: body.current_owner || null,
		current_costcenter_id: body.current_costcenter_id != null ? Number(body.current_costcenter_id) : null,
		current_department_id: body.current_department_id != null ? Number(body.current_department_id) : null,
		current_location_id: body.current_location_id != null ? Number(body.current_location_id) : null,
		new_owner: body.new_owner || null,
		new_costcenter_id: body.new_costcenter_id != null ? Number(body.new_costcenter_id) : null,
		new_department_id: body.new_department_id != null ? Number(body.new_department_id) : null,
		new_location_id: body.new_location_id != null ? Number(body.new_location_id) : null,
		return_to_asset_manager: body.return_to_asset_manager ? 1 : 0,
		reason: body.reason || null,
		remarks: body.remarks || null,
		attachment: body.attachment || null
	});
	return res.status(201).json({ status: 'success', message: 'Transfer item created', data: { id: (result as any).insertId } });
};

export const updateAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ status: 'error', message: 'Invalid item id' });
	const existing = await assetModel.getAssetTransferItemById(itemId);
	if (!existing) return res.status(404).json({ status: 'error', message: 'Transfer item not found' });
	const body: any = req.body || {};
	const result = await assetModel.updateAssetTransferItem(itemId, body);
	if ((result as any).affectedRows === 0) {
		return res.status(400).json({ status: 'error', message: 'No fields updated' });
	}
	return res.json({ status: 'success', message: 'Transfer item updated' });
};

export const deleteAssetTransferItem = async (req: Request, res: Response) => {
	const itemId = Number(req.params.itemId);
	if (!itemId) return res.status(400).json({ status: 'error', message: 'Invalid item id' });
	const existing = await assetModel.getAssetTransferItemById(itemId);
	if (!existing) return res.status(404).json({ status: 'error', message: 'Transfer item not found' });
	const result = await assetModel.deleteAssetTransferItem(itemId);
	if ((result as any).affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Transfer item not found' });
	return res.json({ status: 'success', message: 'Transfer item deleted' });
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
	const assetMap = new Map<number, any>((Array.isArray(assetsRaw) ? assetsRaw : []).filter(a => a && a.id).map((a: any) => [Number(a.id), a]));
	const typeMap = new Map<number, any>((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [Number(t.id), t]));
	const requestMap = new Map<number, any>((Array.isArray(requestsRaw) ? requestsRaw : []).filter(r => r && r.id).map((r: any) => [Number(r.id), r]));
	// Flatten checklist arrays and map by id for fast lookup
	const allChecklistsFlat: any[] = Array.isArray(checklistsByTypeRaw)
		? (checklistsByTypeRaw as any[]).reduce((acc: any[], arr: any) => {
			if (Array.isArray(arr)) acc.push(...arr);
			return acc;
		}, [])
		: [];
	const checklistMap = new Map<number, any>(allChecklistsFlat.filter(c => c && c.id).map((c: any) => [Number(c.id), c]));

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
			id: it.id,
			transfer_id: it.transfer_id,
			transfer_by: transfer_by_emp ? { ramco_id: transfer_by_emp.ramco_id, name: transfer_by_emp.full_name || transfer_by_emp.name || null } : null,
			effective_date: it.effective_date,
			asset: assetObj ? { id: assetObj.id, register_number: assetObj.register_number || null } : (it.asset_id ? { id: it.asset_id, register_number: null } : null),
			type: typeObj ? { id: typeObj.id, name: typeObj.name || null } : (it.type_id ? { id: it.type_id, name: null } : null),
			current_owner: currentOwnerEmp ? { ramco_id: currentOwnerEmp.ramco_id, name: currentOwnerEmp.full_name || currentOwnerEmp.name || null } : (it.current_owner ? { ramco_id: String(it.current_owner), name: null } : null),
			current_costcenter: currCC ? { id: currCC.id, name: currCC.name || null } : (typeof it.current_costcenter_id === 'number' ? { id: it.current_costcenter_id, name: null } : null),
			current_department: currDept ? { id: currDept.id, name: currDept.name || currDept.code || null } : (typeof it.current_department_id === 'number' ? { id: it.current_department_id, name: null } : null),
			current_location: currLoc ? { id: currLoc.id, name: currLoc.name || null } : (typeof it.current_location_id === 'number' ? { id: it.current_location_id, name: null } : null),
			new_owner: newOwnerEmp ? { ramco_id: newOwnerEmp.ramco_id, name: newOwnerEmp.full_name || newOwnerEmp.name || null } : (it.new_owner ? { ramco_id: String(it.new_owner), name: null } : null),
			new_costcenter: newCC ? { id: newCC.id, name: newCC.name || null } : (typeof it.new_costcenter_id === 'number' ? { id: it.new_costcenter_id, name: null } : null),
			new_department: newDept ? { id: newDept.id, name: newDept.name || newDept.code || null } : (typeof it.new_department_id === 'number' ? { id: it.new_department_id, name: null } : null),
			new_location: newLoc ? { id: newLoc.id, name: newLoc.name || null } : (typeof it.new_location_id === 'number' ? { id: it.new_location_id, name: null } : null),
			// Acceptance fields
			acceptance_date: it.acceptance_date || null,
			acceptance_by: it.acceptance_by || null,
			acceptance_checklist_items: ((): any[] | null => {
				const v = (it as any).acceptance_checklist_items;
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
					.map((c: any) => ({ id: c.id, type_id: c.type_id, item: c.item }));
			})(),
			acceptance_attachments: ((): string[] | null => {
				const v = (it as any).acceptance_attachments;
				if (!v) return null;
				if (Array.isArray(v)) return v as string[];
				if (typeof v === 'string') {
					try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : null; } catch { return null; }
				}
				return null;
			})(),
			acceptance_remarks: (it as any).acceptance_remarks ?? null,
			return_to_asset_manager: it.return_to_asset_manager,
			reason: it.reason,
			remarks: it.remarks,
			attachment: it.attachment,
			created_at: it.created_at,
			updated_at: it.updated_at
		};
	});

	return res.json({ status: 'success', message: 'All transfer items retrieved', data: enriched });
};

// TypeScript interface for asset transfer detail item
export interface AssetTransferDetailItem {
	id: number;
	transfer_request_id: number;
	transfer_type: string;
	asset_type: string;
	identifier: string;
	curr_owner: string | null;
	curr_department: number | null;
	curr_district: number | null;
	curr_costcenter: number | null;
	new_owner: string | null;
	new_department: number | null;
	new_district: number | null;
	new_costcenter: number | null;
	effective_date: string | null;
	reasons: string | null;
	attachment: string | null;
	accepted_by: string | null;
	accepted_at: string | null;
	acceptance_remarks: string | null;
	created_at: string;
	updated_at: string;
	// ...add any other fields as needed
}

export const updateAssetTransferApprovalStatusById = async (req: Request, res: Response) => {
	const requestId = Number(req.params.id);
	const { status, supervisorId } = req.body; // status: 'approved' or 'rejected', supervisorId: ramco_id
	if (!requestId || !status || !supervisorId) {
		return res.status(400).json({ status: 'error', message: 'Invalid request data' });
	}
	// Fetch the request
	const request = await assetModel.getAssetTransferById(requestId);
	if (!request) {
		return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
	}
	// Update approval fields
	const now = new Date();
	await assetModel.updateAssetTransfer(requestId, {
		...request,
		approval_id: supervisorId,
		approval_date: now,
		request_status: status
	});
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
	if (requestor?.email) {
		await sendMail(requestor.email, `Asset Transfer Request ${status.toUpperCase()}`, `Your asset transfer request #${request.request_no} has been ${status} by your supervisor.`);
	}
	// Notify each item owner/employee
	for (const item of items) {
		let ownerRamcoId: string | null = null;
		if (item.transfer_type === 'Employee' && item.identifier) {
			ownerRamcoId = item.identifier;
		} else if (item.transfer_type === 'Asset' && item.curr_owner) {
			ownerRamcoId = item.curr_owner;
		}
		if (ownerRamcoId) {
			const emp = await assetModel.getEmployeeByRamco(ownerRamcoId);
			if (emp?.email) {
				// Send asset transfer preparation email to current owner
				const { subject, html } = assetTransferCurrentOwnerEmail({
					request,
					item,
					currentOwner: emp,
					supervisor
				});
				await sendMail(emp.email, subject, html);
			}
		}
		// Existing notifications for transfer_type Employee/Asset
		if (item.transfer_type === 'Employee' && item.identifier) {
			const emp = await assetModel.getEmployeeByRamco(item.identifier);
			if (emp?.email) await sendMail(emp.email, 'Asset Transfer Status Update', `Your transfer status has been updated for request #${request.request_no}.`);
		} else if (item.transfer_type === 'Asset' && item.curr_owner) {
			const emp = await assetModel.getEmployeeByRamco(item.curr_owner);
			if (emp?.email) await sendMail(emp.email, 'Asset Transfer Status Update', `Your asset transfer status has been updated for request #${request.request_no}.`);
		}
	}
	res.json({ status: 'success', message: `Asset transfer request ${status}. Notifications sent.` });
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
	const supervisorId = requestor?.wk_spv_id;
	if (!supervisorId) return res.status(400).send('Supervisor not found.');
	// Call approval logic directly
	await updateAssetTransferApprovalStatusById({
		...req,
		params: { id },
		body: { status: 'approved', supervisorId },
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
	const supervisorId = requestor?.wk_spv_id;
	if (!supervisorId) return res.status(400).send('Supervisor not found.');
	// Call rejection logic directly
	await updateAssetTransferApprovalStatusById({
		...req,
		params: { id },
		body: { status: 'rejected', supervisorId },
	} as any, res);
};

/* === TRANSFER CHECKLIST === */
export const getTransferChecklist = async (req: Request, res: Response) => {
	// Optional filter by ?type={type_id}
	const typeParam = typeof req.query.type === 'string' ? Number(req.query.type) : undefined;
	if (typeParam !== undefined && Number.isNaN(typeParam)) {
		return res.status(400).json({ status: 'error', message: 'type must be a valid number' });
	}
	// Fetch basic transfer checklist items
	const checklistItems = await assetModel.getTransferChecklists(typeParam);
	if (!Array.isArray(checklistItems)) {
		return res.status(500).json({ status: 'error', message: 'Failed to fetch checklist items' });
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

	res.json({ status: 'success', message: 'Transfer checklist items retrieved successfully', data: enrichedChecklistItems });
}

export const getTransferChecklistById = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	if (!checklistId) {
		return res.status(400).json({ status: 'error', message: 'Invalid checklist ID' });
	}
	// Fetch the checklist item
	const checklistItem = await assetModel.getTransferChecklistById(checklistId);
	if (!checklistItem) {
		return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
	}
	// Fetch all types for mapping
	const typesRaw = await assetModel.getTypes();
	const types = Array.isArray(typesRaw) ? typesRaw : [];
	const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
	// Enrich with type information
	checklistItem.type_id = checklistItem.type_id && typeMap.has(checklistItem.type_id)
		? typeMap.get(checklistItem.type_id)
		: { id: checklistItem.type_id, name: null };

	res.json({ status: 'success', message: 'Transfer checklist item retrieved successfully', data: checklistItem });
}


export const createTransferChecklist = async (req: Request, res: Response) => {
	const { item, type_id, is_required, created_by } = req.body;
	if (!item || !type_id) {
		return res.status(400).json({ status: 'error', message: 'Name and type_id are required' });
	}
	// Create the checklist item
	const insertId = await assetModel.createTransferChecklist({ item, type_id, is_required, created_by });
	res.status(201).json({ status: 'success', message: 'Transfer checklist item created successfully', data: { id: insertId } });
}

export const updateTransferChecklist = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	const { item, type_id, is_required } = req.body;
	if (!checklistId || !item || !type_id) {
		return res.status(400).json({ status: 'error', message: 'Invalid checklist ID or missing fields' });
	}
	// Update the checklist item
	const result = await assetModel.updateTransferChecklist(checklistId, { item, type_id, is_required });
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
	}
	res.json({ status: 'success', message: 'Transfer checklist item updated successfully' });
}

export const deleteTransferChecklist = async (req: Request, res: Response) => {
	const checklistId = Number(req.params.id);
	if (!checklistId) {
		return res.status(400).json({ status: 'error', message: 'Invalid checklist ID' });
	}
	// Delete the checklist item
	const result = await assetModel.deleteTransferChecklist(checklistId);
	if ((result as any).affectedRows === 0) {
		return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
	}
	res.json({ status: 'success', message: 'Transfer checklist item deleted successfully' });
}



