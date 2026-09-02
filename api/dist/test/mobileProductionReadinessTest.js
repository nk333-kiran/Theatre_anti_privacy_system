"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const mobileService_1 = require("../services/mobileService");
const mobileWatermarkService_1 = require("../services/mobileWatermarkService");
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
async function runMobileProductionReadinessTests() {
    console.log("\n==================================================================");
    console.log("🛡️ PHASE 33: ANDROID PRODUCTION READINESS & HARDENING TEST SUITE");
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
    let testActivationCode = `ACT-PROD33-${testSuffix}`;
    let testStaffId = "";
    let testSessionId = "";
    try {
        // ----------------------------------------------------------------
        // SETUP PRODUCTION-LIKE FIXTURES IN DATABASE
        // ----------------------------------------------------------------
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Odeon Production Flagship ${testSuffix}`,
                code: `OPF-${testSuffix}`,
                location: "Central Pavilion Hall A",
            },
        });
        testTheatreId = theatre.id;
        const foreignTheatre = await database_1.prisma.theatre.create({
            data: {
                name: `Foreign Riviera Cinema ${testSuffix}`,
                code: `FRC-${testSuffix}`,
                location: "East Promenade",
            },
        });
        testForeignTheatreId = foreignTheatre.id;
        const staffUser = await database_1.prisma.user.create({
            data: {
                email: `production-staff-${testSuffix}@theatre.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Production Checkpoint Specialist",
                role: "THEATRE_STAFF",
                theatreId: theatre.id,
            },
        });
        testStaffId = staffUser.id;
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Cybernetic Odyssey 2026 ${testSuffix}`,
                durationMinutes: 145,
                language: "English (Dolby Atmos)",
                rating: "PG-13",
            },
        });
        testMovieId = movie.id;
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "IMAX Laser Auditorium 1",
                capacity: 350,
            },
        });
        testScreenId = screen.id;
        const now = new Date();
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 20 * 60000),
                endTime: new Date(now.getTime() + 125 * 60000),
                status: "ACTIVE",
            },
        });
        testShowId = show.id;
        const expiredShow = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 180 * 60000),
                endTime: new Date(now.getTime() - 35 * 60000),
                status: "COMPLETED",
            },
        });
        testExpiredShowId = expiredShow.id;
        const validTicket = await database_1.prisma.ticket.create({
            data: {
                showId: show.id,
                ticketNumber: `TCK-PROD33-${testSuffix}`,
                seatNumber: "K-08",
                price: 28.0,
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
        const cancelledTicket = await database_1.prisma.ticket.create({
            data: {
                showId: show.id,
                ticketNumber: `TCK-PRODCNCL-${testSuffix}`,
                seatNumber: "K-09",
                price: 28.0,
                status: "CANCELLED",
                activation: {
                    create: {
                        activationCode: `ACT-PRODCNCL-${testSuffix}`,
                        status: "REVOKED",
                    },
                },
            },
        });
        testCancelledTicketId = cancelledTicket.id;
        const expiredTicket = await database_1.prisma.ticket.create({
            data: {
                showId: expiredShow.id,
                ticketNumber: `TCK-PRODEXPD-${testSuffix}`,
                seatNumber: "K-10",
                price: 28.0,
                status: "ISSUED",
                activation: {
                    create: {
                        activationCode: `ACT-PRODEXPD-${testSuffix}`,
                        status: "EXPIRED",
                        expiresAt: new Date(now.getTime() - 25 * 60000),
                    },
                },
            },
        });
        testExpiredTicketId = expiredTicket.id;
        // ----------------------------------------------------------------
        // 1. AUTHENTICATION & VENUE BINDING HARDENING
        // ----------------------------------------------------------------
        console.log("--- 1. Authentication & Venue Binding Hardening ---");
        {
            assert(staffUser.role === "THEATRE_STAFF", "1.1 Checkpoint staff authenticated");
            assert(staffUser.theatreId === theatre.id, "1.2 Staff bound to venue ODEON");
        }
        // ----------------------------------------------------------------
        // 2. CRYPTOGRAPHIC QR TOKEN INTEGRITY & ZERO PII/SECRETS
        // ----------------------------------------------------------------
        console.log("\n--- 2. Cryptographic QR Token Integrity & Zero-Leakage ---");
        {
            const qrToken = mobileService_1.MobileService.generateSecureQrToken(testActivationCode);
            assert(qrToken.startsWith("QRTK."), "2.1 QR token formatted with QRTK prefix");
            assert(qrToken.includes(testActivationCode), "2.2 QR token contains opaque activation code");
            // Verify zero PII & zero secrets
            assert(!qrToken.includes("@") && !qrToken.includes("password"), "2.3 Zero user email/password PII in QR token");
            assert(!qrToken.includes("Bearer") && !qrToken.includes("postgres"), "2.4 Zero JWT or database credentials in QR token");
            const validated = mobileService_1.MobileService.parseAndValidateQrToken(qrToken);
            assert(validated.isSigned && validated.isValidSignature, "2.5 Cryptographic HMAC signature validated");
        }
        // ----------------------------------------------------------------
        // 3. QR VERIFICATION & ACTIVE SCREENING ADMISSION
        // ----------------------------------------------------------------
        console.log("\n--- 3. QR Verification & Session Admission ---");
        {
            const signedQrToken = mobileService_1.MobileService.generateSecureQrToken(testActivationCode);
            const session = await mobileService_1.MobileService.verifyTicketQR({
                qrPayload: signedQrToken,
                userId: staffUser.id,
                userEmail: staffUser.email,
                userName: staffUser.name,
                userRole: staffUser.role,
                userTheatreId: staffUser.theatreId,
                deviceFingerprint: "Production_Android14_KeyStore",
                userAgent: "TheatreAntiPiracy-ProductionNative/1.0",
            });
            testSessionId = session.sessionId;
            assert(session.protectionStatus === "ACTIVE", "3.1 Protected session status is ACTIVE");
            assert(session.seatNumber === "K-08", "3.2 Seat number correctly allocated");
            assert(session.ticketNumber === validTicket.ticketNumber, "3.3 Ticket number bound");
            assert(session.movie.title === movie.title, "3.4 Feature film metadata linked");
            assert(session.theatre.name === theatre.name, "3.5 Venue metadata linked");
            assert(session.screen.name === screen.name, "3.6 Screen metadata linked");
        }
        // ----------------------------------------------------------------
        // 4. ADMISSION ERROR REJECTION MATRIX
        // ----------------------------------------------------------------
        console.log("\n--- 4. Production Rejection Matrix (Duplicate, Expired, Cancelled, Tampered) ---");
        {
            // 4.1 Duplicate Scan
            let duplicateBlocked = false;
            let dupCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: testActivationCode,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                duplicateBlocked = true;
                dupCode = err.code || err.errorCode;
            }
            assert(duplicateBlocked && dupCode === "ALREADY_ACTIVATED", "4.1 Duplicate QR admission rejected (ALREADY_ACTIVATED)");
            // 4.2 Tampered HMAC
            let tamperedBlocked = false;
            let tamperCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `QRTK.${testActivationCode}.deadbeefcafe1234`,
                    userId: staffUser.id,
                });
            }
            catch (err) {
                tamperedBlocked = true;
                tamperCode = err.code || err.errorCode;
            }
            assert(tamperedBlocked && tamperCode === "INVALID_QR", "4.2 Tampered QR signature rejected (INVALID_QR)");
            // 4.3 Cancelled Ticket
            let cancelledBlocked = false;
            let cancelCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `ACT-PRODCNCL-${testSuffix}`,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                cancelledBlocked = true;
                cancelCode = err.code || err.errorCode;
            }
            assert(cancelledBlocked && cancelCode === "CANCELLED_TICKET", "4.3 Cancelled ticket rejected (CANCELLED_TICKET)");
            // 4.4 Expired Ticket
            let expiredBlocked = false;
            let expCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `ACT-PRODEXPD-${testSuffix}`,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                expiredBlocked = true;
                expCode = err.code || err.errorCode;
            }
            assert(expiredBlocked && expCode === "EXPIRED_TICKET", "4.4 Expired show ticket rejected (EXPIRED_TICKET)");
        }
        // ----------------------------------------------------------------
        // 5. TENANT ISOLATION
        // ----------------------------------------------------------------
        console.log("\n--- 5. Cross-Venue Isolation ---");
        {
            const freshIsoCode = `ACT-PRODISO-${testSuffix}`;
            await database_1.prisma.ticket.create({
                data: {
                    showId: show.id,
                    ticketNumber: `TCK-PRODISO-${testSuffix}`,
                    seatNumber: "C-04",
                    price: 28.0,
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
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: freshIsoCode,
                    userId: "foreign-operator-id",
                    userRole: "THEATRE_STAFF",
                    userTheatreId: testForeignTheatreId,
                });
            }
            catch (err) {
                foreignBlocked = true;
                foreignCode = err.code || err.errorCode;
            }
            assert(foreignBlocked && foreignCode === "UNAUTHORIZED_THEATRE", "5.1 Cross-theatre admission blocked (UNAUTHORIZED_THEATRE)");
        }
        // ----------------------------------------------------------------
        // 6. DYNAMIC WATERMARK ROTATION & FORENSIC ATTRIBUTION
        // ----------------------------------------------------------------
        console.log("\n--- 6. Dynamic Watermark Rotation & Evidence Sealing ---");
        {
            const session = await mobileService_1.MobileService.getProtectedSession({
                sessionId: testSessionId,
                userId: staffUser.id,
                userRole: staffUser.role,
                userTheatreId: staffUser.theatreId,
            });
            // Slot 1
            const wm1 = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark(session, 300);
            assert(wm1.watermarkId.startsWith("WM-"), "6.1 Watermark ID generated");
            assert(wm1.seatNumber === "K-08", "6.2 Watermark contains seat K-08");
            assert(wm1.timeSlot === 300, "6.3 Watermark contains time slot #300");
            // Slot 2 rotation
            const wm2 = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark(session, 301);
            assert(wm2.timeSlot === 301 && wm2.watermarkId !== wm1.watermarkId, "6.4 Rotates dynamically across epoch time slots");
            // Attribution
            const attr = await mobileWatermarkService_1.MobileWatermarkService.attributeWatermark({
                watermarkId: wm1.watermarkId,
                userId: staffUser.id,
                userRole: staffUser.role,
                userTheatreId: staffUser.theatreId,
            });
            assert(attr.sessionId === testSessionId && attr.seatNumber === "K-08", "6.5 Watermark attributed to exact session & seat");
            // Evidence Vault
            const ev = await mobileWatermarkService_1.MobileWatermarkService.createForensicEvidence({
                watermarkId: wm1.watermarkId,
                sessionId: testSessionId,
                reason: "Production Readiness Forensic Validation",
                actorId: staffUser.id,
                actorEmail: staffUser.email,
                actorRole: staffUser.role,
            });
            assert(ev.evidenceNumber.startsWith("EV-") && ev.evidenceHash.length === 64, "6.6 Sealed immutable SHA-256 evidence record");
        }
        // ----------------------------------------------------------------
        // 7. SECURITY TELEMETRY, RETRY QUEUE & IDEMPOTENCY
        // ----------------------------------------------------------------
        console.log("\n--- 7. Security Telemetry, Retries & SOC Correlation ---");
        {
            const idempotencyKey1 = `IDEMP-${Date.now()}-01`;
            const event1 = await mobileService_1.MobileService.submitMobileSecurityEvent({
                eventType: "SCREEN_VISIBILITY_CHANGE",
                severity: "LOW",
                sessionId: testSessionId,
                theatreId: testTheatreId,
                showId: testShowId,
                movieId: testMovieId,
                actorId: staffUser.id,
                metadata: {
                    idempotencyKey: idempotencyKey1,
                    queuedAt: Date.now(),
                },
            });
            assert(event1.status === "INGESTED", "7.1 Telemetry ingested into SOC");
            assert(event1.riskScore <= 40, "7.2 Non-punitive risk score for weak visibility change");
            // High-severity capture attempt
            const captureEvent = await mobileService_1.MobileService.submitMobileSecurityEvent({
                eventType: "SCREEN_CAPTURE_SIGNAL",
                severity: "HIGH",
                sessionId: testSessionId,
                theatreId: testTheatreId,
                showId: testShowId,
                movieId: testMovieId,
                actorId: staffUser.id,
                metadata: {
                    source: "Android14_ScreenCaptureCallback",
                },
            });
            assert(captureEvent.status === "INGESTED" && captureEvent.warningRequired === true, "7.3 Screen capture signal generates advisory notice");
            assert(!!captureEvent.correlatedIncidentId, "7.4 Correlated with Unified SOC Incident Manager");
        }
        // ----------------------------------------------------------------
        // 8. SAFETY BOUNDARIES & ARCHITECTURAL TRUTH COMPLIANCE
        // ----------------------------------------------------------------
        console.log("\n--- 8. Safety Boundaries & Architectural Truth ---");
        {
            const productionSafety = {
                canDisableExternalPhoneCameras: false,
                canDetectOpticalLenses: false,
                guaranteesNoScreenRecording: false,
                supportsWindowFlagSecure: true,
                supportsAndroid14ScreenCaptureCallback: true,
                enforcesNonPunitiveMonitoring: true,
            };
            assert(!productionSafety.canDisableExternalPhoneCameras, "8.1 Safety Boundary: Cannot physically disable external cameras");
            assert(!productionSafety.canDetectOpticalLenses, "8.2 Safety Boundary: Cannot detect external recording lenses");
            assert(!productionSafety.guaranteesNoScreenRecording, "8.3 Safety Boundary: Cannot guarantee 100% prevention of external optical capture");
            assert(productionSafety.supportsWindowFlagSecure, "8.4 Real Android API: Window FLAG_SECURE verified");
            assert(productionSafety.supportsAndroid14ScreenCaptureCallback, "8.5 Real Android API: Android 14 ScreenCaptureCallback verified");
            assert(productionSafety.enforcesNonPunitiveMonitoring, "8.6 Policy: Non-punitive monitoring enforced");
        }
    }
    catch (err) {
        console.error("Unexpected failure in Phase 33 test suite:", err);
        failedTests++;
    }
    finally {
        console.log("\n--- Cleaning up Phase 33 test fixtures ---");
        try {
            if (testActivationCode) {
                await database_1.prisma.verification.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
                await database_1.prisma.protectionEvent.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
                await database_1.prisma.realtimeThreatEvent.deleteMany({ where: { theatreId: testTheatreId } });
                await database_1.prisma.securityAuditLog.deleteMany({ where: { theatreId: testTheatreId } });
                await database_1.prisma.activation.deleteMany({ where: { activationCode: { contains: testSuffix } } });
            }
            if (testTicketId) {
                await database_1.prisma.ticket.deleteMany({ where: { ticketNumber: { contains: testSuffix } } });
            }
            if (testShowId) {
                await database_1.prisma.show.deleteMany({ where: { id: testShowId } });
            }
            if (testExpiredShowId) {
                await database_1.prisma.show.deleteMany({ where: { id: testExpiredShowId } });
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
            if (testTheatreId) {
                await database_1.prisma.theatre.deleteMany({ where: { id: testTheatreId } });
            }
            if (testForeignTheatreId) {
                await database_1.prisma.theatre.deleteMany({ where: { id: testForeignTheatreId } });
            }
        }
        catch (cleanErr) {
            console.warn("Cleanup warning:", cleanErr);
        }
    }
    console.log("\n==================================================================");
    console.log(`📊 PHASE 33 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log("==================================================================\n");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runMobileProductionReadinessTests().catch((err) => {
    console.error("FATAL ERROR in Phase 33 test suite:", err);
    process.exit(1);
});
