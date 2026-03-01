/**
 * Centralized environment configuration.
 *
 * - Loads `.env` via dotenv (idempotent — safe to call multiple times).
 * - Validates required variables at startup; exits with code 1 if any are
 *   missing so the problem surfaces immediately at boot instead of deep inside
 *   a request handler.
 * - Exports typed constants consumed throughout the application so that
 *   `process.env.*` is never accessed directly outside this module.
 */

import * as dotenv from 'dotenv';

dotenv.config();

// ─── Startup validation ───────────────────────────────────────────────────────

const REQUIRED_VARS = [
   'DB_HOST',
   'DB_NAME',
   'DB_PASSWORD',
   'DB_USER',
   'EMAIL_FROM',
   'EMAIL_HOST',
   'EMAIL_PASS',
   'EMAIL_PORT',
   'EMAIL_USER',
   'JWT_SECRET',
] as const;

const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missing.length > 0) {
   // Use console.error here — logger may not be fully initialized yet.
   console.error(
      `[env] FATAL — missing required environment variables: ${missing.join(', ')}\n` +
      `       Ensure all required variables are set in your .env file before starting the server.`
   );
   process.exit(1);
}

// ─── Server ───────────────────────────────────────────────────────────────────

export const SERVER_PORT = Number(process.env.SERVER_PORT ?? 3030);

// ─── JWT ──────────────────────────────────────────────────────────────────────

/** Guaranteed non-empty after startup validation. */
export const JWT_SECRET = process.env.JWT_SECRET as string;

/** `true` when `SINGLE_SESSION_ENFORCEMENT=true` in environment. */
export const SINGLE_SESSION_ENFORCEMENT =
   process.env.SINGLE_SESSION_ENFORCEMENT === 'true';

// ─── Database (primary) ───────────────────────────────────────────────────────

export const DB_HOST = process.env.DB_HOST as string;
export const DB_NAME = process.env.DB_NAME as string;
export const DB_PASSWORD = process.env.DB_PASSWORD as string;
export const DB_PORT = Number(process.env.DB_PORT ?? 3306);
export const DB_USER = process.env.DB_USER as string;

// ─── Database (secondary) ─────────────────────────────────────────────────────

/** Falls back to primary DB values when not explicitly configured. */
export const DB2_HOST = process.env.DB2_HOST ?? DB_HOST;
export const DB2_NAME = process.env.DB2_NAME ?? DB_NAME;
export const DB2_PASSWORD = process.env.DB2_PASSWORD ?? DB_PASSWORD;
export const DB2_PORT = Number(process.env.DB2_PORT ?? DB_PORT);
export const DB2_USER = process.env.DB2_USER ?? DB_USER;

// ─── Email ────────────────────────────────────────────────────────────────────

export const EMAIL_FROM = process.env.EMAIL_FROM as string;
export const EMAIL_HOST = process.env.EMAIL_HOST as string;
export const EMAIL_PASS = process.env.EMAIL_PASS as string;
export const EMAIL_PORT = Number(process.env.EMAIL_PORT);
export const EMAIL_USER = process.env.EMAIL_USER as string;

// ─── URLs ─────────────────────────────────────────────────────────────────────

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3030';
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

// ─── Redis ────────────────────────────────────────────────────────────────────

export const REDIS_DB = Number(process.env.REDIS_DB ?? 0);
/** `true` unless `REDIS_ENABLED=false` is set explicitly. */
export const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);

// ─── Storage ──────────────────────────────────────────────────────────────────

/** Absolute path override for serving uploaded files (optional). */
export const STATIC_UPLOAD_PATH = process.env.STATIC_UPLOAD_PATH;

/** Absolute base path where uploads are written to disk (optional). */
export const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH;

// ─── CORS ─────────────────────────────────────────────────────────────────────

/** Comma-separated list of allowed origins (optional). */
export const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS;

// ─── Rate limiting ────────────────────────────────────────────────────────────

export const RATE_LIMIT_BLOCK_MINUTES = process.env.RATE_LIMIT_BLOCK_MINUTES;
export const RATE_LIMIT_MAX_ATTEMPTS = process.env.RATE_LIMIT_MAX_ATTEMPTS;
export const RATE_LIMIT_WINDOW_MINUTES = process.env.RATE_LIMIT_WINDOW_MINUTES;

// ─── Auth exclusions ──────────────────────────────────────────────────────────

/** Comma-separated list of contact numbers excluded from verification. */
export const VERIFY_EXCLUDE_CONTACTS = process.env.VERIFY_EXCLUDE_CONTACTS;

/** Comma-separated list of emails excluded from verification. */
export const VERIFY_EXCLUDE_EMAILS = process.env.VERIFY_EXCLUDE_EMAILS;

/** Comma-separated list of user names excluded from verification. */
export const VERIFY_EXCLUDE_NAMES = process.env.VERIFY_EXCLUDE_NAMES;

// ─── Notifications ────────────────────────────────────────────────────────────

/** Optional URL that receives a POST for every in-app notification. */
export const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;
