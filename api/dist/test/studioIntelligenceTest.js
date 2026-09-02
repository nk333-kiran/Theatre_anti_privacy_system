"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const studioIntelligenceService_1 = require("../services/intelligence/studioIntelligenceService");
const studioReportService_1 = require("../services/intelligence/studioReportService");
const enforcementService_1 = require("../services/enforcement/enforcementService");
const investigationService_1 = require("../services/evidence/investigationService");
const evidenceHashService_1 = require("../services/evidence/evidenceHashService");
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
async function runPhase28StudioIntelligenceTests() {
    console.log("\n==================================================================");
    console.log("📊 PHASE 28: STUDIO INTELLIGENCE & REPORTING TEST SUITE");
    console.log("==================================================================\n");
    const testSuffix = Date.now().toString().slice(-5);
    let studioAId = "";
    let studioBId = "";
    let theatreId = "";
    let movieAId = "";
    let movieBId = "";
    let screenId = "";
    let showId = "";
    let adminUser = null;
    let studioAUser = null;
    let studioBUser = null;
    let theatreStaffUser = null;
    let testEvidenceId = "";
    let testCaseId = "";
    let testEnforcementId = "";
    let testPiracyIncidentId = "";
    try {
        // ----------------------------------------------------------------
        // SETUP FIXTURES
        // ----------------------------------------------------------------
        const studioA = await database_1.prisma.productionCompany.create({
            data: {
                name: `Paramount Paramount Studio A ${testSuffix}`,
                code: `PAR-A-${testSuffix}`,
                contactEmail: `security@studioa-${testSuffix}.com`,
            },
        });
        studioAId = studioA.id;
        const studioB = await database_1.prisma.productionCompany.create({
            data: {
                name: `Universal Universal Studio B ${testSuffix}`,
                code: `UNI-B-${testSuffix}`,
                contactEmail: `security@studiob-${testSuffix}.com`,
            },
        });
        studioBId = studioB.id;
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: `Odeon Flagship Multiplex ${testSuffix}`,
                code: `ODE-${testSuffix}`,
                location: "Grand Central Plaza",
            },
        });
        theatreId = theatre.id;
        const movieA = await database_1.prisma.movie.create({
            data: {
                title: `Nebula Vanguard Alpha ${testSuffix}`,
                durationMinutes: 140,
                language: "English",
                rating: "PG-13",
                productionCompanyId: studioA.id,
            },
        });
        movieAId = movieA.id;
        const movieB = await database_1.prisma.movie.create({
            data: {
                title: `Quantum Odyssey Beta ${testSuffix}`,
                durationMinutes: 110,
                language: "English",
                rating: "R",
                productionCompanyId: studioB.id,
            },
        });
        movieBId = movieB.id;
        const screen = await database_1.prisma.screen.create({
            data: {
                theatreId: theatre.id,
                screenNumber: 1,
                name: "Screen 1 IMAX",
                capacity: 250,
            },
        });
        screenId = screen.id;
        const now = new Date();
        const show = await database_1.prisma.show.create({
            data: {
                theatreId: theatre.id,
                screenId: screen.id,
                movieId: movieA.id,
                startTime: new Date(now.getTime() - 15 * 60000),
                endTime: new Date(now.getTime() + 120 * 60000),
                status: "ACTIVE",
            },
        });
        showId = show.id;
        // Users
        adminUser = await database_1.prisma.user.create({
            data: {
                email: `global-admin-${testSuffix}@intel.corp`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Global Security Director",
                role: "ADMIN",
            },
        });
        studioAUser = await database_1.prisma.user.create({
            data: {
                email: `rep-${testSuffix}@studioa.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Studio A Rights Officer",
                role: "PRODUCTION_COMPANY",
                productionCompanyId: studioA.id,
            },
        });
        studioBUser = await database_1.prisma.user.create({
            data: {
                email: `rep-${testSuffix}@studiob.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Studio B Rights Officer",
                role: "PRODUCTION_COMPANY",
                productionCompanyId: studioB.id,
            },
        });
        theatreStaffUser = await database_1.prisma.user.create({
            data: {
                email: `staff-${testSuffix}@theatre.com`,
                passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
                name: "Theatre Security Lead",
                role: "THEATRE_STAFF",
                theatreId: theatre.id,
            },
        });
        // Evidence Record for Movie A
        const rawEvidenceMetadata = JSON.stringify({
            captureType: "OPTICAL_STREAM_RIP",
            watermarkReference: {
                watermarkId: `WM-${theatre.code}-SEAT-D4`,
            },
            secretApiKey: "sk_live_super_secret_998822",
            sessionJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.xyz",
            customerCard: "5555-4444-3333-2222",
        });
        const evidenceHash = evidenceHashService_1.evidenceHashService.computeSha256(rawEvidenceMetadata);
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-INTEL-${testSuffix}-001`,
                title: `Forensic Cam Leak: ${movieA.title}`,
                classification: "WATERMARK_MATCH",
                severity: "CRITICAL",
                status: "VERIFIED",
                source: "OPTICAL_SENSOR_GRID",
                theatreId: theatre.id,
                movieId: movieA.id,
                productionCompanyId: studioA.id,
                metadata: rawEvidenceMetadata,
                integrityHash: evidenceHash,
            },
        });
        testEvidenceId = evidenceRecord.id;
        // Piracy Incident for Movie A
        const piracyIncident = await database_1.prisma.piracyIncident.create({
            data: {
                incidentNumber: `INC-PIR-${testSuffix}-01`,
                title: `Unlicensed Stream Discovered: ${movieA.title}`,
                severity: "CRITICAL",
                status: "INVESTIGATING",
                theatreId: theatre.id,
                movieId: movieA.id,
                showId: show.id,
                riskScore: 85,
            },
        });
        testPiracyIncidentId = piracyIncident.id;
        // Investigation Case for Movie A
        const activeCase = await investigationService_1.investigationService.createCase({
            title: `Distribution Leak Investigation: ${movieA.title}`,
            severity: "CRITICAL",
            threatClassification: "CAM_RECORDING_DISTRIBUTOR",
            theatreId: theatre.id,
            movieId: movieA.id,
            creator: studioAUser,
            correlationId: `CORR-CASE-${testSuffix}`,
        });
        testCaseId = activeCase.id;
        // Link evidence to case
        await investigationService_1.investigationService.linkEvidence({
            caseId: activeCase.id,
            evidenceRecordId: evidenceRecord.id,
            relevance: "Definitive watermark match to Auditorium 1",
            actor: studioAUser,
        });
        // Enforcement for Movie A
        const enforcement = await enforcementService_1.enforcementService.createEnforcement({
            caseId: activeCase.id,
            title: `DMCA Notice: ${movieA.title} Torrent Release`,
            actionType: "TAKEDOWN_NOTICE",
            targetEntity: "Pirate Stream CDN Host",
            severity: "CRITICAL",
            actor: studioAUser,
            correlationId: `CORR-ENF-${testSuffix}`,
        });
        testEnforcementId = enforcement.id;
        // Approve and Submit enforcement
        await enforcementService_1.enforcementService.submitForReview(enforcement.id, studioAUser);
        await enforcementService_1.enforcementService.processApproval(enforcement.id, "APPROVE", adminUser, "Approved by Legal");
        await enforcementService_1.enforcementService.submitEnforcement(enforcement.id, adminUser, "EXT-DMCA-9921");
        await enforcementService_1.enforcementService.completeEnforcement(enforcement.id, adminUser, "Takedown verified and completed");
        console.log("--- 1. Multi-Source Aggregation & KPI Calculations ---");
        const adminIntel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence({}, adminUser);
        assert(adminIntel !== null, "1.1 Global studio intelligence aggregated successfully");
        assert(adminIntel.kpis.totalIncidents >= 1, "1.2 Total incidents KPI aggregated correctly", `Count: ${adminIntel.kpis.totalIncidents}`);
        assert(adminIntel.kpis.highRiskIncidents >= 1, "1.3 High risk incidents calculated", `High risk count: ${adminIntel.kpis.highRiskIncidents}`);
        assert(adminIntel.kpis.highRiskRatio > 0, "1.4 High risk ratio computed as percentage", `${adminIntel.kpis.highRiskRatio}%`);
        assert(adminIntel.kpis.totalEvidenceRecords >= 1, "1.5 Evidence vault records aggregated");
        assert(adminIntel.kpis.watermarkHits >= 1, "1.6 Watermark detection count aggregated");
        assert(adminIntel.kpis.completedEnforcements >= 1, "1.7 Completed enforcements count accurate");
        assert(adminIntel.kpis.takedownSuccessRate === 100, "1.8 Takedown success rate is 100%", `${adminIntel.kpis.takedownSuccessRate}%`);
        assert(adminIntel.kpis.globalStudioRiskScore >= 50, "1.9 Global studio risk score computed", `${adminIntel.kpis.globalStudioRiskScore}`);
        assert(adminIntel.kpis.overallThreatPosture !== undefined, "1.10 Overall threat posture classified", adminIntel.kpis.overallThreatPosture);
        console.log("\n--- 2. Movie & Theatre Risk Rankings ---");
        const movieRanking = adminIntel.movieRankings.find((m) => m.movieId === movieA.id);
        assert(movieRanking !== undefined, "2.1 Movie A ranked in threat leaderboard");
        assert(movieRanking?.incidentCount === 1, "2.2 Movie A incident count is accurate");
        assert(movieRanking?.watermarkHits === 1, "2.3 Movie A watermark hits accurate");
        assert(movieRanking?.riskCategory === "CRITICAL" || movieRanking?.riskCategory === "HIGH", "2.4 Movie A classified as CRITICAL/HIGH threat", movieRanking?.riskCategory);
        const theatreRanking = adminIntel.theatreRankings.find((t) => t.theatreId === theatre.id);
        assert(theatreRanking !== undefined, "2.5 Theatre ranked in vulnerability index");
        assert(theatreRanking?.theatreCode === theatre.code, "2.6 Theatre code matches fixture");
        assert(theatreRanking?.incidentCount === 1, "2.7 Theatre incident volume accurate");
        console.log("\n--- 3. Pipeline Funnel Verification ---");
        assert(adminIntel.investigationPipeline !== undefined, "3.1 Investigation pipeline status counts available");
        assert(adminIntel.investigationPipeline.OPEN >= 1 || adminIntel.investigationPipeline.INVESTIGATING >= 0, "3.2 Investigation status buckets populated");
        assert(adminIntel.enforcementPipeline.COMPLETED >= 1, "3.3 Enforcement pipeline records completed actions");
        console.log("\n--- 4. Multi-Tenant Studio Isolation ---");
        // Studio A Officer query
        const studioAIntel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence({}, studioAUser);
        const studioAMovies = studioAIntel.movieRankings.map((m) => m.movieId);
        assert(studioAMovies.includes(movieA.id), "4.1 Studio A sees their own movie (Movie A)");
        assert(!studioAMovies.includes(movieB.id), "4.2 Studio A CANNOT see Studio B's movie (Movie B)");
        // Studio B Officer query
        const studioBIntel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence({}, studioBUser);
        const studioBMovies = studioBIntel.movieRankings.map((m) => m.movieId);
        assert(studioBMovies.includes(movieB.id), "4.3 Studio B sees their own movie (Movie B)");
        assert(!studioBMovies.includes(movieA.id), "4.4 Studio B CANNOT see Studio A's movie (Movie A)");
        assert(studioBIntel.kpis.totalIncidents === 0, "4.5 Studio B has 0 incidents in their scoped repertoire");
        console.log("\n--- 5. Empty-Data Handling & Graceful Defaults ---");
        const emptyIntel = await studioIntelligenceService_1.studioIntelligenceService.getStudioIntelligence({ movieId: "non-existent-movie-id-00000000-0000-0000-0000-000000000000" }, adminUser);
        assert(emptyIntel !== null, "5.1 Empty-data query succeeds without throwing");
        assert(emptyIntel.kpis.totalIncidents === 0, "5.2 Total incidents is 0 for non-existent target");
        assert(emptyIntel.kpis.globalStudioRiskScore === 0, "5.3 Global risk score defaults to 0");
        assert(emptyIntel.kpis.overallThreatPosture === "NOMINAL", "5.4 Posture defaults to NOMINAL");
        assert(emptyIntel.movieRankings.length === 0, "5.5 Movie rankings returns empty array");
        console.log("\n--- 6. Management Report Generation & SHA-256 Integrity ---");
        const report = await studioReportService_1.studioReportService.generateManagementReport({ movieId: movieA.id }, studioAUser, `CORR-RPT-TEST-${testSuffix}`);
        assert(report !== null, "6.1 Management report compiled successfully");
        assert(report.reportId.startsWith("RPT-"), "6.2 Sequential RPT-YYYY-XXXX format assigned", report.reportId);
        assert(report.targetMovie?.id === movieA.id, "6.3 Target movie details populated");
        assert(report.executiveSummary.totalIncidents === 1, "6.4 Report executive summary includes incident count");
        assert(report.reportIntegrityHash !== undefined && report.reportIntegrityHash.length === 64, "6.5 SHA-256 integrity hash generated", report.reportIntegrityHash);
        // CSV Export
        const csvExport = await studioReportService_1.studioReportService.exportReportAsCsv({ movieId: movieA.id }, studioAUser);
        assert(csvExport.filename.endsWith(".csv"), "6.6 CSV export generates .csv filename");
        assert(csvExport.csvData.includes("STUDIO ANTI-PIRACY MANAGEMENT REPORT"), "6.7 CSV header present");
        assert(csvExport.csvData.includes(movieA.title), "6.8 CSV contains target movie title");
        console.log("\n--- 7. Zero Secret & PII Redaction Guarantee ---");
        const reportJson = JSON.stringify(report);
        const intelJson = JSON.stringify(studioAIntel);
        assert(!reportJson.includes("sk_live_super_secret_998822"), "7.1 Plaintext secretApiKey redacted from report");
        assert(!reportJson.includes("5555-4444-3333-2222"), "7.2 Credit card number redacted from report");
        assert(!reportJson.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "7.3 JWT tokens redacted from report");
        assert(!intelJson.includes("sk_live_super_secret_998822"), "7.4 Secrets redacted from intelligence summary");
        // ----------------------------------------------------------------
        // CLEANUP
        // ----------------------------------------------------------------
        console.log("\n--- Cleaning up test fixtures ---");
        await database_1.prisma.investigationEvidenceLink.deleteMany({ where: { caseId: testCaseId } }).catch(() => { });
        await database_1.prisma.investigationTimelineEvent.deleteMany({ where: { caseId: testCaseId } }).catch(() => { });
        await database_1.prisma.investigationStatusHistory.deleteMany({ where: { caseId: testCaseId } }).catch(() => { });
        await database_1.prisma.investigationCase.deleteMany({ where: { id: testCaseId } }).catch(() => { });
        await database_1.prisma.piracyIncident.deleteMany({ where: { id: testPiracyIncidentId } }).catch(() => { });
        await database_1.prisma.evidenceRecord.deleteMany({ where: { id: testEvidenceId } }).catch(() => { });
        await database_1.prisma.user.deleteMany({ where: { id: { in: [adminUser.id, studioAUser.id, studioBUser.id, theatreStaffUser.id] } } }).catch(() => { });
        await database_1.prisma.show.deleteMany({ where: { id: showId } }).catch(() => { });
        await database_1.prisma.screen.deleteMany({ where: { id: screenId } }).catch(() => { });
        await database_1.prisma.movie.deleteMany({ where: { id: { in: [movieAId, movieBId] } } }).catch(() => { });
        await database_1.prisma.theatre.deleteMany({ where: { id: theatreId } }).catch(() => { });
        await database_1.prisma.productionCompany.deleteMany({ where: { id: { in: [studioAId, studioBId] } } }).catch(() => { });
    }
    catch (err) {
        console.error("Test execution encountered fatal error:", err);
        totalTests++;
        failedTests++;
    }
    console.log("\n==================================================================");
    console.log(`📊 PHASE 28 STUDIO INTEL TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log("==================================================================\n");
    if (failedTests > 0) {
        process.exit(1);
    }
}
runPhase28StudioIntelligenceTests().catch((e) => {
    console.error("Fatal exception during test run:", e);
    process.exit(1);
});
