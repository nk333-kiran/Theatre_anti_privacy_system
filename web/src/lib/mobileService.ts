import { API_BASE, getApiBaseUrl } from "./api";

export interface MobileUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  theatreId?: string | null;
  productionCompanyId?: string | null;
}

export interface MobileSessionData {
  sessionId: string;
  activationId: string;
  ticketId: string;
  ticketNumber: string;
  seatNumber: string;
  protectionStatus: "ACTIVE" | "EXPIRED" | "REVOKED";
  movie: {
    id: string;
    title: string;
    durationMinutes: number;
    language: string;
    rating: string | null;
  };
  theatre: {
    id: string;
    name: string;
    code: string;
    location: string;
  };
  screen: {
    id: string;
    name: string;
    screenNumber: number;
    capacity: number;
  };
  show: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
  };
  activatedAt: string;
  expiresAt: string | null;
  verifiedAt: string;
  staffName?: string;
}

export interface MobileSecurityEventPayload {
  eventType: string; // e.g. "MOBILE_SECURITY_EVENT"
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sessionId?: string;
  theatreId?: string;
  showId?: string;
  movieId?: string;
  activationId?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MobileSecurityEventResponse {
  eventId: string;
  correlationId: string;
  status: string;
  riskScore?: number;
  correlatedIncidentId?: string;
  warningRequired?: boolean;
  warningMessage?: string;
  timestamp: string;
}

const STORAGE_TOKEN_KEY = "mobile_token";
const STORAGE_USER_KEY = "mobile_user";
const STORAGE_ACTIVE_SESSION_KEY = "mobile_active_session";

// -------------------------------------------------------------
// AUTHENTICATION & SESSION PERSISTENCE
// -------------------------------------------------------------

export function getMobileAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_TOKEN_KEY) || localStorage.getItem("token") || null;
}

export function getMobileUser(): MobileUserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_USER_KEY) || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setMobileAuth(token: string, user: MobileUserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearMobileAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
  localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
}

export function getCachedActiveSession(): MobileSessionData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedActiveSession(session: MobileSessionData | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
  } else {
    localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, JSON.stringify(session));
  }
}

function getMobileAuthHeader(explicitToken?: string): Record<string, string> {
  const token = explicitToken || getMobileAuthToken() || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// -------------------------------------------------------------
// MOBILE API SERVICE
// -------------------------------------------------------------

export class MobileApiService {
  /**
   * Log into Mobile App using existing authentication system
   */
  public static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; token?: string; user?: MobileUserProfile; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) {
        setMobileAuth(data.data.token, data.data.user);
        return {
          success: true,
          token: data.data.token,
          user: data.data.user,
        };
      }
      return {
        success: false,
        message: data.message || "Invalid credentials",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to connect to authentication server",
      };
    }
  }

  /**
   * Scan & Verify Movie Ticket QR, activate session and return protected screening details
   */
  public static async verifyTicketQR(
    qrPayload: string,
    token?: string
  ): Promise<{ success: boolean; data?: MobileSessionData; message?: string; errorCode?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/verify-ticket`, {
        method: "POST",
        headers: getMobileAuthHeader(token),
        body: JSON.stringify({
          qrPayload,
          deviceFingerprint: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 100) : "mobile-web",
          clientTimestamp: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCachedActiveSession(json.data);
        return { success: true, data: json.data, message: json.message };
      }

      return {
        success: false,
        message: json.message || "QR Ticket Verification failed",
        errorCode: json.errorCode || "VERIFICATION_FAILED",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Network error connecting to security checkpoint",
        errorCode: "NETWORK_ERROR",
      };
    }
  }

  /**
   * Fetch secure signed QR token for existing ticket
   */
  public static async getSecureTicketQr(
    ticketId: string,
    token?: string
  ): Promise<{ success: boolean; data?: { ticketId: string; ticketNumber: string; seatNumber: string; qrToken: string; movieTitle: string; theatreName: string }; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/tickets/${encodeURIComponent(ticketId)}/qr`, {
        method: "GET",
        headers: getMobileAuthHeader(token),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
      return { success: false, message: json.message || "Failed to fetch ticket QR" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error fetching ticket QR" };
    }
  }

  /**
   * Retrieve active protected screening session by session ID
   */
  public static async getSession(
    sessionId: string,
    token?: string
  ): Promise<{ success: boolean; data?: MobileSessionData; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/session/${encodeURIComponent(sessionId)}`, {
        method: "GET",
        headers: getMobileAuthHeader(token),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCachedActiveSession(json.data);
        return { success: true, data: json.data };
      }

      return { success: false, message: json.message || "Session not found" };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to fetch session data" };
    }
  }

  /**
   * Fetch dynamic rotating session watermark
   */
  public static async getSessionWatermark(
    sessionId: string,
    token?: string
  ): Promise<{ success: boolean; data?: { watermarkId: string; sessionId: string; theatreCode: string; theatreName: string; screenName: string; seatNumber: string; timestamp: string; timeSlot: number; rotationIntervalSec: number; protectionStatus: string; displayString: string }; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/session/${encodeURIComponent(sessionId)}/watermark`, {
        method: "GET",
        headers: getMobileAuthHeader(token),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
      return { success: false, message: json.message || "Failed to load watermark" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error loading watermark" };
    }
  }

  /**
   * Look up which screening session produced a specific watermark identifier
   */
  public static async attributeWatermark(
    watermarkId: string,
    token?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/watermark/attribute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getMobileAuthHeader(token),
        },
        body: JSON.stringify({ watermarkId }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
      return { success: false, message: json.message || "Watermark attribution failed" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error attributing watermark" };
    }
  }

  /**
   * Record traceable forensic evidence in Evidence Vault
   */
  public static async createForensicEvidence(
    params: { watermarkId: string; sessionId: string; reason?: string; incidentId?: string },
    token?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/watermark/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getMobileAuthHeader(token),
        },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
      return { success: false, message: json.message || "Failed to record forensic evidence" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error recording evidence" };
    }
  }

  /**
   * Reusable Mobile Security Event Foundation: Dispatch security telemetry to SOC API
   */
  public static async sendSecurityEvent(
    event: MobileSecurityEventPayload,
    token?: string
  ): Promise<{ success: boolean; data?: MobileSecurityEventResponse; message?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/mobile/events`, {
        method: "POST",
        headers: getMobileAuthHeader(token),
        body: JSON.stringify({
          eventType: event.eventType || "MOBILE_SECURITY_EVENT",
          severity: event.severity || "MEDIUM",
          sessionId: event.sessionId,
          theatreId: event.theatreId,
          showId: event.showId,
          movieId: event.movieId,
          activationId: event.activationId,
          payload: event.payload || {},
          metadata: {
            ...event.metadata,
            clientTimestamp: new Date().toISOString(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 150) : "mobile-app",
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data, message: json.message };
      }

      return { success: false, message: json.message || "Failed to submit security event" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error while submitting security event" };
    }
  }
}
