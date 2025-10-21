import path from 'path';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import logger from './logger';

// Return the base directory where uploads are stored on disk.
// Prefers UPLOAD_BASE_PATH; falls back to <project>/uploads.
export const getUploadBaseSync = (): string => {
  let requested = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
  // If someone sets UPLOAD_BASE_PATH="/uploads" (container style) but we're on local dev without permission, fallback.
  try {
    fs.mkdirSync(requested, { recursive: true });
    return requested;
  } catch (e: any) {
    if (requested === '/uploads') {
      const fallback = path.join(process.cwd(), 'uploads');
      try {
        fs.mkdirSync(fallback, { recursive: true });
        logger.warn(`UPLOAD_BASE_PATH '/uploads' not writable locally. Falling back to project-relative path: ${fallback}`);
        return fallback;
      } catch (e2) {
        logger.error(`Failed to create fallback uploads directory '${fallback}': ${(e2 as any).message}`);
      }
    }
    logger.error(`Failed to create uploads directory '${requested}': ${e?.message}`);
    return requested; // return anyway; caller may handle errors later
  }
};

export const getUploadBase = async (): Promise<string> => {
  let requested = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
  try {
    await fsPromises.mkdir(requested, { recursive: true });
    return requested;
  } catch (e: any) {
    if (requested === '/uploads') {
      const fallback = path.join(process.cwd(), 'uploads');
      try {
        await fsPromises.mkdir(fallback, { recursive: true });
        logger.warn(`UPLOAD_BASE_PATH '/uploads' not writable locally. Falling back to project-relative path: ${fallback}`);
        return fallback;
      } catch (e2: any) {
        logger.error(`Failed to create fallback uploads directory '${fallback}': ${e2.message}`);
      }
    }
    logger.error(`Failed to create uploads directory '${requested}': ${e.message}`);
    return requested;
  }
};

// Build an absolute storage path for a given module directory + filename
export const buildStoragePath = async (moduleDir: string, filename: string): Promise<string> => {
  const base = await getUploadBase();
  const dir = path.join(base, moduleDir);
  await fsPromises.mkdir(dir, { recursive: true }).catch(() => {});
  return path.join(dir, filename);
};

// Normalize a stored path for database persistence: always under 'uploads/<moduleDir>/<filename>'
export const toDbPath = (moduleDir: string, filename: string): string => {
  const cleanDir = moduleDir.replace(/^\/+|\/+$/g, '');
  return path.posix.join('uploads', cleanDir, filename);
};

// Build a public URL from a DB-stored path.
// Ensures prefix 'uploads/' and prepends BACKEND_URL.
export const toPublicUrl = (stored: string | null | undefined): string | null => {
  if (!stored) return null;
  const baseUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  let p = String(stored).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!p.startsWith('uploads/')) p = `uploads/${p}`;
  return `${baseUrl}/${p}`;
};

// Create a filesystem- and DB-safe ASCII filename.
// - Normalize Unicode (NFKD) and strip diacritics/combining marks
// - Replace whitespace (incl. NBSP and narrow NBSP) with single hyphen
// - Remove disallowed chars, collapse multiple hyphens, lowercase
// - Preserve last extension; truncate long base names
export const sanitizeFilename = (name: string, maxLen = 120): string => {
  if (!name || typeof name !== 'string') return 'file';
  // Keep only basename and remove any path separators just in case
  let base = path.basename(name).replace(/[\\/]/g, '');
  // Unicode normalize and strip diacritics
  base = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Replace various whitespaces (space, NBSP, narrow NBSP, etc.) with hyphen
  base = base.replace(/[\s\u00A0\u202F]+/g, '-');
  // Remove any character not in allowed set
  base = base.replace(/[^A-Za-z0-9._-]/g, '-');
  // Collapse multiple hyphens
  base = base.replace(/-+/g, '-');
  // Trim leading/trailing dots or hyphens
  base = base.replace(/^[.-]+/, '').replace(/[.-]+$/, '');
  // Lowercase for consistency
  base = base.toLowerCase();
  if (!base) base = 'file';
  // Preserve extension and truncate base if too long
  const ext = path.extname(base);
  const nameOnly = ext ? base.slice(0, -ext.length) : base;
  const safeNameOnly = nameOnly.slice(0, Math.max(1, maxLen - ext.length));
  return safeNameOnly + ext;
};

// Safe move that handles cross-device renames by falling back to copy+unlink
export const safeMove = async (src: string, dest: string) => {
  try {
    await fsPromises.rename(src, dest);
  } catch (err: any) {
    if (err && err.code === 'EXDEV') {
      await fsPromises.copyFile(src, dest);
      await fsPromises.unlink(src).catch(() => {});
    } else {
      throw err;
    }
  }
};

