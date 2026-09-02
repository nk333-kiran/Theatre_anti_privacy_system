import { threatIntelligenceEngine } from "../services/intelligence/threatIntelligenceEngine";
import { threatScoringEngine } from "../services/intelligence/threatScoringEngine";
import { signalAggregator } from "../services/intelligence/signalAggregator";
import { patternDetectionEngine } from "../services/intelligence/patternDetectionEngine";
import { predictionEngine } from "../services/intelligence/predictionEngine";
import { intelligenceManager } from "../services/intelligence/intelligenceManager";
import { incidentClusteringService } from "../services/intelligence/incidentClusteringService";
import { automatedResponseEngine } from "../services/intelligence/automatedResponseEngine";
import { intelligenceFeedService } from "../services/intelligence/intelligenceFeedService";
import { prisma } from "@antipiracy/database";

async function runIntelligenceTests() {
  console.log("\n==================================================================");
  console.log("🧠 PHASE 15: AI THREAT INTELLIGENCE & PREDICTIVE TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
      failed++;
    }
  }

  // 1. THREAT SCORING ENGINE & CONFIGURABLE THRESHOLDS
  try {
    const lowEval = threatScoringEngine.computeScore([]);
    assert("1. Zero signals result in 0 score and LOW risk level", lowEval.riskScore === 0 && lowEval.riskLevel === "LOW");

    assert("1. Score 15 maps to LOW (0-19)", threatScoringEngine.getRiskLevel(15) === "LOW");
    assert("1. Score 30 maps to GUARDED (20-39)", threatScoringEngine.getRiskLevel(30) === "GUARDED");
    assert("1. Score 50 maps to ELEVATED (40-59)", threatScoringEngine.getRiskLevel(50) === "ELEVATED");
    assert("1. Score 70 maps to HIGH (60-79)", threatScoringEngine.getRiskLevel(70) === "HIGH");
    assert("1. Score 90 maps to CRITICAL (80-100)", threatScoringEngine.getRiskLevel(90) === "CRITICAL");

    const calculatedScore = threatScoringEngine.computeScore([
      { source: "DRM", eventType: "DRM_KEY_DENIED", weight: 35, confidence: 90, description: "3 denied requests" },
      { source: "PLAYBACK", eventType: "SESSION_REVOKED", weight: 40, confidence: 95, description: "1 revoked stream" },
    ]);
    assert("1. Multi-signal compound calculation aggregates correctly", calculatedScore.riskScore >= 75);
    assert("1. Contributing signals list is preserved", calculatedScore.contributingSignals.length === 2);
    assert("1. Explainable recommendation generated", !!calculatedScore.recommendation);
  } catch (err: any) {
    assert("Scoring tests", false, err.message);
  }

  // 2. PATTERN DETECTION ENGINE
  try {
    const detectedPatterns = patternDetectionEngine.detectPatterns([
      { source: "DRM_SERVER", eventType: "DRM_KEY_DENIED", weight: 40, confidence: 90, description: "DRM key denied" },
      { source: "WATERMARK", eventType: "WATERMARK_IDENTIFIED", weight: 65, confidence: 95, description: "Seat match" },
      { source: "CHECKPOINT", eventType: "ADMISSION_DENIED", weight: 25, confidence: 85, description: "Denied scan" },
    ]);

    assert("2. Detects DRM_ABUSE pattern", detectedPatterns.some((p) => p.patternType === "DRM_ABUSE"));
    assert("2. Detects FORENSIC_LEAK pattern with CRITICAL severity", detectedPatterns.some((p) => p.patternType === "FORENSIC_LEAK" && p.severity === "CRITICAL"));
    assert("2. Detects COORDINATED_MULTI_SESSION pattern on 3+ distinct signals", detectedPatterns.some((p) => p.patternType === "COORDINATED_MULTI_SESSION"));

    // Persist patterns
    const persisted = await patternDetectionEngine.persistPatterns(detectedPatterns);
    assert("2. Persists detected patterns to database", persisted.length >= 3);

    // Duplicate detection increases occurrence count
    const rePersisted = await patternDetectionEngine.persistPatterns(detectedPatterns);
    assert("2. Re-detecting pattern increments occurrence count", rePersisted[0].occurrenceCount >= 2);
  } catch (err: any) {
    assert("Pattern detection tests", false, err.message);
  }

  // 3. PREDICTIVE FORECASTING ENGINE
  try {
    // Seed theatre, movie, show
    const testTheatre = await prisma.theatre.create({
      data: {
        name: "Predictive AI Cinema",
        code: `PRED-THTR-${Date.now()}`,
        location: "Metropolis",
      },
    });

    const testMovie = await prisma.movie.create({
      data: {
        title: "Blockbuster Feature",
        durationMinutes: 120,
        language: "English",
      },
    });

    const testScreen = await prisma.screen.create({
      data: {
        theatreId: testTheatre.id,
        screenNumber: 1,
        name: "Main Auditorium",
        capacity: 200,
      },
    });

    const upcomingShow = await prisma.show.create({
      data: {
        theatreId: testTheatre.id,
        screenId: testScreen.id,
        movieId: testMovie.id,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      },
    });

    const predictions = await predictionEngine.generatePredictions();
    assert("3. Generates predictions for upcoming screenings in 24h window", predictions.length > 0);

    const match = predictions.find((p) => p.showId === upcomingShow.id);
    assert("3. Identifies specific upcoming show prediction", !!match);
    assert("3. Prediction includes explainable factors", !!match?.explanation);
    assert("3. Prediction includes recommended action", !!match?.recommendedAction);

    const persistedPreds = await predictionEngine.persistPredictions(predictions);
    assert("3. Persists predictions into ThreatPrediction records", persistedPreds.length > 0);

    // Investigation link
    const link = await intelligenceManager.linkToInvestigation({
      predictionId: persistedPreds[0].id,
      notes: "Linked from automated prediction engine",
    });
    assert("3. Creates ThreatInvestigationLink linking prediction to forensic workflow", !!link.id);
  } catch (err: any) {
    assert("Prediction tests", false, err.message);
  }

  // 4. INTELLIGENCE MANAGER ORCHESTRATION & SCOPING
  try {
    const stats = await intelligenceManager.getStats();
    assert("4. Returns system-wide threat intelligence stats", typeof stats.overallRiskScore === "number");
    assert("4. Stats include monitored theatres count", stats.monitoredTheatres >= 1);

    const recalc = await intelligenceManager.recalculateAll({ id: "admin-tester", email: "admin@theatre.com", role: "ADMIN" });
    assert("4. RecalculateAll updates scores, patterns, and predictions", recalc.predictionsCount > 0);
  } catch (err: any) {
    assert("Manager tests", false, err.message);
  }

  // 5. INCIDENT CLUSTERING & CONTAINMENT INTEGRATION
  try {
    const inc = await incidentClusteringService.clusterSignals({
      title: "Coordinated Piracy Cluster",
      description: "Multiple replay signals detected",
      signals: [
        { signalType: "SESSION_REPLAY", signalValue: "Duplicate stream tokens", riskWeight: 45, confidence: 90 },
      ],
    });
    assert("5. Clusters threat signals into ThreatIntelligenceIncident", !!inc.id && inc.incidentCode.startsWith("INT-"));

    const actionResult = await automatedResponseEngine.executeAction({
      incidentId: inc.id,
      actionType: "FLAG_SESSION",
      reason: "Automated test containment verification",
      isApprovedBySoc: true,
    });
    assert("5. Executes controlled containment action", actionResult.executed === true);
  } catch (err: any) {
    assert("Incident integration tests", false, err.message);
  }

  // 6. ZERO SECRET LEAKAGE & AUDIT INTEGRITY
  try {
    const overview = await intelligenceFeedService.getOverview();
    const serialized = JSON.stringify(overview);
    assert("6. Zero leak: No JWT secrets exposed", !serialized.includes("JWT_SECRET") && !serialized.includes("supersecret"));
    assert("6. Zero leak: No database passwords exposed", !serialized.includes("postgres_password"));
    assert("6. Zero leak: No raw DRM keys exposed", !serialized.includes("0123456789abcdef"));
  } catch (err: any) {
    assert("Security & audit tests", false, err.message);
  }

  // Clean up
  try {
    await prisma.threatInvestigationLink.deleteMany();
    await prisma.threatPrediction.deleteMany();
    await prisma.threatSignal.deleteMany();
    await prisma.threatPattern.deleteMany();
    await prisma.threatRiskScore.deleteMany();
    await prisma.automatedResponseAction.deleteMany();
    await prisma.threatIntelligenceIncident.deleteMany();
  } catch (_) {}

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 15 INTELLIGENCE RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runIntelligenceTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
