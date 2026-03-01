/**
 * Zod validation helper.
 * Wraps `schema.safeParse()` into the project's standard error-response shape.
 *
 * @example
 *   const result = parseBody(req.body, CreatePurchaseRequestSchema);
 *   if (!result.ok) return res.status(400).json(result.error);
 *   const data = result.data; // fully typed
 */
import { z, ZodTypeAny } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A non-empty trimmed string */
export const requiredString = (fieldName?: string) =>
   z.string().trim().min(1, `${fieldName ?? 'Field'} is required`);

/** ISO date string YYYY-MM-DD */
export const isoDate = (fieldName?: string) =>
   requiredString(fieldName).regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName ?? 'Date'} must be in YYYY-MM-DD format`);

/** Positive integer — coerces string values (e.g. from form data) to numbers */
export const positiveInt = (fieldName?: string) =>
   z.coerce.number().int().positive(`${fieldName ?? 'Field'} must be a positive integer`);

/** Optional string — coerces undefined/null/''/whitespace-only to null */
export const optionalString = z.string().trim().optional().nullable().transform((v) => (!v || v.trim() === '' ? null : v));

// ---------------------------------------------------------------------------
// parseBody
// ---------------------------------------------------------------------------

type ParseOk<T> = { data: T; ok: true };
type ParseFail = { error: { data: null; message: string; status: 'error' }; ok: false };
type ParseResult<T> = ParseFail | ParseOk<T>;

/**
 * Parse and validate `req.body` against a Zod schema.
 * Returns a discriminated union — check `.ok` before using `.data`.
 */
export function parseBody<S extends ZodTypeAny>(body: unknown, schema: S): ParseResult<z.infer<S>> {
   const result = schema.safeParse(body);
   if (result.success) {
      return { data: result.data as z.infer<S>, ok: true };
   }

   const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
   return {
      error: {
         data: null,
         message: `Validation failed — ${issues}`,
         status: 'error',
      },
      ok: false,
   };
}

// Re-export z for convenience
export { z };
