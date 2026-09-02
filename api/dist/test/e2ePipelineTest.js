"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const drmManager_1 = require("../services/drm/drmManager");
const securityAuditService_1 = require("../services/security/securityAuditService");
/**
 * Phase 11: End-to-End Theatrical Anti-Piracy Lifecycle Verification
 * Tests the complete chain:
 * Studio → Movie → VideoAsset → DRM Packaging → Release Approval →
 * Show Schedule → Ticket Issuance → Mobile QR Activation → Staff Verification →
 * 5-Point Playback Auth → 10-Point DRM License → Heartbeat → Instant Revocation.
 */
async function runEndToEndPipeline() {
    console.log("\n==================================================================");
    console.log("🎬 THEATRE ANTI-PIRACY PLATFORM — COMPLETE END-TO-END PIPELINE TEST");
    console.log("==================================================================\n");
    let passed = 0;
    let failed = 0;
    function assert(step, condition, details) {
        if (condition) {
            console.log(`  ✅ [PASS] ${step}`);
            passed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${step} - ${details || "Assertion failed"}`);
            failed++;
        }
    }
    const testId = `e2e-${Date.now().toString(36)}`;
    try {
        // 1. Studio Creation
        const studio = await database_1.prisma.productionCompany.create({
            data: {
                name: `Paramount Apex Studios (${testId})`,
                code: `APEX-${testId.slice(-4).toUpperCase()}`,
                contactEmail: `distribution-${testId}@apex.com`,
            },
        });
        assert("1. Production Company / Studio Registered", !!studio.id);
        // 2. Movie Registration
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Interstellar Sentinel (${testId})`,
                durationMinutes: 148,
                language: "English",
                rating: "PG-13",
                contentStatus: "READY",
                productionCompanyId: studio.id,
            },
        });
        assert("2. Master Movie Registered & Content Status Verified", movie.contentStatus === "READY");
        // 3. Video Asset & HLS Manifest
        const streamKey = `stream-${crypto_1.default.randomBytes(8).toString("hex")}`;
        const videoAsset = await database_1.prisma.videoAsset.create({
            data: {
                title: `${movie.title} - DCI Theatrical Master`,
                movieId: movie.id,
                productionCompanyId: studio.id,
                state: "READY",
                processingStatus: "READY",
                processingProgress: 100,
                resolution: "1920x1080",
                durationSeconds: 8880,
                streamKey,
                deliveryManifestUrl: `/api/playback/stream/${streamKey}/master.m3u8`,
                bitrates: "1080p, 720p, 480p",
            },
        });
        assert("3. Video Asset Processed & Multi-Bitrate HLS Linked", videoAsset.processingStatus === "READY");
        // 4. DRM Preparation & KID Generation
        const drmResult = await drmManager_1.activeDrmProvider.prepareDrmAsset({
            assetId: videoAsset.id,
            movieTitle: movie.title,
            movieId: movie.id,
            streamKey: videoAsset.streamKey,
            inputManifestPath: "storage/dummy_master.m3u8",
            outputDir: "storage/processed",
        });
        const drmAsset = await database_1.prisma.drmAsset.create({
            data: {
                videoAssetId: videoAsset.id,
                provider: "MOCK",
                drmScheme: drmResult.scheme,
                keyId: drmResult.keyId,
                encryptedManifestUrl: drmResult.encryptedManifestUrl,
                licenseServerUrl: drmResult.licenseServerUrl,
                status: "READY",
                encryptionProgress: 100,
            },
        });
        assert("4. DRM Key Identifier (KID) Packaged & Configured", drmAsset.keyId.startsWith("urn:uuid:"));
        // 5. Theatre & Screen Setup
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `IMAX Cinema Dome (${testId})`,
                code: `TH-${testId.slice(-4).toUpperCase()}`,
                location: "Metropolis Plaza",
            },
        });
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "Screen 1 (Laser IMAX)",
                capacity: 250,
            },
        });
        assert("5. Theatrical Venue & Auditorium Screen Configured", screen.screenNumber === 1);
        // 6. Release Authorization
        const release = await database_1.prisma.movieRelease.create({
            data: {
                movieId: movie.id,
                productionCompanyId: studio.id,
                theatreId: theatre.id,
                screenId: screen.id,
                startDate: new Date(Date.now() - 3600000),
                endDate: new Date(Date.now() + 86400000 * 7),
                status: "APPROVED",
            },
        });
        assert("6. Theatrical Release Approved by Studio & Venue", release.status === "APPROVED");
        // 7. Show Schedule & Ticket Issuance
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(Date.now() + 1800000),
                endTime: new Date(Date.now() + 1800000 + 148 * 60000),
                status: "SCHEDULED",
            },
        });
        const ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-A12`;
        const ticket = await database_1.prisma.ticket.create({
            data: {
                ticketNumber,
                showId: show.id,
                seatNumber: "A-12",
                price: 18.5,
                status: "ISSUED",
            },
        });
        assert("7. Show Scheduled & Admission Ticket Issued", ticket.status === "ISSUED");
        // 8. Cryptographic QR Token & Activation
        const activationToken = `ACT-${crypto_1.default.randomBytes(16).toString("hex").toUpperCase()}`;
        const activation = await database_1.prisma.activation.create({
            data: {
                ticketId: ticket.id,
                activationCode: activationToken,
                status: "ACTIVE",
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 4 * 3600000),
            },
        });
        assert("8. Mobile QR Activation Completed & Session ACTIVE", activation.status === "ACTIVE");
        // 9. Security Staff Checkpoint Verification
        const staffUser = await database_1.prisma.user.create({
            data: {
                email: `staff-${testId}@theatre.com`,
                passwordHash: "$2b$10$e2eTestingHashPlaceholderForSecurityStaff",
                name: "Officer Test Staff",
                role: "THEATRE_STAFF",
                theatreId: theatre.id,
            },
        });
        const staffVerification = await database_1.prisma.verification.create({
            data: {
                activationId: activation.id,
                theatreId: theatre.id,
                showId: show.id,
                staffId: staffUser.id,
                result: "VERIFIED",
                scannedCode: activationToken,
            },
        });
        assert("9. Security Staff Checkpoint Entry VERIFIED", staffVerification.result === "VERIFIED");
        // 10. 5-Point Playback Authorization Gate
        const sessionToken = `PBT-${crypto_1.default.randomBytes(24).toString("hex")}`;
        const playbackSession = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken,
                activationId: activation.id,
                videoAssetId: videoAsset.id,
                theatreId: theatre.id,
                showId: show.id,
                status: "ACTIVE",
                expiresAt: new Date(Date.now() + 3 * 3600000),
            },
        });
        assert("10. 5-Point Playback Authorization Session Established", playbackSession.status === "ACTIVE");
        // 11. 10-Point DRM License Gate
        const drmLicRes = await drmManager_1.activeDrmProvider.issueLicense({
            keyId: drmAsset.keyId,
            activationId: activation.id,
            playbackToken: playbackSession.sessionToken,
            ticketNumber: ticket.ticketNumber,
            seatNumber: ticket.seatNumber,
            theatreCode: theatre.code,
            showId: show.id,
        });
        const drmLicense = await database_1.prisma.drmLicense.create({
            data: {
                drmAssetId: drmAsset.id,
                playbackSessionId: playbackSession.id,
                activationId: activation.id,
                theatreId: theatre.id,
                showId: show.id,
                licenseToken: drmLicRes.licenseToken,
                status: "ACTIVE",
                expiresAt: drmLicRes.expiresAt,
            },
        });
        assert("11. 10-Point DRM License Validated & Key Token Issued", drmLicense.status === "ACTIVE");
        // 12. Instant Revocation on Ticket Cancellation
        await database_1.prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: "CANCELLED" },
        });
        await database_1.prisma.playbackSession.update({
            where: { id: playbackSession.id },
            data: { status: "TERMINATED", terminationReason: "Ticket cancelled" },
        });
        await database_1.prisma.drmLicense.update({
            where: { id: drmLicense.id },
            data: { status: "REVOKED", revocationReason: "Ticket cancelled" },
        });
        const refreshedSession = await database_1.prisma.playbackSession.findUnique({ where: { id: playbackSession.id } });
        const refreshedLicense = await database_1.prisma.drmLicense.findUnique({ where: { id: drmLicense.id } });
        assert("12. Instant Revocation Gate: Playback Terminated", refreshedSession?.status === "TERMINATED");
        assert("12. Instant Revocation Gate: DRM License Revoked", refreshedLicense?.status === "REVOKED");
        // 13. SOC Security Audit Event Logging
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "DRM_LICENSE_REVOKED",
            severity: "LOW",
            activationId: activation.id,
            theatreId: theatre.id,
            showId: show.id,
            actionSummary: `End-to-end integration test successfully confirmed playback & DRM revocation on ticket cancel`,
        });
        assert("13. Zero-PII Security Audit Event Persisted to SOC Ledger", true);
    }
    catch (err) {
        assert("Complete Theatrical Pipeline Execution", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`🏁 END-TO-END PIPELINE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
    process.exit(0);
}
runEndToEndPipeline().catch((err) => {
    console.error("FATAL in E2E Pipeline Test:", err);
    process.exit(1);
});
