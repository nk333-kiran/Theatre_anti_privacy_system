"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const localStorage_1 = require("../services/storage/localStorage");
const errorHandler_1 = require("./errorHandler");
const maxFileSizeMb = parseInt(process.env.MAX_VIDEO_UPLOAD_MB || "5000", 10);
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, localStorage_1.storageManager.getRawStorageDir());
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase() || ".mp4";
        const safeExt = localStorage_1.storageManager.sanitizeFilename(ext);
        const uniqueId = crypto_1.default.randomBytes(8).toString("hex");
        const filename = `RAW-${Date.now()}-${uniqueId}${safeExt}`;
        cb(null, filename);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowedExtensions = [".mp4", ".mov", ".mkv", ".webm", ".avi", ".ts", ".m4v"];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const isVideoMime = file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream";
    if (allowedExtensions.includes(ext) || isVideoMime) {
        cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError(`Invalid file type: ${ext}. Supported video formats: MP4, MOV, MKV, WEBM, AVI, M4V.`, 400, "INVALID_FILE_TYPE"));
    }
};
exports.videoUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: maxFileSizeBytes,
    },
});
