import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, AuthenticatedUser, ApiResponse } from "../types";
import { env } from "../config/envValidator";
import { TokenService } from "../services/security/tokenService";
import { SecurityAuditService } from "../services/security/securityAuditService";

export { AuthenticatedRequest, AuthenticatedUser };

export const extractBearerToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1].trim();
};

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req);

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
    const isRevoked = await TokenService.isTokenRevoked(token);
    if (isRevoked) {
      res.status(401).json({
        success: false,
        message: "Token has been revoked. Please log in again.",
        errorCode: "TOKEN_REVOKED",
      });
      return;
    }
  } catch (e) {
    // Non-fatal fallback
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    const isExpired = err.name === "TokenExpiredError";
    res.status(401).json({
      success: false,
      message: isExpired ? "Session expired. Please log in again." : "Invalid authentication token.",
      errorCode: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      
      await SecurityAuditService.logEvent({
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
