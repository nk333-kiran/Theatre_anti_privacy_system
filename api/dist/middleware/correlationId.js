"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = void 0;
exports.generateRequestId = generateRequestId;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Request Correlation ID Generator
 * Generates standardized, collision-resistant correlation IDs in format:
 * REQ-YYYYMMDD-XXXXXXXX
 */
function generateRequestId() {
    const date = new Date();
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const randomHex = crypto_1.default.randomBytes(4).toString("hex");
    return `REQ-${yyyy}${mm}${dd}-${randomHex}`;
}
const correlationIdMiddleware = (req, res, next) => {
    // Use incoming X-Request-ID if provided and well-formed, or generate a fresh one
    const incomingId = req.headers["x-request-id"];
    const validIncoming = incomingId && /^REQ-\d{8}-[a-f0-9]{8}$/i.test(incomingId.trim());
    const requestId = validIncoming ? incomingId.trim() : generateRequestId();
    req.id = requestId;
    req.requestId = requestId;
    req.startTime = Date.now();
    res.setHeader("X-Request-ID", requestId);
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
