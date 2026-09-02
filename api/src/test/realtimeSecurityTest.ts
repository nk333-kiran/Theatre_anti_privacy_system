import { realtimeEventBus } from "../services/realtime/realtimeEventBus";
import { eventCorrelationEngine } from "../services/realtime/eventCorrelationEngine";
import { riskEscalationEngine } from "../services/realtime/riskEscalationEngine";
import { realtimeThreatEngine } from "../services/realtime/realtimeThreatEngine";
import { realtimeManager } from "../services/realtime/realtimeManager";
import { prisma } from "@antipiracy/database";

async function runRealtimeSecurityTests() {
  console.log("\n==================================================================");
  console.log("⚡ PHASE 16: REAL-TIME ANTI-PIRACY & AUTOMATED SOC TEST SUITE");
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

  // Create prerequisite test entities
  const testCompany = await prisma.productionCompany.create({
    data: {
      name: "Realtime Studios",
      code: `RT-STUDIO-${Date.now()}`,
      contactEmail: "contact@realtimestudios.com",
    },
  });

  const testTheatre = await prisma.theatre.create({
    data: {
      name: "Realtime Test Cinema",
      code: `RT-THTR-${Date.now()}`,
      location: "Metropolis",
    },
  });

  const testScreen = await prisma.screen.create({
    data: {
      theatreId: testTheatre.id,
      screenNumber: 1,
      name: "Screen 1",
      capacity: 100,
    },
  });

  const testMovie = await prisma.movie.create({
    data: {
      title: "Realtime Security Feature",
      durationMinutes: 100,
      language: "English",
      productionCompanyId: testCompany.id,
    },
  });

  const testVideoAsset = await prisma.videoAsset.create({
    data: {
      title: "Main Video Master",
      movie: { connect: { id: testMovie.id } },
      productionCompany: { connect: { id: testCompany.id } },
      streamKey: `stream_key_${Date.now()}`,
      deliveryManifestUrl: "/manifests/hls/master.m3u8",
      originalFilename: "feature.mp4",
      sourceFilePath: "/storage/feature.mp4",
      fileSizeMb: 500,
      mimeType: "video/mp4",
      resolution: "1080p",
      durationSeconds: 6000,
    },
  });

  const testShow = await prisma.show.create({
    data: {
      theatreId: testTheatre.id,
      screenId: testScreen.id,
      movieId: testMovie.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7200000),
    },
  });

  const testTicket = await prisma.ticket.create({
    data: {
      showId: testShow.id,
      ticketNumber: `TKT-RT-${Date.now()}`,
      seatNumber: "A-1",
      price: 15.0,
      status: "ISSUED",
    },
  });

  const testActivation = await prisma.activation.create({
    data: {
      ticketId: testTicket.id,
      activationCode: `ACT-RT-${Date.now()}`,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 7200000),
    },
  });

  // 1. EVENT INGESTION & SANITIZATION (ZERO SECRET LEAKAGE)
  try {
    const rawPayload = {
      eventType: "DRM_LICENSE_DENIED" as const,
      source: "DRM_KEY_SERVER",
      severity: "HIGH" as const,
      theatreId: testTheatre.id,
      metadata: {
        clientIp: "192.168.1.100",
        password: "super_secret_password",
        jwtSecret: "leaked_jwt_secret_token",
        masterKey: "0123456789abcdef0123456789abcdef",
        safeParam: "fairplay_v1",
      },
    };

    const ingested = await realtimeEventBus.publish(rawPayload);
    assert("1. Event ingested with generated eventId and correlationId", !!ingested.eventId && !!ingested.correlationId);
    assert("1. Sanitization: password redacted", ingested.metadata.password === "[REDACTED]");
    assert("1. Sanitization: jwtSecret redacted", ingested.metadata.jwtSecret === "[REDACTED]");
    assert("1. Sanitization: masterKey redacted", ingested.metadata.masterKey === "[REDACTED]");
    assert("1. Non-sensitive metadata preserved intact", ingested.metadata.safeParam === "fairplay_v1");
  } catch (err: any) {
    assert("Event ingestion tests", false, err.message);
  }

  // 2. REAL-TIME THREAT CORRELATION ENGINE
  try {
    eventCorrelationEngine.clearWindow();

    const corrId = `corr_test_${Date.now()}`;
    const venueId = testTheatre.id;

    // Ingest correlated signals: DRM Denial + Playback Terminated + Screenshot attempt
    eventCorrelationEngine.addEvent({
      eventId: "e1",
      correlationId: corrId,
      eventType: "DRM_LICENSE_DENIED",
      source: "DRM",
      severity: "HIGH",
      theatreId: venueId,
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    eventCorrelationEngine.addEvent({
      eventId: "e2",
      correlationId: corrId,
      eventType: "PLAYBACK_TERMINATED",
      source: "STREAM",
      severity: "HIGH",
      theatreId: venueId,
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    eventCorrelationEngine.addEvent({
      eventId: "e3",
      correlationId: corrId,
      eventType: "SCREENSHOT_ATTEMPT_DETECTED",
      source: "CLIENT_AGENT",
      severity: "CRITICAL",
      theatreId: venueId,
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    const clusters = eventCorrelationEngine.correlateThreats();
    assert("2. Correlator identifies PLAYBACK_PIRACY_ACTIVITY cluster", clusters.some((c) => c.clusterType === "PLAYBACK_PIRACY_ACTIVITY"));
    const piracyCluster = clusters.find((c) => c.clusterType === "PLAYBACK_PIRACY_ACTIVITY");
    assert("2. Cluster assigned CRITICAL severity with high confidence (>=90%)", piracyCluster?.severity === "CRITICAL" && (piracyCluster?.confidence ?? 0) >= 90);
    assert("2. Cluster aggregates all 3 contributing events", piracyCluster?.events.length === 3);
  } catch (err: any) {
    assert("Correlation engine tests", false, err.message);
  }

  // 3. DYNAMIC RISK ESCALATION & DECAY
  try {
    riskEscalationEngine.resetScores();

    const initialOverall = riskEscalationEngine.getEntityRisk("OVERALL", "GLOBAL");
    assert("3. Initial risk score starts at 0 (LOW)", initialOverall.currentScore === 0 && initialOverall.riskLevel === "LOW");

    // Escalate with CRITICAL event (+50)
    await riskEscalationEngine.escalateRisk({
      eventId: "ev_crit",
      correlationId: "corr_crit",
      eventType: "FORENSIC_WATERMARK_MATCH",
      source: "WATERMARK_SERVER",
      severity: "CRITICAL",
      theatreId: testTheatre.id,
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    const escalated = riskEscalationEngine.getEntityRisk("THEATRE", testTheatre.id);
    assert("3. Risk score increases dynamically upon threat signal", escalated.currentScore >= 50);
    assert("3. Classification level moves to ELEVATED / HIGH", escalated.riskLevel === "ELEVATED" || escalated.riskLevel === "HIGH");

    // Apply decay
    const decayed = riskEscalationEngine.applyDecay(15, 0); // Force immediate decay
    const postDecay = riskEscalationEngine.getEntityRisk("THEATRE", testTheatre.id);
    assert("3. Risk score decays when suspicious activity stops", postDecay.currentScore < escalated.currentScore);
  } catch (err: any) {
    assert("Risk escalation tests", false, err.message);
  }

  // 4. INCIDENT AUTOMATION & RESPONSE ACTIONS
  try {
    const testSession = await prisma.playbackSession.create({
      data: {
        sessionToken: `sess_test_${Date.now()}`,
        status: "ACTIVE",
        activation: { connect: { id: testActivation.id } },
        videoAsset: { connect: { id: testVideoAsset.id } },
        theatre: { connect: { id: testTheatre.id } },
        show: { connect: { id: testShow.id } },
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const responseAction = await prisma.automatedResponse.create({
      data: {
        actionType: "REVOKE_PLAYBACK_SESSION",
        status: "RECOMMENDED",
        targetId: testSession.id,
        reason: "Real-time threat threshold breached",
        correlationId: "corr_auto_123",
      },
    });

    assert("4. Creates RECOMMENDED automated response action", responseAction.status === "RECOMMENDED");

    // Approve Action
    const approved = await realtimeManager.approveAction(responseAction.id, {
      id: "admin-1",
      email: "soc-admin@theatre.com",
      role: "ADMIN",
    });

    assert("4. Admin approval transitions status to EXECUTED", approved.status === "EXECUTED");

    const updatedSession = await prisma.playbackSession.findUnique({
      where: { id: testSession.id },
    });
    assert("4. Target playback session terminated atomically", updatedSession?.status === "TERMINATED");

    // Reject Action
    const rejectTarget = await prisma.automatedResponse.create({
      data: {
        actionType: "REVOKE_DRM_LICENSE",
        status: "RECOMMENDED",
        reason: "Test rejection workflow",
      },
    });

    const rejected = await realtimeManager.rejectAction(
      rejectTarget.id,
      {
        id: "admin-1",
        email: "soc-admin@theatre.com",
        role: "ADMIN",
      },
      "False alarm - benign network spike"
    );

    assert("4. Admin rejection transitions status to REJECTED with notes", Boolean(rejected.status === "REJECTED" && rejected.result?.includes("False alarm")));
  } catch (err: any) {
    assert("Response action tests", false, err.message);
  }

  // 5. RBAC STREAM ISOLATION & ZERO SECRET EXPOSURE
  try {
    let adminReceived: boolean = false;
    let foreignStudioReceived: boolean = false;

    const mockAdminRes: any = {
      write: (data: string) => {
        if (data.includes("THEATRE_SPIKE")) adminReceived = true;
      },
    };

    const mockStudioRes: any = {
      write: (data: string) => {
        if (data.includes("THEATRE_SPIKE")) foreignStudioReceived = true;
      },
    };

    realtimeManager.addClient("admin_client", mockAdminRes, { role: "ADMIN" });
    realtimeManager.addClient("studio_client", mockStudioRes, { role: "PRODUCTION_COMPANY", productionCompanyId: "comp_123" });

    // Broadcast event for a DIFFERENT movie
    realtimeManager.broadcastEvent({
      eventId: "e_scoped",
      correlationId: "c_scoped",
      eventType: "SUSPICIOUS_ACTIVITY",
      source: "THEATRE_SPIKE",
      severity: "HIGH",
      movieId: "other_movie_999", // not authorized for comp_123
      metadata: {},
      timestamp: new Date().toISOString(),
    });

    assert("5. ADMIN receives global real-time event", Boolean(adminReceived));
    assert("5. PRODUCTION_COMPANY strictly blocked from non-owned movie intelligence", !foreignStudioReceived);

    realtimeManager.removeClient("admin_client");
    realtimeManager.removeClient("studio_client");
  } catch (err: any) {
    assert("RBAC stream tests", false, err.message);
  }

  // Cleanup
  try {
    await prisma.realtimeIncidentNotification.deleteMany();
    await prisma.automatedResponse.deleteMany();
    await prisma.riskHistory.deleteMany();
    await prisma.realtimeThreatEvent.deleteMany();
    await prisma.playbackSession.deleteMany({ where: { theatreId: testTheatre.id } });
    await prisma.activation.deleteMany({ where: { ticketId: testTicket.id } });
    await prisma.ticket.deleteMany({ where: { showId: testShow.id } });
    await prisma.show.deleteMany({ where: { theatreId: testTheatre.id } });
    await prisma.videoAsset.deleteMany({ where: { movieId: testMovie.id } });
    await prisma.screen.deleteMany({ where: { theatreId: testTheatre.id } });
    await prisma.movie.delete({ where: { id: testMovie.id } });
    await prisma.theatre.delete({ where: { id: testTheatre.id } });
    await prisma.productionCompany.delete({ where: { id: testCompany.id } });
  } catch (_) {}

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 16 REALTIME RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runRealtimeSecurityTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
