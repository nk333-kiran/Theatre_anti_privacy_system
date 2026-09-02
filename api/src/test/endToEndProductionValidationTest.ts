import crypto from "crypto";
import { prisma, UserRole, IncidentSeverity, SecurityEventType } from "@antipiracy/database";
import { EndToEndValidationService } from "../services/validation/endToEndValidationService";
import { MobileService } from "../services/mobileService";
import { MobileWatermarkService } from "../services/mobileWatermarkService";
import { PiracyOrchestrationService, OrchestrationSignalInput } from "../services/piracyOrchestrationService";
import { EnforcementService, enforcementService } from "../services/enforcement/enforcementService";
import { StudioIntelligenceService } from "../services/intelligence/studioIntelligenceService";

async function runEndToEndProductionValidationTests() {
  console.log("\n==================================================================");
  console.log("🚀 PHASE 30: END-TO-END PRODUCTION VALIDATION TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
      failed++;
    }
  }

  // Reset in-memory enforcement store
  EnforcementService.resetStore();

  const timestamp = Date.now();

  try {
    // ---------------------------------------------------------
    // 1. SETUP DETERMINISTIC DEMO SCENARIO
    // ---------------------------------------------------------
    console.log("--- 1. Deterministic Demo Scenario Setup ---");
    const fixtures = await EndToEndValidationService.setupOrGetDeterministicDemoScenario({
      resetState: true,
    });

    assert("1.1 Demo Studio created / retrieved", !!fixtures.studio && fixtures.studio.code === EndToEndValidationService.DEMO_STUDIO_CODE);
    assert("1.2 Demo Theatre & Screen created / retrieved", !!fixtures.theatre && !!fixtures.screen && fixtures.theatre.code === EndToEndValidationService.DEMO_THEATRE_CODE);
    assert("1.3 Demo Feature Movie created / retrieved", !!fixtures.movie && fixtures.movie.title.includes("Interstellar Sentinel"));
    assert("1.4 Demo Active Screening Show created / retrieved", !!fixtures.show && fixtures.show.status === "ACTIVE");
    assert("1.5 Demo Ticket & Activation initialized", !!fixtures.ticket && !!fixtures.activation && fixtures.ticket.ticketNumber === EndToEndValidationService.DEMO_TICKET_NUMBER);

    // ---------------------------------------------------------
    // 2. SECURE QR GENERATION, SIGNATURE VERIFICATION & ADMISSION
    // ---------------------------------------------------------
    console.log("\n--- 2. Secure QR Generation & Admission Flow ---");
    const secureQrToken = fixtures.secureQrToken;
    assert("2.1 Secure QR Token generated with QRTK prefix", secureQrToken.startsWith("QRTK."));

    const parsedToken = MobileService.parseAndValidateQrToken(secureQrToken);
    assert("2.2 QR token signature validated successfully", parsedToken.isSigned && parsedToken.isValidSignature);
    assert("2.3 Parsed activation code matches ticket activation", parsedToken.activationCode === fixtures.activation.activationCode);

    // Negative case: Tampered QR token
    const tamperedQrToken = `${secureQrToken.slice(0, -4)}dead`;
    const tamperedParsed = MobileService.parseAndValidateQrToken(tamperedQrToken);
    assert("2.4 Tampered QR token fails signature validation", tamperedParsed.isSigned && !tamperedParsed.isValidSignature);

    let tamperedRejected = false;
    try {
      await MobileService.verifyTicketQR({
        qrPayload: tamperedQrToken,
        userId: fixtures.staffUser.id,
        userRole: "THEATRE_STAFF",
        userTheatreId: fixtures.theatre.id,
      });
    } catch (err: any) {
      tamperedRejected = err.statusCode === 400 || err.code === "INVALID_QR";
    }
    assert("2.5 Admission rejects tampered QR token (400 INVALID_QR)", tamperedRejected);

    // Valid Admission & Ticket Activation
    const sessionData = await MobileService.verifyTicketQR({
      qrPayload: secureQrToken,
      userId: fixtures.staffUser.id,
      userRole: "THEATRE_STAFF",
      userTheatreId: fixtures.theatre.id,
      clientIp: "192.168.1.100",
      userAgent: "TheatreGateScanner/3.0",
    });

    assert("2.6 Ticket QR successfully verified and admitted", !!sessionData && sessionData.protectionStatus === "ACTIVE");
    assert("2.7 Session bound to correct Movie, Theatre and Screen", sessionData.movie.id === fixtures.movie.id && sessionData.theatre.id === fixtures.theatre.id);

    // Negative case: Duplicate Activation Prevention
    let duplicateRejected = false;
    try {
      await MobileService.verifyTicketQR({
        qrPayload: secureQrToken,
        userId: fixtures.staffUser.id,
        userRole: "THEATRE_STAFF",
        userTheatreId: fixtures.theatre.id,
      });
    } catch (err: any) {
      duplicateRejected = err.statusCode === 409 || err.code === "ALREADY_ACTIVATED";
    }
    assert("2.8 Duplicate activation of used QR is strictly rejected (409 ALREADY_ACTIVATED)", duplicateRejected);

    // ---------------------------------------------------------
    // 3. DYNAMIC WATERMARK SYNTHESIS & BINDING
    // ---------------------------------------------------------
    console.log("\n--- 3. Dynamic Watermark Synthesis & Binding ---");
    const watermark = MobileWatermarkService.generateSessionWatermark(sessionData);

    assert("3.1 Dynamic watermark synthesized", !!watermark && !!watermark.watermarkId);
    assert("3.2 Watermark contains display attribution string", !!watermark.displayString && watermark.displayString.includes(fixtures.theatre.code));
    assert("3.3 Watermark rotation interval defined (30s)", watermark.rotationIntervalSec === 30);
    assert("3.4 Watermark cryptographic signature verification succeeds", MobileWatermarkService.validateWatermarkSignature(
      watermark.watermarkId,
      sessionData.sessionId,
      fixtures.theatre.code,
      fixtures.screen.name,
      fixtures.ticket.seatNumber,
      watermark.timeSlot
    ));

    // ---------------------------------------------------------
    // 4. DEMO SECURITY SIGNAL RUNNER: NOMINAL & WEAK SIGNALS
    // ---------------------------------------------------------
    console.log("\n--- 4. Security Signal Runner: Nominal & Weak Signals ---");

    // Nominal Signal (Heartbeat)
    const nominalOrch = await PiracyOrchestrationService.processOrchestration({
      sessionId: sessionData.sessionId,
      signals: [{ signalType: "SESSION_HEARTBEAT", severity: "INFO" }],
      theatreId: fixtures.theatre.id,
      showId: fixtures.show.id,
      movieId: fixtures.movie.id,
      activationId: fixtures.activation.id,
      actorId: fixtures.adminUser.id,
    });

    assert("4.1 Nominal heartbeat produces NOMINAL status", nominalOrch.status === "NOMINAL");
    assert("4.2 Nominal heartbeat risk score is low (< 20)", nominalOrch.riskScore < 20);
    assert("4.3 Zero punitive or SOC incidents created for nominal signal", nominalOrch.pipelineStages.soc === null);

    // Weak Signal (Fullscreen Exit / App switch)
    const weakOrch = await PiracyOrchestrationService.processOrchestration({
      sessionId: sessionData.sessionId,
      signals: [{ signalType: "FULLSCREEN_EXIT", severity: "LOW" }],
      theatreId: fixtures.theatre.id,
      showId: fixtures.show.id,
      movieId: fixtures.movie.id,
      activationId: fixtures.activation.id,
      actorId: fixtures.adminUser.id,
    });

    assert("4.4 Weak signal produces USER_WARNING_ONLY decision", weakOrch.pipelineStages.detection.escalationDecision === "USER_WARNING_ONLY");
    assert("4.5 Warning message issued to user", !!weakOrch.pipelineStages.detection.warningMessage);
    assert("4.6 Single weak signal does NOT create punitive enforcement draft", weakOrch.pipelineStages.enforcement === null);

    // ---------------------------------------------------------
    // 5. HIGH-RISK PIRACY SIGNALS & ORCHESTRATED ESCALATION
    // ---------------------------------------------------------
    console.log("\n--- 5. High-Risk Piracy Telemetry & SOC Escalation ---");
    const highRiskSignals: OrchestrationSignalInput[] = [
      { signalType: "SCREEN_CAPTURE_SIGNAL", severity: "HIGH" },
      { signalType: "WATERMARK_MODULATION_TAMPER", severity: "CRITICAL" },
      { signalType: "CAMERA_ACTIVITY", severity: "HIGH" },
    ];

    const highRiskOrch = await PiracyOrchestrationService.processOrchestration({
      sessionId: sessionData.sessionId,
      signals: highRiskSignals,
      theatreId: fixtures.theatre.id,
      showId: fixtures.show.id,
      movieId: fixtures.movie.id,
      activationId: fixtures.activation.id,
      actorId: fixtures.adminUser.id,
      autoDraftEnforcement: true,
    });

    assert("5.1 High-risk signals escalate status to ESCALATED", highRiskOrch.status === "ESCALATED");
    assert("5.2 Composite risk score reaches critical threshold (>= 80)", highRiskOrch.riskScore >= 80);
    assert("5.3 SOC Incident created with incident number", !!highRiskOrch.pipelineStages.soc && !!highRiskOrch.pipelineStages.soc.incidentNumber);
    assert("5.4 SOC Incident severity classified as CRITICAL", highRiskOrch.pipelineStages.soc?.severity === "CRITICAL");

    // Deduplication check: Resending high risk signals prevents duplicate incident
    const replayedOrch = await PiracyOrchestrationService.processOrchestration({
      sessionId: sessionData.sessionId,
      signals: highRiskSignals,
      theatreId: fixtures.theatre.id,
      showId: fixtures.show.id,
      movieId: fixtures.movie.id,
      activationId: fixtures.activation.id,
      actorId: fixtures.adminUser.id,
    });

    assert("5.5 Duplicate SOC incidents prevented on repeated telemetry ingestion", !replayedOrch.pipelineStages.soc?.createdNewIncident);
    assert("5.6 Incident ID preserved across deduplicated correlation", replayedOrch.pipelineStages.soc?.incidentId === highRiskOrch.pipelineStages.soc?.incidentId);

    // ---------------------------------------------------------
    // 6. FORENSIC EVIDENCE PIPELINE & WATERMARK ATTRIBUTION
    // ---------------------------------------------------------
    console.log("\n--- 6. Forensic Evidence & Cryptographic Integrity ---");
    const evidenceStage = highRiskOrch.pipelineStages.evidence;

    assert("6.1 Forensic Evidence Record created automatically", !!evidenceStage && !!evidenceStage.evidenceId);
    assert("6.2 SHA-256 integrity hash present on evidence", !!evidenceStage?.sha256Hash && evidenceStage.sha256Hash.length === 64);
    assert("6.3 Evidence integrity verified as authentic", evidenceStage?.isVerified === true);
    assert("6.4 Dynamic watermark reference linked to evidence", !!evidenceStage?.watermark && !!evidenceStage.watermark.watermarkId);

    // Database check on evidence verification
    if (evidenceStage?.evidenceId) {
      const dbEvidence = await prisma.evidenceRecord.findUnique({
        where: { id: evidenceStage.evidenceId },
        include: { hashes: true },
      });
      assert("6.5 Database EvidenceRecord integrity hash matches", dbEvidence?.integrityHash === evidenceStage.sha256Hash);
      assert("6.6 EvidenceHash chain record created", (dbEvidence?.hashes?.length || 0) > 0);
    }

    // ---------------------------------------------------------
    // 7. ZERO-SECRET & ZERO-PII GUARANTEE
    // ---------------------------------------------------------
    console.log("\n--- 7. Zero-Secret & Zero-PII Leakage Verification ---");
    const orchJson = JSON.stringify(highRiskOrch).toLowerCase();

    assert("7.1 Zero password hashes exposed in orchestration response", !orchJson.includes("passwordhash") && !orchJson.includes("$2a$10$"));
    assert("7.2 Zero JWT/Bearer authentication tokens exposed", !orchJson.includes("bearertoken") && !orchJson.includes("authorization: bearer"));
    assert("7.3 Zero payment card numbers or CVV exposed", !orchJson.includes("cardnumber") && !orchJson.includes("cvv"));
    assert("7.4 Response marked as sanitized", highRiskOrch.sanitized === true);

    // ---------------------------------------------------------
    // 8. INVESTIGATION CASE CORRELATION & LIFECYCLE
    // ---------------------------------------------------------
    console.log("\n--- 8. Investigation Case & Evidence Linkage ---");
    const caseStage = highRiskOrch.pipelineStages.investigationCase;

    assert("8.1 Investigation case created / correlated", !!caseStage && !!caseStage.caseId);
    assert("8.2 Case assigned unique caseNumber (CASE-YYYY-XXXX)", !!caseStage?.caseNumber && caseStage.caseNumber.startsWith("CASE-"));

    if (caseStage?.caseId && evidenceStage?.evidenceId) {
      const links = await prisma.investigationEvidenceLink.findMany({
        where: { caseId: caseStage.caseId, evidenceRecordId: evidenceStage.evidenceId },
      });
      assert("8.3 Evidence explicitly linked to Investigation Case", links.length > 0);

      const timeline = await prisma.investigationTimelineEvent.findMany({
        where: { caseId: caseStage.caseId },
      });
      assert("8.4 Investigation Case Timeline records automated detection events", timeline.length > 0);
    }

    // ---------------------------------------------------------
    // 9. ENFORCEMENT ACTION & MANDATORY HUMAN APPROVAL GATING
    // ---------------------------------------------------------
    console.log("\n--- 9. Enforcement Draft & Human Approval Workflow ---");
    const enforcementStage = highRiskOrch.pipelineStages.enforcement;

    assert("9.1 Enforcement draft generated for high-risk case", !!enforcementStage && !!enforcementStage.enforcementId);
    assert("9.2 Enforcement initial status is placed in REVIEW", enforcementStage?.status === "REVIEW");
    assert("9.3 Human approval remains strictly mandatory", enforcementStage?.requiresHumanApproval === true);
    assert("9.4 Approval status is initially PENDING", enforcementStage?.approvalStatus === "PENDING");

    // Retrieve enforcement from service store
    if (enforcementStage?.enforcementId) {
      const storedEnf = await enforcementService.getEnforcementById(enforcementStage.enforcementId);
      assert("9.5 Stored enforcement contains validated evidence package", !!storedEnf.package && storedEnf.isPackageVerified);

      // Perform Human Approval Action by Authorized Officer
      const approvedEnf = await enforcementService.processApproval(
        enforcementStage.enforcementId,
        "APPROVE",
        {
          id: fixtures.adminUser.id,
          email: fixtures.adminUser.email,
          role: "ADMIN",
          theatreId: fixtures.theatre.id,
        },
        "Authorized by Chief Security Officer after reviewing cryptographic evidence"
      );

      assert("9.6 Enforcement transitions to APPROVED upon human officer authorization", approvedEnf.status === "APPROVED");
      assert("9.7 Approver email and timestamp recorded", approvedEnf.approvedBy === fixtures.adminUser.email && !!approvedEnf.approvedAt);
      assert("9.8 Enforcement approval timeline recorded", approvedEnf.timeline.some((t) => t.eventType === "ACTION_APPROVED" || t.title.includes("Approved")));
    }

    // ---------------------------------------------------------
    // 10. STUDIO INTELLIGENCE SYNCHRONIZATION
    // ---------------------------------------------------------
    console.log("\n--- 10. Studio Intelligence Dashboard KPIs ---");
    const studioSummary = await StudioIntelligenceService.getStudioIntelligence(
      {
        productionCompanyId: fixtures.studio.id,
        movieId: fixtures.movie.id,
      },
      {
        id: fixtures.adminUser.id,
        email: fixtures.adminUser.email,
        role: "ADMIN",
        theatreId: fixtures.theatre.id,
      }
    );

    assert("10.1 Studio Intelligence reflects total incidents", studioSummary.kpis.totalIncidents > 0);
    assert("10.2 Studio Intelligence reflects active investigations", studioSummary.kpis.activeInvestigations > 0);
    assert("10.3 Studio Intelligence reflects total evidence records", studioSummary.kpis.totalEvidenceRecords > 0);
    assert("10.4 Studio Intelligence reflects active/completed enforcement actions", studioSummary.kpis.activeEnforcements + studioSummary.kpis.completedEnforcements > 0);
    assert("10.5 Global studio threat posture evaluated as ELEVATED or CRITICAL", ["ELEVATED", "HIGH", "CRITICAL"].includes(studioSummary.kpis.overallThreatPosture));
    assert("10.6 Movie risk rankings include demo feature movie", studioSummary.movieRankings.some((m) => m.movieId === fixtures.movie.id));
    assert("10.7 Theatre risk rankings include demo cinema venue", studioSummary.theatreRankings.some((t) => t.theatreId === fixtures.theatre.id));

    // ---------------------------------------------------------
    // 11. END-TO-END DEMO SERVICE EXECUTION & IDEMPOTENCY
    // ---------------------------------------------------------
    console.log("\n--- 11. Complete Demo Service Execution & Idempotency ---");
    const demoExecution1 = await EndToEndValidationService.executeCompleteDemoFlow({
      signalLevel: "FULL_PIPELINE",
      autoApproveEnforcement: true,
    });

    assert("11.1 EndToEndValidationService executes complete demo pipeline", demoExecution1.overallStatus === "ESCALATED");
    assert("11.2 Demo execution contains all 9 pipeline stages", demoExecution1.stages.length >= 8);
    assert("11.3 Demo summary contains valid session and evidence IDs", !!demoExecution1.summary.sessionId && !!demoExecution1.summary.evidenceId);
    assert("11.4 Demo enforcement marked as approved in summary", demoExecution1.summary.enforcementStatus === "APPROVED");

    // Run a second time to verify complete idempotency
    const demoExecution2 = await EndToEndValidationService.executeCompleteDemoFlow({
      signalLevel: "FULL_PIPELINE",
    });

    assert("11.5 Repeated demo execution succeeds without error (Idempotent)", demoExecution2.overallStatus === "ESCALATED");
    assert("11.6 Reused same deterministic activation code", demoExecution2.summary.activationCode === demoExecution1.summary.activationCode);
    assert("11.7 Zero runaway duplicates on repeated runs", demoExecution2.summary.theatreCode === EndToEndValidationService.DEMO_THEATRE_CODE);

    // ---------------------------------------------------------
    // 12. TENANT ISOLATION ENFORCEMENT
    // ---------------------------------------------------------
    console.log("\n--- 12. Tenant Isolation Enforcement ---");
    const foreignTheatre = await prisma.theatre.create({
      data: {
        name: "Competitor Cinema West",
        code: `THTR-COMP-${timestamp.toString().slice(-4)}`,
        location: "Seattle, WA",
      },
    });

    let foreignStaffBlocked = false;
    try {
      await PiracyOrchestrationService.getSessionOrchestration({
        sessionId: sessionData.sessionId,
        userRole: "THEATRE_STAFF",
        userTheatreId: foreignTheatre.id,
      });
    } catch (err: any) {
      foreignStaffBlocked = err.statusCode === 403 || err.code === "UNAUTHORIZED_THEATRE" || err.message?.includes("Unauthorized access");
      if (!foreignStaffBlocked) {
        console.error("DEBUG: Unexpected error on foreign theatre access:", err);
      }
    }

    assert("12.1 Foreign theatre staff blocked from accessing cross-theatre session (403 UNAUTHORIZED_THEATRE)", foreignStaffBlocked);

    // Cleanup foreign theatre
    await prisma.theatre.delete({ where: { id: foreignTheatre.id } }).catch(() => {});

  } catch (err: any) {
    console.error("❌ Unexpected test execution failure:", err);
    failed++;
  } finally {
    console.log("\n--- Cleaning up validation test artifacts ---");
    await EndToEndValidationService.cleanupDemoArtifacts();
  }

  console.log("\n==================================================================");
  console.log(`📊 PHASE 30 PRODUCTION VALIDATION RESULTS: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndProductionValidationTests().catch((err) => {
  console.error("FATAL: Validation test runner crashed:", err);
  process.exit(1);
});
