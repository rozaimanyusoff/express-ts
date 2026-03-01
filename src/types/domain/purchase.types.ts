/**
 * Canonical domain types for the Purchase module.
 * Source of truth — purchaseModel.ts, purchaseController.ts import from here.
 */

// ---------------------------------------------------------------------------
// Purchase Request (header)
// ---------------------------------------------------------------------------
export interface PurchaseRequest {
   costcenter_id: number;
   created_at?: string;
   department_id?: number;
   id?: number;
   pr_date: string;
   pr_no?: null | string;
   ramco_id: string;
   request_type: string;
   updated_at?: string;
}

// ---------------------------------------------------------------------------
// Purchase Request Item (line item)
// ---------------------------------------------------------------------------
export interface PurchaseRequestItem {
   category_id?: null | number;
   costcenter?: string;
   costcenter_id?: number;
   created_at?: string;
   description: string;
   handover_at?: string;
   handover_to?: string;
   id?: number;
   item_type?: string;
   po_date?: string;
   po_no?: string;
   pr_no?: null | string;
   purpose?: null | string;
   qty: number;
   request_id?: number;
   supplier?: string;
   supplier_id?: number;
   total_price: number;
   type_id: number;
   unit_price: number;
   updated_at?: string;
   upload_path?: string;
}

// ---------------------------------------------------------------------------
// Purchase Order (approved PO)
// ---------------------------------------------------------------------------
export interface PurchaseOrder {
   brand?: string;
   brand_id?: number;
   costcenter: string;
   costcenter_id?: number;
   created_at?: string;
   handover_at?: string;
   handover_to?: string;
   id?: number;
   item_type?: string;
   items: string;
   pic?: string;
   po_date?: string;
   po_no?: string;
   pr_date?: string;
   pr_no?: string;
   qty: number;
   ramco_id: string;
   request_id?: number;
   request_type: string;
   supplier?: string;
   supplier_id?: number;
   total_price: number;
   type_id?: number;
   unit_price: number;
   updated_at?: string;
   updated_by?: string;
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------
export interface Supplier {
   contact_name: string;
   contact_no: string;
   id: number;
   name: string;
}

// ---------------------------------------------------------------------------
// Asset Registry (via purchase)
// ---------------------------------------------------------------------------
export interface PurchaseAssetRegistry {
   brand_id?: null | number;
   category_id?: null | number;
   classification?: null | string;
   costcenter_id?: null | number;
   created_by?: null | string;
   description?: null | string;
   id?: number;
   item_condition?: null | string;
   location_id?: null | number;
   model?: null | string;
   model_id?: null | number;
   purchase_id?: null | number;
   register_number?: null | string;
   request_id?: null | number;
   type_id?: null | number;
   warranty_period?: null | number;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------
export interface PurchaseDelivery {
   created_at?: string;
   do_date?: null | string;
   do_no?: null | string;
   grn_date?: null | string;
   grn_no?: null | string;
   id?: number;
   inv_date?: null | string;
   inv_no?: null | string;
   purchase_id?: number;
   updated_at?: string;
   upload_path?: null | string;
}
