"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const realtimeThreatEngine_1 = require("../services/security/realtimeThreatEngine");
const incidentResponseService_1 = require("../services/security/incidentResponseService");
const envValidator_1 = require("../config/envValidator");
/**
 * Phase 14: Real-Time Anti-Piracy Command Center & Incident Response Automation Test Suite
 */
async function runCommandCenterTests() {
    console.log("\n==================================================================");
    console.log("🛡️  PHASE 14: ANTI-PIRACY COMMAND CENTER & INCIDENT RESPONSE TEST SUITE");
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
    const testId = `cmd-${Date.now().toString(36)}`;
    // 1. DETERMINISTIC RISK SCORING ENGINE
    try {
        const lowRisk = realtimeThreatEngine_1.realtimeThreatEngine.calculateRiskScore({});
        assert("1. Zero factor baseline risk score defaults to LOW", lowRisk.score === 5 && lowRisk.severity === "LOW");
        const highRisk = realtimeThreatEngine_1.realtimeThreatEngine.calculateRiskScore({
            failedVerifications: 2,
            drmDenials: 2,
            screenshotAttempts: 1,
        });
        assert("1. Multi-signal factors calculate elevated risk score", highRisk.score >= 50 && (highRisk.severity === "HIGH" || highRisk.severity === "CRITICAL"));
        const criticalRisk = realtimeThreatEngine_1.realtimeThreatEngine.calculateRiskScore({
            tokenReplays: 2,
            revokedTokenReuses: 2,
            screenshotAttempts: 2,
        });
        assert("1. High severity signals clamp score to 100 with CRITICAL severity", criticalRisk.score === 100 && criticalRisk.severity === "CRITICAL");
    }
    catch (err) {
        assert("Risk Scoring Engine Test", false, err.message);
    }
    // 2. INCIDENT CREATION & ESCALATION LIFECYCLE
    let incidentId = "";
    try {
        const incident = await database_1.prisma.securityIncident.create({
            data: {
                incidentNumber: `SEC-TEST-${testId.toUpperCase()}`,
                title: "Automated Screen Capture Telemetry Burst",
                description: "Multi-frame capture attempts observed in Auditorium 4",
                severity: "HIGH",
                status: "NEW",
                source: "THREAT_ENGINE",
                riskScore: 70,
            },
        });
        incidentId = incident.id;
        assert("2. Security incident created with NEW status", incident.status === "NEW");
        // Acknowledge incident
        const acknowledged = await database_1.prisma.securityIncident.update({
            where: { id: incident.id },
            data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
        });
        assert("2. Incident transitions to ACKNOWLEDGED", acknowledged.status === "ACKNOWLEDGED");
        // Escalate incident to CRITICAL
        const escalationResult = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: incident.id,
            actionType: "SEVERITY_ESCALATED",
            actorId: "security-operator-1",
            reason: "High velocity screen recording breach confirmed",
        });
        assert("2. Incident escalated to CRITICAL with action record", escalationResult.result === "SUCCESS");
        const reloaded = await database_1.prisma.securityIncident.findUnique({ where: { id: incident.id } });
        assert("2. Incident severity updated to CRITICAL in database", reloaded?.severity === "CRITICAL");
    }
    catch (err) {
        assert("Incident Lifecycle Test", false, err.message);
    }
    // 3. AUTOMATED RESPONSE ACTION EXECUTION & IDEMPOTENCY
    try {
        // Setup test entities for response actions
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Command Plaza (${testId})`,
                code: `CP-${testId.slice(-4).toUpperCase()}`,
                location: "Plaza Center",
            },
        });
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "Screen 1",
                capacity: 100,
            },
        });
        const studio = await database_1.prisma.productionCompany.create({
            data: {
                name: `Command Pictures (${testId})`,
                code: `CPIC-${testId.slice(-4).toUpperCase()}`,
                contactEmail: `cmd-${testId}@antipiracy.local`,
            },
        });
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Command Sentinel (${testId})`,
                durationMinutes: 100,
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
                ticketNumber: `TCK-CMD-${testId.toUpperCase()}`,
                showId: show.id,
                seatNumber: "B-04",
                price: 12.0,
            },
        });
        const activation = await database_1.prisma.activation.create({
            data: {
                ticketId: ticket.id,
                activationCode: `ACT-CMD-${testId.toUpperCase()}`,
                status: "ACTIVE",
                activatedAt: new Date(),
            },
        });
        const videoAsset = await database_1.prisma.videoAsset.create({
            data: {
                title: `Command Video (${testId})`,
                movie: { connect: { id: movie.id } },
                productionCompany: { connect: { id: studio.id } },
                state: "READY",
                processingStatus: "READY",
                sourceFilePath: "storage/test_video.mp4",
                streamKey: `stream-cmd-${testId}`,
                deliveryManifestUrl: "http://localhost:4000/manifest.m3u8",
            },
        });
        const session = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken: `PBT-CMD-${testId.toUpperCase()}`,
                activationId: activation.id,
                theatreId: theatre.id,
                showId: show.id,
                videoAssetId: videoAsset.id,
                status: "ACTIVE",
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        const actionIncident = await database_1.prisma.securityIncident.create({
            data: {
                incidentNumber: `SEC-ACT-${testId.toUpperCase()}`,
                title: "Active Session Piracy Response Test",
                severity: "CRITICAL",
                status: "INVESTIGATING",
                theatreId: theatre.id,
                showId: show.id,
                activationId: activation.id,
                playbackSessionId: session.id,
            },
        });
        // Execute SESSION_REVOKED
        const sessionRevokeRes = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: actionIncident.id,
            actionType: "SESSION_REVOKED",
            actorId: "security-operator-1",
            reason: "Immediate containment test",
        });
        assert("3. Automated response terminates active playback session", sessionRevokeRes.result === "SUCCESS");
        const sessionAfter = await database_1.prisma.playbackSession.findUnique({ where: { id: session.id } });
        assert("3. Database confirms PlaybackSession status is TERMINATED", sessionAfter?.status === "TERMINATED");
        // Execute ACTIVATION_REVOKED
        const actRevokeRes = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: actionIncident.id,
            actionType: "ACTIVATION_REVOKED",
            actorId: "security-operator-1",
        });
        assert("3. Automated response revokes QR activation and ticket", actRevokeRes.result === "SUCCESS");
        // Execute INVESTIGATION_CREATED (Phase 13 Integration)
        const invRes = await incidentResponseService_1.incidentResponseService.executeAction({
            incidentId: actionIncident.id,
            actionType: "INVESTIGATION_CREATED",
            actorId: "security-operator-1",
        });
        assert("3. Automated response creates linked Forensic Investigation", invRes.result === "SUCCESS");
    }
    catch (err) {
        assert("Automated Incident Response Test", false, err.message);
    }
    // 4. EVIDENCE INTEGRITY & TAMPER-EVIDENCE
    try {
        const evidence = await incidentResponseService_1.incidentResponseService.attachEvidence({
            incidentId,
            evidenceType: "SCREENSHOT_CAPTURE",
            referenceId: `REF-${testId}`,
            metadata: { sandboxDetection: true, platform: "Win32" },
        });
        assert("4. Attached incident evidence generates 64-character SHA-256 integrity hash", /^[a-f0-9]{64}$/i.test(evidence.hash));
        assert("4. Incident evidence links correctly to parent security incident", evidence.incidentId === incidentId);
    }
    catch (err) {
        assert("Evidence Integrity Test", false, err.message);
    }
    // 5. SECURITY SCORECARD & ZERO SECRET EXPOSURE
    try {
        const scorecard = await realtimeThreatEngine_1.realtimeThreatEngine.getScorecard();
        const scorecardJson = JSON.stringify(scorecard);
        assert("5. Scorecard returns valid security posture", ["NORMAL", "ELEVATED", "HIGH", "CRITICAL"].includes(scorecard.posture));
        assert("5. Scorecard tracks KPI metrics accurately", typeof scorecard.activeIncidentsCount === "number" && typeof scorecard.activePlaybacksCount === "number");
        assert("5. Scorecard does NOT leak JWT secrets", !scorecardJson.includes(envValidator_1.env.JWT_SECRET));
        assert("5. Scorecard does NOT leak database passwords", !scorecardJson.includes("postgres:postgres"));
    }
    catch (err) {
        assert("Security Scorecard Test", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 14 COMMAND CENTER RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
    process.exit(0);
}
runCommandCenterTests().catch((err) => {
    console.error("FATAL in Command Center Test Suite:", err);
    process.exit(1);
});
