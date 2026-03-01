/**
 * Zod schemas for Billing endpoints.
 */
import { isoDate, optionalString, positiveInt, requiredString, z } from './index';

// ---------------------------------------------------------------------------
// POST /api/billing/fuel  (fuel billing statement)
// ---------------------------------------------------------------------------
export const CreateFuelBillingSchema = z.object({
   attachment: optionalString,
   costcenter_id: z.number().int().positive().optional().nullable(),
   stmt_date: isoDate('stmt_date'),
   stmt_issuer: requiredString('stmt_issuer'),
   stmt_no: requiredString('stmt_no'),
   stmt_total: z.string().trim().optional().nullable(),
});

export type CreateFuelBillingInput = z.infer<typeof CreateFuelBillingSchema>;

// ---------------------------------------------------------------------------
// POST /api/billing/workshop
// ---------------------------------------------------------------------------
export const CreateWorkshopSchema = z.object({
   address: optionalString,
   name: requiredString('name'),
   phone: optionalString,
   pic: optionalString,
   status: z.number().int().min(0).max(1).optional().default(1),
});

export type CreateWorkshopInput = z.infer<typeof CreateWorkshopSchema>;

// ---------------------------------------------------------------------------
// POST /api/billing/utility  (utility bill)
// ---------------------------------------------------------------------------
export const CreateUtilityBillSchema = z.object({
   bill_id: positiveInt('bill_id'),
   cc_id: positiveInt('cc_id'),
   loc_id: positiveInt('loc_id'),
   ubill_bw: z.string().trim().optional().default('0'),
   ubill_color: z.string().trim().optional().default('0'),
   ubill_date: isoDate('ubill_date'),
   ubill_disc: z.string().trim().optional().default('0'),
   ubill_gtotal: requiredString('ubill_gtotal'),
   ubill_no: requiredString('ubill_no'),
   ubill_paystat: z.string().trim().optional().default('pending'),
   ubill_ref: z.string().trim().optional().default(''),
   ubill_rent: z.string().trim().optional().default('0'),
   ubill_round: z.string().trim().optional().default('0'),
   ubill_stotal: requiredString('ubill_stotal'),
   ubill_tax: z.string().trim().optional().default('0'),
});

export type CreateUtilityBillInput = z.infer<typeof CreateUtilityBillSchema>;

// ---------------------------------------------------------------------------
// POST /api/billing/vehicle  (vehicle maintenance billing)
// ---------------------------------------------------------------------------
export const CreateVehicleMaintenanceBillingSchema = z.object({
   costcenter_id: positiveInt('costcenter_id'),
   inv_date: isoDate('inv_date'),
   inv_no: requiredString('inv_no'),
   inv_remarks: optionalString,
   inv_total: requiredString('inv_total'),
   location_id: positiveInt('location_id'),
   svc_date: isoDate('svc_date'),
   svc_odo: z.string().trim().optional().default(''),
   svc_order: requiredString('svc_order'),
   vehicle_id: positiveInt('vehicle_id'),
   ws_id: positiveInt('ws_id'),
});

export type CreateVehicleMaintenanceBillingInput = z.infer<typeof CreateVehicleMaintenanceBillingSchema>;
