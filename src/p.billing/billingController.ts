// src/p.billing/billingController.ts
import { Request, Response } from 'express';
import * as billingModel from './billingModel';
import * as assetsModel from '../p.asset/assetModel';
import dayjs from 'dayjs';

/* ============== VEHICLE MAINTENANCE =============== */

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
			register_number: (assetMap.get(b.asset_id) as any)?.register_number
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
			register_number: (assetMap.get(b.asset_id) as any)?.register_number
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
				register_number: asset.register_number || '',
				district: district ? { id: district.id, code: district.code } : null,
				costcenter: costcenter ? { id: costcenter.id, name: costcenter.name } : null,
				total_maintenance: 0,
				total_amount: 0,
				details: {}
			};
		}
		const date = dayjs(b.inv_date);
		const year = date.year();
		const month = date.month() + 1;
		if (!assetSummary[asset_id].details[year]) {
			assetSummary[asset_id].details[year] = { expenses: 0, maintenance: [] };
		}
		// Find if this month already exists in maintenance
		let monthEntry = assetSummary[asset_id].details[year].maintenance.find((m: any) => m.month === month);
		if (!monthEntry) {
			monthEntry = { month, total_maintenance: 0, amount: 0 };
			assetSummary[asset_id].details[year].maintenance.push(monthEntry);
		}
		monthEntry.total_maintenance += 1;
		monthEntry.amount += parseFloat(b.inv_total || '0');
		assetSummary[asset_id].details[year].expenses += parseFloat(b.inv_total || '0');
		assetSummary[asset_id].total_maintenance += 1;
		assetSummary[asset_id].total_amount += parseFloat(b.inv_total || '0');
	}

	// Format output
	const result = Object.values(assetSummary).map((asset: any) => ({
		asset_id: asset.asset_id,
		register_number: asset.register_number,
		district: asset.district,
		costcenter: asset.costcenter,
		total_maintenance: asset.total_maintenance,
		total_amount: asset.total_amount,
		details: Object.entries(asset.details).map(([year, data]: [string, any]) => ({
			year: Number(year),
			expenses: data.expenses.toFixed(2),
			maintenance: data.maintenance
		}))
	}));

	res.json({ status: 'success', message: 'Vehicle maintenance summary by date range retrieved successfully', data: result });
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
			let fuel_issuer = null;
			if (bill.stmt_issuer) {
				const issuer = await billingModel.getFuelIssuerById(bill.stmt_issuer);
				if (issuer && issuer.f_issuer) {
					fuel_issuer = {
						fuel_id: bill.stmt_issuer,
						issuer: issuer.f_issuer
					};
				} else if (issuer) {
					fuel_issuer = {
						fuel_id: bill.stmt_issuer,
						issuer: issuer.fuel_issuer || issuer.name || issuer.fuel_name || null
					};
				}
			}
			// Remove fuel_id and stmt_issuer from the result
			const { fuel_id, stmt_issuer, ...rest } = bill;
			return { ...rest, fuel_issuer };
		})
	);
	res.json({ status: 'success', message: 'Fuel billing retrieved successfully', data });
};

