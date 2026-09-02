--
-- PostgreSQL database dump
--

\restrict iSRovTCKBV0ALDf1JBAD1806cMiPfVpmPZGNatZlD2Oniof3ILapFhgknVtys56

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccessDecisionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccessDecisionType" AS ENUM (
    'ALLOW',
    'STEP_UP',
    'APPROVAL_REQUIRED',
    'DENY'
);


ALTER TYPE public."AccessDecisionType" OWNER TO postgres;

--
-- Name: ActivationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActivationStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'EXPIRED',
    'REVOKED'
);


ALTER TYPE public."ActivationStatus" OWNER TO postgres;

--
-- Name: ContentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContentStatus" AS ENUM (
    'DRAFT',
    'UPLOADING',
    'PROCESSING',
    'READY',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."ContentStatus" OWNER TO postgres;

--
-- Name: DeviceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DeviceStatus" AS ENUM (
    'REGISTERED',
    'ACTIVE',
    'OFFLINE',
    'BLOCKED',
    'RETIRED'
);


ALTER TYPE public."DeviceStatus" OWNER TO postgres;

--
-- Name: DeviceTrustStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DeviceTrustStatus" AS ENUM (
    'TRUSTED',
    'UNKNOWN',
    'SUSPICIOUS',
    'BLOCKED'
);


ALTER TYPE public."DeviceTrustStatus" OWNER TO postgres;

--
-- Name: DrmLicenseStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DrmLicenseStatus" AS ENUM (
    'ISSUED',
    'ACTIVE',
    'EXPIRED',
    'REVOKED',
    'DENIED'
);


ALTER TYPE public."DrmLicenseStatus" OWNER TO postgres;

--
-- Name: DrmProviderType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DrmProviderType" AS ENUM (
    'MOCK',
    'WIDEVINE',
    'PLAYREADY',
    'FAIRPLAY',
    'CUSTOM'
);


ALTER TYPE public."DrmProviderType" OWNER TO postgres;

--
-- Name: DrmStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DrmStatus" AS ENUM (
    'NOT_CONFIGURED',
    'QUEUED',
    'PROCESSING',
    'READY',
    'FAILED',
    'REVOKED'
);


ALTER TYPE public."DrmStatus" OWNER TO postgres;

--
-- Name: EvidenceClassification; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EvidenceClassification" AS ENUM (
    'WATERMARK_MATCH',
    'PLAYBACK_ANOMALY',
    'QR_ABUSE',
    'DRM_TAMPER',
    'AUTH_ATTACK',
    'THREAT_INTEL',
    'SCREENSHOT_CAPTURE',
    'AUDIO_LEAK'
);


ALTER TYPE public."EvidenceClassification" OWNER TO postgres;

--
-- Name: EvidenceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EvidenceStatus" AS ENUM (
    'COLLECTED',
    'VERIFIED',
    'FLAGGED_TAMPERED',
    'ARCHIVED',
    'LEGAL_HOLD'
);


ALTER TYPE public."EvidenceStatus" OWNER TO postgres;

--
-- Name: EvidenceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EvidenceType" AS ENUM (
    'WATERMARK_CAPTURE',
    'SCREENSHOT_ATTEMPT',
    'TOKEN_REPLAY',
    'GEO_MISMATCH',
    'DRM_TAMPER',
    'AUDIO_LEAK',
    'SUSPICIOUS_HEURISTIC'
);


ALTER TYPE public."EvidenceType" OWNER TO postgres;

--
-- Name: GovernanceEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GovernanceEventType" AS ENUM (
    'POLICY_CREATED',
    'POLICY_MODIFIED',
    'POLICY_ACTIVATED',
    'POLICY_ROLLBACK',
    'PRIVILEGED_ACTION_REQUESTED',
    'PRIVILEGED_ACTION_APPROVED',
    'PRIVILEGED_ACTION_REJECTED',
    'PRIVILEGED_ACTION_EXECUTED',
    'BREAK_GLASS_ACTIVATED',
    'BREAK_GLASS_CLOSED',
    'BREAK_GLASS_EXPIRED',
    'DEVICE_TRUST_UPDATED'
);


ALTER TYPE public."GovernanceEventType" OWNER TO postgres;

--
-- Name: IdempotencyStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IdempotencyStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."IdempotencyStatus" OWNER TO postgres;

--
-- Name: IncidentActionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IncidentActionType" AS ENUM (
    'SESSION_REVOKED',
    'ACTIVATION_REVOKED',
    'DRM_REVOKED',
    'TOKEN_BLACKLISTED',
    'PLAYBACK_DISABLED',
    'SEVERITY_ESCALATED',
    'NOTIFICATION_SENT',
    'INVESTIGATION_CREATED',
    'STATUS_CHANGED',
    'ANALYST_ASSIGNED',
    'CONTAINMENT_INITIATED',
    'RESOLVED'
);


ALTER TYPE public."IncidentActionType" OWNER TO postgres;

--
-- Name: IncidentEvidenceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IncidentEvidenceType" AS ENUM (
    'WATERMARK',
    'LOG_EXTRACT',
    'DEVICE_FINGERPRINT',
    'GEO_TRACE',
    'DRM_LICENSE_RECORD',
    'SCREENSHOT_CAPTURE',
    'EVIDENCE_VAULT_ITEM',
    'THREAT_IOC'
);


ALTER TYPE public."IncidentEvidenceType" OWNER TO postgres;

--
-- Name: IncidentSeverity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IncidentSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."IncidentSeverity" OWNER TO postgres;

--
-- Name: IncidentSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IncidentSource" AS ENUM (
    'SYSTEM_ALERT',
    'OPERATOR_REPORT',
    'THREAT_ENGINE',
    'FORENSIC_MATCH',
    'THREAT_INTEL',
    'EVIDENCE_INTEGRITY',
    'ZERO_TRUST_ENGINE'
);


ALTER TYPE public."IncidentSource" OWNER TO postgres;

--
-- Name: IncidentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."IncidentStatus" AS ENUM (
    'DETECTED',
    'TRIAGED',
    'INVESTIGATING',
    'CONFIRMED',
    'MITIGATED',
    'CLOSED',
    'FALSE_POSITIVE'
);


ALTER TYPE public."IncidentStatus" OWNER TO postgres;

--
-- Name: InvestigationCaseSeverity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvestigationCaseSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."InvestigationCaseSeverity" OWNER TO postgres;

--
-- Name: InvestigationCaseStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvestigationCaseStatus" AS ENUM (
    'OPEN',
    'TRIAGED',
    'INVESTIGATING',
    'CONTAINED',
    'ESCALATED',
    'RESOLVED',
    'CLOSED',
    'ARCHIVED'
);


ALTER TYPE public."InvestigationCaseStatus" OWNER TO postgres;

--
-- Name: PlaybackSessionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PlaybackSessionStatus" AS ENUM (
    'AUTHORIZED',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'DENIED'
);


ALTER TYPE public."PlaybackSessionStatus" OWNER TO postgres;

--
-- Name: PolicyType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PolicyType" AS ENUM (
    'ACCESS_CONTROL',
    'PLAYBACK_AUTHORIZATION',
    'DRM_LICENSE',
    'EVIDENCE_ACCESS',
    'INVESTIGATION_CASE',
    'THREAT_INTEL',
    'ADMIN_OPERATIONS',
    'DATA_EXPORT',
    'EMERGENCY_ACCESS'
);


ALTER TYPE public."PolicyType" OWNER TO postgres;

--
-- Name: PrivilegedActionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PrivilegedActionStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'EXECUTED',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."PrivilegedActionStatus" OWNER TO postgres;

--
-- Name: PrivilegedRiskLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PrivilegedRiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."PrivilegedRiskLevel" OWNER TO postgres;

--
-- Name: ProcessingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProcessingStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'READY',
    'FAILED'
);


ALTER TYPE public."ProcessingStatus" OWNER TO postgres;

--
-- Name: ProtectionEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProtectionEventType" AS ENUM (
    'SESSION_STARTED',
    'SESSION_HEARTBEAT',
    'SESSION_EXPIRED',
    'SESSION_REVOKED',
    'PLAYER_STARTED',
    'PLAYER_STOPPED',
    'FULLSCREEN_ENTERED',
    'FULLSCREEN_EXITED',
    'SCREENSHOT_ATTEMPT_DETECTED',
    'PLAYBACK_AUTHORIZED',
    'PLAYBACK_DENIED',
    'PLAYBACK_STARTED',
    'PLAYBACK_STOPPED',
    'PLAYBACK_TERMINATED',
    'PLAYBACK_AUTH_EXPIRED',
    'DRM_LICENSE_REQUESTED',
    'DRM_LICENSE_AUTHORIZED',
    'DRM_LICENSE_DENIED',
    'DRM_LICENSE_REVOKED',
    'DRM_ENCRYPTION_STARTED',
    'DRM_ENCRYPTION_COMPLETED',
    'DRM_ENCRYPTION_FAILED'
);


ALTER TYPE public."ProtectionEventType" OWNER TO postgres;

--
-- Name: ReleaseStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReleaseStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED'
);


ALTER TYPE public."ReleaseStatus" OWNER TO postgres;

--
-- Name: RetentionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RetentionStatus" AS ENUM (
    'ACTIVE',
    'EXPIRING',
    'EXPIRED',
    'LEGAL_HOLD',
    'ARCHIVED'
);


ALTER TYPE public."RetentionStatus" OWNER TO postgres;

--
-- Name: SecurityEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SecurityEventType" AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'ROLE_ACCESS_DENIED',
    'TICKET_CREATED',
    'TICKET_CANCELLED',
    'QR_ACTIVATION',
    'QR_ACTIVATION_DENIED',
    'STAFF_VERIFICATION',
    'PLAYBACK_AUTHORIZED',
    'PLAYBACK_DENIED',
    'PLAYBACK_TERMINATED',
    'DRM_LICENSE_AUTHORIZED',
    'DRM_LICENSE_DENIED',
    'DRM_LICENSE_REVOKED',
    'SUSPICIOUS_ACTIVITY',
    'RATE_LIMIT_EXCEEDED'
);


ALTER TYPE public."SecurityEventType" OWNER TO postgres;

--
-- Name: SecurityIncidentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SecurityIncidentStatus" AS ENUM (
    'NEW',
    'OPEN',
    'DETECTED',
    'TRIAGED',
    'ACKNOWLEDGED',
    'INVESTIGATING',
    'CONTAINMENT_PENDING',
    'CONTAINED',
    'MONITORING',
    'ESCALATED',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."SecurityIncidentStatus" OWNER TO postgres;

--
-- Name: SecuritySeverity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SecuritySeverity" AS ENUM (
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."SecuritySeverity" OWNER TO postgres;

--
-- Name: ShowStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ShowStatus" AS ENUM (
    'SCHEDULED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ShowStatus" OWNER TO postgres;

--
-- Name: ThreatAlertStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatAlertStatus" AS ENUM (
    'ACTIVE',
    'ACKNOWLEDGED',
    'RESOLVED'
);


ALTER TYPE public."ThreatAlertStatus" OWNER TO postgres;

--
-- Name: ThreatIntelCampaignStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatIntelCampaignStatus" AS ENUM (
    'OBSERVED',
    'ACTIVE',
    'ESCALATED',
    'CONTAINED',
    'RESOLVED',
    'ARCHIVED'
);


ALTER TYPE public."ThreatIntelCampaignStatus" OWNER TO postgres;

--
-- Name: ThreatIntelConfidenceLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatIntelConfidenceLevel" AS ENUM (
    'UNTRUSTED',
    'LOW',
    'MODERATE',
    'HIGH',
    'VERY_HIGH'
);


ALTER TYPE public."ThreatIntelConfidenceLevel" OWNER TO postgres;

--
-- Name: ThreatIntelIndicatorStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatIntelIndicatorStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'EXPIRED',
    'REVOKED'
);


ALTER TYPE public."ThreatIntelIndicatorStatus" OWNER TO postgres;

--
-- Name: ThreatIntelIndicatorType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatIntelIndicatorType" AS ENUM (
    'IP_ADDRESS',
    'DOMAIN',
    'URL',
    'FILE_HASH',
    'EMAIL',
    'CERTIFICATE',
    'USER_AGENT',
    'DEVICE_FINGERPRINT',
    'CONTENT_IDENTIFIER',
    'CAMPAIGN_IDENTIFIER'
);


ALTER TYPE public."ThreatIntelIndicatorType" OWNER TO postgres;

--
-- Name: ThreatIntelSourceHealthStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ThreatIntelSourceHealthStatus" AS ENUM (
    'HEALTHY',
    'DEGRADED',
    'FAILED',
    'DISABLED'
);


ALTER TYPE public."ThreatIntelSourceHealthStatus" OWNER TO postgres;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'ISSUED',
    'ACTIVATED',
    'USED',
    'CANCELLED'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'THEATRE_ADMIN',
    'THEATRE_STAFF',
    'PRODUCTION_COMPANY'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: VerificationResult; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VerificationResult" AS ENUM (
    'VERIFIED',
    'DENIED'
);


ALTER TYPE public."VerificationResult" OWNER TO postgres;

--
-- Name: VideoAssetState; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VideoAssetState" AS ENUM (
    'CREATED',
    'PROCESSING',
    'READY',
    'BLOCKED',
    'ARCHIVED'
);


ALTER TYPE public."VideoAssetState" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AccessDecision; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AccessDecision" (
    id text NOT NULL,
    "actorId" text,
    "actorEmail" text,
    "actorRole" text,
    "resourceType" text NOT NULL,
    "resourceId" text,
    action text NOT NULL,
    decision public."AccessDecisionType" NOT NULL,
    "riskScore" integer DEFAULT 0 NOT NULL,
    "trustScore" integer DEFAULT 100 NOT NULL,
    "evaluatedPolicyIds" text,
    "reasonCodes" text NOT NULL,
    "correlationId" text NOT NULL,
    "ipAddress" text,
    "deviceFingerprint" text,
    "theatreId" text,
    "productionCompanyId" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AccessDecision" OWNER TO postgres;

--
-- Name: Activation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Activation" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "activationCode" text NOT NULL,
    status public."ActivationStatus" DEFAULT 'PENDING'::public."ActivationStatus" NOT NULL,
    "activatedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "deviceFingerprint" text,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Activation" OWNER TO postgres;

--
-- Name: AutomatedResponse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AutomatedResponse" (
    id text NOT NULL,
    "incidentId" text,
    "actionType" text NOT NULL,
    status text DEFAULT 'RECOMMENDED'::text NOT NULL,
    "targetId" text,
    reason text NOT NULL,
    "executedBy" text,
    "executedAt" timestamp(3) without time zone,
    "correlationId" text,
    result text,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AutomatedResponse" OWNER TO postgres;

--
-- Name: AutomatedResponseAction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AutomatedResponseAction" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "actionType" text NOT NULL,
    status text DEFAULT 'RECOMMENDED'::text NOT NULL,
    reason text NOT NULL,
    "executedBy" text,
    "executedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AutomatedResponseAction" OWNER TO postgres;

--
-- Name: BreakGlassSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BreakGlassSession" (
    id text NOT NULL,
    "sessionIdentifier" text NOT NULL,
    "activatedBy" text NOT NULL,
    "activatorEmail" text,
    reason text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "activatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "postReviewRequired" boolean DEFAULT true NOT NULL,
    "postReviewCompleted" boolean DEFAULT false NOT NULL,
    "postReviewCompletedAt" timestamp(3) without time zone,
    "postReviewCompletedBy" text,
    "postReviewNotes" text,
    "correlationId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BreakGlassSession" OWNER TO postgres;

--
-- Name: ContentAsset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ContentAsset" (
    id text NOT NULL,
    "movieId" text NOT NULL,
    "assetType" text NOT NULL,
    "processingStatus" text DEFAULT 'READY'::text NOT NULL,
    "durationMinutes" integer,
    resolution text,
    "fileReference" text NOT NULL,
    "fileSizeMb" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ContentAsset" OWNER TO postgres;

--
-- Name: DeviceTrustRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DeviceTrustRecord" (
    id text NOT NULL,
    "deviceFingerprintHash" text NOT NULL,
    "deviceName" text,
    "trustStatus" public."DeviceTrustStatus" DEFAULT 'UNKNOWN'::public."DeviceTrustStatus" NOT NULL,
    "lastSeenIp" text,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "trustScore" integer DEFAULT 50 NOT NULL,
    "riskFactors" text,
    "observationCount" integer DEFAULT 1 NOT NULL,
    "trustRevokedAt" timestamp(3) without time zone,
    "trustRevokedReason" text,
    "trustGrantedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DeviceTrustRecord" OWNER TO postgres;

--
-- Name: DrmAsset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DrmAsset" (
    id text NOT NULL,
    "videoAssetId" text NOT NULL,
    provider public."DrmProviderType" DEFAULT 'MOCK'::public."DrmProviderType" NOT NULL,
    "drmScheme" text DEFAULT 'AES-128-ENCRYPTED'::text NOT NULL,
    "keyId" text NOT NULL,
    "encryptedManifestUrl" text,
    "licenseServerUrl" text,
    status public."DrmStatus" DEFAULT 'NOT_CONFIGURED'::public."DrmStatus" NOT NULL,
    "statusMessage" text,
    "encryptionProgress" integer DEFAULT 0 NOT NULL,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DrmAsset" OWNER TO postgres;

--
-- Name: DrmLicense; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DrmLicense" (
    id text NOT NULL,
    "drmAssetId" text NOT NULL,
    "playbackSessionId" text,
    "activationId" text NOT NULL,
    "theatreId" text NOT NULL,
    "showId" text NOT NULL,
    "licenseToken" text NOT NULL,
    status public."DrmLicenseStatus" DEFAULT 'ISSUED'::public."DrmLicenseStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revocationReason" text,
    "clientIp" text,
    "userAgent" text,
    "deviceFingerprint" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DrmLicense" OWNER TO postgres;

--
-- Name: EvidenceAccessLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceAccessLog" (
    id text NOT NULL,
    "evidenceRecordId" text NOT NULL,
    "userId" text NOT NULL,
    "userEmail" text NOT NULL,
    "userRole" text NOT NULL,
    "accessType" text NOT NULL,
    "ipAddress" text,
    reason text,
    "accessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EvidenceAccessLog" OWNER TO postgres;

--
-- Name: EvidenceArtifact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceArtifact" (
    id text NOT NULL,
    "evidenceRecordId" text NOT NULL,
    "artifactName" text NOT NULL,
    "artifactType" text NOT NULL,
    "mimeType" text DEFAULT 'application/json'::text NOT NULL,
    "fileSizeBytes" integer DEFAULT 0 NOT NULL,
    "storagePath" text,
    "sha256Hash" text NOT NULL,
    "payloadData" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EvidenceArtifact" OWNER TO postgres;

--
-- Name: EvidenceChainEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceChainEvent" (
    id text NOT NULL,
    "evidenceRecordId" text NOT NULL,
    "eventType" text NOT NULL,
    "actorId" text,
    "actorRole" text,
    "actorEmail" text,
    "previousChainHash" text NOT NULL,
    "currentChainHash" text NOT NULL,
    "eventData" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EvidenceChainEvent" OWNER TO postgres;

--
-- Name: EvidenceHash; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceHash" (
    id text NOT NULL,
    "evidenceRecordId" text NOT NULL,
    "calculatedHash" text NOT NULL,
    "previousHash" text,
    algorithm text DEFAULT 'SHA-256'::text NOT NULL,
    "verificationStatus" text DEFAULT 'VALID'::text NOT NULL,
    "verifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EvidenceHash" OWNER TO postgres;

--
-- Name: EvidenceRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceRecord" (
    id text NOT NULL,
    "evidenceNumber" text NOT NULL,
    title text NOT NULL,
    description text,
    classification public."EvidenceClassification" NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    status public."EvidenceStatus" DEFAULT 'COLLECTED'::public."EvidenceStatus" NOT NULL,
    "retentionStatus" public."RetentionStatus" DEFAULT 'ACTIVE'::public."RetentionStatus" NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "productionCompanyId" text,
    "playbackSessionId" text,
    "incidentId" text,
    "securityIncidentId" text,
    source text NOT NULL,
    "capturedBy" text,
    metadata text,
    "integrityHash" text,
    "lastVerifiedAt" timestamp(3) without time zone,
    "retentionExpiresAt" timestamp(3) without time zone,
    "legalHoldReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EvidenceRecord" OWNER TO postgres;

--
-- Name: ForensicEvidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ForensicEvidence" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "evidenceType" public."EvidenceType" DEFAULT 'WATERMARK_CAPTURE'::public."EvidenceType" NOT NULL,
    "watermarkFingerprint" text,
    "playbackSessionId" text,
    "activationId" text,
    "theatreId" text,
    "showId" text,
    "seatNumber" text,
    "confidenceScore" integer DEFAULT 90 NOT NULL,
    "evidenceHash" text NOT NULL,
    "sourceUrlOrFile" text,
    metadata text,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ForensicEvidence" OWNER TO postgres;

--
-- Name: ForensicInvestigationNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ForensicInvestigationNote" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "investigatorId" text,
    "investigatorEmail" text,
    note text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ForensicInvestigationNote" OWNER TO postgres;

--
-- Name: GovernanceAuditEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GovernanceAuditEvent" (
    id text NOT NULL,
    "eventType" public."GovernanceEventType" NOT NULL,
    severity public."SecuritySeverity" DEFAULT 'INFO'::public."SecuritySeverity" NOT NULL,
    "actorId" text,
    "actorEmail" text,
    "actorRole" text,
    "targetType" text NOT NULL,
    "targetId" text,
    "actionSummary" text NOT NULL,
    changes text,
    "correlationId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GovernanceAuditEvent" OWNER TO postgres;

--
-- Name: IdempotencyRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IdempotencyRecord" (
    id text NOT NULL,
    key text NOT NULL,
    path text NOT NULL,
    method text NOT NULL,
    "requestHash" text NOT NULL,
    status public."IdempotencyStatus" DEFAULT 'PENDING'::public."IdempotencyStatus" NOT NULL,
    "statusCode" integer,
    "responseBody" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IdempotencyRecord" OWNER TO postgres;

--
-- Name: IncidentAction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IncidentAction" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "actionType" public."IncidentActionType" NOT NULL,
    "actorId" text,
    "targetId" text,
    result text DEFAULT 'SUCCESS'::text NOT NULL,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IncidentAction" OWNER TO postgres;

--
-- Name: IncidentEvidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IncidentEvidence" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "evidenceType" public."IncidentEvidenceType" DEFAULT 'LOG_EXTRACT'::public."IncidentEvidenceType" NOT NULL,
    "referenceId" text,
    metadata text,
    hash text NOT NULL,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IncidentEvidence" OWNER TO postgres;

