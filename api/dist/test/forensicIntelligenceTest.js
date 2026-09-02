"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const watermarkService_1 = require("../services/forensics/watermarkService");
const threatIntelligenceEngine_1 = require("../services/forensics/threatIntelligenceEngine");
const securityAuditService_1 = require("../services/security/securityAuditService");
const envValidator_1 = require("../config/envValidator");
/**
 * Phase 13: Advanced Anti-Piracy Intelligence & Forensic Investigation Automated Test Suite
 */
async function runForensicIntelligenceTests() {
    console.log("\n==================================================================");
    console.log("🔍 PHASE 13: FORENSIC WATERMARKING & THREAT INTELLIGENCE TEST SUITE");
    console.log("==================================================================\n");
    let passed = 0;
    let failed = 0;
    function assert(testName, condition, details) {
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
            failed++;
        }
    }
    const testId = `fsc-${Date.now().toString(36)}`;
    // 1. ZERO-PII FORENSIC WATERMARK PAYLOAD & FINGERPRINT
    try {
        const payload = watermarkService_1.watermarkService.generateForensicPayload({
            activationId: `act-${testId}`,
            playbackSessionId: `pbt-${testId}`,
            theatreCode: "TH-IMAX",
            screenNumber: 2,
            seatNumber: "H-18",
            showId: `show-${testId}`,
            movieId: `mov-${testId}`,
        });
        const payloadStr = JSON.stringify(payload);
        assert("1. Watermark payload generates valid SHA-256 fingerprint", /^[a-f0-9]{64}$/i.test(payload.fingerprintHash));
        assert("1. Watermark payload does NOT contain user email or name", !payloadStr.includes("@") && !payloadStr.includes("John Doe"));
        assert("1. Watermark payload does NOT contain cryptographic secrets", !payloadStr.includes(envValidator_1.env.JWT_SECRET) && !payloadStr.includes("postgres:postgres"));
        const visualWatermark = watermarkService_1.watermarkService.formatVisualWatermark(payload);
        assert("1. Formatted visual watermark includes auditorium and seat identifier", visualWatermark.includes("TH-IMAX") && visualWatermark.includes("H-18"));
    }
    catch (err) {
        assert("Forensic Watermark Generation Test", false, err.message);
    }
    // 2. WATERMARK REVERSE LOOKUP & SESSION TRACE
    try {
        // Setup test database entities
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Forensic Cinema (${testId})`,
                code: `FC-${testId.slice(-4).toUpperCase()}`,
                location: "Forensic Plaza",
            },
        });
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 3,
                name: "Screen 3",
                capacity: 150,
            },
        });
        const studio = await database_1.prisma.productionCompany.create({
            data: {
                name: `Sentinel Studios (${testId})`,
                code: `SS-${testId.slice(-4).toUpperCase()}`,
                contactEmail: `studio-${testId}@antipiracy.local`,
            },
        });
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Forensic Sentinel (${testId})`,
                durationMinutes: 120,
                language: "English",
                productionCompany: { connect: { id: studio.id } },
            },
        });
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(),
                endTime: new Date(Date.now() + 7200000),
            },
        });
        const ticket = await database_1.prisma.ticket.create({
            data: {
                ticketNumber: `TCK-FSC-${testId.toUpperCase()}`,
                showId: show.id,
                seatNumber: "G-14",
                price: 15.0,
            },
        });
        const activation = await database_1.prisma.activation.create({
            data: {
                ticketId: ticket.id,
                activationCode: `ACT-FSC-${testId.toUpperCase()}`,
                status: "ACTIVE",
                activatedAt: new Date(),
            },
        });
        const videoAsset = await database_1.prisma.videoAsset.create({
            data: {
                title: `Forensic Sentinel Video (${testId})`,
                movie: { connect: { id: movie.id } },
                productionCompany: { connect: { id: studio.id } },
                state: "READY",
                processingStatus: "READY",
                sourceFilePath: "storage/test_video.mp4",
                streamKey: `stream-${testId}`,
                deliveryManifestUrl: "http://localhost:4000/manifest.m3u8",
            },
        });
        const session = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken: `PBT-FSC-${testId.toUpperCase()}`,
                activationId: activation.id,
                theatreId: theatre.id,
                showId: show.id,
                videoAssetId: videoAsset.id,
                status: "ACTIVE",
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        const lookupRes = await watermarkService_1.watermarkService.lookupWatermark(session.id);
        assert("2. Reverse watermark lookup locates screening session", lookupRes.found);
        assert("2. Reverse lookup resolves exact auditorium seat", lookupRes.ticket?.seatNumber === "G-14");
        assert("2. Reverse lookup resolves theatrical venue", lookupRes.theatre?.code === theatre.code);
        assert("2. Reverse lookup resolves movie title", lookupRes.movie?.title === movie.title);
    }
    catch (err) {
        assert("Watermark Reverse Lookup Test", false, err.message);
    }
    // 3. THREAT INTELLIGENCE SCORING ENGINE
    try {
        const threatSummary = await threatIntelligenceEngine_1.threatIntelligenceEngine.getThreatIntelligenceSummary();
        assert("3. Threat intelligence summary returns valid threat level", ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(threatSummary.overallThreatLevel));
        assert("3. Threat intelligence tracks active high risk entities", typeof threatSummary.activeHighRiskEntitiesCount === "number");
        assert("3. Threat intelligence calculates top triggered rules", Array.isArray(threatSummary.topTriggeredRules) && threatSummary.topTriggeredRules.length > 0);
    }
    catch (err) {
        assert("Threat Intelligence Summary Test", false, err.message);
    }
    // 4. PIRACY INCIDENT LIFECYCLE & EVIDENCE ATTACHMENT
    let createdIncidentId = "";
    try {
        const incident = await database_1.prisma.piracyIncident.create({
            data: {
                incidentNumber: `INC-TEST-${testId.toUpperCase()}`,
                title: "Test Cam Capture in Auditorium 3",
                description: "Watermark detected in leaked social media snippet",
                severity: "HIGH",
                status: "DETECTED",
                riskScore: 85,
            },
        });
        createdIncidentId = incident.id;
        assert("4. Piracy incident created with DETECTED status", incident.status === "DETECTED");
        // Attach forensic evidence with cryptographic SHA-256 hash
        const canonical = `${incident.id}|WATERMARK_CAPTURE|TH01-SCR3-SEAT_G14|${Date.now()}`;
        const evidenceHash = crypto_1.default.createHash("sha256").update(canonical).digest("hex");
        const evidence = await database_1.prisma.forensicEvidence.create({
            data: {
                incidentId: incident.id,
                evidenceType: "WATERMARK_CAPTURE",
                watermarkFingerprint: "AGY-V13:TH01-S3-G14-ACT1234-PBT5678",
                seatNumber: "G-14",
                confidenceScore: 95,
                evidenceHash,
            },
        });
        assert("4. Forensic evidence attached with 64-char SHA-256 hash", /^[a-f0-9]{64}$/i.test(evidence.evidenceHash));
        // Status transitions
        const updated = await database_1.prisma.piracyIncident.update({
            where: { id: incident.id },
            data: { status: "INVESTIGATING" },
        });
        assert("4. Incident status successfully transitions to INVESTIGATING", updated.status === "INVESTIGATING");
        const confirmed = await database_1.prisma.piracyIncident.update({
            where: { id: incident.id },
            data: { status: "CONFIRMED", mitigationAction: "Playback session revoked" },
        });
        assert("4. Incident status successfully transitions to CONFIRMED with mitigation action", confirmed.status === "CONFIRMED");
    }
    catch (err) {
        assert("Incident Lifecycle & Evidence Test", false, err.message);
    }
    // 5. SECURITY AUDIT LEDGER FOR FORENSIC OPERATIONS
    try {
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "SUSPICIOUS_ACTIVITY",
            severity: "CRITICAL",
            actionSummary: `Forensic test confirmed watermark identification for session ${testId}`,
            isThreat: true,
            threatDetails: "Confidence score: 95%, Watermark: AGY-V13",
        });
        assert("5. Security audit ledger logs forensic threat containment event", true);
    }
    catch (err) {
        assert("Forensic Audit Logging Test", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 13 FORENSIC INTELLIGENCE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
    process.exit(0);
}
runForensicIntelligenceTests().catch((err) => {
    console.error("FATAL in Forensic Intelligence Test Suite:", err);
    process.exit(1);
});
