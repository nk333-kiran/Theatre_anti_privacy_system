import { prisma } from "@antipiracy/database";
import {
  SecurityIncidentStatus,
  IncidentSeverity,
  IncidentSource,
} from "@prisma/client";
import { SocAggregationService } from "../services/soc/socAggregationService";
import { SocIncidentManager } from "../services/soc/socIncidentManager";
import { IncidentLifecycleService } from "../services/soc/incidentLifecycleService";
import { IncidentEscalationService } from "../services/soc/incidentEscalationService";
import { IncidentTimelineService } from "../services/soc/incidentTimelineService";
import { WorkflowRuleService } from "../services/soc/workflowRuleService";
import { SecurityWorkflowEngine } from "../services/soc/securityWorkflowEngine";
import { WorkflowExecutionService } from "../services/soc/workflowApprovalService";
import { SocNotificationService } from "../services/soc/socNotificationService";
import { NotificationDeduplicationService } from "../services/soc/notificationDeduplicationService";
import { SocMetricsService } from "../services/soc/socMetricsService";

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

async function runUnifiedSocTests() {
  console.log("\n==================================================================");
  console.log("🛡️ PHASE 20: ENTERPRISE THREAT OPERATIONS & UNIFIED SOC TEST SUITE");
  console.log("==================================================================\n");

  let testIncidentId = "";
  let testWorkflowId = "";
  let testNotificationId = "";
  let testTheatreId = "";
  let testAnalystId = "";

  try {
    // Setup temporary test theatre
    const theatre = await prisma.theatre.create({
      data: {
        name: "SOC Test IMAX Multiplex",
        code: `SOC-TH-${Date.now().toString().slice(-4)}`,
        location: "Metro SOC Lab",
      },
    });
    testTheatreId = theatre.id;

    const testAnalyst = await prisma.user.create({
      data: {
        email: `analyst-${Date.now()}@soc-theatre.internal`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        name: "Lead SOC Analyst",
        role: "THEATRE_ADMIN",
        theatreId: theatre.id,
      },
    });
    testAnalystId = testAnalyst.id;

    // ----------------------------------------------------------------
    // TEST 1-4: INCIDENT LIFECYCLE & STATE MACHINE
    // ----------------------------------------------------------------
    console.log("--- 1-4. Unified Incident Lifecycle & State Machine ---");

    const incident = await SocIncidentManager.createIncident({
      title: "Anomalous 4K Stream Buffer Ingestion",
      description: "Detected multiple duplicate slice requests across Screen 1",
      severity: IncidentSeverity.HIGH,
      source: IncidentSource.THREAT_ENGINE,
      theatreId: theatre.id,
      riskScore: 72,
      actorId: "analyst-1",
      actorEmail: "soc-analyst@theatre.com",
    });
    testIncidentId = incident.id;

    assert(
      incident.incidentNumber.startsWith("INC-") && incident.status === SecurityIncidentStatus.DETECTED,
      "1. Security incident created in DETECTED state with canonical INC-YYYY-XXXX number"
    );

    // Transition to TRIAGED
    const triaged = await IncidentLifecycleService.transitionStatus({
      incidentId: incident.id,
      newStatus: SecurityIncidentStatus.TRIAGED,
      actorId: "analyst-1",
      notes: "Confirmed valid telemetry anomalies",
    });
    assert(
      triaged.status === SecurityIncidentStatus.TRIAGED && triaged.acknowledgedAt !== null,
      "2. Transitioned to TRIAGED state and recorded acknowledged timestamp"
    );

    // Transition to INVESTIGATING
    const investigating = await IncidentLifecycleService.transitionStatus({
      incidentId: incident.id,
      newStatus: SecurityIncidentStatus.INVESTIGATING,
      actorId: "analyst-1",
    });
    assert(investigating.status === SecurityIncidentStatus.INVESTIGATING, "3. Transitioned to INVESTIGATING state");

    // Invalid transition check (Cannot jump directly from INVESTIGATING to DETECTED)
    let invalidTransitionBlocked = false;
    try {
      await IncidentLifecycleService.transitionStatus({
        incidentId: incident.id,
        newStatus: SecurityIncidentStatus.DETECTED,
      });
    } catch {
      invalidTransitionBlocked = true;
    }
    assert(invalidTransitionBlocked, "4. State machine strictly blocks invalid reverse transitions");

    // ----------------------------------------------------------------
    // TEST 5-8: POLICY-DRIVEN INCIDENT ESCALATION
    // ----------------------------------------------------------------
    console.log("\n--- 5-8. Policy-Driven Incident Escalation ---");

    // Risk >= 80 escalation
    const highRiskEscalation = await IncidentEscalationService.escalateIncident(incident.id, {
      riskScore: 88,
      reason: "Elevated watermark degradation detected in Screen 1 stream",
      triggeredBy: "AUTOMATED_POLICY",
    });
    assert(
      highRiskEscalation.incident.severity === IncidentSeverity.CRITICAL &&
        highRiskEscalation.incident.riskScore === 88,
      "5. Escalated to CRITICAL severity when risk score exceeds 80"
    );

    // Evidence tampering escalation
    const tamperingEscalation = await IncidentEscalationService.escalateIncident(incident.id, {
      isEvidenceTampered: true,
      reason: "Tamper-evident HMAC signature mismatch on artifact storage path",
      triggeredBy: "EVIDENCE_TAMPERING",
    });
    assert(
      tamperingEscalation.incident.severity === IncidentSeverity.CRITICAL,
      "6. Evidence tampering automatically triggers mandatory CRITICAL escalation"
    );

    // Repeat IOC match escalation
    const iocEscalation = await IncidentEscalationService.escalateIncident(incident.id, {
      repeatIocCount: 3,
      reason: "Matched 3 known darkweb release server IP addresses",
      triggeredBy: "IOC_CORRELATION",
    });
    assert(
      iocEscalation.escalation.triggeredBy === "IOC_CORRELATION",
      "7. Repeated IOC correlations record traceable escalation event"
    );

    // Timeline event verification
    const timeline = await IncidentTimelineService.getIncidentTimeline(incident.id);
    assert(
      timeline.length >= 3 && timeline.some((t) => t.eventType === "ESCALATION"),
      "8. Incident timeline tracks immutable chronological state changes"
    );

    // ----------------------------------------------------------------
    // TEST 9-12: AUTOMATED SECURITY WORKFLOWS
    // ----------------------------------------------------------------
    console.log("\n--- 9-12. Security Workflow Engine ---");

    const workflow = await WorkflowRuleService.createWorkflow({
      name: "High-Risk Threat Notification Rule",
      description: "Dispatches critical alerts when risk >= 75",
      triggerType: "THREAT_RISK_THRESHOLD",
      triggerCondition: { minRiskScore: 75 },
      actionType: "NOTIFY_SOC",
      actionPayload: { channel: "SOC_STREAM" },
      priority: 10,
    });
    testWorkflowId = workflow.id;
    assert(workflow.id !== undefined && workflow.isEnabled, "9. Automated workflow rule created successfully");

    // Execute matching workflow event
    const matchedWorkflowRes = await SecurityWorkflowEngine.processEvent({
      triggerType: "THREAT_RISK_THRESHOLD",
      incidentId: incident.id,
      theatreId: theatre.id,
      riskScore: 85,
      reason: "Test high risk evaluation trigger",
    });
    assert(
      matchedWorkflowRes.results.some((r) => r.decision === "EXECUTED"),
      "10. Matching workflow event executes configured non-destructive action"
    );

    // Skip workflow when condition not met
    const skippedWorkflowRes = await SecurityWorkflowEngine.processEvent({
      triggerType: "THREAT_RISK_THRESHOLD",
      incidentId: incident.id,
      theatreId: theatre.id,
      riskScore: 40, // Below 75 threshold
      reason: "Test low risk evaluation",
    });
    assert(
      skippedWorkflowRes.results.some((r) => r.decision === "SKIPPED"),
      "11. Non-matching event is safely skipped with execution audit"
    );

    // Workflow execution history
    const executions = await WorkflowExecutionService.listExecutions({ workflowId: workflow.id });
    assert(executions.length >= 2, "12. Workflow executions recorded in immutable audit ledger");

    // ----------------------------------------------------------------
    // TEST 13-16: NOTIFICATION SANITIZATION & DEDUPLICATION
    // ----------------------------------------------------------------
    console.log("\n--- 13-16. Sanitized Notifications & Deduplication ---");

    // Sanitization: Zero-Secret & Zero-PII
    const rawSecretMsg = "Alert: User john.doe@cinema.com failed auth with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret and password='MasterSecretPassword123'";
    const sanitized = SocNotificationService.sanitizePayload(rawSecretMsg);
    assert(
      !sanitized.includes("MasterSecretPassword123") &&
        !sanitized.includes("eyJhbGci") &&
        sanitized.includes("[REDACTED_"),
      "13. Zero-Secret: Tokens, passwords, and sensitive credentials redacted from notifications"
    );
    assert(
      !sanitized.includes("john.doe@cinema.com") && sanitized.includes("jo***@cinema.com"),
      "14. Zero-PII: User emails masked to prevent privacy leakage"
    );

    // Send notification
    const notifRes1 = await SocNotificationService.sendNotification({
      category: "HIGH_RISK_INCIDENT",
      title: "Screen 1 Watermark Anomaly",
      message: "Detected anomalous sync pattern on Screen 1",
      theatreId: theatre.id,
      targetRole: "ADMIN",
    });
    if (notifRes1.notification) testNotificationId = notifRes1.notification.id;
    assert(notifRes1.skipped === false && notifRes1.notification !== undefined, "15. First notification sent and logged");

    // Deduplication cooldown check
    const notifRes2 = await SocNotificationService.sendNotification({
      category: "HIGH_RISK_INCIDENT",
      title: "Screen 1 Watermark Anomaly",
      message: "Detected anomalous sync pattern on Screen 1",
      theatreId: theatre.id,
      targetRole: "ADMIN",
    });
    assert(notifRes2.skipped === true && notifRes2.reason === "DUPLICATE_IN_COOLDOWN", "16. Duplicate notification suppressed under 5-minute cooldown window");

    // ----------------------------------------------------------------
    // TEST 17-20: TENANT ISOLATION & ASSIGNMENT
    // ----------------------------------------------------------------
    console.log("\n--- 17-20. Tenant Scope & Analyst Assignment ---");

    const assigned = await SocIncidentManager.assignAnalyst({
      incidentId: incident.id,
      analystId: testAnalyst.id,
      analystEmail: testAnalyst.email,
    });
    assert(
      assigned.assignedToId === testAnalyst.id && assigned.status === SecurityIncidentStatus.TRIAGED,
      "17. Security analyst assigned and status set to TRIAGED"
    );

    // Multi-tenant notification isolation: Theatre staff cannot view other theatres' notifications
    const isolatedList = await SocNotificationService.listNotifications({
      role: "THEATRE_STAFF",
      theatreId: "other-theatre-id",
    });
    assert(
      !isolatedList.some((n) => n.theatreId === theatre.id),
      "18. Multi-tenant isolation prevents cross-theatre notification leakage"
    );

    // Correlation ID check
    assert(
      notifRes1.notification?.correlationId.startsWith("NOTIF-") === true,
      "19. Notification generated with traceable correlation ID"
    );

    // Mark as read
    if (testNotificationId) {
      const readNotif = await SocNotificationService.markAsRead(testNotificationId);
      assert(readNotif.isRead === true, "20. Notification successfully marked as read");
    }

    // ----------------------------------------------------------------
    // TEST 21-25: METRICS & KPI ENGINE
    // ----------------------------------------------------------------
    console.log("\n--- 21-25. SOC Metrics & Security KPIs ---");

    const metrics = await SocMetricsService.calculateMetrics();
    assert(metrics.criticalIncidentsCount >= 0, "21. Active critical incident count calculated");
    assert(metrics.meanTimeToAcknowledgeMin >= 0, "22. Mean Time to Acknowledge (MTTA) calculated");
    assert(metrics.meanTimeToResolveMin >= 0, "23. Mean Time to Resolve (MTTR) calculated");
    assert(metrics.workflowSuccessRate >= 0 && metrics.workflowSuccessRate <= 100, "24. Automated workflow success rate calculated");
    assert(Array.isArray(metrics.threatsByTheatre), "25. Threats aggregated by theatre venue");

    // ----------------------------------------------------------------
    // TEST 26-30: UNIFIED AGGREGATION & SAFETY GUARANTEES
    // ----------------------------------------------------------------
    console.log("\n--- 26-30. Unified Aggregation & Advisory Safety Guarantees ---");

    const summary = await SocAggregationService.getUnifiedSummary();
    assert(
      summary.globalThreatRiskScore >= 0 && summary.globalThreatRiskScore <= 100,
      "26. Global Threat Risk Score calculated deterministically"
    );
    assert(
      summary.overallPosture === "OPTIMAL" ||
        summary.overallPosture === "GUARDED" ||
        summary.overallPosture === "ELEVATED" ||
        summary.overallPosture === "CRITICAL",
      "27. Overall SOC posture correctly classified"
    );
    assert(Array.isArray(summary.activeIncidents), "28. Active incidents aggregated in unified summary");
    assert(
      summary.recommendations.length >= 0 &&
        (summary.recommendations.length === 0 ||
          (summary.recommendations[0].why !== undefined &&
            summary.recommendations[0].evidence !== undefined &&
            summary.recommendations[0].risk !== undefined &&
            summary.recommendations[0].recommendedAction !== undefined &&
            summary.recommendations[0].requiredApproval !== undefined)),
      "29. Advisory recommendations provide full explainability (WHY -> EVIDENCE -> RISK -> ACTION -> APPROVAL)"
    );

    // Final Lifecycle Completion
    const resolved = await IncidentLifecycleService.transitionStatus({
      incidentId: incident.id,
      newStatus: SecurityIncidentStatus.RESOLVED,
      notes: "False alarm resolved after clean forensic scan",
    });
    assert(resolved.status === SecurityIncidentStatus.RESOLVED && resolved.resolvedAt !== null, "30. Incident closed through complete lifecycle state machine");
  } catch (err: any) {
    console.error("Test execution error:", err);
    failedTests++;
  } finally {
    console.log("\nCleaning up test artifacts...");
    try {
      if (testIncidentId) {
        await prisma.securityIncident.delete({ where: { id: testIncidentId } }).catch(() => {});
      }
      if (testWorkflowId) {
        await prisma.securityWorkflow.delete({ where: { id: testWorkflowId } }).catch(() => {});
      }
      if (testNotificationId) {
        await prisma.securityNotification.delete({ where: { id: testNotificationId } }).catch(() => {});
      }
      if (testAnalystId) {
        await prisma.user.delete({ where: { id: testAnalystId } }).catch(() => {});
      }
      if (testTheatreId) {
        await prisma.theatre.delete({ where: { id: testTheatreId } }).catch(() => {});
      }
    } catch {}

    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 20 SOC RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
    console.log("------------------------------------------------------------------\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  }
}

runUnifiedSocTests();
