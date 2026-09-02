import multer from "multer";
import path from "path";
import crypto from "crypto";
import { storageManager } from "../services/storage/localStorage";
import { AppError } from "./errorHandler";

const maxFileSizeMb = parseInt(process.env.MAX_VIDEO_UPLOAD_MB || "5000", 10);
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageManager.getRawStorageDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const safeExt = storageManager.sanitizeFilename(ext);
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const filename = `RAW-${Date.now()}-${uniqueId}${safeExt}`;
    cb(null, filename);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [".mp4", ".mov", ".mkv", ".webm", ".avi", ".ts", ".m4v"];
  const ext = path.extname(file.originalname).toLowerCase();

  const isVideoMime = file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream";

  if (allowedExtensions.includes(ext) || isVideoMime) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${ext}. Supported video formats: MP4, MOV, MKV, WEBM, AVI, M4V.`,
        400,
        "INVALID_FILE_TYPE"
      )
    );
  }
};

export const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeBytes,
  },
});
