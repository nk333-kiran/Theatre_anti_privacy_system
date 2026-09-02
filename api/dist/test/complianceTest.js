"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const complianceService_1 = require("../services/evidence/complianceService");
const retentionPolicyService_1 = require("../services/evidence/retentionPolicyService");
async function runComplianceTests() {
    console.log("\n==================================================================");
    console.log("📑 PHASE 17: COMPLIANCE, RETENTION & EVIDENCE EXPORT TEST SUITE");
    console.log("==================================================================\n");
    let passed = 0;
    let failed = 0;
    function assert(testName, condition, details) {
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
            failed++;
        }
    }
    // Create test studio & movie
    const testCompany = await database_1.prisma.productionCompany.create({
        data: {
            name: "Compliance Global Studios",
            code: `COMP-${Date.now()}`,
            contactEmail: "legal@globalstudios.com",
        },
    });
    const testMovie = await database_1.prisma.movie.create({
        data: {
            title: "Compliant Cinema Asset",
            durationMinutes: 110,
            language: "English",
            productionCompanyId: testCompany.id,
        },
    });
    let testEvidenceId = "";
    // 1. EVIDENCE RECORD WITH ARTIFACTS & ACCESS LOGS
    try {
        const evidence = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-COMP-${Date.now()}`,
                title: "Compliance Watermark Audit Log",
                classification: "WATERMARK_MATCH",
                severity: "CRITICAL",
                status: "VERIFIED",
                retentionStatus: "ACTIVE",
                productionCompanyId: testCompany.id,
                movieId: testMovie.id,
                source: "STUDIO_WATERMARK_SYSTEM",
                integrityHash: "a1b2c3d4e5f607182930405060708090a1b2c3d4e5f607182930405060708090",
                retentionExpiresAt: new Date(Date.now() + 365 * 86400000),
            },
        });
        testEvidenceId = evidence.id;
        await database_1.prisma.evidenceArtifact.create({
            data: {
                evidenceRecordId: evidence.id,
                artifactName: "tamper_proof_manifest.json",
                artifactType: "WATERMARK_TAG",
                sha256Hash: "f0e1d2c3b4a596877869504030201000f0e1d2c3b4a596877869504030201000",
                fileSizeBytes: 256,
                payloadData: JSON.stringify({ token: "WM_SAFE_PUBLIC_HASH", cinemaCode: "THTR-99" }),
            },
        });
        assert("1. Created verified evidence record for compliance testing", !!evidence.id);
    }
    catch (err) {
        assert("Setup evidence tests", false, err.message);
    }
    // 2. RETENTION EXPIRATION & EVALUATION
    try {
        // Create an already-expired record
        const expiredRecord = await database_1.prisma.evidenceRecord.create({
            data: {
                evidenceNumber: `EV-OLD-${Date.now()}`,
                title: "Old Session Log",
                classification: "PLAYBACK_ANOMALY",
                severity: "LOW",
                status: "COLLECTED",
                retentionStatus: "ACTIVE",
                source: "HISTORICAL_LOGGER",
                retentionExpiresAt: new Date(Date.now() - 10000), // in the past
            },
        });
        const evalResult = await retentionPolicyService_1.retentionPolicyService.runRetentionEvaluation();
        assert("2. Retention policy engine evaluates active records", evalResult.evaluated >= 2);
        assert("2. Expired record automatically transitioned to EXPIRED / ARCHIVED", evalResult.expiredCount >= 1);
        const updatedOld = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: expiredRecord.id },
        });
        assert("2. Old record marked EXPIRED and status ARCHIVED", updatedOld?.retentionStatus === "EXPIRED" && updatedOld?.status === "ARCHIVED");
        // Cleanup expired record
        await database_1.prisma.evidenceRecord.delete({ where: { id: expiredRecord.id } });
    }
    catch (err) {
        assert("Retention evaluation tests", false, err.message);
    }
    // 3. EVIDENCE EXPORT (JSON, CSV, REPORT) WITH ZERO SECRET LEAKAGE
    try {
        const actor = { id: "auditor_01", role: "ADMIN", email: "auditor@compliance.org" };
        // JSON Export
        const jsonExport = await complianceService_1.complianceService.exportEvidence({
            evidenceId: testEvidenceId,
            format: "JSON",
            actor,
        });
        assert("3. JSON evidence export generated with application/json", jsonExport.contentType === "application/json" && jsonExport.data.includes("Compliance Watermark Audit Log"));
        assert("3. Zero-Secret validation: no passwords or private keys in JSON export", !jsonExport.data.includes("password") && !jsonExport.data.includes("jwtSecret"));
        // CSV Export
        const csvExport = await complianceService_1.complianceService.exportEvidence({
            evidenceId: testEvidenceId,
            format: "CSV",
            actor,
        });
        assert("3. CSV evidence export generated with text/csv", csvExport.contentType === "text/csv" && csvExport.data.includes("Category,Property,Value"));
        // Report Export
        const reportExport = await complianceService_1.complianceService.exportEvidence({
            evidenceId: testEvidenceId,
            format: "REPORT",
            actor,
        });
        assert("3. Forensic Text Report generated with title banner", reportExport.contentType === "text/plain" && reportExport.data.includes("FORENSIC EVIDENCE & COMPLIANCE REPORT"));
        // Verify Access Log created
        const accessLogs = await database_1.prisma.evidenceAccessLog.findMany({
            where: { evidenceRecordId: testEvidenceId },
        });
        assert("3. Export generates immutable EvidenceAccessLog entries", accessLogs.length >= 3);
    }
    catch (err) {
        assert("Export tests", false, err.message);
    }
    // 4. COMPLIANCE & HEALTH METRICS STATS
    try {
        const stats = await complianceService_1.complianceService.getComplianceStats();
        assert("4. Compliance stats aggregates total evidence count", stats.evidenceHealth.totalEvidence >= 1);
        assert("4. Compliance stats tracks verified count", stats.evidenceHealth.verifiedCount >= 1);
        assert("4. Compliance stats tracks investigation metrics", stats.investigationMetrics !== undefined);
    }
    catch (err) {
        assert("Compliance stats tests", false, err.message);
    }
    // Cleanup
    try {
        await database_1.prisma.evidenceAccessLog.deleteMany({ where: { evidenceRecordId: testEvidenceId } });
        await database_1.prisma.evidenceChainEvent.deleteMany({ where: { evidenceRecordId: testEvidenceId } });
        await database_1.prisma.evidenceArtifact.deleteMany({ where: { evidenceRecordId: testEvidenceId } });
        await database_1.prisma.evidenceRecord.deleteMany({ where: { id: testEvidenceId } });
        await database_1.prisma.movie.delete({ where: { id: testMovie.id } });
        await database_1.prisma.productionCompany.delete({ where: { id: testCompany.id } });
    }
    catch (_) { }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 17 COMPLIANCE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0)
        process.exit(1);
    else
        process.exit(0);
}
runComplianceTests().catch((err) => {
    console.error("Test runner failed:", err);
    process.exit(1);
});
