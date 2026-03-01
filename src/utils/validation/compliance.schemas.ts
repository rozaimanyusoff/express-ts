/**
 * Zod schemas for Compliance endpoints.
 */
import { isoDate, optionalString, positiveInt, requiredString, z } from './index';

// ---------------------------------------------------------------------------
// POST /api/compliance/summons
// ---------------------------------------------------------------------------
export const CreateSummonSchema = z.object({
   asset_id: positiveInt('asset_id'),
   attachment_url: optionalString,
   myeg_date: z.string().trim().optional().nullable(),
   notice: optionalString,
   notice_date: z.string().trim().optional().nullable(),
   ramco_id: optionalString,
   receipt_date: z.string().trim().optional().nullable(),
   summon_agency: optionalString,
   summon_amt: z.string().trim().optional().nullable(),
   summon_date: requiredString('summon_date'),
   summon_no: requiredString('summon_no'),
   summon_status: z.enum(['pending', 'paid', 'appealed', 'cancelled']).optional().default('pending'),
   summon_type: optionalString,
});

export type CreateSummonInput = z.infer<typeof CreateSummonSchema>;

// ---------------------------------------------------------------------------
// POST /api/compliance/assessment
// ---------------------------------------------------------------------------
export const CreateAssessmentSchema = z.object({
   asset_id: positiveInt('asset_id'),
   assessed_by: requiredString('assessed_by'),
   notes: optionalString,
   period: requiredString('period'),
   status: z.enum(['draft', 'submitted', 'approved']).optional().default('draft'),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

// ---------------------------------------------------------------------------
// POST /api/compliance/agencies  (summon agency)
// ---------------------------------------------------------------------------
export const CreateSummonAgencySchema = z.object({
   code: optionalString,
   name: requiredString('name'),
});

export type CreateSummonAgencyInput = z.infer<typeof CreateSummonAgencySchema>;
