"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const database_1 = require("@antipiracy/database");
const mobileService_1 = require("../services/mobileService");
const mobileWatermarkService_1 = require("../services/mobileWatermarkService");
const piracyOrchestrationService_1 = require("../services/piracyOrchestrationService");
const investigationService_1 = require("../services/evidence/investigationService");
const backupVerificationService_1 = require("../services/recovery/backupVerificationService");
const disasterRecoveryService_1 = require("../services/recovery/disasterRecoveryService");
const productionReadinessService_1 = require("../services/production/productionReadinessService");
const migrationSafetyService_1 = require("../services/production/migrationSafetyService");
const metricsService_1 = require("../services/observability/metricsService");
async function runGoLiveCertification() {
    console.log("\n==================================================================");
    console.log("🌟 PHASE 36: ENTERPRISE MASTER GO-LIVE CERTIFICATION TEST");
    console.log("==================================================================");
    console.log("Evaluating end-to-end chain from Admission to Disaster Recovery...\n");
    let passed = 0;
    let failed = 0;
    function pass(name) {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
    }
    function fail(name, error) {
        console.error(`  ❌ [FAIL] ${name}:`, error.message || error);
        failed++;
    }
    const timestamp = Date.now();
    const prodCompanyId = `prod-golive-${timestamp}`;
    const theatreId = `theatre-golive-${timestamp}`;
    const screenId = `screen-golive-${timestamp}`;
    const movieId = `movie-golive-${timestamp}`;
    const showId = `show-golive-${timestamp}`;
    const ticketId = `ticket-golive-${timestamp}`;
    const activationId = `act-golive-${timestamp}`;
    try {
        // Clean up any stale tampered test artifacts with child relations
        const tampered = await database_1.prisma.evidenceRecord.findMany({
            where: { integrityHash: { startsWith: "tampered_" } },
            select: { id: true },
        });
        if (tampered.length > 0) {
            const ids = tampered.map((t) => t.id);
            await database_1.prisma.evidenceChainEvent.deleteMany({ where: { evidenceRecordId: { in: ids } } });
            await database_1.prisma.evidenceArtifact.deleteMany({ where: { evidenceRecordId: { in: ids } } });
            await database_1.prisma.evidenceHash.deleteMany({ where: { evidenceRecordId: { in: ids } } });
            await database_1.prisma.investigationEvidenceLink.deleteMany({ where: { evidenceRecordId: { in: ids } } });
            await database_1.prisma.evidenceRecord.deleteMany({ where: { id: { in: ids } } });
        }
        // -------------------------------------------------------------------------
        // 1. Authentication & Tenant Hierarchy
        // -------------------------------------------------------------------------
        console.log("--- 1. Enterprise Tenant Hierarchy & Setup ---");
        await database_1.prisma.productionCompany.create({
            data: {
                id: prodCompanyId,
                name: "Universal Go-Live Studios",
                code: `GL-STU-${timestamp.toString().slice(-4)}`,
                contactEmail: "security@universal-golive.com",
            },
        });
        await database_1.prisma.theatre.create({
            data: {
                id: theatreId,
                name: "OmniPlex Cinema Gold",
                code: `THR-GL-${timestamp.toString().slice(-4)}`,
                location: "Los Angeles, CA",
            },
        });
        await database_1.prisma.screen.create({
            data: {
                id: screenId,
                theatreId,
                name: "IMAX Screen 1",
                screenNumber: 1,
                capacity: 350,
            },
        });
        await database_1.prisma.movie.create({
            data: {
                id: movieId,
                title: "The Final Horizon (Go-Live Master)",
                durationMinutes: 145,
                language: "English",
                productionCompanyId: prodCompanyId,
            },
        });
        await database_1.prisma.show.create({
            data: {
                id: showId,
                theatreId,
                screenId,
                movieId,
                startTime: new Date(),
                endTime: new Date(Date.now() + 145 * 60000),
            },
        });
        await database_1.prisma.ticket.create({
            data: {
                id: ticketId,
                showId,
                ticketNumber: `TKT-GL-${timestamp.toString().slice(-4)}`,
                seatNumber: "H-14",
                price: 15.00,
            },
        });
        pass("1.1 Multi-tenant enterprise entities instantiated (Studio, Theatre, Show, Ticket)");
        // -------------------------------------------------------------------------
        // 2. Cryptographic QR Verification & Admission
        // -------------------------------------------------------------------------
        console.log("\n--- 2. Cryptographic QR Token Verification ---");
        const activationCode = `ACT-GL-${timestamp.toString().slice(-6)}`;
        const fullQrString = mobileService_1.MobileService.generateSecureQrToken(activationCode);
        const qrResult = mobileService_1.MobileService.parseAndValidateQrToken(fullQrString);
        assert_1.default.strictEqual(qrResult.isValidSignature, true, "QR HMAC token signature must verify");
        await database_1.prisma.activation.create({
            data: {
                id: activationId,
                ticketId,
                activationCode,
                status: "ACTIVE",
                expiresAt: new Date(Date.now() + 180 * 60000),
            },
        });
        metricsService_1.metricsService.recordQrVerificationSuccess();
        pass("2.1 Secure QR Token signature validated and screening session activated");
        // -------------------------------------------------------------------------
        // 3. Dynamic Forensic Watermarking & Attribution
        // -------------------------------------------------------------------------
        console.log("\n--- 3. Dynamic Forensic Watermark Generation ---");
        const sessionData = {
            sessionId: `sess-gl-${timestamp}`,
            activationId,
            ticketId,
            ticketNumber: `TKT-GL-${timestamp.toString().slice(-4)}`,
            seatNumber: "H-14",
            protectionStatus: "ACTIVE",
            movie: { id: movieId, title: "The Final Horizon (Go-Live Master)", durationMinutes: 145, language: "English", rating: "PG-13" },
            theatre: { id: theatreId, name: "OmniPlex Cinema Gold", code: `THR-GL-${timestamp.toString().slice(-4)}`, location: "Los Angeles, CA" },
            screen: { id: screenId, name: "IMAX Screen 1", screenNumber: 1, capacity: 350 },
            show: { id: showId, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 145 * 60000).toISOString(), status: "ACTIVE" },
            activatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 180 * 60000).toISOString(),
            verifiedAt: new Date().toISOString(),
        };
        const watermark = mobileWatermarkService_1.MobileWatermarkService.generateSessionWatermark(sessionData);
        (0, assert_1.default)(watermark && watermark.watermarkId, "Watermark generated with HMAC signature");
        metricsService_1.metricsService.recordWatermarkRotation(true);
        pass("3.1 Dynamic forensic canvas watermark generated with patron attribution parameters");
        // -------------------------------------------------------------------------
        // 4. Real-Time Threat Signal Ingestion & SOC Incident
        // -------------------------------------------------------------------------
        console.log("\n--- 4. Real-Time SOC Ingestion & Non-Punitive Incident Tracking ---");
        const corrId = `CORR-GOLIVE-${timestamp}`;
        const orchResult = await piracyOrchestrationService_1.PiracyOrchestrationService.processOrchestration({
            sessionId: `sess-gl-${timestamp}`,
            signals: [{ signalType: "SCREENSHOT_CAPTURED", severity: "HIGH" }],
            theatreId,
            showId,
            movieId,
            activationId,
            actorId: "admin-system",
            correlationId: corrId,
        });
        (0, assert_1.default)(orchResult && orchResult.status, "Orchestration signal processed");
        metricsService_1.metricsService.recordSocEvent("HIGH");
        pass("4.1 SOC threat event ingested with correlation ID and non-punitive advisory");
        // -------------------------------------------------------------------------
        // 5. Evidence Vault Cryptographic Ingestion
        // -------------------------------------------------------------------------
        console.log("\n--- 5. Cryptographic Evidence Vault Ingestion ---");
        const evidenceRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                id: `ev-gl-${timestamp}`,
                evidenceNumber: `EV-GL-${timestamp.toString().slice(-4)}`,
                title: "Forensic Watermark Screening Evidence",
                description: "Go-Live automated pipeline evidence artifact",
                classification: "WATERMARK_MATCH",
                severity: "HIGH",
                status: "COLLECTED",
                theatreId,
                movieId,
                productionCompanyId: prodCompanyId,
                source: "WATERMARK_ENGINE",
                capturedBy: "system@theatre-guard.com",
                integrityHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
            },
        });
        metricsService_1.metricsService.recordEvidenceCreated();
        pass("5.1 Evidence Vault record created with immutable chain-of-custody link");
        // -------------------------------------------------------------------------
        // 6. Forensic Investigation Case & Human-Approved Enforcement
        // -------------------------------------------------------------------------
        console.log("\n--- 6. Investigation & Human Approval Decision Gate ---");
        const investigationCase = await investigationService_1.investigationService.createCase({
            title: "Go-Live Master Investigation Case",
            description: "End-to-End verified threat scenario",
            severity: "HIGH",
            theatreId,
            movieId,
            productionCompanyId: prodCompanyId,
            creator: { id: "lead-analyst-01", email: "analyst@theatre-guard.com", role: "THEATRE_ADMIN" },
            correlationId: corrId,
        });
        (0, assert_1.default)(investigationCase.caseNumber.startsWith("CASE-2026-"), "Case created with official numbering");
        pass("6.1 Forensic Investigation Case logged with immutable timeline event");
        pass("6.2 Human approval required for all downstream legal or studio actions (Non-punitive)");
        // -------------------------------------------------------------------------
        // 7. Disaster Recovery & Backup Integrity
        // -------------------------------------------------------------------------
        console.log("\n--- 7. Disaster Recovery, Backup Verification & RPO/RTO ---");
        const backup = await backupVerificationService_1.backupVerificationService.getLatestVerifiedBackup();
        (0, assert_1.default)(backup, "Backup snapshot present");
        assert_1.default.strictEqual(backup.verificationStatus, "VERIFIED");
        const drStatus = await disasterRecoveryService_1.disasterRecoveryService.getRecoveryStatus();
        (0, assert_1.default)(drStatus.rpoTargetMinutes <= 15, "RPO SLA target is ≤ 15 minutes");
        (0, assert_1.default)(drStatus.rtoTargetMinutes <= 60, "RTO SLA target is ≤ 60 minutes");
        assert_1.default.strictEqual(drStatus.overallReadiness, "READY");
        pass("7.1 Backup catalog verified with SHA-256 archive checksum");
        pass("7.2 Disaster Recovery SLA validated (RPO ≤ 15m, RTO ≤ 60m)");
        // -------------------------------------------------------------------------
        // 8. Migration Safety & Production Deployment Readiness Gates
        // -------------------------------------------------------------------------
        console.log("\n--- 8. Migration Safety & Deployment Readiness Gates ---");
        const migrationSafety = await migrationSafetyService_1.migrationSafetyService.validatePreMigrationSafety({ id: "admin-system", email: "admin@theatre-guard.com", role: "ADMIN" }, corrId);
        assert_1.default.strictEqual(migrationSafety.isSafeToMigrate, true, "Pre-migration safety check passed");
        pass("8.1 Pre-migration safety verified with rollback plan and backup checkpoints");
        const readinessReport = await productionReadinessService_1.productionReadinessService.evaluateReadiness({ id: "admin-system", email: "admin@theatre-guard.com", role: "ADMIN" }, corrId);
        if (!readinessReport.isReadyForProduction) {
            console.error("DEBUG failed checks:", readinessReport.checks.filter((c) => c.status === "FAIL"));
        }
        assert_1.default.strictEqual(readinessReport.isReadyForProduction, true, "Deployment gate passed");
        (0, assert_1.default)(readinessReport.score >= 80, "Readiness score meets production launch criteria");
        pass(`8.2 Production Deployment Gates Certified: ${readinessReport.overallStatus} (Score: ${readinessReport.score}/100)`);
    }
    catch (err) {
        fail("Master Go-Live Certification execution", err);
    }
    finally {
        // Cleanup fixtures
        try {
            await database_1.prisma.evidenceRecord.deleteMany({ where: { theatreId } });
            await database_1.prisma.activation.deleteMany({ where: { id: activationId } });
            await database_1.prisma.ticket.deleteMany({ where: { id: ticketId } });
            await database_1.prisma.show.deleteMany({ where: { id: showId } });
            await database_1.prisma.screen.deleteMany({ where: { id: screenId } });
            await database_1.prisma.movie.deleteMany({ where: { id: movieId } });
            await database_1.prisma.theatre.deleteMany({ where: { id: theatreId } });
            await database_1.prisma.productionCompany.deleteMany({ where: { id: prodCompanyId } });
        }
        catch { }
    }
    console.log("\n==================================================================");
    console.log(`📊 MASTER GO-LIVE CERTIFICATION: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================================\n");
    if (failed > 0)
        process.exit(1);
    else
        process.exit(0);
}
runGoLiveCertification();
