import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
  const baseUploadPath = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
  const dir = path.join(baseUploadPath, 'models');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const uploadModelImage = multer({ storage });

export default uploadModelImage;
