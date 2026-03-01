/**
 * Lightweight request-body validation helper.
 *
 * Provides a quick pre-flight check on `req.body` — verifying that all
 * required fields are present, non-null, and non-empty — without adding an
 * external schema library.  For complex schemas or recursive validation
 * consider graduating to `zod`.
 *
 * Usage:
 * ```typescript
 * const err = validateBody(req.body, ['field_a', 'field_b']);
 * if (err) return res.status(400).json({ status: 'error', ...err });
 * ```
 */

export interface BodyValidationError {
   /** Human-readable description of what went wrong. */
   message: string;
   /** Names of the fields that failed the check. */
   missing: string[];
}

/**
 * Checks that every name in `requiredFields` exists on `body` and is neither
 * `null`, `undefined`, nor an empty string.
 *
 * @returns `null` when all required fields are present; a
 *   {@link BodyValidationError} object otherwise — ready to spread into a
 *   400 JSON response.
 */
export function validateBody(
   body: unknown,
   requiredFields: string[]
): BodyValidationError | null {
   if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {
         message: 'Request body is required',
         missing: requiredFields,
      };
   }

   const data = body as Record<string, unknown>;
   const missing = requiredFields.filter(
      (f) => data[f] === undefined || data[f] === null || data[f] === ''
   );

   if (missing.length > 0) {
      return {
         message: `Missing required fields: ${missing.join(', ')}`,
         missing,
      };
   }

   return null;
}
