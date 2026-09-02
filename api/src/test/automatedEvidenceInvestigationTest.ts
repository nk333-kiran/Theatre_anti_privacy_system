import { prisma } from "@antipiracy/database";
import { MobileService } from "../services/mobileService";
import { AutomatedEvidenceService } from "../services/evidence/automatedEvidenceService";
import { investigationService } from "../services/evidence/investigationService";
import { evidenceHashService } from "../services/evidence/evidenceHashService";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
  }
}

async function runPhase26AutomatedEvidenceTests() {
  console.log("\n==================================================================");
  console.log("🔍 PHASE 26: REAL-TIME EVIDENCE CAPTURE & INVESTIGATION AUTOMATION");
  console.log("==================================================================\n");

  const testSuffix = Date.now().toString().slice(-5);
  let testTheatreId = "";
  let testForeignTheatreId = "";
  let testMovieId = "";
  let testScreenId = "";
  let testShowId = "";
  let testTicketId = "";
  let testActivationId = "";
  let testStaffId = "";
  let testForeignStaffId = "";
  let testSessionId = `SES-MOB-CYB-${testSuffix}-0001`;

  let createdCaseId = "";
  let generatedEvidenceId = "";

  try {
    // ----------------------------------------------------------------
    // SETUP FIXTURES
    // ----------------------------------------------------------------
    const theatreA = await prisma.theatre.create({
      data: {
        name: `Cyberia Star Multiplex ${testSuffix}`,
        code: `CYB-${testSuffix}`,
        location: "Grand Core Sector",
      },
    });
    testTheatreId = theatreA.id;

    const theatreB = await prisma.theatre.create({
      data: {
        name: `Foreign Plaza Cinema ${testSuffix}`,
        code: `FOR-${testSuffix}`,
        location: "District 9",
      },
    });
    testForeignTheatreId = theatreB.id;

    const movie = await prisma.movie.create({
      data: {
        title: `Neural Overdrive ${testSuffix}`,
        durationMinutes: 130,
        language: "English",
        rating: "PG-13",
      },
    });
    testMovieId = movie.id;

    const screen = await prisma.screen.create({
      data: {
        theatreId: theatreA.id,
        screenNumber: 1,
        name: "Screen 1 IMAX Laser",
        capacity: 350,
      },
    });
    testScreenId = screen.id;

    const now = new Date();
    const show = await prisma.show.create({
      data: {
        theatreId: theatreA.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 15 * 60000),
        endTime: new Date(now.getTime() + 115 * 60000),
        status: "ACTIVE",
      },
    });
    testShowId = show.id;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-P26-${testSuffix}`,
        seatNumber: "K-12",
        showId: show.id,
        price: 18.5,
        status: "ACTIVATED",
      },
    });
    testTicketId = ticket.id;

    const activation = await prisma.activation.create({
      data: {
        ticketId: ticket.id,
        activationCode: `ACT-P26-CODE-${testSuffix}`,
        status: "ACTIVE",
        activatedAt: now,
        expiresAt: new Date(now.getTime() + 120 * 60000),
      },
    });
    testActivationId = activation.id;

    const staffUser = await prisma.user.create({
      data: {
        email: `investigator-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Senior SOC Analyst",
        role: "THEATRE_STAFF",
        theatreId: theatreA.id,
      },
    });
    testStaffId = staffUser.id;

    const foreignStaff = await prisma.user.create({
      data: {
        email: `foreign-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Foreign Venue Staff",
        role: "THEATRE_STAFF",
        theatreId: theatreB.id,
      },
    });
    testForeignStaffId = foreignStaff.id;

    // ----------------------------------------------------------------
    // TEST 1: HIGH-RISK EVENT CREATES SOC INCIDENT & INVESTIGATION CASE
    // ----------------------------------------------------------------
    console.log("--- 1. Mobile Event Telemetry → SOC Incident & Automated Case ---");
    const correlationTraceId = `CORR-TRACE-${testSuffix}`;
    const mobileResult = await MobileService.submitMobileSecurityEvent({
      eventType: "SCREEN_CAPTURE_SIGNAL",
      severity: "HIGH",
      sessionId: testSessionId,
      theatreId: theatreA.id,
      showId: show.id,
      movieId: movie.id,
      activationId: activation.id,
      metadata: {
        seatNumber: ticket.seatNumber,
        screenName: screen.name,
        capturedFramesCount: 120,
      },
      actorId: staffUser.id,
      actorEmail: staffUser.email,
      actorRole: staffUser.role,
    });

    assert(Boolean(mobileResult.eventId), "1.1 Mobile security event ingested successfully");
    assert(Boolean(mobileResult.correlatedIncidentId), "1.2 SOC incident created automatically for high-risk signal");

    // Fetch the automatically created InvestigationCase
    const linkedCase = await prisma.investigationCase.findFirst({
      where: {
        theatreId: theatreA.id,
        description: { contains: testSessionId },
      },
      include: {
        evidenceLinks: {
          include: { evidenceRecord: true },
        },
        timelineEvents: true,
      },
    });

    assert(Boolean(linkedCase), "1.3 Investigation case created automatically for suspicious mobile telemetry");
    assert(linkedCase?.status === "OPEN" || linkedCase?.status === "TRIAGED", "1.4 Initial case status is OPEN / TRIAGED");
    assert(linkedCase?.severity === "HIGH", "1.5 Case severity correctly evaluated as HIGH");
    if (linkedCase) createdCaseId = linkedCase.id;

    // ----------------------------------------------------------------
    // TEST 2: DUPLICATE CASE PREVENTION
    // ----------------------------------------------------------------
    console.log("\n--- 2. Duplicate Case Prevention ---");
    // Submit a second suspicious event for the same active session
    await MobileService.submitMobileSecurityEvent({
      eventType: "CAMERA_ACTIVITY",
      severity: "HIGH",
      sessionId: testSessionId,
      theatreId: theatreA.id,
      showId: show.id,
      movieId: movie.id,
      activationId: activation.id,
      actorId: staffUser.id,
      actorEmail: staffUser.email,
    });

    const allMatchingCases = await prisma.investigationCase.findMany({
      where: {
        theatreId: theatreA.id,
        description: { contains: testSessionId },
      },
    });

    assert(allMatchingCases.length === 1, "2.1 Reused existing InvestigationCase without creating duplicate dossier");

    // ----------------------------------------------------------------
    // TEST 3 & 4: AUTOMATIC EVIDENCE PACKAGE & WATERMARK LINKAGE
    // ----------------------------------------------------------------
    console.log("\n--- 3 & 4. Automatic Evidence Package & Watermark Linkage ---");
    const reloadedCase = await prisma.investigationCase.findUnique({
      where: { id: createdCaseId },
      include: {
        evidenceLinks: {
          include: { evidenceRecord: true },
        },
        timelineEvents: true,
      },
    });

    const autoEvidenceLink = reloadedCase?.evidenceLinks.find(
      (l) => l.evidenceRecord.source === "AUTOMATED_EVIDENCE_ENGINE"
    );

    assert(Boolean(autoEvidenceLink), "3.1 Automated evidence package created and linked to case");
    if (autoEvidenceLink) generatedEvidenceId = autoEvidenceLink.evidenceRecord.id;

    const evidenceMetadata = JSON.parse(autoEvidenceLink?.evidenceRecord.metadata || "{}");
    assert(evidenceMetadata.screeningSession?.seatNumber === "K-12", "3.2 Seat attribution captured in evidence package");
    assert(Boolean(evidenceMetadata.watermarkReference?.watermarkId), "4.1 Watermark reference embedded in evidence package");
    assert(evidenceMetadata.watermarkReference?.watermarkId.startsWith("WM-"), "4.2 Watermark ID conforms to canonical format");

    // ----------------------------------------------------------------
    // TEST 5: SHA-256 DETERMINISTIC INTEGRITY VERIFICATION
    // ----------------------------------------------------------------
    console.log("\n--- 5. Deterministic SHA-256 Integrity Verification ---");
    const rawMetadataStr = autoEvidenceLink?.evidenceRecord.metadata || "";
    const expectedHash = evidenceHashService.computeSha256(rawMetadataStr);
    assert(autoEvidenceLink?.evidenceRecord.integrityHash === expectedHash, "5.1 Evidence record integrity hash matches SHA-256(metadata)");

    const integrityReport = await AutomatedEvidenceService.verifyCaseEvidenceIntegrity(createdCaseId);
    assert(integrityReport.isIntegrityValid === true, "5.2 AutomatedEvidenceService.verifyCaseEvidenceIntegrity reports 100% valid");
    assert(integrityReport.verifiedCount >= 1, "5.3 Verified evidence count >= 1");
    assert(integrityReport.tamperedCount === 0, "5.4 Zero tampered records detected");

    // ----------------------------------------------------------------
    // TEST 6: CASE TIMELINE AUTOMATION
    // ----------------------------------------------------------------
    console.log("\n--- 6. Investigation Case Timeline Events ---");
    const timelineEventTypes = reloadedCase?.timelineEvents.map((e) => e.eventType) || [];
    assert(timelineEventTypes.includes("CASE_CREATED"), "6.1 CASE_CREATED event recorded in timeline");
    assert(timelineEventTypes.includes("EVIDENCE_PACKAGE_CREATED"), "6.2 EVIDENCE_PACKAGE_CREATED event recorded in timeline");
    assert(timelineEventTypes.includes("WATERMARK_LINKED"), "6.3 WATERMARK_LINKED event recorded in timeline");
    assert(timelineEventTypes.includes("RISK_UPDATED"), "6.4 RISK_UPDATED event recorded in timeline");

    // ----------------------------------------------------------------
    // TEST 7: CORRELATION ID PROPAGATION
    // ----------------------------------------------------------------
    console.log("\n--- 7. Correlation ID Traceability ---");
    const timelineDescriptions = reloadedCase?.timelineEvents.map((e) => e.description) || [];
    const hasCorrelationTrace = timelineDescriptions.some((d) => d?.includes("CORR-"));
    assert(hasCorrelationTrace, "7.1 Trace correlation IDs propagated into investigation timeline descriptions");

    // ----------------------------------------------------------------
    // TEST 8: CROSS-THEATRE ISOLATION REJECTION
    // ----------------------------------------------------------------
    console.log("\n--- 8. Multi-Tenant Scoping & Cross-Theatre Rejection ---");
    let foreignAccessBlocked = false;
    let foreignCode = "";
    try {
      await investigationService.getCaseById(createdCaseId, {
        id: foreignStaff.id,
        role: foreignStaff.role,
        theatreId: foreignStaff.theatreId,
      });
    } catch (err: any) {
      foreignAccessBlocked = true;
      foreignCode = err.code;
    }
    assert(foreignAccessBlocked && foreignCode === "UNAUTHORIZED_THEATRE", "8.1 Foreign theatre staff blocked from accessing other venue's case (403 UNAUTHORIZED_THEATRE)");

    // ----------------------------------------------------------------
    // TEST 9: ZERO-SECRET & ZERO-PAYMENT PII PROTECTION
    // ----------------------------------------------------------------
    console.log("\n--- 9. Zero-Secret & Zero-Payment PII Protection ---");
    const rawCaseString = JSON.stringify(reloadedCase);
    assert(!rawCaseString.includes("passwordHash"), "9.1 Zero password hashes exposed in case metadata");
    assert(!rawCaseString.includes("Bearer "), "9.2 Zero Bearer auth tokens exposed in case metadata");
    assert(!rawCaseString.includes("credit_card") && !rawCaseString.includes("cvv"), "9.3 Zero payment card data exposed");

  } catch (err: any) {
    console.error("Unexpected error in Phase 26 test suite:", err);
    failedTests++;
  } finally {
    console.log("\n--- Cleaning up test records ---");
    try {
      if (createdCaseId) {
        await prisma.investigationEvidenceLink.deleteMany({ where: { caseId: createdCaseId } });
        await prisma.investigationTimelineEvent.deleteMany({ where: { caseId: createdCaseId } });
        await prisma.investigationNote.deleteMany({ where: { caseId: createdCaseId } });
        await prisma.investigationAssignment.deleteMany({ where: { caseId: createdCaseId } });
        await prisma.investigationStatusHistory.deleteMany({ where: { caseId: createdCaseId } });
        await prisma.investigationCase.deleteMany({ where: { id: createdCaseId } });
      }
      if (generatedEvidenceId) {
        await prisma.evidenceHash.deleteMany({ where: { evidenceRecordId: generatedEvidenceId } });
        await prisma.evidenceRecord.deleteMany({ where: { id: generatedEvidenceId } });
      }
      if (testActivationId) {
        await prisma.protectionEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.realtimeThreatEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.securityAuditLog.deleteMany({ where: { activationId: testActivationId } });
        await prisma.activation.deleteMany({ where: { id: testActivationId } });
      }
      if (testTicketId) {
        await prisma.ticket.deleteMany({ where: { id: testTicketId } });
      }
      if (testShowId) {
        await prisma.show.deleteMany({ where: { id: testShowId } });
      }
      if (testScreenId) {
        await prisma.screen.deleteMany({ where: { id: testScreenId } });
      }
      if (testMovieId) {
        await prisma.movie.deleteMany({ where: { id: testMovieId } });
      }
      if (testStaffId) {
        await prisma.user.deleteMany({ where: { id: testStaffId } });
      }
      if (testForeignStaffId) {
        await prisma.user.deleteMany({ where: { id: testForeignStaffId } });
      }
      if (testTheatreId) {
        await prisma.securityIncident.deleteMany({ where: { theatreId: testTheatreId } });
        await prisma.evidenceRecord.deleteMany({ where: { theatreId: testTheatreId } });
        await prisma.theatre.deleteMany({ where: { id: testTheatreId } });
      }
      if (testForeignTheatreId) {
        await prisma.theatre.deleteMany({ where: { id: testForeignTheatreId } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n==================================================================");
  console.log(`📊 PHASE 26 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase26AutomatedEvidenceTests().catch((err) => {
  console.error("FATAL ERROR running Phase 26 test suite:", err);
  process.exit(1);
});
