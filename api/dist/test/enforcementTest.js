"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const enforcementService_1 = require("../services/enforcement/enforcementService");
const enforcementEvidenceService_1 = require("../services/enforcement/enforcementEvidenceService");
const investigationService_1 = require("../services/evidence/investigationService");
const evidenceHashService_1 = require("../services/evidence/evidenceHashService");
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
async function runPhase27EnforcementTests() {
    console.log("\n==================================================================");
    console.log("⚖️  PHASE 27: PIRACY RESPONSE & ENFORCEMENT TEST SUITE");
    console.log("==================================================================\n");
    const testSuffix = Date.now().toString().slice(-5);
    let testTheatreAId = "";
    let testTheatreBId = "";
    let testMovieId = "";
    let testScreenId = "";
    let testShowId = "";
    let testAdminUser = null;
    let testStaffUserA = null;
    let testStaffUserB = null;
    let testEvidenceId = "";
    let testCaseId = "";
    let testClosedCaseId = "";
    try {
        // ----------------------------------------------------------------
        // SETUP FIXTURES
        // ----------------------------------------------------------------
        const theatreA = await database_1.prisma.theatre.create({
            data: {
                name: `Metropolis Cineplex A ${testSuffix}`,
                code: `MET-A-${testSuffix}`,
                location: "Central Hub",
            },
        });
        testTheatreAId = theatreA.id;
        const theatreB = await database_1.prisma.theatre.create({
            data: {
                name: `Metropolis Cineplex B ${testSuffix}`,
                code: `MET-B-${testSuffix}`,
                location: "West District",
            },
        });
        testTheatreBId = theatreB.id;
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Cybernetic Breach ${testSuffix}`,
                durationMinutes: 135,
                language: "English",
                rating: "PG-13",
            },
        });
        testMovieId = movie.id;
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatreA.id,
                screenNumber: 1,
                name: "Laser IMAX Auditorium",
                capacity: 350,
            },
        });
        testScreenId = screen.id;
        const now = new Date();
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatreA.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 20 * 60000),
                endTime: new Date(now.getTime() + 115 * 60000),
                status: "ACTIVE",
            },
        });
        testShowId = show.id;
        // Users
        testAdminUser = await database_1.prisma.user.create({
            data: {
                email: `compliance-admin-${testSuffix}@antipiracy.corp`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Chief Compliance Officer",
                role: "ADMIN",
            },
        });
        testStaffUserA = await database_1.prisma.user.create({
            data: {
                email: `theatre-staff-a-${testSuffix}@theatrea.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Theatre A Security Lead",
                role: "THEATRE_STAFF",
                theatreId: theatreA.id,
            },
        });
        testStaffUserB = await database_1.prisma.user.create({
            data: {
                email: `theatre-staff-b-${testSuffix}@theatreb.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Theatre B Security Officer",
                role: "THEATRE_STAFF",
                theatreId: theatreB.id,
            },
        });
        // Evidence Record with SHA-256 hash
        const rawEvidenceMetadata = JSON.stringify({
            captureType: "UNAUTHORIZED_OPTICAL_RECORDING",
            theatreCode: theatreA.code,
            screenName: screen.name,
            seatNumber: "K-12",
            watermarkReference: {
                watermarkId: `WM-${theatreA.code}-K12`,
                displayString: `WM-${theatreA.code}-K12-AT`,
                timeSlot: 14,
            },
            forensicConfidence: 99,
            secretKey: "super-secret-drm-key", // Should be redacted in packages
            jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDNxdACt7vS",
            cardNumber: "4111-2222-3333-4444",
        });
        const evidenceHash = evidenceHashService_1.evidenceHashService.computeSha256(rawEvidenceMetadata);
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-TEST-${testSuffix}-001`,
                title: `Forensic Leak Capture: ${movie.title}`,
                classification: "WATERMARK_MATCH",
                severity: "CRITICAL",
                status: "VERIFIED",
                source: "OPTICAL_DETECTION_GRID",
                theatreId: theatreA.id,
                showId: show.id,
                movieId: movie.id,
                metadata: rawEvidenceMetadata,
                integrityHash: evidenceHash,
            },
        });
        testEvidenceId = evidenceRecord.id;
        // Active Investigation Case (OPEN)
        const activeCase = await investigationService_1.investigationService.createCase({
            title: `Unauthorized Screener Infiltration: ${movie.title}`,
            description: `Active cam recording stream discovered on cyberlock index`,
            severity: "CRITICAL",
            threatClassification: "CAM_RECORDING_DISTRIBUTOR",
            theatreId: theatreA.id,
            showId: show.id,
            movieId: movie.id,
            playbackSessionId: `SESSION-${testSuffix}-ACTIVE`,
            creator: testStaffUserA,
            correlationId: `CORR-CASE-A-${testSuffix}`,
        });
        testCaseId = activeCase.id;
        // Link evidence to case
        await investigationService_1.investigationService.linkEvidence({
            caseId: activeCase.id,
            evidenceRecordId: evidenceRecord.id,
            relevance: "Direct watermark attribution to Auditorium Seat K-12",
            actor: testStaffUserA,
            correlationId: `CORR-LINK-${testSuffix}`,
        });
        // Ineligible Closed Case (CLOSED)
        const closedCase = await investigationService_1.investigationService.createCase({
            title: `Archived Incident Case ${testSuffix}`,
            description: `Old closed case`,
            severity: "LOW",
            theatreId: theatreA.id,
            creator: testStaffUserA,
        });
        await investigationService_1.investigationService.closeCase(closedCase.id, "Case concluded and archived", testStaffUserA);
        testClosedCaseId = closedCase.id;
        // Reset service store for clean test run
        enforcementService_1.enforcementService.constructor && enforcementService_1.enforcementService.constructor.resetStore?.();
        console.log("--- 1. Valid Case → Enforcement Action Creation ---");
        const createdEnforcement = await enforcementService_1.enforcementService.createEnforcement({
            caseId: testCaseId,
            title: "DMCA Takedown: Screener Leak Stream on Cyberlock CDN",
            description: "Cryptographically verified forensic evidence indicates active leak from Venue A",
            actionType: "TAKEDOWN_NOTICE",
            targetEntity: "Cloudflare Cyberlock Host Abuse Desk",
            targetJurisdiction: "United States (DMCA Title 17)",
            severity: "CRITICAL",
            actor: testStaffUserA,
            correlationId: `CORR-CREATE-ENF-${testSuffix}`,
        });
        assert(createdEnforcement !== null, "1.1 Enforcement action created successfully");
        assert(createdEnforcement.enforcementNumber.startsWith("ENF-"), "1.2 Canonical ENF-YYYY-XXXX number assigned", createdEnforcement.enforcementNumber);
        assert(createdEnforcement.status === "DRAFT", "1.3 Initial status is DRAFT", createdEnforcement.status);
        assert(createdEnforcement.approvalStatus === "NOT_REQUESTED", "1.4 Approval status is NOT_REQUESTED", createdEnforcement.approvalStatus);
        assert(createdEnforcement.theatreId === theatreA.id, "1.5 Theatre tenant properly associated");
        assert(createdEnforcement.package !== undefined, "1.6 Evidence package compiled on creation");
        assert(createdEnforcement.package?.evidenceRecords.length === 1, "1.7 Linked case evidence records incorporated into package");
        assert(createdEnforcement.package?.watermarkAttribution?.watermarkId.includes(theatreA.code) === true, "1.8 Watermark attribution accurately populated");
        console.log("\n--- 2. Invalid / Closed-Ineligible Case Handling ---");
        let closedCaseErrorThrown = false;
        try {
            await enforcementService_1.enforcementService.createEnforcement({
                caseId: testClosedCaseId,
                title: "Attempted Enforcement on Closed Case",
                actionType: "TAKEDOWN_NOTICE",
                actor: testStaffUserA,
            });
        }
        catch (err) {
            closedCaseErrorThrown = true;
            assert(err.code === "INELIGIBLE_CASE_STATUS", "2.1 Blocked enforcement creation on CLOSED case", err.message);
        }
        assert(closedCaseErrorThrown, "2.2 Ineligible case creation threw expected exception");
        let nonExistentErrorThrown = false;
        try {
            await enforcementService_1.enforcementService.createEnforcement({
                caseId: "non-existent-case-id-99999",
                title: "Invalid Case",
                actionType: "TAKEDOWN_NOTICE",
                actor: testAdminUser,
            });
        }
        catch (err) {
            nonExistentErrorThrown = true;
            assert(err.code === "CASE_NOT_FOUND", "2.3 Blocked enforcement creation on non-existent case", err.message);
        }
        assert(nonExistentErrorThrown, "2.4 Non-existent case threw CASE_NOT_FOUND");
        console.log("\n--- 3. Evidence Integrity & Cryptographic Package Hash ---");
        assert(createdEnforcement.package?.packageIntegrityHash !== undefined, "3.1 Evidence package has SHA-256 integrity hash");
        assert(createdEnforcement.package?.isFullyVerified === true, "3.2 Package verified all attached evidence records");
        const packageVerify = enforcementEvidenceService_1.enforcementEvidenceService.verifyPackageIntegrity(createdEnforcement.package);
        assert(packageVerify.isValid === true, "3.3 Cryptographic package hash verification succeeded");
        // Tampering test: modify package content and ensure verification fails
        const tamperedPackage = {
            ...createdEnforcement.package,
            targetEntity: "MODIFIED_TAMPERED_HOST",
        };
        const tamperedVerify = enforcementEvidenceService_1.enforcementEvidenceService.verifyPackageIntegrity(tamperedPackage);
        assert(tamperedVerify.isValid === false, "3.4 Tampered package content successfully detected and rejected");
        console.log("\n--- 4. Secret & PII Redaction ---");
        const packageStr = JSON.stringify(createdEnforcement.package);
        assert(!packageStr.includes("super-secret-drm-key"), "4.1 Plaintext secretKey scrubbed from package");
        assert(!packageStr.includes("4111-2222-3333-4444"), "4.2 Credit card number scrubbed from package");
        assert(!packageStr.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "4.3 JWT auth tokens redacted from package");
        assert(packageStr.includes("[REDACTED"), "4.4 Redaction placeholders applied properly");
        console.log("\n--- 5. Duplicate Enforcement Prevention ---");
        let duplicateErrorThrown = false;
        try {
            await enforcementService_1.enforcementService.createEnforcement({
                caseId: testCaseId,
                title: "Duplicate Enforcement Attempt",
                actionType: "TAKEDOWN_NOTICE", // Same action type as active enforcement
                actor: testStaffUserA,
            });
        }
        catch (err) {
            duplicateErrorThrown = true;
            assert(err.code === "DUPLICATE_ENFORCEMENT", "5.1 Blocked duplicate active enforcement on the same case", err.message);
        }
        assert(duplicateErrorThrown, "5.2 Duplicate creation error raised as expected");
        console.log("\n--- 6. Multi-Tenant / Theatre Isolation ---");
        let foreignStaffCreateError = false;
        try {
            await enforcementService_1.enforcementService.createEnforcement({
                caseId: testCaseId, // belongs to Theatre A
                title: "Foreign Staff Exploit Attempt",
                actionType: "AUDITORIUM_SEAT_BLACKLIST",
                actor: testStaffUserB, // belongs to Theatre B
            });
        }
        catch (err) {
            foreignStaffCreateError = true;
            assert(err.code === "UNAUTHORIZED_THEATRE", "6.1 Foreign theatre staff blocked from creating action on other venue case (403)", err.message);
        }
        assert(foreignStaffCreateError, "6.2 Cross-theatre creation check enforced");
        let foreignStaffGetError = false;
        try {
            await enforcementService_1.enforcementService.getEnforcementById(createdEnforcement.id, testStaffUserB);
        }
        catch (err) {
            foreignStaffGetError = true;
            assert(err.code === "UNAUTHORIZED_THEATRE", "6.3 Foreign theatre staff blocked from accessing other venue action (403)", err.message);
        }
        assert(foreignStaffGetError, "6.4 Cross-theatre retrieval blocked");
        console.log("\n--- 7. Human Approval Requirement & Role Privileges ---");
        // Move to REVIEW
        const underReview = await enforcementService_1.enforcementService.submitForReview(createdEnforcement.id, testStaffUserA, "Forensic package complete, requesting approval");
        assert(underReview.status === "REVIEW", "7.1 Successfully transitioned from DRAFT to REVIEW", underReview.status);
        assert(underReview.approvalStatus === "PENDING", "7.2 Approval status is PENDING");
        // Attempt approval by regular THEATRE_STAFF (should be blocked)
        let staffApprovalBlocked = false;
        try {
            await enforcementService_1.enforcementService.processApproval(createdEnforcement.id, "APPROVE", testStaffUserA, // regular staff
            "Staff attempted self-approval");
        }
        catch (err) {
            staffApprovalBlocked = true;
            assert(err.code === "APPROVAL_PERMISSION_DENIED", "7.3 Regular THEATRE_STAFF denied approval privileges", err.message);
        }
        assert(staffApprovalBlocked, "7.4 Mandatory human executive approval enforced");
        // Attempt submission before approval (should be blocked)
        let prematureSubmitBlocked = false;
        try {
            await enforcementService_1.enforcementService.submitEnforcement(createdEnforcement.id, testAdminUser, "EXT-REF-EARLY");
        }
        catch (err) {
            prematureSubmitBlocked = true;
            assert(err.code === "INVALID_STATUS_TRANSITION" || err.code === "APPROVAL_REQUIRED", "7.5 Transmission blocked without prior approval", err.message);
        }
        assert(prematureSubmitBlocked, "7.6 Premature submission blocked");
        // Valid Approval by ADMIN
        const approvedEnforcement = await enforcementService_1.enforcementService.processApproval(createdEnforcement.id, "APPROVE", testAdminUser, "Executive authorization confirmed by Chief Compliance Officer", undefined, `CORR-APPROVE-${testSuffix}`);
        assert(approvedEnforcement.status === "APPROVED", "7.7 Successfully approved by authorized admin", approvedEnforcement.status);
        assert(approvedEnforcement.approvalStatus === "APPROVED", "7.8 ApprovalStatus is APPROVED");
        assert(approvedEnforcement.approvedBy === testAdminUser.email, "7.9 Approver email recorded in audit trail");
        console.log("\n--- 8. Lifecycle Transitions & State Machine Validation ---");
        // Invalid transition jump test: APPROVED -> COMPLETED directly (must go through SUBMITTED)
        let invalidJumpBlocked = false;
        try {
            await enforcementService_1.enforcementService.completeEnforcement(createdEnforcement.id, testAdminUser, "Attempt direct completion");
        }
        catch (err) {
            invalidJumpBlocked = true;
            assert(err.code === "INVALID_STATUS_TRANSITION", "8.1 Invalid state jump (APPROVED -> COMPLETED) rejected", err.message);
        }
        assert(invalidJumpBlocked, "8.2 Strict state machine transitions enforced");
        // APPROVED -> SUBMITTED
        const submittedEnforcement = await enforcementService_1.enforcementService.submitEnforcement(createdEnforcement.id, testAdminUser, "DMCA-CLOUDFLARE-TKT-99182", "Dispatched via automated DMCA intake bridge", `CORR-SUBMIT-${testSuffix}`);
        assert(submittedEnforcement.status === "SUBMITTED", "8.3 Enforcement moved to SUBMITTED", submittedEnforcement.status);
        assert(submittedEnforcement.submissionReference === "DMCA-CLOUDFLARE-TKT-99182", "8.4 External submission reference recorded");
        // SUBMITTED -> COMPLETED
        const completedEnforcement = await enforcementService_1.enforcementService.completeEnforcement(createdEnforcement.id, testAdminUser, "Takedown notice acknowledged and pirated streams terminated by CDN host", `CORR-COMPLETE-${testSuffix}`);
        assert(completedEnforcement.status === "COMPLETED", "8.5 Enforcement successfully reached COMPLETED terminal state", completedEnforcement.status);
        assert(completedEnforcement.completedAt !== null, "8.6 completedAt timestamp populated");
        // Test rejection flow on a separate enforcement
        const rejEnforcement = await enforcementService_1.enforcementService.createEnforcement({
            caseId: testCaseId,
            title: "Second Enforcement for Rejection Lifecycle Test",
            actionType: "LEGAL_CEASE_DESIST",
            actor: testStaffUserA,
        });
        await enforcementService_1.enforcementService.submitForReview(rejEnforcement.id, testStaffUserA);
        const rejected = await enforcementService_1.enforcementService.processApproval(rejEnforcement.id, "REJECT", testAdminUser, undefined, "Insufficient external proof of commercial distribution", `CORR-REJECT-${testSuffix}`);
        assert(rejected.status === "REJECTED", "8.7 Enforcement moved to REJECTED on disapproval", rejected.status);
        assert(rejected.rejectionReason?.includes("Insufficient") === true, "8.8 Rejection reason stored in record");
        console.log("\n--- 9. Audit Logging & Correlation Tracking ---");
        assert(completedEnforcement.timeline.length >= 5, "9.1 Complete audit timeline recorded across all lifecycle events", `Count: ${completedEnforcement.timeline.length}`);
        const timelineEventTypes = completedEnforcement.timeline.map((t) => t.eventType);
        assert(timelineEventTypes.includes("ENFORCEMENT_CREATED"), "9.2 Recorded ENFORCEMENT_CREATED timeline event");
        assert(timelineEventTypes.includes("SUBMITTED_FOR_REVIEW"), "9.3 Recorded SUBMITTED_FOR_REVIEW timeline event");
        assert(timelineEventTypes.includes("ACTION_APPROVED"), "9.4 Recorded ACTION_APPROVED timeline event");
        assert(timelineEventTypes.includes("ENFORCEMENT_SUBMITTED"), "9.5 Recorded ENFORCEMENT_SUBMITTED timeline event");
        assert(timelineEventTypes.includes("ENFORCEMENT_COMPLETED"), "9.6 Recorded ENFORCEMENT_COMPLETED timeline event");
        // Verify correlationId in investigation case timeline events
        const caseTimeline = await database_1.prisma.investigationTimelineEvent.findMany({
            where: { caseId: testCaseId },
        });
        const hasEnforcementEvents = caseTimeline.some((t) => t.eventType.includes("ENFORCEMENT"));
        assert(hasEnforcementEvents, "9.7 Investigation Case timeline integrated with enforcement lifecycle events");
        // ----------------------------------------------------------------
        // CLEANUP
        // ----------------------------------------------------------------
        console.log("\n--- Cleaning up test fixtures ---");
        await database_1.prisma.investigationEvidenceLink.deleteMany({ where: { caseId: testCaseId } }).catch(() => { });
        await database_1.prisma.investigationTimelineEvent.deleteMany({ where: { caseId: { in: [testCaseId, testClosedCaseId] } } }).catch(() => { });
        await database_1.prisma.investigationStatusHistory.deleteMany({ where: { caseId: { in: [testCaseId, testClosedCaseId] } } }).catch(() => { });
        await database_1.prisma.investigationCase.deleteMany({ where: { id: { in: [testCaseId, testClosedCaseId] } } }).catch(() => { });
        await database_1.prisma.evidenceRecord.deleteMany({ where: { id: testEvidenceId } }).catch(() => { });
        await database_1.prisma.user.deleteMany({ where: { id: { in: [testAdminUser.id, testStaffUserA.id, testStaffUserB.id] } } }).catch(() => { });
        await database_1.prisma.show.deleteMany({ where: { id: testShowId } }).catch(() => { });
        await database_1.prisma.screen.deleteMany({ where: { id: testScreenId } }).catch(() => { });
        await database_1.prisma.movie.deleteMany({ where: { id: testMovieId } }).catch(() => { });
        await database_1.prisma.theatre.deleteMany({ where: { id: { in: [testTheatreAId, testTheatreBId] } } }).catch(() => { });
    }
    catch (err) {
        console.error("Test execution encountered fatal error:", err);
        totalTests++;
        failedTests++;
    }
    console.log("\n==================================================================");
    console.log(`📊 PHASE 27 ENFORCEMENT TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log("==================================================================\n");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runPhase27EnforcementTests().catch((e) => {
    console.error("Fatal exception during test run:", e);
    process.exit(1);
});
