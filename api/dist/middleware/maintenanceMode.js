"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceModeMiddleware = exports.maintenanceState = void 0;
const envValidator_1 = require("../config/envValidator");
class MaintenanceState {
    isEnabled = envValidator_1.env.MAINTENANCE_MODE;
    message = "System is undergoing scheduled operational maintenance. Playback and DRM licensing will resume shortly.";
    getStatus() {
        return {
            enabled: this.isEnabled,
            message: this.message,
        };
    }
    setStatus(enabled, message) {
        this.isEnabled = enabled;
        if (message)
            this.message = message;
    }
}
exports.maintenanceState = new MaintenanceState();
const maintenanceModeMiddleware = (req, res, next) => {
    const { enabled, message } = exports.maintenanceState.getStatus();
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
    const isRestricted = path.startsWith("/api/playback") ||
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
exports.maintenanceModeMiddleware = maintenanceModeMiddleware;
