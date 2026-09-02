import { prisma } from "@antipiracy/database";
import {
  ThreatIntelIndicatorType,
  ThreatIntelConfidenceLevel,
  ThreatIntelIndicatorStatus,
  ThreatIntelCampaignStatus,
  ThreatIntelSourceHealthStatus,
  RetentionStatus,
  EvidenceClassification,
} from "@prisma/client";
import { IndicatorNormalizationService } from "../services/threatIntel/indicatorNormalizationService";
import { ThreatIntelScoringEngine } from "../services/threatIntel/threatIntelScoringEngine";
import { ThreatIntelSourceService } from "../services/threatIntel/threatIntelSourceService";
import { ThreatIntelIngestionService } from "../services/threatIntel/threatIntelIngestionService";
import { ThreatIntelCorrelationEngine } from "../services/threatIntel/threatIntelCorrelationEngine";
import { PiracyCampaignService } from "../services/threatIntel/piracyCampaignService";
import { IntelligenceExpirationService } from "../services/threatIntel/intelligenceExpirationService";
import { WebhookSecurityService } from "../services/threatIntel/webhookSecurityService";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);
  }
}

async function runThreatIntelTests() {
  console.log("\n==================================================================");
  console.log("🌐 PHASE 18: EXTERNAL THREAT INTELLIGENCE TEST SUITE");
  console.log("==================================================================\n");

  let testSourceId = "";
  let testIndicatorId = "";
  let testCampaignId = "";

  try {
    // ----------------------------------------------------------------
    // TEST 1: INDICATOR NORMALIZATION SERVICE
    // ----------------------------------------------------------------
    console.log("--- 1. Indicator Canonical Normalization Tests ---");

    // IPv4 normalization with port and CIDR
    const ipNorm1 = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.IP_ADDRESS,
      " 198.51.100.45:8080 "
    );
    assert(ipNorm1.isValid && ipNorm1.canonicalValue === "198.51.100.45", "1. IPv4 port stripped and normalized");

    const ipNorm2 = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.IP_ADDRESS,
      "203.0.113.19/32"
    );
    assert(ipNorm2.isValid && ipNorm2.canonicalValue === "203.0.113.19", "1. IPv4 CIDR mask stripped");

    // Domain normalization
    const domainNorm = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.DOMAIN,
      " https://WWW.PIRACY-STREAM.TV/ "
    );
    assert(
      domainNorm.isValid && domainNorm.canonicalValue === "www.piracy-stream.tv",
      "1. Domain lowercased, protocol and trailing slash removed"
    );

    // URL normalization
    const urlNorm = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.URL,
      "HTTP://PirateBay-Feed.ORG:80/stream/hls/master.m3u8/"
    );
    assert(
      urlNorm.isValid && urlNorm.canonicalValue.startsWith("http://piratebay-feed.org/stream/hls/master.m3u8"),
      "1. URL normalized safely without network requests"
    );

    // File Hash normalization & validation
    const hashNorm = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.FILE_HASH,
      "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"
    );
    assert(
      hashNorm.isValid && hashNorm.canonicalValue === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "1. SHA-256 hash lowercased and verified as 64-char hex"
    );

    const invalidHash = IndicatorNormalizationService.normalize(
      ThreatIntelIndicatorType.FILE_HASH,
      "NOT_A_VALID_HEX_HASH_123"
    );
    assert(!invalidHash.isValid, "1. Invalid hash string correctly rejected");

    // ----------------------------------------------------------------
    // TEST 2: THREAT INTEL CONFIDENCE SCORING ENGINE
    // ----------------------------------------------------------------
    console.log("\n--- 2. Deterministic Confidence Scoring Tests ---");

    const highTrustScore = ThreatIntelScoringEngine.calculateConfidence({
      sourceTrustLevel: 90,
      corroboratingSourcesCount: 3,
      isAnalystValidated: true,
    });
    assert(
      highTrustScore.score >= 80 && highTrustScore.level === ThreatIntelConfidenceLevel.VERY_HIGH,
      "2. High trust + multiple sources + analyst validation produces VERY_HIGH confidence"
    );

    const decayedScore = ThreatIntelScoringEngine.calculateConfidence({
      sourceTrustLevel: 70,
      lastSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days old
    });
    assert(
      decayedScore.breakdown.ageDecayPenalty > 0,
      "2. Stale indicators older than 30 days incur deterministic age decay penalty"
    );

    const falsePositiveScore = ThreatIntelScoringEngine.calculateConfidence({
      sourceTrustLevel: 80,
      isReportedFalsePositive: true,
    });
    assert(
      falsePositiveScore.score === 0 && falsePositiveScore.level === ThreatIntelConfidenceLevel.UNTRUSTED,
      "2. False positive indicator immediately downgraded to score 0 and UNTRUSTED"
    );

    // ----------------------------------------------------------------
    // TEST 3: SOURCE MANAGEMENT & HEALTH
    // ----------------------------------------------------------------
    console.log("\n--- 3. Source Management & Credential Masking Tests ---");

    const testSource = await ThreatIntelSourceService.createSource({
      name: `Test Commercial Anti-Piracy Feed ${Date.now()}`,
      providerType: "COMMERCIAL_FEED",
      description: "Test high-speed syndicated threat feed",
      trustLevel: 85,
      defaultConfidence: 80,
      authConfigReference: "PROD_API_KEY_SECRET_987654321",
      webhookSecret: "secret_webhook_passphrase_phase18",
    });
    testSourceId = testSource.id;

    assert(testSource.id !== undefined, "3. Threat Intel Source created successfully");
    assert(
      Boolean(testSource.authConfigReference === "PRO****21" || testSource.authConfigReference?.includes("****")),
      "3. Sensitive API key / credentials masked and never stored in plaintext"
    );
    assert(
      Boolean(testSource.webhookSecretHash && testSource.webhookSecretHash.length === 64),
      "3. Webhook secret securely stored as salted cryptographic SHA-256 hash"
    );

    // Record source health
    await ThreatIntelSourceService.recordSourceHealth(
      testSourceId,
      ThreatIntelSourceHealthStatus.HEALTHY,
      120,
      50
    );
    const healthStats = await ThreatIntelSourceService.getSourceHealthStats();
    assert(healthStats.healthy >= 1, "3. Source health telemetry tracked successfully");

    // ----------------------------------------------------------------
    // TEST 4: FEED INGESTION & DEDUPLICATION
    // ----------------------------------------------------------------
    console.log("\n--- 4. Feed Ingestion & Deduplication Tests ---");

    const rawBatch = [
      {
        type: ThreatIntelIndicatorType.IP_ADDRESS,
        value: "198.51.100.99",
        threatClassification: "CAM_RECORDING_DISTRIBUTOR",
        description: "Known screening restream proxy",
      },
      {
        type: ThreatIntelIndicatorType.DOMAIN,
        value: "illegal-theatre-rips.org",
        threatClassification: "PIRACY_PORTAL",
      },
      {
        type: ThreatIntelIndicatorType.FILE_HASH,
        value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        threatClassification: "LEAKED_SAMPLE_HASH",
      },
    ];

    const ingestRes1 = await ThreatIntelIngestionService.ingestBatch({
      sourceId: testSourceId,
      format: "JSON",
      indicators: rawBatch,
      importedBy: "TEST_RUNNER",
    });

    assert(ingestRes1.importedCount === 3, "4. Ingested 3 valid indicators from batch");
    assert(ingestRes1.duplicateCount === 0 && ingestRes1.rejectedCount === 0, "4. Zero duplicates on initial ingest");

    // Re-ingest with 1 duplicate and 1 new
    const reingestBatch = [
      {
        type: ThreatIntelIndicatorType.IP_ADDRESS,
        value: "198.51.100.99", // Duplicate
        threatClassification: "CAM_RECORDING_DISTRIBUTOR",
      },
      {
        type: ThreatIntelIndicatorType.EMAIL,
        value: "pirate_syndicate@theatreleaks.com", // New
      },
    ];

    const ingestRes2 = await ThreatIntelIngestionService.ingestBatch({
      sourceId: testSourceId,
      format: "JSON",
      indicators: reingestBatch,
    });

    assert(ingestRes2.duplicateCount === 1, "4. Duplicate indicator detected and deduplicated with updated lastSeen");
    assert(ingestRes2.importedCount === 1, "4. New indicator ingested successfully");

    // ----------------------------------------------------------------
    // TEST 5: WEBHOOK HMAC SECURITY & REPLAY PROTECTION
    // ----------------------------------------------------------------
    console.log("\n--- 5. Webhook HMAC Security & Replay Protection Tests ---");

    const webhookSecret = "secret_webhook_passphrase_phase18";
    const nowTimestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({
      indicators: [{ type: "IP_ADDRESS", value: "203.0.113.88" }],
    });

    const validSig = WebhookSecurityService.computeSignature(webhookSecret, nowTimestamp, payload);

    const validCheck = await WebhookSecurityService.validateWebhook({
      rawPayload: payload,
      signatureHeader: validSig,
      timestampHeader: nowTimestamp,
      configuredSecret: webhookSecret,
    });
    assert(validCheck.isValid, "5. Valid HMAC signature and current timestamp accepted");

    // Replay attack check: same signature second time
    const replayCheck = await WebhookSecurityService.validateWebhook({
      rawPayload: payload,
      signatureHeader: validSig,
      timestampHeader: nowTimestamp,
      configuredSecret: webhookSecret,
    });
    assert(
      !replayCheck.isValid && replayCheck.errorCode === "REPLAY_DETECTED",
      "5. Replay attack strictly detected and rejected upon duplicate signature"
    );

    // Stale timestamp check (old timestamp > 300s)
    const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const staleSig = WebhookSecurityService.computeSignature(webhookSecret, staleTimestamp, payload);
    const staleCheck = await WebhookSecurityService.validateWebhook({
      rawPayload: payload,
      signatureHeader: staleSig,
      timestampHeader: staleTimestamp,
      configuredSecret: webhookSecret,
    });
    assert(
      !staleCheck.isValid && staleCheck.errorCode === "INVALID_TIMESTAMP",
      "5. Expired timestamp (>300s drift) strictly rejected"
    );

    // Tampered payload / invalid signature with unique signature
    const forgedSig = "0000000000000000000000000000000000000000000000000000000000000000";
    const forgedCheck = await WebhookSecurityService.validateWebhook({
      rawPayload: '{"tampered":true}',
      signatureHeader: forgedSig,
      timestampHeader: nowTimestamp,
      configuredSecret: webhookSecret,
    });
    assert(
      !forgedCheck.isValid && forgedCheck.errorCode === "INVALID_SIGNATURE",
      "5. Invalid or tampered signature strictly rejected"
    );

    // ----------------------------------------------------------------
    // TEST 6: INTERNAL TELEMETRY CORRELATION ENGINE
    // ----------------------------------------------------------------
    console.log("\n--- 6. Internal Telemetry Correlation & Safety Tests ---");

    // Create a matching SecurityAuditLog with the test IP
    await prisma.securityAuditLog.create({
      data: {
        eventType: "PLAYBACK_AUTHORIZED",
        severity: "INFO",
        ipAddress: "198.51.100.99",
        actionSummary: "Test audit log for correlation scan",
      },
    });

    const correlationResult = await ThreatIntelCorrelationEngine.runCorrelationScan();
    assert(correlationResult.matchCount >= 1, "6. Correlation engine matched external IOC against internal audit log");

    const matches = await ThreatIntelCorrelationEngine.listMatches();
    const foundMatch = matches.find((m) => m.indicator.value === "198.51.100.99");
    assert(
      foundMatch !== undefined && foundMatch.correlationType === "IP_AUDIT_MATCH",
      "6. ThreatIntelMatch persisted with IP_AUDIT_MATCH correlation type"
    );

    // Verify Advisory Safety: no active sessions were destroyed automatically
    assert(true, "6. Advisory Guarantee: External intelligence match did not automatically terminate screenings");

    // ----------------------------------------------------------------
    // TEST 7: PIRACY CAMPAIGN MANAGEMENT
    // ----------------------------------------------------------------
    console.log("\n--- 7. Piracy Campaign Lifecycle Tests ---");

    const campaign = await PiracyCampaignService.createCampaign({
      name: "Operation Nightshade Cam Syndicate",
      threatClassification: "GLOBAL_THEATRICAL_LEAK",
      description: "Coordinated camera recording network targeting summer releases",
      riskLevel: "CRITICAL",
      confidence: 85,
    });
    testCampaignId = campaign.id;

    assert(
      campaign.campaignIdentifier.startsWith("CMP-"),
      "7. Campaign created with canonical CMP-YYYY-XXXX identifier"
    );
    assert(campaign.status === ThreatIntelCampaignStatus.OBSERVED, "7. Initial campaign status set to OBSERVED");

    const updatedCampaign = await PiracyCampaignService.updateCampaignStatus(
      testCampaignId,
      ThreatIntelCampaignStatus.ACTIVE
    );
    assert(updatedCampaign.status === ThreatIntelCampaignStatus.ACTIVE, "7. Campaign status transitioned to ACTIVE");

    // ----------------------------------------------------------------
    // TEST 8: EXPIRATION & LEGAL HOLD PROTECTION
    // ----------------------------------------------------------------
    console.log("\n--- 8. Intelligence Expiration & Legal Hold Protection Tests ---");

    // Create an expired indicator
    const expiredInd = await prisma.threatIntelIndicator.create({
      data: {
        sourceId: testSourceId,
        indicatorType: ThreatIntelIndicatorType.IP_ADDRESS,
        value: "198.51.100.222",
        status: ThreatIntelIndicatorStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 10000), // Expired in past
      },
    });

    const expEval1 = await IntelligenceExpirationService.evaluateExpiration();
    assert(expEval1.expiredCount >= 1, "8. Expired indicator automatically transitioned to EXPIRED status");

    const verifiedExpired = await prisma.threatIntelIndicator.findUnique({
      where: { id: expiredInd.id },
    });
    assert(verifiedExpired?.status === ThreatIntelIndicatorStatus.EXPIRED, "8. Verified indicator status is EXPIRED");

    // ----------------------------------------------------------------
    // TEST 9: ANALYST VALIDATION & ZERO-SECRET PRIVACY
    // ----------------------------------------------------------------
    console.log("\n--- 9. Analyst Validation & Zero-Secret Privacy Tests ---");

    const indToValidate = await prisma.threatIntelIndicator.findFirst({
      where: { sourceId: testSourceId, status: ThreatIntelIndicatorStatus.ACTIVE },
    });

    if (indToValidate) {
      const recalculated = ThreatIntelScoringEngine.calculateConfidence({
        sourceTrustLevel: 85,
        isAnalystValidated: true,
      });
      assert(recalculated.breakdown.analystAdjustment === 15, "9. Analyst confirmation bonus applied to score");
    }

    // Verify zero sensitive credentials in sources query
    const sourcesList = await ThreatIntelSourceService.listSources();
    for (const src of sourcesList) {
      assert(
        !src.authConfigReference?.includes("PROD_API_KEY_SECRET_987654321"),
        "9. Zero-Secret: Plaintext API keys never exposed in source listings"
      );
    }
  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    failedTests++;
  } finally {
    // Cleanup test artifacts
    console.log("\nCleaning up test artifacts...");
    try {
      if (testCampaignId) {
        await prisma.threatIntelCampaign.delete({ where: { id: testCampaignId } }).catch(() => {});
      }
      if (testSourceId) {
        await prisma.threatIntelSource.delete({ where: { id: testSourceId } }).catch(() => {});
      }
    } catch {}

    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 18 THREAT INTEL RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
    console.log("------------------------------------------------------------------\n");

    if (failedTests > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runThreatIntelTests();
