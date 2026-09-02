import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "THEATRE_ADMIN" | "THEATRE_STAFF" | "PRODUCTION_COMPANY";
  theatreId?: string | null;
  productionCompanyId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export interface VerificationItem {
  id: string;
  activationId?: string | null;
  theatreId?: string | null;
  showId?: string | null;
  staffId: string;
  result: "VERIFIED" | "DENIED";
  reason?: string | null;
  scannedCode?: string | null;
  createdAt: string | Date;
  staff?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  theatre?: {
    id: string;
    name: string;
    code: string;
    location: string;
  };
  show?: {
    id: string;
    startTime: string | Date;
    endTime: string | Date;
    movie: {
      title: string;
    };
    screen: {
      name: string;
    };
  };
  activation?: {
    id: string;
    activationCode: string;
    status: string;
    ticket?: {
      ticketNumber: string;
      seatNumber: string;
      status: string;
    };
  };
}

export interface VerificationStats {
  totalScans: number;
  verifiedCount: number;
  deniedCount: number;
  activeTheatres: number;
}

export type ProtectionEventType =
  | "SESSION_STARTED"
  | "SESSION_HEARTBEAT"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "PLAYER_STARTED"
  | "PLAYER_STOPPED"
  | "FULLSCREEN_ENTERED"
  | "FULLSCREEN_EXITED"
  | "SCREENSHOT_ATTEMPT_DETECTED";

export interface WatermarkPayload {
  shortActivationId: string;
  sessionId: string;
  theatreCode: string;
  theatreName: string;
  screenName: string;
  seatNumber: string;
  movieTitle: string;
  timestamp: string;
}

export interface ProtectionSessionInfo {
  sessionId: string;
  activationId: string;
  ticketNumber: string;
  seatNumber: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  theatreName: string;
  theatreCode: string;
  screenName: string;
  movieTitle: string;
  startTime: string;
  endTime: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  watermark: WatermarkPayload;
}

export interface ProtectionEventItem {
  id: string;
  activationId: string;
  theatreId?: string | null;
  showId?: string | null;
  eventType: ProtectionEventType;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
  theatre?: {
    name: string;
    code: string;
  } | null;
  show?: {
    movie: {
      title: string;
    };
    screen: {
      name: string;
    };
  } | null;
  activation?: {
    activationCode: string;
    status: string;
    ticket?: {
      ticketNumber: string;
      seatNumber: string;
    };
  };
}

export interface ProtectionMonitoringStats {
  activeSessions: number;
  expiredSessions: number;
  revokedSessions: number;
  totalEvents: number;
  securityThreats: number;
}

// ---------------- PRODUCTION COMPANY & CONTENT MANAGEMENT (PHASE 7) ----------------
export type ContentStatus = "DRAFT" | "UPLOADING" | "PROCESSING" | "READY" | "PUBLISHED" | "ARCHIVED";
export type ReleaseStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface ProductionCompanyItem {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone?: string | null;
  status: string;
  _count?: {
    movies: number;
    releases: number;
    users: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ContentAssetItem {
  id: string;
  movieId: string;
  assetType: string;
  processingStatus: string;
  durationMinutes?: number | null;
  resolution?: string | null;
  fileReference: string;
  fileSizeMb?: number | null;
  createdAt: string | Date;
}

export interface MovieReleaseItem {
  id: string;
  movieId: string;
  productionCompanyId: string;
  theatreId: string;
  screenId?: string | null;
  startDate: string | Date;
  endDate: string | Date;
  status: ReleaseStatus;
  rejectionReason?: string | null;
  approvedByAdminId?: string | null;
  approvedAt?: string | Date | null;
  createdAt: string | Date;
  movie?: {
    title: string;
    durationMinutes: number;
    rating?: string | null;
    language: string;
  };
  productionCompany?: {
    name: string;
    code: string;
  };
  theatre?: {
    name: string;
    code: string;
    location: string;
  };
  screen?: {
    name: string;
    screenNumber: number;
  } | null;
}

export interface MovieAuditEventItem {
  id: string;
  movieId?: string | null;
  releaseId?: string | null;
  userId?: string | null;
  action: string;
  details?: string | null;
  createdAt: string | Date;
  movie?: {
    title: string;
  } | null;
  release?: {
    id: string;
    status: string;
    theatre?: {
      name: string;
    };
  } | null;
}

export interface ProductionCompanyDashboardStats {
  totalMovies: number;
  activeReleases: number;
  assignedTheatres: number;
  activeProtectionSessions: number;
  protectionEvents: number;
}



