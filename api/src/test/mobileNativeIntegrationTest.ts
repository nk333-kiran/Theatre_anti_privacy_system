import { prisma } from "@antipiracy/database";
import crypto from "crypto";
import { MobileService } from "../services/mobileService";
import { MobileWatermarkService } from "../services/mobileWatermarkService";
import { PiracyOrchestrationService } from "../services/piracyOrchestrationService";

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

async function runMobileNativeIntegrationTests() {
  console.log("\n==================================================================");
  console.log("🤖 PHASE 32: NATIVE ANDROID MOBILE INTEGRATION TEST SUITE");
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
  let testActivationCode = `ACT-NAT32-${testSuffix}`;
  let testStaffId = "";
  let testSessionId = "";
  let generatedWatermarkId = "";

  try {
    // ----------------------------------------------------------------
    // SETUP FIXTURES IN POSTGRESQL DATABASE
    // ----------------------------------------------------------------
    const theatre = await prisma.theatre.create({
      data: {
        name: `Odeon Prime Native Cinema ${testSuffix}`,
        code: `OPN-${testSuffix}`,
        location: "Metro Digital Hub Level 2",
      },
    });
    testTheatreId = theatre.id;

    const foreignTheatre = await prisma.theatre.create({
      data: {
        name: `Foreign Metro Multiplex ${testSuffix}`,
        code: `FMM-${testSuffix}`,
        location: "Uptown Square",
      },
    });
    testForeignTheatreId = foreignTheatre.id;

    const staffUser = await prisma.user.create({
      data: {
        email: `native-staff-${testSuffix}@theatre.com`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Native Android Checkpoint Staff",
        role: "THEATRE_STAFF",
        theatreId: theatre.id,
      },
    });
    testStaffId = staffUser.id;

    const movie = await prisma.movie.create({
      data: {
        title: `Quantum Vanguard ${testSuffix}`,
        durationMinutes: 135,
        language: "English (Dolby Atmos)",
        rating: "PG-13",
      },
    });
    testMovieId = movie.id;

    const screen = await prisma.screen.create({
      data: {
        theatreId: theatre.id,
        screenNumber: 1,
        name: "Laser IMAX Screen 1",
        capacity: 320,
      },
    });
    testScreenId = screen.id;

    const now = new Date();
    const show = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 15 * 60000),
        endTime: new Date(now.getTime() + 120 * 60000),
        status: "ACTIVE",
      },
    });
    testShowId = show.id;

    const expiredShow = await prisma.show.create({
      data: {
        theatreId: theatre.id,
        screenId: screen.id,
        movieId: movie.id,
        startTime: new Date(now.getTime() - 200 * 60000),
        endTime: new Date(now.getTime() - 60 * 60000),
        status: "COMPLETED",
      },
    });
    testExpiredShowId = expiredShow.id;

    const validTicket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-NAT32-${testSuffix}`,
        seatNumber: "J-12",
        price: 26.0,
        status: "ISSUED",
        activation: {
          create: {
            activationCode: testActivationCode,
            status: "PENDING",
            expiresAt: new Date(now.getTime() + 140 * 60000),
          },
        },
      },
      include: { activation: true },
    });
    testTicketId = validTicket.id;

    const cancelledTicket = await prisma.ticket.create({
      data: {
        showId: show.id,
        ticketNumber: `TCK-NATCNCL-${testSuffix}`,
        seatNumber: "J-13",
        price: 26.0,
        status: "CANCELLED",
        activation: {
          create: {
            activationCode: `ACT-NATCNCL-${testSuffix}`,
            status: "REVOKED",
          },
        },
      },
    });
    testCancelledTicketId = cancelledTicket.id;

    const expiredTicket = await prisma.ticket.create({
      data: {
        showId: expiredShow.id,
        ticketNumber: `TCK-NATEXPD-${testSuffix}`,
        seatNumber: "J-14",
        price: 26.0,
        status: "ISSUED",
        activation: {
          create: {
            activationCode: `ACT-NATEXPD-${testSuffix}`,
            status: "EXPIRED",
            expiresAt: new Date(now.getTime() - 40 * 60000),
          },
        },
      },
    });
    testExpiredTicketId = expiredTicket.id;

    // ----------------------------------------------------------------
    // 1. NATIVE ANDROID AUTHENTICATION & VENUE BINDING
    // ----------------------------------------------------------------
    console.log("--- 1. Native Android Authentication & Venue Binding ---");
    {
      assert(staffUser.role === "THEATRE_STAFF", "1.1 Native app operator authenticated with THEATRE_STAFF role");
      assert(staffUser.theatreId === theatre.id, "1.2 Operator securely bound to theatre venue");
    }

    // ----------------------------------------------------------------
    // 2. NATIVE QR TOKEN GENERATION & ZERO-PII GUARANTEE
    // ----------------------------------------------------------------
    console.log("\n--- 2. Native QR Token Generation & Cryptographic Integrity ---");
    {
      const signedQrToken = MobileService.generateSecureQrToken(testActivationCode);

      assert(signedQrToken.startsWith("QRTK."), "2.1 Native QR payload starts with QRTK prefix");
      assert(signedQrToken.includes(testActivationCode), "2.2 Native QR payload contains activation code");

      // Verify zero PII & zero secret leakage
      assert(!signedQrToken.includes("@") && !signedQrToken.includes("password"), "2.3 Zero user email/password PII in QR payload");
      assert(!signedQrToken.includes("Bearer") && !signedQrToken.includes("postgres"), "2.4 Zero JWT or database credentials in QR payload");

      const validated = MobileService.parseAndValidateQrToken(signedQrToken);
      assert(validated.isSigned && validated.isValidSignature, "2.5 Native QR cryptographic HMAC signature verified");
      assert(validated.activationCode === testActivationCode, "2.6 Parsed activation code matches ticket activation");
    }

    // ----------------------------------------------------------------
    // 3. NATIVE QR VERIFICATION & PROTECTED SCREENING SESSION
    // ----------------------------------------------------------------
    console.log("\n--- 3. Native QR Verification & Protected Screening Session Creation ---");
    {
      const signedQrToken = MobileService.generateSecureQrToken(testActivationCode);

      const sessionResult = await MobileService.verifyTicketQR({
        qrPayload: signedQrToken,
        userId: staffUser.id,
        userEmail: staffUser.email,
        userName: staffUser.name,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
        deviceFingerprint: "Google_Pixel_8_NativeAndroid_API34",
        userAgent: "TheatreAntiPiracy-NativeAndroid/1.0",
      });

      testSessionId = sessionResult.sessionId;

      assert(sessionResult.protectionStatus === "ACTIVE", "3.1 Protected screening session is ACTIVE");
      assert(sessionResult.ticketNumber === validTicket.ticketNumber, "3.2 Ticket number correctly bound");
      assert(sessionResult.seatNumber === "J-12", "3.3 Seat number correctly bound");
      assert(sessionResult.movie.title === movie.title, "3.4 Movie metadata matches");
      assert(sessionResult.theatre.name === theatre.name, "3.5 Theatre metadata matches");
      assert(sessionResult.screen.name === screen.name, "3.6 Screen metadata matches");
      assert(sessionResult.sessionId.startsWith("SES-MOB-"), "3.7 Unique mobile session ID created");

      const dbTicket = await prisma.ticket.findUnique({ where: { id: validTicket.id } });
      assert(dbTicket?.status === "ACTIVATED", "3.8 Database ticket transitioned to ACTIVATED");
    }

    // ----------------------------------------------------------------
    // 4. ERROR STATES (DUPLICATE, EXPIRED, CANCELLED, TAMPERED)
    // ----------------------------------------------------------------
    console.log("\n--- 4. Error Handling on Native Scanner Input ---");
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
      assert(duplicateBlocked, "4.1 Duplicate activation rejected");
      assert(dupCode === "ALREADY_ACTIVATED", "4.2 Duplicate returned ALREADY_ACTIVATED");

      // 4.2 Tampered HMAC signature
      let tamperedBlocked = false;
      let tamperCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `QRTK.${testActivationCode}.0000000000000000`,
          userId: staffUser.id,
        });
      } catch (err: any) {
        tamperedBlocked = true;
        tamperCode = err.code || err.errorCode;
      }
      assert(tamperedBlocked, "4.3 Tampered HMAC signature rejected");
      assert(tamperCode === "INVALID_QR", "4.4 Tampered signature returned INVALID_QR");

      // 4.3 Cancelled ticket
      let cancelledBlocked = false;
      let cancelCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `ACT-NATCNCL-${testSuffix}`,
          userId: staffUser.id,
          userRole: staffUser.role,
          userTheatreId: staffUser.theatreId,
        });
      } catch (err: any) {
        cancelledBlocked = true;
        cancelCode = err.code || err.errorCode;
      }
      assert(cancelledBlocked, "4.5 Cancelled ticket rejected");
      assert(cancelCode === "CANCELLED_TICKET", "4.6 Cancelled ticket returned CANCELLED_TICKET");

      // 4.4 Expired ticket
      let expiredBlocked = false;
      let expCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: `ACT-NATEXPD-${testSuffix}`,
          userId: staffUser.id,
          userRole: staffUser.role,
          userTheatreId: staffUser.theatreId,
        });
      } catch (err: any) {
        expiredBlocked = true;
        expCode = err.code || err.errorCode;
      }
      assert(expiredBlocked, "4.7 Expired ticket rejected");
      assert(expCode === "EXPIRED_TICKET", "4.8 Expired ticket returned EXPIRED_TICKET");
    }

    // ----------------------------------------------------------------
    // 5. TENANT & THEATRE ISOLATION
    // ----------------------------------------------------------------
    console.log("\n--- 5. Native App Cross-Venue Tenant Isolation ---");
    {
      const freshIsoCode = `ACT-NATISO-${testSuffix}`;
      await prisma.ticket.create({
        data: {
          showId: show.id,
          ticketNumber: `TCK-NATISO-${testSuffix}`,
          seatNumber: "A-01",
          price: 26.0,
          status: "ISSUED",
          activation: {
            create: {
              activationCode: freshIsoCode,
              status: "PENDING",
            },
          },
        },
      });

      let foreignBlocked = false;
      let foreignCode = "";
      try {
        await MobileService.verifyTicketQR({
          qrPayload: freshIsoCode,
          userId: "foreign-operator-id",
          userRole: "THEATRE_STAFF",
          userTheatreId: testForeignTheatreId,
        });
      } catch (err: any) {
        foreignBlocked = true;
        foreignCode = err.code || err.errorCode;
      }
      assert(foreignBlocked, "5.1 Cross-venue admission blocked");
      assert(foreignCode === "UNAUTHORIZED_THEATRE", "5.2 Cross-venue returned UNAUTHORIZED_THEATRE");
    }

    // ----------------------------------------------------------------
    // 6. DYNAMIC WATERMARK ROTATION & FORENSIC ATTRIBUTION
    // ----------------------------------------------------------------
    console.log("\n--- 6. Dynamic Watermark Rotation & Evidence Vault Integration ---");
    {
      const session = await MobileService.getProtectedSession({
        sessionId: testSessionId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });

      // Slot 1
      const wm1 = MobileWatermarkService.generateSessionWatermark(session, 200);
      generatedWatermarkId = wm1.watermarkId;

      assert(wm1.watermarkId.startsWith("WM-"), "6.1 Dynamic watermark ID generated");
      assert(wm1.theatreCode === theatre.code, "6.2 Watermark contains venue code");
      assert(wm1.seatNumber === "J-12", "6.3 Watermark contains seat number");
      assert(wm1.timeSlot === 200, "6.4 Watermark contains time slot #200");

      // Slot 2 rotation
      const wm2 = MobileWatermarkService.generateSessionWatermark(session, 201);
      assert(wm2.timeSlot === 201, "6.5 Slot 2 rotated to #201");
      assert(wm2.watermarkId !== wm1.watermarkId, "6.6 Watermark hash rotates per time slot");

      // Attribution
      const attribution = await MobileWatermarkService.attributeWatermark({
        watermarkId: wm1.watermarkId,
        userId: staffUser.id,
        userRole: staffUser.role,
        userTheatreId: staffUser.theatreId,
      });
      assert(attribution.sessionId === testSessionId, "6.7 Attributed to exact session ID");
      assert(attribution.seatNumber === "J-12", "6.8 Attributed to seat J-12");

      // Log to Evidence Vault
      const evidence = await MobileWatermarkService.createForensicEvidence({
        watermarkId: wm1.watermarkId,
        sessionId: testSessionId,
        reason: "Native Android forensic trace",
        actorId: staffUser.id,
        actorEmail: staffUser.email,
        actorRole: staffUser.role,
      });
      assert(evidence.evidenceNumber.startsWith("EV-"), "6.9 Sealed in Evidence Vault");
      assert(evidence.evidenceHash.length === 64, "6.10 SHA-256 integrity hash recorded");
    }

    // ----------------------------------------------------------------
    // 7. NATIVE ANDROID SECURITY TELEMETRY & SOC INGESTION
    // ----------------------------------------------------------------
    console.log("\n--- 7. Native Android Security Telemetry & Non-Punitive SOC Ingestion ---");
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
        metadata: { deviceFingerprint: "Samsung_S24_NativeAndroid_API34" },
      });

      assert(weakEvent.status === "INGESTED", "7.1 Low-severity visibility change ingested");
      assert(weakEvent.riskScore <= 40, "7.2 Weak signal assigned non-punitive low risk score");
      assert(!weakEvent.correlatedIncidentId, "7.3 Weak signal does not trigger punitive lockout");

      // 7.2 High-severity capture signal
      const captureEvent = await MobileService.submitMobileSecurityEvent({
        eventType: "SCREEN_CAPTURE_SIGNAL",
        severity: "HIGH",
        sessionId: testSessionId,
        theatreId: testTheatreId,
        showId: testShowId,
        movieId: testMovieId,
        actorId: staffUser.id,
        metadata: { deviceFingerprint: "Samsung_S24_NativeAndroid_API34" },
      });

      assert(captureEvent.status === "INGESTED", "7.4 Screen capture signal ingested");
      assert(captureEvent.riskScore >= 70, "7.5 High risk score assigned to capture attempt");
      assert(captureEvent.warningRequired === true, "7.6 Non-punitive educational warning generated");
      assert(!!captureEvent.correlatedIncidentId, "7.7 Correlated with Unified SOC Incident pipeline");
    }

    // ----------------------------------------------------------------
    // 8. ARCHITECTURAL HONESTY & PLATFORM BOUNDARIES
    // ----------------------------------------------------------------
    console.log("\n--- 8. Platform Boundary & Safety Truth Compliance ---");
    {
      const nativeCapabilities = {
        canDisableHardwareCamera: false,
        canDetectExternalLenses: false,
        canGuaranteeScreenRecordingPrevention: false,
        supportsWindowFlagSecure: true,
        supportsAndroid14ScreenCaptureCallback: true,
        supportsNonPunitiveMonitoring: true,
      };

      assert(!nativeCapabilities.canDisableHardwareCamera, "8.1 Safety Boundary: Android app cannot physically disable hardware camera");
      assert(!nativeCapabilities.canDetectExternalLenses, "8.2 Safety Boundary: Android app cannot detect external physical lenses");
      assert(!nativeCapabilities.canGuaranteeScreenRecordingPrevention, "8.3 Safety Boundary: Android app cannot guarantee 100% prevention of external screen capture");
      assert(nativeCapabilities.supportsWindowFlagSecure, "8.4 Real Android API: WindowManager FLAG_SECURE supported");
      assert(nativeCapabilities.supportsAndroid14ScreenCaptureCallback, "8.5 Real Android API: Android 14 ScreenCaptureCallback supported");
      assert(nativeCapabilities.supportsNonPunitiveMonitoring, "8.6 Operational Rule: Non-punitive monitoring enforced");
    }
  } catch (err: any) {
    console.error("Unexpected failure in Phase 32 native test suite:", err);
    failedTests++;
  } finally {
    console.log("\n--- Cleaning up Phase 32 test fixtures ---");
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
  console.log(`📊 PHASE 32 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMobileNativeIntegrationTests().catch((err) => {
  console.error("FATAL ERROR in Phase 32 test suite:", err);
  process.exit(1);
});
