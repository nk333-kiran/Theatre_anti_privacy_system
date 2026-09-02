"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const mobileService_1 = require("../services/mobileService");
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
async function runPhase22MobileVerificationTests() {
    console.log("\n==================================================================");
    console.log("📱 PHASE 22: REAL TICKET & SECURE QR VERIFICATION TEST SUITE");
    console.log("==================================================================\n");
    const testSuffix = Date.now().toString().slice(-5);
    let testTheatreId = "";
    let testOtherTheatreId = "";
    let testMovieId = "";
    let testScreenId = "";
    let testShowId = "";
    let testExpiredShowId = "";
    let testTicketId = "";
    let testCancelledTicketId = "";
    let testExpiredTicketId = "";
    let testActivationCode = `ACT-SECURE-${testSuffix}`;
    let testStaffId = "";
    let testSessionId = "";
    try {
        // ----------------------------------------------------------------
        // SETUP TEST FIXTURES IN DATABASE
        // ----------------------------------------------------------------
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Metropolis Cineplex ${testSuffix}`,
                code: `MET-${testSuffix}`,
                location: "Grand Concourse Level 4",
            },
        });
        testTheatreId = theatre.id;
        const otherTheatre = await database_1.prisma.theatre.create({
            data: {
                name: `Foreign Cinema Hall ${testSuffix}`,
                code: `FOR-${testSuffix}`,
                location: "Harbor District",
            },
        });
        testOtherTheatreId = otherTheatre.id;
        const staffUser = await database_1.prisma.user.create({
            data: {
                email: `staff-${testSuffix}@theatre.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Checkpoint Staff Agent",
                role: "THEATRE_STAFF",
                theatreId: theatre.id,
            },
        });
        testStaffId = staffUser.id;
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `Quantum Vanguard ${testSuffix}`,
                durationMinutes: 148,
                language: "English",
                rating: "PG-13",
            },
        });
        testMovieId = movie.id;
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "Dolby Atmos Auditorium 1",
                capacity: 320,
            },
        });
        testScreenId = screen.id;
        const now = new Date();
        // Active show
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 15 * 60000), // Started 15 mins ago
                endTime: new Date(now.getTime() + 130 * 60000), // Ends in >2 hours
                status: "ACTIVE",
            },
        });
        testShowId = show.id;
        // Expired show (ended 2 hours ago)
        const expiredShow = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movie.id,
                startTime: new Date(now.getTime() - 200 * 60000),
                endTime: new Date(now.getTime() - 80 * 60000),
                status: "COMPLETED",
            },
        });
        testExpiredShowId = expiredShow.id;
        // Valid pending ticket
        const validTicket = await database_1.prisma.ticket.create({
            data: {
                showId: show.id,
                ticketNumber: `TCK-VALID-${testSuffix}`,
                seatNumber: "F-12",
                price: 22.0,
                status: "ISSUED",
                activation: {
                    create: {
                        activationCode: testActivationCode,
                        status: "PENDING",
                        expiresAt: new Date(now.getTime() + 160 * 60000),
                    },
                },
            },
            include: { activation: true },
        });
        testTicketId = validTicket.id;
        // Cancelled ticket
        const cancelledTicket = await database_1.prisma.ticket.create({
            data: {
                showId: show.id,
                ticketNumber: `TCK-CNCL-${testSuffix}`,
                seatNumber: "F-13",
                price: 22.0,
                status: "CANCELLED",
                activation: {
                    create: {
                        activationCode: `ACT-CNCL-${testSuffix}`,
                        status: "REVOKED",
                    },
                },
            },
        });
        testCancelledTicketId = cancelledTicket.id;
        // Expired ticket on expired show
        const expiredTicket = await database_1.prisma.ticket.create({
            data: {
                showId: expiredShow.id,
                ticketNumber: `TCK-EXPD-${testSuffix}`,
                seatNumber: "F-14",
                price: 22.0,
                status: "ISSUED",
                activation: {
                    create: {
                        activationCode: `ACT-EXPD-${testSuffix}`,
                        status: "EXPIRED",
                        expiresAt: new Date(now.getTime() - 60 * 60000),
                    },
                },
            },
        });
        testExpiredTicketId = expiredTicket.id;
        // ----------------------------------------------------------------
        // TEST 1: SECURE QR GENERATION & ZERO-PII / ZERO-SECRET DESIGN
        // ----------------------------------------------------------------
        console.log("--- 1. Secure QR Generation & Zero-PII / Zero-Secret Payload ---");
        {
            const qrData = await mobileService_1.MobileService.getSecureTicketQr(validTicket.id);
            assert(qrData.qrToken.startsWith("QRTK."), "1.1 QR token begins with signed prefix QRTK.");
            assert(qrData.qrToken.includes(testActivationCode), "1.2 QR token contains opaque activation identifier");
            // Verify zero PII & zero secrets
            assert(!qrData.qrToken.includes("@") && !qrData.qrToken.includes("password"), "1.3 QR token contains no email/user PII or password");
            assert(!qrData.qrToken.includes("Bearer") && !qrData.qrToken.includes("postgres"), "1.4 QR token contains no server secrets or DB credentials");
        }
        // ----------------------------------------------------------------
        // TEST 2: VALID SECURE QR VERIFICATION
        // ----------------------------------------------------------------
        console.log("\n--- 2. Valid Secure QR Verification & Session Creation ---");
        {
            const secureQr = mobileService_1.MobileService.generateSecureQrToken(testActivationCode);
            const sessionResult = await mobileService_1.MobileService.verifyTicketQR({
                qrPayload: secureQr,
                userId: staffUser.id,
                userEmail: staffUser.email,
                userName: staffUser.name,
                userRole: staffUser.role,
                userTheatreId: staffUser.theatreId,
                deviceFingerprint: "mobile-scanner-v22",
                clientIp: "10.0.4.12",
                userAgent: "AntipiracyMobileApp/22.0",
            });
            testSessionId = sessionResult.sessionId;
            assert(sessionResult.protectionStatus === "ACTIVE", "2.1 Protection status is marked ACTIVE upon valid scan");
            assert(sessionResult.ticketNumber === validTicket.ticketNumber, "2.2 Correct ticket number associated with session");
            assert(sessionResult.seatNumber === "F-12", "2.3 Seat number correctly bound");
            assert(sessionResult.movie.title === movie.title, "2.4 Movie title verified");
            assert(sessionResult.theatre.name === theatre.name, "2.5 Theatre venue verified");
            assert(sessionResult.screen.name === screen.name, "2.6 Screen verified");
            assert(sessionResult.sessionId.startsWith("SES-MOB-"), "2.7 Unique mobile session identifier created");
            // Verify database updated to ACTIVATED
            const dbTicket = await database_1.prisma.ticket.findUnique({ where: { id: validTicket.id } });
            assert(dbTicket?.status === "ACTIVATED", "2.8 Database ticket status transitioned to ACTIVATED");
        }
        // ----------------------------------------------------------------
        // TEST 3: INVALID & TAMPERED QR REJECTION
        // ----------------------------------------------------------------
        console.log("\n--- 3. Invalid & Tampered QR Rejection ---");
        {
            // 3.1 Non-existent code
            let invalidRejected = false;
            let invalidErrorCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: "QRTK.UNKNOWN_NONEXISTENT_CODE_12345.a1b2c3d4e5f6",
                    userId: staffUser.id,
                });
            }
            catch (err) {
                invalidRejected = true;
                invalidErrorCode = err.code || err.errorCode;
            }
            assert(invalidRejected, "3.1 Unknown QR token rejected");
            // 3.2 Tampered HMAC signature
            let tamperedRejected = false;
            let tamperedErrorCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `QRTK.${testActivationCode}.0000000000000000`, // Forged fake signature
                    userId: staffUser.id,
                });
            }
            catch (err) {
                tamperedRejected = true;
                tamperedErrorCode = err.code || err.errorCode;
            }
            assert(tamperedRejected, "3.2 Tampered cryptographic signature rejected");
            assert(tamperedErrorCode === "INVALID_QR", "3.3 Returned INVALID_QR error code for tampered signature");
        }
        // ----------------------------------------------------------------
        // TEST 4: DUPLICATE ACTIVATION PREVENTION
        // ----------------------------------------------------------------
        console.log("\n--- 4. Duplicate Activation Prevention ---");
        {
            let duplicateBlocked = false;
            let dupErrorCode = "";
            try {
                // Attempt to scan the already-activated validTicket again
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: testActivationCode,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                duplicateBlocked = true;
                dupErrorCode = err.code || err.errorCode;
            }
            assert(duplicateBlocked, "4.1 Scanning an already-activated ticket is strictly rejected");
            assert(dupErrorCode === "ALREADY_ACTIVATED", "4.2 Returned ALREADY_ACTIVATED error code");
        }
        // ----------------------------------------------------------------
        // TEST 5: CANCELLED & EXPIRED TICKET REJECTION
        // ----------------------------------------------------------------
        console.log("\n--- 5. Cancelled & Expired Ticket Rejection ---");
        {
            // Cancelled ticket
            let cancelledBlocked = false;
            let cancelCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `ACT-CNCL-${testSuffix}`,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                cancelledBlocked = true;
                cancelCode = err.code || err.errorCode;
            }
            assert(cancelledBlocked, "5.1 Cancelled ticket rejected");
            assert(cancelCode === "CANCELLED_TICKET", "5.2 Returned CANCELLED_TICKET error code");
            // Expired ticket
            let expiredBlocked = false;
            let expCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: `ACT-EXPD-${testSuffix}`,
                    userId: staffUser.id,
                    userRole: staffUser.role,
                    userTheatreId: staffUser.theatreId,
                });
            }
            catch (err) {
                expiredBlocked = true;
                expCode = err.code || err.errorCode;
            }
            assert(expiredBlocked, "5.3 Expired ticket/screening rejected");
            assert(expCode === "EXPIRED_TICKET", "5.4 Returned EXPIRED_TICKET error code");
        }
        // ----------------------------------------------------------------
        // TEST 6: CROSS-THEATRE & TENANT ISOLATION
        // ----------------------------------------------------------------
        console.log("\n--- 6. Cross-Theatre & Cross-Tenant Isolation ---");
        {
            // Create a fresh ticket in theatre 1
            const freshCode = `ACT-ISOLATION-${testSuffix}`;
            await database_1.prisma.ticket.create({
                data: {
                    showId: show.id,
                    ticketNumber: `TCK-ISO-${testSuffix}`,
                    seatNumber: "A-01",
                    price: 20.0,
                    status: "ISSUED",
                    activation: {
                        create: {
                            activationCode: freshCode,
                            status: "PENDING",
                        },
                    },
                },
            });
            // Staff user from Foreign Theatre (otherTheatreId) attempts to verify this ticket
            let foreignBlocked = false;
            let foreignCode = "";
            try {
                await mobileService_1.MobileService.verifyTicketQR({
                    qrPayload: freshCode,
                    userId: "foreign-staff-id",
                    userRole: "THEATRE_STAFF",
                    userTheatreId: testOtherTheatreId, // Scoped to foreign venue
                });
            }
            catch (err) {
                foreignBlocked = true;
                foreignCode = err.code || err.errorCode;
            }
            assert(foreignBlocked, "6.1 Cross-theatre verification attempt blocked");
            assert(foreignCode === "UNAUTHORIZED_THEATRE", "6.2 Returned UNAUTHORIZED_THEATRE error code");
        }
        // ----------------------------------------------------------------
        // TEST 7: PROTECTED SESSION RETRIEVAL & PHASE 21 COMPATIBILITY
        // ----------------------------------------------------------------
        console.log("\n--- 7. Protected Session Retrieval & Phase 21 Compatibility ---");
        {
            const session = await mobileService_1.MobileService.getProtectedSession({
                sessionId: testSessionId,
                userId: staffUser.id,
                userRole: staffUser.role,
                userTheatreId: staffUser.theatreId,
            });
            assert(session.sessionId === testSessionId, "7.1 Protected session retrieved by session ID");
            assert(session.protectionStatus === "ACTIVE", "7.2 Session protection status is ACTIVE");
            assert(session.movie.title === movie.title, "7.3 Movie title matches");
            assert(session.theatre.code === theatre.code, "7.4 Theatre code matches");
            // Verify Security Event communication remains functional
            const eventRes = await mobileService_1.MobileService.submitMobileSecurityEvent({
                eventType: "MOBILE_SECURITY_EVENT",
                severity: "MEDIUM",
                sessionId: testSessionId,
                theatreId: testTheatreId,
                showId: testShowId,
                movieId: testMovieId,
                actorId: staffUser.id,
            });
            assert(eventRes.status === "INGESTED", "7.5 Mobile security event submitted to SOC successfully");
        }
    }
    catch (err) {
        console.error("Unexpected failure in Phase 22 test suite:", err);
        failedTests++;
    }
    finally {
        console.log("\n--- Cleaning up test records ---");
        try {
            if (testActivationCode) {
                await database_1.prisma.verification.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
                await database_1.prisma.protectionEvent.deleteMany({ where: { activation: { activationCode: testActivationCode } } });
                await database_1.prisma.activation.deleteMany({ where: { activationCode: { startsWith: `ACT-` } } });
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
            if (testOtherTheatreId) {
                await database_1.prisma.theatre.deleteMany({ where: { id: testOtherTheatreId } });
            }
        }
        catch (cleanErr) {
            console.warn("Cleanup warning:", cleanErr);
        }
    }
    console.log("\n==================================================================");
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log("==================================================================\n");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runPhase22MobileVerificationTests().catch((err) => {
    console.error("FATAL ERROR running Phase 22 test suite:", err);
    process.exit(1);
});
