"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@antipiracy/database");
const piracyOrchestrationService_1 = require("../services/piracyOrchestrationService");
const enforcementService_1 = require("../services/enforcement/enforcementService");
const studioIntelligenceService_1 = require("../services/intelligence/studioIntelligenceService");
async function runPiracyOrchestrationTests() {
    console.log("\n==================================================================");
    console.log("🛡️ PHASE 29: END-TO-END PIRACY RESPONSE ORCHESTRATION TEST SUITE");
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
    // Clear in-memory enforcement store
    enforcementService_1.EnforcementService.resetStore();
    const timestamp = Date.now();
    // 1. Setup Test Fixtures: Production Studio, Theatres, Screens, Movie, Shows, Tickets, Activations
    console.log("--- Setting up test fixtures ---");
    const studio = await database_1.prisma.productionCompany.create({
        data: {
            name: `Warner & Universal Studios ${timestamp}`,
            code: `STU-${timestamp.toString().slice(-4)}`,
            contactEmail: `studio_${timestamp}@universal.com`,
        },
    });
    const theatreA = await database_1.prisma.theatre.create({
        data: {
            name: `IMAX Regal Cinema A ${timestamp}`,
            code: `THTR-A-${timestamp.toString().slice(-4)}`,
            location: "San Francisco, CA",
        },
    });
    const theatreB = await database_1.prisma.theatre.create({
        data: {
            name: `AMC Metreon Cinema B ${timestamp}`,
            code: `THTR-B-${timestamp.toString().slice(-4)}`,
            location: "New York, NY",
        },
    });
    const screenA = await database_1.prisma.screen.create({
        data: {
            name: "Screen 1 - Dolby Cinema",
            screenNumber: 1,
            theatreId: theatreA.id,
            capacity: 300,
        },
    });
    const screenB = await database_1.prisma.screen.create({
        data: {
            name: "Screen 1 - Laser IMAX",
            screenNumber: 1,
            theatreId: theatreB.id,
            capacity: 250,
        },
    });
    const movie = await database_1.prisma.movie.create({
        data: {
            title: `Interstellar Odyssey: Part III ${timestamp}`,
            durationMinutes: 165,
            language: "English",
            rating: "PG-13",
            productionCompanyId: studio.id,
        },
    });
    const showA = await database_1.prisma.show.create({
        data: {
            movieId: movie.id,
            theatreId: theatreA.id,
            screenId: screenA.id,
            startTime: new Date(Date.now() - 30 * 60000), // Started 30 mins ago
            endTime: new Date(Date.now() + 135 * 60000),
            status: "ACTIVE",
        },
    });
    const showB = await database_1.prisma.show.create({
        data: {
            movieId: movie.id,
            theatreId: theatreB.id,
            screenId: screenB.id,
            startTime: new Date(Date.now() - 20 * 60000),
            endTime: new Date(Date.now() + 145 * 60000),
            status: "ACTIVE",
        },
    });
    // Ticket & Activation for Session 1 (Normal Session)
    const ticket1 = await database_1.prisma.ticket.create({
        data: {
            showId: showA.id,
            ticketNumber: `TCK-NRM-${timestamp.toString().slice(-6)}`,
            seatNumber: "H-12",
            price: 20.0,
            status: "ACTIVATED",
        },
    });
    const activation1 = await database_1.prisma.activation.create({
        data: {
            ticketId: ticket1.id,
            activationCode: `ACT-NRM-${crypto_1.default.randomBytes(12).toString("hex")}`,
            status: "ACTIVE",
            activatedAt: new Date(),
        },
    });
    // Ticket & Activation for Session 2 (Weak Signal Session)
    const ticket2 = await database_1.prisma.ticket.create({
        data: {
            showId: showA.id,
            ticketNumber: `TCK-WEAK-${timestamp.toString().slice(-6)}`,
            seatNumber: "G-15",
            price: 20.0,
            status: "ACTIVATED",
        },
    });
    const activation2 = await database_1.prisma.activation.create({
        data: {
            ticketId: ticket2.id,
            activationCode: `ACT-WEAK-${crypto_1.default.randomBytes(12).toString("hex")}`,
            status: "ACTIVE",
            activatedAt: new Date(),
        },
    });
    // Ticket & Activation for Session 3 (High-Risk Piracy Session)
    const ticket3 = await database_1.prisma.ticket.create({
        data: {
            showId: showA.id,
            ticketNumber: `TCK-PIR-${timestamp.toString().slice(-6)}`,
            seatNumber: "D-08",
            price: 20.0,
            status: "ACTIVATED",
        },
    });
    const activation3 = await database_1.prisma.activation.create({
        data: {
            ticketId: ticket3.id,
            activationCode: `ACT-PIR-${crypto_1.default.randomBytes(12).toString("hex")}`,
            status: "ACTIVE",
            activatedAt: new Date(),
        },
    });
    // Ticket & Activation for Session 4 (Theatre B Session for isolation tests)
    const ticket4 = await database_1.prisma.ticket.create({
        data: {
            showId: showB.id,
            ticketNumber: `TCK-THB-${timestamp.toString().slice(-6)}`,
            seatNumber: "K-22",
            price: 20.0,
            status: "ACTIVATED",
        },
    });
    const activation4 = await database_1.prisma.activation.create({
        data: {
            ticketId: ticket4.id,
            activationCode: `ACT-THB-${crypto_1.default.randomBytes(12).toString("hex")}`,
            status: "ACTIVE",
            activatedAt: new Date(),
        },
    });
    // Users
    const adminUser = await database_1.prisma.user.create({
        data: {
            email: `admin_orch_${timestamp}@theatre.com`,
            passwordHash: "hash",
            name: "Global Security Officer",
            role: "ADMIN",
        },
    });
    const staffTheatreA = await database_1.prisma.user.create({
        data: {
            email: `staff_a_${timestamp}@theatre.com`,
            passwordHash: "hash",
            name: "Auditorium Usher A",
            role: "THEATRE_STAFF",
            theatreId: theatreA.id,
        },
    });
    const staffTheatreB = await database_1.prisma.user.create({
        data: {
            email: `staff_b_${timestamp}@theatre.com`,
            passwordHash: "hash",
            name: "Auditorium Usher B",
            role: "THEATRE_STAFF",
            theatreId: theatreB.id,
        },
    });
    try {
        // =========================================================================
        // 1. Normal Session = No False Escalation
        // =========================================================================
        console.log("\n--- 1. Normal Session (No False Escalation) ---");
        const normalResult = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: activation1.id,
            signals: [
                { signalType: "SESSION_HEARTBEAT", severity: "INFO" },
                { signalType: "SESSION_HEARTBEAT", severity: "INFO" },
            ],
            theatreId: theatreA.id,
            actorId: adminUser.id,
            actorEmail: adminUser.email,
            actorRole: "ADMIN",
        });
        assert("1.1 Normal session status is NOMINAL", normalResult.status === "NOMINAL");
        assert("1.2 Normal session is NOT escalated", normalResult.escalated === false);
        assert("1.3 Normal session risk score is low (<= 25)", normalResult.riskScore <= 25);
        assert("1.4 No SOC incident created for normal session", normalResult.pipelineStages.soc === null);
        assert("1.5 No evidence package created for normal session", normalResult.pipelineStages.evidence === null);
        assert("1.6 No investigation case created for normal session", normalResult.pipelineStages.investigationCase === null);
        assert("1.7 No enforcement draft created for normal session", normalResult.pipelineStages.enforcement === null);
        // =========================================================================
        // 2. Weak Single Signal = No False Punitive Action
        // =========================================================================
        console.log("\n--- 2. Weak Single Signal (Warning Only, No Punitive Action) ---");
        const weakResult = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: activation2.id,
            signals: [
                { signalType: "FULLSCREEN_EXIT", severity: "LOW", metadata: { reason: "notification_drawer_opened" } },
            ],
            theatreId: theatreA.id,
            actorId: adminUser.id,
            actorEmail: adminUser.email,
            actorRole: "ADMIN",
        });
        assert("2.1 Weak single signal results in WARNING status", weakResult.status === "WARNING");
        assert("2.2 Weak single signal is NOT escalated to SOC", weakResult.escalated === false);
        assert("2.3 User warning message is issued", typeof weakResult.pipelineStages.detection.warningMessage === "string");
        assert("2.4 Escalation decision is USER_WARNING_ONLY", weakResult.pipelineStages.detection.escalationDecision === "USER_WARNING_ONLY");
        assert("2.5 No SOC incident created for weak signal", weakResult.pipelineStages.soc === null);
        assert("2.6 No investigation case created for weak signal", weakResult.pipelineStages.investigationCase === null);
        assert("2.7 No enforcement action created for weak signal", weakResult.pipelineStages.enforcement === null);
        // =========================================================================
        // 3. Repeated & High-Risk Signals = SOC Incident Creation
        // =========================================================================
        console.log("\n--- 3. High-Risk Piracy Signal (SOC Incident Creation) ---");
        const customCorrelationId = `CORR-ORCH-E2E-${Date.now()}`;
        const highRiskResult = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: activation3.id,
            signals: [
                {
                    signalType: "SCREEN_CAPTURE_SIGNAL",
                    severity: "HIGH",
                    payload: { keyCombo: "Command+Shift+5 / Win+Alt+R", captureFrameRate: 60 },
                },
                {
                    signalType: "CAMERA_ACTIVITY",
                    severity: "HIGH",
                    payload: { cameraState: "ACTIVE_RECORDING", opticalOcclusionRatio: 0.15 },
                },
            ],
            theatreId: theatreA.id,
            correlationId: customCorrelationId,
            actorId: adminUser.id,
            actorEmail: adminUser.email,
            actorRole: "ADMIN",
        });
        assert("3.1 High-risk signals result in ESCALATED status", highRiskResult.status === "ESCALATED");
        assert("3.2 High-risk signals mark escalated=true", highRiskResult.escalated === true);
        assert("3.3 High-risk composite risk score is elevated (>= 75)", highRiskResult.riskScore >= 75);
        assert("3.4 SOC Incident created successfully", highRiskResult.pipelineStages.soc !== null);
        assert("3.5 SOC Incident number assigned", Boolean(highRiskResult.pipelineStages.soc?.incidentNumber));
        assert("3.6 SOC Incident severity is HIGH or CRITICAL", highRiskResult.pipelineStages.soc?.severity === "HIGH" || highRiskResult.pipelineStages.soc?.severity === "CRITICAL");
        // =========================================================================
        // 4. Evidence & Session Watermark Attribution Integration
        // =========================================================================
        console.log("\n--- 4. Forensic Evidence & Watermark Linking ---");
        const evidenceStage = highRiskResult.pipelineStages.evidence;
        assert("4.1 Forensic Evidence package created", evidenceStage !== null);
        assert("4.2 Evidence package number generated (EV-AUTO-*)", evidenceStage?.evidenceNumber?.startsWith("EV-AUTO-") === true);
        assert("4.3 SHA-256 cryptographic integrity hash calculated", Boolean(evidenceStage?.sha256Hash && evidenceStage.sha256Hash.length === 64));
        assert("4.4 Evidence verified status is true", evidenceStage?.isVerified === true);
        assert("4.5 Watermark reference generated and linked", Boolean(evidenceStage?.watermark?.watermarkId));
        assert("4.6 Watermark display string present", Boolean(evidenceStage?.watermark?.displayString));
        // Verify evidence record in database
        const dbEvidence = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: evidenceStage.evidenceId },
        });
        assert("4.7 Evidence Record persisted in Database with status VERIFIED", dbEvidence?.status === "VERIFIED");
        assert("4.8 Evidence Record linked to Theatre, Show, and Movie", dbEvidence?.theatreId === theatreA.id && dbEvidence?.movieId === movie.id);
        // =========================================================================
        // 5. Investigation Case Linking & Deduplication
        // =========================================================================
        console.log("\n--- 5. Investigation Case Integration & Timeline Tracking ---");
        const caseStage = highRiskResult.pipelineStages.investigationCase;
        assert("5.1 Investigation Case created", caseStage !== null);
        assert("5.2 Case number format is valid (CASE-YYYY-XXXX)", caseStage?.caseNumber?.startsWith("CASE-") === true);
        assert("5.3 Initial case status is INVESTIGATING or OPEN", caseStage?.status === "INVESTIGATING" || caseStage?.status === "OPEN");
        const dbCase = await database_1.prisma.investigationCase.findUnique({
            where: { id: caseStage.caseId },
            include: {
                timelineEvents: true,
                evidenceLinks: true,
            },
        });
        assert("5.4 Evidence package linked to Investigation Case", dbCase?.evidenceLinks.some((l) => l.evidenceRecordId === evidenceStage.evidenceId) === true);
        assert("5.5 Case timeline contains automated evidence created event", dbCase?.timelineEvents.some((t) => t.eventType === "EVIDENCE_PACKAGE_CREATED") === true);
        assert("5.6 Case timeline contains watermark linked event", dbCase?.timelineEvents.some((t) => t.eventType === "WATERMARK_LINKED") === true);
        // =========================================================================
        // 6. Enforcement Draft Integration & Human Approval Gating
        // =========================================================================
        console.log("\n--- 6. Enforcement Draft Integration & Approval Gating ---");
        const enforcementStage = highRiskResult.pipelineStages.enforcement;
        assert("6.1 Enforcement draft generated for high-risk case", enforcementStage !== null);
        assert("6.2 Enforcement number generated (ENF-YYYY-XXXX)", enforcementStage?.enforcementNumber?.startsWith("ENF-") === true);
        assert("6.3 Requires human approval flag is TRUE", enforcementStage?.requiresHumanApproval === true);
        assert("6.4 Initial status placed in REVIEW / DRAFT", enforcementStage?.status === "REVIEW" || enforcementStage?.status === "DRAFT");
        // Human Approval Gate verification
        const enfRecord = await enforcementService_1.enforcementService.getEnforcementById(enforcementStage.enforcementId);
        assert("6.5 Enforcement approvalStatus is PENDING", enfRecord.approvalStatus === "PENDING");
        // Try unauthorized approval from theatre staff -> should fail
        let staffApprovalFailed = false;
        try {
            await enforcementService_1.enforcementService.processApproval(enfRecord.id, "APPROVE", {
                id: staffTheatreA.id,
                email: staffTheatreA.email,
                role: "THEATRE_STAFF",
            });
        }
        catch (err) {
            staffApprovalFailed = err.statusCode === 403;
        }
        assert("6.6 Theatre Staff CANNOT approve enforcement (Requires Admin/Legal Role)", staffApprovalFailed);
        // Admin approves enforcement
        const approvedEnf = await enforcementService_1.enforcementService.processApproval(enfRecord.id, "APPROVE", {
            id: adminUser.id,
            email: adminUser.email,
            role: "ADMIN",
        }, "Forensic evidence package and watermark attribution validated by SOC");
        assert("6.7 Admin approval succeeds and moves enforcement to APPROVED", approvedEnf.status === "APPROVED");
        assert("6.8 ApprovedBy recorded in audit trail", approvedEnf.approvedBy === adminUser.email);
        // =========================================================================
        // 7. Duplicate Processing Prevention & Idempotency
        // =========================================================================
        console.log("\n--- 7. Deduplication & Idempotency ---");
        // Re-run orchestration on the same session 3
        const duplicateRun = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: activation3.id,
            signals: [
                { signalType: "SCREEN_CAPTURE_SIGNAL", severity: "HIGH" },
            ],
            theatreId: theatreA.id,
            actorId: adminUser.id,
            actorEmail: adminUser.email,
            actorRole: "ADMIN",
        });
        assert("7.1 Second orchestration run reuses existing SOC incident", duplicateRun.pipelineStages.soc?.incidentId === highRiskResult.pipelineStages.soc?.incidentId);
        assert("7.2 Second run sets createdNewIncident = false", duplicateRun.pipelineStages.soc?.createdNewIncident === false);
        assert("7.3 Second orchestration run reuses existing Investigation Case", duplicateRun.pipelineStages.investigationCase?.caseId === highRiskResult.pipelineStages.investigationCase?.caseId);
        assert("7.4 Second run sets createdNewCase = false", duplicateRun.pipelineStages.investigationCase?.createdNewCase === false);
        // =========================================================================
        // 8. Theatre / Tenant Isolation
        // =========================================================================
        console.log("\n--- 8. Theatre / Tenant Isolation ---");
        // Theatre B staff tries to process orchestration for Theatre A session
        let isolationBlocked = false;
        try {
            await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
                sessionId: activation3.id, // Belongs to Theatre A
                signals: [{ signalType: "SCREEN_CAPTURE_SIGNAL", severity: "HIGH" }],
                theatreId: theatreB.id, // Theatre B context
                actorId: staffTheatreB.id,
                actorEmail: staffTheatreB.email,
                actorRole: "THEATRE_STAFF",
            });
        }
        catch (err) {
            isolationBlocked = err.statusCode === 403;
        }
        assert("8.1 Foreign theatre staff blocked from orchestrating Theatre A session (403 UNAUTHORIZED_THEATRE)", isolationBlocked);
        // Theatre B staff tries to get session orchestration trace for Theatre A session
        let readBlocked = false;
        try {
            await piracyOrchestrationService_1.PiracyOrchestrationService.getSessionOrchestration({
                sessionId: activation3.id,
                userId: staffTheatreB.id,
                userRole: "THEATRE_STAFF",
                userTheatreId: theatreB.id,
            });
        }
        catch (err) {
            readBlocked = err.statusCode === 403;
        }
        assert("8.2 Foreign theatre staff blocked from viewing Theatre A orchestration trace (403)", readBlocked);
        // Theatre A staff CAN view Theatre A orchestration trace
        const theatreAAllowed = await piracyOrchestrationService_1.PiracyOrchestrationService.getSessionOrchestration({
            sessionId: activation3.id,
            userId: staffTheatreA.id,
            userRole: "THEATRE_STAFF",
            userTheatreId: theatreA.id,
        });
        assert("8.3 Authorized theatre staff can access own theatre session orchestration trace", theatreAAllowed.pipelineStages.session.sessionId === activation3.id);
        // =========================================================================
        // 9. Correlation ID Preservation Across All Pipeline Stages
        // =========================================================================
        console.log("\n--- 9. Correlation ID Preservation ---");
        assert("9.1 Correlation ID preserved in orchestration result", highRiskResult.correlationId === customCorrelationId);
        const threatEvents = await database_1.prisma.realtimeThreatEvent.findMany({
            where: { correlationId: customCorrelationId },
        });
        assert("9.2 Correlation ID stamped on all RealtimeThreatEvents", threatEvents.length >= 2);
        const auditLogs = await database_1.prisma.securityAuditLog.findMany({
            where: { metadata: { contains: customCorrelationId } },
        });
        assert("9.3 Correlation ID stamped on SecurityAuditLog metadata", auditLogs.length >= 1);
        // =========================================================================
        // 10. Zero Secrets & PII Exposure
        // =========================================================================
        console.log("\n--- 10. Zero Secrets & PII Exposure ---");
        const dirtyTelemetry = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: activation1.id,
            signals: [
                {
                    signalType: "SESSION_HEARTBEAT",
                    severity: "INFO",
                    payload: {
                        password: "super_secret_password_123",
                        userJwtToken: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        apiKey: "secret_api_key_xyz",
                        creditCard: "4532-1234-5678-9010",
                        safeData: "active_playback_frame_1230",
                    },
                },
            ],
            theatreId: theatreA.id,
            actorId: adminUser.id,
            actorEmail: adminUser.email,
            actorRole: "ADMIN",
        });
        const serializedResult = JSON.stringify(dirtyTelemetry);
        assert("10.1 Passwords stripped from output", !serializedResult.includes("super_secret_password_123"));
        assert("10.2 JWT tokens stripped from output", !serializedResult.includes("eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
        assert("10.3 API keys stripped from output", !serializedResult.includes("secret_api_key_xyz"));
        assert("10.4 Safe telemetry retained", serializedResult.includes("safeData") || dirtyTelemetry.sanitized === true);
        // =========================================================================
        // 11. Studio Intelligence Integration Verification
        // =========================================================================
        console.log("\n--- 11. Studio Intelligence Integration (Phase 28 KPIs) ---");
        const studioIntel = await studioIntelligenceService_1.StudioIntelligenceService.getStudioIntelligence({ productionCompanyId: studio.id }, { id: adminUser.id, email: adminUser.email, role: "ADMIN" });
        assert("11.1 Studio Intelligence reflects orchestrated high-risk incidents", studioIntel.kpis.totalIncidents >= 1);
        assert("11.2 Studio Intelligence reflects active investigations", studioIntel.kpis.activeInvestigations >= 1);
        assert("11.3 Studio Intelligence reflects evidence records", studioIntel.kpis.totalEvidenceRecords >= 1);
        assert("11.4 Studio Intelligence reflects active enforcement actions", studioIntel.kpis.activeEnforcements >= 1);
        assert("11.5 Movie risk rankings include orchestrated feature film", studioIntel.movieRankings.some((m) => m.movieId === movie.id));
        assert("11.6 Theatre risk rankings include Theatre A", studioIntel.theatreRankings.some((t) => t.theatreId === theatreA.id));
    }
    catch (err) {
        console.error("Critical test execution failure:", err);
        failed++;
    }
    finally {
        // Cleanup fixtures
        console.log("\n--- Cleaning up test fixtures ---");
        try {
            await database_1.prisma.investigationEvidenceLink.deleteMany({
                where: { case: { theatreId: { in: [theatreA.id, theatreB.id] } } },
            }).catch(() => { });
            await database_1.prisma.investigationTimelineEvent.deleteMany({
                where: { case: { theatreId: { in: [theatreA.id, theatreB.id] } } },
            }).catch(() => { });
            await database_1.prisma.investigationStatusHistory.deleteMany({
                where: { case: { theatreId: { in: [theatreA.id, theatreB.id] } } },
            }).catch(() => { });
            await database_1.prisma.investigationCase.deleteMany({
                where: { theatreId: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.evidenceHash.deleteMany({
                where: { evidenceRecord: { theatreId: { in: [theatreA.id, theatreB.id] } } },
            }).catch(() => { });
            await database_1.prisma.evidenceRecord.deleteMany({
                where: { theatreId: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.securityIncident.deleteMany({
                where: { theatreId: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.realtimeThreatEvent.deleteMany({
                where: { theatreId: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.securityAuditLog.deleteMany({
                where: { theatreId: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.activation.deleteMany({
                where: { id: { in: [activation1.id, activation2.id, activation3.id, activation4.id] } },
            }).catch(() => { });
            await database_1.prisma.ticket.deleteMany({
                where: { id: { in: [ticket1.id, ticket2.id, ticket3.id, ticket4.id] } },
            }).catch(() => { });
            await database_1.prisma.show.deleteMany({
                where: { id: { in: [showA.id, showB.id] } },
            }).catch(() => { });
            await database_1.prisma.screen.deleteMany({
                where: { id: { in: [screenA.id, screenB.id] } },
            }).catch(() => { });
            await database_1.prisma.movie.deleteMany({
                where: { id: movie.id },
            }).catch(() => { });
            await database_1.prisma.theatre.deleteMany({
                where: { id: { in: [theatreA.id, theatreB.id] } },
            }).catch(() => { });
            await database_1.prisma.productionCompany.deleteMany({
                where: { id: studio.id },
            }).catch(() => { });
            await database_1.prisma.user.deleteMany({
                where: { id: { in: [adminUser.id, staffTheatreA.id, staffTheatreB.id] } },
            }).catch(() => { });
        }
        catch (cleanupErr) {
            console.warn("Cleanup warning:", cleanupErr);
        }
    }
    console.log("\n==================================================================");
    console.log(`📊 PHASE 29 ORCHESTRATION TEST RESULTS: ${passed}/${passed + failed} Passed (${failed} Failed)`);
    console.log("==================================================================\n");
    if (failed > 0) {
        process.exit(1);
    }
}
runPiracyOrchestrationTests().catch((err) => {
    console.error("Test runner threw uncaught error:", err);
    process.exit(1);
});
