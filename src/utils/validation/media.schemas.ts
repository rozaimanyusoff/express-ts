/**
 * Zod schemas for Media / Correspondence endpoints.
 */
import { optionalString, requiredString, z } from './index';

// ---------------------------------------------------------------------------
// PUT /api/media/correspondence/:id/qa
// ---------------------------------------------------------------------------
export const CorrespondenceQASchema = z.object({
   // correspondence_id in body is optional / informational — route :id takes precedence
   correspondence_id: z.number().int().positive().optional(),
   letter_type: requiredString('letter_type'),
   category: requiredString('category'),
   priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
   /** QA Team fields */
   qa_review_date: optionalString,
   qa_reviewed_by: optionalString,
   qa_status: optionalString,
   remarks: optionalString,
   recipients: z
      .array(
         z.object({
            department_id: z.coerce.number().int().positive('department_id must be a positive integer'),
            ramco_id: requiredString('ramco_id'),
         })
      )
      .optional()
      .default([]),
});

export type CorrespondenceQAInput = z.infer<typeof CorrespondenceQASchema>;

// ---------------------------------------------------------------------------
// PATCH /api/media/correspondence/:id/endorse  — General Manager endorsement
// ---------------------------------------------------------------------------
export const CorrespondenceEndorsementSchema = z.object({
   endorsed_by: requiredString('endorsed_by'),
   endorsed_at: optionalString,
   endorsed_remarks: optionalString,
   endorsed_status: requiredString('endorsed_status'),
});

export type CorrespondenceEndorsementInput = z.infer<typeof CorrespondenceEndorsementSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/media/correspondence/:id/recipients/:recipientId/action
// ---------------------------------------------------------------------------
export const RecipientActionSchema = z.object({
   action_status: requiredString('action_status'),
   action_date: optionalString,
   action_remarks: optionalString,
   /** Optional: forwards submitted alongside the action */
   forwarded_to: z
      .array(
         z.object({
            ramco_id: requiredString('ramco_id'),
            department_id: z.coerce.number().int().positive(),
            action_date: optionalString,
            action_status: optionalString,
            action_remarks: optionalString,
         })
      )
      .optional()
      .default([]),
});

export type RecipientActionInput = z.infer<typeof RecipientActionSchema>;
