/**
 * Zod schemas for Telco endpoints.
 */
import { isoDate, optionalString, positiveInt, requiredString, z } from './index';

// ---------------------------------------------------------------------------
// POST /api/telco/subs  (create subscriber / phone line)
// ---------------------------------------------------------------------------
export const CreateSubscriberSchema = z.object({
   account_sub: optionalString,
   register_date: isoDate('register_date').optional(),
   status: z.enum(['active', 'inactive', 'suspended', 'terminated']).optional().default('active'),
   sub_no: requiredString('sub_no'),
});

export type CreateSubscriberInput = z.infer<typeof CreateSubscriberSchema>;

// ---------------------------------------------------------------------------
// POST /api/telco/accounts  (create billing account)
// ---------------------------------------------------------------------------
export const CreateAccountSchema = z.object({
   account_master: requiredString('account_master'),
   status: z.string().trim().optional().default('active'),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

// ---------------------------------------------------------------------------
// POST /api/telco/accounts/:id/subs  (map subscriber to account)
// ---------------------------------------------------------------------------
export const CreateAccountSubSchema = z.object({
   account_id: positiveInt('account_id'),
   account_sub: requiredString('account_sub'),
   effective_date: isoDate('effective_date').optional(),
   sub_no_id: positiveInt('sub_no_id'),
});

export type CreateAccountSubInput = z.infer<typeof CreateAccountSubSchema>;

// ---------------------------------------------------------------------------
// POST /api/telco/billing  (telco billing header)
// ---------------------------------------------------------------------------
export const CreateTelcoBillingSchema = z.object({
   account_id: positiveInt('account_id'),
   billing_date: isoDate('billing_date'),
   invoice_no: optionalString,
   status: z.string().trim().optional().default('pending'),
   total_amount: requiredString('total_amount'),
});

export type CreateTelcoBillingInput = z.infer<typeof CreateTelcoBillingSchema>;

// ---------------------------------------------------------------------------
// POST /api/telco/sim  (SIM card)
// ---------------------------------------------------------------------------
export const CreateSimCardSchema = z.object({
   activated_at: z.string().trim().optional().nullable(),
   reason: optionalString,
   replacement_sim_id: z.number().int().positive().optional().nullable(),
   sim_sn: requiredString('sim_sn'),
   status: z.enum(['active', 'inactive', 'lost', 'damaged', 'replaced']).optional().default('active'),
});

export type CreateSimCardInput = z.infer<typeof CreateSimCardSchema>;
