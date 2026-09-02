"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watermarkService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const logger_1 = require("../logging/logger");
class WatermarkService {
    watermarkVersion = "1.3.0";
    /**
     * Generate a zero-PII forensic watermark payload and cryptographic fingerprint
     */
    generateForensicPayload(params) {
        const timestamp = params.timestamp || new Date().toISOString();
        // Canonical representation of non-PII attributes
        const rawString = `${this.watermarkVersion}|${params.activationId}|${params.playbackSessionId}|${params.theatreCode}|${params.screenNumber}|${params.seatNumber}|${params.showId}|${params.movieId}|${timestamp}`;
        const fingerprintHash = crypto_1.default.createHash("sha256").update(rawString).digest("hex");
        return {
            version: this.watermarkVersion,
            activationId: params.activationId,
            playbackSessionId: params.playbackSessionId,
            theatreCode: params.theatreCode,
            screenNumber: params.screenNumber,
            seatNumber: params.seatNumber,
            showId: params.showId,
            movieId: params.movieId,
            timestamp,
            fingerprintHash,
        };
    }
    /**
     * Encodes the watermark into a compact, steganography-ready visual string
     * Example: "AGY-V13:TH01-SCR2-SEAT_A12-ACT9F82-PBT4A1B-T1724932800"
     */
    formatVisualWatermark(payload) {
        const shortAct = payload.activationId.slice(0, 8);
        const shortPbt = payload.playbackSessionId.slice(0, 8);
        const epochSec = Math.floor(new Date(payload.timestamp).getTime() / 1000);
        return `AGY-V13:${payload.theatreCode}-S${payload.screenNumber}-${payload.seatNumber}-${shortAct}-${shortPbt}-T${epochSec}`;
    }
    /**
     * Trace an extracted watermark string or SHA-256 fingerprint back to the originating
     * screening, auditorium, seat, admission ticket, and device session.
     */
    async lookupWatermark(query) {
        const trimmed = query.trim();
        logger_1.logger.info(`Performing forensic watermark trace lookup for query: ${trimmed.slice(0, 30)}...`);
        // 1. Direct search by PlaybackSession ID or token
        let session = await database_1.prisma.playbackSession.findFirst({
            where: {
                OR: [
                    { id: trimmed },
                    { sessionToken: trimmed },
                    { activationId: trimmed },
                    { id: { startsWith: trimmed } },
                    { sessionToken: { startsWith: trimmed } },
                ],
            },
            include: {
                theatre: true,
                show: {
                    include: {
                        movie: true,
                        screen: true,
                    },
                },
                activation: {
                    include: {
                        ticket: true,
                    },
                },
                drmLicenses: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        // 2. If not found directly, check ForensicEvidence records for matching fingerprint
        if (!session) {
            const evidence = await database_1.prisma.forensicEvidence.findFirst({
                where: {
                    OR: [
                        { watermarkFingerprint: trimmed },
                        { evidenceHash: trimmed },
                        { watermarkFingerprint: { contains: trimmed } },
                    ],
                },
            });
            if (evidence?.playbackSessionId) {
                session = await database_1.prisma.playbackSession.findUnique({
                    where: { id: evidence.playbackSessionId },
                    include: {
                        theatre: true,
                        show: {
                            include: {
                                movie: true,
                                screen: true,
                            },
                        },
                        activation: {
                            include: {
                                ticket: true,
                            },
                        },
                        drmLicenses: {
                            take: 1,
                            orderBy: { createdAt: "desc" },
                        },
                    },
                });
            }
        }
        if (!session) {
            return { found: false, protectionEventsCount: 0, suspiciousEventsCount: 0 };
        }
        const [protCount, threatCount] = await Promise.all([
            database_1.prisma.protectionEvent.count({ where: { activationId: session.activationId } }),
            database_1.prisma.securityAuditLog.count({
                where: {
                    OR: [{ activationId: session.activationId }, { theatreId: session.theatreId }],
                    isThreat: true,
                },
            }),
        ]);
        const payload = this.generateForensicPayload({
            activationId: session.activationId,
            playbackSessionId: session.id,
            theatreCode: session.theatre.code,
            screenNumber: session.show.screen.screenNumber,
            seatNumber: session.activation.ticket.seatNumber,
            showId: session.showId,
            movieId: session.show.movieId,
            timestamp: session.authorizedAt.toISOString(),
        });
        return {
            found: true,
            watermarkPayload: payload,
            theatre: {
                id: session.theatre.id,
                name: session.theatre.name,
                code: session.theatre.code,
                location: session.theatre.location,
            },
            screen: {
                screenNumber: session.show.screen.screenNumber,
                name: session.show.screen.name,
            },
            movie: {
                id: session.show.movie.id,
                title: session.show.movie.title,
                durationMinutes: session.show.movie.durationMinutes,
            },
            show: {
                id: session.show.id,
                startTime: session.show.startTime.toISOString(),
                endTime: session.show.endTime.toISOString(),
                status: session.show.status,
            },
            ticket: {
                id: session.activation.ticket.id,
                ticketNumber: session.activation.ticket.ticketNumber,
                seatNumber: session.activation.ticket.seatNumber,
                status: session.activation.ticket.status,
            },
            activation: {
                id: session.activation.id,
                activationCode: session.activation.activationCode,
                status: session.activation.status,
                activatedAt: session.activation.activatedAt,
            },
            playbackSession: {
                id: session.id,
                sessionToken: session.sessionToken,
                status: session.status,
                authorizedAt: session.authorizedAt,
            },
            drmLicense: session.drmLicenses[0]
                ? {
                    id: session.drmLicenses[0].id,
                    licenseToken: session.drmLicenses[0].licenseToken,
                    status: session.drmLicenses[0].status,
                    issuedAt: session.drmLicenses[0].issuedAt,
                }
                : undefined,
            protectionEventsCount: protCount,
            suspiciousEventsCount: threatCount,
        };
    }
}
exports.watermarkService = new WatermarkService();
