import { Request, Response, NextFunction } from "express";
import { env } from "../config/envValidator";

class MaintenanceState {
  private isEnabled: boolean = env.MAINTENANCE_MODE;
  private message: string = "System is undergoing scheduled operational maintenance. Playback and DRM licensing will resume shortly.";

  public getStatus() {
    return {
      enabled: this.isEnabled,
      message: this.message,
    };
  }

  public setStatus(enabled: boolean, message?: string) {
    this.isEnabled = enabled;
    if (message) this.message = message;
  }
}

export const maintenanceState = new MaintenanceState();

export const maintenanceModeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { enabled, message } = maintenanceState.getStatus();

  if (!enabled) {
    return next();
  }

  // Exempt health endpoints and admin operational endpoints
  const path = req.originalUrl || req.path;
  const isHealth = path.startsWith("/health") || path.startsWith("/api/health");
  const isOperations = path.startsWith("/api/operations");
  const isAuth = path.startsWith("/api/auth");

  if (isHealth || isOperations || isAuth) {
    return next();
  }

  // Intercept playback, DRM, and ticket activation during maintenance
  const isRestricted =
    path.startsWith("/api/playback") ||
    path.startsWith("/api/drm") ||
    path.startsWith("/api/activations") ||
    path.startsWith("/api/verifications");

  if (isRestricted) {
    res.status(503).json({
      success: false,
      error: {
        code: "MAINTENANCE_MODE_ACTIVE",
        message,
      },
      requestId: req.id,
      retryAfterSeconds: 300,
    });
    return;
  }

  next();
};
