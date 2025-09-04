// src/utils/fileUploader.ts
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { getUploadBaseSync } from './uploadUtil';

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
// subfolder is the module_directory to store files under (e.g., 'purchases/docs')
export const createUploader = (subfolder: string) => {
	const storage = multer.diskStorage({
		destination: (req: Request, file: Express.Multer.File, cb) => {
			const base = getUploadBaseSync();
			const destinationPath = path.join(base, subfolder);
			fs.mkdir(destinationPath, { recursive: true }, (err) => {
				if (err) {
					logger.error(`Failed to ensure upload directory: ${destinationPath} - ${err.message}`);
					return cb(err, destinationPath);
				}
				return cb(null, destinationPath);
			});
		},
		filename: (req: Request, file: Express.Multer.File, cb) => {
			// Generate a unique filename to prevent overwrites
			const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
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
