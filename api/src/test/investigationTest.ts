import { prisma } from "@antipiracy/database";
import { investigationService } from "../services/evidence/investigationService";

async function runInvestigationTests() {
  console.log("\n==================================================================");
  console.log("🕵️ PHASE 17: INVESTIGATION & CASE MANAGEMENT TEST SUITE");
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

  // Create analyst user & theatre fixture
  const testAnalyst = await prisma.user.create({
    data: {
      email: `analyst_${Date.now()}@theatre.com`,
      passwordHash: "hash",
      name: "Special Agent Smith",
      role: "ADMIN",
    },
  });

  const testTheatre = await prisma.theatre.create({
    data: {
      name: "Case Test Cinema",
      code: `CASE-THTR-${Date.now()}`,
      location: "Metropolis",
    },
  });

  let createdCaseId = "";
  let testEvidenceId = "";

  // 1. CASE CREATION & WORKFLOW INITIALIZATION
  try {
    const newCase = await investigationService.createCase({
      title: "Suspicious Continuous Cam-Recording Detected",
      description: "Multiple watermark hits and screen capture attempts during evening show",
      severity: "HIGH",
      threatClassification: "PLAYBACK_PIRACY_ACTIVITY",
      theatreId: testTheatre.id,
      creator: { id: testAnalyst.id, role: "ADMIN", email: testAnalyst.email },
    });
    createdCaseId = newCase.id;

    assert("1. Case created with generated CASE-XXXX number", newCase.caseNumber.startsWith("CASE-"));
    assert("1. Initial status set to OPEN", newCase.status === "OPEN");

    const statusHistory = await prisma.investigationStatusHistory.findMany({
      where: { caseId: createdCaseId },
    });
    assert("1. Initial status history recorded", statusHistory.length >= 1 && statusHistory[0].toStatus === "OPEN");

    const timeline = await prisma.investigationTimelineEvent.findMany({
      where: { caseId: createdCaseId },
    });
    assert("1. Initial timeline event logged", timeline.length >= 1);
  } catch (err: any) {
    assert("Case creation tests", false, err.message);
  }

  // 2. CASE ASSIGNMENT
  try {
    const assigned = await investigationService.assignAnalyst(
      createdCaseId,
      testAnalyst.id,
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      "Assigned to lead investigator"
    );

    assert("2. Case assigned and automatically transitioned to TRIAGED", assigned.status === "TRIAGED" && assigned.assignedAnalystId === testAnalyst.id);

    const assignments = await prisma.investigationAssignment.findMany({
      where: { caseId: createdCaseId },
    });
    assert("2. Assignment audit record persisted", assignments.length >= 1 && assignments[0].analystId === testAnalyst.id);
  } catch (err: any) {
    assert("Case assignment tests", false, err.message);
  }

  // 3. INVESTIGATION NOTES & EVIDENCE LINKING
  try {
    // Create prerequisite evidence record
    const evidence = await prisma.evidenceRecord.create({
      data: {
        evidenceNumber: `EV-CASE-${Date.now()}`,
        title: "Screen 1 Watermark Payload",
        classification: "WATERMARK_MATCH",
        source: "WATERMARK_DECODER",
        theatreId: testTheatre.id,
      },
    });
    testEvidenceId = evidence.id;

    // Add note
    const note = await investigationService.addNote(
      createdCaseId,
      "Forensic decoder matches watermark token to Seat B-14 in Auditorium 1.",
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      true
    );
    assert("3. Analyst investigation note recorded", !!note.id && note.isInternal === true);

    // Link evidence
    const link = await investigationService.linkEvidence(
      createdCaseId,
      testEvidenceId,
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      "Primary audio-visual leak proof"
    );
    assert("3. Forensic evidence linked to case", !!link.id && link.evidenceRecordId === testEvidenceId);
  } catch (err: any) {
    assert("Notes and evidence tests", false, err.message);
  }

  // 4. STATUS LIFECYCLE & CLOSURE
  try {
    // Transition to INVESTIGATING
    await investigationService.updateCaseStatus(
      createdCaseId,
      "INVESTIGATING",
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      "Active forensic examination in progress"
    );

    // Transition to CONTAINED
    await investigationService.updateCaseStatus(
      createdCaseId,
      "CONTAINED",
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      "Stream terminated and token blacklisted"
    );

    // Close Case
    const closed = await investigationService.updateCaseStatus(
      createdCaseId,
      "CLOSED",
      { id: testAnalyst.id, email: testAnalyst.email, role: "ADMIN" },
      "Pirate transmission contained, evidence vaulted."
    );

    assert("4. Case closed with closure timestamp and reason", closed.status === "CLOSED" && !!closed.closedAt && !!closed.closureReason);

    const fullCase = await investigationService.getCaseById(createdCaseId);
    assert("4. Detailed case retrieves all relations (notes, evidence, timeline, history)", (fullCase?.notes.length ?? 0) >= 1 && (fullCase?.evidenceLinks.length ?? 0) >= 1 && (fullCase?.timelineEvents.length ?? 0) >= 4);
  } catch (err: any) {
    assert("Status lifecycle tests", false, err.message);
  }

  // Cleanup
  try {
    await prisma.investigationStatusHistory.deleteMany({ where: { caseId: createdCaseId } });
    await prisma.investigationTimelineEvent.deleteMany({ where: { caseId: createdCaseId } });
    await prisma.investigationEvidenceLink.deleteMany({ where: { caseId: createdCaseId } });
    await prisma.investigationNote.deleteMany({ where: { caseId: createdCaseId } });
    await prisma.investigationAssignment.deleteMany({ where: { caseId: createdCaseId } });
    await prisma.investigationCase.deleteMany({ where: { id: createdCaseId } });
    if (testEvidenceId) await prisma.evidenceRecord.delete({ where: { id: testEvidenceId } });
    await prisma.theatre.delete({ where: { id: testTheatre.id } });
    await prisma.user.delete({ where: { id: testAnalyst.id } });
  } catch (_) {}

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 17 INVESTIGATION RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runInvestigationTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
