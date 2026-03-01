/**
 * Canonical domain types for the Maintenance module.
 * Source of truth — maintenanceModel.ts, maintenanceController.ts import from here.
 */

// ---------------------------------------------------------------------------
// Service / Maintenance Request
// ---------------------------------------------------------------------------
export interface MaintenanceRequest {
   approval: null | string;
   approval_date: null | string;
   approval_stat: null | string;
   asset_id: null | number;
   cancel_reason: null | string;
   costcenter_id: null | number;
   created_at?: string;
   description: null | string;
   id?: number;
   location_id: null | number;
   priority: null | string;
   ramco_id: null | string;
   recommendation: null | string;
   recommendation_date: null | string;
   recommendation_stat: null | string;
   ref_no: null | string;
   req_date: string;
   req_stat: null | string;
   service_type: null | string;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Driveway Request
// ---------------------------------------------------------------------------
export interface DrivewayCar {
   car_id?: number;
   category: null | string;
   created_at?: string;
   driver_ramco_id: null | string;
   purpose: null | string;
   reg_no: null | string;
   status: null | string;
   updated_at?: string;
   vehicle_id: null | number;
}

export interface DrivewayRequest {
   approval: null | string;
   approval_date: null | string;
   approval_stat: null | string;
   car_id: null | number;
   created_at?: string;
   destination: null | string;
   drv_date: null | string;
   drv_stat: null | string;
   end_date: null | string;
   id?: number;
   passenger: null | string;
   purpose: null | string;
   ramco_id: null | string;
   recommendation: null | string;
   recommendation_date: null | string;
   recommendation_stat: null | string;
   req_id?: number;
   start_date: null | string;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------
export interface InsuranceRecord {
   created_at?: string;
   expiry: null | string;
   id?: number;
   insurer: null | string;
   policy: null | string;
   premiums: null | string;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Road Tax
// ---------------------------------------------------------------------------
export interface RoadTaxRecord {
   asset_id: null | number;
   created_at?: string;
   id?: number;
   insurance_id: null | number;
   rt_exp: null | string;
   rt_no: null | string;
   updated_at?: string;
}
