import { prisma, SecurityEventType, SecuritySeverity } from "@antipiracy/database";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../logging/logger";
import {
  EnforcementEvidenceService,
  EnforcementPackageData,
} from "./enforcementEvidenceService";
import {
  EnforcementApprovalService,
  ApprovalDecision,
  ApprovalActor,
} from "./enforcementApprovalService";

export type EnforcementStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "SUBMITTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type EnforcementActionType =
  | "TAKEDOWN_NOTICE"
  | "LEGAL_CEASE_DESIST"
  | "PLATFORM_COPYRIGHT_CLAIM"
  | "FORENSIC_LAW_ENFORCEMENT_REFERRAL"
  | "AUDITORIUM_SEAT_BLACKLIST"
  | "DISTRIBUTOR_SECURITY_ALERT";

export type EnforcementSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CreateEnforcementParams {
  caseId: string;
  title: string;
  description?: string;
  actionType: EnforcementActionType;
  targetEntity?: string; // e.g. "Cloudflare CDN / Cyberlock Host", "ISP Telemetry", "Local Police Cyber Cell"
  targetJurisdiction?: string;
  severity?: EnforcementSeverity;
  correlationId?: string;
  actor: ApprovalActor;
}

export interface EnforcementTimelineRecord {
  id: string;
  timestamp: string;
  eventType: string;
  title: string;
  description: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
}

export interface EnforcementActionRecord {
  id: string;
  enforcementNumber: string;
  caseId: string;
  caseNumber: string;
  title: string;
  description?: string;
  actionType: EnforcementActionType;
  targetEntity?: string;
  targetJurisdiction?: string;
  status: EnforcementStatus;
  severity: EnforcementSeverity;
  theatreId?: string | null;
  theatreName?: string | null;
  theatreCode?: string | null;
  movieId?: string | null;
  movieTitle?: string | null;
  showId?: string | null;
  productionCompanyId?: string | null;
  package?: EnforcementPackageData;
  packageHash?: string;
  isPackageVerified: boolean;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUESTED";
  approvedBy?: string | null;
  approverRole?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  submittedBy?: string | null;
  submissionReference?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  timeline: EnforcementTimelineRecord[];
  correlationId: string;
  createdBy: string;
  creatorEmail: string;
  creatorRole: string;
  createdAt: string;
  updatedAt: string;
}

