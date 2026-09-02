"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const crypto_1 = __importDefault(require("crypto"));
async function runEndToEndRealDataTest() {
    console.log("==================================================================");
    console.log("🎬 STARTING REAL-DATA POSTGRESQL END-TO-END VERIFICATION FLOW");
    console.log("==================================================================\n");
    const runId = Date.now().toString(36).toUpperCase();
    let pcId = null;
    let theatreId = null;
    let screenId = null;
    let movieId = null;
    let releaseId = null;
    let showId = null;
    let ticketId = null;
    let activationId = null;
    let staffUserId = null;
    let playbackSessionId = null;
    let videoAssetId = null;
    let incidentId = null;
    let evidenceId = null;
    let investigationCaseId = null;
    try {
        // ------------------------------------------------------------------
        // 0. Ensure Test Operator / Staff User exists
        // ------------------------------------------------------------------
        console.log("Step 0: Creating/Verifying Security Staff Operator...");
        const staffUser = await database_1.prisma.user.create({
            data: {
                email: `staff.e2e.${runId.toLowerCase()}@theatre.test`,
                name: `Checkpoint Officer ${runId}`,
                role: "THEATRE_STAFF",
                passwordHash: crypto_1.default.createHash("sha256").update("password123").digest("hex"),
            },
        });
        staffUserId = staffUser.id;
        console.log(`  ✅ [PASS] Staff User created (ID: ${staffUserId})`);
        // ------------------------------------------------------------------
        // 1. Create a Production Company
        // ------------------------------------------------------------------
        console.log("\nStep 1: Creating Production Company in PostgreSQL...");
        const pc = await database_1.prisma.productionCompany.create({
            data: {
                name: `Apex Studios Global ${runId}`,
                code: `APEX_${runId}`,
                contactEmail: `security@apex-${runId.toLowerCase()}.test`,
                contactPhone: "+1-555-0199",
                status: "ACTIVE",
            },
        });
        pcId = pc.id;
        console.log(`  ✅ [PASS] Production Company created (ID: ${pcId}, Code: ${pc.code})`);
        // ------------------------------------------------------------------
        // 2. Create a Theatre
        // ------------------------------------------------------------------
        console.log("\nStep 2: Creating Theatre in PostgreSQL...");
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Odeon Grand Cinema ${runId}`,
                code: `ODN_${runId}`,
                location: "Metroplex Center, Sector 5",
                address: "500 Grand Boulevard",
                contactEmail: `manager@odeon-${runId.toLowerCase()}.test`,
                permanentQrCode: `QR-THEATRE-ODN-${runId}`,
            },
        });
        theatreId = theatre.id;
        console.log(`  ✅ [PASS] Theatre created (ID: ${theatreId}, Code: ${theatre.code})`);
        // ------------------------------------------------------------------
        // 3. Create a Screen
        // ------------------------------------------------------------------
        console.log("\nStep 3: Creating Screen for Theatre...");
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatreId,
                screenNumber: 1,
                name: "IMAX Laser Auditorium",
                capacity: 350,
            },
        });
        screenId = screen.id;
        console.log(`  ✅ [PASS] Screen created (ID: ${screenId}, ScreenNumber: ${screen.screenNumber})`);
        // ------------------------------------------------------------------
        // 4. Create a Movie
        // ------------------------------------------------------------------
        console.log("\nStep 4: Creating Movie...");
        const movie = await database_1.prisma.movie.create({
            data: {
                title: `The Cyber Sentinel ${runId}`,
                durationMinutes: 142,
                language: "English",
                rating: "PG-13",
                synopsis: "High stakes anti-piracy cybersecurity thriller.",
                contentStatus: "READY",
                productionCompanyId: pcId,
            },
        });
        movieId = movie.id;
        console.log(`  ✅ [PASS] Movie created (ID: ${movieId}, Title: "${movie.title}")`);
        // ------------------------------------------------------------------
        // 5. Create a Movie Release
        // ------------------------------------------------------------------
        console.log("\nStep 5: Creating Movie Release Window...");
        const now = new Date();
        const release = await database_1.prisma.movieRelease.create({
            data: {
                movieId: movieId,
                productionCompanyId: pcId,
                theatreId: theatreId,
                screenId: screenId,
                startDate: new Date(now.getTime() - 24 * 3600000),
                endDate: new Date(now.getTime() + 30 * 24 * 3600000),
                status: "ACTIVE",
            },
        });
        releaseId = release.id;
        console.log(`  ✅ [PASS] Movie Release created (ID: ${releaseId})`);
        // ------------------------------------------------------------------
        // 6. Create a Show
        // ------------------------------------------------------------------
        console.log("\nStep 6: Creating Show Screening Session...");
        const showStartTime = new Date(now.getTime() - 15 * 60000); // started 15 min ago
        const showEndTime = new Date(now.getTime() + 120 * 60000); // ends in 2 hours
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatreId,
                screenId: screenId,
                movieId: movieId,
                startTime: showStartTime,
                endTime: showEndTime,
                status: "SCHEDULED",
            },
        });
        showId = show.id;
        console.log(`  ✅ [PASS] Show created (ID: ${showId})`);
        // ------------------------------------------------------------------
        // 7. Generate Ticket with Unique Ticket Number
        // ------------------------------------------------------------------
        console.log("\nStep 7: Generating Ticket in PostgreSQL...");
        const ticketNumber = `TCK-${runId}-001`;
        const activationToken = crypto_1.default.randomBytes(24).toString("hex");
        const ticket = await database_1.prisma.ticket.create({
            data: {
                showId: showId,
                ticketNumber,
                seatNumber: "G12",
                price: 18.5,
                status: "ISSUED",
                activation: {
                    create: {
                        activationCode: activationToken,
                        status: "PENDING",
                    },
                },
            },
            include: { activation: true },
        });
        ticketId = ticket.id;
        activationId = ticket.activation.id;
        console.log(`  ✅ [PASS] Ticket created (ID: ${ticketId}, Ticket#: ${ticketNumber})`);
        // ------------------------------------------------------------------
        // 8. Generate / Associate QR Activation
        // ------------------------------------------------------------------
        console.log("\nStep 8: Activating QR Token (Attendee Check-in)...");
        const activated = await database_1.prisma.activation.update({
            where: { id: activationId },
            data: {
                status: "ACTIVE",
                activatedAt: new Date(),
                expiresAt: new Date(showEndTime.getTime() + 30 * 60000),
                deviceFingerprint: `device-fp-${runId}`,
                ipAddress: "192.168.1.105",
            },
        });
        await database_1.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "ACTIVATED" },
        });
        console.log(`  ✅ [PASS] QR Activation state -> ACTIVE (Code: ${activationToken.slice(0, 12)}...)`);
        // ------------------------------------------------------------------
        // 9. Verify Ticket through Security Scanner Gate
        // ------------------------------------------------------------------
        console.log("\nStep 9: Verifying Ticket at Security Gate...");
        const verification = await database_1.prisma.verification.create({
            data: {
                activationId: activationId,
                theatreId: theatreId,
                showId: showId,
                staffId: staffUserId,
                result: "VERIFIED",
                reason: "Valid active admission",
                scannedCode: activationToken.slice(0, 32),
            },
        });
        console.log(`  ✅ [PASS] Verification logged (Result: ${verification.result}, Verification ID: ${verification.id})`);
        // ------------------------------------------------------------------
        // 10. Create Video Asset & Playback Session
        // ------------------------------------------------------------------
        console.log("\nStep 10: Authorizing DRM Playback Session...");
        const videoAsset = await database_1.prisma.videoAsset.create({
            data: {
                title: `Master Stream - ${movie.title}`,
                movieId: movieId,
                productionCompanyId: pcId,
                streamKey: `stream-${runId}`,
                deliveryManifestUrl: `https://cdn.theatre.test/streams/${runId}/master.m3u8`,
                state: "READY",
                processingStatus: "READY",
            },
        });
        videoAssetId = videoAsset.id;
        const playbackSession = await database_1.prisma.playbackSession.create({
            data: {
                sessionToken: `SESSION-TOKEN-${runId}`,
                activationId: activationId,
                videoAssetId: videoAssetId,
                theatreId: theatreId,
                showId: showId,
                status: "ACTIVE",
                expiresAt: showEndTime,
            },
        });
        playbackSessionId = playbackSession.id;
        console.log(`  ✅ [PASS] Playback Session authorized (ID: ${playbackSessionId})`);
        // ------------------------------------------------------------------
        // 11. Trigger Test Anti-Piracy Event
        // ------------------------------------------------------------------
        console.log("\nStep 11: Triggering Anti-Piracy Watermark Forensics Detection Event...");
        const watermarkPayload = `WM-ODN-${runId}-S1-G12`;
        const threatEvent = await database_1.prisma.realtimeThreatEvent.create({
            data: {
                correlationId: `CORR-${runId}`,
                eventId: `EVT-${runId}`,
                eventType: "SUSPICIOUS_STREAM_CAPTURE",
                source: "AI_WATERMARK_ANALYZER",
                severity: "CRITICAL",
                theatreId: theatreId,
                showId: showId,
                movieId: movieId,
                activationId: activationId,
                playbackSessionId: playbackSessionId,
                metadata: JSON.stringify({
                    detectedWatermark: watermarkPayload,
                    seat: "G12",
                    theatre: theatre.name,
                    confidence: 0.98,
                }),
            },
        });
        console.log(`  ✅ [PASS] RealtimeThreatEvent recorded (ID: ${threatEvent.id})`);
        // ------------------------------------------------------------------
        // 12. Store Protection Event
        // ------------------------------------------------------------------
        console.log("\nStep 12: Storing Protection Event Audit...");
        const protectionEvent = await database_1.prisma.protectionEvent.create({
            data: {
                activationId: activationId,
                theatreId: theatreId,
                showId: showId,
                eventType: "SCREENSHOT_ATTEMPT_DETECTED",
                metadata: JSON.stringify({ captureTool: "External Capture Device", resolution: "4K" }),
            },
        });
        console.log(`  ✅ [PASS] Protection Event recorded (ID: ${protectionEvent.id})`);
        // ------------------------------------------------------------------
        // 13. Create Piracy Incident
        // ------------------------------------------------------------------
        console.log("\nStep 13: Creating Piracy Incident...");
        const incidentNumber = `INC-${runId}-001`;
        const incident = await database_1.prisma.piracyIncident.create({
            data: {
                incidentNumber,
                title: `Unauthorized Stream Capture at ${theatre.name}`,
                description: `Forensic watermark detected matching Seat G12 for movie ${movie.title}`,
                severity: "CRITICAL",
                status: "INVESTIGATING",
                theatreId: theatreId,
                showId: showId,
                movieId: movieId,
                activationId: activationId,
                playbackSessionId: playbackSessionId,
                riskScore: 92,
                assignedInvestigatorId: staffUserId,
            },
        });
        incidentId = incident.id;
        console.log(`  ✅ [PASS] Piracy Incident created (ID: ${incidentId}, Incident#: ${incidentNumber})`);
        // ------------------------------------------------------------------
        // 14. Store Forensic Evidence Record & Hash
        // ------------------------------------------------------------------
        console.log("\nStep 14: Creating Forensic Evidence Record & Hash...");
        const evidenceHash = crypto_1.default.createHash("sha256").update(`EVIDENCE-PAYLOAD-${runId}`).digest("hex");
        const evidence = await database_1.prisma.forensicEvidence.create({
            data: {
                incidentId: incidentId,
                evidenceType: "WATERMARK_CAPTURE",
                watermarkFingerprint: watermarkPayload,
                playbackSessionId: playbackSessionId,
                activationId: activationId,
                theatreId: theatreId,
                showId: showId,
                seatNumber: "G12",
                confidenceScore: 98,
                evidenceHash,
            },
        });
        evidenceId = evidence.id;
        // Also link to investigation evidence
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-${runId}`,
                title: `Forensic Frame Capture for Incident ${incidentNumber}`,
                classification: "WATERMARK_MATCH",
                severity: "CRITICAL",
                status: "VERIFIED",
                retentionStatus: "ACTIVE",
                productionCompanyId: pcId,
                theatreId: theatreId,
                movieId: movieId,
                source: "STUDIO_WATERMARK_SYSTEM",
                integrityHash: evidenceHash,
            },
        });
        console.log(`  ✅ [PASS] Forensic Evidence recorded (ID: ${evidenceId}, Hash: ${evidenceHash.slice(0, 16)}...)`);
        // ------------------------------------------------------------------
        // 15. Store Investigation Case & Timeline Event
        // ------------------------------------------------------------------
        console.log("\nStep 15: Creating Investigation Case and Timeline...");
        const investigationCase = await database_1.prisma.investigationCase.create({
            data: {
                caseNumber: `CASE-${runId}`,
                title: `Formal Investigation into Capture at ${theatre.name}`,
                description: "Physical recording device suspected at auditorium row G.",
                severity: "HIGH",
                status: "OPEN",
                theatre: { connect: { id: theatreId } },
                movie: { connect: { id: movieId } },
                show: { connect: { id: showId } },
                productionCompany: { connect: { id: pcId } },
                assignedAnalyst: { connect: { id: staffUserId } },
            },
        });
        investigationCaseId = investigationCase.id;
        await database_1.prisma.investigationTimelineEvent.create({
            data: {
                caseId: investigationCaseId,
                title: "Forensic Evidence Linked",
                description: `Linked evidence artifact ${evidenceRecord.evidenceNumber} to case.`,
                eventType: "EVIDENCE_ATTACHED",
            },
        });
        console.log(`  ✅ [PASS] Investigation Case & Timeline Event created (Case#: ${investigationCase.caseNumber})`);
        // ------------------------------------------------------------------
        // 16. Query SOC Dashboard / Aggregations
        // ------------------------------------------------------------------
        console.log("\nStep 16: Verifying Dashboard Aggregation Queries...");
        const [theatreCount, activeIncidents, verifiedCount, recentAudits] = await Promise.all([
            database_1.prisma.theatre.count({ where: { id: theatreId } }),
            database_1.prisma.piracyIncident.count({ where: { status: "INVESTIGATING", theatreId: theatreId } }),
            database_1.prisma.verification.count({ where: { showId: showId, result: "VERIFIED" } }),
            database_1.prisma.realtimeThreatEvent.count({ where: { correlationId: `CORR-${runId}` } }),
        ]);
        if (theatreCount !== 1 || activeIncidents !== 1 || verifiedCount !== 1 || recentAudits !== 1) {
            throw new Error(`Aggregation mismatch: theatreCount=${theatreCount}, activeIncidents=${activeIncidents}, verifiedCount=${verifiedCount}`);
        }
        console.log(`  ✅ [PASS] Dashboard queries returned expected live data counts`);
        // ------------------------------------------------------------------
        // 17. Verify Complete Relational Graph & Constraints
        // ------------------------------------------------------------------
        console.log("\nStep 17: Validating Complete Relational Graph Traversal...");
        const fullGraph = await database_1.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                activation: {
                    include: {
                        verifications: true,
                        playbackSessions: true,
                        incidents: {
                            include: {
                                evidence: true,
                            },
                        },
                    },
                },
                show: {
                    include: {
                        theatre: { include: { screens: true } },
                        movie: { include: { productionCompany: true } },
                    },
                },
            },
        });
        if (!fullGraph || !fullGraph.show?.movie?.productionCompany) {
            throw new Error("Relational graph traversal failed to connect Ticket -> Show -> Movie -> ProductionCompany");
        }
        console.log("  📊 Validated Relational Hierarchy:");
        console.log(`     Production Company: ${fullGraph.show.movie.productionCompany.name} (${fullGraph.show.movie.productionCompany.code})`);
        console.log(`     Theatre:            ${fullGraph.show.theatre.name} (${fullGraph.show.theatre.code})`);
        console.log(`     Auditorium:         Screen ${fullGraph.show.theatre.screens[0].screenNumber} (${fullGraph.show.theatre.screens[0].capacity} seats)`);
        console.log(`     Movie:              ${fullGraph.show.movie.title} (${fullGraph.show.movie.durationMinutes} mins)`);
        console.log(`     Ticket:             ${fullGraph.ticketNumber} [Seat: ${fullGraph.seatNumber}]`);
        console.log(`     Activation:         ${fullGraph.activation?.status} (ID: ${fullGraph.activation?.id})`);
        console.log(`     Verifications:      ${fullGraph.activation?.verifications.length} verified scan`);
        console.log(`     Playback Sessions:  ${fullGraph.activation?.playbackSessions.length} active session`);
        console.log(`     Piracy Incidents:   ${fullGraph.activation?.incidents.length} incident logged`);
        console.log(`     Evidence Artifacts: ${fullGraph.activation?.incidents[0]?.evidence.length} forensic items`);
        console.log("\n==================================================================");
        console.log("🎉 ALL 17 STEPS OF REAL-DATA POSTGRESQL FLOW PASSED PERFECTLY!");
        console.log("==================================================================\n");
    }
    finally {
        // Clean up only test entities created by this test run
        console.log("🧹 Cleaning up isolated E2E test records...");
        if (evidenceId)
            await database_1.prisma.forensicEvidence.deleteMany({ where: { id: evidenceId } });
        if (investigationCaseId) {
            await database_1.prisma.investigationTimelineEvent.deleteMany({ where: { caseId: investigationCaseId } });
            await database_1.prisma.investigationCase.deleteMany({ where: { id: investigationCaseId } });
        }
        if (incidentId)
            await database_1.prisma.piracyIncident.deleteMany({ where: { id: incidentId } });
        await database_1.prisma.protectionEvent.deleteMany({ where: { activationId: activationId || undefined } });
        await database_1.prisma.realtimeThreatEvent.deleteMany({ where: { correlationId: `CORR-${runId}` } });
        await database_1.prisma.evidenceRecord.deleteMany({ where: { evidenceNumber: `EV-${runId}` } });
        if (playbackSessionId)
            await database_1.prisma.playbackSession.deleteMany({ where: { id: playbackSessionId } });
        if (videoAssetId)
            await database_1.prisma.videoAsset.deleteMany({ where: { id: videoAssetId } });
        if (activationId) {
            await database_1.prisma.verification.deleteMany({ where: { activationId } });
            await database_1.prisma.activation.deleteMany({ where: { id: activationId } });
        }
        if (ticketId)
            await database_1.prisma.ticket.deleteMany({ where: { id: ticketId } });
        if (showId)
            await database_1.prisma.show.deleteMany({ where: { id: showId } });
        if (releaseId)
            await database_1.prisma.movieRelease.deleteMany({ where: { id: releaseId } });
        if (movieId)
            await database_1.prisma.movie.deleteMany({ where: { id: movieId } });
        if (screenId)
            await database_1.prisma.screen.deleteMany({ where: { id: screenId } });
        if (theatreId)
            await database_1.prisma.theatre.deleteMany({ where: { id: theatreId } });
        if (pcId)
            await database_1.prisma.productionCompany.deleteMany({ where: { id: pcId } });
        if (staffUserId)
            await database_1.prisma.user.deleteMany({ where: { id: staffUserId } });
        console.log("✅ Isolated cleanup complete. Main database records preserved.");
    }
}
runEndToEndRealDataTest()
    .catch((err) => {
    console.error("❌ E2E Real-Data Test Failed:", err);
    process.exit(1);
})
    .finally(async () => {
    await database_1.prisma.$disconnect();
});
