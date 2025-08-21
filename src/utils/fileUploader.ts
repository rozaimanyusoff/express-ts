// src/utils/fileUploader.ts
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Define allowed mime types for broad compatibility
const ALLOWED_MIME_TYPES = [
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
	'text/plain', // .txt
	'text/csv', // .csv
	// Archives
	'application/zip',
	'application/x-rar-compressed',
];

/**
 * Creates a multer upload instance with a dynamic storage path.
 * @param subfolder - The subfolder within the base upload directory to store files.
 * @returns A multer instance configured for the specified subfolder.
 */
export const createUploader = (subfolder: string) => {
	const storage = multer.diskStorage({
		destination: (req: Request, file: Express.Multer.File, cb) => {
			// Prefer an environment-configured base path, but fall back to a local 'uploads' folder
			const envBase = process.env.UPLOAD_BASE_PATH;
			const defaultLocalBase = path.join(process.cwd(), 'uploads');
			let uploadBasePath = envBase || path.join(__dirname, '..', '..', 'uploads');

			const destinationPath = path.join(uploadBasePath, subfolder);

			// Try to create the requested destination. If it fails (for example on systems
			// where the configured base path like "/mnt" doesn't exist), fall back to a
			// local uploads directory so the server remains usable.
			fs.mkdir(destinationPath, { recursive: true }, (err) => {
				if (!err) {
					return cb(null, destinationPath);
				}
				// Log the failure and attempt a safe fallback
				logger.warn(`Failed to create upload directory: ${destinationPath} - ${err.message}. Falling back to local uploads directory.`);
				let fallback: string | null = null;
				try {
					fallback = path.join(defaultLocalBase, subfolder);
					fs.mkdirSync(fallback, { recursive: true });
					return cb(null, fallback);
				} catch (e) {
					const fallbackErr = e as Error;
					logger.error(`Failed to create fallback upload directory: ${fallback} - ${fallbackErr.message}`);
					// If fallback also fails, return the original error to the multer callback
					return cb(err, destinationPath);
				}
			});
		},
		filename: (req: Request, file: Express.Multer.File, cb) => {
			// Generate a unique filename to prevent overwrites
			const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
			const extension = path.extname(file.originalname);
			const finalFilename = `${file.fieldname}-${uniqueSuffix}${extension}`;
			cb(null, finalFilename);
		},
	});

	const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
		if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			cb(null, true); // Accept file
		} else {
			logger.warn(`Upload rejected for file '${file.originalname}' with unsupported mimetype: ${file.mimetype}`);
			cb(new Error('Unsupported file type.')); // Reject file
		}
	};

	return multer({
		storage: storage,
		fileFilter: fileFilter,
		limits: {
			fileSize: 1024 * 1024 * 10, // 10 MB file size limit
		},
	});
};

/**
 * Middleware to validate that a file was uploaded.
 * To be used after the multer middleware.
 */
export const validateUploadedFile = (req: Request, res: Response, next: NextFunction) => {
	if (!req.file) {
		return res.status(400).json({
			status: 'error',
			message: 'File upload is required.',
		});
	}
	next();
};
