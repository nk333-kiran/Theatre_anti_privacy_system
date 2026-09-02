"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.register = exports.logout = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("@antipiracy/database");
const errorHandler_1 = require("../middleware/errorHandler");
const envValidator_1 = require("../config/envValidator");
const tokenService_1 = require("../services/security/tokenService");
const securityAuditService_1 = require("../services/security/securityAuditService");
const auth_1 = require("../middleware/auth");
const login = async (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "browser";
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errorHandler_1.AppError("Email and password are required", 400, "MISSING_CREDENTIALS");
        }
        const cleanEmail = String(email).trim().toLowerCase();
        // 1. Default Administrator Evaluation Account
        if (cleanEmail === "admin@theatre.com" && password === "admin123") {
            const user = {
                id: "admin-default-id",
                email: "admin@theatre.com",
                name: "Super Administrator",
                role: "ADMIN",
            };
            const token = jsonwebtoken_1.default.sign(user, envValidator_1.env.JWT_SECRET, {
                expiresIn: envValidator_1.env.JWT_EXPIRES_IN,
            });
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "LOGIN_SUCCESS",
                severity: "INFO",
                userId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                ipAddress: clientIp,
                userAgent,
                actionSummary: `Admin account logged in successfully from ${clientIp}`,
            });
            res.status(200).json({
                success: true,
                message: "Login successful",
                data: { token, user },
            });
            return;
        }
        // 2. Default Security Staff Evaluation Account
        if (cleanEmail === "staff@theatre.com" && password === "staff123") {
            const user = {
                id: "staff-default-id",
                email: "staff@theatre.com",
                name: "Officer Marcus (Security Staff)",
                role: "THEATRE_STAFF",
            };
            const token = jsonwebtoken_1.default.sign(user, envValidator_1.env.JWT_SECRET, {
                expiresIn: envValidator_1.env.JWT_EXPIRES_IN,
            });
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "LOGIN_SUCCESS",
                severity: "INFO",
                userId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                ipAddress: clientIp,
                userAgent,
                actionSummary: `Security staff logged in successfully from ${clientIp}`,
            });
            res.status(200).json({
                success: true,
                message: "Login successful",
                data: { token, user },
            });
            return;
        }
        // 3. Database User Lookup with Bcrypt Hash Verification
        try {
            const dbUser = await database_1.prisma.user.findUnique({
                where: { email: cleanEmail },
            });
            if (dbUser) {
                // Compare password via bcrypt or fallback plaintext match
                let isMatch = false;
                if (dbUser.passwordHash.startsWith("$2a$") || dbUser.passwordHash.startsWith("$2b$")) {
                    isMatch = await bcryptjs_1.default.compare(password, dbUser.passwordHash);
                }
                else {
                    isMatch = dbUser.passwordHash === password;
                }
                if (isMatch) {
                    const user = {
                        id: dbUser.id,
                        email: dbUser.email,
                        name: dbUser.name,
                        role: dbUser.role,
                        theatreId: dbUser.theatreId,
                        productionCompanyId: dbUser.productionCompanyId,
                    };
                    const token = jsonwebtoken_1.default.sign(user, envValidator_1.env.JWT_SECRET, {
                        expiresIn: envValidator_1.env.JWT_EXPIRES_IN,
                    });
                    await securityAuditService_1.SecurityAuditService.logEvent({
                        eventType: "LOGIN_SUCCESS",
                        severity: "INFO",
                        userId: user.id,
                        actorEmail: user.email,
                        actorRole: user.role,
                        theatreId: user.theatreId || undefined,
                        ipAddress: clientIp,
                        userAgent,
                        actionSummary: `User ${user.email} (${user.role}) authenticated successfully`,
                    });
                    res.status(200).json({
                        success: true,
                        message: "Login successful",
                        data: { token, user },
                    });
                    return;
                }
            }
        }
        catch (dbErr) {
            console.warn("Database user query warning:", dbErr);
        }
        // 4. Log Failed Login Attempt
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "LOGIN_FAILED",
            severity: "MEDIUM",
            actorEmail: cleanEmail,
            ipAddress: clientIp,
            userAgent,
            actionSummary: `Failed login attempt for ${cleanEmail} from ${clientIp}`,
        });
        throw new errorHandler_1.AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const logout = async (req, res, next) => {
    try {
        const token = (0, auth_1.extractBearerToken)(req);
        const user = req.user;
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        if (token && user) {
            await tokenService_1.TokenService.revokeToken(token, user.id, "User initiated logout");
            await securityAuditService_1.SecurityAuditService.logEvent({
                eventType: "LOGOUT",
                severity: "INFO",
                userId: user.id,
                actorEmail: user.email,
                actorRole: user.role,
                ipAddress: clientIp,
                actionSummary: `User ${user.email} logged out and session token was revoked`,
            });
        }
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const register = async (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "browser";
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            throw new errorHandler_1.AppError("Name, email, and password are required", 400, "MISSING_FIELDS");
        }
        const trimmedName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPassword = String(password);
        if (trimmedName.length < 2) {
            throw new errorHandler_1.AppError("Name must be at least 2 characters long", 400, "INVALID_NAME");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            throw new errorHandler_1.AppError("Please provide a valid email address", 400, "INVALID_EMAIL");
        }
        if (cleanPassword.length < 6) {
            throw new errorHandler_1.AppError("Password must be at least 6 characters long", 400, "WEAK_PASSWORD");
        }
        // Determine allowed role
        const validRoles = ["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"];
        const userRole = validRoles.includes(role) ? role : "ADMIN";
        // Check if user exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: cleanEmail },
        });
        if (existingUser) {
            throw new errorHandler_1.AppError("An account with this email already exists", 409, "USER_EXISTS");
        }
        // Hash password with bcrypt
        const passwordHash = await bcryptjs_1.default.hash(cleanPassword, 10);
        // Create user in database
        const newUser = await database_1.prisma.user.create({
            data: {
                name: trimmedName,
                email: cleanEmail,
                passwordHash,
                role: userRole,
            },
        });
        const authenticatedUser = {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            theatreId: newUser.theatreId,
            productionCompanyId: newUser.productionCompanyId,
        };
        const token = jsonwebtoken_1.default.sign(authenticatedUser, envValidator_1.env.JWT_SECRET, {
            expiresIn: envValidator_1.env.JWT_EXPIRES_IN,
        });
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "USER_REGISTERED",
            severity: "INFO",
            userId: newUser.id,
            actorEmail: newUser.email,
            actorRole: newUser.role,
            ipAddress: clientIp,
            userAgent,
            actionSummary: `New user ${newUser.email} registered with role ${newUser.role}`,
        });
        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: { token, user: authenticatedUser },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const getProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.AppError("Authentication required", 401, "UNAUTHORIZED");
        }
        res.status(200).json({
            success: true,
            data: req.user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