export class EnforcementService {
  // Allowed state machine transitions for enforcement lifecycle
  private static readonly VALID_TRANSITIONS: Record<EnforcementStatus, EnforcementStatus[]> = {
    DRAFT: ["REVIEW", "CANCELLED"],
    REVIEW: ["APPROVED", "REJECTED", "CANCELLED", "DRAFT"],
    APPROVED: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["COMPLETED", "REJECTED", "CANCELLED"],
    REJECTED: ["DRAFT", "REVIEW", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  // In-memory store for fast state tracking & resilience across API calls and tests
  private static store: Map<string, EnforcementActionRecord> = new Map();
  private static sequenceCounter = 1000;

  /**
   * Resets internal memory state (useful for automated testing fixtures).
   */
  public static resetStore(): void {
    EnforcementService.store.clear();
    EnforcementService.sequenceCounter = 1000;
  }

  /**
   * Generates a canonical ENF-YYYY-XXXX identifier.
   */
  public static generateEnforcementNumber(): string {
    const year = new Date().getFullYear();
    EnforcementService.sequenceCounter += 1;
    const seq = EnforcementService.sequenceCounter.toString().padStart(4, "0");
    return `ENF-${year}-${seq}`;
  }

  /**
   * Creates a new Enforcement Action from an eligible Investigation Case.
   */
  public async createEnforcement(params: CreateEnforcementParams): Promise<EnforcementActionRecord> {
    const correlationId = params.correlationId || `CORR-ENF-${Date.now()}`;
    const enforcementNumber = EnforcementService.generateEnforcementNumber();
    const enforcementId = `enf-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    logger.info(`[EnforcementService] Creating enforcement action for Case ${params.caseId} [${correlationId}]`);

    // 1. Fetch and validate Investigation Case eligibility
    const targetCase = await prisma.investigationCase.findUnique({
      where: { id: params.caseId },
      include: {
        theatre: true,
        movie: true,
        show: true,
      },
    });

    if (!targetCase) {
      throw new AppError(`Investigation case ${params.caseId} not found`, 404, "CASE_NOT_FOUND");
    }

    // Check Case Eligibility (Cannot create enforcement for CLOSED or ARCHIVED cases)
    if (targetCase.status === "CLOSED" || targetCase.status === "ARCHIVED") {
      throw new AppError(
        `Cannot create enforcement action for case in '${targetCase.status}' status. Only active cases are eligible for enforcement response.`,
        400,
        "INELIGIBLE_CASE_STATUS"
      );
    }

    // 2. Strict Tenant/Theatre isolation check
    if (params.actor.role === "THEATRE_STAFF" && targetCase.theatreId && params.actor.theatreId && targetCase.theatreId !== params.actor.theatreId) {
      throw new AppError("Cross-theatre enforcement forbidden: Cannot create enforcement for foreign theatre case", 403, "UNAUTHORIZED_THEATRE");
    }

    if (params.actor.role === "PRODUCTION_COMPANY" && targetCase.productionCompanyId && params.actor.productionCompanyId && targetCase.productionCompanyId !== params.actor.productionCompanyId) {
      throw new AppError("Cross-studio enforcement forbidden: Cannot create enforcement for another studio's case", 403, "UNAUTHORIZED_STUDIO");
    }

    // 3. Duplicate Prevention: Check for existing active enforcement on this case
    const existingActive = Array.from(EnforcementService.store.values()).find(
      (enf) =>
        enf.caseId === targetCase.id &&
        enf.actionType === params.actionType &&
        ["DRAFT", "REVIEW", "APPROVED", "SUBMITTED"].includes(enf.status)
    );

    if (existingActive) {
      throw new AppError(
        `An active enforcement action (${existingActive.enforcementNumber}) of type '${params.actionType}' already exists for Case ${targetCase.caseNumber}`,
        400,
        "DUPLICATE_ENFORCEMENT"
      );
    }

    // 4. Generate evidence-backed enforcement package
    const evidencePackage = await EnforcementEvidenceService.generatePackage(
      targetCase.id,
      params.actor,
      correlationId
    );

    const now = new Date().toISOString();

    const initialTimeline: EnforcementTimelineRecord[] = [
      {
        id: `tl-${Date.now()}-1`,
        timestamp: now,
        eventType: "ENFORCEMENT_CREATED",
        title: "Enforcement Action Initiated",
        description: `[${correlationId}] Enforcement ${enforcementNumber} created from Case ${targetCase.caseNumber} (${params.actionType}) by ${params.actor.email}`,
        actorId: params.actor.id,
        actorEmail: params.actor.email,
        actorRole: params.actor.role,
      },
      {
        id: `tl-${Date.now()}-2`,
        timestamp: now,
        eventType: "PACKAGE_GENERATED",
        title: "Evidence Package Compiled",
        description: `[${correlationId}] Package ${evidencePackage.packageId} linked with SHA-256 integrity hash ${evidencePackage.packageIntegrityHash.slice(0, 16)}... (${evidencePackage.evidenceRecords.length} evidence items)`,
        actorId: params.actor.id,
        actorEmail: params.actor.email,
        actorRole: params.actor.role,
      },
    ];

    const newEnforcement: EnforcementActionRecord = {
      id: enforcementId,
      enforcementNumber,
      caseId: targetCase.id,
      caseNumber: targetCase.caseNumber,
      title: params.title,
      description: params.description,
      actionType: params.actionType,
      targetEntity: params.targetEntity || "Designated Piracy Intake Service",
      targetJurisdiction: params.targetJurisdiction || "Global Digital Rights",
      status: "DRAFT",
      severity: params.severity || (targetCase.severity as EnforcementSeverity) || "MEDIUM",
      theatreId: targetCase.theatreId,
      theatreName: targetCase.theatre?.name || null,
      theatreCode: targetCase.theatre?.code || null,
      movieId: targetCase.movieId,
      movieTitle: targetCase.movie?.title || null,
      showId: targetCase.showId,
      productionCompanyId: targetCase.productionCompanyId,
      package: evidencePackage,
      packageHash: evidencePackage.packageIntegrityHash,
      isPackageVerified: evidencePackage.isFullyVerified,
      approvalStatus: "NOT_REQUESTED",
      timeline: initialTimeline,
      correlationId,
      createdBy: params.actor.id,
      creatorEmail: params.actor.email,
      creatorRole: params.actor.role,
      createdAt: now,
      updatedAt: now,
    };

    EnforcementService.store.set(enforcementId, newEnforcement);

    // 5. Ingest into Investigation Timeline (Immutable case history)
    await prisma.investigationTimelineEvent.create({
      data: {
        caseId: targetCase.id,
        title: `Enforcement Action Initiated: ${params.actionType}`,
        description: `[${correlationId}] Enforcement ${enforcementNumber} created by ${params.actor.email} (${params.actor.role}). Package: ${evidencePackage.packageId}.`,
        eventType: "ENFORCEMENT_CREATED",
        actorId: params.actor.id,
      },
    }).catch(() => {});

    // 6. Security Audit Log
    try {
      await prisma.securityAuditLog.create({
        data: {
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: params.severity === "CRITICAL" ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
          userId: params.actor.id,
          actorEmail: params.actor.email,
          actorRole: params.actor.role,
          theatreId: targetCase.theatreId || null,
          actionSummary: `Enforcement Action ${enforcementNumber} created for Case ${targetCase.caseNumber}: ${params.title}`,
          metadata: JSON.stringify({
            enforcementId,
            enforcementNumber,
            caseId: targetCase.id,
            caseNumber: targetCase.caseNumber,
            actionType: params.actionType,
            correlationId,
            packageHash: evidencePackage.packageIntegrityHash,
          }),
          isThreat: false,
        },
      });
    } catch {
      // Non-fatal
    }

    logger.info(`[EnforcementService] Successfully created Enforcement ${enforcementNumber} (${enforcementId})`);
    return newEnforcement;
  }

  /**
   * Retrieves enforcement actions with tenant and status filters.
   */
  public async getEnforcements(
    scope?: {
      theatreId?: string;
      productionCompanyId?: string;
      status?: string;
      severity?: string;
      caseId?: string;
    },
    actor?: ApprovalActor
  ): Promise<EnforcementActionRecord[]> {
    let items = Array.from(EnforcementService.store.values());

    // Tenant scoping
    if (actor?.role === "THEATRE_STAFF" && actor.theatreId) {
      items = items.filter((item) => !item.theatreId || item.theatreId === actor.theatreId);
    } else if (scope?.theatreId) {
      items = items.filter((item) => item.theatreId === scope.theatreId);
    }

    if (actor?.role === "PRODUCTION_COMPANY" && actor.productionCompanyId) {
      items = items.filter((item) => !item.productionCompanyId || item.productionCompanyId === actor.productionCompanyId);
    } else if (scope?.productionCompanyId) {
      items = items.filter((item) => item.productionCompanyId === scope.productionCompanyId);
    }

    if (scope?.caseId) {
      items = items.filter((item) => item.caseId === scope.caseId);
    }

    if (scope?.status && scope.status !== "ALL") {
      items = items.filter((item) => item.status === scope.status);
    }

    if (scope?.severity && scope.severity !== "ALL") {
      items = items.filter((item) => item.severity === scope.severity);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieves single enforcement action by ID with tenant checks.
   */
  public async getEnforcementById(id: string, actor?: ApprovalActor): Promise<EnforcementActionRecord> {
    const item = EnforcementService.store.get(id);
    if (!item) {
      throw new AppError(`Enforcement action ${id} not found`, 404, "ENFORCEMENT_NOT_FOUND");
    }

    if (actor?.role === "THEATRE_STAFF" && item.theatreId && actor.theatreId && item.theatreId !== actor.theatreId) {
      throw new AppError("Access denied to foreign theatre enforcement action", 403, "UNAUTHORIZED_THEATRE");
    }

    if (actor?.role === "PRODUCTION_COMPANY" && item.productionCompanyId && actor.productionCompanyId && item.productionCompanyId !== actor.productionCompanyId) {
      throw new AppError("Access denied to foreign studio enforcement action", 403, "UNAUTHORIZED_STUDIO");
    }

    return item;
  }

  /**
   * Submits an enforcement action for human review (`DRAFT` -> `REVIEW`).
   */
  public async submitForReview(
    id: string,
    actor: ApprovalActor,
    notes?: string,
    correlationId?: string
  ): Promise<EnforcementActionRecord> {
    const corrId = correlationId || `CORR-REV-SUB-${Date.now()}`;
    const enforcement = await this.getEnforcementById(id, actor);

    this.validateLifecycleTransition(enforcement.status, "REVIEW", actor);

    enforcement.status = "REVIEW";
    enforcement.approvalStatus = "PENDING";
    enforcement.updatedAt = new Date().toISOString();

    enforcement.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: enforcement.updatedAt,
      eventType: "SUBMITTED_FOR_REVIEW",
      title: "Enforcement Submitted for Review",
      description: `[${corrId}] Submitted for compliance & legal review by ${actor.email}. ${notes || ""}`.trim(),
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
    });

    EnforcementService.store.set(id, enforcement);
    logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} moved to REVIEW [${corrId}]`);
    return enforcement;
  }

  /**
   * Processes a human approval decision on an enforcement action (`REVIEW` -> `APPROVED` or `REJECTED`).
   */
  public async processApproval(
    id: string,
    decision: ApprovalDecision,
    approver: ApprovalActor,
    notes?: string,
    rejectionReason?: string,
    correlationId?: string
  ): Promise<EnforcementActionRecord> {
    const corrId = correlationId || `CORR-APP-${Date.now()}`;
    const enforcement = await this.getEnforcementById(id, approver);

    // 1. Role & authorization check
    EnforcementApprovalService.validateApproverAuthorization(approver, enforcement.theatreId, enforcement.productionCompanyId);

    // 2. Package verification
    if (decision === "APPROVE") {
      EnforcementApprovalService.validatePackageBeforeApproval(enforcement.package);
      this.validateLifecycleTransition(enforcement.status, "APPROVED", approver);

      enforcement.status = "APPROVED";
      enforcement.approvalStatus = "APPROVED";
      enforcement.approvedBy = approver.email;
      enforcement.approverRole = approver.role;
      enforcement.approvedAt = new Date().toISOString();
    } else if (decision === "REJECT") {
      this.validateLifecycleTransition(enforcement.status, "REJECTED", approver);

      enforcement.status = "REJECTED";
      enforcement.approvalStatus = "REJECTED";
      enforcement.rejectionReason = rejectionReason || notes || "Action rejected during executive review";
    } else if (decision === "REQUEST_REVISIONS") {
      enforcement.status = "DRAFT";
      enforcement.approvalStatus = "NOT_REQUESTED";
      enforcement.rejectionReason = notes || "Revisions requested by reviewer";
    }

    enforcement.updatedAt = new Date().toISOString();

    enforcement.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: enforcement.updatedAt,
      eventType: decision === "APPROVE" ? "ACTION_APPROVED" : "ACTION_REJECTED",
      title: decision === "APPROVE" ? "Enforcement Approved by Approver" : `Enforcement ${decision}`,
      description: `[${corrId}] Decision: ${decision} by ${approver.email} (${approver.role}). ${notes || rejectionReason || ""}`.trim(),
      actorId: approver.id,
      actorEmail: approver.email,
      actorRole: approver.role,
    });

