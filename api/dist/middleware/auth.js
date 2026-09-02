"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateJwt = exports.extractBearerToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const envValidator_1 = require("../config/envValidator");
const tokenService_1 = require("../services/security/tokenService");
const securityAuditService_1 = require("../services/security/securityAuditService");
const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split(" ")[1].trim();
};
exports.extractBearerToken = extractBearerToken;
const authenticateJwt = async (req, res, next) => {
    const token = (0, exports.extractBearerToken)(req);
    if (!token) {
        res.status(401).json({
            success: false,
            message: "Authentication required: Bearer token missing",
            errorCode: "UNAUTHORIZED",
        });
        return;
    }
    // Check token blacklist
    try {
        const isRevoked = await tokenService_1.TokenService.isTokenRevoked(token);
        if (isRevoked) {
            res.status(401).json({
                success: false,
                message: "Token has been revoked. Please log in again.",
                errorCode: "TOKEN_REVOKED",
            });
            return;
        }
    }
    catch (e) {
        // Non-fatal fallback
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, envValidator_1.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        const isExpired = err.name === "TokenExpiredError";
        res.status(401).json({
            success: false,
            message: isExpired ? "Session expired. Please log in again." : "Invalid authentication token.",
            errorCode: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        });
    }
};
exports.authenticateJwt = authenticateJwt;
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "ROLE_ACCESS_DENIED",
                severity: "HIGH",
                userId: req.user?.id,
                actorEmail: req.user?.email,
                actorRole: req.user?.role,
                endpoint: req.originalUrl,
                ipAddress: clientIp,
                actionSummary: `Access denied to ${req.method} ${req.originalUrl}. Role ${req.user?.role || "GUEST"} lacks required roles [${allowedRoles.join(", ")}]`,
            });
            res.status(403).json({
                success: false,
                message: "Access forbidden: insufficient role permissions",
                errorCode: "FORBIDDEN",
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