--
-- Name: IntelligenceSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IntelligenceSnapshot" (
    id text NOT NULL,
    "totalThreats" integer DEFAULT 0 NOT NULL,
    "criticalThreats" integer DEFAULT 0 NOT NULL,
    "highThreats" integer DEFAULT 0 NOT NULL,
    "activeIncidents" integer DEFAULT 0 NOT NULL,
    "affectedTheatres" integer DEFAULT 0 NOT NULL,
    "affectedShows" integer DEFAULT 0 NOT NULL,
    "suspiciousSessions" integer DEFAULT 0 NOT NULL,
    "averageRiskScore" double precision DEFAULT 0.0 NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IntelligenceSnapshot" OWNER TO postgres;

--
-- Name: InvestigationAssignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationAssignment" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "analystId" text NOT NULL,
    "assignedBy" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


ALTER TABLE public."InvestigationAssignment" OWNER TO postgres;

--
-- Name: InvestigationCase; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationCase" (
    id text NOT NULL,
    "caseNumber" text NOT NULL,
    title text NOT NULL,
    description text,
    status public."InvestigationCaseStatus" DEFAULT 'OPEN'::public."InvestigationCaseStatus" NOT NULL,
    severity public."InvestigationCaseSeverity" DEFAULT 'MEDIUM'::public."InvestigationCaseSeverity" NOT NULL,
    "threatClassification" text,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "productionCompanyId" text,
    "playbackSessionId" text,
    "assignedAnalystId" text,
    resolution text,
    "closureReason" text,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InvestigationCase" OWNER TO postgres;

--
-- Name: InvestigationEvidenceLink; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationEvidenceLink" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "evidenceRecordId" text NOT NULL,
    "linkedBy" text NOT NULL,
    "linkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    relevance text
);


ALTER TABLE public."InvestigationEvidenceLink" OWNER TO postgres;

--
-- Name: InvestigationNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationNote" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "authorId" text NOT NULL,
    content text NOT NULL,
    "isInternal" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InvestigationNote" OWNER TO postgres;

--
-- Name: InvestigationStatusHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationStatusHistory" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "fromStatus" public."InvestigationCaseStatus" NOT NULL,
    "toStatus" public."InvestigationCaseStatus" NOT NULL,
    "changedBy" text NOT NULL,
    reason text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InvestigationStatusHistory" OWNER TO postgres;

--
-- Name: InvestigationTimelineEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvestigationTimelineEvent" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    title text NOT NULL,
    description text,
    "eventType" text NOT NULL,
    "actorId" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InvestigationTimelineEvent" OWNER TO postgres;

--
-- Name: Movie; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Movie" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    synopsis text,
    "durationMinutes" integer NOT NULL,
    language text NOT NULL,
    rating text,
    "posterUrl" text,
    "releaseDate" timestamp(3) without time zone,
    "contentStatus" public."ContentStatus" DEFAULT 'DRAFT'::public."ContentStatus" NOT NULL,
    "productionCompanyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Movie" OWNER TO postgres;

--
-- Name: MovieAuditEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MovieAuditEvent" (
    id text NOT NULL,
    "movieId" text,
    "releaseId" text,
    "userId" text,
    action text NOT NULL,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MovieAuditEvent" OWNER TO postgres;

--
-- Name: MovieRelease; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MovieRelease" (
    id text NOT NULL,
    "movieId" text NOT NULL,
    "productionCompanyId" text NOT NULL,
    "theatreId" text NOT NULL,
    "screenId" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."ReleaseStatus" DEFAULT 'PENDING_APPROVAL'::public."ReleaseStatus" NOT NULL,
    "rejectionReason" text,
    "approvedByAdminId" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MovieRelease" OWNER TO postgres;

--
-- Name: PiracyIncident; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PiracyIncident" (
    id text NOT NULL,
    "incidentNumber" text NOT NULL,
    title text NOT NULL,
    description text,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    status public."IncidentStatus" DEFAULT 'DETECTED'::public."IncidentStatus" NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "playbackSessionId" text,
    "activationId" text,
    "riskScore" integer DEFAULT 50 NOT NULL,
    "assignedInvestigatorId" text,
    "mitigationAction" text,
    "resolutionNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "closedAt" timestamp(3) without time zone
);


ALTER TABLE public."PiracyIncident" OWNER TO postgres;

--
-- Name: PlaybackDevice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PlaybackDevice" (
    id text NOT NULL,
    "deviceId" text NOT NULL,
    name text NOT NULL,
    status public."DeviceStatus" DEFAULT 'REGISTERED'::public."DeviceStatus" NOT NULL,
    "theatreId" text NOT NULL,
    "screenId" text,
    "softwareVersion" text DEFAULT '2.4.0'::text NOT NULL,
    "deviceFingerprint" text,
    "ipAddress" text,
    "lastHeartbeatAt" timestamp(3) without time zone,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PlaybackDevice" OWNER TO postgres;

--
-- Name: PlaybackSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PlaybackSession" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "activationId" text NOT NULL,
    "videoAssetId" text NOT NULL,
    "theatreId" text NOT NULL,
    "showId" text NOT NULL,
    status public."PlaybackSessionStatus" DEFAULT 'AUTHORIZED'::public."PlaybackSessionStatus" NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "authorizedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "terminatedAt" timestamp(3) without time zone,
    "terminationReason" text,
    "lastHeartbeatAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PlaybackSession" OWNER TO postgres;

--
-- Name: PolicyVersion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PolicyVersion" (
    id text NOT NULL,
    "policyId" text NOT NULL,
    version integer NOT NULL,
    "ruleSnapshot" text NOT NULL,
    "changeReason" text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PolicyVersion" OWNER TO postgres;

--
-- Name: PrivilegedActionRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PrivilegedActionRequest" (
    id text NOT NULL,
    "actionType" text NOT NULL,
    "requestedBy" text NOT NULL,
    "requesterEmail" text,
    "requesterRole" text,
    "targetResource" text NOT NULL,
    "targetResourceId" text,
    reason text NOT NULL,
    "riskLevel" public."PrivilegedRiskLevel" DEFAULT 'HIGH'::public."PrivilegedRiskLevel" NOT NULL,
    "approvalStatus" public."PrivilegedActionStatus" DEFAULT 'PENDING_APPROVAL'::public."PrivilegedActionStatus" NOT NULL,
    "approverId" text,
    "approverEmail" text,
    "approvalNotes" text,
    "approvedAt" timestamp(3) without time zone,
    "executedAt" timestamp(3) without time zone,
    "executionToken" text,
    "executionResult" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "correlationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PrivilegedActionRequest" OWNER TO postgres;

--
-- Name: ProductionCompany; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductionCompany" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "contactEmail" text NOT NULL,
    "contactPhone" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductionCompany" OWNER TO postgres;

--
-- Name: ProtectionEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProtectionEvent" (
    id text NOT NULL,
    "activationId" text NOT NULL,
    "theatreId" text,
    "showId" text,
    "eventType" public."ProtectionEventType" NOT NULL,
    metadata text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProtectionEvent" OWNER TO postgres;

--
-- Name: RealtimeIncidentNotification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RealtimeIncidentNotification" (
    id text NOT NULL,
    "incidentId" text,
    "notificationType" text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'HIGH'::public."IncidentSeverity" NOT NULL,
    message text NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RealtimeIncidentNotification" OWNER TO postgres;

--
-- Name: RealtimeThreatEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RealtimeThreatEvent" (
    id text NOT NULL,
    "correlationId" text NOT NULL,
    "eventId" text NOT NULL,
    "eventType" text NOT NULL,
    source text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'LOW'::public."IncidentSeverity" NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "activationId" text,
    "playbackSessionId" text,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RealtimeThreatEvent" OWNER TO postgres;

--
-- Name: RevokedToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RevokedToken" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" text NOT NULL,
    "revokedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    reason text
);


ALTER TABLE public."RevokedToken" OWNER TO postgres;

--
-- Name: RiskHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RiskHistory" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    "previousScore" integer NOT NULL,
    "newScore" integer NOT NULL,
    reason text NOT NULL,
    "correlationId" text,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RiskHistory" OWNER TO postgres;

--
-- Name: Screen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Screen" (
    id text NOT NULL,
    "theatreId" text NOT NULL,
    "screenNumber" integer NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Screen" OWNER TO postgres;

--
-- Name: SecurityAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityAuditLog" (
    id text NOT NULL,
    "eventType" public."SecurityEventType" NOT NULL,
    severity public."SecuritySeverity" DEFAULT 'INFO'::public."SecuritySeverity" NOT NULL,
    "userId" text,
    "actorEmail" text,
    "actorRole" text,
    "theatreId" text,
    "showId" text,
    "activationId" text,
    "ticketId" text,
    "ipAddress" text,
    "userAgent" text,
    "deviceFingerprint" text,
    endpoint text,
    "actionSummary" text NOT NULL,
    metadata text,
    "isThreat" boolean DEFAULT false NOT NULL,
    "threatDetails" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityAuditLog" OWNER TO postgres;

--
-- Name: SecurityEscalation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityEscalation" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "fromSeverity" public."IncidentSeverity" NOT NULL,
    "toSeverity" public."IncidentSeverity" NOT NULL,
    "fromRisk" integer DEFAULT 0 NOT NULL,
    "toRisk" integer DEFAULT 0 NOT NULL,
    reason text NOT NULL,
    "triggeredBy" text NOT NULL,
    "policyId" text,
    "correlationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityEscalation" OWNER TO postgres;

--
-- Name: SecurityIncident; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityIncident" (
    id text NOT NULL,
    "incidentNumber" text NOT NULL,
    title text NOT NULL,
    description text,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    status public."SecurityIncidentStatus" DEFAULT 'NEW'::public."SecurityIncidentStatus" NOT NULL,
    source public."IncidentSource" DEFAULT 'THREAT_ENGINE'::public."IncidentSource" NOT NULL,
    "assignedToId" text,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "activationId" text,
    "playbackSessionId" text,
    "investigationCaseId" text,
    "evidenceRecordId" text,
    "threatIntelIndicatorId" text,
    "riskScore" integer DEFAULT 50 NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    "resolutionNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SecurityIncident" OWNER TO postgres;

--
-- Name: SecurityIncidentTimeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityIncidentTimeline" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "eventType" text NOT NULL,
    description text NOT NULL,
    "actorId" text,
    "actorEmail" text,
    "actorRole" text,
    "previousStatus" text,
    "newStatus" text,
    metadata text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityIncidentTimeline" OWNER TO postgres;

--
-- Name: SecurityNotification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityNotification" (
    id text NOT NULL,
    category text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "targetRole" text,
    "targetUserId" text,
    "theatreId" text,
    "productionCompanyId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "isMuted" boolean DEFAULT false NOT NULL,
    "deduplicationKey" text,
    "correlationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityNotification" OWNER TO postgres;

--
-- Name: SecurityPolicy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityPolicy" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "policyType" public."PolicyType" DEFAULT 'ACCESS_CONTROL'::public."PolicyType" NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    rules text NOT NULL,
    "tenantType" text,
    "tenantId" text,
    "effectiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdBy" text,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SecurityPolicy" OWNER TO postgres;

--
-- Name: SecurityWorkflow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityWorkflow" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "triggerType" text NOT NULL,
    "triggerCondition" text NOT NULL,
    "actionType" text NOT NULL,
    "actionPayload" text,
    "isEnabled" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    "tenantType" text,
    "tenantId" text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SecurityWorkflow" OWNER TO postgres;

--
-- Name: SecurityWorkflowExecution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityWorkflowExecution" (
    id text NOT NULL,
    "workflowId" text NOT NULL,
    "triggerEvent" text NOT NULL,
    decision text NOT NULL,
    "actionTaken" text NOT NULL,
    status text DEFAULT 'SUCCESS'::text NOT NULL,
    result text,
    "actorId" text,
    "actorEmail" text,
    "correlationId" text NOT NULL,
    "executedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityWorkflowExecution" OWNER TO postgres;

--
-- Name: Show; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Show" (
    id text NOT NULL,
    "theatreId" text NOT NULL,
    "screenId" text NOT NULL,
    "movieId" text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    status public."ShowStatus" DEFAULT 'SCHEDULED'::public."ShowStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Show" OWNER TO postgres;

--
-- Name: Theatre; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Theatre" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "permanentQrCode" text,
    location text NOT NULL,
    address text,
    "contactEmail" text,
    "contactPhone" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Theatre" OWNER TO postgres;

--
-- Name: ThreatAlert; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatAlert" (
    id text NOT NULL,
    "alertType" text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    "riskScore" integer DEFAULT 50 NOT NULL,
    "theatreId" text,
    "showId" text,
    "activationId" text,
    "playbackSessionId" text,
    description text NOT NULL,
    status public."ThreatAlertStatus" DEFAULT 'ACTIVE'::public."ThreatAlertStatus" NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);


ALTER TABLE public."ThreatAlert" OWNER TO postgres;

--
-- Name: ThreatCorrelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatCorrelation" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    "sourceEventId" text NOT NULL,
    "sourceType" text NOT NULL,
    "correlationType" text NOT NULL,
    "correlationScore" integer DEFAULT 75 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatCorrelation" OWNER TO postgres;

--
-- Name: ThreatIntelAction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelAction" (
    id text NOT NULL,
    "actionType" text NOT NULL,
    "indicatorId" text,
    "campaignId" text,
    "actorId" text NOT NULL,
    "actorEmail" text,
    "actorRole" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelAction" OWNER TO postgres;

--
-- Name: ThreatIntelCampaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelCampaign" (
    id text NOT NULL,
    "campaignIdentifier" text NOT NULL,
    name text NOT NULL,
    description text,
    "threatClassification" text NOT NULL,
    "riskLevel" text DEFAULT 'HIGH'::text NOT NULL,
    confidence integer DEFAULT 75 NOT NULL,
    status public."ThreatIntelCampaignStatus" DEFAULT 'OBSERVED'::public."ThreatIntelCampaignStatus" NOT NULL,
    "theatreId" text,
    "movieId" text,
    "productionCompanyId" text,
    "investigationCaseId" text,
    "evidenceRecordId" text,
    "firstObservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastObservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatIntelCampaign" OWNER TO postgres;

--
-- Name: ThreatIntelFeed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelFeed" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "feedName" text NOT NULL,
    "feedUrl" text,
    "feedFormat" text DEFAULT 'JSON'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastPolledAt" timestamp(3) without time zone,
    "pollIntervalSec" integer DEFAULT 3600 NOT NULL,
    "totalRecordsIngested" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatIntelFeed" OWNER TO postgres;

--
-- Name: ThreatIntelImport; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelImport" (
    id text NOT NULL,
    "sourceId" text,
    "importFormat" text NOT NULL,
    "fileName" text,
    "totalRecords" integer DEFAULT 0 NOT NULL,
    "importedCount" integer DEFAULT 0 NOT NULL,
    "duplicateCount" integer DEFAULT 0 NOT NULL,
    "rejectedCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'COMPLETED'::text NOT NULL,
    "errorMessage" text,
    "importedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelImport" OWNER TO postgres;

--
-- Name: ThreatIntelIndicator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelIndicator" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "indicatorType" public."ThreatIntelIndicatorType" NOT NULL,
    value text NOT NULL,
    "rawValue" text,
    "confidenceScore" integer DEFAULT 50 NOT NULL,
    "confidenceLevel" public."ThreatIntelConfidenceLevel" DEFAULT 'MODERATE'::public."ThreatIntelConfidenceLevel" NOT NULL,
    status public."ThreatIntelIndicatorStatus" DEFAULT 'ACTIVE'::public."ThreatIntelIndicatorStatus" NOT NULL,
    "threatClassification" text,
    description text,
    tags text,
    "firstSeen" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeen" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "isAnalystValidated" boolean DEFAULT false NOT NULL,
    "validatedBy" text,
    "validatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatIntelIndicator" OWNER TO postgres;

--
-- Name: ThreatIntelMatch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelMatch" (
    id text NOT NULL,
    "indicatorId" text NOT NULL,
    "campaignId" text,
    "correlationType" text NOT NULL,
    "correlationDetails" text,
    confidence integer DEFAULT 80 NOT NULL,
    "theatreId" text,
    "movieId" text,
    "playbackSessionId" text,
    "investigationCaseId" text,
    "evidenceRecordId" text,
    "securityAuditLogId" text,
    "matchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelMatch" OWNER TO postgres;

--
-- Name: ThreatIntelObservation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelObservation" (
    id text NOT NULL,
    "indicatorId" text NOT NULL,
    "sightingSource" text NOT NULL,
    "contextTelemetry" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelObservation" OWNER TO postgres;

--
-- Name: ThreatIntelRelationship; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelRelationship" (
    id text NOT NULL,
    "sourceIndicatorId" text NOT NULL,
    "targetIndicatorId" text NOT NULL,
    "relationshipType" text NOT NULL,
    confidence integer DEFAULT 50 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelRelationship" OWNER TO postgres;

--
-- Name: ThreatIntelSource; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelSource" (
    id text NOT NULL,
    name text NOT NULL,
    "providerType" text NOT NULL,
    description text,
    "trustLevel" integer DEFAULT 50 NOT NULL,
    "defaultConfidence" integer DEFAULT 50 NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "authConfigReference" text,
    "webhookSecretHash" text,
    "lastSyncSuccessAt" timestamp(3) without time zone,
    "lastSyncFailureAt" timestamp(3) without time zone,
    "lastFailureReason" text,
    "syncFrequencyMinutes" integer DEFAULT 60 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatIntelSource" OWNER TO postgres;

--
-- Name: ThreatIntelSourceHealth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelSourceHealth" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    status public."ThreatIntelSourceHealthStatus" DEFAULT 'HEALTHY'::public."ThreatIntelSourceHealthStatus" NOT NULL,
    "responseLatencyMs" integer DEFAULT 0 NOT NULL,
    "lastHttpCode" integer,
    "recordsIngested" integer DEFAULT 0 NOT NULL,
    "errorMessage" text,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatIntelSourceHealth" OWNER TO postgres;

--
-- Name: ThreatIntelligenceIncident; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatIntelligenceIncident" (
    id text NOT NULL,
    "incidentCode" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    "riskScore" integer DEFAULT 0 NOT NULL,
    "confidenceScore" integer DEFAULT 0 NOT NULL,
    status public."IncidentStatus" DEFAULT 'DETECTED'::public."IncidentStatus" NOT NULL,
    source text DEFAULT 'INTELLIGENCE_CORRELATOR'::text NOT NULL,
    "theatreId" text,
    "showId" text,
    "activationId" text,
    "playbackSessionId" text,
    "firstDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "assignedTo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatIntelligenceIncident" OWNER TO postgres;

--
-- Name: ThreatInvestigationLink; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatInvestigationLink" (
    id text NOT NULL,
    "predictionId" text,
    "patternId" text,
    "incidentId" text,
    "investigationId" text,
    "forensicEvidenceId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatInvestigationLink" OWNER TO postgres;

--
-- Name: ThreatPattern; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatPattern" (
    id text NOT NULL,
    "patternType" text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    severity public."IncidentSeverity" DEFAULT 'MEDIUM'::public."IncidentSeverity" NOT NULL,
    confidence integer DEFAULT 80 NOT NULL,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    evidence text,
    status text DEFAULT 'DETECTED'::text NOT NULL,
    "firstDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastDetectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatPattern" OWNER TO postgres;

--
-- Name: ThreatPrediction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatPrediction" (
    id text NOT NULL,
    "theatreId" text,
    "showId" text,
    "movieId" text,
    "predictionType" text NOT NULL,
    "predictedRisk" integer NOT NULL,
    confidence integer NOT NULL,
    explanation text NOT NULL,
    "recommendedAction" text NOT NULL,
    "predictionWindow" text DEFAULT 'NEXT_24_HOURS'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatPrediction" OWNER TO postgres;

--
-- Name: ThreatRiskScore; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatRiskScore" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    "riskScore" integer NOT NULL,
    "riskLevel" text NOT NULL,
    confidence integer NOT NULL,
    "contributingSignals" text NOT NULL,
    recommendation text NOT NULL,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ThreatRiskScore" OWNER TO postgres;

