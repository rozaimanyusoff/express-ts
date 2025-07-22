import fs from 'fs';
import path from 'path';

/**
 * Saves a base64 image or returns the filename if already uploaded.
 * @param image The base64 string or filename
 * @param folder The folder under uploads/ to save the image (e.g., 'types', 'category', 'brands', 'models')
 * @param prefix The filename prefix (e.g., 'type', 'category', 'brand', 'model')
 * @param uploadBasePath Optional: override base path (default: process.cwd() + '/uploads')
 * @returns The saved filename or original filename
 */
export async function handleImageUpload(
  image: string,
  folder: string,
  prefix: string,
  uploadBasePath?: string
): Promise<string> {
  if (!image) return '';
  const basePath = uploadBasePath || path.join(process.cwd(), 'uploads');
  const uploadsDir = path.join(basePath, folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (image.startsWith('data:image/')) {
    const ext = image.substring(image.indexOf('/') + 1, image.indexOf(';'));
    const base64Data = image.split(',')[1];
    const filename = `${prefix}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  }
  return image;
}
