import { QueryError } from 'mysql2';

/**
 * Safely extract an error message from an unknown thrown value.
 * Usage: getErrorMessage(error) instead of (error as any).message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Safely extract a `code` property (filesystem or mysql2 errors).
 * Usage: getErrorCode(error) instead of (error as any).code
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error) {
    return (error as NodeJS.ErrnoException).code;
  }
  return undefined;
}

/**
 * Type guard — checks whether the thrown value looks like a mysql2 QueryError.
 * Gives access to `.code`, `.errno`, `.sqlMessage`, etc.
 */
export function isMysqlError(error: unknown): error is QueryError {
  return error instanceof Error && 'code' in error && 'errno' in error;
}

/**
 * Return the mysql2 error code if available, otherwise undefined.
 */
export function getMysqlErrorCode(error: unknown): string | undefined {
  if (isMysqlError(error)) return error.code;
  return undefined;
}