--
-- Name: ThreatSignal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ThreatSignal" (
    id text NOT NULL,
    "incidentId" text,
    "patternId" text,
    "signalType" text NOT NULL,
    "signalValue" text NOT NULL,
    "eventType" text,
    source text,
    "riskWeight" integer DEFAULT 10 NOT NULL,
    weight integer DEFAULT 10 NOT NULL,
    confidence integer DEFAULT 80 NOT NULL,
    metadata text,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ThreatSignal" OWNER TO postgres;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "ticketNumber" text NOT NULL,
    "showId" text NOT NULL,
    "seatNumber" text NOT NULL,
    price numeric(10,2) NOT NULL,
    status public."TicketStatus" DEFAULT 'ISSUED'::public."TicketStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'THEATRE_STAFF'::public."UserRole" NOT NULL,
    "theatreId" text,
    "productionCompanyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Verification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Verification" (
    id text NOT NULL,
    "activationId" text,
    "theatreId" text,
    "showId" text,
    "staffId" text NOT NULL,
    result public."VerificationResult" NOT NULL,
    reason text,
    "scannedCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Verification" OWNER TO postgres;

--
-- Name: VideoAsset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoAsset" (
    id text NOT NULL,
    title text NOT NULL,
    "movieId" text NOT NULL,
    "contentAssetId" text,
    "productionCompanyId" text NOT NULL,
    state public."VideoAssetState" DEFAULT 'READY'::public."VideoAssetState" NOT NULL,
    "processingStatus" public."ProcessingStatus" DEFAULT 'QUEUED'::public."ProcessingStatus" NOT NULL,
    "processingProgress" integer DEFAULT 0 NOT NULL,
    "processingError" text,
    "processingLogs" text,
    "sourceFilePath" text,
    "originalFilename" text,
    "fileSizeMb" double precision,
    "mimeType" text,
    resolution text,
    "durationSeconds" integer DEFAULT 0,
    "videoCodec" text,
    "audioCodec" text,
    "streamKey" text NOT NULL,
    "deliveryManifestUrl" text NOT NULL,
    "hlsMasterManifestPath" text,
    "thumbnailPath" text,
    "drmScheme" text DEFAULT 'AES-128-ENCRYPTED'::text,
    bitrates text DEFAULT '1080p, 720p, 480p'::text,
    "processingStartedAt" timestamp(3) without time zone,
    "processingCompletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VideoAsset" OWNER TO postgres;

--
-- Name: _CampaignIndicators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_CampaignIndicators" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_CampaignIndicators" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: AccessDecision; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AccessDecision" (id, "actorId", "actorEmail", "actorRole", "resourceType", "resourceId", action, decision, "riskScore", "trustScore", "evaluatedPolicyIds", "reasonCodes", "correlationId", "ipAddress", "deviceFingerprint", "theatreId", "productionCompanyId", "timestamp") FROM stdin;
\.


--
-- Data for Name: Activation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Activation" (id, "ticketId", "activationCode", status, "activatedAt", "expiresAt", "deviceFingerprint", "ipAddress", "createdAt", "updatedAt") FROM stdin;
3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	ACT-VAL-DEMO-01	EXPIRED	\N	2026-09-01 18:28:52.611	\N	\N	2026-09-01 15:58:53.151	2026-09-02 01:24:37.047
\.


--
-- Data for Name: AutomatedResponse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AutomatedResponse" (id, "incidentId", "actionType", status, "targetId", reason, "executedBy", "executedAt", "correlationId", result, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AutomatedResponseAction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AutomatedResponseAction" (id, "incidentId", "actionType", status, reason, "executedBy", "executedAt", "expiresAt", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: BreakGlassSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BreakGlassSession" (id, "sessionIdentifier", "activatedBy", "activatorEmail", reason, "isActive", "activatedAt", "expiresAt", "closedAt", "closedBy", "postReviewRequired", "postReviewCompleted", "postReviewCompletedAt", "postReviewCompletedBy", "postReviewNotes", "correlationId", "ipAddress", "userAgent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ContentAsset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ContentAsset" (id, "movieId", "assetType", "processingStatus", "durationMinutes", resolution, "fileReference", "fileSizeMb", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DeviceTrustRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DeviceTrustRecord" (id, "deviceFingerprintHash", "deviceName", "trustStatus", "lastSeenIp", "firstSeenAt", "lastSeenAt", "trustScore", "riskFactors", "observationCount", "trustRevokedAt", "trustRevokedReason", "trustGrantedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DrmAsset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DrmAsset" (id, "videoAssetId", provider, "drmScheme", "keyId", "encryptedManifestUrl", "licenseServerUrl", status, "statusMessage", "encryptionProgress", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DrmLicense; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DrmLicense" (id, "drmAssetId", "playbackSessionId", "activationId", "theatreId", "showId", "licenseToken", status, "issuedAt", "expiresAt", "revokedAt", "revocationReason", "clientIp", "userAgent", "deviceFingerprint", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EvidenceAccessLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceAccessLog" (id, "evidenceRecordId", "userId", "userEmail", "userRole", "accessType", "ipAddress", reason, "accessedAt") FROM stdin;
\.


--
-- Data for Name: EvidenceArtifact; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceArtifact" (id, "evidenceRecordId", "artifactName", "artifactType", "mimeType", "fileSizeBytes", "storagePath", "sha256Hash", "payloadData", "createdAt") FROM stdin;
\.


--
-- Data for Name: EvidenceChainEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceChainEvent" (id, "evidenceRecordId", "eventType", "actorId", "actorRole", "actorEmail", "previousChainHash", "currentChainHash", "eventData", "timestamp") FROM stdin;
\.


--
-- Data for Name: EvidenceHash; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceHash" (id, "evidenceRecordId", "calculatedHash", "previousHash", algorithm, "verificationStatus", "verifiedAt") FROM stdin;
2789020f-5e43-4ae1-8a72-b088d2974018	fc063ac6-333d-4f9b-9a18-ecab5621a441	221895b18b57f39f9c85407f4e71815a37a5037b4d8d24ad447d00c413cccc28	\N	SHA-256	VALID	2026-09-02 01:24:43.62
0d9e0949-9d51-4b3f-bf5e-9d2c1ff3096b	109545b6-7731-4884-8084-97bbbd2966b9	0587868fa5e1c5e8c5b48b483c9c6c1d1e0532d98fe9f66f4c2b207f168ce4e5	\N	SHA-256	VALID	2026-09-02 01:24:55.95
451ac97d-59da-4cd1-acee-52b2b1136e33	63c20bcc-0835-4406-8e3c-1569f94cf15b	509af4796e39b2c6ea73532ed37972b4bfa0bab45264780f1e578891bc5a189f	\N	SHA-256	VALID	2026-09-02 01:27:46.697
de0141b1-d722-4b22-8a39-9d0006b7a8cb	e701295f-ce4a-40c7-b759-6267ece06faf	ccc5177fb12ee24cffbe5d18570fb766105e2b6207e357d4604cec7c0f5fab19	\N	SHA-256	VALID	2026-09-02 01:27:47.78
\.


--
-- Data for Name: EvidenceRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceRecord" (id, "evidenceNumber", title, description, classification, severity, status, "retentionStatus", "theatreId", "showId", "movieId", "productionCompanyId", "playbackSessionId", "incidentId", "securityIncidentId", source, "capturedBy", metadata, "integrityHash", "lastVerifiedAt", "retentionExpiresAt", "legalHoldReason", "createdAt", "updatedAt") FROM stdin;
fc063ac6-333d-4f9b-9a18-ecab5621a441	EV-AUTO-283614-786	Automated Evidence Package: Interstellar Sentinel: Cyber Odyssey - Seat K-14	Automated forensic telemetry bundle captured for session 3af3e292-00dd-4824-8863-95024aa1c864 [Signal: SCREEN_CAPTURE_SIGNAL]	SCREENSHOT_CAPTURE	CRITICAL	VERIFIED	ACTIVE	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	1b9862b0-b208-46d1-bac1-63b967fa1948	\N	7c50b698-97df-4e1f-9e14-ceeb0f17a3a3	\N	AUTOMATED_EVIDENCE_ENGINE	SYSTEM_AUTOMATION	{"packageId":"PKG-1788312283614-664","incidentReference":{"id":"7c50b698-97df-4e1f-9e14-ceeb0f17a3a3","incidentNumber":"INC-2026-0001","title":"[Orchestrated] Anti-Piracy Anomaly: SCREEN_CAPTURE_SIGNAL","severity":"CRITICAL","riskScore":100},"screeningSession":{"sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","activationId":"3af3e292-00dd-4824-8863-95024aa1c864","seatNumber":"K-14","ticketNumber":"TCK-VAL-DEMO-01"},"theatre":{"id":"a77487df-8c55-4c40-8731-f71e418acbae","name":"Grand Palace Laser IMAX Cinema","code":"THTR-VAL-DEMO"},"movie":{"id":"6f2dd033-dad5-4c93-87c3-ac8583bcec94","title":"Interstellar Sentinel: Cyber Odyssey"},"screen":{"name":"Auditorium 1 (Laser IMAX)"},"securityEventTimeline":[{"eventType":"CAMERA_ACTIVITY","timestamp":"2026-09-02T01:24:43.556Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283556-41eba3"},{"eventType":"WATERMARK_MODULATION_TAMPER","timestamp":"2026-09-02T01:24:43.555Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283554-1767cc"},{"eventType":"SCREEN_CAPTURE_SIGNAL","timestamp":"2026-09-02T01:24:43.553Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283552-21e396"},{"eventType":"SESSION_HEARTBEAT","timestamp":"2026-09-02T01:24:41.531Z","severity":"LOW","eventId":"EVT-ORCH-1788312281530-bd4f24"},{"eventType":"FULLSCREEN_EXIT","timestamp":"2026-09-02T01:24:37.054Z","severity":"LOW","eventId":"EVT-ORCH-1788312277053-c9e416"}],"riskScore":100,"severity":"CRITICAL","generatedAt":"2026-09-02T01:24:43.614Z"}	221895b18b57f39f9c85407f4e71815a37a5037b4d8d24ad447d00c413cccc28	\N	\N	\N	2026-09-02 01:24:43.616	2026-09-02 01:24:43.616
109545b6-7731-4884-8084-97bbbd2966b9	EV-AUTO-295946-153	Automated Evidence Package: Interstellar Sentinel: Cyber Odyssey - Seat K-14	Automated forensic telemetry bundle captured for session 3af3e292-00dd-4824-8863-95024aa1c864 [Signal: SCREEN_CAPTURE_SIGNAL]	SCREENSHOT_CAPTURE	CRITICAL	VERIFIED	ACTIVE	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	1b9862b0-b208-46d1-bac1-63b967fa1948	\N	7c50b698-97df-4e1f-9e14-ceeb0f17a3a3	\N	AUTOMATED_EVIDENCE_ENGINE	SYSTEM_AUTOMATION	{"packageId":"PKG-1788312295945-503","incidentReference":{"id":"7c50b698-97df-4e1f-9e14-ceeb0f17a3a3","incidentNumber":"INC-2026-0001","title":"[Orchestrated] Anti-Piracy Anomaly: SCREEN_CAPTURE_SIGNAL","severity":"CRITICAL","riskScore":100},"screeningSession":{"sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","activationId":"3af3e292-00dd-4824-8863-95024aa1c864","seatNumber":"K-14","ticketNumber":"TCK-VAL-DEMO-01"},"theatre":{"id":"a77487df-8c55-4c40-8731-f71e418acbae","name":"Grand Palace Laser IMAX Cinema","code":"THTR-VAL-DEMO"},"movie":{"id":"6f2dd033-dad5-4c93-87c3-ac8583bcec94","title":"Interstellar Sentinel: Cyber Odyssey"},"screen":{"name":"Auditorium 1 (Laser IMAX)"},"securityEventTimeline":[{"eventType":"CAMERA_ACTIVITY","timestamp":"2026-09-02T01:24:55.929Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312295928-7460ed"},{"eventType":"WATERMARK_MODULATION_TAMPER","timestamp":"2026-09-02T01:24:55.927Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312295926-05b7c7"},{"eventType":"SCREEN_CAPTURE_SIGNAL","timestamp":"2026-09-02T01:24:55.925Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312295924-2dfc62"},{"eventType":"CAMERA_ACTIVITY","timestamp":"2026-09-02T01:24:43.556Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283556-41eba3"},{"eventType":"WATERMARK_MODULATION_TAMPER","timestamp":"2026-09-02T01:24:43.555Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283554-1767cc"},{"eventType":"SCREEN_CAPTURE_SIGNAL","timestamp":"2026-09-02T01:24:43.553Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312283552-21e396"},{"eventType":"SESSION_HEARTBEAT","timestamp":"2026-09-02T01:24:41.531Z","severity":"LOW","eventId":"EVT-ORCH-1788312281530-bd4f24"},{"eventType":"FULLSCREEN_EXIT","timestamp":"2026-09-02T01:24:37.054Z","severity":"LOW","eventId":"EVT-ORCH-1788312277053-c9e416"}],"riskScore":100,"severity":"CRITICAL","generatedAt":"2026-09-02T01:24:55.946Z"}	0587868fa5e1c5e8c5b48b483c9c6c1d1e0532d98fe9f66f4c2b207f168ce4e5	\N	\N	\N	2026-09-02 01:24:55.948	2026-09-02 01:24:55.948
63c20bcc-0835-4406-8e3c-1569f94cf15b	EV-AUTO-466694-121	Automated Evidence Package: Feature Film - Seat UNBOUND	Automated forensic telemetry bundle captured for session DEMO-SESSION-01 [Signal: CAMERA_ACTIVITY]	PLAYBACK_ANOMALY	CRITICAL	VERIFIED	ACTIVE	\N	\N	\N	\N	\N	45fee760-a95e-4697-ac51-31463dbbd2b9	\N	AUTOMATED_EVIDENCE_ENGINE	SYSTEM_AUTOMATION	{"packageId":"PKG-1788312466694-456","incidentReference":{"id":"45fee760-a95e-4697-ac51-31463dbbd2b9","incidentNumber":"INC-2026-0002","title":"[Orchestrated] Anti-Piracy Anomaly: CAMERA_ACTIVITY","severity":"CRITICAL","riskScore":98},"screeningSession":{"sessionId":"DEMO-SESSION-01","seatNumber":"UNBOUND","ticketNumber":"UNBOUND"},"theatre":{"name":"Auditorium Venue","code":"VEN"},"movie":{"title":"Active Screening Feature"},"screen":{"name":"Auditorium Screen"},"securityEventTimeline":[{"eventType":"CAMERA_ACTIVITY","timestamp":"2026-09-02T01:27:46.671Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312466670-3ab56e"},{"eventType":"FULLSCREEN_EXIT","timestamp":"2026-09-02T01:27:44.958Z","severity":"LOW","eventId":"EVT-ORCH-1788312464957-62ae39"},{"eventType":"SESSION_HEARTBEAT","timestamp":"2026-09-02T01:27:42.200Z","severity":"LOW","eventId":"EVT-ORCH-1788312462199-25e1bf"}],"riskScore":98,"severity":"CRITICAL","generatedAt":"2026-09-02T01:27:46.694Z"}	509af4796e39b2c6ea73532ed37972b4bfa0bab45264780f1e578891bc5a189f	\N	\N	\N	2026-09-02 01:27:46.696	2026-09-02 01:27:46.696
e701295f-ce4a-40c7-b759-6267ece06faf	EV-AUTO-467777-826	Automated Evidence Package: Feature Film - Seat UNBOUND	Automated forensic telemetry bundle captured for session DEMO-SESSION-01 [Signal: SCREEN_CAPTURE_SIGNAL]	SCREENSHOT_CAPTURE	CRITICAL	VERIFIED	ACTIVE	\N	\N	\N	\N	\N	45fee760-a95e-4697-ac51-31463dbbd2b9	\N	AUTOMATED_EVIDENCE_ENGINE	SYSTEM_AUTOMATION	{"packageId":"PKG-1788312467777-713","incidentReference":{"id":"45fee760-a95e-4697-ac51-31463dbbd2b9","incidentNumber":"INC-2026-0002","title":"[Orchestrated] Anti-Piracy Anomaly: CAMERA_ACTIVITY","severity":"CRITICAL","riskScore":100},"screeningSession":{"sessionId":"DEMO-SESSION-01","seatNumber":"UNBOUND","ticketNumber":"UNBOUND"},"theatre":{"name":"Auditorium Venue","code":"VEN"},"movie":{"title":"Active Screening Feature"},"screen":{"name":"Auditorium Screen"},"securityEventTimeline":[{"eventType":"SCREEN_CAPTURE_SIGNAL","timestamp":"2026-09-02T01:27:47.709Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312467708-411dbb"},{"eventType":"CAMERA_ACTIVITY","timestamp":"2026-09-02T01:27:46.671Z","severity":"CRITICAL","eventId":"EVT-ORCH-1788312466670-3ab56e"},{"eventType":"FULLSCREEN_EXIT","timestamp":"2026-09-02T01:27:44.958Z","severity":"LOW","eventId":"EVT-ORCH-1788312464957-62ae39"},{"eventType":"SESSION_HEARTBEAT","timestamp":"2026-09-02T01:27:42.200Z","severity":"LOW","eventId":"EVT-ORCH-1788312462199-25e1bf"}],"riskScore":100,"severity":"CRITICAL","generatedAt":"2026-09-02T01:27:47.777Z"}	ccc5177fb12ee24cffbe5d18570fb766105e2b6207e357d4604cec7c0f5fab19	\N	\N	\N	2026-09-02 01:27:47.779	2026-09-02 01:27:47.779
\.


--
-- Data for Name: ForensicEvidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ForensicEvidence" (id, "incidentId", "evidenceType", "watermarkFingerprint", "playbackSessionId", "activationId", "theatreId", "showId", "seatNumber", "confidenceScore", "evidenceHash", "sourceUrlOrFile", metadata, "detectedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ForensicInvestigationNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ForensicInvestigationNote" (id, "incidentId", "investigatorId", "investigatorEmail", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: GovernanceAuditEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GovernanceAuditEvent" (id, "eventType", severity, "actorId", "actorEmail", "actorRole", "targetType", "targetId", "actionSummary", changes, "correlationId", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: IdempotencyRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IdempotencyRecord" (id, key, path, method, "requestHash", status, "statusCode", "responseBody", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: IncidentAction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IncidentAction" (id, "incidentId", "actionType", "actorId", "targetId", result, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: IncidentEvidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IncidentEvidence" (id, "incidentId", "evidenceType", "referenceId", metadata, hash, "capturedAt") FROM stdin;
\.


--
-- Data for Name: IntelligenceSnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IntelligenceSnapshot" (id, "totalThreats", "criticalThreats", "highThreats", "activeIncidents", "affectedTheatres", "affectedShows", "suspiciousSessions", "averageRiskScore", "generatedAt") FROM stdin;
\.


--
-- Data for Name: InvestigationAssignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationAssignment" (id, "caseId", "analystId", "assignedBy", "assignedAt", notes) FROM stdin;
\.


--
-- Data for Name: InvestigationCase; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationCase" (id, "caseNumber", title, description, status, severity, "threatClassification", "theatreId", "showId", "movieId", "productionCompanyId", "playbackSessionId", "assignedAnalystId", resolution, "closureReason", "closedAt", "createdAt", "updatedAt") FROM stdin;
ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	CASE-2026-0001	Automated Incident Investigation: Interstellar Sentinel: Cyber Odyssey (THTR-VAL-DEMO)	[Auto-Triggered by SCREEN_CAPTURE_SIGNAL] Security signal detected for session 3af3e292-00dd-4824-8863-95024aa1c864. Initial risk score: 100.	OPEN	CRITICAL	SCREEN_RECORDING_ATTEMPT	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	1b9862b0-b208-46d1-bac1-63b967fa1948	\N	\N	\N	\N	\N	2026-09-02 01:24:43.592	2026-09-02 01:24:43.592
ea5672ff-5471-41a7-b78c-e3d53933c364	CASE-2026-0002	Automated Incident Investigation: Screening (VENUE)	[Auto-Triggered by CAMERA_ACTIVITY] Security signal detected for session DEMO-SESSION-01. Initial risk score: 98.	OPEN	CRITICAL	MOBILE_SECURITY_ANOMALY	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-02 01:27:46.683	2026-09-02 01:27:46.683
c368ed01-65be-4e1b-8c22-75178ec3b434	CASE-2026-0003	Automated Incident Investigation: Screening (VENUE)	[Auto-Triggered by SCREEN_CAPTURE_SIGNAL] Security signal detected for session DEMO-SESSION-01. Initial risk score: 100.	OPEN	CRITICAL	SCREEN_RECORDING_ATTEMPT	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-02 01:27:47.747	2026-09-02 01:27:47.747
\.


--
-- Data for Name: InvestigationEvidenceLink; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationEvidenceLink" (id, "caseId", "evidenceRecordId", "linkedBy", "linkedAt", relevance) FROM stdin;
b8887399-fb8c-4e9b-8c73-2496d60e57e1	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	fc063ac6-333d-4f9b-9a18-ecab5621a441	chakaravarthy@gmail.com	2026-09-02 01:24:43.631	Automated forensic package with verified SHA-256 integrity [PKG-1788312283614-664]
3af95d53-0aa5-4b07-b692-224c98c0f8aa	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	109545b6-7731-4884-8084-97bbbd2966b9	chakaravarthy@gmail.com	2026-09-02 01:24:55.954	Automated forensic package with verified SHA-256 integrity [PKG-1788312295945-503]
22c1d565-1cc6-47ac-a1cd-7281479b96a0	ea5672ff-5471-41a7-b78c-e3d53933c364	63c20bcc-0835-4406-8e3c-1569f94cf15b	chakaravarthy@gmail.com	2026-09-02 01:27:46.701	Automated forensic package with verified SHA-256 integrity [PKG-1788312466694-456]
98957c4a-ea75-459f-9ad9-dafa5b5c895f	c368ed01-65be-4e1b-8c22-75178ec3b434	e701295f-ce4a-40c7-b759-6267ece06faf	chakaravarthy@gmail.com	2026-09-02 01:27:47.787	Automated forensic package with verified SHA-256 integrity [PKG-1788312467777-713]
\.


--
-- Data for Name: InvestigationNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationNote" (id, "caseId", "authorId", content, "isInternal", "createdAt") FROM stdin;
\.


--
-- Data for Name: InvestigationStatusHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationStatusHistory" (id, "caseId", "fromStatus", "toStatus", "changedBy", reason, "changedAt") FROM stdin;
cad5cb45-ea86-4b73-9a5a-f00c6b8dfae6	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	OPEN	OPEN	chakaravarthy@gmail.com	Initial case creation [CORR-DEMO-1788312283537-72fdf5]	2026-09-02 01:24:43.605
c9b485a2-9a93-461f-8eec-f64e82318745	ea5672ff-5471-41a7-b78c-e3d53933c364	OPEN	OPEN	chakaravarthy@gmail.com	Initial case creation [CORR-ORCH-1788312466667-b44bba]	2026-09-02 01:27:46.687
1fe77157-09d4-4b61-a5da-890e4fbf217d	c368ed01-65be-4e1b-8c22-75178ec3b434	OPEN	OPEN	chakaravarthy@gmail.com	Initial case creation [CORR-ORCH-1788312467705-bb506f]	2026-09-02 01:27:47.773
\.


--
-- Data for Name: InvestigationTimelineEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvestigationTimelineEvent" (id, "caseId", title, description, "eventType", "actorId", "timestamp") FROM stdin;
4666ee97-78f3-4680-af61-ef88a6a27f15	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Investigation Case Opened	[CORR-DEMO-1788312283537-72fdf5] Case opened by chakaravarthy@gmail.com (ADMIN)	CASE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:43.6
226e7dbc-b994-4167-9e92-31b7976f6b17	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Security Incident Correlated	[CORR-DEMO-1788312283537-72fdf5] Linked to SOC Security Incident INC-2026-0001 ([Orchestrated] Anti-Piracy Anomaly: SCREEN_CAPTURE_SIGNAL)	INCIDENT_LINKED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:43.61
8ef53ef7-61ee-4acb-b560-c6995c1a9fb6	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Evidence Attached	[CORR-DEMO-1788312283537-72fdf5] Evidence EV-AUTO-283614-786 (SCREENSHOT_CAPTURE) attached by chakaravarthy@gmail.com. Integrity: SHA-256 VERIFIED	EVIDENCE_ATTACHED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:43.634
f12201f3-8732-445a-901f-f778650bb090	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Automated Evidence Package Created	[CORR-DEMO-1788312283537-72fdf5] Package EV-AUTO-283614-786 (PKG-1788312283614-664) recorded in Evidence Vault. SHA-256: 221895b18b57f39f...	EVIDENCE_PACKAGE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:43.635
2a420902-d738-495d-bdc9-60aa0066b943	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Enforcement Action Initiated: TAKEDOWN_NOTICE	[CORR-DEMO-1788312283537-72fdf5] Enforcement ENF-2026-1001 created by chakaravarthy@gmail.com (ADMIN). Package: ENF-PKG-[REDACTED_SECRET]-4238.	ENFORCEMENT_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:43.652
bbe00e34-1197-4628-83f3-d4198b43917d	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Enforcement Action APPROVE: ENF-2026-1001	[CORR-APP-1788312290241] TAKEDOWN_NOTICE was approve by chakaravarthy@gmail.com	ENFORCEMENT_APPROVED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:50.243
0baa8e73-9011-42cf-b386-7bd8445b093f	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Correlated Mobile Security Event	[CORR-DEMO-1788312295906-a64d03] Additional SCREEN_CAPTURE_SIGNAL signal recorded for session 3af3e292-00dd-4824-8863-95024aa1c864. Risk Delta: 100.	RISK_UPDATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:55.942
36474de2-0efb-495e-bc09-a75873ecf94f	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Security Incident Correlated	[CORR-DEMO-1788312295906-a64d03] Correlated with SOC Incident INC-2026-0001: [Orchestrated] Anti-Piracy Anomaly: SCREEN_CAPTURE_SIGNAL	INCIDENT_LINKED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:55.944
6d19f724-4b88-44e2-8f67-e51cab4a5224	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Evidence Attached	[CORR-DEMO-1788312295906-a64d03] Evidence EV-AUTO-295946-153 (SCREENSHOT_CAPTURE) attached by chakaravarthy@gmail.com. Integrity: SHA-256 VERIFIED	EVIDENCE_ATTACHED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:55.956
958e5034-29e4-44e2-a4d5-dd36f4996f92	ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5	Automated Evidence Package Created	[CORR-DEMO-1788312295906-a64d03] Package EV-AUTO-295946-153 (PKG-1788312295945-503) recorded in Evidence Vault. SHA-256: 0587868fa5e1c5e8...	EVIDENCE_PACKAGE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:24:55.957
6c501116-c3b4-4d3c-b37e-25d9c253ff4c	ea5672ff-5471-41a7-b78c-e3d53933c364	Investigation Case Opened	[CORR-ORCH-1788312466667-b44bba] Case opened by chakaravarthy@gmail.com (ADMIN)	CASE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:46.686
77de04c7-de9b-4df3-8807-4a3cdbd989c2	ea5672ff-5471-41a7-b78c-e3d53933c364	Security Incident Correlated	[CORR-ORCH-1788312466667-b44bba] Linked to SOC Security Incident INC-2026-0002 ([Orchestrated] Anti-Piracy Anomaly: CAMERA_ACTIVITY)	INCIDENT_LINKED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:46.69
f713b5c5-820a-4381-a86a-d22e9e4d4dbb	ea5672ff-5471-41a7-b78c-e3d53933c364	Evidence Attached	[CORR-ORCH-1788312466667-b44bba] Evidence EV-AUTO-466694-121 (PLAYBACK_ANOMALY) attached by chakaravarthy@gmail.com. Integrity: SHA-256 VERIFIED	EVIDENCE_ATTACHED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:46.703
35edcd8c-727c-4847-b8dd-61c38f0d1c8b	ea5672ff-5471-41a7-b78c-e3d53933c364	Automated Evidence Package Created	[CORR-ORCH-1788312466667-b44bba] Package EV-AUTO-466694-121 (PKG-1788312466694-456) recorded in Evidence Vault. SHA-256: 509af4796e39b2c6...	EVIDENCE_PACKAGE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:46.704
9d3af734-772e-4648-894c-d794b90aea83	ea5672ff-5471-41a7-b78c-e3d53933c364	Enforcement Action Initiated: TAKEDOWN_NOTICE	[CORR-ORCH-1788312466667-b44bba] Enforcement ENF-2026-1002 created by chakaravarthy@gmail.com (ADMIN). Package: ENF-PKG-[REDACTED_SECRET]-4780.	ENFORCEMENT_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:46.712
a0307326-6785-41bf-884c-c9ea857e81a5	c368ed01-65be-4e1b-8c22-75178ec3b434	Investigation Case Opened	[CORR-ORCH-1788312467705-bb506f] Case opened by chakaravarthy@gmail.com (ADMIN)	CASE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:47.77
b43822e4-cf7b-47da-bdf1-b2c4b2551914	c368ed01-65be-4e1b-8c22-75178ec3b434	Security Incident Correlated	[CORR-ORCH-1788312467705-bb506f] Linked to SOC Security Incident INC-2026-0002 ([Orchestrated] Anti-Piracy Anomaly: CAMERA_ACTIVITY)	INCIDENT_LINKED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:47.775
6baddd99-b7f0-4f7c-a599-623dbd9bc748	c368ed01-65be-4e1b-8c22-75178ec3b434	Evidence Attached	[CORR-ORCH-1788312467705-bb506f] Evidence EV-AUTO-467777-826 (SCREENSHOT_CAPTURE) attached by chakaravarthy@gmail.com. Integrity: SHA-256 VERIFIED	EVIDENCE_ATTACHED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:47.789
22b53207-1003-4170-88d2-1f00a9e4deb9	c368ed01-65be-4e1b-8c22-75178ec3b434	Automated Evidence Package Created	[CORR-ORCH-1788312467705-bb506f] Package EV-AUTO-467777-826 (PKG-1788312467777-713) recorded in Evidence Vault. SHA-256: ccc5177fb12ee24c...	EVIDENCE_PACKAGE_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:47.79
ad41a6f8-5c6c-47f4-b303-1a55c46c5729	c368ed01-65be-4e1b-8c22-75178ec3b434	Enforcement Action Initiated: TAKEDOWN_NOTICE	[CORR-ORCH-1788312467705-bb506f] Enforcement ENF-2026-1003 created by chakaravarthy@gmail.com (ADMIN). Package: ENF-PKG-[REDACTED_SECRET]-2550.	ENFORCEMENT_CREATED	64976bb2-036a-452d-9f94-0568cf0e06de	2026-09-02 01:27:47.813
\.


--
-- Data for Name: Movie; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Movie" (id, title, description, synopsis, "durationMinutes", language, rating, "posterUrl", "releaseDate", "contentStatus", "productionCompanyId", "createdAt", "updatedAt") FROM stdin;
6f2dd033-dad5-4c93-87c3-ac8583bcec94	Interstellar Sentinel: Cyber Odyssey	High-profile theatrical release featuring dynamic forensic watermarking and real-time piracy protection.	\N	148	English (Dolby Atmos)	PG-13	\N	\N	PUBLISHED	1b9862b0-b208-46d1-bac1-63b967fa1948	2026-09-01 15:58:52.72	2026-09-01 15:58:52.72
\.


--
-- Data for Name: MovieAuditEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MovieAuditEvent" (id, "movieId", "releaseId", "userId", action, details, "createdAt") FROM stdin;
\.


--
-- Data for Name: MovieRelease; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MovieRelease" (id, "movieId", "productionCompanyId", "theatreId", "screenId", "startDate", "endDate", status, "rejectionReason", "approvedByAdminId", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PiracyIncident; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PiracyIncident" (id, "incidentNumber", title, description, severity, status, "theatreId", "showId", "movieId", "playbackSessionId", "activationId", "riskScore", "assignedInvestigatorId", "mitigationAction", "resolutionNotes", "createdAt", "updatedAt", "closedAt") FROM stdin;
\.


--
-- Data for Name: PlaybackDevice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PlaybackDevice" (id, "deviceId", name, status, "theatreId", "screenId", "softwareVersion", "deviceFingerprint", "ipAddress", "lastHeartbeatAt", "registeredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PlaybackSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PlaybackSession" (id, "sessionToken", "activationId", "videoAssetId", "theatreId", "showId", status, "ipAddress", "userAgent", "authorizedAt", "expiresAt", "terminatedAt", "terminationReason", "lastHeartbeatAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PolicyVersion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PolicyVersion" (id, "policyId", version, "ruleSnapshot", "changeReason", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: PrivilegedActionRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PrivilegedActionRequest" (id, "actionType", "requestedBy", "requesterEmail", "requesterRole", "targetResource", "targetResourceId", reason, "riskLevel", "approvalStatus", "approverId", "approverEmail", "approvalNotes", "approvedAt", "executedAt", "executionToken", "executionResult", "expiresAt", "correlationId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductionCompany; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductionCompany" (id, name, code, "contactEmail", "contactPhone", status, "createdAt", "updatedAt") FROM stdin;
1b9862b0-b208-46d1-bac1-63b967fa1948	Universal Vanguard Pictures	STU-VAL-DEMO	security@universal-vanguard.com	+1-800-555-4920	ACTIVE	2026-09-01 15:58:52.617	2026-09-01 15:58:52.617
\.


--
-- Data for Name: ProtectionEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProtectionEvent" (id, "activationId", "theatreId", "showId", "eventType", metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: RealtimeIncidentNotification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RealtimeIncidentNotification" (id, "incidentId", "notificationType", severity, message, "theatreId", "showId", "movieId", "isRead", "sentAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: RealtimeThreatEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RealtimeThreatEvent" (id, "correlationId", "eventId", "eventType", source, severity, "theatreId", "showId", "movieId", "activationId", "playbackSessionId", metadata, "createdAt") FROM stdin;
aacfb947-4853-4226-b3d9-0184db533ce7	CORR-DEMO-1788312277035-109249	EVT-ORCH-1788312277053-c9e416	FULLSCREEN_EXIT	PIRACY_ORCHESTRATOR	LOW	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"FULLSCREEN_EXIT","severity":"LOW","riskScore":20,"timestamp":"2026-09-02T01:24:37.053Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312277048-755cae6d","compositeRiskScore":27}	2026-09-02 01:24:37.054
47bc1fa5-d49c-477a-82f4-5750c453fb20	CORR-DEMO-1788312281515-4f39ba	EVT-ORCH-1788312281530-bd4f24	SESSION_HEARTBEAT	PIRACY_ORCHESTRATOR	LOW	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"SESSION_HEARTBEAT","severity":"INFO","riskScore":5,"timestamp":"2026-09-02T01:24:41.530Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312281526-1254adac","compositeRiskScore":12}	2026-09-02 01:24:41.531
89236dc4-f6d5-4a0b-b80a-1d1f91bf7a64	CORR-DEMO-1788312283537-72fdf5	EVT-ORCH-1788312283552-21e396	SCREEN_CAPTURE_SIGNAL	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"SCREEN_CAPTURE_SIGNAL","severity":"HIGH","riskScore":75,"timestamp":"2026-09-02T01:24:43.552Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312283548-6b250976","compositeRiskScore":100}	2026-09-02 01:24:43.553
f56df4e9-3055-4dae-b3ec-f0a26429def6	CORR-DEMO-1788312283537-72fdf5	EVT-ORCH-1788312283554-1767cc	WATERMARK_MODULATION_TAMPER	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"WATERMARK_MODULATION_TAMPER","severity":"CRITICAL","riskScore":80,"timestamp":"2026-09-02T01:24:43.552Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312283548-6b250976","compositeRiskScore":100}	2026-09-02 01:24:43.555
f36f59d7-36cd-42c1-9875-194b69bf6ef2	CORR-DEMO-1788312283537-72fdf5	EVT-ORCH-1788312283556-41eba3	CAMERA_ACTIVITY	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"CAMERA_ACTIVITY","severity":"HIGH","riskScore":65,"timestamp":"2026-09-02T01:24:43.552Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312283548-6b250976","compositeRiskScore":100}	2026-09-02 01:24:43.556
a6da6b12-cd55-4614-b516-dac51e212dfb	CORR-DEMO-1788312295906-a64d03	EVT-ORCH-1788312295924-2dfc62	SCREEN_CAPTURE_SIGNAL	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"SCREEN_CAPTURE_SIGNAL","severity":"HIGH","riskScore":75,"timestamp":"2026-09-02T01:24:55.924Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312295919-7d988e43","compositeRiskScore":100}	2026-09-02 01:24:55.925
b79d35eb-52b8-492d-b4ea-95b76727f76d	CORR-DEMO-1788312295906-a64d03	EVT-ORCH-1788312295926-05b7c7	WATERMARK_MODULATION_TAMPER	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"WATERMARK_MODULATION_TAMPER","severity":"CRITICAL","riskScore":80,"timestamp":"2026-09-02T01:24:55.924Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312295919-7d988e43","compositeRiskScore":100}	2026-09-02 01:24:55.927
4e2b6f22-f3cb-4b3e-a3d7-91b7f2e6eed8	CORR-DEMO-1788312295906-a64d03	EVT-ORCH-1788312295928-7460ed	CAMERA_ACTIVITY	PIRACY_ORCHESTRATOR	CRITICAL	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"CAMERA_ACTIVITY","severity":"HIGH","riskScore":65,"timestamp":"2026-09-02T01:24:55.924Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312295919-7d988e43","compositeRiskScore":100}	2026-09-02 01:24:55.929
1cce1ba5-b7c2-4d5c-8acd-7f9a9cdf476e	CORR-DEMO-1788312300041-b9a079	EVT-ORCH-1788312300072-b3dc0d	FULLSCREEN_EXIT	PIRACY_ORCHESTRATOR	MEDIUM	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"FULLSCREEN_EXIT","severity":"LOW","riskScore":20,"timestamp":"2026-09-02T01:25:00.072Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312300051-b18a559d","compositeRiskScore":52}	2026-09-02 01:25:00.073
674aa83a-9102-4501-add0-46708c0794db	CORR-DEMO-1788312302617-4cea04	EVT-ORCH-1788312302634-93e180	FULLSCREEN_EXIT	PIRACY_ORCHESTRATOR	MEDIUM	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"FULLSCREEN_EXIT","severity":"LOW","riskScore":20,"timestamp":"2026-09-02T01:25:02.634Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312302629-8f57dcf5","compositeRiskScore":52}	2026-09-02 01:25:02.635
b33e0af9-88dd-44a7-9b82-62d0ba23e8a8	CORR-DEMO-1788312455092-bc54b8	EVT-ORCH-1788312455109-586367	SESSION_HEARTBEAT	PIRACY_ORCHESTRATOR	LOW	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	3af3e292-00dd-4824-8863-95024aa1c864	\N	{"signalType":"SESSION_HEARTBEAT","severity":"INFO","riskScore":5,"timestamp":"2026-09-02T01:27:35.109Z","sessionId":"3af3e292-00dd-4824-8863-95024aa1c864","orchestrationId":"ORCH-1788312455104-58907b2b","compositeRiskScore":32}	2026-09-02 01:27:35.11
4617aad2-1828-446b-ad4f-02d6a3e50195	CORR-ORCH-1788312462183-27b597	EVT-ORCH-1788312462199-25e1bf	SESSION_HEARTBEAT	PIRACY_ORCHESTRATOR	LOW	\N	\N	\N	\N	\N	{"signalType":"SESSION_HEARTBEAT","severity":"INFO","riskScore":5,"timestamp":"2026-09-02T01:27:42.199Z","sessionId":"DEMO-SESSION-01","orchestrationId":"ORCH-1788312462183-e59a0311","compositeRiskScore":7}	2026-09-02 01:27:42.2
df819f2f-4fe8-4a2b-8db0-203c68f06cab	CORR-ORCH-1788312464953-6f36af	EVT-ORCH-1788312464957-62ae39	FULLSCREEN_EXIT	PIRACY_ORCHESTRATOR	LOW	\N	\N	\N	\N	\N	{"signalType":"FULLSCREEN_EXIT","severity":"LOW","riskScore":20,"timestamp":"2026-09-02T01:27:44.957Z","sessionId":"DEMO-SESSION-01","orchestrationId":"ORCH-1788312464953-8d8727d6","compositeRiskScore":32}	2026-09-02 01:27:44.958
beb8137d-5bbe-41d5-9733-c9ebbcf89cc2	CORR-ORCH-1788312466667-b44bba	EVT-ORCH-1788312466670-3ab56e	CAMERA_ACTIVITY	PIRACY_ORCHESTRATOR	CRITICAL	\N	\N	\N	\N	\N	{"signalType":"CAMERA_ACTIVITY","severity":"HIGH","riskScore":65,"timestamp":"2026-09-02T01:27:46.670Z","sessionId":"DEMO-SESSION-01","orchestrationId":"ORCH-1788312466667-22be5ded","compositeRiskScore":98}	2026-09-02 01:27:46.671
237abc7d-be3a-4b72-8046-397e7ccdf007	CORR-ORCH-1788312467705-bb506f	EVT-ORCH-1788312467708-411dbb	SCREEN_CAPTURE_SIGNAL	PIRACY_ORCHESTRATOR	CRITICAL	\N	\N	\N	\N	\N	{"signalType":"SCREEN_CAPTURE_SIGNAL","severity":"CRITICAL","riskScore":75,"timestamp":"2026-09-02T01:27:47.708Z","sessionId":"DEMO-SESSION-01","orchestrationId":"ORCH-1788312467705-7a0db015","compositeRiskScore":100}	2026-09-02 01:27:47.709
\.


