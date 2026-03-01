/**
 * Zod schemas for Purchase endpoints.
 */
import { isoDate, optionalString, positiveInt, requiredString, z } from './index';

// ---------------------------------------------------------------------------
// POST /api/purchase/requests
// ---------------------------------------------------------------------------
export const CreatePurchaseRequestSchema = z.object({
   costcenter_id: positiveInt('costcenter_id'),
   department_id: z.number().int().positive().optional(),
   pr_date: isoDate('pr_date'),
   pr_no: optionalString,
   ramco_id: requiredString('ramco_id'),
   request_type: requiredString('request_type'),
});

export type CreatePurchaseRequestInput = z.infer<typeof CreatePurchaseRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/purchase/items  (purchase request line item)
// ---------------------------------------------------------------------------
export const CreatePurchaseRequestItemSchema = z.object({
   category_id: z.number().int().positive().optional().nullable(),
   costcenter_id: z.number().int().positive().optional(),
   description: requiredString('description'),
   purpose: optionalString,
   qty: positiveInt('qty'),
   request_id: z.number().int().positive().optional(),
   supplier_id: z.number().int().positive().optional().nullable(),
   total_price: z.number().nonnegative('total_price must be >= 0'),
   type_id: positiveInt('type_id'),
   unit_price: z.number().nonnegative('unit_price must be >= 0'),
});

export type CreatePurchaseRequestItemInput = z.infer<typeof CreatePurchaseRequestItemSchema>;

// ---------------------------------------------------------------------------
// POST /api/purchase/suppliers
// ---------------------------------------------------------------------------
export const CreateSupplierSchema = z.object({
   contact_name: requiredString('contact_name'),
   contact_no: requiredString('contact_no'),
   name: requiredString('name'),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
