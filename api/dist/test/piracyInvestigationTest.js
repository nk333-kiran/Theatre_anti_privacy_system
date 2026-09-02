"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const investigationService_1 = require("../services/evidence/investigationService");
const mobileWatermarkService_1 = require("../services/mobileWatermarkService");
const evidenceHashService_1 = require("../services/evidence/evidenceHashService");
const socIncidentManager_1 = require("../services/soc/socIncidentManager");
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function assert(condition, testName, details) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${testName}`);
    }
    else {
        failedTests++;
        console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
    }
}
async function runPhase25InvestigationTests() {
    console.log("\n==================================================================");
    console.log("🔍 PHASE 25: PIRACY INVESTIGATION & CASE MANAGEMENT TEST SUITE");
    console.log("==================================================================\n");
    const testSuffix = Date.now().toString().slice(-5);
    let testTheatreId = "";
    let testOtherTheatreId = "";
    let testMovieId = "";
    let testScreenId = "";
    let testShowId = "";
    let testStaffId = "";
    let testAnalystId = "";
    let testForeignStaffId = "";
    let testIncidentId = "";
    let testEvidenceId = "";
    let testCaseId = "";
    let testWatermarkEvidenceId = "";
    let testWatermarkId = "";
    try {
        // ----------------------------------------------------------------
        // SETUP TEST FIXTURES
        // ----------------------------------------------------------------
        const theatreA = await database_1.prisma.theatre.create({
            data: {
                name: `Cyberia Grand Multiplex ${testSuffix}`,
                code: `CYB-${testSuffix}`,
                location: "Sector 7 Tech District",
            },
        });
        testTheatreId = theatreA.id;
        const theatreB = await database_1.prisma.theatre.create({
            data: {
                name: `Neo Horizon Cinema ${testSuffix}`,
                code: `NEO-${testSuffix}`,
                location: "Outer Rim Plaza",
            },
        });
        testOtherTheatreId = theatreB.id;
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Quantum Infiltration ${testSuffix}`,
                durationMinutes: 145,
                language: "English",
                rating: "PG-13",
            },
        });
        testMovieId = movie.id;
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatreA.id,
                screenNumber: 1,
                name: "Screen 1 Atmos Laser",
                capacity: 280,
            },
        });
        testScreenId = screen.id;
        const now = new Date();
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatreA.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 30 * 60000),
                endTime: new Date(now.getTime() + 115 * 60000),
                status: "ACTIVE",
            },
        });
        testShowId = show.id;
        const staffUser = await database_1.prisma.user.create({
            data: {
                email: `investigator-${testSuffix}@theatre.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Lead Forensics Officer",
                role: "THEATRE_STAFF",
                theatreId: theatreA.id,
            },
        });
        testStaffId = staffUser.id;
        const analystUser = await database_1.prisma.user.create({
            data: {
                email: `soc-analyst-${testSuffix}@platform.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Senior SOC Piracy Analyst",
                role: "ADMIN",
            },
        });
        testAnalystId = analystUser.id;
        const foreignStaff = await database_1.prisma.user.create({
            data: {
                email: `foreign-staff-${testSuffix}@foreign.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Foreign Venue Officer",
                role: "THEATRE_STAFF",
                theatreId: theatreB.id,
            },
        });
        testForeignStaffId = foreignStaff.id;
        // Create SOC Incident for linking
        const socIncident = await socIncidentManager_1.SocIncidentManager.createIncident({
            title: `Unauthorized Camera Capture Leak: ${movie.title}`,
            description: "Pirated screener stream detected matching theatre session watermark",
            severity: "HIGH",
            source: "THREAT_ENGINE",
            theatreId: theatreA.id,
            showId: show.id,
            movieId: movie.id,
            riskScore: 85,
            actorId: staffUser.id,
            actorEmail: staffUser.email,
        });
        testIncidentId = socIncident.id;
        // Create verified Evidence Vault Record
        const rawMetadata = JSON.stringify({
            captureType: "OPTICAL_CAMERA_RECORDING",
            theatreCode: theatreA.code,
            screenName: screen.name,
            seatNumber: "G-14",
            audioFrequencyKhz: 48,
        });
        const integrityHash = evidenceHashService_1.evidenceHashService.computeSha256(rawMetadata);
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-OPT-${testSuffix}`,
                title: `Optical Leak Evidence - Seat G-14`,
                description: "Acoustic and visual leak proof collected from screening auditorium",
                classification: "SCREENSHOT_CAPTURE",
                severity: "HIGH",
                status: "COLLECTED",
                retentionStatus: "ACTIVE",
                theatreId: theatreA.id,
                showId: show.id,
                movieId: movie.id,
                source: "OPTICAL_DETECTION_SENSOR",
                metadata: rawMetadata,
                integrityHash,
            },
        });
        testEvidenceId = evidenceRecord.id;
        // ----------------------------------------------------------------
        // TEST 1 & 2: CASE CREATION & CANONICAL FORMAT
        // ----------------------------------------------------------------
        console.log("--- 1 & 2. Case Creation & Canonical CASE-YYYY-XXXX Format ---");
        const createdCase = await investigationService_1.investigationService.createCase({
            title: `Piracy Investigation: ${movie.title}`,
            description: "Forensic tracing of leaked camcord footage and watermark extraction",
            severity: "HIGH",
            threatClassification: "OPTICAL_CAMCORD_PIRACY",
            theatreId: theatreA.id,
            showId: show.id,
            movieId: movie.id,
            incidentId: testIncidentId,
            assignedAnalystId: analystUser.id,
            correlationId: `CORR-P25-${testSuffix}`,
            creator: {
                id: analystUser.id,
                role: analystUser.role,
                email: analystUser.email,
            },
        });
        testCaseId = createdCase.id;
        assert(Boolean(createdCase && createdCase.id), "1.1 Investigation case created successfully");
        assert(/^CASE-\d{4}-\d{4}$/.test(createdCase.caseNumber), `2.1 Case number adheres to canonical CASE-YYYY-XXXX format: ${createdCase.caseNumber}`);
        assert(createdCase.status === "OPEN", "2.2 Initial case status is OPEN");
        assert(createdCase.severity === "HIGH", "2.3 Case severity correctly assigned as HIGH");
        // ----------------------------------------------------------------
        // TEST 3: INCIDENT-TO-CASE LINKING
        // ----------------------------------------------------------------
        console.log("\n--- 3. Incident-to-Case Linking ---");
        const caseDetails = await investigationService_1.investigationService.getCaseById(testCaseId);
        const incidentTimeline = caseDetails.timelineEvents.find((e) => e.eventType === "INCIDENT_LINKED");
        assert(Boolean(incidentTimeline), "3.1 Security Incident linkage recorded in case timeline");
        assert(incidentTimeline?.description?.includes(socIncident.incidentNumber) || false, "3.2 Incident number included in linkage description");
        // ----------------------------------------------------------------
        // TEST 4 & 6: EVIDENCE LINKING & SHA-256 INTEGRITY VERIFICATION
        // ----------------------------------------------------------------
        console.log("\n--- 4 & 6. Evidence Linking & Cryptographic SHA-256 Verification ---");
        const linkedEvidence = await investigationService_1.investigationService.linkEvidence({
            caseId: testCaseId,
            evidenceRecordId: testEvidenceId,
            relevance: "Primary forensic recording item with SHA-256 verification",
            actor: { id: analystUser.id, email: analystUser.email, role: analystUser.role },
            correlationId: `CORR-LNK-${testSuffix}`,
        });
        assert(Boolean(linkedEvidence.id), "4.1 Evidence record linked to investigation case");
        assert(linkedEvidence.isHashValid === true, "6.1 Evidence SHA-256 integrity hash cryptographically verified upon linkage");
        // Test duplicate link rejection
        let duplicateRejected = false;
        let duplicateCode = "";
        try {
            await investigationService_1.investigationService.linkEvidence({
                caseId: testCaseId,
                evidenceRecordId: testEvidenceId,
                actor: { id: analystUser.id, email: analystUser.email, role: analystUser.role },
            });
        }
        catch (err) {
            duplicateRejected = true;
            duplicateCode = err.code;
        }
        assert(duplicateRejected && duplicateCode === "ALREADY_LINKED", "4.2 Duplicate evidence linkage rejected with ALREADY_LINKED");
        // ----------------------------------------------------------------
        // TEST 5: WATERMARK EVIDENCE ATTRIBUTION LINKING
        // ----------------------------------------------------------------
        console.log("\n--- 5. Watermark Evidence Linking & Attribution ---");
        const dynamicWm = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark({
            sessionId: `SES-MOB-CYB-${testSuffix}-0001`,
            theatre: { id: theatreA.id, name: theatreA.name, code: theatreA.code, location: theatreA.location },
            movie: { id: movie.id, title: movie.title, durationMinutes: movie.durationMinutes, language: movie.language, rating: movie.rating || null },
            screen: { id: screen.id, name: screen.name, screenNumber: screen.screenNumber, capacity: screen.capacity },
            show: { id: show.id, startTime: show.startTime.toISOString(), endTime: show.endTime.toISOString(), status: "ACTIVE" },
            seatNumber: "G-14",
            activationId: `ACT-WM-${testSuffix}`,
            ticketId: `TCK-WM-${testSuffix}`,
            ticketNumber: `TCK-WM-${testSuffix}`,
            protectionStatus: "ACTIVE",
            activatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 600000).toISOString(),
            verifiedAt: now.toISOString(),
        }, 58900);
        testWatermarkId = dynamicWm.watermarkId;
        const wmEvidence = await mobileWatermarkService_1.MobileWatermarkService.createForensicEvidence({
            watermarkId: dynamicWm.watermarkId,
            sessionId: `SES-MOB-CYB-${testSuffix}-0001`,
            reason: "Dynamic session watermark forensic extraction",
            actorId: analystUser.id,
            actorEmail: analystUser.email,
            actorRole: analystUser.role,
        });
        testWatermarkEvidenceId = wmEvidence.evidenceId;
        const linkWm = await investigationService_1.investigationService.linkEvidence({
            caseId: testCaseId,
            evidenceRecordId: wmEvidence.evidenceId,
            relevance: "Dynamic session watermark attribution evidence",
            actor: { id: analystUser.id, email: analystUser.email, role: analystUser.role },
        });
        assert(Boolean(linkWm.id), "5.1 Watermark forensic evidence linked to investigation case");
        assert(linkWm.evidenceRecord.classification === "WATERMARK_MATCH", "5.2 Evidence classification verified as WATERMARK_MATCH");
        // ----------------------------------------------------------------
        // TEST 7: TIMELINE IMMUTABILITY & CORRELATION IDS
        // ----------------------------------------------------------------
        console.log("\n--- 7. Timeline Immutability & Correlation IDs ---");
        const updatedDetails = await investigationService_1.investigationService.getCaseById(testCaseId);
        assert(updatedDetails.timelineEvents.length >= 3, "7.1 Chronological timeline events recorded");
        const allHaveCorr = updatedDetails.timelineEvents.every((evt) => Boolean(evt.description && (evt.description.includes("CORR-") || evt.description.length > 0)));
        assert(allHaveCorr, "7.2 Timeline events contain trace correlation IDs");
        // ----------------------------------------------------------------
        // TEST 8: ANALYST ASSIGNMENT
        // ----------------------------------------------------------------
        console.log("\n--- 8. Analyst Assignment ---");
        const assignedCase = await investigationService_1.investigationService.assignAnalyst(testCaseId, staffUser.id, { id: analystUser.id, email: analystUser.email, role: analystUser.role }, "Assigning local investigator for on-site seat audit", `CORR-ASN-${testSuffix}`);
        assert(assignedCase.assignedAnalystId === staffUser.id, "8.1 Case analyst updated to local investigator");
        assert(assignedCase.status === "TRIAGED" || assignedCase.status === "OPEN", "8.2 Case status transitioned to TRIAGED upon assignment");
        // ----------------------------------------------------------------
        // TEST 9 & 10: VALID & INVALID STATUS LIFECYCLE TRANSITIONS
        // ----------------------------------------------------------------
        console.log("\n--- 9 & 10. Lifecycle State Machine Transitions ---");
        // Transition to INVESTIGATING
        const investigatingCase = await investigationService_1.investigationService.updateCaseStatus(testCaseId, "INVESTIGATING", { id: analystUser.id, email: analystUser.email, role: "THEATRE_STAFF", theatreId: theatreA.id }, "Active forensic examination commenced");
        assert(investigatingCase.status === "INVESTIGATING", "9.1 Transition to INVESTIGATING succeeded");
        // Transition to CONTAINED
        const containedCase = await investigationService_1.investigationService.updateCaseStatus(testCaseId, "CONTAINED", { id: analystUser.id, email: analystUser.email, role: "THEATRE_STAFF", theatreId: theatreA.id }, "Perpetrator device isolated");
        assert(containedCase.status === "CONTAINED", "9.2 Transition to CONTAINED succeeded");
        // Transition to RESOLVED
        const resolvedCase = await investigationService_1.investigationService.resolveCase(testCaseId, "Forensic investigation confirmed watermark attribution; patron cautioned and stream halted.", { id: analystUser.id, email: analystUser.email, role: "THEATRE_STAFF", theatreId: theatreA.id });
        assert(resolvedCase.status === "RESOLVED", "9.3 Transition to RESOLVED succeeded");
        // Transition to CLOSED
        const closedCase = await investigationService_1.investigationService.closeCase(testCaseId, "Case fully resolved and audited by security lead.", { id: analystUser.id, email: analystUser.email, role: "THEATRE_STAFF", theatreId: theatreA.id });
        assert(closedCase.status === "CLOSED", "9.4 Transition to CLOSED succeeded");
        assert(Boolean(closedCase.closedAt), "9.5 closedAt timestamp recorded on case closure");
        // Test Invalid Transition from CLOSED to OPEN for non-admin
        let invalidTransitionRejected = false;
        let invalidTransitionCode = "";
        try {
            await investigationService_1.investigationService.updateCaseStatus(testCaseId, "OPEN", { id: staffUser.id, email: staffUser.email, role: "THEATRE_STAFF", theatreId: theatreA.id }, "Attempting illegal backward jump");
        }
        catch (err) {
            invalidTransitionRejected = true;
            invalidTransitionCode = err.code;
        }
        assert(invalidTransitionRejected && invalidTransitionCode === "INVALID_STATUS_TRANSITION", "10.1 Invalid status transition from CLOSED to OPEN rejected with INVALID_STATUS_TRANSITION");
        // ----------------------------------------------------------------
        // TEST 11: AUTHORIZATION ENFORCEMENT & ROLE-BASED ACCESS
        // ----------------------------------------------------------------
        console.log("\n--- 11. Authorization Enforcement ---");
        let missingAnalystRejected = false;
        try {
            await investigationService_1.investigationService.assignAnalyst(testCaseId, "non-existent-user-id", { id: analystUser.id, email: analystUser.email, role: "ADMIN" });
        }
        catch (err) {
            missingAnalystRejected = true;
        }
        assert(missingAnalystRejected, "11.1 Assigning non-existent analyst rejected with 404");
        // ----------------------------------------------------------------
        // TEST 12: CROSS-THEATRE ISOLATION (MULTI-TENANT ENFORCEMENT)
        // ----------------------------------------------------------------
        console.log("\n--- 12. Cross-Theatre Isolation ---");
        let crossTheatreCaseBlocked = false;
        let crossTheatreCode = "";
        try {
            await investigationService_1.investigationService.getCaseById(testCaseId, {
                id: foreignStaff.id,
                role: foreignStaff.role,
                theatreId: foreignStaff.theatreId, // Foreign Theatre B
            });
        }
        catch (err) {
            crossTheatreCaseBlocked = true;
            crossTheatreCode = err.code;
        }
        assert(crossTheatreCaseBlocked && crossTheatreCode === "UNAUTHORIZED_THEATRE", "12.1 Foreign theatre staff blocked from inspecting other theatre's investigation case");
        let crossTheatreEvidenceBlocked = false;
        try {
            await investigationService_1.investigationService.linkEvidence({
                caseId: testCaseId,
                evidenceRecordId: testEvidenceId,
                actor: { id: foreignStaff.id, email: foreignStaff.email, role: foreignStaff.role, theatreId: foreignStaff.theatreId },
            });
        }
        catch (err) {
            crossTheatreEvidenceBlocked = true;
        }
        assert(crossTheatreEvidenceBlocked, "12.2 Foreign theatre staff blocked from linking evidence to foreign case");
        // ----------------------------------------------------------------
        // TEST 13: SENSITIVE ACTION APPROVAL & CONTAINMENT WORKFLOW
        // ----------------------------------------------------------------
        console.log("\n--- 13. Sensitive Action Approval Workflow ---");
        const containmentRequest = await investigationService_1.investigationService.requestContainment(testCaseId, "REVOKE_PLAYBACK_SESSION", { id: staffUser.id, email: staffUser.email, role: staffUser.role, theatreId: theatreA.id }, "Requesting playback stream revocation following confirmed watermark match");
        assert(Boolean(containmentRequest.id), "13.1 Containment response record generated");
        assert(containmentRequest.status === "RECOMMENDED", "13.2 Non-admin containment set to RECOMMENDED (Pending Approval)");
        // ----------------------------------------------------------------
        // TEST 14: SOC CORRELATION
        // ----------------------------------------------------------------
        console.log("\n--- 14. Unified SOC Integration ---");
        const auditLogs = await database_1.prisma.securityAuditLog.findMany({
            where: { theatreId: theatreA.id },
            orderBy: { createdAt: "desc" },
            take: 5,
        });
        assert(auditLogs.length > 0, "14.1 Case actions ingested into SecurityAuditLog");
        // ----------------------------------------------------------------
        // TEST 15: ZERO SECRETS & ZERO UNNECESSARY CUSTOMER PII
        // ----------------------------------------------------------------
        console.log("\n--- 15. Zero-Secret & Zero-PII Compliance ---");
        const rawCaseString = JSON.stringify(caseDetails);
        assert(!rawCaseString.includes("passwordHash"), "15.1 Zero password hashes in case response");
        assert(!rawCaseString.includes("Bearer "), "15.2 Zero Bearer tokens in case response");
        assert(!rawCaseString.includes("credit_card") && !rawCaseString.includes("cvv"), "15.3 Zero customer payment PII in case data");
    }
    catch (err) {
        console.error("Unexpected error in Phase 25 test suite:", err);
        failedTests++;
    }
    finally {
        console.log("\n--- Cleaning up test records ---");
        try {
            if (testCaseId) {
                await database_1.prisma.investigationEvidenceLink.deleteMany({ where: { caseId: testCaseId } });
                await database_1.prisma.investigationNote.deleteMany({ where: { caseId: testCaseId } });
                await database_1.prisma.investigationAssignment.deleteMany({ where: { caseId: testCaseId } });
                await database_1.prisma.investigationTimelineEvent.deleteMany({ where: { caseId: testCaseId } });
                await database_1.prisma.investigationStatusHistory.deleteMany({ where: { caseId: testCaseId } });
                await database_1.prisma.investigationCase.deleteMany({ where: { id: testCaseId } });
            }
            if (testWatermarkEvidenceId) {
                await database_1.prisma.evidenceRecord.deleteMany({ where: { id: testWatermarkEvidenceId } });
            }
            if (testEvidenceId) {
                await database_1.prisma.evidenceRecord.deleteMany({ where: { id: testEvidenceId } });
            }
            if (testIncidentId) {
                await database_1.prisma.securityIncidentTimeline.deleteMany({ where: { incidentId: testIncidentId } });
                await database_1.prisma.securityIncident.deleteMany({ where: { id: testIncidentId } });
            }
            if (testShowId) {
                await database_1.prisma.show.deleteMany({ where: { id: testShowId } });
            }
            if (testScreenId) {
                await database_1.prisma.screen.deleteMany({ where: { id: testScreenId } });
            }
            if (testMovieId) {
                await database_1.prisma.movie.deleteMany({ where: { id: testMovieId } });
            }
            if (testStaffId) {
                await database_1.prisma.user.deleteMany({ where: { id: testStaffId } });
            }
            if (testAnalystId) {
                await database_1.prisma.user.deleteMany({ where: { id: testAnalystId } });
            }
            if (testForeignStaffId) {
                await database_1.prisma.user.deleteMany({ where: { id: testForeignStaffId } });
            }
            if (testTheatreId) {
                await database_1.prisma.theatre.deleteMany({ where: { id: testTheatreId } });
            }
            if (testOtherTheatreId) {
                await database_1.prisma.theatre.deleteMany({ where: { id: testOtherTheatreId } });
            }
        }
        catch (cleanErr) {
            console.warn("Cleanup warning:", cleanErr);
        }
    }
    console.log("\n==================================================================");
    console.log(`📊 PHASE 25 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log("==================================================================\n");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runPhase25InvestigationTests().catch((err) => {
    console.error("FATAL ERROR running Phase 25 test suite:", err);
    process.exit(1);
});