--
-- Data for Name: RevokedToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RevokedToken" (id, "tokenHash", "userId", "revokedAt", "expiresAt", reason) FROM stdin;
\.


--
-- Data for Name: RiskHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RiskHistory" (id, "entityType", "entityId", "previousScore", "newScore", reason, "correlationId", "calculatedAt") FROM stdin;
\.


--
-- Data for Name: Screen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Screen" (id, "theatreId", "screenNumber", name, capacity, "createdAt", "updatedAt") FROM stdin;
e494ad07-1b9b-475f-a649-c5875944031c	a77487df-8c55-4c40-8731-f71e418acbae	1	Auditorium 1 (Laser IMAX)	350	2026-09-01 15:58:52.647	2026-09-01 15:58:52.647
\.


--
-- Data for Name: SecurityAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityAuditLog" (id, "eventType", severity, "userId", "actorEmail", "actorRole", "theatreId", "showId", "activationId", "ticketId", "ipAddress", "userAgent", "deviceFingerprint", endpoint, "actionSummary", metadata, "isThreat", "threatDetails", "createdAt") FROM stdin;
7af79387-3490-41a8-971f-0c4025c6b084	LOGIN_SUCCESS	INFO	admin-default-id	admin@theatre.com	ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Admin account logged in successfully from ::1	\N	f	\N	2026-09-01 15:57:41.091
5b2160ce-27d0-4d9e-b0eb-2b8b21d97d2d	SUSPICIOUS_ACTIVITY	HIGH	admin-default-id	admin@theatre.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Admin admin@theatre.com ENABLED Maintenance Mode: Scheduled maintenance in progress	\N	f	\N	2026-09-01 16:00:19.69
38f35c2d-26f2-4db6-9d7b-dd674650dc21	SUSPICIOUS_ACTIVITY	INFO	admin-default-id	admin@theatre.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Admin admin@theatre.com DISABLED Maintenance Mode	\N	f	\N	2026-09-01 16:00:27.443
2995be01-dc15-4368-8ea2-c1f2f7772b99	SUSPICIOUS_ACTIVITY	INFO	admin-default-id	admin@theatre.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Database backup bkp_1788278430725_1a1a3a1c completed successfully (10 records, 5.7 KB, SHA256: d33433c12dab...)	\N	f	\N	2026-09-01 16:00:30.74
94ef7918-4375-4ea2-8e0c-a1712eb721ba	SUSPICIOUS_ACTIVITY	INFO	admin-default-id	admin@theatre.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Database backup bkp_1788278432586_e0f247c6 completed successfully (11 records, 6.4 KB, SHA256: b92ed0c951c8...)	\N	f	\N	2026-09-01 16:00:37.011
0dd59a4e-dac4-479d-af81-c23c7d9d8280	LOGIN_FAILED	MEDIUM	\N	mnavaneeth321@gmail.com	\N	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Failed login attempt for mnavaneeth321@gmail.com from ::1	\N	f	\N	2026-09-01 16:06:26.06
facca1d0-19d0-4665-b1c4-9afcdc13bbca	LOGIN_SUCCESS	INFO	258f38bb-691b-484c-82b1-97ca7ed430d9	newuser_test@theatre.com	THEATRE_ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-IN) WindowsPowerShell/5.1.26100.9168	\N	\N	User newuser_test@theatre.com (THEATRE_ADMIN) authenticated successfully	\N	f	\N	2026-09-01 16:41:53.754
62047bfa-a598-46d0-afba-803b54217226	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: USER_WARNING_ONLY (Risk: 27)	{"orchestrationId":"ORCH-1788312277048-755cae6d","correlationId":"CORR-DEMO-1788312277035-109249","compositeRiskScore":27,"escalationDecision":"USER_WARNING_ONLY"}	f	\N	2026-09-02 01:24:37.06
9f5dba0c-a95e-494e-a1c2-19941de16457	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: NO_ESCALATION (Risk: 12)	{"orchestrationId":"ORCH-1788312281526-1254adac","correlationId":"CORR-DEMO-1788312281515-4f39ba","compositeRiskScore":12,"escalationDecision":"NO_ESCALATION"}	f	\N	2026-09-02 01:24:41.532
d2752022-772a-4faf-99fa-bf502f364498	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	\N	\N	\N	\N	\N	\N	Investigation case CASE-2026-0001 opened: Automated Incident Investigation: Interstellar Sentinel: Cyber Odyssey (THTR-VAL-DEMO)	{"caseId":"ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5","caseNumber":"CASE-2026-0001","correlationId":"CORR-DEMO-1788312283537-72fdf5","severity":"CRITICAL"}	f	\N	2026-09-02 01:24:43.612
aa5fa6d0-bb1a-4133-b377-2d1461d139f3	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	\N	\N	\N	\N	\N	\N	\N	Enforcement Action ENF-2026-1001 created for Case CASE-2026-0001: [Orchestrated Draft] Legal & Takedown Action: Interstellar Sentinel: Cyber Odyssey (THTR-VAL-DEMO)	{"enforcementId":"enf-1788312283636-262","enforcementNumber":"ENF-2026-1001","caseId":"ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5","caseNumber":"CASE-2026-0001","actionType":"TAKEDOWN_NOTICE","correlationId":"CORR-DEMO-1788312283537-72fdf5","packageHash":"8e968fb418f531f2a1ca991b76b4c29b21f677238dd8bf565ab2d9dedf788c23"}	f	\N	2026-09-02 01:24:43.653
32bc414e-4d01-4641-9823-9ba4e9726636	SUSPICIOUS_ACTIVITY	HIGH	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: SOC_INCIDENT_ESCALATION (Risk: 100)	{"orchestrationId":"ORCH-1788312283548-6b250976","correlationId":"CORR-DEMO-1788312283537-72fdf5","compositeRiskScore":100,"escalationDecision":"SOC_INCIDENT_ESCALATION","incidentId":"7c50b698-97df-4e1f-9e14-ceeb0f17a3a3","caseId":"ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5","evidenceId":"fc063ac6-333d-4f9b-9a18-ecab5621a441","enforcementId":"enf-1788312283636-262"}	t	\N	2026-09-02 01:24:43.655
4229e403-33f4-42b5-9437-29049be822e9	SUSPICIOUS_ACTIVITY	HIGH	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	\N	\N	\N	\N	\N	\N	\N	Enforcement Action ENF-2026-1001 APPROVE by chakaravarthy@gmail.com (ADMIN)	{"enforcementId":"enf-1788312283636-262","enforcementNumber":"ENF-2026-1001","decision":"APPROVE","notes":"Human authorized via Phase 30 End-to-End Demo Control Panel","correlationId":"CORR-APP-1788312290241","approvedAt":"2026-09-02T01:24:50.241Z"}	f	\N	2026-09-02 01:24:50.242
916330a4-9fe0-4182-9512-4d12652869f1	SUSPICIOUS_ACTIVITY	HIGH	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: SOC_INCIDENT_ESCALATION (Risk: 100)	{"orchestrationId":"ORCH-1788312295919-7d988e43","correlationId":"CORR-DEMO-1788312295906-a64d03","compositeRiskScore":100,"escalationDecision":"SOC_INCIDENT_ESCALATION","incidentId":"7c50b698-97df-4e1f-9e14-ceeb0f17a3a3","caseId":"ea5f1d42-f69a-4c0b-9336-a0b88ec9a7b5","evidenceId":"109545b6-7731-4884-8084-97bbbd2966b9","enforcementId":"enf-1788312283636-262"}	t	\N	2026-09-02 01:24:55.96
66e36549-19ad-4364-af43-985b429645fc	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: USER_WARNING_ONLY (Risk: 52)	{"orchestrationId":"ORCH-1788312300051-b18a559d","correlationId":"CORR-DEMO-1788312300041-b9a079","compositeRiskScore":52,"escalationDecision":"USER_WARNING_ONLY"}	f	\N	2026-09-02 01:25:00.075
26262b4d-2805-46b4-96fd-fd3fa047bdbb	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: USER_WARNING_ONLY (Risk: 52)	{"orchestrationId":"ORCH-1788312302629-8f57dcf5","correlationId":"CORR-DEMO-1788312302617-4cea04","compositeRiskScore":52,"escalationDecision":"USER_WARNING_ONLY"}	f	\N	2026-09-02 01:25:02.637
e4a98ff4-d7ec-4241-8bf1-c78e6b22c71d	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	3af3e292-00dd-4824-8863-95024aa1c864	d5005a03-97cb-4e2c-a004-e01bcc62be78	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session 3af3e292-00dd-4824-8863-95024aa1c864 - Status: USER_WARNING_ONLY (Risk: 32)	{"orchestrationId":"ORCH-1788312455104-58907b2b","correlationId":"CORR-DEMO-1788312455092-bc54b8","compositeRiskScore":32,"escalationDecision":"USER_WARNING_ONLY"}	f	\N	2026-09-02 01:27:35.112
5ee171f6-1e5c-474a-8a7b-0315b9efefbc	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session DEMO-SESSION-01 - Status: NO_ESCALATION (Risk: 7)	{"orchestrationId":"ORCH-1788312462183-e59a0311","correlationId":"CORR-ORCH-1788312462183-27b597","compositeRiskScore":7,"escalationDecision":"NO_ESCALATION"}	f	\N	2026-09-02 01:27:42.201
8f6d3908-95e1-4537-b664-2a5e4e75ebfc	SUSPICIOUS_ACTIVITY	LOW	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session DEMO-SESSION-01 - Status: USER_WARNING_ONLY (Risk: 32)	{"orchestrationId":"ORCH-1788312464953-8d8727d6","correlationId":"CORR-ORCH-1788312464953-6f36af","compositeRiskScore":32,"escalationDecision":"USER_WARNING_ONLY"}	f	\N	2026-09-02 01:27:44.959
40f0cd66-a6cc-4cca-b648-0f6c2ddae717	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Investigation case CASE-2026-0002 opened: Automated Incident Investigation: Screening (VENUE)	{"caseId":"ea5672ff-5471-41a7-b78c-e3d53933c364","caseNumber":"CASE-2026-0002","correlationId":"CORR-ORCH-1788312466667-b44bba","severity":"CRITICAL"}	f	\N	2026-09-02 01:27:46.692
4f330167-48b5-43e4-ba2c-026ddbff1288	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Enforcement Action ENF-2026-1002 created for Case CASE-2026-0002: [Orchestrated Draft] Legal & Takedown Action: Feature (VENUE)	{"enforcementId":"enf-1788312466705-773","enforcementNumber":"ENF-2026-1002","caseId":"ea5672ff-5471-41a7-b78c-e3d53933c364","caseNumber":"CASE-2026-0002","actionType":"TAKEDOWN_NOTICE","correlationId":"CORR-ORCH-1788312466667-b44bba","packageHash":"1a9663309085cd2b23fc953db152e84afb68eb238ae98864346e1d3bbe41418d"}	f	\N	2026-09-02 01:27:46.713
603bfc92-34ad-42a1-8172-b74ad55acd63	SUSPICIOUS_ACTIVITY	HIGH	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session DEMO-SESSION-01 - Status: SOC_INCIDENT_ESCALATION (Risk: 98)	{"orchestrationId":"ORCH-1788312466667-22be5ded","correlationId":"CORR-ORCH-1788312466667-b44bba","compositeRiskScore":98,"escalationDecision":"SOC_INCIDENT_ESCALATION","incidentId":"45fee760-a95e-4697-ac51-31463dbbd2b9","caseId":"ea5672ff-5471-41a7-b78c-e3d53933c364","evidenceId":"63c20bcc-0835-4406-8e3c-1569f94cf15b","enforcementId":"enf-1788312466705-773"}	t	\N	2026-09-02 01:27:46.714
c491c15e-52e9-458d-98ba-898a2ef824b4	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Investigation case CASE-2026-0003 opened: Automated Incident Investigation: Screening (VENUE)	{"caseId":"c368ed01-65be-4e1b-8c22-75178ec3b434","caseNumber":"CASE-2026-0003","correlationId":"CORR-ORCH-1788312467705-bb506f","severity":"CRITICAL"}	f	\N	2026-09-02 01:27:47.776
2e0dcf1d-ba7c-4b89-bf98-516622288eb2	SUSPICIOUS_ACTIVITY	CRITICAL	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	\N	\N	\N	\N	Enforcement Action ENF-2026-1003 created for Case CASE-2026-0003: [Orchestrated Draft] Legal & Takedown Action: Feature (VENUE)	{"enforcementId":"enf-1788312467797-257","enforcementNumber":"ENF-2026-1003","caseId":"c368ed01-65be-4e1b-8c22-75178ec3b434","caseNumber":"CASE-2026-0003","actionType":"TAKEDOWN_NOTICE","correlationId":"CORR-ORCH-1788312467705-bb506f","packageHash":"04117dcefbbab7e922d8c0f6a30a7b51f82f691154023f87b3294d9767da733e"}	f	\N	2026-09-02 01:27:47.817
43cf8738-35a8-4225-a24a-83f3f1d73f39	SUSPICIOUS_ACTIVITY	HIGH	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0	\N	\N	Orchestration executed for session DEMO-SESSION-01 - Status: SOC_INCIDENT_ESCALATION (Risk: 100)	{"orchestrationId":"ORCH-1788312467705-7a0db015","correlationId":"CORR-ORCH-1788312467705-bb506f","compositeRiskScore":100,"escalationDecision":"SOC_INCIDENT_ESCALATION","incidentId":"45fee760-a95e-4697-ac51-31463dbbd2b9","caseId":"c368ed01-65be-4e1b-8c22-75178ec3b434","evidenceId":"e701295f-ce4a-40c7-b759-6267ece06faf","enforcementId":"enf-1788312467797-257"}	t	\N	2026-09-02 01:27:47.819
\.


