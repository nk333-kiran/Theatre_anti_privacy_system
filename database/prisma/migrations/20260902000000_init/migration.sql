-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'THEATRE_ADMIN', 'THEATRE_STAFF', 'PRODUCTION_COMPANY');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShowStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'ACTIVATED', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivationStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VERIFIED', 'DENIED');

-- CreateEnum
CREATE TYPE "VideoAssetState" AS ENUM ('CREATED', 'PROCESSING', 'READY', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DrmProviderType" AS ENUM ('MOCK', 'WIDEVINE', 'PLAYREADY', 'FAIRPLAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DrmStatus" AS ENUM ('NOT_CONFIGURED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DrmLicenseStatus" AS ENUM ('ISSUED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED');

-- CreateEnum
CREATE TYPE "PlaybackSessionStatus" AS ENUM ('AUTHORIZED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'DENIED');

-- CreateEnum
CREATE TYPE "ProtectionEventType" AS ENUM ('SESSION_STARTED', 'SESSION_HEARTBEAT', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'PLAYER_STARTED', 'PLAYER_STOPPED', 'FULLSCREEN_ENTERED', 'FULLSCREEN_EXITED', 'SCREENSHOT_ATTEMPT_DETECTED', 'PLAYBACK_AUTHORIZED', 'PLAYBACK_DENIED', 'PLAYBACK_STARTED', 'PLAYBACK_STOPPED', 'PLAYBACK_TERMINATED', 'PLAYBACK_AUTH_EXPIRED', 'DRM_LICENSE_REQUESTED', 'DRM_LICENSE_AUTHORIZED', 'DRM_LICENSE_DENIED', 'DRM_LICENSE_REVOKED', 'DRM_ENCRYPTION_STARTED', 'DRM_ENCRYPTION_COMPLETED', 'DRM_ENCRYPTION_FAILED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'ROLE_ACCESS_DENIED', 'TICKET_CREATED', 'TICKET_CANCELLED', 'QR_ACTIVATION', 'QR_ACTIVATION_DENIED', 'STAFF_VERIFICATION', 'PLAYBACK_AUTHORIZED', 'PLAYBACK_DENIED', 'PLAYBACK_TERMINATED', 'DRM_LICENSE_AUTHORIZED', 'DRM_LICENSE_DENIED', 'DRM_LICENSE_REVOKED', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('DETECTED', 'TRIAGED', 'INVESTIGATING', 'CONFIRMED', 'MITIGATED', 'CLOSED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('WATERMARK_CAPTURE', 'SCREENSHOT_ATTEMPT', 'TOKEN_REPLAY', 'GEO_MISMATCH', 'DRM_TAMPER', 'AUDIO_LEAK', 'SUSPICIOUS_HEURISTIC');

-- CreateEnum
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('NEW', 'OPEN', 'DETECTED', 'TRIAGED', 'ACKNOWLEDGED', 'INVESTIGATING', 'CONTAINMENT_PENDING', 'CONTAINED', 'MONITORING', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('SYSTEM_ALERT', 'OPERATOR_REPORT', 'THREAT_ENGINE', 'FORENSIC_MATCH', 'THREAT_INTEL', 'EVIDENCE_INTEGRITY', 'ZERO_TRUST_ENGINE');

-- CreateEnum
CREATE TYPE "IncidentEvidenceType" AS ENUM ('WATERMARK', 'LOG_EXTRACT', 'DEVICE_FINGERPRINT', 'GEO_TRACE', 'DRM_LICENSE_RECORD', 'SCREENSHOT_CAPTURE', 'EVIDENCE_VAULT_ITEM', 'THREAT_IOC');

-- CreateEnum
CREATE TYPE "IncidentActionType" AS ENUM ('SESSION_REVOKED', 'ACTIVATION_REVOKED', 'DRM_REVOKED', 'TOKEN_BLACKLISTED', 'PLAYBACK_DISABLED', 'SEVERITY_ESCALATED', 'NOTIFICATION_SENT', 'INVESTIGATION_CREATED', 'STATUS_CHANGED', 'ANALYST_ASSIGNED', 'CONTAINMENT_INITIATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ThreatAlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'OFFLINE', 'BLOCKED', 'RETIRED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceClassification" AS ENUM ('WATERMARK_MATCH', 'PLAYBACK_ANOMALY', 'QR_ABUSE', 'DRM_TAMPER', 'AUTH_ATTACK', 'THREAT_INTEL', 'SCREENSHOT_CAPTURE', 'AUDIO_LEAK');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('COLLECTED', 'VERIFIED', 'FLAGGED_TAMPERED', 'ARCHIVED', 'LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'LEGAL_HOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvestigationCaseStatus" AS ENUM ('OPEN', 'TRIAGED', 'INVESTIGATING', 'CONTAINED', 'ESCALATED', 'RESOLVED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvestigationCaseSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ThreatIntelIndicatorType" AS ENUM ('IP_ADDRESS', 'DOMAIN', 'URL', 'FILE_HASH', 'EMAIL', 'CERTIFICATE', 'USER_AGENT', 'DEVICE_FINGERPRINT', 'CONTENT_IDENTIFIER', 'CAMPAIGN_IDENTIFIER');

-- CreateEnum
CREATE TYPE "ThreatIntelConfidenceLevel" AS ENUM ('UNTRUSTED', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "ThreatIntelIndicatorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ThreatIntelCampaignStatus" AS ENUM ('OBSERVED', 'ACTIVE', 'ESCALATED', 'CONTAINED', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ThreatIntelSourceHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'FAILED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('ACCESS_CONTROL', 'PLAYBACK_AUTHORIZATION', 'DRM_LICENSE', 'EVIDENCE_ACCESS', 'INVESTIGATION_CASE', 'THREAT_INTEL', 'ADMIN_OPERATIONS', 'DATA_EXPORT', 'EMERGENCY_ACCESS');

-- CreateEnum
CREATE TYPE "AccessDecisionType" AS ENUM ('ALLOW', 'STEP_UP', 'APPROVAL_REQUIRED', 'DENY');

-- CreateEnum
CREATE TYPE "DeviceTrustStatus" AS ENUM ('TRUSTED', 'UNKNOWN', 'SUSPICIOUS', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PrivilegedActionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrivilegedRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GovernanceEventType" AS ENUM ('POLICY_CREATED', 'POLICY_MODIFIED', 'POLICY_ACTIVATED', 'POLICY_ROLLBACK', 'PRIVILEGED_ACTION_REQUESTED', 'PRIVILEGED_ACTION_APPROVED', 'PRIVILEGED_ACTION_REJECTED', 'PRIVILEGED_ACTION_EXECUTED', 'BREAK_GLASS_ACTIVATED', 'BREAK_GLASS_CLOSED', 'BREAK_GLASS_EXPIRED', 'DEVICE_TRUST_UPDATED');

-- CreateTable
CREATE TABLE "ProductionCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'THEATRE_STAFF',
    "theatreId" TEXT,
    "productionCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theatre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "permanentQrCode" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theatre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screen" (
    "id" TEXT NOT NULL,
    "theatreId" TEXT NOT NULL,
    "screenNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "synopsis" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "rating" TEXT,
    "posterUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "productionCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'READY',
    "durationMinutes" INTEGER,
    "resolution" TEXT,
    "fileReference" TEXT NOT NULL,
    "fileSizeMb" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieRelease" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "productionCompanyId" TEXT NOT NULL,
    "theatreId" TEXT NOT NULL,
    "screenId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "rejectionReason" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieAuditEvent" (
    "id" TEXT NOT NULL,
    "movieId" TEXT,
    "releaseId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "theatreId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ShowStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "activationCode" TEXT NOT NULL,
    "status" "ActivationStatus" NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "activationId" TEXT,
    "theatreId" TEXT,
    "showId" TEXT,
    "staffId" TEXT NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "reason" TEXT,
    "scannedCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtectionEvent" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "theatreId" TEXT,
    "showId" TEXT,
    "eventType" "ProtectionEventType" NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "contentAssetId" TEXT,
    "productionCompanyId" TEXT NOT NULL,
    "state" "VideoAssetState" NOT NULL DEFAULT 'READY',
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "processingProgress" INTEGER NOT NULL DEFAULT 0,
    "processingError" TEXT,
    "processingLogs" TEXT,
    "sourceFilePath" TEXT,
    "originalFilename" TEXT,
    "fileSizeMb" DOUBLE PRECISION,
    "mimeType" TEXT,
    "resolution" TEXT,
    "durationSeconds" INTEGER DEFAULT 0,
    "videoCodec" TEXT,
    "audioCodec" TEXT,
    "streamKey" TEXT NOT NULL,
    "deliveryManifestUrl" TEXT NOT NULL,
    "hlsMasterManifestPath" TEXT,
    "thumbnailPath" TEXT,
    "drmScheme" TEXT DEFAULT 'AES-128-ENCRYPTED',
    "bitrates" TEXT DEFAULT '1080p, 720p, 480p',
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "theatreId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "status" "PlaybackSessionStatus" NOT NULL DEFAULT 'AUTHORIZED',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrmAsset" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "provider" "DrmProviderType" NOT NULL DEFAULT 'MOCK',
    "drmScheme" TEXT NOT NULL DEFAULT 'AES-128-ENCRYPTED',
    "keyId" TEXT NOT NULL,
    "encryptedManifestUrl" TEXT,
    "licenseServerUrl" TEXT,
    "status" "DrmStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "statusMessage" TEXT,
    "encryptionProgress" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrmAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrmLicense" (
    "id" TEXT NOT NULL,
    "drmAssetId" TEXT NOT NULL,
    "playbackSessionId" TEXT,
    "activationId" TEXT NOT NULL,
    "theatreId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "licenseToken" TEXT NOT NULL,
    "status" "DrmLicenseStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrmLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'INFO',
    "userId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "theatreId" TEXT,
    "showId" TEXT,
    "activationId" TEXT,
    "ticketId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "endpoint" TEXT,
    "actionSummary" TEXT NOT NULL,
    "metadata" TEXT,
    "isThreat" BOOLEAN NOT NULL DEFAULT false,
    "threatDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiracyIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "playbackSessionId" TEXT,
    "activationId" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "assignedInvestigatorId" TEXT,
    "mitigationAction" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PiracyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForensicEvidence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL DEFAULT 'WATERMARK_CAPTURE',
    "watermarkFingerprint" TEXT,
    "playbackSessionId" TEXT,
    "activationId" TEXT,
    "theatreId" TEXT,
    "showId" TEXT,
    "seatNumber" TEXT,
    "confidenceScore" INTEGER NOT NULL DEFAULT 90,
    "evidenceHash" TEXT NOT NULL,
    "sourceUrlOrFile" TEXT,
    "metadata" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForensicEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForensicInvestigationNote" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "investigatorId" TEXT,
    "investigatorEmail" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForensicInvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'NEW',
    "source" "IncidentSource" NOT NULL DEFAULT 'THREAT_ENGINE',
    "assignedToId" TEXT,
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "activationId" TEXT,
    "playbackSessionId" TEXT,
    "investigationCaseId" TEXT,
    "evidenceRecordId" TEXT,
    "threatIntelIndicatorId" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEvidence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "evidenceType" "IncidentEvidenceType" NOT NULL DEFAULT 'LOG_EXTRACT',
    "referenceId" TEXT,
    "metadata" TEXT,
    "hash" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actionType" "IncidentActionType" NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatAlert" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "theatreId" TEXT,
    "showId" TEXT,
    "activationId" TEXT,
    "playbackSessionId" TEXT,
    "description" TEXT NOT NULL,
    "status" "ThreatAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ThreatAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'REGISTERED',
    "theatreId" TEXT NOT NULL,
    "screenId" TEXT,
    "softwareVersion" TEXT NOT NULL DEFAULT '2.4.0',
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybackDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelligenceIncident" (
    "id" TEXT NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "status" "IncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "source" TEXT NOT NULL DEFAULT 'INTELLIGENCE_CORRELATOR',
    "theatreId" TEXT,
    "showId" TEXT,
    "activationId" TEXT,
    "playbackSessionId" TEXT,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIntelligenceIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatSignal" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "patternId" TEXT,
    "signalType" TEXT NOT NULL,
    "signalValue" TEXT NOT NULL,
    "eventType" TEXT,
    "source" TEXT,
    "riskWeight" INTEGER NOT NULL DEFAULT 10,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "metadata" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatCorrelation" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "correlationType" TEXT NOT NULL,
    "correlationScore" INTEGER NOT NULL DEFAULT 75,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatCorrelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedResponseAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "reason" TEXT NOT NULL,
    "executedBy" TEXT,
    "executedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomatedResponseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceSnapshot" (
    "id" TEXT NOT NULL,
    "totalThreats" INTEGER NOT NULL DEFAULT 0,
    "criticalThreats" INTEGER NOT NULL DEFAULT 0,
    "highThreats" INTEGER NOT NULL DEFAULT 0,
    "activeIncidents" INTEGER NOT NULL DEFAULT 0,
    "affectedTheatres" INTEGER NOT NULL DEFAULT 0,
    "affectedShows" INTEGER NOT NULL DEFAULT 0,
    "suspiciousSessions" INTEGER NOT NULL DEFAULT 0,
    "averageRiskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatRiskScore" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "contributingSignals" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatRiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatPattern" (
    "id" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatPrediction" (
    "id" TEXT NOT NULL,
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "predictionType" TEXT NOT NULL,
    "predictedRisk" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "predictionWindow" TEXT NOT NULL DEFAULT 'NEXT_24_HOURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatInvestigationLink" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT,
    "patternId" TEXT,
    "incidentId" TEXT,
    "investigationId" TEXT,
    "forensicEvidenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatInvestigationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtimeThreatEvent" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'LOW',
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "activationId" TEXT,
    "playbackSessionId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealtimeThreatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedResponse" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "targetId" TEXT,
    "reason" TEXT NOT NULL,
    "executedBy" TEXT,
    "executedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "result" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtimeIncidentNotification" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "notificationType" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'HIGH',
    "message" TEXT NOT NULL,
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealtimeIncidentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "evidenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classification" "EvidenceClassification" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "EvidenceStatus" NOT NULL DEFAULT 'COLLECTED',
    "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'ACTIVE',
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "productionCompanyId" TEXT,
    "playbackSessionId" TEXT,
    "incidentId" TEXT,
    "securityIncidentId" TEXT,
    "source" TEXT NOT NULL,
    "capturedBy" TEXT,
    "metadata" TEXT,
    "integrityHash" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "retentionExpiresAt" TIMESTAMP(3),
    "legalHoldReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceArtifact" (
    "id" TEXT NOT NULL,
    "evidenceRecordId" TEXT NOT NULL,
    "artifactName" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/json',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storagePath" TEXT,
    "sha256Hash" TEXT NOT NULL,
    "payloadData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceHash" (
    "id" TEXT NOT NULL,
    "evidenceRecordId" TEXT NOT NULL,
    "calculatedHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'SHA-256',
    "verificationStatus" TEXT NOT NULL DEFAULT 'VALID',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceChainEvent" (
    "id" TEXT NOT NULL,
    "evidenceRecordId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "actorEmail" TEXT,
    "previousChainHash" TEXT NOT NULL,
    "currentChainHash" TEXT NOT NULL,
    "eventData" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceChainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAccessLog" (
    "id" TEXT NOT NULL,
    "evidenceRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "reason" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "InvestigationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "InvestigationCaseSeverity" NOT NULL DEFAULT 'MEDIUM',
    "threatClassification" TEXT,
    "theatreId" TEXT,
    "showId" TEXT,
    "movieId" TEXT,
    "productionCompanyId" TEXT,
    "playbackSessionId" TEXT,
    "assignedAnalystId" TEXT,
    "resolution" TEXT,
    "closureReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "analystId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "InvestigationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationEvidenceLink" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evidenceRecordId" TEXT NOT NULL,
    "linkedBy" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevance" TEXT,

    CONSTRAINT "InvestigationEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationTimelineEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "InvestigationCaseStatus" NOT NULL,
    "toStatus" "InvestigationCaseStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "description" TEXT,
    "trustLevel" INTEGER NOT NULL DEFAULT 50,
    "defaultConfidence" INTEGER NOT NULL DEFAULT 50,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "authConfigReference" TEXT,
    "webhookSecretHash" TEXT,
    "lastSyncSuccessAt" TIMESTAMP(3),
    "lastSyncFailureAt" TIMESTAMP(3),
    "lastFailureReason" TEXT,
    "syncFrequencyMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIntelSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelFeed" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "feedName" TEXT NOT NULL,
    "feedUrl" TEXT,
    "feedFormat" TEXT NOT NULL DEFAULT 'JSON',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPolledAt" TIMESTAMP(3),
    "pollIntervalSec" INTEGER NOT NULL DEFAULT 3600,
    "totalRecordsIngested" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIntelFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelIndicator" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "indicatorType" "ThreatIntelIndicatorType" NOT NULL,
    "value" TEXT NOT NULL,
    "rawValue" TEXT,
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "confidenceLevel" "ThreatIntelConfidenceLevel" NOT NULL DEFAULT 'MODERATE',
    "status" "ThreatIntelIndicatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "threatClassification" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isAnalystValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIntelIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelObservation" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "sightingSource" TEXT NOT NULL,
    "contextTelemetry" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelRelationship" (
    "id" TEXT NOT NULL,
    "sourceIndicatorId" TEXT NOT NULL,
    "targetIndicatorId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelCampaign" (
    "id" TEXT NOT NULL,
    "campaignIdentifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "threatClassification" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'HIGH',
    "confidence" INTEGER NOT NULL DEFAULT 75,
    "status" "ThreatIntelCampaignStatus" NOT NULL DEFAULT 'OBSERVED',
    "theatreId" TEXT,
    "movieId" TEXT,
    "productionCompanyId" TEXT,
    "investigationCaseId" TEXT,
    "evidenceRecordId" TEXT,
    "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIntelCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelMatch" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "campaignId" TEXT,
    "correlationType" TEXT NOT NULL,
    "correlationDetails" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "theatreId" TEXT,
    "movieId" TEXT,
    "playbackSessionId" TEXT,
    "investigationCaseId" TEXT,
    "evidenceRecordId" TEXT,
    "securityAuditLogId" TEXT,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelSourceHealth" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ThreatIntelSourceHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "responseLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "lastHttpCode" INTEGER,
    "recordsIngested" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelSourceHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelImport" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "importFormat" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "importedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIntelAction" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "indicatorId" TEXT,
    "campaignId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatIntelAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policyType" "PolicyType" NOT NULL DEFAULT 'ACCESS_CONTROL',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rules" TEXT NOT NULL,
    "tenantType" TEXT,
    "tenantId" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "ruleSnapshot" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessDecision" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" TEXT NOT NULL,
    "decision" "AccessDecisionType" NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "evaluatedPolicyIds" TEXT,
    "reasonCodes" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceFingerprint" TEXT,
    "theatreId" TEXT,
    "productionCompanyId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceTrustRecord" (
    "id" TEXT NOT NULL,
    "deviceFingerprintHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "trustStatus" "DeviceTrustStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenIp" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "riskFactors" TEXT,
    "observationCount" INTEGER NOT NULL DEFAULT 1,
    "trustRevokedAt" TIMESTAMP(3),
    "trustRevokedReason" TEXT,
    "trustGrantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceTrustRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivilegedActionRequest" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "requesterRole" TEXT,
    "targetResource" TEXT NOT NULL,
    "targetResourceId" TEXT,
    "reason" TEXT NOT NULL,
    "riskLevel" "PrivilegedRiskLevel" NOT NULL DEFAULT 'HIGH',
    "approvalStatus" "PrivilegedActionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approverId" TEXT,
    "approverEmail" TEXT,
    "approvalNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "executionToken" TEXT,
    "executionResult" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivilegedActionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakGlassSession" (
    "id" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "activatedBy" TEXT NOT NULL,
    "activatorEmail" TEXT,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "postReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "postReviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "postReviewCompletedAt" TIMESTAMP(3),
    "postReviewCompletedBy" TEXT,
    "postReviewNotes" TEXT,
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakGlassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceAuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" "GovernanceEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'INFO',
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "actionSummary" TEXT NOT NULL,
    "changes" TEXT,
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncidentTimeline" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityIncidentTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityWorkflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerCondition" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionPayload" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "tenantType" TEXT,
    "tenantId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityWorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "result" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "correlationId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityWorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityNotification" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" TEXT,
    "targetUserId" TEXT,
    "theatreId" TEXT,
    "productionCompanyId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "deduplicationKey" TEXT,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEscalation" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fromSeverity" "IncidentSeverity" NOT NULL,
    "toSeverity" "IncidentSeverity" NOT NULL,
    "fromRisk" INTEGER NOT NULL DEFAULT 0,
    "toRisk" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "policyId" TEXT,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaignIndicators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionCompany_code_key" ON "ProductionCompany"("code");

-- CreateIndex
CREATE INDEX "ProductionCompany_name_idx" ON "ProductionCompany"("name");

-- CreateIndex
CREATE INDEX "ProductionCompany_code_idx" ON "ProductionCompany"("code");

-- CreateIndex
CREATE INDEX "ProductionCompany_status_idx" ON "ProductionCompany"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_productionCompanyId_idx" ON "User"("productionCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Theatre_code_key" ON "Theatre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Theatre_permanentQrCode_key" ON "Theatre"("permanentQrCode");

-- CreateIndex
CREATE INDEX "Theatre_name_idx" ON "Theatre"("name");

-- CreateIndex
CREATE INDEX "Theatre_permanentQrCode_idx" ON "Theatre"("permanentQrCode");

-- CreateIndex
CREATE INDEX "Screen_theatreId_idx" ON "Screen"("theatreId");

-- CreateIndex
CREATE UNIQUE INDEX "Screen_theatreId_screenNumber_key" ON "Screen"("theatreId", "screenNumber");

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "Movie"("title");

-- CreateIndex
CREATE INDEX "Movie_productionCompanyId_idx" ON "Movie"("productionCompanyId");

-- CreateIndex
CREATE INDEX "Movie_contentStatus_idx" ON "Movie"("contentStatus");

-- CreateIndex
CREATE INDEX "ContentAsset_movieId_idx" ON "ContentAsset"("movieId");

-- CreateIndex
CREATE INDEX "ContentAsset_assetType_idx" ON "ContentAsset"("assetType");

-- CreateIndex
CREATE INDEX "MovieRelease_movieId_idx" ON "MovieRelease"("movieId");

-- CreateIndex
CREATE INDEX "MovieRelease_productionCompanyId_idx" ON "MovieRelease"("productionCompanyId");

-- CreateIndex
CREATE INDEX "MovieRelease_theatreId_idx" ON "MovieRelease"("theatreId");

-- CreateIndex
CREATE INDEX "MovieRelease_screenId_idx" ON "MovieRelease"("screenId");

-- CreateIndex
CREATE INDEX "MovieRelease_status_idx" ON "MovieRelease"("status");

-- CreateIndex
CREATE INDEX "MovieRelease_startDate_endDate_idx" ON "MovieRelease"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "MovieAuditEvent_movieId_idx" ON "MovieAuditEvent"("movieId");

-- CreateIndex
CREATE INDEX "MovieAuditEvent_releaseId_idx" ON "MovieAuditEvent"("releaseId");

-- CreateIndex
CREATE INDEX "MovieAuditEvent_action_idx" ON "MovieAuditEvent"("action");

-- CreateIndex
CREATE INDEX "MovieAuditEvent_createdAt_idx" ON "MovieAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Show_theatreId_idx" ON "Show"("theatreId");

-- CreateIndex
CREATE INDEX "Show_screenId_idx" ON "Show"("screenId");

-- CreateIndex
CREATE INDEX "Show_movieId_idx" ON "Show"("movieId");

-- CreateIndex
CREATE INDEX "Show_startTime_status_idx" ON "Show"("startTime", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_showId_idx" ON "Ticket"("showId");

-- CreateIndex
CREATE INDEX "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Activation_ticketId_key" ON "Activation"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Activation_activationCode_key" ON "Activation"("activationCode");

-- CreateIndex
CREATE INDEX "Activation_activationCode_idx" ON "Activation"("activationCode");

-- CreateIndex
CREATE INDEX "Activation_status_idx" ON "Activation"("status");

-- CreateIndex
CREATE INDEX "Verification_activationId_idx" ON "Verification"("activationId");

-- CreateIndex
CREATE INDEX "Verification_theatreId_idx" ON "Verification"("theatreId");

-- CreateIndex
CREATE INDEX "Verification_showId_idx" ON "Verification"("showId");

-- CreateIndex
CREATE INDEX "Verification_staffId_idx" ON "Verification"("staffId");

-- CreateIndex
CREATE INDEX "Verification_result_idx" ON "Verification"("result");

-- CreateIndex
CREATE INDEX "Verification_createdAt_idx" ON "Verification"("createdAt");

-- CreateIndex
CREATE INDEX "ProtectionEvent_activationId_idx" ON "ProtectionEvent"("activationId");

-- CreateIndex
CREATE INDEX "ProtectionEvent_theatreId_idx" ON "ProtectionEvent"("theatreId");

-- CreateIndex
CREATE INDEX "ProtectionEvent_showId_idx" ON "ProtectionEvent"("showId");

-- CreateIndex
CREATE INDEX "ProtectionEvent_eventType_idx" ON "ProtectionEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProtectionEvent_createdAt_idx" ON "ProtectionEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_streamKey_key" ON "VideoAsset"("streamKey");

-- CreateIndex
CREATE INDEX "VideoAsset_movieId_idx" ON "VideoAsset"("movieId");

-- CreateIndex
CREATE INDEX "VideoAsset_productionCompanyId_idx" ON "VideoAsset"("productionCompanyId");

-- CreateIndex
CREATE INDEX "VideoAsset_state_idx" ON "VideoAsset"("state");

-- CreateIndex
CREATE INDEX "VideoAsset_processingStatus_idx" ON "VideoAsset"("processingStatus");

-- CreateIndex
CREATE INDEX "VideoAsset_streamKey_idx" ON "VideoAsset"("streamKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackSession_sessionToken_key" ON "PlaybackSession"("sessionToken");

-- CreateIndex
CREATE INDEX "PlaybackSession_sessionToken_idx" ON "PlaybackSession"("sessionToken");

-- CreateIndex
CREATE INDEX "PlaybackSession_activationId_idx" ON "PlaybackSession"("activationId");

-- CreateIndex
CREATE INDEX "PlaybackSession_videoAssetId_idx" ON "PlaybackSession"("videoAssetId");

-- CreateIndex
CREATE INDEX "PlaybackSession_theatreId_idx" ON "PlaybackSession"("theatreId");

-- CreateIndex
CREATE INDEX "PlaybackSession_showId_idx" ON "PlaybackSession"("showId");

-- CreateIndex
CREATE INDEX "PlaybackSession_status_idx" ON "PlaybackSession"("status");

-- CreateIndex
CREATE INDEX "PlaybackSession_expiresAt_idx" ON "PlaybackSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PlaybackSession_theatreId_status_idx" ON "PlaybackSession"("theatreId", "status");

-- CreateIndex
CREATE INDEX "PlaybackSession_showId_status_idx" ON "PlaybackSession"("showId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DrmAsset_videoAssetId_key" ON "DrmAsset"("videoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "DrmAsset_keyId_key" ON "DrmAsset"("keyId");

-- CreateIndex
CREATE INDEX "DrmAsset_videoAssetId_idx" ON "DrmAsset"("videoAssetId");

-- CreateIndex
CREATE INDEX "DrmAsset_keyId_idx" ON "DrmAsset"("keyId");

-- CreateIndex
CREATE INDEX "DrmAsset_provider_idx" ON "DrmAsset"("provider");

-- CreateIndex
CREATE INDEX "DrmAsset_status_idx" ON "DrmAsset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DrmLicense_licenseToken_key" ON "DrmLicense"("licenseToken");

-- CreateIndex
CREATE INDEX "DrmLicense_drmAssetId_idx" ON "DrmLicense"("drmAssetId");

-- CreateIndex
CREATE INDEX "DrmLicense_playbackSessionId_idx" ON "DrmLicense"("playbackSessionId");

-- CreateIndex
CREATE INDEX "DrmLicense_activationId_idx" ON "DrmLicense"("activationId");

-- CreateIndex
CREATE INDEX "DrmLicense_theatreId_idx" ON "DrmLicense"("theatreId");

-- CreateIndex
CREATE INDEX "DrmLicense_showId_idx" ON "DrmLicense"("showId");

-- CreateIndex
CREATE INDEX "DrmLicense_licenseToken_idx" ON "DrmLicense"("licenseToken");

-- CreateIndex
CREATE INDEX "DrmLicense_status_idx" ON "DrmLicense"("status");

-- CreateIndex
CREATE INDEX "DrmLicense_expiresAt_idx" ON "DrmLicense"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_eventType_idx" ON "SecurityAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_severity_idx" ON "SecurityAuditLog"("severity");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_idx" ON "SecurityAuditLog"("userId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_theatreId_idx" ON "SecurityAuditLog"("theatreId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_showId_idx" ON "SecurityAuditLog"("showId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_activationId_idx" ON "SecurityAuditLog"("activationId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_isThreat_idx" ON "SecurityAuditLog"("isThreat");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_ipAddress_idx" ON "SecurityAuditLog"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_tokenHash_key" ON "RevokedToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RevokedToken_tokenHash_idx" ON "RevokedToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RevokedToken_userId_idx" ON "RevokedToken"("userId");

-- CreateIndex
CREATE INDEX "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PiracyIncident_incidentNumber_key" ON "PiracyIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "PiracyIncident_incidentNumber_idx" ON "PiracyIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "PiracyIncident_status_idx" ON "PiracyIncident"("status");

-- CreateIndex
CREATE INDEX "PiracyIncident_severity_idx" ON "PiracyIncident"("severity");

-- CreateIndex
CREATE INDEX "PiracyIncident_theatreId_idx" ON "PiracyIncident"("theatreId");

-- CreateIndex
CREATE INDEX "PiracyIncident_showId_idx" ON "PiracyIncident"("showId");

-- CreateIndex
CREATE INDEX "PiracyIncident_movieId_idx" ON "PiracyIncident"("movieId");

-- CreateIndex
CREATE INDEX "PiracyIncident_playbackSessionId_idx" ON "PiracyIncident"("playbackSessionId");

-- CreateIndex
CREATE INDEX "PiracyIncident_activationId_idx" ON "PiracyIncident"("activationId");

-- CreateIndex
CREATE INDEX "PiracyIncident_riskScore_idx" ON "PiracyIncident"("riskScore");

-- CreateIndex
CREATE INDEX "PiracyIncident_createdAt_idx" ON "PiracyIncident"("createdAt");

-- CreateIndex
CREATE INDEX "ForensicEvidence_incidentId_idx" ON "ForensicEvidence"("incidentId");

-- CreateIndex
CREATE INDEX "ForensicEvidence_watermarkFingerprint_idx" ON "ForensicEvidence"("watermarkFingerprint");

-- CreateIndex
CREATE INDEX "ForensicEvidence_playbackSessionId_idx" ON "ForensicEvidence"("playbackSessionId");

-- CreateIndex
CREATE INDEX "ForensicEvidence_activationId_idx" ON "ForensicEvidence"("activationId");

-- CreateIndex
CREATE INDEX "ForensicEvidence_evidenceType_idx" ON "ForensicEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "ForensicEvidence_evidenceHash_idx" ON "ForensicEvidence"("evidenceHash");

-- CreateIndex
CREATE INDEX "ForensicEvidence_createdAt_idx" ON "ForensicEvidence"("createdAt");

-- CreateIndex
CREATE INDEX "ForensicInvestigationNote_incidentId_idx" ON "ForensicInvestigationNote"("incidentId");

-- CreateIndex
CREATE INDEX "ForensicInvestigationNote_investigatorId_idx" ON "ForensicInvestigationNote"("investigatorId");

-- CreateIndex
CREATE INDEX "ForensicInvestigationNote_createdAt_idx" ON "ForensicInvestigationNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIncident_incidentNumber_key" ON "SecurityIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "SecurityIncident_incidentNumber_idx" ON "SecurityIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_idx" ON "SecurityIncident"("status");

-- CreateIndex
CREATE INDEX "SecurityIncident_severity_idx" ON "SecurityIncident"("severity");

-- CreateIndex
CREATE INDEX "SecurityIncident_theatreId_idx" ON "SecurityIncident"("theatreId");

-- CreateIndex
CREATE INDEX "SecurityIncident_showId_idx" ON "SecurityIncident"("showId");

-- CreateIndex
CREATE INDEX "SecurityIncident_activationId_idx" ON "SecurityIncident"("activationId");

-- CreateIndex
CREATE INDEX "SecurityIncident_playbackSessionId_idx" ON "SecurityIncident"("playbackSessionId");

-- CreateIndex
CREATE INDEX "SecurityIncident_riskScore_idx" ON "SecurityIncident"("riskScore");

-- CreateIndex
CREATE INDEX "SecurityIncident_createdAt_idx" ON "SecurityIncident"("createdAt");

-- CreateIndex
CREATE INDEX "IncidentEvidence_incidentId_idx" ON "IncidentEvidence"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentEvidence_evidenceType_idx" ON "IncidentEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "IncidentEvidence_hash_idx" ON "IncidentEvidence"("hash");

-- CreateIndex
CREATE INDEX "IncidentEvidence_capturedAt_idx" ON "IncidentEvidence"("capturedAt");

-- CreateIndex
CREATE INDEX "IncidentAction_incidentId_idx" ON "IncidentAction"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentAction_actionType_idx" ON "IncidentAction"("actionType");

-- CreateIndex
CREATE INDEX "IncidentAction_actorId_idx" ON "IncidentAction"("actorId");

-- CreateIndex
CREATE INDEX "IncidentAction_createdAt_idx" ON "IncidentAction"("createdAt");

-- CreateIndex
CREATE INDEX "ThreatAlert_alertType_idx" ON "ThreatAlert"("alertType");

-- CreateIndex
CREATE INDEX "ThreatAlert_severity_idx" ON "ThreatAlert"("severity");

-- CreateIndex
CREATE INDEX "ThreatAlert_status_idx" ON "ThreatAlert"("status");

-- CreateIndex
CREATE INDEX "ThreatAlert_theatreId_idx" ON "ThreatAlert"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatAlert_showId_idx" ON "ThreatAlert"("showId");

-- CreateIndex
CREATE INDEX "ThreatAlert_activationId_idx" ON "ThreatAlert"("activationId");

-- CreateIndex
CREATE INDEX "ThreatAlert_playbackSessionId_idx" ON "ThreatAlert"("playbackSessionId");

-- CreateIndex
CREATE INDEX "ThreatAlert_riskScore_idx" ON "ThreatAlert"("riskScore");

-- CreateIndex
CREATE INDEX "ThreatAlert_detectedAt_idx" ON "ThreatAlert"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackDevice_deviceId_key" ON "PlaybackDevice"("deviceId");

-- CreateIndex
CREATE INDEX "PlaybackDevice_deviceId_idx" ON "PlaybackDevice"("deviceId");

-- CreateIndex
CREATE INDEX "PlaybackDevice_theatreId_idx" ON "PlaybackDevice"("theatreId");

-- CreateIndex
CREATE INDEX "PlaybackDevice_screenId_idx" ON "PlaybackDevice"("screenId");

-- CreateIndex
CREATE INDEX "PlaybackDevice_status_idx" ON "PlaybackDevice"("status");

-- CreateIndex
CREATE INDEX "PlaybackDevice_lastHeartbeatAt_idx" ON "PlaybackDevice"("lastHeartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_key_idx" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_status_idx" ON "IdempotencyRecord"("status");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatIntelligenceIncident_incidentCode_key" ON "ThreatIntelligenceIncident"("incidentCode");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_incidentCode_idx" ON "ThreatIntelligenceIncident"("incidentCode");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_severity_idx" ON "ThreatIntelligenceIncident"("severity");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_status_idx" ON "ThreatIntelligenceIncident"("status");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_theatreId_idx" ON "ThreatIntelligenceIncident"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_showId_idx" ON "ThreatIntelligenceIncident"("showId");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_riskScore_idx" ON "ThreatIntelligenceIncident"("riskScore");

-- CreateIndex
CREATE INDEX "ThreatIntelligenceIncident_lastDetectedAt_idx" ON "ThreatIntelligenceIncident"("lastDetectedAt");

-- CreateIndex
CREATE INDEX "ThreatSignal_incidentId_idx" ON "ThreatSignal"("incidentId");

-- CreateIndex
CREATE INDEX "ThreatSignal_patternId_idx" ON "ThreatSignal"("patternId");

-- CreateIndex
CREATE INDEX "ThreatSignal_signalType_idx" ON "ThreatSignal"("signalType");

-- CreateIndex
CREATE INDEX "ThreatSignal_detectedAt_idx" ON "ThreatSignal"("detectedAt");

-- CreateIndex
CREATE INDEX "ThreatCorrelation_incidentId_idx" ON "ThreatCorrelation"("incidentId");

-- CreateIndex
CREATE INDEX "ThreatCorrelation_sourceEventId_idx" ON "ThreatCorrelation"("sourceEventId");

-- CreateIndex
CREATE INDEX "ThreatCorrelation_correlationType_idx" ON "ThreatCorrelation"("correlationType");

-- CreateIndex
CREATE INDEX "AutomatedResponseAction_incidentId_idx" ON "AutomatedResponseAction"("incidentId");

-- CreateIndex
CREATE INDEX "AutomatedResponseAction_actionType_idx" ON "AutomatedResponseAction"("actionType");

-- CreateIndex
CREATE INDEX "AutomatedResponseAction_status_idx" ON "AutomatedResponseAction"("status");

-- CreateIndex
CREATE INDEX "IntelligenceSnapshot_generatedAt_idx" ON "IntelligenceSnapshot"("generatedAt");

-- CreateIndex
CREATE INDEX "ThreatRiskScore_entityType_entityId_idx" ON "ThreatRiskScore"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ThreatRiskScore_riskScore_idx" ON "ThreatRiskScore"("riskScore");

-- CreateIndex
CREATE INDEX "ThreatRiskScore_calculatedAt_idx" ON "ThreatRiskScore"("calculatedAt");

-- CreateIndex
CREATE INDEX "ThreatRiskScore_expiresAt_idx" ON "ThreatRiskScore"("expiresAt");

-- CreateIndex
CREATE INDEX "ThreatPattern_patternType_idx" ON "ThreatPattern"("patternType");

-- CreateIndex
CREATE INDEX "ThreatPattern_severity_idx" ON "ThreatPattern"("severity");

-- CreateIndex
CREATE INDEX "ThreatPattern_status_idx" ON "ThreatPattern"("status");

-- CreateIndex
CREATE INDEX "ThreatPattern_theatreId_idx" ON "ThreatPattern"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatPattern_showId_idx" ON "ThreatPattern"("showId");

-- CreateIndex
CREATE INDEX "ThreatPattern_movieId_idx" ON "ThreatPattern"("movieId");

-- CreateIndex
CREATE INDEX "ThreatPattern_lastDetectedAt_idx" ON "ThreatPattern"("lastDetectedAt");

-- CreateIndex
CREATE INDEX "ThreatPrediction_theatreId_idx" ON "ThreatPrediction"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatPrediction_showId_idx" ON "ThreatPrediction"("showId");

-- CreateIndex
CREATE INDEX "ThreatPrediction_movieId_idx" ON "ThreatPrediction"("movieId");

-- CreateIndex
CREATE INDEX "ThreatPrediction_predictedRisk_idx" ON "ThreatPrediction"("predictedRisk");

-- CreateIndex
CREATE INDEX "ThreatPrediction_createdAt_idx" ON "ThreatPrediction"("createdAt");

-- CreateIndex
CREATE INDEX "ThreatInvestigationLink_predictionId_idx" ON "ThreatInvestigationLink"("predictionId");

-- CreateIndex
CREATE INDEX "ThreatInvestigationLink_patternId_idx" ON "ThreatInvestigationLink"("patternId");

-- CreateIndex
CREATE INDEX "ThreatInvestigationLink_incidentId_idx" ON "ThreatInvestigationLink"("incidentId");

-- CreateIndex
CREATE INDEX "ThreatInvestigationLink_investigationId_idx" ON "ThreatInvestigationLink"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "RealtimeThreatEvent_eventId_key" ON "RealtimeThreatEvent"("eventId");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_correlationId_idx" ON "RealtimeThreatEvent"("correlationId");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_severity_idx" ON "RealtimeThreatEvent"("severity");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_eventType_idx" ON "RealtimeThreatEvent"("eventType");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_theatreId_idx" ON "RealtimeThreatEvent"("theatreId");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_showId_idx" ON "RealtimeThreatEvent"("showId");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_movieId_idx" ON "RealtimeThreatEvent"("movieId");

-- CreateIndex
CREATE INDEX "RealtimeThreatEvent_createdAt_idx" ON "RealtimeThreatEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RiskHistory_entityType_entityId_idx" ON "RiskHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RiskHistory_calculatedAt_idx" ON "RiskHistory"("calculatedAt");

-- CreateIndex
CREATE INDEX "RiskHistory_correlationId_idx" ON "RiskHistory"("correlationId");

-- CreateIndex
CREATE INDEX "AutomatedResponse_incidentId_idx" ON "AutomatedResponse"("incidentId");

-- CreateIndex
CREATE INDEX "AutomatedResponse_actionType_idx" ON "AutomatedResponse"("actionType");

-- CreateIndex
CREATE INDEX "AutomatedResponse_status_idx" ON "AutomatedResponse"("status");

-- CreateIndex
CREATE INDEX "AutomatedResponse_correlationId_idx" ON "AutomatedResponse"("correlationId");

-- CreateIndex
CREATE INDEX "AutomatedResponse_createdAt_idx" ON "AutomatedResponse"("createdAt");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_severity_idx" ON "RealtimeIncidentNotification"("severity");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_isRead_idx" ON "RealtimeIncidentNotification"("isRead");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_sentAt_idx" ON "RealtimeIncidentNotification"("sentAt");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_theatreId_idx" ON "RealtimeIncidentNotification"("theatreId");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_showId_idx" ON "RealtimeIncidentNotification"("showId");

-- CreateIndex
CREATE INDEX "RealtimeIncidentNotification_movieId_idx" ON "RealtimeIncidentNotification"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceRecord_evidenceNumber_key" ON "EvidenceRecord"("evidenceNumber");

-- CreateIndex
CREATE INDEX "EvidenceRecord_evidenceNumber_idx" ON "EvidenceRecord"("evidenceNumber");

-- CreateIndex
CREATE INDEX "EvidenceRecord_classification_idx" ON "EvidenceRecord"("classification");

-- CreateIndex
CREATE INDEX "EvidenceRecord_severity_idx" ON "EvidenceRecord"("severity");

-- CreateIndex
CREATE INDEX "EvidenceRecord_status_idx" ON "EvidenceRecord"("status");

-- CreateIndex
CREATE INDEX "EvidenceRecord_retentionStatus_idx" ON "EvidenceRecord"("retentionStatus");

-- CreateIndex
CREATE INDEX "EvidenceRecord_theatreId_idx" ON "EvidenceRecord"("theatreId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_showId_idx" ON "EvidenceRecord"("showId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_movieId_idx" ON "EvidenceRecord"("movieId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_productionCompanyId_idx" ON "EvidenceRecord"("productionCompanyId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_createdAt_idx" ON "EvidenceRecord"("createdAt");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_evidenceRecordId_idx" ON "EvidenceArtifact"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_artifactType_idx" ON "EvidenceArtifact"("artifactType");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_sha256Hash_idx" ON "EvidenceArtifact"("sha256Hash");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_createdAt_idx" ON "EvidenceArtifact"("createdAt");

-- CreateIndex
CREATE INDEX "EvidenceHash_evidenceRecordId_idx" ON "EvidenceHash"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "EvidenceHash_verificationStatus_idx" ON "EvidenceHash"("verificationStatus");

-- CreateIndex
CREATE INDEX "EvidenceHash_verifiedAt_idx" ON "EvidenceHash"("verifiedAt");

-- CreateIndex
CREATE INDEX "EvidenceChainEvent_evidenceRecordId_idx" ON "EvidenceChainEvent"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "EvidenceChainEvent_eventType_idx" ON "EvidenceChainEvent"("eventType");

-- CreateIndex
CREATE INDEX "EvidenceChainEvent_timestamp_idx" ON "EvidenceChainEvent"("timestamp");

-- CreateIndex
CREATE INDEX "EvidenceAccessLog_evidenceRecordId_idx" ON "EvidenceAccessLog"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "EvidenceAccessLog_userId_idx" ON "EvidenceAccessLog"("userId");

-- CreateIndex
CREATE INDEX "EvidenceAccessLog_userRole_idx" ON "EvidenceAccessLog"("userRole");

-- CreateIndex
CREATE INDEX "EvidenceAccessLog_accessType_idx" ON "EvidenceAccessLog"("accessType");

-- CreateIndex
CREATE INDEX "EvidenceAccessLog_accessedAt_idx" ON "EvidenceAccessLog"("accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationCase_caseNumber_key" ON "InvestigationCase"("caseNumber");

-- CreateIndex
CREATE INDEX "InvestigationCase_caseNumber_idx" ON "InvestigationCase"("caseNumber");

-- CreateIndex
CREATE INDEX "InvestigationCase_status_idx" ON "InvestigationCase"("status");

-- CreateIndex
CREATE INDEX "InvestigationCase_severity_idx" ON "InvestigationCase"("severity");

-- CreateIndex
CREATE INDEX "InvestigationCase_theatreId_idx" ON "InvestigationCase"("theatreId");

-- CreateIndex
CREATE INDEX "InvestigationCase_showId_idx" ON "InvestigationCase"("showId");

-- CreateIndex
CREATE INDEX "InvestigationCase_movieId_idx" ON "InvestigationCase"("movieId");

-- CreateIndex
CREATE INDEX "InvestigationCase_productionCompanyId_idx" ON "InvestigationCase"("productionCompanyId");

-- CreateIndex
CREATE INDEX "InvestigationCase_assignedAnalystId_idx" ON "InvestigationCase"("assignedAnalystId");

-- CreateIndex
CREATE INDEX "InvestigationCase_createdAt_idx" ON "InvestigationCase"("createdAt");

-- CreateIndex
CREATE INDEX "InvestigationAssignment_caseId_idx" ON "InvestigationAssignment"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationAssignment_analystId_idx" ON "InvestigationAssignment"("analystId");

-- CreateIndex
CREATE INDEX "InvestigationAssignment_assignedAt_idx" ON "InvestigationAssignment"("assignedAt");

-- CreateIndex
CREATE INDEX "InvestigationNote_caseId_idx" ON "InvestigationNote"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationNote_authorId_idx" ON "InvestigationNote"("authorId");

-- CreateIndex
CREATE INDEX "InvestigationNote_createdAt_idx" ON "InvestigationNote"("createdAt");

-- CreateIndex
CREATE INDEX "InvestigationEvidenceLink_caseId_idx" ON "InvestigationEvidenceLink"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationEvidenceLink_evidenceRecordId_idx" ON "InvestigationEvidenceLink"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "InvestigationEvidenceLink_linkedAt_idx" ON "InvestigationEvidenceLink"("linkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationEvidenceLink_caseId_evidenceRecordId_key" ON "InvestigationEvidenceLink"("caseId", "evidenceRecordId");

-- CreateIndex
CREATE INDEX "InvestigationTimelineEvent_caseId_idx" ON "InvestigationTimelineEvent"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationTimelineEvent_eventType_idx" ON "InvestigationTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "InvestigationTimelineEvent_timestamp_idx" ON "InvestigationTimelineEvent"("timestamp");

-- CreateIndex
CREATE INDEX "InvestigationStatusHistory_caseId_idx" ON "InvestigationStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationStatusHistory_fromStatus_idx" ON "InvestigationStatusHistory"("fromStatus");

-- CreateIndex
CREATE INDEX "InvestigationStatusHistory_toStatus_idx" ON "InvestigationStatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "InvestigationStatusHistory_changedAt_idx" ON "InvestigationStatusHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatIntelSource_name_key" ON "ThreatIntelSource"("name");

-- CreateIndex
CREATE INDEX "ThreatIntelSource_providerType_idx" ON "ThreatIntelSource"("providerType");

-- CreateIndex
CREATE INDEX "ThreatIntelSource_isEnabled_idx" ON "ThreatIntelSource"("isEnabled");

-- CreateIndex
CREATE INDEX "ThreatIntelSource_trustLevel_idx" ON "ThreatIntelSource"("trustLevel");

-- CreateIndex
CREATE INDEX "ThreatIntelFeed_sourceId_idx" ON "ThreatIntelFeed"("sourceId");

-- CreateIndex
CREATE INDEX "ThreatIntelFeed_isActive_idx" ON "ThreatIntelFeed"("isActive");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_indicatorType_idx" ON "ThreatIntelIndicator"("indicatorType");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_value_idx" ON "ThreatIntelIndicator"("value");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_confidenceScore_idx" ON "ThreatIntelIndicator"("confidenceScore");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_confidenceLevel_idx" ON "ThreatIntelIndicator"("confidenceLevel");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_status_idx" ON "ThreatIntelIndicator"("status");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_expiresAt_idx" ON "ThreatIntelIndicator"("expiresAt");

-- CreateIndex
CREATE INDEX "ThreatIntelIndicator_threatClassification_idx" ON "ThreatIntelIndicator"("threatClassification");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatIntelIndicator_sourceId_indicatorType_value_key" ON "ThreatIntelIndicator"("sourceId", "indicatorType", "value");

-- CreateIndex
CREATE INDEX "ThreatIntelObservation_indicatorId_idx" ON "ThreatIntelObservation"("indicatorId");

-- CreateIndex
CREATE INDEX "ThreatIntelObservation_timestamp_idx" ON "ThreatIntelObservation"("timestamp");

-- CreateIndex
CREATE INDEX "ThreatIntelRelationship_sourceIndicatorId_idx" ON "ThreatIntelRelationship"("sourceIndicatorId");

-- CreateIndex
CREATE INDEX "ThreatIntelRelationship_targetIndicatorId_idx" ON "ThreatIntelRelationship"("targetIndicatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatIntelRelationship_sourceIndicatorId_targetIndicatorId_key" ON "ThreatIntelRelationship"("sourceIndicatorId", "targetIndicatorId", "relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatIntelCampaign_campaignIdentifier_key" ON "ThreatIntelCampaign"("campaignIdentifier");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_campaignIdentifier_idx" ON "ThreatIntelCampaign"("campaignIdentifier");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_status_idx" ON "ThreatIntelCampaign"("status");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_threatClassification_idx" ON "ThreatIntelCampaign"("threatClassification");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_theatreId_idx" ON "ThreatIntelCampaign"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_movieId_idx" ON "ThreatIntelCampaign"("movieId");

-- CreateIndex
CREATE INDEX "ThreatIntelCampaign_productionCompanyId_idx" ON "ThreatIntelCampaign"("productionCompanyId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_indicatorId_idx" ON "ThreatIntelMatch"("indicatorId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_campaignId_idx" ON "ThreatIntelMatch"("campaignId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_theatreId_idx" ON "ThreatIntelMatch"("theatreId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_movieId_idx" ON "ThreatIntelMatch"("movieId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_playbackSessionId_idx" ON "ThreatIntelMatch"("playbackSessionId");

-- CreateIndex
CREATE INDEX "ThreatIntelMatch_matchedAt_idx" ON "ThreatIntelMatch"("matchedAt");

-- CreateIndex
CREATE INDEX "ThreatIntelSourceHealth_sourceId_idx" ON "ThreatIntelSourceHealth"("sourceId");

-- CreateIndex
CREATE INDEX "ThreatIntelSourceHealth_status_idx" ON "ThreatIntelSourceHealth"("status");

-- CreateIndex
CREATE INDEX "ThreatIntelSourceHealth_checkedAt_idx" ON "ThreatIntelSourceHealth"("checkedAt");

-- CreateIndex
CREATE INDEX "ThreatIntelImport_sourceId_idx" ON "ThreatIntelImport"("sourceId");

-- CreateIndex
CREATE INDEX "ThreatIntelImport_status_idx" ON "ThreatIntelImport"("status");

-- CreateIndex
CREATE INDEX "ThreatIntelImport_createdAt_idx" ON "ThreatIntelImport"("createdAt");

-- CreateIndex
CREATE INDEX "ThreatIntelAction_actionType_idx" ON "ThreatIntelAction"("actionType");

-- CreateIndex
CREATE INDEX "ThreatIntelAction_actorId_idx" ON "ThreatIntelAction"("actorId");

-- CreateIndex
CREATE INDEX "ThreatIntelAction_createdAt_idx" ON "ThreatIntelAction"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityPolicy_policyType_idx" ON "SecurityPolicy"("policyType");

-- CreateIndex
CREATE INDEX "SecurityPolicy_isEnabled_idx" ON "SecurityPolicy"("isEnabled");

-- CreateIndex
CREATE INDEX "SecurityPolicy_priority_idx" ON "SecurityPolicy"("priority");

-- CreateIndex
CREATE INDEX "SecurityPolicy_tenantType_tenantId_idx" ON "SecurityPolicy"("tenantType", "tenantId");

-- CreateIndex
CREATE INDEX "SecurityPolicy_createdAt_idx" ON "SecurityPolicy"("createdAt");

-- CreateIndex
CREATE INDEX "PolicyVersion_policyId_idx" ON "PolicyVersion"("policyId");

-- CreateIndex
CREATE INDEX "PolicyVersion_version_idx" ON "PolicyVersion"("version");

-- CreateIndex
CREATE INDEX "PolicyVersion_createdAt_idx" ON "PolicyVersion"("createdAt");

-- CreateIndex
CREATE INDEX "AccessDecision_decision_idx" ON "AccessDecision"("decision");

-- CreateIndex
CREATE INDEX "AccessDecision_actorRole_idx" ON "AccessDecision"("actorRole");

-- CreateIndex
CREATE INDEX "AccessDecision_resourceType_idx" ON "AccessDecision"("resourceType");

-- CreateIndex
CREATE INDEX "AccessDecision_correlationId_idx" ON "AccessDecision"("correlationId");

-- CreateIndex
CREATE INDEX "AccessDecision_timestamp_idx" ON "AccessDecision"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceTrustRecord_deviceFingerprintHash_key" ON "DeviceTrustRecord"("deviceFingerprintHash");

-- CreateIndex
CREATE INDEX "DeviceTrustRecord_trustStatus_idx" ON "DeviceTrustRecord"("trustStatus");

-- CreateIndex
CREATE INDEX "DeviceTrustRecord_trustScore_idx" ON "DeviceTrustRecord"("trustScore");

-- CreateIndex
CREATE INDEX "DeviceTrustRecord_lastSeenAt_idx" ON "DeviceTrustRecord"("lastSeenAt");

-- CreateIndex
CREATE INDEX "PrivilegedActionRequest_approvalStatus_idx" ON "PrivilegedActionRequest"("approvalStatus");

-- CreateIndex
CREATE INDEX "PrivilegedActionRequest_actionType_idx" ON "PrivilegedActionRequest"("actionType");

-- CreateIndex
CREATE INDEX "PrivilegedActionRequest_riskLevel_idx" ON "PrivilegedActionRequest"("riskLevel");

-- CreateIndex
CREATE INDEX "PrivilegedActionRequest_requestedBy_idx" ON "PrivilegedActionRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "PrivilegedActionRequest_expiresAt_idx" ON "PrivilegedActionRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BreakGlassSession_sessionIdentifier_key" ON "BreakGlassSession"("sessionIdentifier");

-- CreateIndex
CREATE INDEX "BreakGlassSession_sessionIdentifier_idx" ON "BreakGlassSession"("sessionIdentifier");

-- CreateIndex
CREATE INDEX "BreakGlassSession_isActive_idx" ON "BreakGlassSession"("isActive");

-- CreateIndex
CREATE INDEX "BreakGlassSession_activatedBy_idx" ON "BreakGlassSession"("activatedBy");

-- CreateIndex
CREATE INDEX "BreakGlassSession_expiresAt_idx" ON "BreakGlassSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_eventType_idx" ON "GovernanceAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_severity_idx" ON "GovernanceAuditEvent"("severity");

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_targetType_idx" ON "GovernanceAuditEvent"("targetType");

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_correlationId_idx" ON "GovernanceAuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_createdAt_idx" ON "GovernanceAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityIncidentTimeline_incidentId_idx" ON "SecurityIncidentTimeline"("incidentId");

-- CreateIndex
CREATE INDEX "SecurityIncidentTimeline_eventType_idx" ON "SecurityIncidentTimeline"("eventType");

-- CreateIndex
CREATE INDEX "SecurityIncidentTimeline_timestamp_idx" ON "SecurityIncidentTimeline"("timestamp");

-- CreateIndex
CREATE INDEX "SecurityWorkflow_triggerType_idx" ON "SecurityWorkflow"("triggerType");

-- CreateIndex
CREATE INDEX "SecurityWorkflow_isEnabled_idx" ON "SecurityWorkflow"("isEnabled");

-- CreateIndex
CREATE INDEX "SecurityWorkflow_priority_idx" ON "SecurityWorkflow"("priority");

-- CreateIndex
CREATE INDEX "SecurityWorkflow_createdAt_idx" ON "SecurityWorkflow"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityWorkflowExecution_workflowId_idx" ON "SecurityWorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "SecurityWorkflowExecution_status_idx" ON "SecurityWorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "SecurityWorkflowExecution_correlationId_idx" ON "SecurityWorkflowExecution"("correlationId");

-- CreateIndex
CREATE INDEX "SecurityWorkflowExecution_executedAt_idx" ON "SecurityWorkflowExecution"("executedAt");

-- CreateIndex
CREATE INDEX "SecurityNotification_category_idx" ON "SecurityNotification"("category");

-- CreateIndex
CREATE INDEX "SecurityNotification_severity_idx" ON "SecurityNotification"("severity");

-- CreateIndex
CREATE INDEX "SecurityNotification_isRead_idx" ON "SecurityNotification"("isRead");

-- CreateIndex
CREATE INDEX "SecurityNotification_targetRole_idx" ON "SecurityNotification"("targetRole");

-- CreateIndex
CREATE INDEX "SecurityNotification_deduplicationKey_idx" ON "SecurityNotification"("deduplicationKey");

-- CreateIndex
CREATE INDEX "SecurityNotification_createdAt_idx" ON "SecurityNotification"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEscalation_incidentId_idx" ON "SecurityEscalation"("incidentId");

-- CreateIndex
CREATE INDEX "SecurityEscalation_triggeredBy_idx" ON "SecurityEscalation"("triggeredBy");

-- CreateIndex
CREATE INDEX "SecurityEscalation_correlationId_idx" ON "SecurityEscalation"("correlationId");

-- CreateIndex
CREATE INDEX "SecurityEscalation_createdAt_idx" ON "SecurityEscalation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_CampaignIndicators_AB_unique" ON "_CampaignIndicators"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaignIndicators_B_index" ON "_CampaignIndicators"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieRelease" ADD CONSTRAINT "MovieRelease_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieRelease" ADD CONSTRAINT "MovieRelease_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieRelease" ADD CONSTRAINT "MovieRelease_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieRelease" ADD CONSTRAINT "MovieRelease_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieAuditEvent" ADD CONSTRAINT "MovieAuditEvent_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieAuditEvent" ADD CONSTRAINT "MovieAuditEvent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "MovieRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectionEvent" ADD CONSTRAINT "ProtectionEvent_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectionEvent" ADD CONSTRAINT "ProtectionEvent_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectionEvent" ADD CONSTRAINT "ProtectionEvent_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_contentAssetId_fkey" FOREIGN KEY ("contentAssetId") REFERENCES "ContentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmAsset" ADD CONSTRAINT "DrmAsset_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmLicense" ADD CONSTRAINT "DrmLicense_drmAssetId_fkey" FOREIGN KEY ("drmAssetId") REFERENCES "DrmAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmLicense" ADD CONSTRAINT "DrmLicense_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmLicense" ADD CONSTRAINT "DrmLicense_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmLicense" ADD CONSTRAINT "DrmLicense_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrmLicense" ADD CONSTRAINT "DrmLicense_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiracyIncident" ADD CONSTRAINT "PiracyIncident_assignedInvestigatorId_fkey" FOREIGN KEY ("assignedInvestigatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForensicEvidence" ADD CONSTRAINT "ForensicEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PiracyIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForensicInvestigationNote" ADD CONSTRAINT "ForensicInvestigationNote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PiracyIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvidence" ADD CONSTRAINT "IncidentEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SecurityIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAction" ADD CONSTRAINT "IncidentAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SecurityIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatAlert" ADD CONSTRAINT "ThreatAlert_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatAlert" ADD CONSTRAINT "ThreatAlert_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatAlert" ADD CONSTRAINT "ThreatAlert_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatAlert" ADD CONSTRAINT "ThreatAlert_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackDevice" ADD CONSTRAINT "PlaybackDevice_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackDevice" ADD CONSTRAINT "PlaybackDevice_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelligenceIncident" ADD CONSTRAINT "ThreatIntelligenceIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelligenceIncident" ADD CONSTRAINT "ThreatIntelligenceIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelligenceIncident" ADD CONSTRAINT "ThreatIntelligenceIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelligenceIncident" ADD CONSTRAINT "ThreatIntelligenceIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatSignal" ADD CONSTRAINT "ThreatSignal_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ThreatIntelligenceIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatSignal" ADD CONSTRAINT "ThreatSignal_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "ThreatPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatCorrelation" ADD CONSTRAINT "ThreatCorrelation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ThreatIntelligenceIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedResponseAction" ADD CONSTRAINT "AutomatedResponseAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "ThreatIntelligenceIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPattern" ADD CONSTRAINT "ThreatPattern_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPattern" ADD CONSTRAINT "ThreatPattern_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPattern" ADD CONSTRAINT "ThreatPattern_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPrediction" ADD CONSTRAINT "ThreatPrediction_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPrediction" ADD CONSTRAINT "ThreatPrediction_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatPrediction" ADD CONSTRAINT "ThreatPrediction_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatInvestigationLink" ADD CONSTRAINT "ThreatInvestigationLink_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "ThreatPrediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatInvestigationLink" ADD CONSTRAINT "ThreatInvestigationLink_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "ThreatPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeThreatEvent" ADD CONSTRAINT "RealtimeThreatEvent_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeThreatEvent" ADD CONSTRAINT "RealtimeThreatEvent_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeThreatEvent" ADD CONSTRAINT "RealtimeThreatEvent_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeIncidentNotification" ADD CONSTRAINT "RealtimeIncidentNotification_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeIncidentNotification" ADD CONSTRAINT "RealtimeIncidentNotification_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeIncidentNotification" ADD CONSTRAINT "RealtimeIncidentNotification_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceArtifact" ADD CONSTRAINT "EvidenceArtifact_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceHash" ADD CONSTRAINT "EvidenceHash_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceChainEvent" ADD CONSTRAINT "EvidenceChainEvent_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAccessLog" ADD CONSTRAINT "EvidenceAccessLog_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationCase" ADD CONSTRAINT "InvestigationCase_assignedAnalystId_fkey" FOREIGN KEY ("assignedAnalystId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAssignment" ADD CONSTRAINT "InvestigationAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationAssignment" ADD CONSTRAINT "InvestigationAssignment_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvidenceLink" ADD CONSTRAINT "InvestigationEvidenceLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvidenceLink" ADD CONSTRAINT "InvestigationEvidenceLink_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationTimelineEvent" ADD CONSTRAINT "InvestigationTimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationStatusHistory" ADD CONSTRAINT "InvestigationStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelFeed" ADD CONSTRAINT "ThreatIntelFeed_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ThreatIntelSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelIndicator" ADD CONSTRAINT "ThreatIntelIndicator_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ThreatIntelSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelObservation" ADD CONSTRAINT "ThreatIntelObservation_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "ThreatIntelIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelRelationship" ADD CONSTRAINT "ThreatIntelRelationship_sourceIndicatorId_fkey" FOREIGN KEY ("sourceIndicatorId") REFERENCES "ThreatIntelIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelRelationship" ADD CONSTRAINT "ThreatIntelRelationship_targetIndicatorId_fkey" FOREIGN KEY ("targetIndicatorId") REFERENCES "ThreatIntelIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelCampaign" ADD CONSTRAINT "ThreatIntelCampaign_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelCampaign" ADD CONSTRAINT "ThreatIntelCampaign_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelCampaign" ADD CONSTRAINT "ThreatIntelCampaign_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES "ProductionCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelCampaign" ADD CONSTRAINT "ThreatIntelCampaign_investigationCaseId_fkey" FOREIGN KEY ("investigationCaseId") REFERENCES "InvestigationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelCampaign" ADD CONSTRAINT "ThreatIntelCampaign_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "ThreatIntelIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ThreatIntelCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES "Theatre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES "PlaybackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_investigationCaseId_fkey" FOREIGN KEY ("investigationCaseId") REFERENCES "InvestigationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelMatch" ADD CONSTRAINT "ThreatIntelMatch_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelSourceHealth" ADD CONSTRAINT "ThreatIntelSourceHealth_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ThreatIntelSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIntelImport" ADD CONSTRAINT "ThreatIntelImport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ThreatIntelSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SecurityPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncidentTimeline" ADD CONSTRAINT "SecurityIncidentTimeline_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SecurityIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityWorkflowExecution" ADD CONSTRAINT "SecurityWorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "SecurityWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEscalation" ADD CONSTRAINT "SecurityEscalation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SecurityIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIndicators" ADD CONSTRAINT "_CampaignIndicators_A_fkey" FOREIGN KEY ("A") REFERENCES "ThreatIntelCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignIndicators" ADD CONSTRAINT "_CampaignIndicators_B_fkey" FOREIGN KEY ("B") REFERENCES "ThreatIntelIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

