"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaybackStats = exports.serveAssetThumbnail = exports.serveHlsSegment = exports.serveHlsVariantManifest = exports.serveHlsMasterManifest = exports.getPlaybackSessions = exports.terminatePlaybackSession = exports.sendPlaybackHeartbeat = exports.startPlaybackStream = exports.authorizePlaybackSession = void 0;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("@antipiracy/database");
const videoDelivery_1 = require("../services/videoDelivery");
const errorHandler_1 = require("../middleware/errorHandler");
// POST /api/playback/authorize - Authorize and generate short-lived playback token
const authorizePlaybackSession = async (req, res, next) => {
    try {
        const { token, deviceFingerprint } = req.body;
        if (!token) {
            throw new errorHandler_1.AppError("Activation token or Ticket ID is required for playback authorization", 400, "MISSING_TOKEN");
        }
        const cleanToken = String(token).trim();
        const now = new Date();
        // 1. Validate Activation & Ticket
        const activation = await database_1.prisma.activation.findFirst({
            where: {
                OR: [
                    { activationCode: cleanToken },
                    { id: cleanToken },
                    { ticket: { ticketNumber: cleanToken.toUpperCase() } },
                ],
            },
            include: {
                ticket: {
                    include: {
                        show: {
                            include: {
                                movie: true,
                                theatre: true,
                                screen: true,
                            },
                        },
                    },
                },
            },
        });
        if (!activation || !activation.ticket) {
            throw new errorHandler_1.AppError("Invalid or unrecognized activation token", 404, "INVALID_TOKEN");
        }
        const { ticket } = activation;
        const { show } = ticket;
        const { movie, theatre, screen } = show;
        // Failure Handler Helper
        const recordDeniedAndFail = async (reason, errorCode, statusCode = 403) => {
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            await database_1.prisma.protectionEvent.create({
                data: {
                    activationId: activation.id,
                    theatreId: theatre.id,
                    showId: show.id,
                    eventType: "PLAYBACK_DENIED",
                    metadata: JSON.stringify({ reason, errorCode, token: cleanToken }),
                    ipAddress: clientIp,
                },
            });
            throw new errorHandler_1.AppError(reason, statusCode, errorCode);
        };
        // 2. Validate Activation Status & Expiry
        if (activation.status === "REVOKED" || ticket.status === "CANCELLED") {
            await recordDeniedAndFail("Activation session has been cancelled or revoked", "ACTIVATION_REVOKED");
        }
        if (activation.status === "EXPIRED" || (activation.expiresAt && now > new Date(activation.expiresAt))) {
            await recordDeniedAndFail("Activation session has expired", "ACTIVATION_EXPIRED");
        }
        // 3. Validate Theatrical Distribution Release (Phase 7 Integration)
        const approvedRelease = await database_1.prisma.movieRelease.findFirst({
            where: {
                movieId: movie.id,
                theatreId: theatre.id,
                status: { in: ["APPROVED", "ACTIVE"] },
                startDate: { lte: now },
                endDate: { gte: now },
            },
        });
        // If no explicit release window exists in database yet, verify production company ownership or allow existing scheduled show
        if (!approvedRelease && movie.productionCompanyId) {
            // Check if release was specifically rejected
            const rejectedRelease = await database_1.prisma.movieRelease.findFirst({
                where: {
                    movieId: movie.id,
                    theatreId: theatre.id,
                    status: "REJECTED",
                },
            });
            if (rejectedRelease) {
                await recordDeniedAndFail(`Distribution authorization denied for "${theatre.name}": ${rejectedRelease.rejectionReason || "Licensing restrictions"}`, "RELEASE_REJECTED");
            }
        }
        // 4. Resolve / Initialize VideoAsset Delivery Record
        let videoAsset = await database_1.prisma.videoAsset.findFirst({
            where: {
                movieId: movie.id,
                state: "READY",
            },
        });
        if (!videoAsset) {
            // Auto-provision secure delivery stream key placeholder if not registered yet
            const generatedStreamKey = `STRM-${Date.now().toString(36).toUpperCase()}-${crypto_1.default.randomBytes(4).toString("hex").toUpperCase()}`;
            videoAsset = await database_1.prisma.videoAsset.create({
                data: {
                    title: `${movie.title} (Theatrical DCI Master)`,
                    movieId: movie.id,
                    productionCompanyId: movie.productionCompanyId || (await database_1.prisma.productionCompany.findFirst())?.id || (await database_1.prisma.productionCompany.create({ data: { name: "Studio Master Distribution", code: "PC-STUDIO", contactEmail: "dist@studio.com" } })).id,
                    state: "READY",
                    streamKey: generatedStreamKey,
                    deliveryManifestUrl: `/api/playback/stream/${generatedStreamKey}/manifest.mpd`,
                    durationSeconds: movie.durationMinutes * 60,
                },
            });
        }
        if (videoAsset.state === "BLOCKED" || videoAsset.state === "ARCHIVED") {
            await recordDeniedAndFail("The requested video stream asset is currently locked or archived", "ASSET_BLOCKED");
        }
        // 5. Generate Short-Lived Cryptographic Playback Authorization
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 150) : "web-player";
        const authResult = await videoDelivery_1.videoDeliveryService.generatePlaybackAuthorization({
            activationId: activation.id,
            movieId: movie.id,
            movieTitle: movie.title,
            theatreId: theatre.id,
            theatreCode: theatre.code,
            showId: show.id,
            streamKey: videoAsset.streamKey,
            ipAddress: clientIp,
            userAgent,
            ttlMinutes: 25,
        });
        // 6. Record PlaybackSession in PostgreSQL
        const playbackSession = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken: authResult.sessionToken,
                activationId: activation.id,
                videoAssetId: videoAsset.id,
                theatreId: theatre.id,
                showId: show.id,
                status: "AUTHORIZED",
                ipAddress: clientIp,
                userAgent,
                expiresAt: authResult.expiresAt,
            },
        });
        // 7. Log PLAYBACK_AUTHORIZED Protection Event
        await database_1.prisma.protectionEvent.create({
            data: {
                activationId: activation.id,
                theatreId: theatre.id,
                showId: show.id,
                eventType: "PLAYBACK_AUTHORIZED",
                metadata: JSON.stringify({
                    playbackToken: authResult.sessionToken,
                    expiresAt: authResult.expiresAt.toISOString(),
                    drmScheme: authResult.drmMetadata.scheme,
                }),
                ipAddress: clientIp,
                userAgent,
            },
        });
        // 8. Assemble Dynamic Watermark Payload
        const shortActivationId = `ACT-${activation.id.slice(0, 8).toUpperCase()}`;
        const watermark = {
            shortActivationId,
            sessionId: playbackSession.sessionToken,
            theatreCode: theatre.code,
            theatreName: theatre.name,
            screenName: screen.name,
            seatNumber: ticket.seatNumber,
            movieTitle: movie.title,
            timestamp: now.toISOString(),
        };
        res.status(200).json({
            success: true,
            message: "Playback authorization granted",
            data: {
                playbackToken: authResult.sessionToken,
                deliveryManifestUrl: authResult.deliveryManifestUrl,
                expiresAt: authResult.expiresAt.toISOString(),
                drmMetadata: authResult.drmMetadata,
                watermark,
                sessionInfo: {
                    sessionId: playbackSession.sessionToken,
                    activationId: activation.id,
                    ticketNumber: ticket.ticketNumber,
                    seatNumber: ticket.seatNumber,
                    status: "ACTIVE",
                    theatreName: theatre.name,
                    theatreCode: theatre.code,
                    screenName: screen.name,
                    movieTitle: movie.title,
                    durationMinutes: movie.durationMinutes,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.authorizePlaybackSession = authorizePlaybackSession;
// POST /api/playback/session/start - Mark playback stream active
const startPlaybackStream = async (req, res, next) => {
    try {
        const { playbackToken } = req.body;
        if (!playbackToken) {
            throw new errorHandler_1.AppError("playbackToken is required", 400, "MISSING_TOKEN");
        }
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: playbackToken },
            include: { activation: true },
        });
        if (!session) {
            throw new errorHandler_1.AppError("Playback session not found", 404, "SESSION_NOT_FOUND");
        }
        if (session.status === "TERMINATED" || session.status === "EXPIRED") {
            throw new errorHandler_1.AppError(`Playback session has already been ${session.status.toLowerCase()}`, 403, "SESSION_INACTIVE");
        }
        await database_1.prisma.playbackSession.update({
            where: { sessionToken: playbackToken },
            data: {
                status: "ACTIVE",
                lastHeartbeatAt: new Date(),
            },
        });
        await database_1.prisma.protectionEvent.create({
            data: {
                activationId: session.activationId,
                theatreId: session.theatreId,
                showId: session.showId,
                eventType: "PLAYBACK_STARTED",
                metadata: JSON.stringify({ playbackToken }),
            },
        });
        res.status(200).json({
            success: true,
            message: "Playback session started",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.startPlaybackStream = startPlaybackStream;
// POST /api/playback/session/heartbeat - Heartbeat ping for active playback
const sendPlaybackHeartbeat = async (req, res, next) => {
    try {
        const { playbackToken, activationId } = req.body;
        if (!playbackToken) {
            throw new errorHandler_1.AppError("playbackToken is required", 400, "MISSING_TOKEN");
        }
        const now = new Date();
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: playbackToken },
            include: {
                activation: {
                    include: { ticket: true },
                },
            },
        });
        if (!session || !session.activation) {
            res.status(200).json({
                success: false,
                message: "Playback session terminated",
                data: { active: false, reason: "SESSION_NOT_FOUND" },
            });
            return;
        }
        // Check activation validity
        if (session.activation.status !== "ACTIVE" ||
            session.activation.ticket.status === "CANCELLED" ||
            (session.activation.expiresAt && now > new Date(session.activation.expiresAt))) {
            await database_1.prisma.playbackSession.update({
                where: { sessionToken: playbackToken },
                data: {
                    status: "TERMINATED",
                    terminatedAt: now,
                    terminationReason: "Activation expired or revoked during playback",
                },
            });
            await database_1.prisma.protectionEvent.create({
                data: {
                    activationId: session.activationId,
                    theatreId: session.theatreId,
                    showId: session.showId,
                    eventType: "PLAYBACK_TERMINATED",
                    metadata: JSON.stringify({ reason: "Activation expired or revoked", playbackToken }),
                },
            });
            res.status(200).json({
                success: false,
                message: "Activation expired or revoked. Playback terminated.",
                data: { active: false, reason: "ACTIVATION_REVOKED" },
            });
            return;
        }
        // Check session token expiry
        if (now > new Date(session.expiresAt)) {
            await database_1.prisma.playbackSession.update({
                where: { sessionToken: playbackToken },
                data: {
                    status: "EXPIRED",
                    terminatedAt: now,
                    terminationReason: "Authorization token TTL expired",
                },
            });
            await database_1.prisma.protectionEvent.create({
                data: {
                    activationId: session.activationId,
                    theatreId: session.theatreId,
                    showId: session.showId,
                    eventType: "PLAYBACK_AUTH_EXPIRED",
                    metadata: JSON.stringify({ playbackToken }),
                },
            });
            res.status(200).json({
                success: false,
                message: "Authorization token expired",
                data: { active: false, reason: "TOKEN_EXPIRED" },
            });
            return;
        }
        // Update heartbeat
        await database_1.prisma.playbackSession.update({
            where: { sessionToken: playbackToken },
            data: { lastHeartbeatAt: now },
        });
        res.status(200).json({
            success: true,
            message: "Playback heartbeat verified",
            data: {
                active: true,
                expiresAt: session.expiresAt.toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendPlaybackHeartbeat = sendPlaybackHeartbeat;
// POST /api/playback/session/terminate - Terminate playback session
const terminatePlaybackSession = async (req, res, next) => {
    try {
        const { playbackToken, reason } = req.body;
        if (!playbackToken) {
            throw new errorHandler_1.AppError("playbackToken is required", 400, "MISSING_TOKEN");
        }
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: playbackToken },
        });
        if (session) {
            await database_1.prisma.playbackSession.update({
                where: { sessionToken: playbackToken },
                data: {
                    status: "TERMINATED",
                    terminatedAt: new Date(),
                    terminationReason: reason || "User or staff stopped playback",
                },
            });
            await database_1.prisma.protectionEvent.create({
                data: {
                    activationId: session.activationId,
                    theatreId: session.theatreId,
                    showId: session.showId,
                    eventType: "PLAYBACK_TERMINATED",
                    metadata: JSON.stringify({ reason: reason || "User stopped playback", playbackToken }),
                },
            });
        }
        res.status(200).json({
            success: true,
            message: "Playback session terminated",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.terminatePlaybackSession = terminatePlaybackSession;
// GET /api/playback/sessions - List playback sessions (Admin & Monitoring)
const getPlaybackSessions = async (req, res, next) => {
    try {
        const { status, theatreId, limit } = req.query;
        const sessions = await database_1.prisma.playbackSession.findMany({
            where: {
                status: status ? String(status) : undefined,
                theatreId: theatreId ? String(theatreId) : undefined,
            },
            include: {
                videoAsset: {
                    include: {
                        movie: { select: { title: true, durationMinutes: true } },
                        productionCompany: { select: { name: true, code: true } },
                    },
                },
                theatre: {
                    select: { name: true, code: true, location: true },
                },
                show: {
                    include: { screen: { select: { name: true } } },
                },
                activation: {
                    include: {
                        ticket: { select: { ticketNumber: true, seatNumber: true } },
                    },
                },
            },
            orderBy: { authorizedAt: "desc" },
            take: limit ? Number(limit) : 50,
        });
        res.status(200).json({
            success: true,
            data: sessions,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlaybackSessions = getPlaybackSessions;
// GET /api/playback/stream/:streamKey/master.m3u8 - Serve HLS Master Playlist
const serveHlsMasterManifest = async (req, res, next) => {
    try {
        const { streamKey } = req.params;
        const token = req.query.token || req.headers["x-playback-token"];
        if (!token) {
            res.status(403).send("#EXTM3U\n#ERROR: Missing playback authorization token\n");
            return;
        }
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: token },
            include: {
                activation: true,
                videoAsset: true,
            },
        });
        if (!session || session.status === "TERMINATED" || session.status === "EXPIRED") {
            res.status(403).send("#EXTM3U\n#ERROR: Playback session is not active or has expired\n");
            return;
        }
        const asset = session.videoAsset;
        if (!asset || asset.streamKey !== streamKey) {
            res.status(404).send("#EXTM3U\n#ERROR: Stream asset not found\n");
            return;
        }
        // Check if real processed HLS exists
        if (asset.hlsMasterManifestPath) {
            const manifestFullPath = path_1.default.resolve(process.cwd(), asset.hlsMasterManifestPath);
            if (fs_1.default.existsSync(manifestFullPath)) {
                const rawContent = fs_1.default.readFileSync(manifestFullPath, "utf-8");
                // Append token query parameter to variant playlist URLs
                const rewritten = rawContent.replace(/([a-zA-Z0-9_\-]+\.m3u8)/g, `$1?token=${encodeURIComponent(token)}`);
                res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.status(200).send(rewritten);
                return;
            }
        }
        // Default Fallback Manifest if transcoding is queued or synthetic demo
        const fallbackManifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4800000,RESOLUTION=1920x1080,NAME="1080p Full HD"
variant.m3u8?token=${encodeURIComponent(token)}&res=1080p
#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720,NAME="720p HD"
variant.m3u8?token=${encodeURIComponent(token)}&res=720p
`;
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(200).send(fallbackManifest);
    }
    catch (error) {
        next(error);
    }
};
exports.serveHlsMasterManifest = serveHlsMasterManifest;
// GET /api/playback/stream/:streamKey/:variant.m3u8 - Serve Sub-Variant Playlist
const serveHlsVariantManifest = async (req, res, next) => {
    try {
        const { streamKey, variant } = req.params;
        const token = req.query.token || req.headers["x-playback-token"];
        if (!token) {
            res.status(403).send("#EXTM3U\n#ERROR: Missing playback authorization token\n");
            return;
        }
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: token },
            include: { videoAsset: true },
        });
        if (!session || session.status === "TERMINATED" || session.status === "EXPIRED") {
            res.status(403).send("#EXTM3U\n#ERROR: Playback session expired\n");
            return;
        }
        const asset = session.videoAsset;
        if (asset && asset.hlsMasterManifestPath) {
            const manifestDir = path_1.default.dirname(path_1.default.resolve(process.cwd(), asset.hlsMasterManifestPath));
            const variantFullPath = path_1.default.join(manifestDir, `${variant}.m3u8`);
            if (fs_1.default.existsSync(variantFullPath)) {
                const rawContent = fs_1.default.readFileSync(variantFullPath, "utf-8");
                // Append token query param to segment files
                const rewritten = rawContent.replace(/([a-zA-Z0-9_\-]+\.(?:ts|m4s|mp4))/g, `$1?token=${encodeURIComponent(token)}`);
                res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.status(200).send(rewritten);
                return;
            }
        }
        res.status(404).send("#EXTM3U\n#ERROR: Variant stream not found\n");
    }
    catch (error) {
        next(error);
    }
};
exports.serveHlsVariantManifest = serveHlsVariantManifest;
// GET /api/playback/stream/:streamKey/:segment - Stream TS Media Segment
const serveHlsSegment = async (req, res, next) => {
    try {
        const { streamKey, segment } = req.params;
        const token = req.query.token || req.headers["x-playback-token"];
        if (!token) {
            res.status(403).send("Forbidden: Missing token");
            return;
        }
        const session = await database_1.prisma.playbackSession.findUnique({
            where: { sessionToken: token },
            include: { videoAsset: true },
        });
        if (!session || session.status === "TERMINATED" || session.status === "EXPIRED") {
            res.status(403).send("Forbidden: Playback session is inactive");
            return;
        }
        const asset = session.videoAsset;
        if (asset && asset.hlsMasterManifestPath) {
            const manifestDir = path_1.default.dirname(path_1.default.resolve(process.cwd(), asset.hlsMasterManifestPath));
            const safeSegment = path_1.default.basename(segment);
            const segmentFullPath = path_1.default.join(manifestDir, safeSegment);
            if (fs_1.default.existsSync(segmentFullPath)) {
                res.setHeader("Content-Type", "video/MP2T");
                res.setHeader("Cache-Control", "private, max-age=3600");
                res.setHeader("Access-Control-Allow-Origin", "*");
                const stream = fs_1.default.createReadStream(segmentFullPath);
                stream.pipe(res);
                return;
            }
        }
        res.status(404).send("Segment not found");
    }
    catch (error) {
        next(error);
    }
};
exports.serveHlsSegment = serveHlsSegment;
// GET /api/playback/thumbnail/:streamKey - Serve Generated Poster Thumbnail
const serveAssetThumbnail = async (req, res, next) => {
    try {
        const { streamKey } = req.params;
        const asset = await database_1.prisma.videoAsset.findUnique({
            where: { streamKey },
        });
        if (!asset || !asset.thumbnailPath) {
            res.status(404).send("Thumbnail not found");
            return;
        }
        const thumbFullPath = path_1.default.resolve(process.cwd(), asset.thumbnailPath);
        if (fs_1.default.existsSync(thumbFullPath)) {
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=86400");
            fs_1.default.createReadStream(thumbFullPath).pipe(res);
            return;
        }
        res.status(404).send("Thumbnail image missing");
    }
    catch (error) {
        next(error);
    }
};
exports.serveAssetThumbnail = serveAssetThumbnail;
// GET /api/playback/stats - Telemetry stats for playback sessions
const getPlaybackStats = async (_req, res, next) => {
    try {
        const [activeCount, authorizedCount, expiredCount, terminatedCount, deniedCount] = await Promise.all([
            database_1.prisma.playbackSession.count({ where: { status: "ACTIVE" } }),
            database_1.prisma.playbackSession.count({ where: { status: "AUTHORIZED" } }),
            database_1.prisma.playbackSession.count({ where: { status: "EXPIRED" } }),
            database_1.prisma.playbackSession.count({ where: { status: "TERMINATED" } }),
            database_1.prisma.protectionEvent.count({ where: { eventType: "PLAYBACK_DENIED" } }),
        ]);
        res.status(200).json({
            success: true,
            data: {
                activeStreams: activeCount,
                authorizedStreams: authorizedCount,
                expiredSessions: expiredCount,
                terminatedSessions: terminatedCount,
                deniedAttempts: deniedCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlaybackStats = getPlaybackStats;