--
-- Data for Name: SecurityEscalation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityEscalation" (id, "incidentId", "fromSeverity", "toSeverity", "fromRisk", "toRisk", reason, "triggeredBy", "policyId", "correlationId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SecurityIncident; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityIncident" (id, "incidentNumber", title, description, severity, status, source, "assignedToId", "theatreId", "showId", "movieId", "activationId", "playbackSessionId", "investigationCaseId", "evidenceRecordId", "threatIntelIndicatorId", "riskScore", "detectedAt", "acknowledgedAt", "resolvedAt", "resolutionNotes", "createdAt", "updatedAt") FROM stdin;
7c50b698-97df-4e1f-9e14-ceeb0f17a3a3	INC-2026-0001	[Orchestrated] Anti-Piracy Anomaly: SCREEN_CAPTURE_SIGNAL	Orchestrated piracy detection for session 3af3e292-00dd-4824-8863-95024aa1c864. Signals: SCREEN_CAPTURE_SIGNAL, WATERMARK_MODULATION_TAMPER, CAMERA_ACTIVITY. Composite Risk: 100/100.	CRITICAL	DETECTED	THREAT_ENGINE	\N	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	6f2dd033-dad5-4c93-87c3-ac8583bcec94	\N	\N	\N	\N	\N	100	2026-09-02 01:24:43.561	\N	\N	\N	2026-09-02 01:24:43.561	2026-09-02 01:24:43.561
45fee760-a95e-4697-ac51-31463dbbd2b9	INC-2026-0002	[Orchestrated] Anti-Piracy Anomaly: CAMERA_ACTIVITY	Orchestrated piracy detection for session DEMO-SESSION-01. Signals: CAMERA_ACTIVITY. Composite Risk: 98/100.	CRITICAL	DETECTED	THREAT_ENGINE	\N	\N	\N	\N	\N	\N	\N	\N	\N	100	2026-09-02 01:27:46.674	\N	\N	\N	2026-09-02 01:27:46.674	2026-09-02 01:27:47.739
\.


--
-- Data for Name: SecurityIncidentTimeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityIncidentTimeline" (id, "incidentId", "eventType", description, "actorId", "actorEmail", "actorRole", "previousStatus", "newStatus", metadata, "timestamp") FROM stdin;
efae5f5b-dbed-4e8a-9f3b-e56394920a16	7c50b698-97df-4e1f-9e14-ceeb0f17a3a3	STATUS_CHANGE	Incident detected and logged as INC-2026-0001 (CRITICAL, risk: 100/100)	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	DETECTED	\N	2026-09-02 01:24:43.565
de3218ed-fa6b-4e1c-b611-6a6b08dfec12	45fee760-a95e-4697-ac51-31463dbbd2b9	STATUS_CHANGE	Incident detected and logged as INC-2026-0002 (CRITICAL, risk: 98/100)	64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	ADMIN	\N	DETECTED	\N	2026-09-02 01:27:46.675
\.


--
-- Data for Name: SecurityNotification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityNotification" (id, category, severity, title, message, "targetRole", "targetUserId", "theatreId", "productionCompanyId", "isRead", "isMuted", "deduplicationKey", "correlationId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SecurityPolicy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityPolicy" (id, name, description, "policyType", "isEnabled", priority, version, rules, "tenantType", "tenantId", "effectiveAt", "expiresAt", "createdBy", "updatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SecurityWorkflow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityWorkflow" (id, name, description, "triggerType", "triggerCondition", "actionType", "actionPayload", "isEnabled", priority, "tenantType", "tenantId", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SecurityWorkflowExecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityWorkflowExecution" (id, "workflowId", "triggerEvent", decision, "actionTaken", status, result, "actorId", "actorEmail", "correlationId", "executedAt") FROM stdin;
\.


--
-- Data for Name: Show; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Show" (id, "theatreId", "screenId", "movieId", "startTime", "endTime", status, "createdAt", "updatedAt") FROM stdin;
f9d283e3-25ed-4907-94f3-9979b85858de	a77487df-8c55-4c40-8731-f71e418acbae	e494ad07-1b9b-475f-a649-c5875944031c	6f2dd033-dad5-4c93-87c3-ac8583bcec94	2026-09-02 00:59:33.306	2026-09-02 03:29:33.306	ACTIVE	2026-09-01 15:58:52.733	2026-09-02 01:24:33.321
\.


--
-- Data for Name: Theatre; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Theatre" (id, name, code, "permanentQrCode", location, address, "contactEmail", "contactPhone", "createdAt", "updatedAt") FROM stdin;
a77487df-8c55-4c40-8731-f71e418acbae	Grand Palace Laser IMAX Cinema	THTR-VAL-DEMO	\N	San Francisco, CA	100 Digital Rights Plaza, SF, CA 94103	soc-admin@grandpalace.cinema	\N	2026-09-01 15:58:52.624	2026-09-01 15:58:52.624
\.


--
-- Data for Name: ThreatAlert; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatAlert" (id, "alertType", severity, "riskScore", "theatreId", "showId", "activationId", "playbackSessionId", description, status, "detectedAt", "resolvedAt") FROM stdin;
\.


