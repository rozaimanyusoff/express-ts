/**
 * Canonical domain types for the Billing module.
 * Source of truth — billingModel.ts, billingController.ts import from here.
 */

// ---------------------------------------------------------------------------
// Vehicle Maintenance Billing
// ---------------------------------------------------------------------------
export interface VehicleMaintenance {
   attachment: null | string;
   costcenter_id: number;
   inv_date: string;
   inv_id: number;
   inv_no: string;
   inv_remarks: null | string;
   inv_stat: string;
   inv_total: string;
   location_id: number;
   running_no: number;
   svc_date: string;
   svc_odo: string;
   svc_order: string;
   vehicle_id: number;
   ws_id: number;
}

// ---------------------------------------------------------------------------
// Fuel Billing Statement
// ---------------------------------------------------------------------------
export interface FuelBillingStatement {
   attachment: null | string;
   costcenter_id: null | number;
   created_at?: string;
   id?: number;
   svc_date?: null | string;
   stmt_date: string;
   stmt_issuer: string;
   stmt_no: string;
   stmt_total: null | string;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Workshop
// ---------------------------------------------------------------------------
export interface Workshop {
   address: null | string;
   created_at?: string;
   id?: number;
   name: string;
   pic: null | string;
   phone: null | string;
   status: number;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Service Option / Part
// ---------------------------------------------------------------------------
export interface ServiceOption {
   id?: number;
   name: string;
   price: null | string;
   status: number;
}

export interface ServicePart {
   id?: number;
   name: string;
   price: null | string;
   status: number;
   unit: null | string;
}

// ---------------------------------------------------------------------------
// Temporary Vehicle Record (assets.vehicle)
// ---------------------------------------------------------------------------
export interface TempVehicleRecord {
   avls_availability: string;
   avls_install_date: string;
   avls_transfer_date: string;
   avls_uninstall_date: string;
   cc_id: number;
   classification: string;
   condition_status: string;
   dept_id: number;
   fc_id: number;
   ft_id: number;
   fuel_id: number;
   loc_id: number;
   make_id: number;
   model_id: number;
   purpose: string;
   ramco_id: string;
   record_status: string;
   rt_id: number;
   v_costctr: string;
   v_disp: string;
   v_dop: string;
   vehicle_id: number;
   vehicle_make: string;
   vehicle_model: string;
   vehicle_regno: string;
   vehicle_type: string;
   [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Utility Bill
// ---------------------------------------------------------------------------
export interface UtilityBill {
   bill_id: number;
   cc_id: number;
   loc_id: number;
   ubill_bw: string;
   ubill_color: string;
   ubill_date: string;
   ubill_disc: string;
   ubill_gtotal: string;
   ubill_no: string;
   ubill_paystat: string;
   ubill_ref: string;
   ubill_rent: string;
   ubill_round: string;
   ubill_stotal: string;
   ubill_tax: string;
}

// ---------------------------------------------------------------------------
// Billing Account
// ---------------------------------------------------------------------------
export interface BillingAccount {
   account_name: string;
   account_no: string;
   account_type: string;
   created_at?: string;
   id?: number;
   status: number;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Beneficiary
// ---------------------------------------------------------------------------
export interface Beneficiary {
   bank_acc: null | string;
   bank_name: null | string;
   created_at?: string;
   id?: number;
   name: string;
   ramco_id: null | string;
   status: number;
   updated_at?: string;
}