export const getFuelBillingById = async (req: Request, res: Response) => {
	// Fetch all lookup data
  const [costcentersRaw, districtsRaw] = await Promise.all([
	assetsModel.getCostcenters(),
	assetsModel.getDistricts()
  ]);
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));
  // Fetch all fleet cards
  const fleetCards = await billingModel.getFleetCards();
  // Map by id only, not asset_id
  const fleetCardMap = new Map(fleetCards.map((fc: any) => [fc.id, fc]));

	const id = Number(req.params.id);
	const fuelBilling = await billingModel.getFuelBillingById(id);
	if (!fuelBilling) {
		return res.status(404).json({ status: 'error', message: 'Fuel billing not found' });
	}
	// Map fuel_issuer using stmt_issuer (not fuel_id)
	let fuel_issuer = null;
	if (fuelBilling.stmt_issuer) {
		const issuer = await billingModel.getFuelIssuerById(fuelBilling.stmt_issuer);
		if (issuer && issuer.f_issuer) {
			fuel_issuer = {
				fuel_id: fuelBilling.stmt_issuer,
				issuer: issuer.f_issuer
			};
		} else if (issuer) {
			fuel_issuer = {
				fuel_id: fuelBilling.stmt_issuer,
				issuer: issuer.fuel_issuer || issuer.name || issuer.fuel_name || null
			};
		}
	}
	// Remove fuel_id and stmt_issuer from the result
	const { fuel_id, stmt_issuer, ...rest } = fuelBilling;

  const detailsRaw = await billingModel.getFuelVehicleAmount(id);
  const details = (Array.isArray(detailsRaw) ? detailsRaw : []).map((d: any) => {
	// Only use fc_id and card_id for fleetCard lookup, never asset_id
	let fleetCard = null;
	if (d.fc_id && d.fc_id !== 0 && fleetCardMap.has(d.fc_id)) {
	  fleetCard = fleetCardMap.get(d.fc_id);
	} else if (d.card_id && d.card_id !== 0 && fleetCardMap.has(d.card_id)) {
	  fleetCard = fleetCardMap.get(d.card_id);
	}
	let asset = null;
	if (fleetCard) {
	  let costcenterObj = null;
	  if (fleetCard.costcenter_id && ccMap.has(fleetCard.costcenter_id)) {
		const cc = ccMap.get(fleetCard.costcenter_id);
		costcenterObj = { id: fleetCard.costcenter_id, name: cc.name };
	  } else if (fleetCard.costcenter_id) {
		costcenterObj = { id: fleetCard.costcenter_id, name: null };
	  }
	  asset = {
		asset_id: fleetCard.id,
		register_number: fleetCard.register_number,
		costcenter: costcenterObj,
		fuel_type: fleetCard.fuel_type || null,
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

  // No asset mapping, so summary by costcenter is not available
  const summary = [];

	res.json({ status: 'success', message: 'Fuel billing retrieved successfully', data: { ...rest, fuel_issuer, details } });
};

export const createFuelBilling = async (req: Request, res: Response) => {
	try {
		// Map frontend payload to backend model
		const {
			stmt_no,
			stmt_date,
			stmt_litre,
			stmt_stotal,
			stmt_disc,
			stmt_total,
			stmt_issuer,
			petrol_amount,
			diesel_amount,
			stmt_ron95,
			stmt_ron97,
			stmt_diesel,
			stmt_count,
			stmt_total_km,
			details
		} = req.body;

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
				asset_id: d.asset_id,
				stmt_date: d.stmt_date,
				card_id: d.card_id,
				costcenter_id: d.costcenter_id,
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
					asset_id: detail.asset_id,
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
		res.status(201).json({ status: 'success', message: 'Fuel billing created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create fuel billing', error });
	}
};

export const updateFuelBilling = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		// Update parent record
		await billingModel.updateFuelBilling(id, req.body);

		// Delete existing child details
		await billingModel.deleteFuelVehicleAmount(id);

		// Insert new child detail records
		const details = req.body.details;
		if (Array.isArray(details)) {
			for (const detail of details) {
				await billingModel.createFuelVehicleAmount({
					stmt_id: id,
					stmt_date: detail.stmt_date,
					card_id: detail.card_id,
					asset_id: detail.asset_id,
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
		res.json({ status: 'success', message: 'Fuel billing updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update fuel billing', error });
	}
};

export const getFuelBillingSummaryByDate = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	// Fetch all lookup data
	const [assetsRaw, costcentersRaw, districtsRaw] = await Promise.all([
		assetsModel.getAssets(),
		assetsModel.getCostcenters(),
		assetsModel.getDistricts()
	]);
	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
	const assetMap = new Map(assets.map((a: any) => [a.id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const districtMap = new Map(districts.map((d: any) => [d.id, d]));

	// Get all fuel billings in date range
	const fuelBillings = await billingModel.getFuelBillingByDate(from as string, to as string);
	// Group by asset_id
	const summary: Record<string, any> = {};
	for (const bill of fuelBillings) {
		const detailsRaw = await billingModel.getFuelVehicleAmount(bill.stmt_id);
		for (const d of (Array.isArray(detailsRaw) ? detailsRaw : [])) {
			const asset_id = d.asset_id;
			if (!summary[asset_id]) {
				const assetObj = asset_id && assetMap.has(asset_id) ? assetMap.get(asset_id) : null;
				const ccObj = d.cc_id && ccMap.has(d.cc_id) ? ccMap.get(d.cc_id) : null;
				const districtObj = d.loc_id && districtMap.has(d.loc_id) ? districtMap.get(d.loc_id) : null;
				summary[asset_id] = {
					asset_id,
					asset: assetObj ? { asset_id, register_number: assetObj.register_number } : null,
					costcenter: ccObj ? { id: d.cc_id, name: ccObj.name } : null,
					district: districtObj ? { id: d.loc_id, code: districtObj.code } : null,
					total_litre: 0,
					total_amount: 0,
					_yearMap: {} // temp for grouping by year
				};
			}
			summary[asset_id].total_litre += parseFloat(d.total_litre || '0');
			summary[asset_id].total_amount += parseFloat(d.amount || '0');
			// Group by year
			const year = dayjs(bill.stmt_date).year();
			if (!summary[asset_id]._yearMap[year]) {
				summary[asset_id]._yearMap[year] = { expenses: 0, fuel: [] };
			}
			summary[asset_id]._yearMap[year].expenses += parseFloat(d.amount || '0');
			summary[asset_id]._yearMap[year].fuel.push({
				s_id: d.s_id,
				stmt_id: d.stmt_id,
				stmt_date: bill.stmt_date, // Use parent bill's stmt_date
				total_litre: d.total_litre,
				amount: d.amount
			});
		}
	}
	// Format output
	const result = Object.values(summary).map((asset: any) => {
		const details = Object.entries(asset._yearMap).map(([year, data]: [string, any]) => ({
			year: Number(year),
			expenses: data.expenses.toFixed(2),
			fuel: data.fuel
		}));
		// Remove temp _yearMap from output
		const { _yearMap, ...rest } = asset;
		return { ...rest, details };
	});
	res.json({ status: 'success', message: 'Fuel billing summary by date range retrieved successfully', data: result });
};

export const getFuelBillingByDate = async (req: Request, res: Response) => {
	const { from, to } = req.query;
	if (!from || !to) {
		return res.status(400).json({ status: 'error', message: 'Both from and to dates are required' });
	}
	// Fetch all lookup data
	const [assetsRaw, costcentersRaw, districtsRaw, fleetCardRaw, fuelIssuer] = await Promise.all([
		assetsModel.getAssets(),
		assetsModel.getCostcenters(),
		assetsModel.getDistricts(),
		billingModel.getFleetCards(),
		billingModel.getFuelIssuer()
	]);
	const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
	const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
	const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
	const assetMap = new Map(assets.map((a: any) => [a.id, a]));
	const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
	const districtMap = new Map(districts.map((d: any) => [d.id, d]));
	// Map by asset_id for correct lookup
	const fleetCardMap = new Map(fleetCardRaw.map((fc: any) => [fc.asset_id, fc]));

	// Get all fuel billings in date range
	const fuelBillings = await billingModel.getFuelBillingByDate(from as string, to as string);
	// Build a map for fast fuel issuer lookup
	const fuelIssuerMap = new Map((fuelIssuer || []).map((fi: any) => [fi.fuel_id, fi]));

	const data = await Promise.all(
		fuelBillings.map(async (bill: any) => {
			const detailsRaw = await billingModel.getFuelVehicleAmount(bill.stmt_id);
			const details = (Array.isArray(detailsRaw) ? detailsRaw : []).map((d: any) => {
				const assetObj = d.asset_id && assetMap.has(d.asset_id) ? assetMap.get(d.asset_id) : null;
				const ccObj = d.cc_id && ccMap.has(d.cc_id) ? ccMap.get(d.cc_id) : null;
				const districtObj = d.loc_id && districtMap.has(d.loc_id) ? districtMap.get(d.loc_id) : null;
				// Use asset_id to get the fleet card
				const fleetCard = d.asset_id && fleetCardMap.has(d.asset_id) ? fleetCardMap.get(d.asset_id) : null;
				// Add fuel_issuer enrichment for each detail
				let fuel_issuer = null;
				if (d.fuel_id && fuelIssuerMap.has(d.fuel_id)) {
					const fi = fuelIssuerMap.get(d.fuel_id);
					fuel_issuer = { fuel_id: fi.fuel_id, f_issuer: fi.f_issuer };
				}
				// Add issuer to fleetcard if available
				let fleetcard = null;
				if (fleetCard) {
					let issuer = null;
					if (fleetCard.fuel_id && fuelIssuerMap.has(fleetCard.fuel_id)) {
						issuer = fuelIssuerMap.get(fleetCard.fuel_id).f_issuer;
					}
					fleetcard = {
						fc_id: fleetCard.fc_id,
						fc_no: fleetCard.fc_no,
						issuer
					};
				}
				return {
					s_id: d.s_id,
					stmt_id: d.stmt_id,
					fleetcard,
					asset: assetObj ? { asset_id: d.asset_id, register_number: assetObj.register_number } : null,
					costcenter: ccObj ? { id: d.cc_id, name: ccObj.name } : null,
					district: districtObj ? { id: d.loc_id, code: districtObj.code } : null,
					stmt_date: d.stmt_date,
					total_litre: d.total_litre,
					amount: d.amount,
					fuel_issuer
				};
			});
			// Add fuel_issuer enrichment
			let fuel_issuer = null;
			if (bill.fuel_id && fuelIssuerMap.has(bill.fuel_id)) {
				const fi = fuelIssuerMap.get(bill.fuel_id);
				fuel_issuer = { fuel_id: fi.fuel_id, f_issuer: fi.f_issuer };
			}
			return { ...bill, fuel_issuer, details };
		})
	);
	res.json({ status: 'success', message: 'Fuel billings by date range retrieved successfully', data });
};

/* ============ FUEL ISSUER ================ */

export const getFuelIssuers = async (req: Request, res: Response) => {
	const fuelIssuers = await billingModel.getFuelIssuer();
	res.json({ status: 'success', message: 'Fuel issuers retrieved successfully', data: fuelIssuers });
};

export const getFuelIssuerById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const fuelIssuer = await billingModel.getFuelIssuerById(id);
	if (!fuelIssuer) {
		return res.status(404).json({ status: 'error', message: 'Fuel issuer not found' });
	}
	res.json({ status: 'success', message: 'Fuel issuer retrieved successfully', data: fuelIssuer });
};

export const createFuelIssuer = async (req: Request, res: Response) => {
	try {
		const insertId = await billingModel.createFuelIssuer(req.body);
		res.status(201).json({ status: 'success', message: 'Fuel issuer created successfully', id: insertId });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to create fuel issuer', error });
	}
};

export const updateFuelIssuer = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await billingModel.updateFuelIssuer(id, req.body);
		res.json({ status: 'success', message: 'Fuel issuer updated successfully' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update fuel issuer', error });
	}
};

/* =================== FLEET CARD TABLE ========================== */

export const getFleetCards = async (req: Request, res: Response) => {
	const assets = await assetsModel.getAssets() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const fleetCards = await billingModel.getFleetCards();
	const fuelIssuers = await billingModel.getFuelIssuer() as any[];
	const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));
	const data = fleetCards.map((card: any) => {
		let asset = null;
		if (card.asset_id && assetMap.has(card.asset_id)) {
			const a = assetMap.get(card.asset_id);
			asset = {
				asset_id: a.id,
				register_number: a.register_number,
				fuel_type: card.fuel_type,
				costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
					? costcenterMap.get(card.costcenter_id)
					: null
			};
		} else if (card.register_number) {
			asset = {
				asset_id: card.asset_id || null,
				register_number: card.register_number,
				fuel_type: card.fuel_type,
				costcenter: card.costcenter_id && costcenterMap.has(card.costcenter_id)
					? costcenterMap.get(card.costcenter_id)
					: null
			};
		}
		let fuel = {};
		if (card.fuel_id && fuelIssuerMap.has(card.fuel_id)) {
			const fi = fuelIssuerMap.get(card.fuel_id);
			fuel = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
		}
		return {
			id: card.id,
			fuel,
			fleetcard: { id: card.id, card_no: card.card_no },
			reg_date: card.reg_date,
			category: card.category,
			remarks: card.remarks,
			pin_no: card.pin,
			status: card.status,
			expiry: card.expiry_date,
			asset
		};
	});
	res.json({ status: 'success', message: 'Fleet cards retrieved successfully', data });
};
export const getFleetCardById = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	const fleetCard = await billingModel.getFleetCardById(id);
	if (!fleetCard) {
		return res.status(404).json({ status: 'error', message: 'Fleet card not found' });
	}
	const assets = await assetsModel.getAssets() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const fuelIssuers = await billingModel.getFuelIssuer() as any[];
	const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));
	let asset = null;
	if (fleetCard.asset_id && assetMap.has(fleetCard.asset_id)) {
		const a = assetMap.get(fleetCard.asset_id);
		asset = {
			asset_id: a.id,
			register_number: a.register_number,
			fuel_type: fleetCard.fuel_type,
			costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
				? costcenterMap.get(a.costcenter_id)
				: null
		};
	}
	let fuel = {};
	if (fleetCard.fuel_id && fuelIssuerMap.has(fleetCard.fuel_id)) {
		const fi = fuelIssuerMap.get(fleetCard.fuel_id);
		fuel = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
	}
	const data = {
		id: fleetCard.id,
		fuel,
		fleetcard: { id: fleetCard.id, card_no: fleetCard.card_no },
		reg_date: fleetCard.reg_date,
		category: fleetCard.category,
		remarks: fleetCard.remarks,
		pin_no: fleetCard.pin,
		status: fleetCard.status,
		expiry: fleetCard.expiry_date,
		asset
	};
	res.json({ status: 'success', message: 'Fleet card retrieved successfully', data });
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
export const getFleetCardByIssuer = async (req: Request, res: Response) => {

	const fuel_id = Number(req.params.id);
	if (!fuel_id) {
		return res.status(400).json({ status: 'error', message: 'fuel_id is required' });
	}
	const assets = await assetsModel.getAssets() as any[];
	const costcenters = await assetsModel.getCostcenters() as any[];
	const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
	const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
	const fleetCards = await billingModel.getFleetCards();
	const fuelIssuers = await billingModel.getFuelIssuer() as any[];
	const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));

	const data = fleetCards
		.filter((card: any) => card.fuel_id === fuel_id)
		.map((card: any) => {
			let asset = null;
			if (card.asset_id && assetMap.has(card.asset_id)) {
				const a = assetMap.get(card.asset_id);
				asset = {
					asset_id: a.id,
					register_number: a.register_number,
					fuel_type: card.fuel_type,
					costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
						? costcenterMap.get(card.costcenter_id)
						: null
				};
			} else if (card.register_number) {
				asset = {
					asset_id: card.asset_id || null,
					register_number: card.register_number,
					fuel_type: card.fuel_type,
					costcenter: card.costcenter_id && costcenterMap.has(card.costcenter_id)
						? costcenterMap.get(card.costcenter_id)
						: null
				};
			}
			let fuel = {};
			if (card.fuel_id && fuelIssuerMap.has(card.fuel_id)) {
				const fi = fuelIssuerMap.get(card.fuel_id);
				fuel = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
			}
			return {
				id: card.id,
				fuel,
				fleetcard: { id: card.id, card_no: card.card_no },
				reg_date: card.reg_date,
				category: card.category,
				remarks: card.remarks,
				pin_no: card.pin,
				status: card.status,
				expiry: card.expiry_date,
				asset
			};
		});
	res.json({ status: 'success', message: 'Fleet cards by issuer retrieved successfully', data });
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