--
-- Data for Name: ThreatCorrelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatCorrelation" (id, "incidentId", "sourceEventId", "sourceType", "correlationType", "correlationScore", "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelAction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelAction" (id, "actionType", "indicatorId", "campaignId", "actorId", "actorEmail", "actorRole", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelCampaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelCampaign" (id, "campaignIdentifier", name, description, "threatClassification", "riskLevel", confidence, status, "theatreId", "movieId", "productionCompanyId", "investigationCaseId", "evidenceRecordId", "firstObservedAt", "lastObservedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelFeed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelFeed" (id, "sourceId", "feedName", "feedUrl", "feedFormat", "isActive", "lastPolledAt", "pollIntervalSec", "totalRecordsIngested", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelImport; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelImport" (id, "sourceId", "importFormat", "fileName", "totalRecords", "importedCount", "duplicateCount", "rejectedCount", status, "errorMessage", "importedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelIndicator; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelIndicator" (id, "sourceId", "indicatorType", value, "rawValue", "confidenceScore", "confidenceLevel", status, "threatClassification", description, tags, "firstSeen", "lastSeen", "expiresAt", "isAnalystValidated", "validatedBy", "validatedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelMatch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelMatch" (id, "indicatorId", "campaignId", "correlationType", "correlationDetails", confidence, "theatreId", "movieId", "playbackSessionId", "investigationCaseId", "evidenceRecordId", "securityAuditLogId", "matchedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelObservation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelObservation" (id, "indicatorId", "sightingSource", "contextTelemetry", "timestamp") FROM stdin;
\.


--
-- Data for Name: ThreatIntelRelationship; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelRelationship" (id, "sourceIndicatorId", "targetIndicatorId", "relationshipType", confidence, "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelSource; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelSource" (id, name, "providerType", description, "trustLevel", "defaultConfidence", "isEnabled", "authConfigReference", "webhookSecretHash", "lastSyncSuccessAt", "lastSyncFailureAt", "lastFailureReason", "syncFrequencyMinutes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelSourceHealth; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelSourceHealth" (id, "sourceId", status, "responseLatencyMs", "lastHttpCode", "recordsIngested", "errorMessage", "checkedAt") FROM stdin;
\.


--
-- Data for Name: ThreatIntelligenceIncident; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatIntelligenceIncident" (id, "incidentCode", title, description, severity, "riskScore", "confidenceScore", status, source, "theatreId", "showId", "activationId", "playbackSessionId", "firstDetectedAt", "lastDetectedAt", "resolvedAt", "assignedTo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatInvestigationLink; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatInvestigationLink" (id, "predictionId", "patternId", "incidentId", "investigationId", "forensicEvidenceId", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatPattern; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatPattern" (id, "patternType", name, description, severity, confidence, "occurrenceCount", "theatreId", "showId", "movieId", evidence, status, "firstDetectedAt", "lastDetectedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ThreatPrediction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatPrediction" (id, "theatreId", "showId", "movieId", "predictionType", "predictedRisk", confidence, explanation, "recommendedAction", "predictionWindow", "createdAt") FROM stdin;
\.


--
-- Data for Name: ThreatRiskScore; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatRiskScore" (id, "entityType", "entityId", "riskScore", "riskLevel", confidence, "contributingSignals", recommendation, "calculatedAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: ThreatSignal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ThreatSignal" (id, "incidentId", "patternId", "signalType", "signalValue", "eventType", source, "riskWeight", weight, confidence, metadata, "detectedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, "ticketNumber", "showId", "seatNumber", price, status, "createdAt", "updatedAt") FROM stdin;
d5005a03-97cb-4e2c-a004-e01bcc62be78	TCK-VAL-DEMO-01	f9d283e3-25ed-4907-94f3-9979b85858de	K-14	24.50	ISSUED	2026-09-01 15:58:53.045	2026-09-01 15:58:53.045
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, "passwordHash", name, role, "theatreId", "productionCompanyId", "createdAt", "updatedAt") FROM stdin;
e7d5ee4d-7cdb-4ace-851b-d34828b061bb	demo.admin@antipiracy.system	$2a$10$demo.hash.protected.validation.password	Chief Security Officer	ADMIN	\N	\N	2026-09-01 15:58:52.802	2026-09-01 15:58:52.802
b53e0aac-4785-459c-927f-4bb84aa4fd62	demo.staff@grandpalace.cinema	$2a$10$demo.hash.protected.validation.password	Security Gate Attendant	THEATRE_STAFF	a77487df-8c55-4c40-8731-f71e418acbae	\N	2026-09-01 15:58:52.909	2026-09-01 15:58:52.909
d47df149-8578-4c8e-8cd6-837002c5fd39	admin@theatre.com	demo-hash-protected	Super Administrator	ADMIN	\N	\N	2026-09-01 16:00:54.158	2026-09-01 16:00:54.158
64976bb2-036a-452d-9f94-0568cf0e06de	chakaravarthy@gmail.com	$2b$10$sIOGV0jYCgSc3rhPXMMS7.wuBxjIu.ZukApFPKVOrV3jZDFzCIJuy	Vibin chakaravarthy	ADMIN	\N	\N	2026-09-02 01:24:21.017	2026-09-02 01:24:21.017
\.


--
-- Data for Name: Verification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Verification" (id, "activationId", "theatreId", "showId", "staffId", result, reason, "scannedCode", "createdAt") FROM stdin;
09da1f81-efd4-4a63-a651-4e881ac82ea0	\N	\N	\N	d47df149-8578-4c8e-8cd6-837002c5fd39	DENIED	Invalid activation	invalid-corrupted-token-test	2026-09-01 16:00:54.164
cc4ce890-bc7d-440a-8bb7-6f38210ee13c	3af3e292-00dd-4824-8863-95024aa1c864	a77487df-8c55-4c40-8731-f71e418acbae	f9d283e3-25ed-4907-94f3-9979b85858de	d47df149-8578-4c8e-8cd6-837002c5fd39	DENIED	Invalid activation	ACT-VAL-DEMO-01	2026-09-01 16:00:54.869
c1b404ff-6714-4c2f-931a-7cdd3040db7d	\N	\N	\N	d47df149-8578-4c8e-8cd6-837002c5fd39	DENIED	Invalid activation	invalid-corrupted-token-test	2026-09-01 16:01:06.638
acc27bcf-af05-46c2-b72e-6aa5bb4b8c76	\N	\N	\N	d47df149-8578-4c8e-8cd6-837002c5fd39	DENIED	Invalid activation	bkp_1788278430725_1a1a3a1c	2026-09-01 16:01:09.918
443f7c37-615f-43ad-8bee-dda74ecd7a85	\N	\N	\N	d47df149-8578-4c8e-8cd6-837002c5fd39	DENIED	Invalid activation	bkp_1788278430725_1a1a3a1c	2026-09-01 16:01:17.636
\.


--
-- Data for Name: VideoAsset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoAsset" (id, title, "movieId", "contentAssetId", "productionCompanyId", state, "processingStatus", "processingProgress", "processingError", "processingLogs", "sourceFilePath", "originalFilename", "fileSizeMb", "mimeType", resolution, "durationSeconds", "videoCodec", "audioCodec", "streamKey", "deliveryManifestUrl", "hlsMasterManifestPath", "thumbnailPath", "drmScheme", bitrates, "processingStartedAt", "processingCompletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _CampaignIndicators; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_CampaignIndicators" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
a1b2c3d4-0000-4000-8000-000000000001	054a11f3a036a3300951af44f60600685661f4c36e77ccf7e76d0c9df8c8c01e	2026-09-02 07:15:38.228524+05:30	20260902000000_init	\N	\N	2026-09-02 07:13:23.789731+05:30	1
\.


--
-- Name: AccessDecision AccessDecision_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AccessDecision"
    ADD CONSTRAINT "AccessDecision_pkey" PRIMARY KEY (id);


--
-- Name: Activation Activation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Activation"
    ADD CONSTRAINT "Activation_pkey" PRIMARY KEY (id);


--
-- Name: AutomatedResponseAction AutomatedResponseAction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutomatedResponseAction"
    ADD CONSTRAINT "AutomatedResponseAction_pkey" PRIMARY KEY (id);


--
-- Name: AutomatedResponse AutomatedResponse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutomatedResponse"
    ADD CONSTRAINT "AutomatedResponse_pkey" PRIMARY KEY (id);


--
-- Name: BreakGlassSession BreakGlassSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BreakGlassSession"
    ADD CONSTRAINT "BreakGlassSession_pkey" PRIMARY KEY (id);


--
-- Name: ContentAsset ContentAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentAsset"
    ADD CONSTRAINT "ContentAsset_pkey" PRIMARY KEY (id);


--
-- Name: DeviceTrustRecord DeviceTrustRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DeviceTrustRecord"
    ADD CONSTRAINT "DeviceTrustRecord_pkey" PRIMARY KEY (id);


--
-- Name: DrmAsset DrmAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmAsset"
    ADD CONSTRAINT "DrmAsset_pkey" PRIMARY KEY (id);


--
-- Name: DrmLicense DrmLicense_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceAccessLog EvidenceAccessLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceAccessLog"
    ADD CONSTRAINT "EvidenceAccessLog_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceArtifact EvidenceArtifact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceArtifact"
    ADD CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceChainEvent EvidenceChainEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceChainEvent"
    ADD CONSTRAINT "EvidenceChainEvent_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceHash EvidenceHash_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceHash"
    ADD CONSTRAINT "EvidenceHash_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceRecord EvidenceRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY (id);


--
-- Name: ForensicEvidence ForensicEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ForensicEvidence"
    ADD CONSTRAINT "ForensicEvidence_pkey" PRIMARY KEY (id);


--
-- Name: ForensicInvestigationNote ForensicInvestigationNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ForensicInvestigationNote"
    ADD CONSTRAINT "ForensicInvestigationNote_pkey" PRIMARY KEY (id);


--
-- Name: GovernanceAuditEvent GovernanceAuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GovernanceAuditEvent"
    ADD CONSTRAINT "GovernanceAuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: IdempotencyRecord IdempotencyRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdempotencyRecord"
    ADD CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY (id);


--
-- Name: IncidentAction IncidentAction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IncidentAction"
    ADD CONSTRAINT "IncidentAction_pkey" PRIMARY KEY (id);


--
-- Name: IncidentEvidence IncidentEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IncidentEvidence"
    ADD CONSTRAINT "IncidentEvidence_pkey" PRIMARY KEY (id);


--
-- Name: IntelligenceSnapshot IntelligenceSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IntelligenceSnapshot"
    ADD CONSTRAINT "IntelligenceSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationAssignment InvestigationAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationAssignment"
    ADD CONSTRAINT "InvestigationAssignment_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationCase InvestigationCase_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationEvidenceLink InvestigationEvidenceLink_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationEvidenceLink"
    ADD CONSTRAINT "InvestigationEvidenceLink_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationNote InvestigationNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationNote"
    ADD CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationStatusHistory InvestigationStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationStatusHistory"
    ADD CONSTRAINT "InvestigationStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: InvestigationTimelineEvent InvestigationTimelineEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationTimelineEvent"
    ADD CONSTRAINT "InvestigationTimelineEvent_pkey" PRIMARY KEY (id);


--
-- Name: MovieAuditEvent MovieAuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieAuditEvent"
    ADD CONSTRAINT "MovieAuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: MovieRelease MovieRelease_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieRelease"
    ADD CONSTRAINT "MovieRelease_pkey" PRIMARY KEY (id);


--
-- Name: Movie Movie_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movie"
    ADD CONSTRAINT "Movie_pkey" PRIMARY KEY (id);


--
-- Name: PiracyIncident PiracyIncident_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_pkey" PRIMARY KEY (id);


--
-- Name: PlaybackDevice PlaybackDevice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackDevice"
    ADD CONSTRAINT "PlaybackDevice_pkey" PRIMARY KEY (id);


--
-- Name: PlaybackSession PlaybackSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackSession"
    ADD CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY (id);


--
-- Name: PolicyVersion PolicyVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PolicyVersion"
    ADD CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY (id);


--
-- Name: PrivilegedActionRequest PrivilegedActionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PrivilegedActionRequest"
    ADD CONSTRAINT "PrivilegedActionRequest_pkey" PRIMARY KEY (id);


--
-- Name: ProductionCompany ProductionCompany_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductionCompany"
    ADD CONSTRAINT "ProductionCompany_pkey" PRIMARY KEY (id);


--
-- Name: ProtectionEvent ProtectionEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProtectionEvent"
    ADD CONSTRAINT "ProtectionEvent_pkey" PRIMARY KEY (id);


--
-- Name: RealtimeIncidentNotification RealtimeIncidentNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeIncidentNotification"
    ADD CONSTRAINT "RealtimeIncidentNotification_pkey" PRIMARY KEY (id);


--
-- Name: RealtimeThreatEvent RealtimeThreatEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeThreatEvent"
    ADD CONSTRAINT "RealtimeThreatEvent_pkey" PRIMARY KEY (id);


--
-- Name: RevokedToken RevokedToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RevokedToken"
    ADD CONSTRAINT "RevokedToken_pkey" PRIMARY KEY (id);


--
-- Name: RiskHistory RiskHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RiskHistory"
    ADD CONSTRAINT "RiskHistory_pkey" PRIMARY KEY (id);


--
-- Name: Screen Screen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Screen"
    ADD CONSTRAINT "Screen_pkey" PRIMARY KEY (id);


--
-- Name: SecurityAuditLog SecurityAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityAuditLog"
    ADD CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: SecurityEscalation SecurityEscalation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityEscalation"
    ADD CONSTRAINT "SecurityEscalation_pkey" PRIMARY KEY (id);


--
-- Name: SecurityIncidentTimeline SecurityIncidentTimeline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncidentTimeline"
    ADD CONSTRAINT "SecurityIncidentTimeline_pkey" PRIMARY KEY (id);


--
-- Name: SecurityIncident SecurityIncident_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY (id);


--
-- Name: SecurityNotification SecurityNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityNotification"
    ADD CONSTRAINT "SecurityNotification_pkey" PRIMARY KEY (id);


--
-- Name: SecurityPolicy SecurityPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityPolicy"
    ADD CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY (id);


--
-- Name: SecurityWorkflowExecution SecurityWorkflowExecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityWorkflowExecution"
    ADD CONSTRAINT "SecurityWorkflowExecution_pkey" PRIMARY KEY (id);


--
-- Name: SecurityWorkflow SecurityWorkflow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityWorkflow"
    ADD CONSTRAINT "SecurityWorkflow_pkey" PRIMARY KEY (id);


--
-- Name: Show Show_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_pkey" PRIMARY KEY (id);


--
-- Name: Theatre Theatre_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Theatre"
    ADD CONSTRAINT "Theatre_pkey" PRIMARY KEY (id);


--
-- Name: ThreatAlert ThreatAlert_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatAlert"
    ADD CONSTRAINT "ThreatAlert_pkey" PRIMARY KEY (id);


--
-- Name: ThreatCorrelation ThreatCorrelation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatCorrelation"
    ADD CONSTRAINT "ThreatCorrelation_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelAction ThreatIntelAction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelAction"
    ADD CONSTRAINT "ThreatIntelAction_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelFeed ThreatIntelFeed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelFeed"
    ADD CONSTRAINT "ThreatIntelFeed_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelImport ThreatIntelImport_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelImport"
    ADD CONSTRAINT "ThreatIntelImport_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelIndicator ThreatIntelIndicator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelIndicator"
    ADD CONSTRAINT "ThreatIntelIndicator_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelMatch ThreatIntelMatch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelObservation ThreatIntelObservation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelObservation"
    ADD CONSTRAINT "ThreatIntelObservation_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelRelationship ThreatIntelRelationship_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelRelationship"
    ADD CONSTRAINT "ThreatIntelRelationship_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelSourceHealth ThreatIntelSourceHealth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelSourceHealth"
    ADD CONSTRAINT "ThreatIntelSourceHealth_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelSource ThreatIntelSource_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelSource"
    ADD CONSTRAINT "ThreatIntelSource_pkey" PRIMARY KEY (id);


--
-- Name: ThreatIntelligenceIncident ThreatIntelligenceIncident_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelligenceIncident"
    ADD CONSTRAINT "ThreatIntelligenceIncident_pkey" PRIMARY KEY (id);


--
-- Name: ThreatInvestigationLink ThreatInvestigationLink_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatInvestigationLink"
    ADD CONSTRAINT "ThreatInvestigationLink_pkey" PRIMARY KEY (id);


--
-- Name: ThreatPattern ThreatPattern_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPattern"
    ADD CONSTRAINT "ThreatPattern_pkey" PRIMARY KEY (id);


--
-- Name: ThreatPrediction ThreatPrediction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPrediction"
    ADD CONSTRAINT "ThreatPrediction_pkey" PRIMARY KEY (id);


--
-- Name: ThreatRiskScore ThreatRiskScore_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatRiskScore"
    ADD CONSTRAINT "ThreatRiskScore_pkey" PRIMARY KEY (id);


--
-- Name: ThreatSignal ThreatSignal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatSignal"
    ADD CONSTRAINT "ThreatSignal_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Verification Verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_pkey" PRIMARY KEY (id);


--
-- Name: VideoAsset VideoAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoAsset"
    ADD CONSTRAINT "VideoAsset_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AccessDecision_actorRole_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AccessDecision_actorRole_idx" ON public."AccessDecision" USING btree ("actorRole");


--
-- Name: AccessDecision_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AccessDecision_correlationId_idx" ON public."AccessDecision" USING btree ("correlationId");


--
-- Name: AccessDecision_decision_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AccessDecision_decision_idx" ON public."AccessDecision" USING btree (decision);


--
-- Name: AccessDecision_resourceType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AccessDecision_resourceType_idx" ON public."AccessDecision" USING btree ("resourceType");


--
-- Name: AccessDecision_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AccessDecision_timestamp_idx" ON public."AccessDecision" USING btree ("timestamp");


--
-- Name: Activation_activationCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activation_activationCode_idx" ON public."Activation" USING btree ("activationCode");


--
-- Name: Activation_activationCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Activation_activationCode_key" ON public."Activation" USING btree ("activationCode");


--
-- Name: Activation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activation_status_idx" ON public."Activation" USING btree (status);


--
-- Name: Activation_ticketId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Activation_ticketId_key" ON public."Activation" USING btree ("ticketId");


--
-- Name: AutomatedResponseAction_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponseAction_actionType_idx" ON public."AutomatedResponseAction" USING btree ("actionType");


--
-- Name: AutomatedResponseAction_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponseAction_incidentId_idx" ON public."AutomatedResponseAction" USING btree ("incidentId");


--
-- Name: AutomatedResponseAction_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponseAction_status_idx" ON public."AutomatedResponseAction" USING btree (status);


--
-- Name: AutomatedResponse_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponse_actionType_idx" ON public."AutomatedResponse" USING btree ("actionType");


--
-- Name: AutomatedResponse_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponse_correlationId_idx" ON public."AutomatedResponse" USING btree ("correlationId");


--
-- Name: AutomatedResponse_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponse_createdAt_idx" ON public."AutomatedResponse" USING btree ("createdAt");


--
-- Name: AutomatedResponse_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponse_incidentId_idx" ON public."AutomatedResponse" USING btree ("incidentId");


--
-- Name: AutomatedResponse_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AutomatedResponse_status_idx" ON public."AutomatedResponse" USING btree (status);


--
-- Name: BreakGlassSession_activatedBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BreakGlassSession_activatedBy_idx" ON public."BreakGlassSession" USING btree ("activatedBy");


--
-- Name: BreakGlassSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BreakGlassSession_expiresAt_idx" ON public."BreakGlassSession" USING btree ("expiresAt");


--
-- Name: BreakGlassSession_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BreakGlassSession_isActive_idx" ON public."BreakGlassSession" USING btree ("isActive");


--
-- Name: BreakGlassSession_sessionIdentifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BreakGlassSession_sessionIdentifier_idx" ON public."BreakGlassSession" USING btree ("sessionIdentifier");


--
-- Name: BreakGlassSession_sessionIdentifier_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "BreakGlassSession_sessionIdentifier_key" ON public."BreakGlassSession" USING btree ("sessionIdentifier");


--
-- Name: ContentAsset_assetType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentAsset_assetType_idx" ON public."ContentAsset" USING btree ("assetType");


--
-- Name: ContentAsset_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentAsset_movieId_idx" ON public."ContentAsset" USING btree ("movieId");


--
-- Name: DeviceTrustRecord_deviceFingerprintHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DeviceTrustRecord_deviceFingerprintHash_key" ON public."DeviceTrustRecord" USING btree ("deviceFingerprintHash");


--
-- Name: DeviceTrustRecord_lastSeenAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeviceTrustRecord_lastSeenAt_idx" ON public."DeviceTrustRecord" USING btree ("lastSeenAt");


--
-- Name: DeviceTrustRecord_trustScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeviceTrustRecord_trustScore_idx" ON public."DeviceTrustRecord" USING btree ("trustScore");


--
-- Name: DeviceTrustRecord_trustStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeviceTrustRecord_trustStatus_idx" ON public."DeviceTrustRecord" USING btree ("trustStatus");


--
-- Name: DrmAsset_keyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmAsset_keyId_idx" ON public."DrmAsset" USING btree ("keyId");


--
-- Name: DrmAsset_keyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DrmAsset_keyId_key" ON public."DrmAsset" USING btree ("keyId");


--
-- Name: DrmAsset_provider_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmAsset_provider_idx" ON public."DrmAsset" USING btree (provider);


--
-- Name: DrmAsset_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmAsset_status_idx" ON public."DrmAsset" USING btree (status);


--
-- Name: DrmAsset_videoAssetId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmAsset_videoAssetId_idx" ON public."DrmAsset" USING btree ("videoAssetId");


--
-- Name: DrmAsset_videoAssetId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DrmAsset_videoAssetId_key" ON public."DrmAsset" USING btree ("videoAssetId");


--
-- Name: DrmLicense_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_activationId_idx" ON public."DrmLicense" USING btree ("activationId");


--
-- Name: DrmLicense_drmAssetId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_drmAssetId_idx" ON public."DrmLicense" USING btree ("drmAssetId");


--
-- Name: DrmLicense_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_expiresAt_idx" ON public."DrmLicense" USING btree ("expiresAt");


--
-- Name: DrmLicense_licenseToken_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_licenseToken_idx" ON public."DrmLicense" USING btree ("licenseToken");


--
-- Name: DrmLicense_licenseToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DrmLicense_licenseToken_key" ON public."DrmLicense" USING btree ("licenseToken");


--
-- Name: DrmLicense_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_playbackSessionId_idx" ON public."DrmLicense" USING btree ("playbackSessionId");


--
-- Name: DrmLicense_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_showId_idx" ON public."DrmLicense" USING btree ("showId");


--
-- Name: DrmLicense_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_status_idx" ON public."DrmLicense" USING btree (status);


--
-- Name: DrmLicense_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DrmLicense_theatreId_idx" ON public."DrmLicense" USING btree ("theatreId");


--
-- Name: EvidenceAccessLog_accessType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceAccessLog_accessType_idx" ON public."EvidenceAccessLog" USING btree ("accessType");


--
-- Name: EvidenceAccessLog_accessedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceAccessLog_accessedAt_idx" ON public."EvidenceAccessLog" USING btree ("accessedAt");


--
-- Name: EvidenceAccessLog_evidenceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceAccessLog_evidenceRecordId_idx" ON public."EvidenceAccessLog" USING btree ("evidenceRecordId");


--
-- Name: EvidenceAccessLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceAccessLog_userId_idx" ON public."EvidenceAccessLog" USING btree ("userId");


--
-- Name: EvidenceAccessLog_userRole_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceAccessLog_userRole_idx" ON public."EvidenceAccessLog" USING btree ("userRole");


--
-- Name: EvidenceArtifact_artifactType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceArtifact_artifactType_idx" ON public."EvidenceArtifact" USING btree ("artifactType");


--
-- Name: EvidenceArtifact_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceArtifact_createdAt_idx" ON public."EvidenceArtifact" USING btree ("createdAt");


--
-- Name: EvidenceArtifact_evidenceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceArtifact_evidenceRecordId_idx" ON public."EvidenceArtifact" USING btree ("evidenceRecordId");


--
-- Name: EvidenceArtifact_sha256Hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceArtifact_sha256Hash_idx" ON public."EvidenceArtifact" USING btree ("sha256Hash");


--
-- Name: EvidenceChainEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceChainEvent_eventType_idx" ON public."EvidenceChainEvent" USING btree ("eventType");


--
-- Name: EvidenceChainEvent_evidenceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceChainEvent_evidenceRecordId_idx" ON public."EvidenceChainEvent" USING btree ("evidenceRecordId");


--
-- Name: EvidenceChainEvent_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceChainEvent_timestamp_idx" ON public."EvidenceChainEvent" USING btree ("timestamp");


--
-- Name: EvidenceHash_evidenceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceHash_evidenceRecordId_idx" ON public."EvidenceHash" USING btree ("evidenceRecordId");


--
-- Name: EvidenceHash_verificationStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceHash_verificationStatus_idx" ON public."EvidenceHash" USING btree ("verificationStatus");


--
-- Name: EvidenceHash_verifiedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceHash_verifiedAt_idx" ON public."EvidenceHash" USING btree ("verifiedAt");


--
-- Name: EvidenceRecord_classification_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_classification_idx" ON public."EvidenceRecord" USING btree (classification);


--
-- Name: EvidenceRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_createdAt_idx" ON public."EvidenceRecord" USING btree ("createdAt");


--
-- Name: EvidenceRecord_evidenceNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_evidenceNumber_idx" ON public."EvidenceRecord" USING btree ("evidenceNumber");


--
-- Name: EvidenceRecord_evidenceNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "EvidenceRecord_evidenceNumber_key" ON public."EvidenceRecord" USING btree ("evidenceNumber");


--
-- Name: EvidenceRecord_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_movieId_idx" ON public."EvidenceRecord" USING btree ("movieId");


--
-- Name: EvidenceRecord_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_productionCompanyId_idx" ON public."EvidenceRecord" USING btree ("productionCompanyId");


--
-- Name: EvidenceRecord_retentionStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_retentionStatus_idx" ON public."EvidenceRecord" USING btree ("retentionStatus");


--
-- Name: EvidenceRecord_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_severity_idx" ON public."EvidenceRecord" USING btree (severity);


--
-- Name: EvidenceRecord_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_showId_idx" ON public."EvidenceRecord" USING btree ("showId");


--
-- Name: EvidenceRecord_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_status_idx" ON public."EvidenceRecord" USING btree (status);


--
-- Name: EvidenceRecord_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EvidenceRecord_theatreId_idx" ON public."EvidenceRecord" USING btree ("theatreId");


--
-- Name: ForensicEvidence_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_activationId_idx" ON public."ForensicEvidence" USING btree ("activationId");


--
-- Name: ForensicEvidence_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_createdAt_idx" ON public."ForensicEvidence" USING btree ("createdAt");


--
-- Name: ForensicEvidence_evidenceHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_evidenceHash_idx" ON public."ForensicEvidence" USING btree ("evidenceHash");


--
-- Name: ForensicEvidence_evidenceType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_evidenceType_idx" ON public."ForensicEvidence" USING btree ("evidenceType");


--
-- Name: ForensicEvidence_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_incidentId_idx" ON public."ForensicEvidence" USING btree ("incidentId");


--
-- Name: ForensicEvidence_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_playbackSessionId_idx" ON public."ForensicEvidence" USING btree ("playbackSessionId");


--
-- Name: ForensicEvidence_watermarkFingerprint_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicEvidence_watermarkFingerprint_idx" ON public."ForensicEvidence" USING btree ("watermarkFingerprint");


--
-- Name: ForensicInvestigationNote_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicInvestigationNote_createdAt_idx" ON public."ForensicInvestigationNote" USING btree ("createdAt");


--
-- Name: ForensicInvestigationNote_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicInvestigationNote_incidentId_idx" ON public."ForensicInvestigationNote" USING btree ("incidentId");


--
-- Name: ForensicInvestigationNote_investigatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ForensicInvestigationNote_investigatorId_idx" ON public."ForensicInvestigationNote" USING btree ("investigatorId");


--
-- Name: GovernanceAuditEvent_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GovernanceAuditEvent_correlationId_idx" ON public."GovernanceAuditEvent" USING btree ("correlationId");


--
-- Name: GovernanceAuditEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GovernanceAuditEvent_createdAt_idx" ON public."GovernanceAuditEvent" USING btree ("createdAt");


--
-- Name: GovernanceAuditEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GovernanceAuditEvent_eventType_idx" ON public."GovernanceAuditEvent" USING btree ("eventType");


--
-- Name: GovernanceAuditEvent_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GovernanceAuditEvent_severity_idx" ON public."GovernanceAuditEvent" USING btree (severity);


--
-- Name: GovernanceAuditEvent_targetType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GovernanceAuditEvent_targetType_idx" ON public."GovernanceAuditEvent" USING btree ("targetType");


--
-- Name: IdempotencyRecord_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON public."IdempotencyRecord" USING btree ("expiresAt");


--
-- Name: IdempotencyRecord_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IdempotencyRecord_key_idx" ON public."IdempotencyRecord" USING btree (key);


--
-- Name: IdempotencyRecord_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON public."IdempotencyRecord" USING btree (key);


--
-- Name: IdempotencyRecord_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IdempotencyRecord_status_idx" ON public."IdempotencyRecord" USING btree (status);


--
-- Name: IncidentAction_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentAction_actionType_idx" ON public."IncidentAction" USING btree ("actionType");


--
-- Name: IncidentAction_actorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentAction_actorId_idx" ON public."IncidentAction" USING btree ("actorId");


--
-- Name: IncidentAction_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentAction_createdAt_idx" ON public."IncidentAction" USING btree ("createdAt");


--
-- Name: IncidentAction_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentAction_incidentId_idx" ON public."IncidentAction" USING btree ("incidentId");


--
-- Name: IncidentEvidence_capturedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentEvidence_capturedAt_idx" ON public."IncidentEvidence" USING btree ("capturedAt");


--
-- Name: IncidentEvidence_evidenceType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentEvidence_evidenceType_idx" ON public."IncidentEvidence" USING btree ("evidenceType");


--
-- Name: IncidentEvidence_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentEvidence_hash_idx" ON public."IncidentEvidence" USING btree (hash);


--
-- Name: IncidentEvidence_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IncidentEvidence_incidentId_idx" ON public."IncidentEvidence" USING btree ("incidentId");


--
-- Name: IntelligenceSnapshot_generatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IntelligenceSnapshot_generatedAt_idx" ON public."IntelligenceSnapshot" USING btree ("generatedAt");


--
-- Name: InvestigationAssignment_analystId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationAssignment_analystId_idx" ON public."InvestigationAssignment" USING btree ("analystId");


--
-- Name: InvestigationAssignment_assignedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationAssignment_assignedAt_idx" ON public."InvestigationAssignment" USING btree ("assignedAt");


--
-- Name: InvestigationAssignment_caseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationAssignment_caseId_idx" ON public."InvestigationAssignment" USING btree ("caseId");


--
-- Name: InvestigationCase_assignedAnalystId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_assignedAnalystId_idx" ON public."InvestigationCase" USING btree ("assignedAnalystId");


--
-- Name: InvestigationCase_caseNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_caseNumber_idx" ON public."InvestigationCase" USING btree ("caseNumber");


--
-- Name: InvestigationCase_caseNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "InvestigationCase_caseNumber_key" ON public."InvestigationCase" USING btree ("caseNumber");


--
-- Name: InvestigationCase_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_createdAt_idx" ON public."InvestigationCase" USING btree ("createdAt");


--
-- Name: InvestigationCase_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_movieId_idx" ON public."InvestigationCase" USING btree ("movieId");


--
-- Name: InvestigationCase_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_productionCompanyId_idx" ON public."InvestigationCase" USING btree ("productionCompanyId");


--
-- Name: InvestigationCase_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_severity_idx" ON public."InvestigationCase" USING btree (severity);


--
-- Name: InvestigationCase_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_showId_idx" ON public."InvestigationCase" USING btree ("showId");


--
-- Name: InvestigationCase_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_status_idx" ON public."InvestigationCase" USING btree (status);


--
-- Name: InvestigationCase_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationCase_theatreId_idx" ON public."InvestigationCase" USING btree ("theatreId");


--
-- Name: InvestigationEvidenceLink_caseId_evidenceRecordId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "InvestigationEvidenceLink_caseId_evidenceRecordId_key" ON public."InvestigationEvidenceLink" USING btree ("caseId", "evidenceRecordId");


--
-- Name: InvestigationEvidenceLink_caseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationEvidenceLink_caseId_idx" ON public."InvestigationEvidenceLink" USING btree ("caseId");


--
-- Name: InvestigationEvidenceLink_evidenceRecordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationEvidenceLink_evidenceRecordId_idx" ON public."InvestigationEvidenceLink" USING btree ("evidenceRecordId");


--
-- Name: InvestigationEvidenceLink_linkedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationEvidenceLink_linkedAt_idx" ON public."InvestigationEvidenceLink" USING btree ("linkedAt");


--
-- Name: InvestigationNote_authorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationNote_authorId_idx" ON public."InvestigationNote" USING btree ("authorId");


--
-- Name: InvestigationNote_caseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationNote_caseId_idx" ON public."InvestigationNote" USING btree ("caseId");


--
-- Name: InvestigationNote_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationNote_createdAt_idx" ON public."InvestigationNote" USING btree ("createdAt");


--
-- Name: InvestigationStatusHistory_caseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationStatusHistory_caseId_idx" ON public."InvestigationStatusHistory" USING btree ("caseId");


--
-- Name: InvestigationStatusHistory_changedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationStatusHistory_changedAt_idx" ON public."InvestigationStatusHistory" USING btree ("changedAt");


--
-- Name: InvestigationStatusHistory_fromStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationStatusHistory_fromStatus_idx" ON public."InvestigationStatusHistory" USING btree ("fromStatus");


--
-- Name: InvestigationStatusHistory_toStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationStatusHistory_toStatus_idx" ON public."InvestigationStatusHistory" USING btree ("toStatus");


--
-- Name: InvestigationTimelineEvent_caseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationTimelineEvent_caseId_idx" ON public."InvestigationTimelineEvent" USING btree ("caseId");


--
-- Name: InvestigationTimelineEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationTimelineEvent_eventType_idx" ON public."InvestigationTimelineEvent" USING btree ("eventType");


--
-- Name: InvestigationTimelineEvent_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvestigationTimelineEvent_timestamp_idx" ON public."InvestigationTimelineEvent" USING btree ("timestamp");


--
-- Name: MovieAuditEvent_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieAuditEvent_action_idx" ON public."MovieAuditEvent" USING btree (action);


--
-- Name: MovieAuditEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieAuditEvent_createdAt_idx" ON public."MovieAuditEvent" USING btree ("createdAt");


--
-- Name: MovieAuditEvent_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieAuditEvent_movieId_idx" ON public."MovieAuditEvent" USING btree ("movieId");


--
-- Name: MovieAuditEvent_releaseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieAuditEvent_releaseId_idx" ON public."MovieAuditEvent" USING btree ("releaseId");


--
-- Name: MovieRelease_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_movieId_idx" ON public."MovieRelease" USING btree ("movieId");


--
-- Name: MovieRelease_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_productionCompanyId_idx" ON public."MovieRelease" USING btree ("productionCompanyId");


--
-- Name: MovieRelease_screenId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_screenId_idx" ON public."MovieRelease" USING btree ("screenId");


--
-- Name: MovieRelease_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_startDate_endDate_idx" ON public."MovieRelease" USING btree ("startDate", "endDate");


--
-- Name: MovieRelease_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_status_idx" ON public."MovieRelease" USING btree (status);


--
-- Name: MovieRelease_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MovieRelease_theatreId_idx" ON public."MovieRelease" USING btree ("theatreId");


--
-- Name: Movie_contentStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Movie_contentStatus_idx" ON public."Movie" USING btree ("contentStatus");


--
-- Name: Movie_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Movie_productionCompanyId_idx" ON public."Movie" USING btree ("productionCompanyId");


--
-- Name: Movie_title_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Movie_title_idx" ON public."Movie" USING btree (title);


--
-- Name: PiracyIncident_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_activationId_idx" ON public."PiracyIncident" USING btree ("activationId");


--
-- Name: PiracyIncident_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_createdAt_idx" ON public."PiracyIncident" USING btree ("createdAt");


--
-- Name: PiracyIncident_incidentNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_incidentNumber_idx" ON public."PiracyIncident" USING btree ("incidentNumber");


--
-- Name: PiracyIncident_incidentNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PiracyIncident_incidentNumber_key" ON public."PiracyIncident" USING btree ("incidentNumber");


--
-- Name: PiracyIncident_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_movieId_idx" ON public."PiracyIncident" USING btree ("movieId");


--
-- Name: PiracyIncident_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_playbackSessionId_idx" ON public."PiracyIncident" USING btree ("playbackSessionId");


--
-- Name: PiracyIncident_riskScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_riskScore_idx" ON public."PiracyIncident" USING btree ("riskScore");


--
-- Name: PiracyIncident_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_severity_idx" ON public."PiracyIncident" USING btree (severity);


--
-- Name: PiracyIncident_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_showId_idx" ON public."PiracyIncident" USING btree ("showId");


--
-- Name: PiracyIncident_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_status_idx" ON public."PiracyIncident" USING btree (status);


--
-- Name: PiracyIncident_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiracyIncident_theatreId_idx" ON public."PiracyIncident" USING btree ("theatreId");


--
-- Name: PlaybackDevice_deviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackDevice_deviceId_idx" ON public."PlaybackDevice" USING btree ("deviceId");


--
-- Name: PlaybackDevice_deviceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PlaybackDevice_deviceId_key" ON public."PlaybackDevice" USING btree ("deviceId");


--
-- Name: PlaybackDevice_lastHeartbeatAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackDevice_lastHeartbeatAt_idx" ON public."PlaybackDevice" USING btree ("lastHeartbeatAt");


--
-- Name: PlaybackDevice_screenId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackDevice_screenId_idx" ON public."PlaybackDevice" USING btree ("screenId");


--
-- Name: PlaybackDevice_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackDevice_status_idx" ON public."PlaybackDevice" USING btree (status);


--
-- Name: PlaybackDevice_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackDevice_theatreId_idx" ON public."PlaybackDevice" USING btree ("theatreId");


--
-- Name: PlaybackSession_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_activationId_idx" ON public."PlaybackSession" USING btree ("activationId");


--
-- Name: PlaybackSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_expiresAt_idx" ON public."PlaybackSession" USING btree ("expiresAt");


--
-- Name: PlaybackSession_sessionToken_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_sessionToken_idx" ON public."PlaybackSession" USING btree ("sessionToken");


--
-- Name: PlaybackSession_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PlaybackSession_sessionToken_key" ON public."PlaybackSession" USING btree ("sessionToken");


--
-- Name: PlaybackSession_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_showId_idx" ON public."PlaybackSession" USING btree ("showId");


--
-- Name: PlaybackSession_showId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_showId_status_idx" ON public."PlaybackSession" USING btree ("showId", status);


--
-- Name: PlaybackSession_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_status_idx" ON public."PlaybackSession" USING btree (status);


--
-- Name: PlaybackSession_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_theatreId_idx" ON public."PlaybackSession" USING btree ("theatreId");


--
-- Name: PlaybackSession_theatreId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_theatreId_status_idx" ON public."PlaybackSession" USING btree ("theatreId", status);


--
-- Name: PlaybackSession_videoAssetId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PlaybackSession_videoAssetId_idx" ON public."PlaybackSession" USING btree ("videoAssetId");


--
-- Name: PolicyVersion_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PolicyVersion_createdAt_idx" ON public."PolicyVersion" USING btree ("createdAt");


--
-- Name: PolicyVersion_policyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PolicyVersion_policyId_idx" ON public."PolicyVersion" USING btree ("policyId");


--
-- Name: PolicyVersion_version_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PolicyVersion_version_idx" ON public."PolicyVersion" USING btree (version);


--
-- Name: PrivilegedActionRequest_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PrivilegedActionRequest_actionType_idx" ON public."PrivilegedActionRequest" USING btree ("actionType");


--
-- Name: PrivilegedActionRequest_approvalStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PrivilegedActionRequest_approvalStatus_idx" ON public."PrivilegedActionRequest" USING btree ("approvalStatus");


--
-- Name: PrivilegedActionRequest_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PrivilegedActionRequest_expiresAt_idx" ON public."PrivilegedActionRequest" USING btree ("expiresAt");


--
-- Name: PrivilegedActionRequest_requestedBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PrivilegedActionRequest_requestedBy_idx" ON public."PrivilegedActionRequest" USING btree ("requestedBy");


--
-- Name: PrivilegedActionRequest_riskLevel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PrivilegedActionRequest_riskLevel_idx" ON public."PrivilegedActionRequest" USING btree ("riskLevel");


--
-- Name: ProductionCompany_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductionCompany_code_idx" ON public."ProductionCompany" USING btree (code);


--
-- Name: ProductionCompany_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductionCompany_code_key" ON public."ProductionCompany" USING btree (code);


--
-- Name: ProductionCompany_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductionCompany_name_idx" ON public."ProductionCompany" USING btree (name);


--
-- Name: ProductionCompany_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductionCompany_status_idx" ON public."ProductionCompany" USING btree (status);


--
-- Name: ProtectionEvent_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProtectionEvent_activationId_idx" ON public."ProtectionEvent" USING btree ("activationId");


--
-- Name: ProtectionEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProtectionEvent_createdAt_idx" ON public."ProtectionEvent" USING btree ("createdAt");


--
-- Name: ProtectionEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProtectionEvent_eventType_idx" ON public."ProtectionEvent" USING btree ("eventType");


--
-- Name: ProtectionEvent_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProtectionEvent_showId_idx" ON public."ProtectionEvent" USING btree ("showId");


--
-- Name: ProtectionEvent_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProtectionEvent_theatreId_idx" ON public."ProtectionEvent" USING btree ("theatreId");


--
-- Name: RealtimeIncidentNotification_isRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_isRead_idx" ON public."RealtimeIncidentNotification" USING btree ("isRead");


--
-- Name: RealtimeIncidentNotification_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_movieId_idx" ON public."RealtimeIncidentNotification" USING btree ("movieId");


--
-- Name: RealtimeIncidentNotification_sentAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_sentAt_idx" ON public."RealtimeIncidentNotification" USING btree ("sentAt");


--
-- Name: RealtimeIncidentNotification_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_severity_idx" ON public."RealtimeIncidentNotification" USING btree (severity);


--
-- Name: RealtimeIncidentNotification_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_showId_idx" ON public."RealtimeIncidentNotification" USING btree ("showId");


--
-- Name: RealtimeIncidentNotification_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeIncidentNotification_theatreId_idx" ON public."RealtimeIncidentNotification" USING btree ("theatreId");


--
-- Name: RealtimeThreatEvent_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_correlationId_idx" ON public."RealtimeThreatEvent" USING btree ("correlationId");


--
-- Name: RealtimeThreatEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_createdAt_idx" ON public."RealtimeThreatEvent" USING btree ("createdAt");


--
-- Name: RealtimeThreatEvent_eventId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RealtimeThreatEvent_eventId_key" ON public."RealtimeThreatEvent" USING btree ("eventId");


--
-- Name: RealtimeThreatEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_eventType_idx" ON public."RealtimeThreatEvent" USING btree ("eventType");


--
-- Name: RealtimeThreatEvent_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_movieId_idx" ON public."RealtimeThreatEvent" USING btree ("movieId");


--
-- Name: RealtimeThreatEvent_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_severity_idx" ON public."RealtimeThreatEvent" USING btree (severity);


--
-- Name: RealtimeThreatEvent_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_showId_idx" ON public."RealtimeThreatEvent" USING btree ("showId");


--
-- Name: RealtimeThreatEvent_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RealtimeThreatEvent_theatreId_idx" ON public."RealtimeThreatEvent" USING btree ("theatreId");


--
-- Name: RevokedToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RevokedToken_expiresAt_idx" ON public."RevokedToken" USING btree ("expiresAt");


--
-- Name: RevokedToken_tokenHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RevokedToken_tokenHash_idx" ON public."RevokedToken" USING btree ("tokenHash");


--
-- Name: RevokedToken_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RevokedToken_tokenHash_key" ON public."RevokedToken" USING btree ("tokenHash");


--
-- Name: RevokedToken_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RevokedToken_userId_idx" ON public."RevokedToken" USING btree ("userId");


--
-- Name: RiskHistory_calculatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RiskHistory_calculatedAt_idx" ON public."RiskHistory" USING btree ("calculatedAt");


--
-- Name: RiskHistory_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RiskHistory_correlationId_idx" ON public."RiskHistory" USING btree ("correlationId");


--
-- Name: RiskHistory_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RiskHistory_entityType_entityId_idx" ON public."RiskHistory" USING btree ("entityType", "entityId");


--
-- Name: Screen_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Screen_theatreId_idx" ON public."Screen" USING btree ("theatreId");


--
-- Name: Screen_theatreId_screenNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Screen_theatreId_screenNumber_key" ON public."Screen" USING btree ("theatreId", "screenNumber");


--
-- Name: SecurityAuditLog_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_activationId_idx" ON public."SecurityAuditLog" USING btree ("activationId");


--
-- Name: SecurityAuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_createdAt_idx" ON public."SecurityAuditLog" USING btree ("createdAt");


--
-- Name: SecurityAuditLog_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_eventType_idx" ON public."SecurityAuditLog" USING btree ("eventType");


--
-- Name: SecurityAuditLog_ipAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_ipAddress_idx" ON public."SecurityAuditLog" USING btree ("ipAddress");


--
-- Name: SecurityAuditLog_isThreat_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_isThreat_idx" ON public."SecurityAuditLog" USING btree ("isThreat");


--
-- Name: SecurityAuditLog_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_severity_idx" ON public."SecurityAuditLog" USING btree (severity);


--
-- Name: SecurityAuditLog_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_showId_idx" ON public."SecurityAuditLog" USING btree ("showId");


--
-- Name: SecurityAuditLog_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_theatreId_idx" ON public."SecurityAuditLog" USING btree ("theatreId");


--
-- Name: SecurityAuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityAuditLog_userId_idx" ON public."SecurityAuditLog" USING btree ("userId");


--
-- Name: SecurityEscalation_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEscalation_correlationId_idx" ON public."SecurityEscalation" USING btree ("correlationId");


--
-- Name: SecurityEscalation_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEscalation_createdAt_idx" ON public."SecurityEscalation" USING btree ("createdAt");


--
-- Name: SecurityEscalation_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEscalation_incidentId_idx" ON public."SecurityEscalation" USING btree ("incidentId");


--
-- Name: SecurityEscalation_triggeredBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEscalation_triggeredBy_idx" ON public."SecurityEscalation" USING btree ("triggeredBy");


--
-- Name: SecurityIncidentTimeline_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncidentTimeline_eventType_idx" ON public."SecurityIncidentTimeline" USING btree ("eventType");


--
-- Name: SecurityIncidentTimeline_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncidentTimeline_incidentId_idx" ON public."SecurityIncidentTimeline" USING btree ("incidentId");


--
-- Name: SecurityIncidentTimeline_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncidentTimeline_timestamp_idx" ON public."SecurityIncidentTimeline" USING btree ("timestamp");


--
-- Name: SecurityIncident_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_activationId_idx" ON public."SecurityIncident" USING btree ("activationId");


--
-- Name: SecurityIncident_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_createdAt_idx" ON public."SecurityIncident" USING btree ("createdAt");


--
-- Name: SecurityIncident_incidentNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_incidentNumber_idx" ON public."SecurityIncident" USING btree ("incidentNumber");


--
-- Name: SecurityIncident_incidentNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SecurityIncident_incidentNumber_key" ON public."SecurityIncident" USING btree ("incidentNumber");


--
-- Name: SecurityIncident_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_playbackSessionId_idx" ON public."SecurityIncident" USING btree ("playbackSessionId");


--
-- Name: SecurityIncident_riskScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_riskScore_idx" ON public."SecurityIncident" USING btree ("riskScore");


--
-- Name: SecurityIncident_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_severity_idx" ON public."SecurityIncident" USING btree (severity);


--
-- Name: SecurityIncident_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_showId_idx" ON public."SecurityIncident" USING btree ("showId");


--
-- Name: SecurityIncident_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_status_idx" ON public."SecurityIncident" USING btree (status);


--
-- Name: SecurityIncident_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityIncident_theatreId_idx" ON public."SecurityIncident" USING btree ("theatreId");


--
-- Name: SecurityNotification_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_category_idx" ON public."SecurityNotification" USING btree (category);


--
-- Name: SecurityNotification_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_createdAt_idx" ON public."SecurityNotification" USING btree ("createdAt");


--
-- Name: SecurityNotification_deduplicationKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_deduplicationKey_idx" ON public."SecurityNotification" USING btree ("deduplicationKey");


--
-- Name: SecurityNotification_isRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_isRead_idx" ON public."SecurityNotification" USING btree ("isRead");


--
-- Name: SecurityNotification_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_severity_idx" ON public."SecurityNotification" USING btree (severity);


--
-- Name: SecurityNotification_targetRole_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityNotification_targetRole_idx" ON public."SecurityNotification" USING btree ("targetRole");


--
-- Name: SecurityPolicy_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityPolicy_createdAt_idx" ON public."SecurityPolicy" USING btree ("createdAt");


--
-- Name: SecurityPolicy_isEnabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityPolicy_isEnabled_idx" ON public."SecurityPolicy" USING btree ("isEnabled");


--
-- Name: SecurityPolicy_policyType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityPolicy_policyType_idx" ON public."SecurityPolicy" USING btree ("policyType");


--
-- Name: SecurityPolicy_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityPolicy_priority_idx" ON public."SecurityPolicy" USING btree (priority);


--
-- Name: SecurityPolicy_tenantType_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityPolicy_tenantType_tenantId_idx" ON public."SecurityPolicy" USING btree ("tenantType", "tenantId");


--
-- Name: SecurityWorkflowExecution_correlationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflowExecution_correlationId_idx" ON public."SecurityWorkflowExecution" USING btree ("correlationId");


--
-- Name: SecurityWorkflowExecution_executedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflowExecution_executedAt_idx" ON public."SecurityWorkflowExecution" USING btree ("executedAt");


--
-- Name: SecurityWorkflowExecution_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflowExecution_status_idx" ON public."SecurityWorkflowExecution" USING btree (status);


--
-- Name: SecurityWorkflowExecution_workflowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflowExecution_workflowId_idx" ON public."SecurityWorkflowExecution" USING btree ("workflowId");


--
-- Name: SecurityWorkflow_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflow_createdAt_idx" ON public."SecurityWorkflow" USING btree ("createdAt");


--
-- Name: SecurityWorkflow_isEnabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflow_isEnabled_idx" ON public."SecurityWorkflow" USING btree ("isEnabled");


--
-- Name: SecurityWorkflow_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflow_priority_idx" ON public."SecurityWorkflow" USING btree (priority);


--
-- Name: SecurityWorkflow_triggerType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityWorkflow_triggerType_idx" ON public."SecurityWorkflow" USING btree ("triggerType");


--
-- Name: Show_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Show_movieId_idx" ON public."Show" USING btree ("movieId");


--
-- Name: Show_screenId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Show_screenId_idx" ON public."Show" USING btree ("screenId");


--
-- Name: Show_startTime_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Show_startTime_status_idx" ON public."Show" USING btree ("startTime", status);


--
-- Name: Show_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Show_theatreId_idx" ON public."Show" USING btree ("theatreId");


--
-- Name: Theatre_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Theatre_code_key" ON public."Theatre" USING btree (code);


--
-- Name: Theatre_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Theatre_name_idx" ON public."Theatre" USING btree (name);


--
-- Name: Theatre_permanentQrCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Theatre_permanentQrCode_idx" ON public."Theatre" USING btree ("permanentQrCode");


--
-- Name: Theatre_permanentQrCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Theatre_permanentQrCode_key" ON public."Theatre" USING btree ("permanentQrCode");


--
-- Name: ThreatAlert_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_activationId_idx" ON public."ThreatAlert" USING btree ("activationId");


--
-- Name: ThreatAlert_alertType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_alertType_idx" ON public."ThreatAlert" USING btree ("alertType");


--
-- Name: ThreatAlert_detectedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_detectedAt_idx" ON public."ThreatAlert" USING btree ("detectedAt");


--
-- Name: ThreatAlert_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_playbackSessionId_idx" ON public."ThreatAlert" USING btree ("playbackSessionId");


--
-- Name: ThreatAlert_riskScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_riskScore_idx" ON public."ThreatAlert" USING btree ("riskScore");


--
-- Name: ThreatAlert_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_severity_idx" ON public."ThreatAlert" USING btree (severity);


--
-- Name: ThreatAlert_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_showId_idx" ON public."ThreatAlert" USING btree ("showId");


--
-- Name: ThreatAlert_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_status_idx" ON public."ThreatAlert" USING btree (status);


--
-- Name: ThreatAlert_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatAlert_theatreId_idx" ON public."ThreatAlert" USING btree ("theatreId");


--
-- Name: ThreatCorrelation_correlationType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatCorrelation_correlationType_idx" ON public."ThreatCorrelation" USING btree ("correlationType");


--
-- Name: ThreatCorrelation_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatCorrelation_incidentId_idx" ON public."ThreatCorrelation" USING btree ("incidentId");


--
-- Name: ThreatCorrelation_sourceEventId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatCorrelation_sourceEventId_idx" ON public."ThreatCorrelation" USING btree ("sourceEventId");


--
-- Name: ThreatIntelAction_actionType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelAction_actionType_idx" ON public."ThreatIntelAction" USING btree ("actionType");


--
-- Name: ThreatIntelAction_actorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelAction_actorId_idx" ON public."ThreatIntelAction" USING btree ("actorId");


--
-- Name: ThreatIntelAction_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelAction_createdAt_idx" ON public."ThreatIntelAction" USING btree ("createdAt");


--
-- Name: ThreatIntelCampaign_campaignIdentifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_campaignIdentifier_idx" ON public."ThreatIntelCampaign" USING btree ("campaignIdentifier");


--
-- Name: ThreatIntelCampaign_campaignIdentifier_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ThreatIntelCampaign_campaignIdentifier_key" ON public."ThreatIntelCampaign" USING btree ("campaignIdentifier");


--
-- Name: ThreatIntelCampaign_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_movieId_idx" ON public."ThreatIntelCampaign" USING btree ("movieId");


--
-- Name: ThreatIntelCampaign_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_productionCompanyId_idx" ON public."ThreatIntelCampaign" USING btree ("productionCompanyId");


--
-- Name: ThreatIntelCampaign_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_status_idx" ON public."ThreatIntelCampaign" USING btree (status);


--
-- Name: ThreatIntelCampaign_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_theatreId_idx" ON public."ThreatIntelCampaign" USING btree ("theatreId");


--
-- Name: ThreatIntelCampaign_threatClassification_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelCampaign_threatClassification_idx" ON public."ThreatIntelCampaign" USING btree ("threatClassification");


--
-- Name: ThreatIntelFeed_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelFeed_isActive_idx" ON public."ThreatIntelFeed" USING btree ("isActive");


--
-- Name: ThreatIntelFeed_sourceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelFeed_sourceId_idx" ON public."ThreatIntelFeed" USING btree ("sourceId");


--
-- Name: ThreatIntelImport_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelImport_createdAt_idx" ON public."ThreatIntelImport" USING btree ("createdAt");


--
-- Name: ThreatIntelImport_sourceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelImport_sourceId_idx" ON public."ThreatIntelImport" USING btree ("sourceId");


--
-- Name: ThreatIntelImport_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelImport_status_idx" ON public."ThreatIntelImport" USING btree (status);


--
-- Name: ThreatIntelIndicator_confidenceLevel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_confidenceLevel_idx" ON public."ThreatIntelIndicator" USING btree ("confidenceLevel");


--
-- Name: ThreatIntelIndicator_confidenceScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_confidenceScore_idx" ON public."ThreatIntelIndicator" USING btree ("confidenceScore");


--
-- Name: ThreatIntelIndicator_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_expiresAt_idx" ON public."ThreatIntelIndicator" USING btree ("expiresAt");


--
-- Name: ThreatIntelIndicator_indicatorType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_indicatorType_idx" ON public."ThreatIntelIndicator" USING btree ("indicatorType");


--
-- Name: ThreatIntelIndicator_sourceId_indicatorType_value_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ThreatIntelIndicator_sourceId_indicatorType_value_key" ON public."ThreatIntelIndicator" USING btree ("sourceId", "indicatorType", value);


--
-- Name: ThreatIntelIndicator_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_status_idx" ON public."ThreatIntelIndicator" USING btree (status);


--
-- Name: ThreatIntelIndicator_threatClassification_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_threatClassification_idx" ON public."ThreatIntelIndicator" USING btree ("threatClassification");


--
-- Name: ThreatIntelIndicator_value_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelIndicator_value_idx" ON public."ThreatIntelIndicator" USING btree (value);


--
-- Name: ThreatIntelMatch_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_campaignId_idx" ON public."ThreatIntelMatch" USING btree ("campaignId");


--
-- Name: ThreatIntelMatch_indicatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_indicatorId_idx" ON public."ThreatIntelMatch" USING btree ("indicatorId");


--
-- Name: ThreatIntelMatch_matchedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_matchedAt_idx" ON public."ThreatIntelMatch" USING btree ("matchedAt");


--
-- Name: ThreatIntelMatch_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_movieId_idx" ON public."ThreatIntelMatch" USING btree ("movieId");


--
-- Name: ThreatIntelMatch_playbackSessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_playbackSessionId_idx" ON public."ThreatIntelMatch" USING btree ("playbackSessionId");


--
-- Name: ThreatIntelMatch_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelMatch_theatreId_idx" ON public."ThreatIntelMatch" USING btree ("theatreId");


--
-- Name: ThreatIntelObservation_indicatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelObservation_indicatorId_idx" ON public."ThreatIntelObservation" USING btree ("indicatorId");


--
-- Name: ThreatIntelObservation_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelObservation_timestamp_idx" ON public."ThreatIntelObservation" USING btree ("timestamp");


--
-- Name: ThreatIntelRelationship_sourceIndicatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelRelationship_sourceIndicatorId_idx" ON public."ThreatIntelRelationship" USING btree ("sourceIndicatorId");


--
-- Name: ThreatIntelRelationship_sourceIndicatorId_targetIndicatorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ThreatIntelRelationship_sourceIndicatorId_targetIndicatorId_key" ON public."ThreatIntelRelationship" USING btree ("sourceIndicatorId", "targetIndicatorId", "relationshipType");


--
-- Name: ThreatIntelRelationship_targetIndicatorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelRelationship_targetIndicatorId_idx" ON public."ThreatIntelRelationship" USING btree ("targetIndicatorId");


--
-- Name: ThreatIntelSourceHealth_checkedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSourceHealth_checkedAt_idx" ON public."ThreatIntelSourceHealth" USING btree ("checkedAt");


--
-- Name: ThreatIntelSourceHealth_sourceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSourceHealth_sourceId_idx" ON public."ThreatIntelSourceHealth" USING btree ("sourceId");


--
-- Name: ThreatIntelSourceHealth_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSourceHealth_status_idx" ON public."ThreatIntelSourceHealth" USING btree (status);


--
-- Name: ThreatIntelSource_isEnabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSource_isEnabled_idx" ON public."ThreatIntelSource" USING btree ("isEnabled");


--
-- Name: ThreatIntelSource_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ThreatIntelSource_name_key" ON public."ThreatIntelSource" USING btree (name);


--
-- Name: ThreatIntelSource_providerType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSource_providerType_idx" ON public."ThreatIntelSource" USING btree ("providerType");


--
-- Name: ThreatIntelSource_trustLevel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelSource_trustLevel_idx" ON public."ThreatIntelSource" USING btree ("trustLevel");


--
-- Name: ThreatIntelligenceIncident_incidentCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_incidentCode_idx" ON public."ThreatIntelligenceIncident" USING btree ("incidentCode");


--
-- Name: ThreatIntelligenceIncident_incidentCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ThreatIntelligenceIncident_incidentCode_key" ON public."ThreatIntelligenceIncident" USING btree ("incidentCode");


--
-- Name: ThreatIntelligenceIncident_lastDetectedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_lastDetectedAt_idx" ON public."ThreatIntelligenceIncident" USING btree ("lastDetectedAt");


--
-- Name: ThreatIntelligenceIncident_riskScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_riskScore_idx" ON public."ThreatIntelligenceIncident" USING btree ("riskScore");


--
-- Name: ThreatIntelligenceIncident_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_severity_idx" ON public."ThreatIntelligenceIncident" USING btree (severity);


--
-- Name: ThreatIntelligenceIncident_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_showId_idx" ON public."ThreatIntelligenceIncident" USING btree ("showId");


--
-- Name: ThreatIntelligenceIncident_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_status_idx" ON public."ThreatIntelligenceIncident" USING btree (status);


--
-- Name: ThreatIntelligenceIncident_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatIntelligenceIncident_theatreId_idx" ON public."ThreatIntelligenceIncident" USING btree ("theatreId");


--
-- Name: ThreatInvestigationLink_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatInvestigationLink_incidentId_idx" ON public."ThreatInvestigationLink" USING btree ("incidentId");


--
-- Name: ThreatInvestigationLink_investigationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatInvestigationLink_investigationId_idx" ON public."ThreatInvestigationLink" USING btree ("investigationId");


--
-- Name: ThreatInvestigationLink_patternId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatInvestigationLink_patternId_idx" ON public."ThreatInvestigationLink" USING btree ("patternId");


--
-- Name: ThreatInvestigationLink_predictionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatInvestigationLink_predictionId_idx" ON public."ThreatInvestigationLink" USING btree ("predictionId");


--
-- Name: ThreatPattern_lastDetectedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_lastDetectedAt_idx" ON public."ThreatPattern" USING btree ("lastDetectedAt");


--
-- Name: ThreatPattern_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_movieId_idx" ON public."ThreatPattern" USING btree ("movieId");


--
-- Name: ThreatPattern_patternType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_patternType_idx" ON public."ThreatPattern" USING btree ("patternType");


--
-- Name: ThreatPattern_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_severity_idx" ON public."ThreatPattern" USING btree (severity);


--
-- Name: ThreatPattern_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_showId_idx" ON public."ThreatPattern" USING btree ("showId");


--
-- Name: ThreatPattern_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_status_idx" ON public."ThreatPattern" USING btree (status);


--
-- Name: ThreatPattern_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPattern_theatreId_idx" ON public."ThreatPattern" USING btree ("theatreId");


--
-- Name: ThreatPrediction_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPrediction_createdAt_idx" ON public."ThreatPrediction" USING btree ("createdAt");


--
-- Name: ThreatPrediction_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPrediction_movieId_idx" ON public."ThreatPrediction" USING btree ("movieId");


--
-- Name: ThreatPrediction_predictedRisk_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPrediction_predictedRisk_idx" ON public."ThreatPrediction" USING btree ("predictedRisk");


--
-- Name: ThreatPrediction_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPrediction_showId_idx" ON public."ThreatPrediction" USING btree ("showId");


--
-- Name: ThreatPrediction_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatPrediction_theatreId_idx" ON public."ThreatPrediction" USING btree ("theatreId");


--
-- Name: ThreatRiskScore_calculatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatRiskScore_calculatedAt_idx" ON public."ThreatRiskScore" USING btree ("calculatedAt");


--
-- Name: ThreatRiskScore_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatRiskScore_entityType_entityId_idx" ON public."ThreatRiskScore" USING btree ("entityType", "entityId");


--
-- Name: ThreatRiskScore_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatRiskScore_expiresAt_idx" ON public."ThreatRiskScore" USING btree ("expiresAt");


--
-- Name: ThreatRiskScore_riskScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatRiskScore_riskScore_idx" ON public."ThreatRiskScore" USING btree ("riskScore");


--
-- Name: ThreatSignal_detectedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatSignal_detectedAt_idx" ON public."ThreatSignal" USING btree ("detectedAt");


--
-- Name: ThreatSignal_incidentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatSignal_incidentId_idx" ON public."ThreatSignal" USING btree ("incidentId");


--
-- Name: ThreatSignal_patternId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatSignal_patternId_idx" ON public."ThreatSignal" USING btree ("patternId");


--
-- Name: ThreatSignal_signalType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ThreatSignal_signalType_idx" ON public."ThreatSignal" USING btree ("signalType");


--
-- Name: Ticket_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_showId_idx" ON public."Ticket" USING btree ("showId");


--
-- Name: Ticket_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_status_idx" ON public."Ticket" USING btree (status);


--
-- Name: Ticket_ticketNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_ticketNumber_idx" ON public."Ticket" USING btree ("ticketNumber");


--
-- Name: Ticket_ticketNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON public."Ticket" USING btree ("ticketNumber");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_productionCompanyId_idx" ON public."User" USING btree ("productionCompanyId");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: Verification_activationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_activationId_idx" ON public."Verification" USING btree ("activationId");


--
-- Name: Verification_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_createdAt_idx" ON public."Verification" USING btree ("createdAt");


--
-- Name: Verification_result_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_result_idx" ON public."Verification" USING btree (result);


--
-- Name: Verification_showId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_showId_idx" ON public."Verification" USING btree ("showId");


--
-- Name: Verification_staffId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_staffId_idx" ON public."Verification" USING btree ("staffId");


--
-- Name: Verification_theatreId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_theatreId_idx" ON public."Verification" USING btree ("theatreId");


--
-- Name: VideoAsset_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoAsset_movieId_idx" ON public."VideoAsset" USING btree ("movieId");


--
-- Name: VideoAsset_processingStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoAsset_processingStatus_idx" ON public."VideoAsset" USING btree ("processingStatus");


--
-- Name: VideoAsset_productionCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoAsset_productionCompanyId_idx" ON public."VideoAsset" USING btree ("productionCompanyId");


--
-- Name: VideoAsset_state_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoAsset_state_idx" ON public."VideoAsset" USING btree (state);


--
-- Name: VideoAsset_streamKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoAsset_streamKey_idx" ON public."VideoAsset" USING btree ("streamKey");


--
-- Name: VideoAsset_streamKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VideoAsset_streamKey_key" ON public."VideoAsset" USING btree ("streamKey");


--
-- Name: _CampaignIndicators_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_CampaignIndicators_AB_unique" ON public."_CampaignIndicators" USING btree ("A", "B");


--
-- Name: _CampaignIndicators_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_CampaignIndicators_B_index" ON public."_CampaignIndicators" USING btree ("B");


--
-- Name: Activation Activation_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Activation"
    ADD CONSTRAINT "Activation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomatedResponseAction AutomatedResponseAction_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AutomatedResponseAction"
    ADD CONSTRAINT "AutomatedResponseAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."ThreatIntelligenceIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentAsset ContentAsset_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentAsset"
    ADD CONSTRAINT "ContentAsset_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrmAsset DrmAsset_videoAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmAsset"
    ADD CONSTRAINT "DrmAsset_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES public."VideoAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrmLicense DrmLicense_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrmLicense DrmLicense_drmAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_drmAssetId_fkey" FOREIGN KEY ("drmAssetId") REFERENCES public."DrmAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrmLicense DrmLicense_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DrmLicense DrmLicense_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrmLicense DrmLicense_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DrmLicense"
    ADD CONSTRAINT "DrmLicense_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EvidenceAccessLog EvidenceAccessLog_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceAccessLog"
    ADD CONSTRAINT "EvidenceAccessLog_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EvidenceArtifact EvidenceArtifact_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceArtifact"
    ADD CONSTRAINT "EvidenceArtifact_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EvidenceChainEvent EvidenceChainEvent_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceChainEvent"
    ADD CONSTRAINT "EvidenceChainEvent_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EvidenceHash EvidenceHash_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceHash"
    ADD CONSTRAINT "EvidenceHash_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EvidenceRecord EvidenceRecord_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EvidenceRecord EvidenceRecord_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EvidenceRecord EvidenceRecord_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EvidenceRecord EvidenceRecord_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EvidenceRecord EvidenceRecord_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceRecord"
    ADD CONSTRAINT "EvidenceRecord_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ForensicEvidence ForensicEvidence_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ForensicEvidence"
    ADD CONSTRAINT "ForensicEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."PiracyIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForensicInvestigationNote ForensicInvestigationNote_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ForensicInvestigationNote"
    ADD CONSTRAINT "ForensicInvestigationNote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."PiracyIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IncidentAction IncidentAction_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IncidentAction"
    ADD CONSTRAINT "IncidentAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."SecurityIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IncidentEvidence IncidentEvidence_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IncidentEvidence"
    ADD CONSTRAINT "IncidentEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."SecurityIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationAssignment InvestigationAssignment_analystId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationAssignment"
    ADD CONSTRAINT "InvestigationAssignment_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationAssignment InvestigationAssignment_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationAssignment"
    ADD CONSTRAINT "InvestigationAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationCase InvestigationCase_assignedAnalystId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_assignedAnalystId_fkey" FOREIGN KEY ("assignedAnalystId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationCase InvestigationCase_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationCase InvestigationCase_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationCase InvestigationCase_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationCase InvestigationCase_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationCase InvestigationCase_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationCase"
    ADD CONSTRAINT "InvestigationCase_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InvestigationEvidenceLink InvestigationEvidenceLink_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationEvidenceLink"
    ADD CONSTRAINT "InvestigationEvidenceLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationEvidenceLink InvestigationEvidenceLink_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationEvidenceLink"
    ADD CONSTRAINT "InvestigationEvidenceLink_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationNote InvestigationNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationNote"
    ADD CONSTRAINT "InvestigationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationNote InvestigationNote_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationNote"
    ADD CONSTRAINT "InvestigationNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationStatusHistory InvestigationStatusHistory_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationStatusHistory"
    ADD CONSTRAINT "InvestigationStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvestigationTimelineEvent InvestigationTimelineEvent_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvestigationTimelineEvent"
    ADD CONSTRAINT "InvestigationTimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovieAuditEvent MovieAuditEvent_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieAuditEvent"
    ADD CONSTRAINT "MovieAuditEvent_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovieAuditEvent MovieAuditEvent_releaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieAuditEvent"
    ADD CONSTRAINT "MovieAuditEvent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES public."MovieRelease"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovieRelease MovieRelease_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieRelease"
    ADD CONSTRAINT "MovieRelease_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovieRelease MovieRelease_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieRelease"
    ADD CONSTRAINT "MovieRelease_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MovieRelease MovieRelease_screenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieRelease"
    ADD CONSTRAINT "MovieRelease_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES public."Screen"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MovieRelease MovieRelease_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MovieRelease"
    ADD CONSTRAINT "MovieRelease_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Movie Movie_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movie"
    ADD CONSTRAINT "Movie_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_assignedInvestigatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_assignedInvestigatorId_fkey" FOREIGN KEY ("assignedInvestigatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PiracyIncident PiracyIncident_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiracyIncident"
    ADD CONSTRAINT "PiracyIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PlaybackDevice PlaybackDevice_screenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackDevice"
    ADD CONSTRAINT "PlaybackDevice_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES public."Screen"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PlaybackDevice PlaybackDevice_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackDevice"
    ADD CONSTRAINT "PlaybackDevice_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlaybackSession PlaybackSession_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackSession"
    ADD CONSTRAINT "PlaybackSession_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlaybackSession PlaybackSession_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackSession"
    ADD CONSTRAINT "PlaybackSession_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlaybackSession PlaybackSession_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackSession"
    ADD CONSTRAINT "PlaybackSession_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlaybackSession PlaybackSession_videoAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PlaybackSession"
    ADD CONSTRAINT "PlaybackSession_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES public."VideoAsset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PolicyVersion PolicyVersion_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PolicyVersion"
    ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public."SecurityPolicy"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProtectionEvent ProtectionEvent_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProtectionEvent"
    ADD CONSTRAINT "ProtectionEvent_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProtectionEvent ProtectionEvent_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProtectionEvent"
    ADD CONSTRAINT "ProtectionEvent_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProtectionEvent ProtectionEvent_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProtectionEvent"
    ADD CONSTRAINT "ProtectionEvent_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeIncidentNotification RealtimeIncidentNotification_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeIncidentNotification"
    ADD CONSTRAINT "RealtimeIncidentNotification_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeIncidentNotification RealtimeIncidentNotification_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeIncidentNotification"
    ADD CONSTRAINT "RealtimeIncidentNotification_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeIncidentNotification RealtimeIncidentNotification_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeIncidentNotification"
    ADD CONSTRAINT "RealtimeIncidentNotification_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeThreatEvent RealtimeThreatEvent_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeThreatEvent"
    ADD CONSTRAINT "RealtimeThreatEvent_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeThreatEvent RealtimeThreatEvent_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeThreatEvent"
    ADD CONSTRAINT "RealtimeThreatEvent_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RealtimeThreatEvent RealtimeThreatEvent_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RealtimeThreatEvent"
    ADD CONSTRAINT "RealtimeThreatEvent_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Screen Screen_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Screen"
    ADD CONSTRAINT "Screen_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SecurityEscalation SecurityEscalation_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityEscalation"
    ADD CONSTRAINT "SecurityEscalation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."SecurityIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SecurityIncidentTimeline SecurityIncidentTimeline_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncidentTimeline"
    ADD CONSTRAINT "SecurityIncidentTimeline_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."SecurityIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SecurityIncident SecurityIncident_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityIncident SecurityIncident_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityIncident SecurityIncident_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityIncident SecurityIncident_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityIncident SecurityIncident_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityIncident SecurityIncident_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityIncident"
    ADD CONSTRAINT "SecurityIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SecurityWorkflowExecution SecurityWorkflowExecution_workflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityWorkflowExecution"
    ADD CONSTRAINT "SecurityWorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES public."SecurityWorkflow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Show Show_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Show Show_screenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES public."Screen"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Show Show_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ThreatAlert ThreatAlert_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatAlert"
    ADD CONSTRAINT "ThreatAlert_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatAlert ThreatAlert_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatAlert"
    ADD CONSTRAINT "ThreatAlert_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatAlert ThreatAlert_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatAlert"
    ADD CONSTRAINT "ThreatAlert_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatAlert ThreatAlert_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatAlert"
    ADD CONSTRAINT "ThreatAlert_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatCorrelation ThreatCorrelation_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatCorrelation"
    ADD CONSTRAINT "ThreatCorrelation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."ThreatIntelligenceIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_investigationCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_investigationCaseId_fkey" FOREIGN KEY ("investigationCaseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelCampaign ThreatIntelCampaign_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelCampaign"
    ADD CONSTRAINT "ThreatIntelCampaign_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelFeed ThreatIntelFeed_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelFeed"
    ADD CONSTRAINT "ThreatIntelFeed_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."ThreatIntelSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelImport ThreatIntelImport_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelImport"
    ADD CONSTRAINT "ThreatIntelImport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."ThreatIntelSource"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelIndicator ThreatIntelIndicator_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelIndicator"
    ADD CONSTRAINT "ThreatIntelIndicator_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."ThreatIntelSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."ThreatIntelCampaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_evidenceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES public."EvidenceRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_indicatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES public."ThreatIntelIndicator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_investigationCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_investigationCaseId_fkey" FOREIGN KEY ("investigationCaseId") REFERENCES public."InvestigationCase"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelMatch ThreatIntelMatch_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelMatch"
    ADD CONSTRAINT "ThreatIntelMatch_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelObservation ThreatIntelObservation_indicatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelObservation"
    ADD CONSTRAINT "ThreatIntelObservation_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES public."ThreatIntelIndicator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelRelationship ThreatIntelRelationship_sourceIndicatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelRelationship"
    ADD CONSTRAINT "ThreatIntelRelationship_sourceIndicatorId_fkey" FOREIGN KEY ("sourceIndicatorId") REFERENCES public."ThreatIntelIndicator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelRelationship ThreatIntelRelationship_targetIndicatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelRelationship"
    ADD CONSTRAINT "ThreatIntelRelationship_targetIndicatorId_fkey" FOREIGN KEY ("targetIndicatorId") REFERENCES public."ThreatIntelIndicator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelSourceHealth ThreatIntelSourceHealth_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelSourceHealth"
    ADD CONSTRAINT "ThreatIntelSourceHealth_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."ThreatIntelSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatIntelligenceIncident ThreatIntelligenceIncident_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelligenceIncident"
    ADD CONSTRAINT "ThreatIntelligenceIncident_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelligenceIncident ThreatIntelligenceIncident_playbackSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelligenceIncident"
    ADD CONSTRAINT "ThreatIntelligenceIncident_playbackSessionId_fkey" FOREIGN KEY ("playbackSessionId") REFERENCES public."PlaybackSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelligenceIncident ThreatIntelligenceIncident_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelligenceIncident"
    ADD CONSTRAINT "ThreatIntelligenceIncident_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatIntelligenceIncident ThreatIntelligenceIncident_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatIntelligenceIncident"
    ADD CONSTRAINT "ThreatIntelligenceIncident_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatInvestigationLink ThreatInvestigationLink_patternId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatInvestigationLink"
    ADD CONSTRAINT "ThreatInvestigationLink_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES public."ThreatPattern"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatInvestigationLink ThreatInvestigationLink_predictionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatInvestigationLink"
    ADD CONSTRAINT "ThreatInvestigationLink_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES public."ThreatPrediction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatPattern ThreatPattern_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPattern"
    ADD CONSTRAINT "ThreatPattern_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatPattern ThreatPattern_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPattern"
    ADD CONSTRAINT "ThreatPattern_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatPattern ThreatPattern_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPattern"
    ADD CONSTRAINT "ThreatPattern_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatPrediction ThreatPrediction_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPrediction"
    ADD CONSTRAINT "ThreatPrediction_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatPrediction ThreatPrediction_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPrediction"
    ADD CONSTRAINT "ThreatPrediction_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatPrediction ThreatPrediction_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatPrediction"
    ADD CONSTRAINT "ThreatPrediction_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ThreatSignal ThreatSignal_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatSignal"
    ADD CONSTRAINT "ThreatSignal_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."ThreatIntelligenceIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ThreatSignal ThreatSignal_patternId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ThreatSignal"
    ADD CONSTRAINT "ThreatSignal_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES public."ThreatPattern"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ticket Ticket_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Verification Verification_activationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES public."Activation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Verification Verification_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Verification Verification_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Verification Verification_theatreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_theatreId_fkey" FOREIGN KEY ("theatreId") REFERENCES public."Theatre"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VideoAsset VideoAsset_contentAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoAsset"
    ADD CONSTRAINT "VideoAsset_contentAssetId_fkey" FOREIGN KEY ("contentAssetId") REFERENCES public."ContentAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VideoAsset VideoAsset_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoAsset"
    ADD CONSTRAINT "VideoAsset_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VideoAsset VideoAsset_productionCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoAsset"
    ADD CONSTRAINT "VideoAsset_productionCompanyId_fkey" FOREIGN KEY ("productionCompanyId") REFERENCES public."ProductionCompany"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CampaignIndicators _CampaignIndicators_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_CampaignIndicators"
    ADD CONSTRAINT "_CampaignIndicators_A_fkey" FOREIGN KEY ("A") REFERENCES public."ThreatIntelCampaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CampaignIndicators _CampaignIndicators_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_CampaignIndicators"
    ADD CONSTRAINT "_CampaignIndicators_B_fkey" FOREIGN KEY ("B") REFERENCES public."ThreatIntelIndicator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict iSRovTCKBV0ALDf1JBAD1806cMiPfVpmPZGNatZlD2Oniof3ILapFhgknVtys56

