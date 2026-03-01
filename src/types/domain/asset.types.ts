/**
 * Canonical domain types for the Asset module.
 * Source of truth — assetModel.ts, assetController.ts import from here.
 */

// ---------------------------------------------------------------------------
// Core Asset
// ---------------------------------------------------------------------------
export interface Asset {
   asset_code: null | string;
   asset_name: string;
   brand_id: null | number;
   category_id: null | number;
   classification: null | string;
   condition: null | string;
   costcenter_id: null | number;
   created_at?: string;
   description: null | string;
   id?: number;
   item_condition: null | string;
   location_id: null | number;
   model: null | string;
   model_id: null | number;
   photo_url: null | string;
   ramco_id: null | string;
   register_number: null | string;
   serial_no: null | string;
   status: null | string;
   type_id: null | number;
   updated_at?: string;
   warranty_period: null | number;
}

// ---------------------------------------------------------------------------
// Asset Category
// ---------------------------------------------------------------------------
export interface AssetCategory {
   description: null | string;
   id?: number;
   manager_id: null | number;
   name: string;
   status: number;
   type_id: null | number;
}

// ---------------------------------------------------------------------------
// Asset Brand / Maker
// ---------------------------------------------------------------------------
export interface AssetBrand {
   id?: number;
   name: string;
   status: number;
}

// ---------------------------------------------------------------------------
// Asset Location
// ---------------------------------------------------------------------------
export interface AssetLocation {
   code: null | string;
   id?: number;
   name: string;
   parent_id: null | number;
   status: number;
   type_id: null | number;
}

// ---------------------------------------------------------------------------
// Asset Cost Center
// ---------------------------------------------------------------------------
export interface AssetCostCenter {
   code: null | string;
   dept_desc_malay: null | string;
   id?: number;
   name: string;
   ramco_name: null | string;
   status: number;
}

// ---------------------------------------------------------------------------
// Asset Transfer
// ---------------------------------------------------------------------------
export interface AssetTransferDetailItem {
   asset_id: number;
   from_location_id: null | number;
   new_costcenter_id: null | number;
   new_location_id: null | number;
   transfer_id: number;
}

export interface AssetTransferPayload {
   assets: AssetTransferDetailItem[];
   created_by: string;
   notes: null | string;
   pr_id: null | number;
   to_costcenter_id: null | number;
   to_location_id: null | number;
   transfer_date: string;
   transfer_type: string;
}

// ---------------------------------------------------------------------------
// Asset Maintenance Linkage (used in billing cross-ref)
// ---------------------------------------------------------------------------
export interface AssetMaintenanceSummary {
   asset_id: number;
   last_service_date: null | string;
   total_cost: null | string;
}
