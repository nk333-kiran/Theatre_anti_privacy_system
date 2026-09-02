import { prisma } from "@antipiracy/database";
import { MobileService } from "../services/mobileService";

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

async function runPhase23AntiPiracyProtectionTests() {
  console.log("\n==================================================================");
  console.log("🛡️ PHASE 23: MOBILE ANTI-PIRACY PROTECTION & SOC DETECTION TESTS");
  console.log("==================================================================\n");

  const testSuffix = Date.now().toString().slice(-5);
  let testTheatreId = "";
  let testOtherTheatreId = "";
  let testMovieId = "";
  let testScreenId = "";
  let testShowId = "";
  let testTicketId = "";
  let testActivationCode = `ACT-MONITOR-${testSuffix}`;
  let testStaffId = "";
  let testSessionId = "";
  let testActivationId = "";

  try {
    // ----------------------------------------------------------------
    // SETUP FIXTURES
    // ----------------------------------------------------------------
    const theatre = await prisma.theatre.create({
      data: {
        name: `Odeon Cyberdome ${testSuffix}`,
        code: `ODE-${testSuffix}`,
        location: "Tech District Sector 7",
      },
    });
    testTheatreId = theatre.id;

    const otherTheatre = await prisma.theatre.create({
      data: {
        name: `Foreign CineHall ${testSuffix}`,
        code: `FOR-${testSuffix}`,
        location: "Northern Hub",
      },
    });
    testOtherTheatreId = otherTheatre.id;

    const staffUser = await prisma.user.create({
      data: {
        email: `staff-monitor-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Security Field Operator",
        role: "THEATRE_STAFF",
        theatreId: theatre.id,
      },
    });
    testStaffId = staffUser.id;

    const movie = await prisma.movie.create({
      data: {
        title: `Cyber Nexus 2049 ${testSuffix}`,
        durationMinutes: 155,
        language: "English",
        rating: "R",
      },
    });
    testMovieId = movie.id;

    const screen = await prisma.screen.create({
      data: {
        theatreId: theatre.id,
        screenNumber: 1,
        name: "IMAX Screen 1",
        capacity: 400,
      },
    });
    testScreenId = screen.id;

    const now = new Date();
    const show = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 10 * 60000), // Started 10 mins ago
        endTime: new Date(now.getTime() + 145 * 60000), // Ends in 145 mins
        status: "ACTIVE",
      },
    });
    testShowId = show.id;

    const ticket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-MON-${testSuffix}`,
        seatNumber: "G-18",
        price: 25.0,
        status: "ISSUED",
        activation: {
          create: {
            activationCode: testActivationCode,
            status: "PENDING",
            expiresAt: new Date(now.getTime() + 180 * 60000),
          },
        },
      },
      include: { activation: true },
    });
    testTicketId = ticket.id;

    // ----------------------------------------------------------------
    // TEST 1: PROTECTED SESSION STARTS AFTER VALID QR
    // ----------------------------------------------------------------
    console.log("--- 1. Protected Session Initialization After Valid QR ---");
    {
      const qrData = MobileService.generateSecureQrToken(testActivationCode);
      const sessionResult = await MobileService.verifyTicketQR({
        qrPayload: qrData,
        userId: staffUser.id,
        userEmail: staffUser.email,
        userName: staffUser.name,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
        deviceFingerprint: "mobile-monitor-dev-01",
        clientIp: "192.168.1.55",
        userAgent: "AntipiracyMobileGuard/23.0",
      });

      testSessionId = sessionResult.sessionId;
      testActivationId = sessionResult.activationId;

      assert(sessionResult.protectionStatus === "ACTIVE", "1.1 Protection status is initialized to ACTIVE");
      assert(Boolean(sessionResult.sessionId), "1.2 Unique session ID generated");
      assert(sessionResult.movie.title === movie.title, "1.3 Movie details correctly populated");
      assert(sessionResult.theatre.name === theatre.name, "1.4 Theatre venue correctly populated");
      assert(sessionResult.screen.name === screen.name, "1.5 Screen correctly populated");
      assert(sessionResult.seatNumber === "G-18", "1.6 Seat correctly bound");
    }

    // ----------------------------------------------------------------
    // TEST 2: MONITORING STARTS ONLY FOR ACTIVE SESSION
    // ----------------------------------------------------------------
    console.log("\n--- 2. Active Session Verification Prior to Monitoring ---");
    {
      const session = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      assert(session.protectionStatus === "ACTIVE", "2.1 Protection status verified as ACTIVE");
      assert(session.sessionId === testSessionId, "2.2 Bound session ID matches active session");
    }

    // ----------------------------------------------------------------
    // TEST 3: SUPPORTED SECURITY SIGNALS GENERATE NORMALIZED EVENTS
    // ----------------------------------------------------------------
    console.log("\n--- 3. Normalized Security Signals Ingestion ---");
    {
      const signalTypes = [
        "SCREEN_CAPTURE_SIGNAL",
        "CAMERA_ACTIVITY",
        "SCREEN_VISIBILITY_CHANGE",
        "FULLSCREEN_EXIT",
        "SUSPICIOUS_ACTIVITY",
      ];

      for (const signal of signalTypes) {
        const res = await MobileService.submitMobileSecurityEvent({
          eventType: signal,
          severity: signal === "SCREEN_CAPTURE_SIGNAL" ? "HIGH" : "MEDIUM",
          sessionId: testSessionId,
          theatreId: testTheatreId,
          showId: testShowId,
          movieId: testMovieId,
          activationId: testActivationId,
          payload: { signalSource: "client-listener", keyTrigger: signal },
          actorId: staffUser.id,
          actorEmail: staffUser.email,
        });

        assert(res.status === "INGESTED", `3.1 Signal [${signal}] ingested successfully`);
        assert(Boolean(res.eventId), `3.2 Event ID returned for [${signal}]`);
        assert(Boolean(res.correlationId), `3.3 Correlation ID assigned for [${signal}]`);
        assert(res.riskScore > 0, `3.4 Risk score calculated for [${signal}] (Score: ${res.riskScore})`);
      }
    }

    // ----------------------------------------------------------------
    // TEST 4: DUPLICATE / NOISY EVENT HANDLING & WARNING DISPATCH
    // ----------------------------------------------------------------
    console.log("\n--- 4. Warning Guidance Dispatch on Anomaly Signals ---");
    {
      const res = await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_CAPTURE_SIGNAL",
        severity: "HIGH",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        activationId: testActivationId,
      });

      assert(res.warningRequired === true, "4.1 Warning flag is set for SCREEN_CAPTURE_SIGNAL");
      assert(Boolean(res.warningMessage?.includes("Screen recording")), "4.2 User warning message contains clear anti-recording guidance");
    }

    // ----------------------------------------------------------------
    // TEST 5: SOC CORRELATION ENGINE INTEGRATION
    // ----------------------------------------------------------------
    console.log("\n--- 5. SOC Correlation & Incident Creation ---");
    {
      // Dispatch high severity signal with risk >= 70
      const res = await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_CAPTURE_SIGNAL",
        severity: "CRITICAL",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        activationId: testActivationId,
        actorId: staffUser.id,
      });

      assert(Boolean(res.correlatedIncidentId), "5.1 Correlated SOC Incident created for critical security signal");

      // Verify incident in database
      if (res.correlatedIncidentId) {
        const incident = await prisma.securityIncident.findUnique({
          where: { id: res.correlatedIncidentId },
        });
        assert(Boolean(incident), "5.2 Security Incident record confirmed in SOC database");
        assert(incident?.status === "DETECTED", "5.3 Incident initialized in DETECTED state");
      }
    }

    // ----------------------------------------------------------------
    // TEST 6: TENANT & THEATRE ISOLATION REMAINS ENFORCED
    // ----------------------------------------------------------------
    console.log("\n--- 6. Tenant & Theatre Isolation ---");
    {
      let foreignBlocked = false;
      let foreignCode = "";
      try {
        await MobileService.getProtectedSession({
          sessionId: testSessionId,
          userId: "foreign-operator-id",
          userRole: "THEATRE_STAFF",
          userTheatreId: testOtherTheatreId, // Foreign venue
        });
      } catch (err: any) {
        foreignBlocked = true;
        foreignCode = err.code || err.errorCode;
      }

      assert(foreignBlocked, "6.1 Cross-theatre session inspection blocked");
      assert(foreignCode === "UNAUTHORIZED_THEATRE", "6.2 Returned UNAUTHORIZED_THEATRE error code");
    }

    // ----------------------------------------------------------------
    // TEST 7: ZERO SECRETS & ZERO PII IN RESPONSES & TELEMETRY
    // ----------------------------------------------------------------
    console.log("\n--- 7. Zero Secrets & Zero PII Leakage ---");
    {
      const session = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      const sessionJson = JSON.stringify(session);
      assert(!sessionJson.includes("password"), "7.1 Session response contains no passwords");
      assert(!sessionJson.includes("JWT_SECRET") && !sessionJson.includes("DATABASE_URL"), "7.2 Session response contains no environment keys");
      assert(!sessionJson.includes("Bearer "), "7.3 Session response contains no bearer tokens");
    }

    // ----------------------------------------------------------------
    // TEST 8: SINGLE WEAK SIGNAL DOES NOT TERMINATE SESSION
    // ----------------------------------------------------------------
    console.log("\n--- 8. Single Weak Signal Does Not Terminate Session ---");
    {
      // Dispatch visibility change signal
      await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_VISIBILITY_CHANGE",
        severity: "LOW",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        activationId: testActivationId,
      });

      // Confirm session remains ACTIVE
      const currentSession = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      assert(currentSession.protectionStatus === "ACTIVE", "8.1 Single weak signal leaves screening session ACTIVE");
    }

    // ----------------------------------------------------------------
    // TEST 9: SESSION EXPIRES CORRECTLY AFTER EXPIRATION
    // ----------------------------------------------------------------
    console.log("\n--- 9. Session Expiration Handling ---");
    {
      // Set activation expiration to past
      await prisma.activation.update({
        where: { id: testActivationId },
        data: {
          expiresAt: new Date(Date.now() - 30 * 60000), // 30 minutes in the past
        },
      });

      const expiredSession = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      assert(expiredSession.protectionStatus === "EXPIRED", "9.1 Session automatically transitions to EXPIRED after duration");
    }

    // ----------------------------------------------------------------
    // TEST 10: BACKWARDS COMPATIBILITY WITH PHASES 20-22
    // ----------------------------------------------------------------
    console.log("\n--- 10. Phases 20-22 Compatibility ---");
    {
      // Test ticket QR generator
      const qrInfo = await MobileService.getSecureTicketQr(ticket.id);
      assert(qrInfo.qrToken.startsWith("QRTK."), "10.1 QR token generation remains fully operational");
    }
  } catch (err: any) {
    console.error("Unexpected error in Phase 23 test suite:", err);
    failedTests++;
  } finally {
    console.log("\n--- Cleaning up test records ---");
    try {
      if (testActivationId) {
        await prisma.verification.deleteMany({ where: { activationId: testActivationId } });
        await prisma.protectionEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.realtimeThreatEvent.deleteMany({ where: { activationId: testActivationId } });
        await prisma.securityAuditLog.deleteMany({ where: { activationId: testActivationId } });
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
  console.log(`📊 PHASE 23 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase23AntiPiracyProtectionTests().catch((err) => {
  console.error("FATAL ERROR running Phase 23 test suite:", err);
  process.exit(1);
});
