import multer from 'multer';
import path from 'path';
import fs from 'fs';

type Options = {
  subfolder?: string; // folder under uploads/images
  maxSize?: number; // bytes
  allowedMimeTypes?: string[];
};

export default function createUpload(opts: Options = {}) {
  // subfolder is relative to the project `uploads` directory. If not provided, default to 'images'.
  // This allows callers to place files anywhere under /uploads (for example 'vendor_logo' or 'models').
  const subfolder = opts.subfolder || 'images';
  const maxSize = opts.maxSize ?? 2 * 1024 * 1024; // default 2MB
  const allowedMimeTypes = opts.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // write directly under <project-root>/uploads/<subfolder>
      const dir = path.join(process.cwd(), 'uploads', subfolder);
      if (!fs.existsSync(dir)) {
        // In production don't create folders automatically unless explicitly allowed
        const allowCreate = process.env.ALLOW_UPLOAD_DIR_CREATION === 'true' || process.env.NODE_ENV !== 'production';
        if (allowCreate) {
          fs.mkdirSync(dir, { recursive: true });
        } else {
          return cb(new Error(`Upload directory missing: ${dir}`), '');
        }
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });

  const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSize } });
}

// Helper: detect file type by magic bytes for basic spoof prevention. Supports images, PDF, XLS/XLSX.
export function detectFileType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  // GIF: 'GIF87a' or 'GIF89a'
  if (buffer.slice(0, 6).toString('ascii') === 'GIF87a' || buffer.slice(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  // WEBP: 'RIFF'....'WEBP'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  // PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  // XLS (old BIFF): D0 CF 11 E0 A1 B1 1A E1
  if (buffer.slice(0, 8).equals(Buffer.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]))) return 'application/vnd.ms-excel';
  // ZIP-based formats (xlsx, docx, pptx) start with PK.. we will return 'application/zip' here and allow additional inspection later
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'application/zip';
  return null;
}

// Middleware to validate uploaded file after multer diskStorage saved it.
export function validateUploadedFile(options?: { allowedMimeTypes?: string[] }) {
  const allowed = options?.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  return async function (req: any, res: any, next: any) {
    try {
      const file = req.file;
      if (!file) return next(); // nothing to validate

      const filepath = file.path || (file.destination && file.filename ? path.join(file.destination, file.filename) : null);
      if (!filepath) return next(new Error('No file path'));

      // read initial bytes (and a larger chunk for zip-based formats)
      const fd = fs.openSync(filepath, 'r');
      const header = Buffer.alloc(4096);
      const bytesRead = fs.readSync(fd, header, 0, 4096, 0);
      fs.closeSync(fd);
      const buf = header.slice(0, bytesRead);

      const detected = detectFileType(buf);
      if (!detected) {
        try { fs.unlinkSync(filepath); } catch (e) { /* ignore */ }
        return next(new Error('Invalid file signature'));
      }

      // For ZIP-based detection, attempt to identify xlsx by checking for 'xl/' or '[Content_Types].xml'
      let finalDetected = detected;
      if (detected === 'application/zip') {
        const txt = buf.toString('utf8').toLowerCase();
        if (txt.includes('xl/') || txt.includes('[content_types].xml') || txt.includes('word/')) {
          finalDetected = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
          finalDetected = 'application/zip';
        }
      }

      // compare detected mime with reported mimetype
      let reported = file.mimetype;
      // normalize common alias
      if (reported === 'image/jpg') reported = 'image/jpeg';

      const isAllowedDetected = allowed.includes(finalDetected);
      const isAllowedReported = allowed.includes(reported);

      // Accept when detected and reported are exact match and allowed,
      // or when both are images (finalDetected and reported start with image/)
      // to handle user agents that report slightly different image subtype aliases.
      const bothImages = finalDetected.startsWith('image/') && reported.startsWith('image/');

      if (!isAllowedDetected || !isAllowedReported || !(finalDetected === reported || bothImages)) {
        try { fs.unlinkSync(filepath); } catch (e) { /* ignore */ }
        return next(new Error('File type mismatch or not allowed'));
      }

      // sanitize filename: generate random name and ensure correct ext
      const extMap: Record<string,string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-excel': '.xls',
        'application/zip': '.zip'
      };
      const ext = extMap[finalDetected] || path.extname(file.originalname) || '';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,10)}${ext}`;
      const dest = path.join(path.dirname(filepath), safeName);
      fs.renameSync(filepath, dest);

      // update req.file metadata
      req.file.filename = safeName;
      req.file.path = dest;
      req.file.detectedMime = finalDetected;

      // set safe permissions (rw-r--r--)
      try { fs.chmodSync(dest, 0o644); } catch (e) { /* ignore */ }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// Factory that returns an array of middlewares [multer.single(fieldName), validator]
export function uploadFileFunction(subfolder: string, fileType: string | string[], opts?: { fieldName?: string; maxSize?: number; allowedMimeTypes?: string[] }) {
  // map simple type names to mime lists
  const typeMap: Record<string,string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdf: ['application/pdf'],
    excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  };
  let allowed: string[] = [];
  if (Array.isArray(fileType)) {
    allowed = fileType as string[];
  } else if (typeMap[fileType]) {
    allowed = typeMap[fileType];
  } else {
    allowed = [fileType];
  }

  const uploader = createUpload({ subfolder, maxSize: opts?.maxSize, allowedMimeTypes: opts?.allowedMimeTypes || allowed });
  const fieldName = opts?.fieldName || 'file';
  return [uploader.single(fieldName), validateUploadedFile({ allowedMimeTypes: opts?.allowedMimeTypes || allowed })];
}
