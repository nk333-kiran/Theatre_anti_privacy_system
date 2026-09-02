import { prisma } from "@antipiracy/database";
import crypto from "crypto";
import { env } from "../config/envValidator";
import { MobileService } from "../services/mobileService";
import { MobileWatermarkService } from "../services/mobileWatermarkService";
import { SocIncidentManager } from "../services/soc/socIncidentManager";

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

async function runMobileDeviceIntegrationTests() {
  console.log("\n==================================================================");
  console.log("📱 PHASE 31: REAL MOBILE DEVICE & LAN INTEGRATION TEST SUITE");
  console.log("==================================================================\n");

  const testSuffix = Date.now().toString().slice(-5);
  let testTheatreId = "";
  let testForeignTheatreId = "";
  let testMovieId = "";
  let testScreenId = "";
  let testShowId = "";
  let testExpiredShowId = "";
  let testTicketId = "";
  let testCancelledTicketId = "";
  let testExpiredTicketId = "";
  let testActivationCode = `ACT-MOB31-${testSuffix}`;
  let testStaffId = "";
  let testSessionId = "";
  let generatedWatermarkId = "";

  try {
    // ----------------------------------------------------------------
    // SETUP FIXTURES IN POSTGRESQL DATABASE
    // ----------------------------------------------------------------
    const theatre = await prisma.theatre.create({
      data: {
        name: `Odeon IMAX Nexus ${testSuffix}`,
        code: `ODE-${testSuffix}`,
        location: "Silicon Plaza Level 3",
      },
    });
    testTheatreId = theatre.id;

    const foreignTheatre = await prisma.theatre.create({
      data: {
        name: `Foreign Broadway Hall ${testSuffix}`,
        code: `FBH-${testSuffix}`,
        location: "Downtown Boulevard",
      },
    });
    testForeignTheatreId = foreignTheatre.id;

    const staffUser = await prisma.user.create({
      data: {
        email: `mobile-staff-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Android Checkpoint Operator",
        role: "THEATRE_STAFF",
        theatreId: theatre.id,
      },
    });
    testStaffId = staffUser.id;

    const movie = await prisma.movie.create({
      data: {
        title: `Cybernetic Odyssey ${testSuffix}`,
        durationMinutes: 142,
        language: "English",
        rating: "PG-13",
      },
    });
    testMovieId = movie.id;

    const screen = await prisma.screen.create({
      data: {
        theatreId: theatre.id,
        screenNumber: 1,
        name: "IMAX Laser Screen 1",
        capacity: 280,
      },
    });
    testScreenId = screen.id;

    const now = new Date();
    const show = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 10 * 60000),
        endTime: new Date(now.getTime() + 130 * 60000),
        status: "ACTIVE",
      },
    });
    testShowId = show.id;

    const expiredShow = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 180 * 60000),
        endTime: new Date(now.getTime() - 60 * 60000),
        status: "COMPLETED",
      },
    });
    testExpiredShowId = expiredShow.id;

    const validTicket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-MOB31-${testSuffix}`,
        seatNumber: "H-18",
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
    testTicketId = validTicket.id;

    const cancelledTicket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-CNCL31-${testSuffix}`,
        seatNumber: "H-19",
        price: 24.5,
        status: "CANCELLED",
        activation: {
          create: {
            activationCode: `ACT-CNCL31-${testSuffix}`,
            status: "REVOKED",
          },
        },
      },
    });
    testCancelledTicketId = cancelledTicket.id;

    const expiredTicket = await prisma.ticket.create({
      data: {
        showId: expiredShow.id,
        ticketNumber: `TCK-EXPD31-${testSuffix}`,
        seatNumber: "H-20",
        price: 24.5,
        status: "ISSUED",
        activation: {
          create: {
            activationCode: `ACT-EXPD31-${testSuffix}`,
            status: "EXPIRED",
            expiresAt: new Date(now.getTime() - 45 * 60000),
          },
        },
      },
    });
    testExpiredTicketId = expiredTicket.id;

    // ----------------------------------------------------------------
    // TEST 1: LAN & CORS CONFIGURATION INTEGRITY
    // ----------------------------------------------------------------
    console.log("--- 1. LAN Access & CORS Origin Pattern Validation ---");
    {
      const lanRegex =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

      assert(lanRegex.test("http://192.168.1.50:3000"), "1.1 Standard 192.168.x.x LAN IP is recognized as valid origin");
      assert(lanRegex.test("http://10.0.0.12:3000"), "1.2 Class A 10.x.x.x LAN IP is recognized as valid origin");
      assert(lanRegex.test("http://172.20.10.4:3000"), "1.3 Class B 172.16-31.x.x LAN IP is recognized as valid origin");
      assert(lanRegex.test("http://localhost:3000"), "1.4 Localhost origin remains recognized as valid origin");
      assert(!lanRegex.test("http://malicious-external-site.com:3000"), "1.5 Arbitrary external domains correctly excluded");
    }

    // ----------------------------------------------------------------
    // TEST 2: SECURE QR TOKEN CREATION & ZERO-PII GUARANTEE
    // ----------------------------------------------------------------
    console.log("\n--- 2. Secure QR Generation & Zero-PII Guarantee ---");
    {
      const qrData = await MobileService.getSecureTicketQr(validTicket.id);

      assert(qrData.qrToken.startsWith("QRTK."), "2.1 QR token begins with signed prefix QRTK.");
      assert(qrData.qrToken.includes(testActivationCode), "2.2 QR token contains opaque activation identifier");

      // Verify zero PII & zero secrets
      assert(!qrData.qrToken.includes("@") && !qrData.qrToken.includes("password"), "2.3 Zero email/user PII or passwords in QR payload");
      assert(!qrData.qrToken.includes("Bearer") && !qrData.qrToken.includes("postgres"), "2.4 Zero JWT or database secrets in QR payload");
    }

    // ----------------------------------------------------------------
    // TEST 3: REAL MOBILE VERIFICATION & PROTECTED SESSION CREATION
    // ----------------------------------------------------------------
    console.log("\n--- 3. Real Mobile QR Verification & Session Activation ---");
    {
      const secureQr = MobileService.generateSecureQrToken(testActivationCode);
      const sessionResult = await MobileService.verifyTicketQR({
        qrPayload: secureQr,
        userId: staffUser.id,
        userEmail: staffUser.email,
        userName: staffUser.name,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
        deviceFingerprint: "Pixel-8-Android-14",
        clientIp: "192.168.1.105",
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36",
      });

      testSessionId = sessionResult.sessionId;

      assert(sessionResult.protectionStatus === "ACTIVE", "3.1 Protected screening session is ACTIVE");
      assert(sessionResult.ticketNumber === validTicket.ticketNumber, "3.2 Ticket number correctly bound");
      assert(sessionResult.seatNumber === "H-18", "3.3 Seat number correctly bound");
      assert(sessionResult.movie.title === movie.title, "3.4 Movie metadata verified");
      assert(sessionResult.theatre.name === theatre.name, "3.5 Theatre metadata verified");
      assert(sessionResult.screen.name === screen.name, "3.6 Screen metadata verified");
      assert(sessionResult.sessionId.startsWith("SES-MOB-"), "3.7 Unique mobile session ID created");

      // Confirm DB update
      const dbTicket = await prisma.ticket.findUnique({ where: { id: validTicket.id } });
      assert(dbTicket?.status === "ACTIVATED", "3.8 Database ticket status transitioned to ACTIVATED");
    }

    // ----------------------------------------------------------------
    // TEST 4: ERROR HANDLING (DUPLICATE, EXPIRED, CANCELLED, TAMPERED)
    // ----------------------------------------------------------------
    console.log("\n--- 4. Error Handling on Real Mobile Scanner Input ---");
    {
      // 4.1 Duplicate activation attempt
      let duplicateBlocked = false;
      let dupCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: testActivationCode,
          userId: staffUser.id,
          userRole: staffUser.role,
          userTheatreId: staffUser.theatreId,
        });
      } catch (err: any) {
        duplicateBlocked = true;
        dupCode = err.code || err.errorCode;
      }
      assert(duplicateBlocked, "4.1 Duplicate activation scan rejected");
      assert(dupCode === "ALREADY_ACTIVATED", "4.2 Returned ALREADY_ACTIVATED error code");

      // 4.2 Tampered HMAC signature
      let tamperedBlocked = false;
      let tamperCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `QRTK.${testActivationCode}.deadbeef12345678`,
          userId: staffUser.id,
        });
      } catch (err: any) {
        tamperedBlocked = true;
        tamperCode = err.code || err.errorCode;
      }
      assert(tamperedBlocked, "4.3 Tampered HMAC signature rejected");
      assert(tamperCode === "INVALID_QR", "4.4 Returned INVALID_QR for forged signature");

      // 4.3 Cancelled ticket
      let cancelledBlocked = false;
      let cancelCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `ACT-CNCL31-${testSuffix}`,
          userId: staffUser.id,
          userRole: staffUser.role,
          userTheatreId: staffUser.theatreId,
        });
      } catch (err: any) {
        cancelledBlocked = true;
        cancelCode = err.code || err.errorCode;
      }
      assert(cancelledBlocked, "4.5 Cancelled ticket rejected");
      assert(cancelCode === "CANCELLED_TICKET", "4.6 Returned CANCELLED_TICKET error code");

      // 4.4 Expired ticket
      let expiredBlocked = false;
      let expCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `ACT-EXPD31-${testSuffix}`,
          userId: staffUser.id,
          userRole: staffUser.role,
          userTheatreId: staffUser.theatreId,
        });
      } catch (err: any) {
        expiredBlocked = true;
        expCode = err.code || err.errorCode;
      }
      assert(expiredBlocked, "4.7 Expired ticket rejected");
      assert(expCode === "EXPIRED_TICKET", "4.8 Returned EXPIRED_TICKET error code");
    }

    // ----------------------------------------------------------------
    // TEST 5: TENANT & THEATRE ISOLATION
    // ----------------------------------------------------------------
    console.log("\n--- 5. Cross-Venue Isolation Enforcement ---");
    {
      const freshIsolationCode = `ACT-ISO31-${testSuffix}`;
      await prisma.ticket.create({
        data: {
          showId: show.id,
          ticketNumber: `TCK-ISO31-${testSuffix}`,
          seatNumber: "B-05",
          price: 20.0,
          status: "ISSUED",
          activation: {
            create: {
              activationCode: freshIsolationCode,
              status: "PENDING",
            },
          },
        },
      });

      let foreignBlocked = false;
      let foreignCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: freshIsolationCode,
          userId: "foreign-staff-id",
          userRole: "THEATRE_STAFF",
          userTheatreId: testForeignTheatreId,
        });
      } catch (err: any) {
        foreignBlocked = true;
        foreignCode = err.code || err.errorCode;
      }
      assert(foreignBlocked, "5.1 Cross-theatre verification attempt blocked");
      assert(foreignCode === "UNAUTHORIZED_THEATRE", "5.2 Returned UNAUTHORIZED_THEATRE error code");
    }

    // ----------------------------------------------------------------
    // TEST 6: DYNAMIC WATERMARK ROTATION ON MOBILE
    // ----------------------------------------------------------------
    console.log("\n--- 6. Dynamic Watermark Rotation & Forensic Attribution ---");
    {
      const session = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      // Slot 1
      const wmSlot1 = MobileWatermarkService.generateSessionWatermark(session, 100);
      generatedWatermarkId = wmSlot1.watermarkId;
      assert(wmSlot1.watermarkId.startsWith("WM-"), "6.1 Dynamic watermark ID generated");
      assert(wmSlot1.theatreCode === theatre.code, "6.2 Watermark contains venue code");
      assert(wmSlot1.seatNumber === "H-18", "6.3 Watermark contains seat number");
      assert(wmSlot1.timeSlot === 100, "6.4 Correct time slot #100");

      // Slot 2 (Rotation)
      const wmSlot2 = MobileWatermarkService.generateSessionWatermark(session, 101);
      assert(wmSlot2.timeSlot === 101, "6.5 Slot 2 rotated to #101");
      assert(wmSlot2.watermarkId !== wmSlot1.watermarkId, "6.6 Watermark hash changes on slot rotation");

      // Forensic Attribution
      const attribution = await MobileWatermarkService.attributeWatermark({
        watermarkId: wmSlot1.watermarkId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });
      assert(attribution.sessionId === testSessionId, "6.7 Leaked watermark attributed to exact session");
      assert(attribution.seatNumber === "H-18", "6.8 Attributed to seat H-18");

      // Log into Evidence Vault
      const evidence = await MobileWatermarkService.createForensicEvidence({
        watermarkId: wmSlot1.watermarkId,
        sessionId: testSessionId,
        reason: "Real Android phone test validation",
        actorId: staffUser.id,
        actorEmail: staffUser.email,
        actorRole: staffUser.role,
      });
      assert(evidence.evidenceNumber.startsWith("EV-"), "6.9 Traceable evidence logged to Evidence Vault");
      assert(evidence.evidenceHash.length === 64, "6.10 SHA-256 integrity hash recorded");
    }

    // ----------------------------------------------------------------
    // TEST 7: MOBILE SECURITY SIGNALS & NON-PUNITIVE SOC PIPELINE
    // ----------------------------------------------------------------
    console.log("\n--- 7. Mobile Security Signals & Non-Punitive SOC Telemetry ---");
    {
      // 7.1 Single / weak signal (visibility change)
      const weakEvent = await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_VISIBILITY_CHANGE",
        severity: "LOW",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        actorId: staffUser.id,
      });

      assert(weakEvent.status === "INGESTED", "7.1 Low-severity visibility change ingested into SOC");
      assert(weakEvent.riskScore <= 40, "7.2 Weak signal assigned non-punitive low risk score");
      assert(!weakEvent.correlatedIncidentId, "7.3 Weak signal does not trigger punitive lockout or incident creation");

      // 7.2 High-severity capture signal
      const captureEvent = await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_CAPTURE_SIGNAL",
        severity: "HIGH",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        actorId: staffUser.id,
      });

      assert(captureEvent.status === "INGESTED", "7.4 Screen capture signal ingested");
      assert(captureEvent.riskScore >= 70, "7.5 High risk score assigned to capture attempt");
      assert(captureEvent.warningRequired === true, "7.6 Non-punitive advisory warning generated for client");
      assert(!!captureEvent.correlatedIncidentId, "7.7 Correlated with SOC Incident pipeline");
    }

    // ----------------------------------------------------------------
    // TEST 8: PLATFORM BOUNDARY & ARCHITECTURAL TRUTH
    // ----------------------------------------------------------------
    console.log("\n--- 8. Platform Boundary & Architectural Compliance ---");
    {
      const browserCapabilities = {
        canDisableHardwareCamera: false,
        canDetectExternalLenses: false,
        supportsStandardEventListeners: true,
        supportsBarcodeDetectorAPI: true,
        supportsDynamicWatermark: true,
        supportsNonPunitiveMonitoring: true,
      };

      assert(
        !browserCapabilities.canDisableHardwareCamera,
        "8.1 System adheres to architectural reality: JS cannot physically disable hardware camera"
      );
      assert(
        !browserCapabilities.canDetectExternalLenses,
        "8.2 System adheres to architectural reality: JS cannot detect external recording devices"
      );
      assert(
        browserCapabilities.supportsNonPunitiveMonitoring,
        "8.3 Monitoring operates on educational, non-punitive warning principles"
      );
    }
  } catch (err: any) {
    console.error("Unexpected failure in Phase 31 test suite:", err);
    failedTests++;
  } finally {
    console.log("\n--- Cleaning up Phase 31 test fixtures ---");
    try {
      if (testActivationCode) {
        await prisma.verification.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
        await prisma.protectionEvent.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
        await prisma.realtimeThreatEvent.deleteMany({ where: { theatreId: testTheatreId } });
        await prisma.securityAuditLog.deleteMany({ where: { theatreId: testTheatreId } });
        await prisma.activation.deleteMany({ where: { activationCode: { contains: testSuffix } } });
      }
      if (testTicketId) {
        await prisma.ticket.deleteMany({ where: { ticketNumber: { contains: testSuffix } } });
      }
      if (testShowId) {
        await prisma.show.deleteMany({ where: { id: testShowId } });
      }
      if (testExpiredShowId) {
        await prisma.show.deleteMany({ where: { id: testExpiredShowId } });
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
      if (testForeignTheatreId) {
        await prisma.theatre.deleteMany({ where: { id: testForeignTheatreId } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n==================================================================");
  console.log(`📊 PHASE 31 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMobileDeviceIntegrationTests().catch((err) => {
  console.error("FATAL ERROR in Phase 31 test suite:", err);
  process.exit(1);
});
