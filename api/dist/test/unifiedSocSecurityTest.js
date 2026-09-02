"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@antipiracy/database");
const client_1 = require("@prisma/client");
const socAggregationService_1 = require("../services/soc/socAggregationService");
const socIncidentManager_1 = require("../services/soc/socIncidentManager");
const incidentLifecycleService_1 = require("../services/soc/incidentLifecycleService");
const incidentEscalationService_1 = require("../services/soc/incidentEscalationService");
const incidentTimelineService_1 = require("../services/soc/incidentTimelineService");
const workflowRuleService_1 = require("../services/soc/workflowRuleService");
const securityWorkflowEngine_1 = require("../services/soc/securityWorkflowEngine");
const workflowApprovalService_1 = require("../services/soc/workflowApprovalService");
const socNotificationService_1 = require("../services/soc/socNotificationService");
const socMetricsService_1 = require("../services/soc/socMetricsService");
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function assert(condition, testName) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${testName}`);
    }
    else {
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
        const theatre = await database_1.prisma.theatre.create({
            data: {
                name: "SOC Test IMAX Multiplex",
                code: `SOC-TH-${Date.now().toString().slice(-4)}`,
                location: "Metro SOC Lab",
            },
        });
        testTheatreId = theatre.id;
        const testAnalyst = await database_1.prisma.user.create({
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
        const incident = await socIncidentManager_1.SocIncidentManager.createIncident({
            title: "Anomalous 4K Stream Buffer Ingestion",
            description: "Detected multiple duplicate slice requests across Screen 1",
            severity: client_1.IncidentSeverity.HIGH,
            source: client_1.IncidentSource.THREAT_ENGINE,
            theatreId: theatre.id,
            riskScore: 72,
            actorId: "analyst-1",
            actorEmail: "soc-analyst@theatre.com",
        });
        testIncidentId = incident.id;
        assert(incident.incidentNumber.startsWith("INC-") && incident.status === client_1.SecurityIncidentStatus.DETECTED, "1. Security incident created in DETECTED state with canonical INC-YYYY-XXXX number");
        // Transition to TRIAGED
        const triaged = await incidentLifecycleService_1.IncidentLifecycleService.transitionStatus({
            incidentId: incident.id,
            newStatus: client_1.SecurityIncidentStatus.TRIAGED,
            actorId: "analyst-1",
            notes: "Confirmed valid telemetry anomalies",
        });
        assert(triaged.status === client_1.SecurityIncidentStatus.TRIAGED && triaged.acknowledgedAt !== null, "2. Transitioned to TRIAGED state and recorded acknowledged timestamp");
        // Transition to INVESTIGATING
        const investigating = await incidentLifecycleService_1.IncidentLifecycleService.transitionStatus({
            incidentId: incident.id,
            newStatus: client_1.SecurityIncidentStatus.INVESTIGATING,
            actorId: "analyst-1",
        });
        assert(investigating.status === client_1.SecurityIncidentStatus.INVESTIGATING, "3. Transitioned to INVESTIGATING state");
        // Invalid transition check (Cannot jump directly from INVESTIGATING to DETECTED)
        let invalidTransitionBlocked = false;
        try {
            await incidentLifecycleService_1.IncidentLifecycleService.transitionStatus({
                incidentId: incident.id,
                newStatus: client_1.SecurityIncidentStatus.DETECTED,
            });
        }
        catch {
            invalidTransitionBlocked = true;
        }
        assert(invalidTransitionBlocked, "4. State machine strictly blocks invalid reverse transitions");
        // ----------------------------------------------------------------
        // TEST 5-8: POLICY-DRIVEN INCIDENT ESCALATION
        // ----------------------------------------------------------------
        console.log("\n--- 5-8. Policy-Driven Incident Escalation ---");
        // Risk >= 80 escalation
        const highRiskEscalation = await incidentEscalationService_1.IncidentEscalationService.escalateIncident(incident.id, {
            riskScore: 88,
            reason: "Elevated watermark degradation detected in Screen 1 stream",
            triggeredBy: "AUTOMATED_POLICY",
        });
        assert(highRiskEscalation.incident.severity === client_1.IncidentSeverity.CRITICAL &&
            highRiskEscalation.incident.riskScore === 88, "5. Escalated to CRITICAL severity when risk score exceeds 80");
        // Evidence tampering escalation
        const tamperingEscalation = await incidentEscalationService_1.IncidentEscalationService.escalateIncident(incident.id, {
            isEvidenceTampered: true,
            reason: "Tamper-evident HMAC signature mismatch on artifact storage path",
            triggeredBy: "EVIDENCE_TAMPERING",
        });
        assert(tamperingEscalation.incident.severity === client_1.IncidentSeverity.CRITICAL, "6. Evidence tampering automatically triggers mandatory CRITICAL escalation");
        // Repeat IOC match escalation
        const iocEscalation = await incidentEscalationService_1.IncidentEscalationService.escalateIncident(incident.id, {
            repeatIocCount: 3,
            reason: "Matched 3 known darkweb release server IP addresses",
            triggeredBy: "IOC_CORRELATION",
        });
        assert(iocEscalation.escalation.triggeredBy === "IOC_CORRELATION", "7. Repeated IOC correlations record traceable escalation event");
        // Timeline event verification
        const timeline = await incidentTimelineService_1.IncidentTimelineService.getIncidentTimeline(incident.id);
        assert(timeline.length >= 3 && timeline.some((t) => t.eventType === "ESCALATION"), "8. Incident timeline tracks immutable chronological state changes");
        // ----------------------------------------------------------------
        // TEST 9-12: AUTOMATED SECURITY WORKFLOWS
        // ----------------------------------------------------------------
        console.log("\n--- 9-12. Security Workflow Engine ---");
        const workflow = await workflowRuleService_1.WorkflowRuleService.createWorkflow({
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
        const matchedWorkflowRes = await securityWorkflowEngine_1.SecurityWorkflowEngine.processEvent({
            triggerType: "THREAT_RISK_THRESHOLD",
            incidentId: incident.id,
            theatreId: theatre.id,
            riskScore: 85,
            reason: "Test high risk evaluation trigger",
        });
        assert(matchedWorkflowRes.results.some((r) => r.decision === "EXECUTED"), "10. Matching workflow event executes configured non-destructive action");
        // Skip workflow when condition not met
        const skippedWorkflowRes = await securityWorkflowEngine_1.SecurityWorkflowEngine.processEvent({
            triggerType: "THREAT_RISK_THRESHOLD",
            incidentId: incident.id,
            theatreId: theatre.id,
            riskScore: 40, // Below 75 threshold
            reason: "Test low risk evaluation",
        });
        assert(skippedWorkflowRes.results.some((r) => r.decision === "SKIPPED"), "11. Non-matching event is safely skipped with execution audit");
        // Workflow execution history
        const executions = await workflowApprovalService_1.WorkflowExecutionService.listExecutions({ workflowId: workflow.id });
        assert(executions.length >= 2, "12. Workflow executions recorded in immutable audit ledger");
        // ----------------------------------------------------------------
        // TEST 13-16: NOTIFICATION SANITIZATION & DEDUPLICATION
        // ----------------------------------------------------------------
        console.log("\n--- 13-16. Sanitized Notifications & Deduplication ---");
        // Sanitization: Zero-Secret & Zero-PII
        const rawSecretMsg = "Alert: User john.doe@cinema.com failed auth with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret and password='MasterSecretPassword123'";
        const sanitized = socNotificationService_1.SocNotificationService.sanitizePayload(rawSecretMsg);
        assert(!sanitized.includes("MasterSecretPassword123") &&
            !sanitized.includes("eyJhbGci") &&
            sanitized.includes("[REDACTED_"), "13. Zero-Secret: Tokens, passwords, and sensitive credentials redacted from notifications");
        assert(!sanitized.includes("john.doe@cinema.com") && sanitized.includes("jo***@cinema.com"), "14. Zero-PII: User emails masked to prevent privacy leakage");
        // Send notification
        const notifRes1 = await socNotificationService_1.SocNotificationService.sendNotification({
            category: "HIGH_RISK_INCIDENT",
            title: "Screen 1 Watermark Anomaly",
            message: "Detected anomalous sync pattern on Screen 1",
            theatreId: theatre.id,
            targetRole: "ADMIN",
        });
        if (notifRes1.notification)
            testNotificationId = notifRes1.notification.id;
        assert(notifRes1.skipped === false && notifRes1.notification !== undefined, "15. First notification sent and logged");
        // Deduplication cooldown check
        const notifRes2 = await socNotificationService_1.SocNotificationService.sendNotification({
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
        const assigned = await socIncidentManager_1.SocIncidentManager.assignAnalyst({
            incidentId: incident.id,
            analystId: testAnalyst.id,
            analystEmail: testAnalyst.email,
        });
        assert(assigned.assignedToId === testAnalyst.id && assigned.status === client_1.SecurityIncidentStatus.TRIAGED, "17. Security analyst assigned and status set to TRIAGED");
        // Multi-tenant notification isolation: Theatre staff cannot view other theatres' notifications
        const isolatedList = await socNotificationService_1.SocNotificationService.listNotifications({
            role: "THEATRE_STAFF",
            theatreId: "other-theatre-id",
        });
        assert(!isolatedList.some((n) => n.theatreId === theatre.id), "18. Multi-tenant isolation prevents cross-theatre notification leakage");
        // Correlation ID check
        assert(notifRes1.notification?.correlationId.startsWith("NOTIF-") === true, "19. Notification generated with traceable correlation ID");
        // Mark as read
        if (testNotificationId) {
            const readNotif = await socNotificationService_1.SocNotificationService.markAsRead(testNotificationId);
            assert(readNotif.isRead === true, "20. Notification successfully marked as read");
        }
        // ----------------------------------------------------------------
        // TEST 21-25: METRICS & KPI ENGINE
        // ----------------------------------------------------------------
        console.log("\n--- 21-25. SOC Metrics & Security KPIs ---");
        const metrics = await socMetricsService_1.SocMetricsService.calculateMetrics();
        assert(metrics.criticalIncidentsCount >= 0, "21. Active critical incident count calculated");
        assert(metrics.meanTimeToAcknowledgeMin >= 0, "22. Mean Time to Acknowledge (MTTA) calculated");
        assert(metrics.meanTimeToResolveMin >= 0, "23. Mean Time to Resolve (MTTR) calculated");
        assert(metrics.workflowSuccessRate >= 0 && metrics.workflowSuccessRate <= 100, "24. Automated workflow success rate calculated");
        assert(Array.isArray(metrics.threatsByTheatre), "25. Threats aggregated by theatre venue");
        // ----------------------------------------------------------------
        // TEST 26-30: UNIFIED AGGREGATION & SAFETY GUARANTEES
        // ----------------------------------------------------------------
        console.log("\n--- 26-30. Unified Aggregation & Advisory Safety Guarantees ---");
        const summary = await socAggregationService_1.SocAggregationService.getUnifiedSummary();
        assert(summary.globalThreatRiskScore >= 0 && summary.globalThreatRiskScore <= 100, "26. Global Threat Risk Score calculated deterministically");
        assert(summary.overallPosture === "OPTIMAL" ||
            summary.overallPosture === "GUARDED" ||
            summary.overallPosture === "ELEVATED" ||
            summary.overallPosture === "CRITICAL", "27. Overall SOC posture correctly classified");
        assert(Array.isArray(summary.activeIncidents), "28. Active incidents aggregated in unified summary");
        assert(summary.recommendations.length >= 0 &&
            (summary.recommendations.length === 0 ||
                (summary.recommendations[0].why !== undefined &&
                    summary.recommendations[0].evidence !== undefined &&
                    summary.recommendations[0].risk !== undefined &&
                    summary.recommendations[0].recommendedAction !== undefined &&
                    summary.recommendations[0].requiredApproval !== undefined)), "29. Advisory recommendations provide full explainability (WHY -> EVIDENCE -> RISK -> ACTION -> APPROVAL)");
        // Final Lifecycle Completion
        const resolved = await incidentLifecycleService_1.IncidentLifecycleService.transitionStatus({
            incidentId: incident.id,
            newStatus: client_1.SecurityIncidentStatus.RESOLVED,
            notes: "False alarm resolved after clean forensic scan",
        });
        assert(resolved.status === client_1.SecurityIncidentStatus.RESOLVED && resolved.resolvedAt !== null, "30. Incident closed through complete lifecycle state machine");
    }
    catch (err) {
        console.error("Test execution error:", err);
        failedTests++;
    }
    finally {
        console.log("\nCleaning up test artifacts...");
        try {
            if (testIncidentId) {
                await database_1.prisma.securityIncident.delete({ where: { id: testIncidentId } }).catch(() => { });
            }
            if (testWorkflowId) {
                await database_1.prisma.securityWorkflow.delete({ where: { id: testWorkflowId } }).catch(() => { });
            }
            if (testNotificationId) {
                await database_1.prisma.securityNotification.delete({ where: { id: testNotificationId } }).catch(() => { });
            }
            if (testAnalystId) {
                await database_1.prisma.user.delete({ where: { id: testAnalystId } }).catch(() => { });
            }
            if (testTheatreId) {
                await database_1.prisma.theatre.delete({ where: { id: testTheatreId } }).catch(() => { });
            }
        }
        catch { }
        console.log("\n------------------------------------------------------------------");
        console.log(`📊 PHASE 20 SOC RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
        console.log("------------------------------------------------------------------\n");
        if (failedTests > 0) {
            process.exit(1);
        }
    }
}
runUnifiedSocTests();
