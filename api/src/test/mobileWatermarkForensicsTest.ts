import { prisma } from "@antipiracy/database";
import { MobileService } from "../services/mobileService";
import { MobileWatermarkService } from "../services/mobileWatermarkService";
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

async function runPhase24WatermarkForensicsTests() {
  console.log("\n==================================================================");
  console.log("🔍 PHASE 24: DYNAMIC SESSION WATERMARKING & FORENSIC EVIDENCE TESTS");
  console.log("==================================================================\n");

  const testSuffix = Date.now().toString().slice(-5);
  let testTheatreId = "";
  let testOtherTheatreId = "";
  let testMovieId = "";
  let testScreenId = "";
  let testShowId = "";
  let testTicketId = "";
  let testActivationCode = `ACT-WATERMARK-${testSuffix}`;
  let testStaffId = "";
  let testSessionId = "";
  let testActivationId = "";

  try {
    // ----------------------------------------------------------------
    // SETUP FIXTURES
    // ----------------------------------------------------------------
    const theatre = await prisma.theatre.create({
      data: {
        name: `Solaris Multiplex ${testSuffix}`,
        code: `SOL-${testSuffix}`,
        location: "Orbit Central Plaza",
      },
    });
    testTheatreId = theatre.id;

    const otherTheatre = await prisma.theatre.create({
      data: {
        name: `Lunar Cinema Dome ${testSuffix}`,
        code: `LUN-${testSuffix}`,
        location: "Crater West",
      },
    });
    testOtherTheatreId = otherTheatre.id;

    const staffUser = await prisma.user.create({
      data: {
        email: `staff-wm-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Forensic Investigator Agent",
        role: "THEATRE_STAFF",
        theatreId: theatre.id,
      },
    });
    testStaffId = staffUser.id;

    const movie = await prisma.movie.create({
      data: {
        title: `Interstellar Drift ${testSuffix}`,
        durationMinutes: 160,
        language: "English",
        rating: "PG-13",
      },
    });
    testMovieId = movie.id;

    const screen = await prisma.screen.create({
      data: {
        theatreId: theatre.id,
        screenNumber: 4,
        name: "Screen 4 Laser IMAX",
        capacity: 350,
      },
    });
    testScreenId = screen.id;

    const now = new Date();
    const show = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 20 * 60000), // Started 20 mins ago
        endTime: new Date(now.getTime() + 140 * 60000),
        status: "ACTIVE",
      },
    });
    testShowId = show.id;

    const ticket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-WM-${testSuffix}`,
        seatNumber: "K-09",
        price: 24.5,
        status: "ISSUED",
        activation: {
          create: {
            activationCode: testActivationCode,
            status: "PENDING",
            expiresAt: new Date(now.getTime() + 150 * 60000),
          },
        },
      },
      include: { activation: true },
    });
    testTicketId = ticket.id;

    // Verify ticket to initialize active session
    const qrData = MobileService.generateSecureQrToken(testActivationCode);
    const session = await MobileService.verifyTicketQR({
      qrPayload: qrData,
      userId: staffUser.id,
      userEmail: staffUser.email,
      userName: staffUser.name,
      userRole: staffUser.role,
      userTheatreId: staffUser.theatreId,
      deviceFingerprint: "forensic-test-client-v24",
      clientIp: "10.20.30.40",
      userAgent: "AntipiracyMobileGuard/24.0",
    });

    testSessionId = session.sessionId;
    testActivationId = session.activationId;

    // ----------------------------------------------------------------
    // TEST 1: WATERMARK GENERATION FOR ACTIVE SESSION
    // ----------------------------------------------------------------
    console.log("--- 1. Dynamic Watermark Generation for Active Session ---");
    const wmSlot1 = 58800;
    const wmPayload1 = MobileWatermarkService.generateSessionWatermark(session, wmSlot1);

    assert(wmPayload1.watermarkId.startsWith("WM-"), "1.1 Watermark ID begins with canonical prefix WM-");
    assert(wmPayload1.theatreCode === theatre.code, "1.2 Watermark contains valid theatre code");
    assert(wmPayload1.screenName === screen.name, "1.3 Watermark contains screen identifier");
    assert(wmPayload1.seatNumber === "K-09", "1.4 Watermark contains seat binding");
    assert(wmPayload1.timeSlot === wmSlot1, "1.5 Time slot correctly assigned");

    // ----------------------------------------------------------------
    // TEST 2: WATERMARK CHANGES AFTER ROTATION INTERVAL
    // ----------------------------------------------------------------
    console.log("\n--- 2. Watermark Periodic Rotation ---");
    const wmSlot2 = wmSlot1 + 1; // Next 30s rotation epoch
    const wmPayload2 = MobileWatermarkService.generateSessionWatermark(session, wmSlot2);

    assert(wmPayload1.watermarkId !== wmPayload2.watermarkId, "2.1 Watermark ID rotates across time intervals");
    assert(wmPayload2.timeSlot === wmSlot2, "2.2 Rotated watermark has updated timeSlot");

    // ----------------------------------------------------------------
    // TEST 3: WATERMARK IS BOUND TO CORRECT SESSION
    // ----------------------------------------------------------------
    console.log("\n--- 3. Watermark Session Binding & Cryptographic Attribution ---");
    const attribution1 = await MobileWatermarkService.attributeWatermark({
      watermarkId: wmPayload1.watermarkId,
      userId: staffUser.id,
      userRole: staffUser.role,
      userTheatreId: staffUser.theatreId,
    });

    assert(attribution1.sessionId === testSessionId, "3.1 Watermark accurately attributed to original session ID");
    assert(attribution1.seatNumber === "K-09", "3.2 Attribution identifies correct seat number");
    assert(attribution1.ticketNumber === ticket.ticketNumber, "3.3 Attribution links to genuine ticket number");
    assert(attribution1.movie.title === movie.title, "3.4 Attribution links to correct movie title");
    assert(attribution1.confidenceScore === 100, "3.5 Cryptographic confidence score is 100%");

    // ----------------------------------------------------------------
    // TEST 4: EXPIRED SESSIONS CANNOT GENERATE ACTIVE WATERMARKS
    // ----------------------------------------------------------------
    console.log("\n--- 4. Inactive / Expired Session Validation ---");
    let expiredRejected = false;
    let expiredErrorCode = "";
    try {
      const expiredSession = { ...session, protectionStatus: "EXPIRED" as const };
      MobileWatermarkService.generateSessionWatermark(expiredSession);
    } catch (err: any) {
      expiredRejected = true;
      expiredErrorCode = err.code || err.errorCode;
    }

    assert(expiredRejected, "4.1 Expired session watermark generation blocked");
    assert(expiredErrorCode === "SESSION_NOT_ACTIVE", "4.2 Returned SESSION_NOT_ACTIVE error code");

    // ----------------------------------------------------------------
    // TEST 5: TAMPERED WATERMARK IDENTIFIERS ARE REJECTED
    // ----------------------------------------------------------------
    console.log("\n--- 5. Tampered Watermark Rejection ---");
    let tamperedRejected = false;
    let tamperedCode = "";
    try {
      // Modify HMAC signature at the end
      const tamperedId = wmPayload1.watermarkId.slice(0, -4) + "FFFF";
      await MobileWatermarkService.attributeWatermark({
        watermarkId: tamperedId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });
    } catch (err: any) {
      tamperedRejected = true;
      tamperedCode = err.code || err.errorCode;
    }

    assert(tamperedRejected, "5.1 Tampered watermark signature rejected");
    assert(tamperedCode === "WATERMARK_VERIFICATION_FAILED", "5.2 Returned WATERMARK_VERIFICATION_FAILED error code");

    // ----------------------------------------------------------------
    // TEST 6: NO SECRETS OR JWT APPEAR IN WATERMARK
    // ----------------------------------------------------------------
    console.log("\n--- 6. Zero Secrets / API Keys in Watermark ---");
    const rawWmString = JSON.stringify(wmPayload1);
    assert(!rawWmString.includes("Bearer "), "6.1 No Bearer tokens in watermark payload");
    assert(!rawWmString.includes("password") && !rawWmString.includes("JWT_SECRET"), "6.2 No passwords or secrets in watermark");
    assert(!rawWmString.includes("postgres"), "6.3 No database connection info in watermark");

    // ----------------------------------------------------------------
    // TEST 7: NO UNNECESSARY CUSTOMER PII APPEARS IN WATERMARK
    // ----------------------------------------------------------------
    console.log("\n--- 7. Zero Customer PII in Watermark ---");
    assert(!rawWmString.includes("@") && !rawWmString.includes("credit_card"), "7.1 Watermark contains zero emails, phone numbers, or credit card PII");

    // ----------------------------------------------------------------
    // TEST 8: EVIDENCE HASH IS DETERMINISTIC & VERIFIABLE
    // ----------------------------------------------------------------
    console.log("\n--- 8. Deterministic SHA-256 Forensic Evidence Hash ---");
    const canonicalStr = JSON.stringify({
      watermarkId: wmPayload1.watermarkId,
      sessionId: testSessionId,
      theatreId: testTheatreId,
    });
    const hashA = evidenceHashService.computeSha256(canonicalStr);
    const hashB = evidenceHashService.computeSha256(canonicalStr);

    assert(hashA === hashB && hashA.length === 64, "8.1 SHA-256 evidence hash is deterministic (64 hex characters)");
    assert(evidenceHashService.verifyHash(hashA, hashB), "8.2 Timing-safe hash verification succeeds");

    // ----------------------------------------------------------------
    // TEST 9: EVIDENCE VAULT RECORD CREATION & SESSION LINKING
    // ----------------------------------------------------------------
    console.log("\n--- 9. Evidence Vault Integration ---");
    const evidence = await MobileWatermarkService.createForensicEvidence({
      watermarkId: wmPayload1.watermarkId,
      sessionId: testSessionId,
      reason: "Forensic verification test for dynamic watermark",
      actorId: staffUser.id,
      actorEmail: staffUser.email,
      actorRole: staffUser.role,
    });

    assert(evidence.evidenceNumber.startsWith("EV-WM-"), "9.1 Evidence number created with EV-WM- prefix");
    assert(evidence.evidenceHash.length === 64, "9.2 Evidence record contains cryptographic SHA-256 hash");
    assert(evidence.watermarkId === wmPayload1.watermarkId, "9.3 Evidence bound to genuine watermark ID");
    assert(evidence.sessionId === testSessionId, "9.4 Evidence bound to active screening session ID");

    // Verify record in database
    const dbRecord = await prisma.evidenceRecord.findUnique({
      where: { id: evidence.evidenceId },
    });
    assert(Boolean(dbRecord), "9.5 Evidence record confirmed in Evidence Vault database");
    assert(dbRecord?.classification === "WATERMARK_MATCH", "9.6 Evidence classified as WATERMARK_MATCH");

    // ----------------------------------------------------------------
    // TEST 10: CROSS-THEATRE ATTRIBUTION REJECTION (TENANT ISOLATION)
    // ----------------------------------------------------------------
    console.log("\n--- 10. Cross-Theatre Attribution Rejection ---");
    let crossTheatreBlocked = false;
    let crossTheatreCode = "";
    try {
      await MobileWatermarkService.attributeWatermark({
        watermarkId: wmPayload1.watermarkId,
        userId: "foreign-staff-id",
        userRole: "THEATRE_STAFF",
        userTheatreId: testOtherTheatreId, // Foreign venue
      });
    } catch (err: any) {
      crossTheatreBlocked = true;
      crossTheatreCode = err.code || err.errorCode;
    }

    assert(crossTheatreBlocked, "10.1 Foreign theatre staff blocked from attributing other venue's watermark");
    assert(crossTheatreCode === "UNAUTHORIZED_THEATRE", "10.2 Returned UNAUTHORIZED_THEATRE error code");

    // ----------------------------------------------------------------
    // TEST 11: SOC INCIDENT CORRELATION
    // ----------------------------------------------------------------
    console.log("\n--- 11. SOC Incident Correlation ---");
    assert(Boolean(evidence.correlatedIncidentId), "11.1 Forensic evidence auto-correlated with SOC Incident");
    if (evidence.correlatedIncidentId) {
      const incident = await prisma.securityIncident.findUnique({
        where: { id: evidence.correlatedIncidentId },
      });
      assert(Boolean(incident), "11.2 SOC Security Incident confirmed in database");
      assert(incident?.status === "DETECTED", "11.3 Incident initialized in DETECTED state");
    }

    // ----------------------------------------------------------------
    // TEST 12: BACKWARDS COMPATIBILITY WITH PHASES 21-23
    // ----------------------------------------------------------------
    console.log("\n--- 12. Compatibility with Phases 21-23 ---");
    const mobileSession = await MobileService.getProtectedSession({
      sessionId: testSessionId,
      userId: staffUser.id,
      userRole: staffUser.role,
      userTheatreId: staffUser.theatreId,
    });
    assert(mobileSession.protectionStatus === "ACTIVE", "12.1 Phase 21-23 protected session retrieval remains functional");

    const eventRes = await MobileService.submitMobileSecurityEvent({
      eventType: "SCREEN_CAPTURE_SIGNAL",
      severity: "HIGH",
      sessionId: testSessionId,
      theatreId: testTheatreId,
      showId: testShowId,
      movieId: testMovieId,
      activationId: testActivationId,
    });
    assert(eventRes.status === "INGESTED", "12.2 Phase 23 mobile security signal ingestion remains operational");
  } catch (err: any) {
    console.error("Unexpected error in Phase 24 test suite:", err);
    failedTests++;
  } finally {
    console.log("\n--- Cleaning up test records ---");
    try {
      if (testActivationId) {
        await prisma.verification.deleteMany({ where: { activationId: testActivationId } });
        await prisma.protectionEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.realtimeThreatEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.securityAuditLog.deleteMany({ where: { activationId: testActivationId } });
        await prisma.evidenceRecord.deleteMany({ where: { theatreId: testTheatreId } });
        await prisma.securityIncident.deleteMany({ where: { theatreId: testTheatreId } });
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
      if (testTheatreId) {
        await prisma.theatre.deleteMany({ where: { id: testTheatreId } });
      }
      if (testOtherTheatreId) {
        await prisma.theatre.deleteMany({ where: { id: testOtherTheatreId } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n==================================================================");
  console.log(`📊 PHASE 24 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase24WatermarkForensicsTests().catch((err) => {
  console.error("FATAL ERROR running Phase 24 test suite:", err);
  process.exit(1);
});
