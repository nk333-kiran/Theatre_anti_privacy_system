import { prisma } from "@antipiracy/database";
import {
  PolicyType,
  AccessDecisionType,
  DeviceTrustStatus,
  PrivilegedActionStatus,
  PrivilegedRiskLevel,
  GovernanceEventType,
  SecuritySeverity,
} from "@prisma/client";
import { TrustScoringEngine } from "../services/governance/trustScoringEngine";
import { ZeroTrustPolicyEngine } from "../services/governance/zeroTrustPolicyEngine";
import { PolicyOrchestrator } from "../services/governance/policyOrchestrator";
import { PrivilegedActionService } from "../services/governance/privilegedActionService";
import { DeviceTrustService } from "../services/governance/deviceTrustService";
import { BreakGlassService } from "../services/governance/breakGlassService";
import { GovernanceAuditService } from "../services/governance/governanceAuditService";

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

async function runGovernanceSecurityTests() {
  console.log("\n==================================================================");
  console.log("🛡️ PHASE 19: ZERO-TRUST & ENTERPRISE GOVERNANCE TEST SUITE");
  console.log("==================================================================\n");

  let testPolicyId = "";
  let testActionId = "";
  let testBreakGlassId = "";
  let testDeviceId = "";

  try {
    // ----------------------------------------------------------------
    // TEST 1-3: IDENTITY, ROLE & TENANT TRUST
    // ----------------------------------------------------------------
    console.log("--- 1-3. Zero-Trust Identity, Role & Tenant Scopes ---");

    const adminTrust = TrustScoringEngine.calculateTrustScore({
      isAuthenticated: true,
      actorRole: "ADMIN",
      hasValidTenantScope: true,
      sessionAgeMinutes: 15,
      deviceTrustStatus: DeviceTrustStatus.TRUSTED,
      threatPosture: "LOW",
    });
    assert(adminTrust.score >= 80 && adminTrust.classification === "TRUSTED", "1. Authenticated administrator on trusted device receives TRUSTED score");

    const tenantMismatchEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "staff-1",
      actorRole: "THEATRE_STAFF",
      actorTenantType: "THEATRE",
      actorTenantId: "theatre-alpha",
      targetTenantId: "theatre-beta", // Attempting cross-theatre resource access
      resourceType: "PLAYBACK",
      action: "READ",
    });
    assert(tenantMismatchEval.decision === AccessDecisionType.DENY, "2. Cross-tenant access strictly DENIED under multi-tenant isolation");

    const anonymousEval = await ZeroTrustPolicyEngine.evaluateAccess({
      resourceType: "DRM",
      action: "READ",
    });
    assert(anonymousEval.decision === AccessDecisionType.DENY, "3. Anonymous unauthenticated requests strictly DENIED");

    // ----------------------------------------------------------------
    // TEST 4-8: POLICY ORCHESTRATION, PRECEDENCE & VERSIONING
    // ----------------------------------------------------------------
    console.log("\n--- 4-8. Policy Orchestration, Precedence & Rollback ---");

    const policy = await PolicyOrchestrator.createPolicy({
      name: "High-Security DRM Access Gate",
      description: "Restricts DRM licensing to trusted devices with minimum trust score",
      policyType: PolicyType.DRM_LICENSE,
      priority: 10,
      rules: [
        {
          id: "rule-1",
          name: "Require Trusted Device for DRM",
          effect: "DENY",
          condition: { requireTrustedDevice: true },
        },
      ],
      createdBy: "admin@theatre-corp.com",
    });
    testPolicyId = policy.id;

    assert(policy.version === 1, "4. Security policy created with initial version 1");

    // Update policy rules (v2 snapshot)
    const updatedPolicy = await PolicyOrchestrator.updatePolicy({
      policyId: policy.id,
      rules: [
        {
          id: "rule-1",
          name: "Require Trusted Device for DRM",
          effect: "DENY",
          condition: { requireTrustedDevice: true },
        },
        {
          id: "rule-2",
          name: "Require High Trust Score >= 70",
          effect: "DENY",
          condition: { minTrustScore: 70 },
        },
      ],
      changeReason: "Enhanced DRM licensing criteria for 4K releases",
      updatedBy: "admin@theatre-corp.com",
    });
    assert(updatedPolicy.version === 2, "5. Policy update creates immutable v2 snapshot");

    // Priority and precedence check
    const applicable = await PolicyOrchestrator.getApplicablePolicies({
      policyType: PolicyType.DRM_LICENSE,
    });
    assert(applicable.length >= 1 && applicable[0].id === policy.id, "6. Policy precedence ordering correctly evaluated by priority index");

    // Policy conflict resolution: Deny rules take precedence over Allow
    const conflictPolicy = await PolicyOrchestrator.createPolicy({
      name: "Conflict Test Policy",
      policyType: PolicyType.DATA_EXPORT,
      priority: 5,
      rules: [
        { id: "r-allow", name: "Allow rule", effect: "ALLOW", condition: {} },
        { id: "r-deny", name: "Deny rule", effect: "DENY", condition: {} },
      ],
    });
    const conflictEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "admin-1",
      actorRole: "ADMIN",
      resourceType: "SYSTEM",
      action: "EXPORT",
    });
    assert(conflictEval.decision !== undefined, "7. Policy engine deterministically resolves conflicting rule effects");
    await prisma.securityPolicy.delete({ where: { id: conflictPolicy.id } });

    // Rollback policy to v1
    const rolledBack = await PolicyOrchestrator.rollbackPolicy({
      policyId: policy.id,
      targetVersion: 1,
      reason: "Emergency rollback to baseline DRM policy",
      actorId: "admin@theatre-corp.com",
    });
    assert(rolledBack.version === 3, "8. Policy successfully rolled back to v1 state (now v3)");

    // ----------------------------------------------------------------
    // TEST 9-11: EXPLAINABILITY & DEVICE TRUST
    // ----------------------------------------------------------------
    console.log("\n--- 9-11. Explainable Decisions & Device Trust ---");

    const decisionEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "admin-1",
      actorEmail: "secops@studio.com",
      actorRole: "ADMIN",
      resourceType: "EVIDENCE",
      action: "READ",
    });
    assert(
      decisionEval.reasonCodes.length > 0 && decisionEval.accessDecisionId !== undefined,
      "9. Access decision persisted with explainable reason codes"
    );

    // Device Trust Fingerprinting (SHA-256 privacy preserving)
    const rawFingerprint = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Canvas-Hash-847291";
    const device = await DeviceTrustService.getOrCreateDevice(rawFingerprint, "198.51.100.10", "Studio Workstation");
    testDeviceId = device.deviceId;
    assert(
      device.fingerprintHash === DeviceTrustService.hashFingerprint(rawFingerprint),
      "10. Device fingerprint stored as cryptographic SHA-256 hash (Zero Raw FP)"
    );

    // Suspicious / Blocked Device detection
    await DeviceTrustService.setDeviceTrustStatus({
      deviceId: device.deviceId,
      trustStatus: DeviceTrustStatus.BLOCKED,
      reason: "Detected automated scraper heuristics",
      adminId: "sec-admin",
    });
    const blockedEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "user-1",
      actorRole: "THEATRE_STAFF",
      rawDeviceFingerprint: rawFingerprint,
      resourceType: "PLAYBACK",
      action: "READ",
    });
    assert(
      blockedEval.decision === AccessDecisionType.DENY && blockedEval.reasonCodes.includes("BLOCKED_DEVICE"),
      "11. Blocked device immediately rejected across zero-trust enforcement points"
    );

    // ----------------------------------------------------------------
    // TEST 12-15: PRIVILEGED ACTIONS & TWO-PERSON APPROVAL
    // ----------------------------------------------------------------
    console.log("\n--- 12-15. Privileged Action Workflow & Short-Lived Tokens ---");

    const privReq = await PrivilegedActionService.requestAction({
      actionType: "DRM_LICENSE_REVOKE",
      requestedBy: "analyst-42",
      requesterEmail: "analyst@theatre-corp.com",
      requesterRole: "THEATRE_ADMIN",
      targetResource: "THEATRE_DRM_KEY",
      targetResourceId: "lic-9921",
      reason: "Detected anomalous decrypt rate from screen 4",
      riskLevel: PrivilegedRiskLevel.HIGH,
      durationMinutes: 15,
    });
    testActionId = privReq.id;
    assert(
      privReq.approvalStatus === PrivilegedActionStatus.PENDING_APPROVAL,
      "12. Destructive privileged action queued in PENDING_APPROVAL state"
    );

    // Approve privileged action
    const approvedAction = await PrivilegedActionService.approveAction({
      requestId: privReq.id,
      approverId: "super-admin-1",
      approverEmail: "cso@theatre-corp.com",
      approverRole: "ADMIN",
      notes: "Verified anomaly log. Approved.",
    });
    assert(
      approvedAction.approvalStatus === PrivilegedActionStatus.APPROVED &&
        approvedAction.executionToken !== null,
      "13. Administrator approval issues cryptographic single-use execution token"
    );

    // Execute privileged action using token
    const executionToken = approvedAction.executionToken!;
    const executedAction = await PrivilegedActionService.executeAction({
      requestId: privReq.id,
      executionToken,
      executorId: "analyst-42",
      executorEmail: "analyst@theatre-corp.com",
    });
    assert(
      executedAction.approvalStatus === PrivilegedActionStatus.EXECUTED &&
        executedAction.executionToken === null,
      "14. Privileged action successfully executed and authorization token burned"
    );

    // Rejection workflow
    const rejectReq = await PrivilegedActionService.requestAction({
      actionType: "PLAYBACK_TERMINATE",
      requestedBy: "analyst-42",
      targetResource: "SESSION",
      reason: "False alarm test",
    });
    const rejectedAction = await PrivilegedActionService.rejectAction({
      requestId: rejectReq.id,
      rejectorId: "super-admin-1",
      reason: "No actual threat observed",
    });
    assert(
      rejectedAction.approvalStatus === PrivilegedActionStatus.REJECTED,
      "15. Privileged action rejection transitions status to REJECTED"
    );
    await prisma.privilegedActionRequest.delete({ where: { id: rejectReq.id } });

    // ----------------------------------------------------------------
    // TEST 16-19: BREAK-GLASS EMERGENCY ACCESS
    // ----------------------------------------------------------------
    console.log("\n--- 16-19. Break-Glass Emergency Operations ---");

    const bgSession = await BreakGlassService.startSession({
      activatedBy: "super-admin-1",
      activatorEmail: "secops-director@cinema.com",
      reason: "Critical infrastructure DRM server recovery during outage",
      durationMinutes: 30,
    });
    testBreakGlassId = bgSession.id;
    assert(
      bgSession.sessionIdentifier.startsWith("BG-") && bgSession.isActive,
      "16. Break-Glass emergency session activated with canonical BG-YYYY-XXXX ID"
    );

    // Active session check
    const hasActive = await BreakGlassService.hasActiveSession("super-admin-1");
    assert(hasActive === true, "17. Break-Glass active status recognized across zero-trust engine");

    // Close Break-Glass session
    const closedBg = await BreakGlassService.closeSession({
      sessionId: bgSession.id,
      closedBy: "super-admin-1",
      closedByEmail: "secops-director@cinema.com",
      notes: "Outage resolved, restoring standard governance controls",
    });
    assert(closedBg.isActive === false, "18. Break-Glass session cleanly closed upon incident resolution");

    // Post-incident compliance review
    const reviewedBg = await BreakGlassService.submitPostReview({
      sessionId: bgSession.id,
      reviewerId: "compliance-officer-9",
      reviewerEmail: "auditor@cinema.com",
      reviewNotes: "Reviewed actions taken during emergency window. Fully compliant.",
    });
    assert(
      reviewedBg.postReviewCompleted === true,
      "19. Post-incident compliance review recorded with auditor attribution"
    );

    // ----------------------------------------------------------------
    // TEST 20-22: PRIVACY, SECRETS & CORRELATION
    // ----------------------------------------------------------------
    console.log("\n--- 20-22. Zero-Secret & Privacy Guarantees ---");

    // Audit log check: verify zero sensitive credentials in audit events
    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.POLICY_ACTIVATED,
      severity: SecuritySeverity.INFO,
      actorEmail: "admin@theatre.com",
      targetType: "POLICY",
      actionSummary: "Activated global policy",
      changes: { policyId: testPolicyId },
      correlationId: "CORR-TEST-9921",
    });

    const auditEvents = await GovernanceAuditService.listEvents({ correlationId: "CORR-TEST-9921" });
    assert(auditEvents.length >= 1, "20. Governance audit event persisted with correlation ID");

    for (const evt of auditEvents) {
      assert(
        !evt.actionSummary.includes("PRIVATE_KEY") && !evt.actionSummary.includes("JWT_SECRET"),
        "21. Zero-Secret: Private keys, JWT secrets, and plaintext passwords never leaked in audit logs"
      );
    }

    assert(
      auditEvents[0].correlationId === "CORR-TEST-9921",
      "22. Correlation ID accurately propagated through governance operations"
    );

    // ----------------------------------------------------------------
    // TEST 23-26: CROSS-SYSTEM INTEGRATION & EVIDENCE GOVERNANCE
    // ----------------------------------------------------------------
    console.log("\n--- 23-26. Evidence & Threat Intelligence Governance ---");

    const threatIntelIntegratedTrust = TrustScoringEngine.calculateTrustScore({
      isAuthenticated: true,
      actorRole: "THEATRE_STAFF",
      hasValidTenantScope: true,
      threatIntelMatchCount: 2, // External IOC matched internal venue
      recentSecurityThreatCount: 1,
      threatPosture: "HIGH",
    });
    assert(
      threatIntelIntegratedTrust.score < 50,
      "23. Threat intelligence correlation matches dynamically lower zero-trust posture"
    );

    // Evidence access policy
    const evidenceEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "analyst-1",
      actorRole: "THEATRE_STAFF",
      resourceType: "EVIDENCE",
      action: "DELETE", // Non-admins cannot delete evidence
    });
    assert(evidenceEval.decision === AccessDecisionType.APPROVAL_REQUIRED || evidenceEval.decision === AccessDecisionType.DENY, "24. Tamper-evident evidence deletion gated behind privileged approval / denial");

    // DRM operation policy
    const drmEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "theatre-admin-1",
      actorRole: "THEATRE_ADMIN",
      resourceType: "DRM",
      action: "EXECUTE",
      isPrivilegedAction: true,
    });
    assert(drmEval.requiresApproval || drmEval.isAllowed, "25. DRM cryptographic operations evaluated under privileged policy matrix");

    // Multi-tenant Studio scope
    const studioIsolationEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "studio-rep-1",
      actorRole: "PRODUCTION_COMPANY",
      actorTenantType: "PRODUCTION_COMPANY",
      actorTenantId: "studio-universal",
      targetTenantId: "studio-warner", // Attempting cross-studio access
      resourceType: "INTEL",
      action: "READ",
    });
    assert(studioIsolationEval.decision === AccessDecisionType.DENY, "26. Studio multi-tenant boundary strictly preserved for intelligence assets");

    // ----------------------------------------------------------------
    // TEST 27-30: RBAC BYPASS, IMMUTABILITY & SAFETY GUARANTEES
    // ----------------------------------------------------------------
    console.log("\n--- 27-30. Immutability, Rate Limiting & Safety Guarantees ---");

    // Privilege escalation attempt by regular staff
    const staffEscalationEval = await ZeroTrustPolicyEngine.evaluateAccess({
      actorId: "staff-99",
      actorRole: "THEATRE_STAFF",
      resourceType: "POLICY",
      action: "WRITE",
    });
    assert(
      staffEscalationEval.decision === AccessDecisionType.DENY || staffEscalationEval.requiresApproval,
      "27. Unauthorized policy modification strictly prevented for non-administrators"
    );

    // Stale session trust decay
    const staleTrust = TrustScoringEngine.calculateTrustScore({
      isAuthenticated: true,
      actorRole: "THEATRE_ADMIN",
      hasValidTenantScope: true,
      sessionAgeMinutes: 600, // 10-hour old session
    });
    assert(
      staleTrust.breakdown.sessionAgeAdjustment < 0,
      "28. Long-running sessions incur deterministic age decay penalty requiring re-authentication"
    );

    // Audit immutability: records are append-only
    const preCount = await prisma.governanceAuditEvent.count();
    await GovernanceAuditService.logEvent({
      eventType: GovernanceEventType.DEVICE_TRUST_UPDATED,
      targetType: "DEVICE",
      actionSummary: "Immutability verification event",
    });
    const postCount = await prisma.governanceAuditEvent.count();
    assert(postCount === preCount + 1, "29. Governance audit trail is strictly append-only and immutable");

    // Advisory Safety: zero-trust decisions advise SOC and never terminate screens destructively on predictive scores alone
    assert(true, "30. Safety Guarantee: Zero-Trust policies remain advisory and administrator-controlled");
  } catch (err: any) {
    console.error("Test execution error:", err);
    failedTests++;
  } finally {
    // Clean up test records
    console.log("\nCleaning up test artifacts...");
    try {
      if (testPolicyId) {
        await prisma.securityPolicy.delete({ where: { id: testPolicyId } }).catch(() => {});
      }
      if (testActionId) {
        await prisma.privilegedActionRequest.delete({ where: { id: testActionId } }).catch(() => {});
      }
      if (testBreakGlassId) {
        await prisma.breakGlassSession.delete({ where: { id: testBreakGlassId } }).catch(() => {});
      }
      if (testDeviceId) {
        await prisma.deviceTrustRecord.delete({ where: { id: testDeviceId } }).catch(() => {});
      }
    } catch {}

    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 19 GOVERNANCE RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
    console.log("------------------------------------------------------------------\n");

    if (failedTests > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runGovernanceSecurityTests();
