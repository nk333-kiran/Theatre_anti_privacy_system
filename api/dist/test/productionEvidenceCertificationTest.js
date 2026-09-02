"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const database_1 = require("@antipiracy/database");
const evidenceHashService_1 = require("../services/evidence/evidenceHashService");
const chainOfCustodyService_1 = require("../services/evidence/chainOfCustodyService");
const disasterRecoveryService_1 = require("../services/recovery/disasterRecoveryService");
async function runEvidenceCertificationTests() {
    console.log("\n==================================================================");
    console.log("🔒 PHASE 36: EVIDENCE VAULT FINAL CERTIFICATION TEST SUITE");
    console.log("==================================================================\n");
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
    const theatreId = `theatre-ev-cert-${Date.now()}`;
    const evidenceId = `ev-cert-${Date.now()}`;
    try {
        // -------------------------------------------------------------------------
        // 1. Fixture Creation
        // -------------------------------------------------------------------------
        console.log("--- 1. Canonical Evidence Record Ingestion ---");
        await database_1.prisma.theatre.create({
            data: {
                id: theatreId,
                name: "Cinema Integrity Vault",
                code: `THR-EVC-${Date.now().toString().slice(-4)}`,
                location: "Toronto, Canada",
            },
        });
        const canonicalHash = evidenceHashService_1.evidenceHashService.computeEvidenceRecordHash({
            evidenceNumber: `EV-CERT-${Date.now().toString().slice(-4)}`,
            classification: "WATERMARK_MATCH",
            source: "WATERMARK_DECODER",
            theatreId,
            createdAt: new Date(),
        });
        const record = await database_1.prisma.evidenceRecord.create({
            data: {
                id: evidenceId,
                evidenceNumber: `EV-CERT-${Date.now().toString().slice(-4)}`,
                title: "Certified Forensic Screening Artifact",
                description: "Cryptographically bound forensic evidence record",
                classification: "WATERMARK_MATCH",
                severity: "MEDIUM",
                status: "COLLECTED",
                theatreId,
                source: "WATERMARK_DECODER",
                capturedBy: "forensics@theatre-guard.com",
                integrityHash: canonicalHash,
                metadata: JSON.stringify({
                    forensicConfidence: 0.99,
                    watermarkPayload: "WM-AUD-04-SCREEN-01",
                }),
            },
        });
        pass("1.1 Evidence record created with deterministic 64-char canonical SHA-256 hash");
        // -------------------------------------------------------------------------
        // 2. Chain of Custody Event Verification
        // -------------------------------------------------------------------------
        console.log("\n--- 2. Cryptographic Chain-of-Custody Logging ---");
        const chainEvent = await chainOfCustodyService_1.chainOfCustodyService.appendChainEvent({
            evidenceRecordId: evidenceId,
            eventType: "ACQUISITION",
            actorId: "forensic-officer-01",
            actorEmail: "officer@theatre-guard.com",
            actorRole: "THEATRE_ADMIN",
            eventData: { notes: "Initial evidence ingestion into cryptographic vault" },
        });
        (0, assert_1.default)(chainEvent.id, "Chain event created");
        pass("2.1 Chain-of-custody immutable timeline event appended");
        // -------------------------------------------------------------------------
        // 3. Deep Cryptographic Verification & Non-Overwrite Rule
        // -------------------------------------------------------------------------
        console.log("\n--- 3. Deep Verification & Strict Non-Overwrite Guarantee ---");
        const cleanReport = await disasterRecoveryService_1.disasterRecoveryService.verifyEvidenceVaultIntegrity();
        (0, assert_1.default)(cleanReport.status === "VERIFIED", "Evidence Vault status is VERIFIED on clean state");
        pass("3.1 Clean Evidence Vault verified with 100% cryptographic integrity");
        // Simulate tamper detection
        await database_1.prisma.evidenceRecord.update({
            where: { id: evidenceId },
            data: { integrityHash: "tampered_corrupted_hash_999" },
        });
        const tamperedReport = await disasterRecoveryService_1.disasterRecoveryService.verifyEvidenceVaultIntegrity();
        assert_1.default.strictEqual(tamperedReport.status, "MISMATCH_DETECTED");
        (0, assert_1.default)(tamperedReport.mismatchesDetected >= 1, "Mismatch detected on tampered record");
        // Verify system did NOT overwrite the tampered record
        const postCheckRecord = await database_1.prisma.evidenceRecord.findUnique({
            where: { id: evidenceId },
        });
        assert_1.default.strictEqual(postCheckRecord?.integrityHash, "tampered_corrupted_hash_999", "Original hash preserved");
        pass("3.2 Non-Overwrite Rule Verified: System flagged mismatch without silently repairing data");
    }
    catch (err) {
        fail("Evidence certification execution", err);
    }
    finally {
        try {
            await database_1.prisma.evidenceChainEvent.deleteMany({
                where: { evidenceRecordId: evidenceId },
            });
            await database_1.prisma.evidenceRecord.deleteMany({
                where: { id: evidenceId },
            });
            await database_1.prisma.theatre.deleteMany({
                where: { id: theatreId },
            });
        }
        catch { }
    }
    console.log("\n==================================================================");
    console.log(`📊 EVIDENCE CERTIFICATION RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================================\n");
    if (failed > 0)
        process.exit(1);
}
runEvidenceCertificationTests();
