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
   remarks: optionalString,
   recipients: z
      .array(
         z.object({
            department_id: z.coerce.number().int().positive('department_id must be a positive integer'),
            recipient_ramco_id: requiredString('recipient_ramco_id'),
         })
      )
      .optional()
      .default([]),
});

export type CorrespondenceQAInput = z.infer<typeof CorrespondenceQASchema>;
