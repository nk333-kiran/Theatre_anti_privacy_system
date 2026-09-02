import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request Correlation ID Generator
 * Generates standardized, collision-resistant correlation IDs in format:
 * REQ-YYYYMMDD-XXXXXXXX
 */
export function generateRequestId(): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const randomHex = crypto.randomBytes(4).toString("hex");

  return `REQ-${yyyy}${mm}${dd}-${randomHex}`;
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Use incoming X-Request-ID if provided and well-formed, or generate a fresh one
  const incomingId = req.headers["x-request-id"] as string | undefined;
  const validIncoming = incomingId && /^REQ-\d{8}-[a-f0-9]{8}$/i.test(incomingId.trim());

  const requestId = validIncoming ? incomingId.trim() : generateRequestId();

  req.id = requestId;
  req.requestId = requestId;
  req.startTime = Date.now();

  res.setHeader("X-Request-ID", requestId);
  next();
};
