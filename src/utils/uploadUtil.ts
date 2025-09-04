import path from 'path';
import { promises as fsPromises } from 'fs';
import fs from 'fs';

// Return the base directory where uploads are stored on disk.
// Prefers UPLOAD_BASE_PATH; falls back to <project>/uploads.
export const getUploadBaseSync = (): string => {
  const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
  try { fs.mkdirSync(base, { recursive: true }); } catch { /* ignore */ }
  return base;
};

export const getUploadBase = async (): Promise<string> => {
  const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
  await fsPromises.mkdir(base, { recursive: true }).catch(() => {});
  return base;
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

