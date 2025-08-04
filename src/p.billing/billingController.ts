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
  const [costcentersRaw, districtsRaw, tempVehicleRecordsRaw] = await Promise.all([
    assetsModel.getCostcenters(),
    assetsModel.getDistricts(),
    billingModel.getTempVehicleRecords()
  ]);
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const tempVehicleRecords = Array.isArray(tempVehicleRecordsRaw) ? tempVehicleRecordsRaw : [];

  const ccMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));
  const vehicleMap = new Map(tempVehicleRecords.map((v: any) => [v.vehicle_id, v]));

  // Fetch all fleet cards
  const fleetCards = await billingModel.getFleetCards();
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
    let fleetCard = null;
    if (d.card_id && fleetCardMap.has(d.card_id)) {
      fleetCard = fleetCardMap.get(d.card_id);
    }

    let asset = null;
    if (d.vehicle_id && vehicleMap.has(d.vehicle_id)) {
      const vehicle = vehicleMap.get(d.vehicle_id);
      asset = {
        vehicle_id: vehicle.vehicle_id,
        vehicle_regno: vehicle.vehicle_regno,
        vfuel_type: vehicle.vfuel_type,
        costcenter: vehicle.cc_id && ccMap.has(vehicle.cc_id)
          ? ccMap.get(vehicle.cc_id)
          : null,
		purpose: vehicle.purpose || null,
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

  res.json({ status: 'success', message: 'Fuel billing retrieved successfully', data: { ...rest, fuel_issuer, costcenter_summ, details } });
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
  const assets = await billingModel.getTempVehicleRecords();
  const fleetCards = await billingModel.getFleetCards();
  const fuelIssuers = await billingModel.getFuelIssuer() as any[];

  const assetMap = new Map(assets.map((asset: any) => [asset.vehicle_id, asset]));
  const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));

  const data = fleetCards.map((card: any) => {
    let fuel = {};
    if (card.fuel_id && fuelIssuerMap.has(card.fuel_id)) {
      const fi = fuelIssuerMap.get(card.fuel_id);
      fuel = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
    }

    const asset = card.vehicle_id && assetMap.has(card.vehicle_id)
      ? {
          vehicle_id: card.vehicle_id,
          vehicle_regno: assetMap.get(card.vehicle_id).vehicle_regno,
		  fuel_type: assetMap.get(card.vehicle_id).vfuel_type,
		  purpose: assetMap.get(card.vehicle_id).purpose || null,
        }
      : null;

    return {
      id: card.id,
      fuel,
      asset,
      card_no: card.card_no,
      reg_date: card.reg_date,
      remarks: card.remarks,
      pin_no: card.pin,
      status: card.status,
      expiry: card.expiry_date
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

	const assets = await billingModel.getTempVehicleRecords();
	const fuelIssuers = await billingModel.getFuelIssuer() as any[];

	const assetMap = new Map(assets.map((asset: any) => [asset.vehicle_id, asset]));
	const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));

	let fuel = {};
	if (fleetCard.fuel_id && fuelIssuerMap.has(fleetCard.fuel_id)) {
		const fi = fuelIssuerMap.get(fleetCard.fuel_id);
		fuel = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
	}

	const asset = fleetCard.vehicle_id && assetMap.has(fleetCard.vehicle_id)
		? {
				vehicle_id: fleetCard.vehicle_id,
				vehicle_regno: assetMap.get(fleetCard.vehicle_id).vehicle_regno,
				fuel_type: assetMap.get(fleetCard.vehicle_id).vfuel_type,
				purpose: assetMap.get(fleetCard.vehicle_id).purpose || null
			}
		: null;

	const data = {
		id: fleetCard.id,
		fuel,
		asset,
		vehicle_id: fleetCard.vehicle_id,
		card_no: fleetCard.card_no,
		reg_date: fleetCard.reg_date,
		remarks: fleetCard.remarks,
		pin_no: fleetCard.pin,
		status: fleetCard.status,
		expiry: fleetCard.expiry_date
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

  const assets = await billingModel.getTempVehicleRecords() as any[];
  const costcenters = await assetsModel.getCostcenters() as any[];
  const assetMap = new Map(assets.map((asset: any) => [asset.vehicle_id, asset]));
  const costcenterMap = new Map(costcenters.map((cc: any) => [cc.id, { id: cc.id, name: cc.name }]));
  const fleetCards = await billingModel.getFleetCards();
  const fuelIssuers = await billingModel.getFuelIssuer() as any[];
  const fuelIssuerMap = new Map(fuelIssuers.map((fi: any) => [fi.fuel_id, fi]));

  const data = fleetCards
    .filter((card: any) => card.fuel_id === fuel_id)
    .map((card: any) => {
      let asset = null;
      if (card.vehicle_id && assetMap.has(card.vehicle_id)) {
        const a = assetMap.get(card.vehicle_id);
        asset = {
          vehicle_id: a.vehicle_id,
          vehicle_regno: a.vehicle_regno,
          vfuel_type: a.vfuel_type,
          costcenter: a.cc_id && costcenterMap.has(a.cc_id)
            ? costcenterMap.get(a.cc_id)
            : null,
		  purpose: a.purpose || null
        };
      }

      let issuer = {};
      if (card.fuel_id && fuelIssuerMap.has(card.fuel_id)) {
        const fi = fuelIssuerMap.get(card.fuel_id);
        issuer = { fuel_id: fi.fuel_id, fuel_issuer: fi.f_issuer };
      }

      return {
        id: card.id,
        card_no: card.card_no,
        issuer,
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


/* ============== TEMP VEHICLE RECORDS =============== */
export const getTempVehicleRecords = async (req: Request, res: Response) => {
  const records = await billingModel.getTempVehicleRecords();
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
    const costcenterObj = rec.cc_id && ccMap.has(rec.cc_id)
      ? ccMap.get(rec.cc_id)
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

    // Remove cc_id, ramco_id, brand_id, model_id, category_id, dept_id, card_id from response, add costcenter, owner, brand, model, category, department, fleetcard
    const { cc_id, ramco_id, brand_id, model_id, category_id, dept_id, card_id, ...rest } = rec;
    return {
      ...rest,
      costcenter,
      owner,
      brand,
      model,
      category,
      department,
      fleetcard
    };
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