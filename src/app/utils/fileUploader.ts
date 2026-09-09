import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import config from "../../config/index.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "/uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const uploadToCloudinary = async (file: Express.Multer.File) => {
  // Configuration
  cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
  });

  const result = await cloudinary.uploader.upload(file.path, {
    public_id: file.filename,
  });

  // Delete local temp file
  fs.unlinkSync(file.path);

  return result; // <-- HTTPS URL for Next/Image
};

export const fileUploader = {
  upload,
  uploadToCloudinary,
};
