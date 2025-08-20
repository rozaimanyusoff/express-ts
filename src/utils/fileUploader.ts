import createUpload, { validateUploadedFile, uploadFileFunction } from './uploadFile';

// Factory to obtain a configured multer uploader for any subfolder
export function getUploader(subfolder: string, opts?: { maxSize?: number; allowedMimeTypes?: string[] }) {
	return createUpload({ subfolder, maxSize: opts?.maxSize, allowedMimeTypes: opts?.allowedMimeTypes });
}

// Convenience pair factory for vendor uploads (you can still use getUploader instead)
export function vendorUploadPair() {
	return uploadFileFunction('vendor_logo', 'image', { fieldName: 'bfcy_logo', maxSize: 3 * 1024 * 1024 });
}

export { validateUploadedFile };
