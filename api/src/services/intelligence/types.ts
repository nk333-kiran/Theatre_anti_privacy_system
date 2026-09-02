export type ThreatPatternType =
  | "REPEATED_FAILED_ACCESS"
  | "SESSION_REPLAY"
  | "TOKEN_ABUSE"
  | "NETWORK_ANOMALY"
  | "WATERMARK_CORRELATION"
  | "DRM_ABUSE"
  | "COORDINATED_ATTACK";

export type RecommendedActionType =
  | "REVOKE_PLAYBACK_SESSION"
  | "REVOKE_ACTIVATION"
  | "REVOKE_DRM_LICENSE"
  | "BLOCK_VIDEO_ASSET"
  | "RATE_LIMIT_SOURCE"
  | "FLAG_SESSION"
  | "ESCALATE_INCIDENT"
  | "REQUIRE_MANUAL_REVIEW";

export interface SignalInput {
  signalType: ThreatPatternType | string;
  signalValue: string;
  riskWeight: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface RiskEvaluationResult {
  riskScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: SignalInput[];
  explanations: string[];
  recommendedAction: RecommendedActionType;
  requiresApproval: boolean;
}

export interface IntelligenceFeedItem {
  incidentId: string;
  incidentCode: string;
  title: string;
  severity: string;
  riskScore: number;
  confidenceScore: number;
  status: string;
  theatreId?: string | null;
  theatreName?: string | null;
  showId?: string | null;
  movieTitle?: string | null;
  signalCount: number;
  recommendedAction: string;
  explanations: string[];
  firstDetectedAt: string;
  lastDetectedAt: string;
}
