"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const realtimeEventBus_1 = require("../services/realtime/realtimeEventBus");
const eventCorrelationEngine_1 = require("../services/realtime/eventCorrelationEngine");
const riskEscalationEngine_1 = require("../services/realtime/riskEscalationEngine");
const realtimeManager_1 = require("../services/realtime/realtimeManager");
const database_1 = require("@antipiracy/database");
async function runRealtimeSecurityTests() {
    console.log("\n==================================================================");
    console.log("⚡ PHASE 16: REAL-TIME ANTI-PIRACY & AUTOMATED SOC TEST SUITE");
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
    // Create prerequisite test entities
    const testCompany = await database_1.prisma.productionCompany.create({
        data: {
            name: "Realtime Studios",
            code: `RT-STUDIO-${Date.now()}`,
            contactEmail: "contact@realtimestudios.com",
        },
    });
    const testTheatre = await database_1.prisma.theatre.create({
        data: {
            name: "Realtime Test Cinema",
            code: `RT-THTR-${Date.now()}`,
            location: "Metropolis",
        },
    });
    const testScreen = await database_1.prisma.screen.create({
        data: {
            theatreId: testTheatre.id,
            screenNumber: 1,
            name: "Screen 1",
            capacity: 100,
        },
    });
    const testMovie = await database_1.prisma.movie.create({
        data: {
            title: "Realtime Security Feature",
            durationMinutes: 100,
            language: "English",
            productionCompanyId: testCompany.id,
        },
    });
    const testVideoAsset = await database_1.prisma.videoAsset.create({
        data: {
            title: "Main Video Master",
            movie: { connect: { id: testMovie.id } },
            productionCompany: { connect: { id: testCompany.id } },
            streamKey: `stream_key_${Date.now()}`,
            deliveryManifestUrl: "/manifests/hls/master.m3u8",
            originalFilename: "feature.mp4",
            sourceFilePath: "/storage/feature.mp4",
            fileSizeMb: 500,
            mimeType: "video/mp4",
            resolution: "1080p",
            durationSeconds: 6000,
        },
    });
    const testShow = await database_1.prisma.show.create({
        data: {
            theatreId: testTheatre.id,
            screenId: testScreen.id,
            movieId: testMovie.id,
            startTime: new Date(),
            endTime: new Date(Date.now() + 7200000),
        },
    });
    const testTicket = await database_1.prisma.ticket.create({
        data: {
            showId: testShow.id,
            ticketNumber: `TKT-RT-${Date.now()}`,
            seatNumber: "A-1",
            price: 15.0,
            status: "ISSUED",
        },
    });
    const testActivation = await database_1.prisma.activation.create({
        data: {
            ticketId: testTicket.id,
            activationCode: `ACT-RT-${Date.now()}`,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 7200000),
        },
    });
    // 1. EVENT INGESTION & SANITIZATION (ZERO SECRET LEAKAGE)
    try {
        const rawPayload = {
            eventType: "DRM_LICENSE_DENIED",
            source: "DRM_KEY_SERVER",
            severity: "HIGH",
            theatreId: testTheatre.id,
            metadata: {
                clientIp: "192.168.1.100",
                password: "super_secret_password",
                jwtSecret: "leaked_jwt_secret_token",
                masterKey: "0123456789abcdef0123456789abcdef",
                safeParam: "fairplay_v1",
            },
        };
        const ingested = await realtimeEventBus_1.realtimeEventBus.publish(rawPayload);
        assert("1. Event ingested with generated eventId and correlationId", !!ingested.eventId && !!ingested.correlationId);
        assert("1. Sanitization: password redacted", ingested.metadata.password === "[REDACTED]");
        assert("1. Sanitization: jwtSecret redacted", ingested.metadata.jwtSecret === "[REDACTED]");
        assert("1. Sanitization: masterKey redacted", ingested.metadata.masterKey === "[REDACTED]");
        assert("1. Non-sensitive metadata preserved intact", ingested.metadata.safeParam === "fairplay_v1");
    }
    catch (err) {
        assert("Event ingestion tests", false, err.message);
    }
    // 2. REAL-TIME THREAT CORRELATION ENGINE
    try {
        eventCorrelationEngine_1.eventCorrelationEngine.clearWindow();
        const corrId = `corr_test_${Date.now()}`;
        const venueId = testTheatre.id;
        // Ingest correlated signals: DRM Denial + Playback Terminated + Screenshot attempt
        eventCorrelationEngine_1.eventCorrelationEngine.addEvent({
            eventId: "e1",
            correlationId: corrId,
            eventType: "DRM_LICENSE_DENIED",
            source: "DRM",
            severity: "HIGH",
            theatreId: venueId,
            metadata: {},
            timestamp: new Date().toISOString(),
        });
        eventCorrelationEngine_1.eventCorrelationEngine.addEvent({
            eventId: "e2",
            correlationId: corrId,
            eventType: "PLAYBACK_TERMINATED",
            source: "STREAM",
            severity: "HIGH",
            theatreId: venueId,
            metadata: {},
            timestamp: new Date().toISOString(),
        });
        eventCorrelationEngine_1.eventCorrelationEngine.addEvent({
            eventId: "e3",
            correlationId: corrId,
            eventType: "SCREENSHOT_ATTEMPT_DETECTED",
            source: "CLIENT_AGENT",
            severity: "CRITICAL",
            theatreId: venueId,
            metadata: {},
            timestamp: new Date().toISOString(),
        });
        const clusters = eventCorrelationEngine_1.eventCorrelationEngine.correlateThreats();
        assert("2. Correlator identifies PLAYBACK_PIRACY_ACTIVITY cluster", clusters.some((c) => c.clusterType === "PLAYBACK_PIRACY_ACTIVITY"));
        const piracyCluster = clusters.find((c) => c.clusterType === "PLAYBACK_PIRACY_ACTIVITY");
        assert("2. Cluster assigned CRITICAL severity with high confidence (>=90%)", piracyCluster?.severity === "CRITICAL" && (piracyCluster?.confidence ?? 0) >= 90);
        assert("2. Cluster aggregates all 3 contributing events", piracyCluster?.events.length === 3);
    }
    catch (err) {
        assert("Correlation engine tests", false, err.message);
    }
    // 3. DYNAMIC RISK ESCALATION & DECAY
    try {
        riskEscalationEngine_1.riskEscalationEngine.resetScores();
        const initialOverall = riskEscalationEngine_1.riskEscalationEngine.getEntityRisk("OVERALL", "GLOBAL");
        assert("3. Initial risk score starts at 0 (LOW)", initialOverall.currentScore === 0 && initialOverall.riskLevel === "LOW");
        // Escalate with CRITICAL event (+50)
        await riskEscalationEngine_1.riskEscalationEngine.escalateRisk({
            eventId: "ev_crit",
            correlationId: "corr_crit",
            eventType: "FORENSIC_WATERMARK_MATCH",
            source: "WATERMARK_SERVER",
            severity: "CRITICAL",
            theatreId: testTheatre.id,
            metadata: {},
            timestamp: new Date().toISOString(),
        });
        const escalated = riskEscalationEngine_1.riskEscalationEngine.getEntityRisk("THEATRE", testTheatre.id);
        assert("3. Risk score increases dynamically upon threat signal", escalated.currentScore >= 50);
        assert("3. Classification level moves to ELEVATED / HIGH", escalated.riskLevel === "ELEVATED" || escalated.riskLevel === "HIGH");
        // Apply decay
        const decayed = riskEscalationEngine_1.riskEscalationEngine.applyDecay(15, 0); // Force immediate decay
        const postDecay = riskEscalationEngine_1.riskEscalationEngine.getEntityRisk("THEATRE", testTheatre.id);
        assert("3. Risk score decays when suspicious activity stops", postDecay.currentScore < escalated.currentScore);
    }
    catch (err) {
        assert("Risk escalation tests", false, err.message);
    }
    // 4. INCIDENT AUTOMATION & RESPONSE ACTIONS
    try {
        const testSession = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken: `sess_test_${Date.now()}`,
                status: "ACTIVE",
                activation: { connect: { id: testActivation.id } },
                videoAsset: { connect: { id: testVideoAsset.id } },
                theatre: { connect: { id: testTheatre.id } },
                show: { connect: { id: testShow.id } },
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        const responseAction = await database_1.prisma.automatedResponse.create({
            data: {
                actionType: "REVOKE_PLAYBACK_SESSION",
                status: "RECOMMENDED",
                targetId: testSession.id,
                reason: "Real-time threat threshold breached",
                correlationId: "corr_auto_123",
            },
        });
        assert("4. Creates RECOMMENDED automated response action", responseAction.status === "RECOMMENDED");
        // Approve Action
        const approved = await realtimeManager_1.realtimeManager.approveAction(responseAction.id, {
            id: "admin-1",
            email: "soc-admin@theatre.com",
            role: "ADMIN",
        });
        assert("4. Admin approval transitions status to EXECUTED", approved.status === "EXECUTED");
        const updatedSession = await database_1.prisma.playbackSession.findUnique({
            where: { id: testSession.id },
        });
        assert("4. Target playback session terminated atomically", updatedSession?.status === "TERMINATED");
        // Reject Action
        const rejectTarget = await database_1.prisma.automatedResponse.create({
            data: {
                actionType: "REVOKE_DRM_LICENSE",
                status: "RECOMMENDED",
                reason: "Test rejection workflow",
            },
        });
        const rejected = await realtimeManager_1.realtimeManager.rejectAction(rejectTarget.id, {
            id: "admin-1",
            email: "soc-admin@theatre.com",
            role: "ADMIN",
        }, "False alarm - benign network spike");
        assert("4. Admin rejection transitions status to REJECTED with notes", Boolean(rejected.status === "REJECTED" && rejected.result?.includes("False alarm")));
    }
    catch (err) {
        assert("Response action tests", false, err.message);
    }
    // 5. RBAC STREAM ISOLATION & ZERO SECRET EXPOSURE
    try {
        let adminReceived = false;
        let foreignStudioReceived = false;
        const mockAdminRes = {
            write: (data) => {
                if (data.includes("THEATRE_SPIKE"))
                    adminReceived = true;
            },
        };
        const mockStudioRes = {
            write: (data) => {
                if (data.includes("THEATRE_SPIKE"))
                    foreignStudioReceived = true;
            },
        };
        realtimeManager_1.realtimeManager.addClient("admin_client", mockAdminRes, { role: "ADMIN" });
        realtimeManager_1.realtimeManager.addClient("studio_client", mockStudioRes, { role: "PRODUCTION_COMPANY", productionCompanyId: "comp_123" });
        // Broadcast event for a DIFFERENT movie
        realtimeManager_1.realtimeManager.broadcastEvent({
            eventId: "e_scoped",
            correlationId: "c_scoped",
            eventType: "SUSPICIOUS_ACTIVITY",
            source: "THEATRE_SPIKE",
            severity: "HIGH",
            movieId: "other_movie_999", // not authorized for comp_123
            metadata: {},
            timestamp: new Date().toISOString(),
        });
        assert("5. ADMIN receives global real-time event", Boolean(adminReceived));
        assert("5. PRODUCTION_COMPANY strictly blocked from non-owned movie intelligence", !foreignStudioReceived);
        realtimeManager_1.realtimeManager.removeClient("admin_client");
        realtimeManager_1.realtimeManager.removeClient("studio_client");
    }
    catch (err) {
        assert("RBAC stream tests", false, err.message);
    }
    // Cleanup
    try {
        await database_1.prisma.realtimeIncidentNotification.deleteMany();
        await database_1.prisma.automatedResponse.deleteMany();
        await database_1.prisma.riskHistory.deleteMany();
        await database_1.prisma.realtimeThreatEvent.deleteMany();
        await database_1.prisma.playbackSession.deleteMany({ where: { theatreId: testTheatre.id } });
        await database_1.prisma.activation.deleteMany({ where: { ticketId: testTicket.id } });
        await database_1.prisma.ticket.deleteMany({ where: { showId: testShow.id } });
        await database_1.prisma.show.deleteMany({ where: { theatreId: testTheatre.id } });
        await database_1.prisma.videoAsset.deleteMany({ where: { movieId: testMovie.id } });
        await database_1.prisma.screen.deleteMany({ where: { theatreId: testTheatre.id } });
        await database_1.prisma.movie.delete({ where: { id: testMovie.id } });
        await database_1.prisma.theatre.delete({ where: { id: testTheatre.id } });
        await database_1.prisma.productionCompany.delete({ where: { id: testCompany.id } });
    }
    catch (_) { }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 16 REALTIME RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0)
        process.exit(1);
    else
        process.exit(0);
}
runRealtimeSecurityTests().catch((err) => {
    console.error("Test runner failed:", err);
    process.exit(1);
});
