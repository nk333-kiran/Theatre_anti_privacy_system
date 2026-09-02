import { prisma } from "@antipiracy/database";
import { evidenceHashService } from "../services/evidence/evidenceHashService";
import { chainOfCustodyService, ChainOfCustodyService } from "../services/evidence/chainOfCustodyService";
import { evidenceIntegrityService } from "../services/evidence/evidenceIntegrityService";
import { retentionPolicyService } from "../services/evidence/retentionPolicyService";

async function runEvidenceIntegrityTests() {
  console.log("\n==================================================================");
  console.log("🔒 PHASE 17: EVIDENCE INTEGRITY & CHAIN OF CUSTODY TEST SUITE");
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

  // Prerequisite theatre and movie
  const testTheatre = await prisma.theatre.create({
    data: {
      name: "Forensic Integrity Cinema",
      code: `EV-THTR-${Date.now()}`,
      location: "Metropolis",
    },
  });

  const testMovie = await prisma.movie.create({
    data: {
      title: "Forensic Case Masterpiece",
      durationMinutes: 120,
      language: "English",
    },
  });

  // 1. SHA-256 HASH COMPUTATION & CANONICAL RECORD HASHING
  try {
    const rawPayload = JSON.stringify({ watermarkId: "WM-9901-XYZ", seat: "B-12", frame: 4500 });
    const hash1 = evidenceHashService.computeSha256(rawPayload);
    const hash2 = evidenceHashService.computeSha256(rawPayload);
    assert("1. Deterministic SHA-256 hash calculation", hash1 === hash2 && hash1.length === 64);

    const canonicalHash = evidenceHashService.computeEvidenceRecordHash({
      evidenceNumber: "EV-TEST-001",
      classification: "WATERMARK_MATCH",
      source: "FORENSIC_CAMERA_SCANNER",
      metadata: rawPayload,
      theatreId: testTheatre.id,
      movieId: testMovie.id,
      createdAt: new Date("2026-08-29T10:00:00Z"),
    });
    assert("1. Canonical Evidence Record SHA-256 calculated", !!canonicalHash && canonicalHash.length === 64);
  } catch (err: any) {
    assert("Hash computation tests", false, err.message);
  }

  // 2. EVIDENCE RECORD & ARTIFACT CREATION WITH GENESIS CHAIN BLOCK
  let createdEvidenceId = "";
  try {
    const evidenceNum = `EV-${Date.now().toString().slice(-6)}`;
    const metadataStr = JSON.stringify({ device: "CinemaSensor_V4", confidence: 99 });
    const createdAt = new Date();

    const initialRecord = await prisma.evidenceRecord.create({
      data: {
        evidenceNumber: evidenceNum,
        title: "Forensic Watermark Capture at Screen 1",
        classification: "WATERMARK_MATCH",
        severity: "CRITICAL",
        status: "COLLECTED",
        retentionStatus: "ACTIVE",
        theatreId: testTheatre.id,
        movieId: testMovie.id,
        source: "AUDITORIUM_SENSOR",
        capturedBy: "sensor_agent_01",
        metadata: metadataStr,
      },
    });
    createdEvidenceId = initialRecord.id;

    const record = (await prisma.evidenceRecord.findUnique({ where: { id: initialRecord.id } }))!;

    const recordHash = evidenceHashService.computeEvidenceRecordHash({
      evidenceNumber: record.evidenceNumber,
      classification: record.classification,
      source: record.source,
      metadata: record.metadata,
      theatreId: record.theatreId,
      movieId: record.movieId,
      showId: record.showId,
      createdAt: record.createdAt,
    });

    await prisma.evidenceRecord.update({
      where: { id: record.id },
      data: { integrityHash: recordHash },
    });

    // Artifact
    const payloadSnippet = JSON.stringify({ watermarkCode: "LEAK-WM-449102", audioSync: true });
    const artifactHash = evidenceHashService.computeSha256(payloadSnippet);
    await prisma.evidenceArtifact.create({
      data: {
        evidenceRecordId: record.id,
        artifactName: "watermark_capture_frame.json",
        artifactType: "WATERMARK_TAG",
        mimeType: "application/json",
        fileSizeBytes: Buffer.byteLength(payloadSnippet),
        sha256Hash: artifactHash,
        payloadData: payloadSnippet,
      },
    });

    // Genesis Block
    const genesisEvent = await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: record.id,
      eventType: "ACQUISITION",
      actorId: "sensor_agent_01",
      actorRole: "AGENT",
      actorEmail: "sensor@theatre.internal",
      eventData: { evidenceNumber: evidenceNum, initialHash: recordHash },
    });

    assert("2. Evidence record created with verified integrity hash", recordHash.length === 64);
    assert("2. Genesis chain block initialized with previousHash=0000...", genesisEvent.previousChainHash === ChainOfCustodyService.GENESIS_CHAIN_HASH);
    assert("2. Current chain block hash computed correctly", !!genesisEvent.currentChainHash);
  } catch (err: any) {
    assert("Evidence creation tests", false, err.message);
  }

  // 3. CHAIN OF CUSTODY CONTINUITY & INTEGRITY VERIFICATION
  try {
    // Append 2 more chain events (Inspection + Export)
    await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: createdEvidenceId,
      eventType: "ANALYST_ACCESS",
      actorId: "analyst_01",
      actorRole: "ADMIN",
      actorEmail: "soc-analyst@studio.com",
      eventData: { action: "Detailed frame spectral analysis" },
    });

    await chainOfCustodyService.appendChainEvent({
      evidenceRecordId: createdEvidenceId,
      eventType: "INTEGRITY_CHECK",
      actorId: "system_daemon",
      actorRole: "SYSTEM",
      actorEmail: "daemon@antipiracy.system",
      eventData: { scanStatus: "CLEAN" },
    });

    const chainVerification = await chainOfCustodyService.verifyChainOfCustody(createdEvidenceId);
    assert(
      "3. Cryptographic chain continuity verified (3 linked blocks)",
      chainVerification.isValid && chainVerification.totalEvents === 3,
      chainVerification.details
    );

    const fullVerification = await evidenceIntegrityService.verifyEvidenceRecord(createdEvidenceId);
    if (!fullVerification.isValid) {
      console.log("DEBUG TEST 3 fullVerification:", JSON.stringify(fullVerification, null, 2));
    }
    assert(
      "3. Full forensic integrity verification passed (Record + Artifacts + Chain)",
      fullVerification.isValid && !fullVerification.tamperDetected,
      fullVerification.details?.join("; ")
    );
  } catch (err: any) {
    assert("Chain verification tests", false, err.message);
  }

  // 4. TAMPER DETECTION & THREAT TRIGGER
  try {
    // Deliberately tamper with artifact data
    const artifact = await prisma.evidenceArtifact.findFirst({
      where: { evidenceRecordId: createdEvidenceId },
    });

    if (artifact) {
      // Modify payload in DB out-of-band
      await prisma.evidenceArtifact.update({
        where: { id: artifact.id },
        data: { payloadData: JSON.stringify({ tampered: true, watermarkCode: "ALTERED" }) },
      });

      const tamperResult = await evidenceIntegrityService.verifyEvidenceRecord(createdEvidenceId);
      if (!tamperResult.tamperDetected) {
        console.log("DEBUG TEST 4 tamperResult:", JSON.stringify(tamperResult, null, 2));
      }
      assert("4. Tamper detection catches modified artifact payload", tamperResult.tamperDetected && !tamperResult.isValid);

      const updatedRecord = await prisma.evidenceRecord.findUnique({
        where: { id: createdEvidenceId },
      });
      assert(
        "4. Evidence record status transitioned to FLAGGED_TAMPERED",
        updatedRecord?.status === "FLAGGED_TAMPERED",
        `Expected FLAGGED_TAMPERED, but got ${updatedRecord?.status}`
      );
    }
  } catch (err: any) {
    assert("Tamper detection tests", false, err.message);
  }

  // 5. LEGAL HOLD SAFEGUARD
  try {
    const holdRecord = await retentionPolicyService.applyLegalHold({
      evidenceId: createdEvidenceId,
      reason: "Pending cross-border anti-piracy litigation",
      actor: { id: "admin_legal", role: "ADMIN", email: "legal@studio.com" },
    });

    assert("5. Legal Hold applied successfully", holdRecord.retentionStatus === "LEGAL_HOLD" && holdRecord.status === "LEGAL_HOLD");

    const releaseRecord = await retentionPolicyService.releaseLegalHold(
      createdEvidenceId,
      { id: "admin_legal", role: "ADMIN", email: "legal@studio.com" },
      "Litigation concluded"
    );

    assert("5. Legal Hold released successfully and status restored", releaseRecord.retentionStatus !== "LEGAL_HOLD");
  } catch (err: any) {
    assert("Legal hold tests", false, err.message);
  }

  // Cleanup
  try {
    await prisma.evidenceAccessLog.deleteMany({ where: { evidenceRecordId: createdEvidenceId } });
    await prisma.evidenceChainEvent.deleteMany({ where: { evidenceRecordId: createdEvidenceId } });
    await prisma.evidenceHash.deleteMany({ where: { evidenceRecordId: createdEvidenceId } });
    await prisma.evidenceArtifact.deleteMany({ where: { evidenceRecordId: createdEvidenceId } });
    await prisma.evidenceRecord.deleteMany({ where: { id: createdEvidenceId } });
    await prisma.movie.delete({ where: { id: testMovie.id } });
    await prisma.theatre.delete({ where: { id: testTheatre.id } });
  } catch (_) {}

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 17 EVIDENCE INTEGRITY RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runEvidenceIntegrityTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
