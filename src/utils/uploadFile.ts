import multer from 'multer';
import path from 'path';
import fs from 'fs';

type Options = {
  subfolder?: string;
  maxSize?: number;
  allowedMimeTypes?: string[];
};

// Minimal uploader: always writes to <UPLOAD_BASE_PATH>/<subfolder>
export default function createUpload(opts: Options = {}) {
  const subfolder = opts.subfolder || 'upload_test';
  const envPath = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH).trim() : '';
  const projectUploads = path.join(process.cwd(), 'uploads');
  let baseUploadPath: string;
  if (envPath) {
    const resolvedEnv = path.resolve(envPath);
    const allowAbsolute = process.env.ALLOW_ABSOLUTE_UPLOAD_PATH === 'true';
    // Defensive: avoid using a root-level '/uploads' unless explicitly allowed
    if (path.isAbsolute(envPath) && resolvedEnv === path.sep + 'uploads' && !allowAbsolute) {
      baseUploadPath = projectUploads;
    } else if (!path.isAbsolute(envPath)) {
      baseUploadPath = path.join(process.cwd(), envPath);
    } else {
      baseUploadPath = resolvedEnv;
    }
  } else {
    baseUploadPath = projectUploads;
  }
  // If the configured base is outside project and not writable, fallback to project uploads
  try {
    // prefer to check parent dir writability (exists or creatable)
    const testDir = baseUploadPath;
    // if not exists, check writability of its parent
    const parent = fs.existsSync(testDir) ? testDir : path.dirname(testDir);
    fs.accessSync(parent, fs.constants.W_OK);
  } catch (err) {
    // fallback to project uploads when configured path isn't writable
    baseUploadPath = projectUploads;
  }

  let dir = path.join(baseUploadPath, subfolder);
  // ensure directory exists (create if missing). In production avoid creating protected paths
  const allowCreate = process.env.ALLOW_UPLOAD_DIR_CREATION === 'true' || process.env.NODE_ENV !== 'production';
  if (!fs.existsSync(dir)) {
    if (allowCreate) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (err) { throw err; }
    } else {
      // fallback to project-local uploads/<subfolder>
      const fallback = path.join(process.cwd(), 'uploads', subfolder);
      try {
        if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
        dir = fallback;
      } catch (err) {
        // if fallback also fails, throw original error
        throw err;
      }
    }
  }

  const maxSize = opts.maxSize ?? 5 * 1024 * 1024; // default 5MB
  const allowedMimeTypes = opts.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, dir);
    },
    filename: function (_req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || '';
      cb(null, unique + ext);
    }
  });

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type'));
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSize } });
}

// Minimal validator: ensure req.file exists and attach detectedMime equal to mimetype
export function validateUploadedFile() {
  return (req: any, _res: any, next: any) => {
    const file = req.file;
    if (!file) return next();
    // attach basic metadata for downstream usage
    file.detectedMime = file.mimetype;
    return next();
  };
}

// Convenience: returns [uploader.single(fieldName), validator]
export function uploadFileFunction(subfolder: string, _fileType: string | string[], opts?: { fieldName?: string; maxSize?: number; allowedMimeTypes?: string[] }) {
  const uploader = createUpload({ subfolder, maxSize: opts?.maxSize, allowedMimeTypes: opts?.allowedMimeTypes });
  const fieldName = opts?.fieldName || 'file';
  return [uploader.single(fieldName), validateUploadedFile()];
}
