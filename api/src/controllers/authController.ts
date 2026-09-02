import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@antipiracy/database";
import { ApiResponse, AuthenticatedUser, AuthenticatedRequest } from "../types";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/envValidator";
import { TokenService } from "../services/security/tokenService";
import { SecurityAuditService } from "../services/security/securityAuditService";
import { extractBearerToken } from "../middleware/auth";

export const login = async (
  req: Request,
  res: Response<ApiResponse<{ token: string; user: AuthenticatedUser }>>,
  next: NextFunction
): Promise<void> => {
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "browser";

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400, "MISSING_CREDENTIALS");
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Default Administrator Evaluation Account
    if (cleanEmail === "admin@theatre.com" && password === "admin123") {
      const user: AuthenticatedUser = {
        id: "admin-default-id",
        email: "admin@theatre.com",
        name: "Super Administrator",
        role: "ADMIN",
      };

      const token = jwt.sign(user, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
      });

      await SecurityAuditService.logEvent({
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
      const user: AuthenticatedUser = {
        id: "staff-default-id",
        email: "staff@theatre.com",
        name: "Officer Marcus (Security Staff)",
        role: "THEATRE_STAFF",
      };

      const token = jwt.sign(user, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
      });

      await SecurityAuditService.logEvent({
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
      const dbUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (dbUser) {
        // Compare password via bcrypt or fallback plaintext match
        let isMatch = false;
        if (dbUser.passwordHash.startsWith("$2a$") || dbUser.passwordHash.startsWith("$2b$")) {
          isMatch = await bcrypt.compare(password, dbUser.passwordHash);
        } else {
          isMatch = dbUser.passwordHash === password;
        }

        if (isMatch) {
          const user: AuthenticatedUser = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            theatreId: dbUser.theatreId,
            productionCompanyId: dbUser.productionCompanyId,
          };

          const token = jwt.sign(user, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
          });

          await SecurityAuditService.logEvent({
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
    } catch (dbErr) {
      console.warn("Database user query warning:", dbErr);
    }

    // 4. Log Failed Login Attempt
    await SecurityAuditService.logEvent({
      eventType: "LOGIN_FAILED",
      severity: "MEDIUM",
      actorEmail: cleanEmail,
      ipAddress: clientIp,
      userAgent,
      actionSummary: `Failed login attempt for ${cleanEmail} from ${clientIp}`,
    });

    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const user = req.user;
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    if (token && user) {
      await TokenService.revokeToken(token, user.id, "User initiated logout");
      await SecurityAuditService.logEvent({
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
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response<ApiResponse<{ token: string; user: AuthenticatedUser }>>,
  next: NextFunction
): Promise<void> => {
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "browser";

  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400, "MISSING_FIELDS");
    }

    const trimmedName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    if (trimmedName.length < 2) {
      throw new AppError("Name must be at least 2 characters long", 400, "INVALID_NAME");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError("Please provide a valid email address", 400, "INVALID_EMAIL");
    }

    if (cleanPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400, "WEAK_PASSWORD");
    }

    // Determine allowed role
    const validRoles = ["ADMIN", "THEATRE_ADMIN", "THEATRE_STAFF", "PRODUCTION_COMPANY"];
    const userRole = validRoles.includes(role) ? role : "ADMIN";

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      throw new AppError("An account with this email already exists", 409, "USER_EXISTS");
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: cleanEmail,
        passwordHash,
        role: userRole as any,
      },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      theatreId: newUser.theatreId,
      productionCompanyId: newUser.productionCompanyId,
    };

    const token = jwt.sign(authenticatedUser, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    });

    await SecurityAuditService.logEvent({
      eventType: "USER_REGISTERED" as any,
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
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<AuthenticatedUser>>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};