    EnforcementService.store.set(id, enforcement);

    // 3. Record Immutable Audit Event
    await EnforcementApprovalService.recordApprovalAudit(
      enforcement.id,
      enforcement.enforcementNumber,
      decision,
      approver,
      enforcement.theatreId,
      corrId,
      notes || rejectionReason
    );

    // 4. Update Investigation Case timeline
    await prisma.investigationTimelineEvent.create({
      data: {
        caseId: enforcement.caseId,
        title: `Enforcement Action ${decision}: ${enforcement.enforcementNumber}`,
        description: `[${corrId}] ${enforcement.actionType} was ${decision.toLowerCase()} by ${approver.email}`,
        eventType: decision === "APPROVE" ? "ENFORCEMENT_APPROVED" : "ENFORCEMENT_REJECTED",
        actorId: approver.id,
      },
    }).catch(() => {});

    logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} processed approval decision: ${decision} [${corrId}]`);
    return enforcement;
  }

  /**
   * Submits approved enforcement action to external platforms/legal entities (`APPROVED` -> `SUBMITTED`).
   */
  public async submitEnforcement(
    id: string,
    actor: ApprovalActor,
    submissionReference?: string,
    notes?: string,
    correlationId?: string
  ): Promise<EnforcementActionRecord> {
    const corrId = correlationId || `CORR-SUB-${Date.now()}`;
    const enforcement = await this.getEnforcementById(id, actor);

    // Must be in APPROVED status
    this.validateLifecycleTransition(enforcement.status, "SUBMITTED", actor);

    if (enforcement.approvalStatus !== "APPROVED") {
      throw new AppError(
        "Enforcement action cannot be submitted without prior executive human approval",
        400,
        "APPROVAL_REQUIRED"
      );
    }

    const subRef = submissionReference || `EXT-SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    enforcement.status = "SUBMITTED";
    enforcement.submittedAt = new Date().toISOString();
    enforcement.submittedBy = actor.email;
    enforcement.submissionReference = subRef;
    enforcement.updatedAt = enforcement.submittedAt;

    enforcement.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: enforcement.updatedAt,
      eventType: "ENFORCEMENT_SUBMITTED",
      title: "Enforcement Package Transmitted",
      description: `[${corrId}] Submitted to ${enforcement.targetEntity} (Ref: ${subRef}) by ${actor.email}. ${notes || ""}`.trim(),
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
    });

    EnforcementService.store.set(id, enforcement);

    await prisma.investigationTimelineEvent.create({
      data: {
        caseId: enforcement.caseId,
        title: `Enforcement Submitted: ${enforcement.enforcementNumber}`,
        description: `[${corrId}] Dispatched to ${enforcement.targetEntity} (Ref: ${subRef}) by ${actor.email}`,
        eventType: "ENFORCEMENT_SUBMITTED",
        actorId: actor.id,
      },
    }).catch(() => {});

    logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} SUBMITTED with ref ${subRef} [${corrId}]`);
    return enforcement;
  }

  /**
   * Concludes enforcement action as successfully completed (`SUBMITTED` -> `COMPLETED`).
   */
  public async completeEnforcement(
    id: string,
    actor: ApprovalActor,
    resolutionSummary: string,
    correlationId?: string
  ): Promise<EnforcementActionRecord> {
    const corrId = correlationId || `CORR-CMP-${Date.now()}`;
    const enforcement = await this.getEnforcementById(id, actor);

    this.validateLifecycleTransition(enforcement.status, "COMPLETED", actor);

    enforcement.status = "COMPLETED";
    enforcement.completedAt = new Date().toISOString();
    enforcement.updatedAt = enforcement.completedAt;

    enforcement.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: enforcement.updatedAt,
      eventType: "ENFORCEMENT_COMPLETED",
      title: "Enforcement Successfully Concluded",
      description: `[${corrId}] Action completed: ${resolutionSummary} (by ${actor.email})`,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
    });

    EnforcementService.store.set(id, enforcement);

    await prisma.investigationTimelineEvent.create({
      data: {
        caseId: enforcement.caseId,
        title: `Enforcement Completed: ${enforcement.enforcementNumber}`,
        description: `[${corrId}] Resolution: ${resolutionSummary} (by ${actor.email})`,
        eventType: "ENFORCEMENT_COMPLETED",
        actorId: actor.id,
      },
    }).catch(() => {});

    logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} marked COMPLETED [${corrId}]`);
    return enforcement;
  }

  /**
   * Cancels an enforcement action from any non-terminal state.
   */
  public async cancelEnforcement(
    id: string,
    actor: ApprovalActor,
    cancellationReason: string,
    correlationId?: string
  ): Promise<EnforcementActionRecord> {
    const corrId = correlationId || `CORR-CNC-${Date.now()}`;
    const enforcement = await this.getEnforcementById(id, actor);

    this.validateLifecycleTransition(enforcement.status, "CANCELLED", actor);

    enforcement.status = "CANCELLED";
    enforcement.cancelledAt = new Date().toISOString();
    enforcement.cancellationReason = cancellationReason || "Cancelled by security analyst";
    enforcement.updatedAt = enforcement.cancelledAt;

    enforcement.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: enforcement.updatedAt,
      eventType: "ENFORCEMENT_CANCELLED",
      title: "Enforcement Action Cancelled",
      description: `[${corrId}] Reason: ${enforcement.cancellationReason} (by ${actor.email})`,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
    });

    EnforcementService.store.set(id, enforcement);

    await prisma.investigationTimelineEvent.create({
      data: {
        caseId: enforcement.caseId,
        title: `Enforcement Cancelled: ${enforcement.enforcementNumber}`,
        description: `[${corrId}] ${cancellationReason} (by ${actor.email})`,
        eventType: "ENFORCEMENT_CANCELLED",
        actorId: actor.id,
      },
    }).catch(() => {});

    logger.info(`[EnforcementService] Enforcement ${enforcement.enforcementNumber} CANCELLED [${corrId}]`);
    return enforcement;
  }

  /**
   * Validates state machine transition rules.
   */
  private validateLifecycleTransition(
    fromStatus: EnforcementStatus,
    toStatus: EnforcementStatus,
    actor: ApprovalActor
  ): void {
    const allowed = EnforcementService.VALID_TRANSITIONS[fromStatus] || [];

    if (!allowed.includes(toStatus)) {
      throw new AppError(
        `Invalid enforcement lifecycle transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowed.join(", ") || "None (Terminal State)"}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
  }
}

export const enforcementService = new EnforcementService();
