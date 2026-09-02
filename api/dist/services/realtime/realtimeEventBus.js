"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeEventBus = void 0;
const events_1 = require("events");
const database_1 = require("@antipiracy/database");
const logger_1 = require("../logging/logger");
const crypto_1 = __importDefault(require("crypto"));
class RealtimeEventBus extends events_1.EventEmitter {
    static instance;
    constructor() {
        super();
        this.setMaxListeners(200);
    }
    static getInstance() {
        if (!RealtimeEventBus.instance) {
            RealtimeEventBus.instance = new RealtimeEventBus();
        }
        return RealtimeEventBus.instance;
    }
    /**
     * Sanitizes metadata to ensure zero-secret and zero-PII exposure
     */
    sanitizeMetadata(raw) {
        if (!raw)
            return {};
        const sanitized = {};
        const sensitiveKeys = [
            "password",
            "passwordHash",
            "jwtSecret",
            "jwt_secret",
            "masterKey",
            "privateKey",
            "drmKey",
            "secret",
            "token",
            "authorization",
            "creditCard",
            "phone",
            "email",
        ];
        for (const [key, value] of Object.entries(raw)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some((s) => lowerKey.includes(s.toLowerCase()))) {
                sanitized[key] = "[REDACTED]";
            }
            else if (typeof value === "object" && value !== null) {
                sanitized[key] = this.sanitizeMetadata(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Ingests a new security event, sanitizes it, stores in database, and broadcasts to listeners
     */
    async publish(payload) {
        const eventId = payload.eventId || `evt_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        const correlationId = payload.correlationId || `corr_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        const timestamp = payload.timestamp || new Date().toISOString();
        const sanitizedMeta = this.sanitizeMetadata(payload.metadata);
        const event = {
            eventId,
            correlationId,
            eventType: payload.eventType,
            source: payload.source || "INTERNAL_EVENT_BUS",
            severity: payload.severity || "LOW",
            theatreId: payload.theatreId,
            showId: payload.showId,
            movieId: payload.movieId,
            activationId: payload.activationId,
            playbackSessionId: payload.playbackSessionId,
            metadata: sanitizedMeta,
            timestamp,
        };
        // Asynchronously persist to database
        database_1.prisma.realtimeThreatEvent
            .create({
            data: {
                eventId: event.eventId,
                correlationId: event.correlationId,
                eventType: event.eventType,
                source: event.source,
                severity: event.severity,
                theatreId: event.theatreId,
                showId: event.showId,
                movieId: event.movieId,
                activationId: event.activationId,
                playbackSessionId: event.playbackSessionId,
                metadata: JSON.stringify(event.metadata),
            },
        })
            .catch((err) => {
            logger_1.logger.warn(`[RealtimeEventBus] Failed to persist event ${eventId}: ${err.message}`);
        });
        // Broadcast across event bus
        this.emit("security_event", event);
        this.emit(`event:${event.eventType}`, event);
        return event;
    }
}
exports.realtimeEventBus = RealtimeEventBus.getInstance();
