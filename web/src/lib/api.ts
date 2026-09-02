export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("antipiracy_custom_api_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl.replace(/\/+$/, "");
    }
    if (window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      const protocol = window.location.protocol || "http:";
      return `${protocol}//${window.location.hostname}:4000/api`;
    }
    if (envUrl) return envUrl.replace(/\/+$/, "");
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
}

export function setCustomApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("antipiracy_custom_api_url", url.trim());
    } else {
      localStorage.removeItem("antipiracy_custom_api_url");
    }
  }
}

export function resetCustomApiBaseUrl(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("antipiracy_custom_api_url");
  }
}

export const API_BASE = (function () {
  if (typeof window !== "undefined") {
    return getApiBaseUrl();
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
})();

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  theatreId?: string | null;
  productionCompanyId?: string | null;
}

export interface ScreenItem {
  id: string;
  theatreId: string;
  screenNumber: number;
  name: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface TheatreItem {
  id: string;
  name: string;
  code: string;
  permanentQrCode?: string | null;
  location: string;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  screens: ScreenItem[];
  _count?: {
    shows: number;
    screens: number;
  };
  createdAt: string;
}

export interface MovieItem {
  id: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  language: string;
  rating?: string | null;
  posterUrl?: string | null;
  _count?: {
    shows: number;
  };
  createdAt: string;
}

export interface ShowItem {
  id: string;
  theatreId: string;
  theatre: {
    id: string;
    name: string;
    code: string;
    location: string;
  };
  screenId: string;
  screen: {
    id: string;
    name: string;
    screenNumber: number;
    capacity: number;
  };
  movieId: string;
  movie: {
    id: string;
    title: string;
    durationMinutes: number;
    language: string;
    rating?: string | null;
  };
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  _count?: {
    tickets: number;
  };
  createdAt: string;
}

export interface ActivationItem {
  id: string;
  ticketId: string;
  activationCode: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  activatedAt?: string | null;
  expiresAt?: string | null;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface TicketItem {
  id: string;
  ticketNumber: string;
  showId: string;
  seatNumber: string;
  price: string | number;
  status: "ISSUED" | "ACTIVATED" | "USED" | "CANCELLED";
  activation?: ActivationItem | null;
  show: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    movie: {
      title: string;
      durationMinutes: number;
      rating?: string | null;
      language: string;
    };
    theatre: {
      name: string;
      location: string;
      code: string;
    };
    screen: {
      name: string;
      screenNumber: number;
      capacity: number;
    };
  };
  createdAt: string;
}

export interface DashboardStats {
  totalTheatres: number;
  totalScreens: number;
  totalMovies: number;
  upcomingShows: number;
  ticketsIssued: number;
  activeVerifications: number;
}

function getAuthHeader(token?: string) {
  const t = token || (typeof window !== "undefined" ? localStorage.getItem("token") : "");
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchDashboardStats(token?: string): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeader(token),
    });
    const result = await res.json();
    if (result.success && result.data) return result.data;
  } catch (err) {
    console.warn("fetchDashboardStats error:", err);
  }
  return {
    totalTheatres: 0,
    totalScreens: 0,
    totalMovies: 0,
    upcomingShows: 0,
    ticketsIssued: 0,
    activeVerifications: 0,
  };
}

// ---------------- THEATRE API ----------------
export async function fetchTheatres(token?: string): Promise<TheatreItem[]> {
  const res = await fetch(`${API_BASE}/theatres`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success && json.data) return json.data;
  throw new Error(json.message || "Failed to load theatres");
}

export async function createTheatre(
  data: {
    name: string;
    code: string;
    location: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    initialScreensCount?: number;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/theatres`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTheatre(
  id: string,
  data: Partial<TheatreItem>,
  token?: string
) {
  const res = await fetch(`${API_BASE}/theatres/${id}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTheatre(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/theatres/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function regenerateTheatreQr(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/theatres/${id}/regenerate-qr`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// Public Permanent Theatre QR Landing Endpoints (Phase 5)
export interface PublicTheatreDirectory {
  theatre: {
    id: string;
    name: string;
    code: string;
    permanentQrCode: string;
    location: string;
    address?: string | null;
  };
  shows: ShowItem[];
}

export async function fetchTheatreByQrCode(code: string): Promise<{ success: boolean; data?: PublicTheatreDirectory; message?: string }> {
  const res = await fetch(`${API_BASE}/theatres/public/qr/${encodeURIComponent(code)}`);
  return res.json();
}

export async function associateTicketViaTheatreQr(data: {
  theatreQrCode: string;
  showId: string;
  ticketIdentifier: string;
  deviceFingerprint?: string;
}) {
  const res = await fetch(`${API_BASE}/theatres/public/associate-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addScreenToTheatre(
  theatreId: string,
  data: { screenNumber: number; name: string; capacity: number },
  token?: string
) {
  const res = await fetch(`${API_BASE}/theatres/${theatreId}/screens`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateScreen(
  screenId: string,
  data: { screenNumber?: number; name?: string; capacity?: number },
  token?: string
) {
  const res = await fetch(`${API_BASE}/theatres/screens/${screenId}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteScreen(screenId: string, token?: string) {
  const res = await fetch(`${API_BASE}/theatres/screens/${screenId}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ---------------- MOVIE API ----------------
export async function fetchMovies(token?: string): Promise<MovieItem[]> {
  const res = await fetch(`${API_BASE}/movies`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success && json.data) return json.data;
  throw new Error(json.message || "Failed to load movies");
}

export async function createMovie(
  data: {
    title: string;
    description?: string;
    durationMinutes: number;
    language: string;
    rating?: string;
    posterUrl?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/movies`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMovie(
  id: string,
  data: Partial<MovieItem>,
  token?: string
) {
  const res = await fetch(`${API_BASE}/movies/${id}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMovie(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/movies/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ---------------- SHOW API ----------------
export async function fetchShows(
  filters?: { theatreId?: string; screenId?: string; status?: string },
  token?: string
): Promise<ShowItem[]> {
  const params = new URLSearchParams();
  if (filters?.theatreId) params.append("theatreId", filters.theatreId);
  if (filters?.screenId) params.append("screenId", filters.screenId);
  if (filters?.status) params.append("status", filters.status);

  const res = await fetch(`${API_BASE}/shows?${params.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success && json.data) return json.data;
  throw new Error(json.message || "Failed to load shows");
}

export async function createShow(
  data: {
    theatreId: string;
    screenId: string;
    movieId: string;
    startTime: string;
    endTime?: string;
    status?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/shows`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateShow(
  id: string,
  data: {
    theatreId?: string;
    screenId?: string;
    movieId?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/shows/${id}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function cancelShow(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/shows/${id}/cancel`, {
    method: "PATCH",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function deleteShow(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/shows/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ---------------- TICKET API (PHASE 3) ----------------
export async function fetchTickets(
  filters?: { showId?: string; theatreId?: string; status?: string; search?: string },
  token?: string
): Promise<TicketItem[]> {
  const params = new URLSearchParams();
  if (filters?.showId) params.append("showId", filters.showId);
  if (filters?.theatreId) params.append("theatreId", filters.theatreId);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);

  const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success && json.data) return json.data;
  throw new Error(json.message || "Failed to load tickets");
}

export async function createTickets(
  data: {
    showId: string;
    seats?: string[];
    seatNumber?: string;
    price?: number;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function cancelTicket(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/tickets/${id}/cancel`, {
    method: "PATCH",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ---------------- ACTIVATION API (PHASE 3 MOBILE SCANNER) ----------------
export interface VerificationData {
  activationId: string;
  activationStatus: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  activatedAt?: string | null;
  expiresAt?: string | null;
  ticketId: string;
  seatNumber: string;
  ticketStatus: string;
  movie: {
    title: string;
    durationMinutes: number;
    rating?: string | null;
    language: string;
  };
  theatre: {
    name: string;
    location: string;
    code: string;
  };
  screen: {
    name: string;
    screenNumber: number;
  };
  show: {
    startTime: string;
    endTime: string;
    status: string;
  };
}

export async function verifyActivationToken(code: string) {
  const res = await fetch(`${API_BASE}/activations/verify/${encodeURIComponent(code)}`);
  return res.json();
}

export async function activateTicketCode(code: string, deviceFingerprint?: string) {
  const res = await fetch(`${API_BASE}/activations/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, deviceFingerprint }),
  });
  return res.json();
}

// ---------------- SECURITY STAFF VERIFICATION API (PHASE 4) ----------------
export interface SecurityVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    result: "VERIFIED" | "DENIED";
    reason?: string;
    description?: string;
    verificationId?: string;
    activationId?: string;
    ticketNumber?: string;
    seatNumber?: string;
    movieTitle?: string;
    theatreName?: string;
    screenName?: string;
    startTime?: string;
    endTime?: string;
    activatedAt?: string;
    expiresAt?: string;
    verifiedAt?: string;
    timestamp?: string;
    staffName?: string;
    scannedToken?: string;
  };
}

export interface VerificationLogItem {
  id: string;
  activationId?: string | null;
  theatreId?: string | null;
  showId?: string | null;
  staffId: string;
  result: "VERIFIED" | "DENIED";
  reason?: string | null;
  scannedCode?: string | null;
  createdAt: string;
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
    startTime: string;
    endTime: string;
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

export async function verifySecurityEntry(
  code: string,
  theatreId?: string,
  token?: string
): Promise<SecurityVerificationResponse> {
  const res = await fetch(`${API_BASE}/verifications/verify`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify({ code, theatreId }),
  });
  return res.json();
}

export async function fetchVerifications(
  params?: {
    theatreId?: string;
    showId?: string;
    result?: string;
    search?: string;
  },
  token?: string
): Promise<VerificationLogItem[]> {
  const query = new URLSearchParams();
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.showId) query.append("showId", params.showId);
  if (params?.result) query.append("result", params.result);
  if (params?.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE}/verifications?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load verifications");
}

export async function fetchVerificationStats(
  token?: string
): Promise<VerificationStats> {
  const res = await fetch(`${API_BASE}/verifications/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    totalScans: 0,
    verifiedCount: 0,
    deniedCount: 0,
    activeTheatres: 0,
  };
}

// ---------------- DYNAMIC ANTI-PIRACY PROTECTION API (PHASE 6) ----------------
export type ProtectionEventType =
  | "SESSION_STARTED"
  | "SESSION_HEARTBEAT"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "PLAYER_STARTED"
  | "PLAYER_STOPPED"
  | "FULLSCREEN_ENTERED"
  | "FULLSCREEN_EXITED"
  | "SCREENSHOT_ATTEMPT_DETECTED"
  | "PLAYBACK_AUTHORIZED"
  | "PLAYBACK_DENIED"
  | "PLAYBACK_STARTED"
  | "PLAYBACK_STOPPED"
  | "PLAYBACK_TERMINATED"
  | "PLAYBACK_AUTH_EXPIRED";

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
  createdAt: string;
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

export async function startProtectionSession(
  token: string,
  deviceFingerprint?: string
): Promise<{ success: boolean; data?: ProtectionSessionInfo; message?: string }> {
  const res = await fetch(`${API_BASE}/protection/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, deviceFingerprint }),
  });
  return res.json();
}

export async function sendSessionHeartbeat(
  activationId: string,
  sessionId?: string
): Promise<{ success: boolean; data?: { active: boolean; status: string; currentTimestamp?: string; reason?: string; expiresAt?: string | null }; message?: string }> {
  const res = await fetch(`${API_BASE}/protection/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activationId, sessionId }),
  });
  return res.json();
}

export async function recordProtectionEvent(
  activationId: string,
  eventType: ProtectionEventType,
  metadata?: string
) {
  const res = await fetch(`${API_BASE}/protection/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activationId, eventType, metadata }),
  });
  return res.json();
}

export async function revokeProtectionSession(
  activationId: string,
  reason?: string,
  token?: string
) {
  const res = await fetch(`${API_BASE}/protection/session/revoke`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify({ activationId, reason }),
  });
  return res.json();
}

export async function fetchProtectionSessions(
  params?: { status?: string; theatreId?: string },
  token?: string
): Promise<ActivationItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.theatreId) query.append("theatreId", params.theatreId);

  const res = await fetch(`${API_BASE}/protection/sessions?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load protection sessions");
}

export async function fetchProtectionEvents(
  params?: { eventType?: string; theatreId?: string; showId?: string },
  token?: string
): Promise<ProtectionEventItem[]> {
  const query = new URLSearchParams();
  if (params?.eventType) query.append("eventType", params.eventType);
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.showId) query.append("showId", params.showId);

  const res = await fetch(`${API_BASE}/protection/events?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load protection events");
}

export async function fetchProtectionStats(
  token?: string
): Promise<ProtectionMonitoringStats> {
  const res = await fetch(`${API_BASE}/protection/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    activeSessions: 0,
    expiredSessions: 0,
    revokedSessions: 0,
    totalEvents: 0,
    securityThreats: 0,
  };
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
}

export interface MovieReleaseItem {
  id: string;
  movieId: string;
  productionCompanyId: string;
  theatreId: string;
  screenId?: string | null;
  startDate: string;
  endDate: string;
  status: ReleaseStatus;
  rejectionReason?: string | null;
  approvedByAdminId?: string | null;
  approvedAt?: string | null;
  createdAt: string;
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
  createdAt: string;
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

export async function fetchProductionCompanies(
  params?: { status?: string; search?: string },
  token?: string
): Promise<ProductionCompanyItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE}/production/companies?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load production companies");
}

export async function createProductionCompany(
  data: { name: string; code: string; contactEmail: string; contactPhone?: string },
  token?: string
): Promise<{ success: boolean; data?: ProductionCompanyItem; message?: string }> {
  const res = await fetch(`${API_BASE}/production/companies`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProductionCompany(
  id: string,
  data: Partial<ProductionCompanyItem>,
  token?: string
): Promise<{ success: boolean; data?: ProductionCompanyItem; message?: string }> {
  const res = await fetch(`${API_BASE}/production/companies/${id}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchProductionMovies(
  params?: { contentStatus?: string; search?: string; productionCompanyId?: string },
  token?: string
): Promise<MovieItem[]> {
  const query = new URLSearchParams();
  if (params?.contentStatus) query.append("contentStatus", params.contentStatus);
  if (params?.search) query.append("search", params.search);
  if (params?.productionCompanyId) query.append("productionCompanyId", params.productionCompanyId);

  const res = await fetch(`${API_BASE}/production/movies?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load production movies");
}

export async function createProductionMovie(
  data: {
    title: string;
    description?: string;
    synopsis?: string;
    durationMinutes: number;
    language: string;
    rating?: string;
    posterUrl?: string;
    releaseDate?: string;
    contentStatus?: ContentStatus;
    productionCompanyId?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/production/movies`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProductionMovie(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    synopsis: string;
    durationMinutes: number;
    language: string;
    rating: string;
    posterUrl: string;
    releaseDate: string;
    contentStatus: ContentStatus;
    productionCompanyId: string;
  }>,
  token?: string
) {
  const res = await fetch(`${API_BASE}/production/movies/${id}`, {
    method: "PUT",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addContentAsset(
  movieId: string,
  data: {
    assetType: string;
    resolution?: string;
    durationMinutes?: number;
    fileReference: string;
    fileSizeMb?: number;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/production/movies/${movieId}/assets`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteContentAsset(assetId: string, token?: string) {
  const res = await fetch(`${API_BASE}/production/movies/assets/${assetId}`, {
    method: "DELETE",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchMovieReleases(
  params?: { status?: string; theatreId?: string; movieId?: string },
  token?: string
): Promise<MovieReleaseItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.movieId) query.append("movieId", params.movieId);

  const res = await fetch(`${API_BASE}/production/releases?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load movie releases");
}

export async function createMovieRelease(
  data: {
    movieId: string;
    theatreId: string;
    screenId?: string;
    startDate: string;
    endDate: string;
  },
  token?: string
) {
  const res = await fetch(`${API_BASE}/production/releases`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function approveMovieRelease(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/production/releases/${id}/approve`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function rejectMovieRelease(id: string, reason?: string, token?: string) {
  const res = await fetch(`${API_BASE}/production/releases/${id}/reject`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function fetchMovieAudits(
  params?: { movieId?: string; releaseId?: string },
  token?: string
): Promise<MovieAuditEventItem[]> {
  const query = new URLSearchParams();
  if (params?.movieId) query.append("movieId", params.movieId);
  if (params?.releaseId) query.append("releaseId", params.releaseId);

  const res = await fetch(`${API_BASE}/production/audits?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load movie audits");
}

export async function fetchProductionDashboardStats(
  token?: string
): Promise<ProductionCompanyDashboardStats> {
  const res = await fetch(`${API_BASE}/production/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    totalMovies: 0,
    activeReleases: 0,
    assignedTheatres: 0,
    activeProtectionSessions: 0,
    protectionEvents: 0,
  };
}

// ---------------- SECURE PLAYBACK & VIDEO DELIVERY (PHASE 8) ----------------
export type VideoAssetState = "CREATED" | "PROCESSING" | "READY" | "BLOCKED" | "ARCHIVED";
export type PlaybackSessionStatus = "AUTHORIZED" | "ACTIVE" | "EXPIRED" | "TERMINATED" | "DENIED";

export interface DrmMetadata {
  scheme: string;
  keyId: string;
  licenseServerUrl: string;
  encryptionMode?: string;
}

export interface PlaybackAuthorizationResponse {
  playbackToken: string;
  deliveryManifestUrl: string;
  expiresAt: string;
  drmMetadata: DrmMetadata;
  watermark: WatermarkPayload;
  sessionInfo: {
    sessionId: string;
    activationId: string;
    ticketNumber: string;
    seatNumber: string;
    status: string;
    theatreName: string;
    theatreCode: string;
    screenName: string;
    movieTitle: string;
    durationMinutes: number;
  };
}

export interface PlaybackSessionItem {
  id: string;
  sessionToken: string;
  activationId: string;
  videoAssetId: string;
  theatreId: string;
  showId: string;
  status: PlaybackSessionStatus;
  ipAddress?: string | null;
  authorizedAt: string;
  expiresAt: string;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  lastHeartbeatAt?: string | null;
  videoAsset?: {
    title: string;
    state: VideoAssetState;
    movie: {
      title: string;
      durationMinutes: number;
    };
    productionCompany?: {
      name: string;
      code: string;
    };
  };
  theatre?: {
    name: string;
    code: string;
    location: string;
  };
  show?: {
    screen: {
      name: string;
    };
  };
  activation?: {
    ticket?: {
      ticketNumber: string;
      seatNumber: string;
    };
  };
}

export interface PlaybackStats {
  activeStreams: number;
  authorizedStreams: number;
  expiredSessions: number;
  terminatedSessions: number;
  deniedAttempts: number;
}

export async function authorizePlayback(
  token: string,
  deviceFingerprint?: string
): Promise<{ success: boolean; data?: PlaybackAuthorizationResponse; message?: string }> {
  const res = await fetch(`${API_BASE}/playback/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, deviceFingerprint }),
  });
  return res.json();
}

export async function startPlaybackStreamSession(playbackToken: string) {
  const res = await fetch(`${API_BASE}/playback/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playbackToken }),
  });
  return res.json();
}

export async function sendPlaybackHeartbeat(
  playbackToken: string,
  activationId: string
): Promise<{ success: boolean; data?: { active: boolean; reason?: string; expiresAt?: string }; message?: string }> {
  const res = await fetch(`${API_BASE}/playback/session/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playbackToken, activationId }),
  });
  return res.json();
}

export async function terminatePlaybackStreamSession(playbackToken: string, reason?: string) {
  const res = await fetch(`${API_BASE}/playback/session/terminate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playbackToken, reason }),
  });
  return res.json();
}

export async function fetchPlaybackSessions(
  params?: { status?: string; theatreId?: string },
  token?: string
): Promise<PlaybackSessionItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.theatreId) query.append("theatreId", params.theatreId);

  const res = await fetch(`${API_BASE}/playback/sessions?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load playback sessions");
}

export async function fetchPlaybackStats(token?: string): Promise<PlaybackStats> {
  const res = await fetch(`${API_BASE}/playback/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    activeStreams: 0,
    authorizedStreams: 0,
    expiredSessions: 0,
    terminatedSessions: 0,
    deniedAttempts: 0,
  };
}

// ---------------- VIDEO ASSETS & HLS PROCESSING (PHASE 9A) ----------------
export type ProcessingStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED";

export interface VideoAssetItem {
  id: string;
  title: string;
  movieId: string;
  movie?: {
    id: string;
    title: string;
    durationMinutes: number;
    language: string;
    contentStatus: string;
  };
  productionCompany?: {
    id: string;
    name: string;
    code: string;
  };
  state: VideoAssetState;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  processingError?: string | null;
  processingLogs?: string | null;
  originalFilename?: string | null;
  fileSizeMb?: number | null;
  resolution?: string | null;
  durationSeconds?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  streamKey: string;
  deliveryManifestUrl: string;
  hasThumbnail: boolean;
  thumbnailUrl?: string | null;
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
  createdAt: string;
}

export interface FFmpegDiagnostics {
  available: boolean;
  ffmpegPath?: string;
  ffprobePath?: string;
  version?: string;
  error?: string;
}

export async function uploadVideoAsset(
  formData: FormData,
  onProgress?: (percent: number) => void,
  token?: string
): Promise<{ success: boolean; data?: VideoAssetItem; message?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/video-assets/upload`);

    const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        resolve(json);
      } catch (err) {
        reject(new Error("Failed to parse server response"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during video upload"));
    };

    xhr.send(formData);
  });
}

export async function fetchVideoAssets(
  params?: { movieId?: string; processingStatus?: string },
  token?: string
): Promise<VideoAssetItem[]> {
  const query = new URLSearchParams();
  if (params?.movieId) query.append("movieId", params.movieId);
  if (params?.processingStatus) query.append("processingStatus", params.processingStatus);

  const res = await fetch(`${API_BASE}/video-assets?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load video assets");
}

export async function fetchVideoAssetById(
  id: string,
  token?: string
): Promise<VideoAssetItem> {
  const res = await fetch(`${API_BASE}/video-assets/${id}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load video asset details");
}

export async function fetchVideoAssetStatus(
  id: string,
  token?: string
): Promise<{
  id: string;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  processingError?: string | null;
  resolution?: string | null;
  durationSeconds?: number | null;
  streamKey: string;
  deliveryManifestUrl: string;
}> {
  const res = await fetch(`${API_BASE}/video-assets/${id}/status`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to poll asset status");
}

export async function processVideoAsset(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/video-assets/${id}/process`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function retryVideoAssetProcessing(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/video-assets/${id}/retry`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchFFmpegDiagnostics(token?: string): Promise<FFmpegDiagnostics> {
  const res = await fetch(`${API_BASE}/video-assets/diagnostics/ffmpeg`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    available: false,
    error: "Failed to query FFmpeg diagnostics",
  };
}

// ---------------- DRM INTEGRATION & LICENSING (PHASE 9B) ----------------
export type DrmProviderType = "MOCK" | "WIDEVINE" | "PLAYREADY" | "FAIRPLAY" | "CUSTOM";
export type DrmStatus = "NOT_CONFIGURED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "REVOKED";
export type DrmLicenseStatus = "ISSUED" | "ACTIVE" | "EXPIRED" | "REVOKED" | "DENIED";

export interface DrmProviderStatus {
  configured: boolean;
  provider: string;
  status: "READY" | "NOT_CONFIGURED" | "DEGRADED";
  isDevelopmentOnly: boolean;
  supportedSchemes: string[];
  capabilities: {
    widevine: boolean;
    playready: boolean;
    fairplay: boolean;
    hardwareDrmReady: boolean;
  };
  serverTimestamp: string;
}

export interface DrmAssetItem {
  id: string;
  videoAssetId: string;
  provider: DrmProviderType;
  drmScheme: string;
  keyId: string;
  encryptedManifestUrl?: string | null;
  licenseServerUrl?: string | null;
  status: DrmStatus;
  statusMessage?: string | null;
  encryptionProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrmLicenseItem {
  id: string;
  drmAssetId: string;
  playbackSessionId?: string | null;
  activationId: string;
  theatreId: string;
  showId: string;
  licenseToken: string;
  status: DrmLicenseStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  drmAsset?: {
    keyId: string;
    drmScheme: string;
    provider: DrmProviderType;
    videoAsset?: {
      title: string;
      movie?: { title: string };
      productionCompany?: { name: string; code: string };
    };
  };
  theatre?: { name: string; code: string };
  show?: { id: string; startTime: string };
  activation?: {
    ticket?: { ticketNumber: string; seatNumber: string };
  };
}

export interface DrmMonitoringStats {
  providerStatus: DrmProviderStatus;
  drmReadyAssets: number;
  pendingDrmAssets: number;
  activeLicenses: number;
  revokedLicenses: number;
  expiredLicenses: number;
  deniedLicenseRequests: number;
}

export async function fetchDrmStatus(token?: string): Promise<DrmProviderStatus> {
  const res = await fetch(`${API_BASE}/drm/status`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return {
    configured: false,
    provider: "mock",
    status: "NOT_CONFIGURED",
    isDevelopmentOnly: true,
    supportedSchemes: [],
    capabilities: {
      widevine: false,
      playready: false,
      fairplay: false,
      hardwareDrmReady: false,
    },
    serverTimestamp: new Date().toISOString(),
  };
}

export async function prepareAssetDrm(
  assetId: string,
  token?: string
): Promise<{ success: boolean; data?: DrmAssetItem; message?: string }> {
  const res = await fetch(`${API_BASE}/drm/assets/${assetId}/prepare`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchAssetDrmStatus(
  assetId: string,
  token?: string
): Promise<{ success: boolean; data?: DrmAssetItem; message?: string }> {
  const res = await fetch(`${API_BASE}/drm/assets/${assetId}/status`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function revokeAssetDrm(
  assetId: string,
  reason?: string,
  token?: string
) {
  const res = await fetch(`${API_BASE}/drm/assets/${assetId}/revoke`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function requestDrmLicense(
  sessionToken: string,
  keyId?: string,
  challenge?: string
): Promise<{
  success: boolean;
  data?: {
    authorized: boolean;
    licenseToken: string;
    keyId: string;
    licensePayload: string;
    scheme: string;
    expiresAt: string;
  };
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/drm/license`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, keyId, challenge }),
  });
  return res.json();
}

export async function fetchDrmMonitoringStats(token?: string): Promise<DrmMonitoringStats> {
  const res = await fetch(`${API_BASE}/drm/monitoring/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load DRM monitoring stats");
}

export async function fetchDrmLicenses(
  params?: { status?: string; theatreId?: string },
  token?: string
): Promise<DrmLicenseItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.theatreId) query.append("theatreId", params.theatreId);

  const res = await fetch(`${API_BASE}/drm/monitoring/licenses?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load DRM licenses");
}

// ---------------- SECURITY HARDENING & SOC (PHASE 10) ----------------
export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "ROLE_ACCESS_DENIED"
  | "TICKET_CREATED"
  | "TICKET_CANCELLED"
  | "QR_ACTIVATION"
  | "QR_ACTIVATION_DENIED"
  | "STAFF_VERIFICATION"
  | "PLAYBACK_AUTHORIZED"
  | "PLAYBACK_DENIED"
  | "PLAYBACK_TERMINATED"
  | "DRM_LICENSE_AUTHORIZED"
  | "DRM_LICENSE_DENIED"
  | "DRM_LICENSE_REVOKED"
  | "SUSPICIOUS_ACTIVITY"
  | "RATE_LIMIT_EXCEEDED";

export type SecuritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityAuditLogItem {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  theatreId?: string | null;
  showId?: string | null;
  activationId?: string | null;
  ticketId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  endpoint?: string | null;
  actionSummary: string;
  metadata?: string | null;
  isThreat: boolean;
  threatDetails?: string | null;
  createdAt: string;
}

export interface SecurityStats {
  threatLevel: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  totalThreats24h: number;
  failedLogins24h: number;
  deniedActivations24h: number;
  deniedCheckpoints24h: number;
  deniedDrm24h: number;
  rateLimitEvents24h: number;
  totalEvents24h: number;
  criticalEventsCount: number;
  activeRevokedTokens: number;
  uniqueThreatSources24h: number;
}

export async function fetchSecurityStats(token?: string): Promise<SecurityStats> {
  const res = await fetch(`${API_BASE}/security/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load security statistics");
}

export async function fetchSecurityAuditLogs(
  params?: {
    eventType?: string;
    severity?: string;
    theatreId?: string;
    isThreat?: boolean;
    limit?: number;
    offset?: number;
  },
  token?: string
): Promise<{ logs: SecurityAuditLogItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.eventType) query.append("eventType", params.eventType);
  if (params?.severity) query.append("severity", params.severity);
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.isThreat !== undefined) query.append("isThreat", String(params.isThreat));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.offset) query.append("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/security/audit-logs?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load security audit logs");
}

export async function fetchActiveThreats(token?: string): Promise<SecurityAuditLogItem[]> {
  const res = await fetch(`${API_BASE}/security/threats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  return [];
}

export async function revokeSessionToken(
  tokenToRevoke: string,
  targetUserId: string,
  reason?: string,
  authToken?: string
) {
  const res = await fetch(`${API_BASE}/security/tokens/revoke`, {
    method: "POST",
    headers: { ...getAuthHeader(authToken), "Content-Type": "application/json" },
    body: JSON.stringify({ token: tokenToRevoke, targetUserId, reason }),
  });
  return res.json();
}

export interface OperationsHealthData {
  systemHealth: {
    api: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
    database: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
    drm: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
    videoDelivery: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
    storage: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
  };
  infrastructure: {
    environment: string;
    version: string;
    databasePingMs: number;
    drmProvider: string;
    storageDriver: string;
    maintenanceMode: boolean;
  };
  threatMetrics: {
    threatLevel: "LOW" | "ELEVATED" | "CRITICAL";
    totalThreats24h: number;
    failedLogins24h: number;
    deniedActivations24h: number;
    deniedCheckpoints24h: number;
    deniedDrm24h: number;
    rateLimitEvents24h: number;
  };
  timestamp: string;
}

export interface OperationsMetricsData {
  performance: {
    uptimeSeconds: number;
    totalRequests: number;
    totalErrors: number;
    errorRatePercent: number;
    activeRequests: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
    requestsPerMinute: number;
    rateLimitViolations: number;
    authFailures: number;
    playbackAuthFailures: number;
    drmAuthFailures: number;
    statusCodeCounts: Record<string, number>;
    topEndpoints: { endpoint: string; count: number }[];
  };
  platform: {
    activePlaybackSessions: number;
    activeActivations: number;
    activeDrmLicenses: number;
    totalSecurityEvents: number;
  };
  timestamp: string;
}

export interface OperationsDependenciesData {
  database: {
    status: string;
    provider: string;
    pingMs: number;
  };
  drm: {
    status: string;
    provider: string;
    capabilities: Record<string, boolean>;
    isDevelopmentOnly: boolean;
  };
  videoProcessing: {
    available: boolean;
    ffmpegVersion?: string;
  };
  storage: {
    driver: string;
    status: string;
    isCloudStorage: boolean;
  };
  timestamp: string;
}

export async function fetchOperationsHealth(token?: string): Promise<OperationsHealthData> {
  const res = await fetch(`${API_BASE}/operations/health`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load operational health");
}

export async function fetchOperationsMetrics(token?: string): Promise<OperationsMetricsData> {
  const res = await fetch(`${API_BASE}/operations/metrics`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load performance metrics");
}

export async function fetchOperationsDependencies(token?: string): Promise<OperationsDependenciesData> {
  const res = await fetch(`${API_BASE}/operations/dependencies`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load dependency diagnostics");
}

export async function toggleMaintenanceMode(
  enabled: boolean,
  message?: string,
  token?: string
): Promise<{ success: boolean; data: { enabled: boolean; message: string } }> {
  const res = await fetch(`${API_BASE}/operations/maintenance`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, message }),
  });
  return res.json();
}

export interface BackupItem {
  id: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  checksumSha256: string;
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  type: "MANUAL" | "SCHEDULED";
  encryption: "NONE" | "AES-256-GCM";
  tablesIncluded: string[];
  totalRecords: number;
  durationMs: number;
  verifiedAt?: string;
  verificationStatus?: "VERIFIED" | "CORRUPTED" | "UNCHECKED";
  errorMessage?: string;
}

export interface DisasterRecoveryData {
  rpoTargetMinutes: number;
  currentRpoMinutes: number;
  rtoTargetMinutes: number;
  recoveryReadiness: "READY" | "WARNING" | "CRITICAL";
  lastSuccessfulBackup: BackupItem | null;
  totalBackupsCount: number;
  totalStorageBytes: number;
  failedBackupsCount24h: number;
  activeIncidentsCount: number;
  autoBackupEnabled: boolean;
  retentionDays: number;
}

export async function fetchBackups(token?: string): Promise<BackupItem[]> {
  const res = await fetch(`${API_BASE}/operations/backups`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load database backups");
}

export async function createBackup(token?: string): Promise<BackupItem> {
  const res = await fetch(`${API_BASE}/operations/backups/create`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to initiate database backup");
}

export async function verifyBackup(
  backupId: string,
  token?: string
): Promise<{ verified: boolean; checksum: string; expectedChecksum: string; verifiedAt: string }> {
  const res = await fetch(`${API_BASE}/operations/backups/${backupId}/verify`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to verify backup integrity");
}

export async function pruneBackups(
  retentionDays?: number,
  token?: string
): Promise<{ prunedCount: number; freedBytes: number; remainingCount: number }> {
  const res = await fetch(`${API_BASE}/operations/backups/prune`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ retentionDays }),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to prune database backups");
}

export async function fetchDisasterRecoveryStatus(token?: string): Promise<DisasterRecoveryData> {
  const res = await fetch(`${API_BASE}/operations/disaster-recovery`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load disaster recovery status");
}

export interface IncidentItem {
  id: string;
  incidentNumber: string;
  title: string;
  description?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "TRIAGED" | "INVESTIGATING" | "CONFIRMED" | "MITIGATED" | "CLOSED" | "FALSE_POSITIVE";
  theatreId?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  showId?: string | null;
  show?: { id: string; startTime: string; screen?: { screenNumber: number; name: string } } | null;
  movieId?: string | null;
  movie?: { id: string; title: string } | null;
  playbackSessionId?: string | null;
  activationId?: string | null;
  riskScore: number;
  assignedInvestigatorId?: string | null;
  mitigationAction?: string | null;
  resolutionNotes?: string | null;
  _count?: { evidence: number; notes: number };
  evidence?: ForensicEvidenceItem[];
  notes?: ForensicInvestigationNoteItem[];
  assignedInvestigator?: { id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface ForensicEvidenceItem {
  id: string;
  incidentId: string;
  evidenceType: string;
  watermarkFingerprint?: string | null;
  playbackSessionId?: string | null;
  activationId?: string | null;
  theatreId?: string | null;
  showId?: string | null;
  seatNumber?: string | null;
  confidenceScore: number;
  evidenceHash: string;
  sourceUrlOrFile?: string | null;
  metadata?: string | null;
  detectedAt: string;
  createdAt: string;
}

export interface ForensicInvestigationNoteItem {
  id: string;
  incidentId: string;
  investigatorId?: string | null;
  investigatorEmail?: string | null;
  note: string;
  createdAt: string;
}

export interface WatermarkLookupData {
  found: boolean;
  watermarkPayload?: {
    version: string;
    activationId: string;
    playbackSessionId: string;
    theatreCode: string;
    screenNumber: number;
    seatNumber: string;
    showId: string;
    movieId: string;
    timestamp: string;
    fingerprintHash: string;
  };
  theatre?: { id: string; name: string; code: string; location: string };
  screen?: { screenNumber: number; name: string };
  movie?: { id: string; title: string; durationMinutes: number };
  show?: { id: string; startTime: string; endTime: string; status: string };
  ticket?: { id: string; ticketNumber: string; seatNumber: string; status: string };
  activation?: { id: string; activationCode: string; status: string; activatedAt?: string | null };
  playbackSession?: { id: string; sessionToken: string; status: string; authorizedAt: string };
  drmLicense?: { id: string; licenseToken: string; status: string; issuedAt: string };
  protectionEventsCount: number;
  suspiciousEventsCount: number;
}

export interface SessionTimelineEvent {
  timestamp: string;
  stage: string;
  title: string;
  description: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  eventType: string;
  metadata?: any;
}

export interface SessionTimelineData {
  session: {
    id: string;
    theatre: string;
    screen: string;
    movie: string;
    seat: string;
    ticketNumber: string;
    status: string;
  };
  timeline: SessionTimelineEvent[];
}

export interface ThreatIntelligenceSummaryData {
  overallThreatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  averageRiskScore: number;
  activeHighRiskEntitiesCount: number;
  threatDistribution: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  topTriggeredRules: { ruleId: string; name: string; count: number }[];
  recentAnomalies: {
    id: string;
    eventType: string;
    severity: string;
    actionSummary: string;
    theatreName?: string;
    ipAddress?: string;
    createdAt: string;
  }[];
  timestamp: string;
}

export async function fetchIncidents(
  params?: { status?: string; severity?: string; theatreId?: string; limit?: number; offset?: number },
  token?: string
): Promise<{ incidents: IncidentItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.severity) query.append("severity", params.severity);
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.offset) query.append("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/investigations/incidents?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load incidents");
}

export async function createIncident(data: any, token?: string): Promise<IncidentItem> {
  const res = await fetch(`${API_BASE}/investigations/incidents`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to create incident");
}

export async function fetchIncidentDetails(id: string, token?: string): Promise<IncidentItem> {
  const res = await fetch(`${API_BASE}/investigations/incidents/${id}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load incident details");
}

export async function updateIncidentStatus(
  id: string,
  data: { status: string; resolutionNotes?: string; assignedInvestigatorId?: string },
  token?: string
): Promise<IncidentItem> {
  const res = await fetch(`${API_BASE}/investigations/incidents/${id}/status`, {
    method: "PATCH",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to update incident status");
}

export async function attachForensicEvidence(
  incidentId: string,
  data: any,
  token?: string
): Promise<ForensicEvidenceItem> {
  const res = await fetch(`${API_BASE}/investigations/incidents/${incidentId}/evidence`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to attach forensic evidence");
}

export async function addInvestigationNote(
  incidentId: string,
  note: string,
  token?: string
): Promise<ForensicInvestigationNoteItem> {
  const res = await fetch(`${API_BASE}/investigations/incidents/${incidentId}/notes`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to add investigation note");
}

export async function mitigateIncident(
  incidentId: string,
  data: { actionType?: string; reason?: string },
  token?: string
) {
  const res = await fetch(`${API_BASE}/investigations/incidents/${incidentId}/mitigate`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function lookupWatermark(query: string, token?: string): Promise<WatermarkLookupData> {
  const res = await fetch(`${API_BASE}/investigations/watermark/lookup?query=${encodeURIComponent(query)}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Watermark lookup failed");
}

export async function fetchSessionForensicTimeline(
  sessionId: string,
  token?: string
): Promise<SessionTimelineData> {
  const res = await fetch(`${API_BASE}/investigations/sessions/${sessionId}/timeline`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch session timeline");
}

export async function fetchThreatIntelligence(token?: string): Promise<ThreatIntelligenceSummaryData> {
  const res = await fetch(`${API_BASE}/investigations/threat-intelligence`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load threat intelligence");
}

// -------------------------------------------------------------
// PHASE 14: REAL-TIME COMMAND CENTER & INCIDENT MANAGEMENT
// -------------------------------------------------------------

export interface SecurityIncidentItem {
  id: string;
  incidentNumber: string;
  title: string;
  description?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NEW" | "OPEN" | "ACKNOWLEDGED" | "INVESTIGATING" | "ESCALATED" | "RESOLVED" | "CLOSED";
  source: "SYSTEM_ALERT" | "OPERATOR_REPORT" | "THREAT_ENGINE" | "FORENSIC_MATCH";
  assignedToId?: string | null;
  theatreId?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  showId?: string | null;
  show?: { id: string; startTime: string; screen?: { screenNumber: number; name: string } } | null;
  movieId?: string | null;
  movie?: { id: string; title: string } | null;
  activationId?: string | null;
  playbackSessionId?: string | null;
  riskScore: number;
  assignedTo?: { id: string; name: string; email: string } | null;
  detectedAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  evidenceItems?: IncidentEvidenceRecord[];
  actions?: IncidentActionRecord[];
  _count?: { evidenceItems: number; actions: number };
  createdAt: string;
  updatedAt: string;
}

export interface IncidentEvidenceRecord {
  id: string;
  incidentId: string;
  evidenceType: string;
  referenceId?: string | null;
  metadata?: string | null;
  hash: string;
  capturedAt: string;
}

export interface IncidentActionRecord {
  id: string;
  incidentId: string;
  actionType: string;
  actorId?: string | null;
  targetId?: string | null;
  result: string;
  metadata?: string | null;
  createdAt: string;
}

export interface ThreatAlertItem {
  id: string;
  alertType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  theatreId?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  showId?: string | null;
  show?: { id: string; startTime: string; movie?: { title: string } } | null;
  activationId?: string | null;
  playbackSessionId?: string | null;
  description: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  detectedAt: string;
}

export interface SecurityScorecardData {
  posture: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";
  activeIncidentsCount: number;
  criticalThreatsCount: number;
  activePlaybacksCount: number;
  drmDenialsCount: number;
  verificationDenialsCount: number;
  suspiciousSessionsCount: number;
  automatedActionsCount: number;
  openInvestigationsCount: number;
  timestamp: string;
}

export async function fetchSecurityIncidents(
  params?: { status?: string; severity?: string; theatreId?: string; limit?: number; offset?: number },
  token?: string
): Promise<{ incidents: SecurityIncidentItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.severity) query.append("severity", params.severity);
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.offset) query.append("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/incidents?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load security incidents");
}

export async function fetchSecurityIncidentDetails(
  id: string,
  token?: string
): Promise<{ incident: SecurityIncidentItem; correlationGraph: any }> {
  const res = await fetch(`${API_BASE}/incidents/${id}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load incident details");
}

export async function createSecurityIncident(data: any, token?: string): Promise<SecurityIncidentItem> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to create security incident");
}

export async function acknowledgeSecurityIncident(id: string, token?: string): Promise<SecurityIncidentItem> {
  const res = await fetch(`${API_BASE}/incidents/${id}/acknowledge`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to acknowledge incident");
}

export async function escalateSecurityIncident(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/incidents/${id}/escalate`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function resolveSecurityIncident(id: string, resolutionNotes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ resolutionNotes }),
  });
  return res.json();
}

export async function executeSecurityIncidentAction(
  id: string,
  data: { actionType: string; reason?: string; metadata?: any },
  token?: string
) {
  const res = await fetch(`${API_BASE}/incidents/${id}/actions`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSecurityIncidentStats(token?: string): Promise<SecurityScorecardData> {
  const res = await fetch(`${API_BASE}/incidents/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load command center stats");
}

export async function fetchLiveThreatAlerts(token?: string): Promise<ThreatAlertItem[]> {
  const res = await fetch(`${API_BASE}/incidents/live`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load live threat alerts");
}

// -------------------------------------------------------------
// PHASE 15: THEATRE PLAYBACK DEVICE READINESS
// -------------------------------------------------------------

export interface PlaybackDeviceItem {
  id: string;
  deviceId: string;
  name: string;
  status: "REGISTERED" | "ACTIVE" | "OFFLINE" | "BLOCKED" | "RETIRED";
  theatreId: string;
  theatre?: { id: string; name: string; code: string; location: string };
  screenId?: string | null;
  screen?: { id: string; screenNumber: number; name: string } | null;
  softwareVersion: string;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  lastHeartbeatAt?: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPlaybackDevices(
  params?: { theatreId?: string; status?: string; limit?: number; offset?: number },
  token?: string
): Promise<{ devices: PlaybackDeviceItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.theatreId) query.append("theatreId", params.theatreId);
  if (params?.status) query.append("status", params.status);
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.offset) query.append("offset", String(params.offset));

  const res = await fetch(`${API_BASE}/devices?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load playback devices");
}

export async function registerPlaybackDevice(data: any, token?: string): Promise<PlaybackDeviceItem> {
  const res = await fetch(`${API_BASE}/devices/register`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to register playback device");
}

export async function blockPlaybackDevice(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/devices/${id}/block`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function retirePlaybackDevice(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/devices/${id}/retire`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// -------------------------------------------------------------
// PHASE 16: PRODUCTION TRAFFIC ENGINEERING & AUTO-SCALING
// -------------------------------------------------------------

export interface ScalingTelemetryData {
  trafficPosture: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";
  activeInstances: number;
  requestsPerSecond: number;
  activePlaybacks: number;
  activeSessionsCount: number;
  drmLicensesCount: number;
  errorRatePercent: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  memoryUsageMb: number;
  heapUsedMb: number;
  uptimeSeconds: number;
  timestamp: string;
}

export async function fetchScalingTelemetry(token?: string): Promise<ScalingTelemetryData> {
  const res = await fetch(`${API_BASE}/operations/scaling`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load scaling telemetry");
}

export async function checkIdempotencyKey(key: string, token?: string) {
  const res = await fetch(`${API_BASE}/operations/idempotency/check`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return res.json();
}

// -------------------------------------------------------------
// ANTI-PIRACY INTELLIGENCE LAYER & AUTOMATED RESPONSE
// -------------------------------------------------------------

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

export interface IntelligenceOverviewData {
  threatPosture: "NORMAL" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  kpis: {
    activeIncidents: number;
    criticalThreats: number;
    highThreats: number;
    suspiciousSessions: number;
    drmAnomalies: number;
    correlatedSignals: number;
  };
  riskDistribution: {
    "0-20": number;
    "21-40": number;
    "41-60": number;
    "61-80": number;
    "81-100": number;
  };
  feed: IntelligenceFeedItem[];
}

export async function fetchIntelligenceOverview(token?: string): Promise<IntelligenceOverviewData> {
  const res = await fetch(`${API_BASE}/intelligence/overview`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load intelligence overview");
}

export async function executeIntelligenceAction(
  data: { incidentId: string; actionType: string; reason: string; isApprovedBySoc?: boolean },
  token?: string
) {
  const res = await fetch(`${API_BASE}/intelligence/actions/execute`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function resolveIntelligenceIncident(id: string, notes: string, token?: string) {
  const res = await fetch(`${API_BASE}/intelligence/incidents/${id}/resolve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ resolutionNotes: notes }),
  });
  return res.json();
}

export interface ThreatPatternItem {
  id: string;
  patternType: string;
  name: string;
  description: string;
  severity: string;
  confidence: number;
  occurrenceCount: number;
  theatreId?: string | null;
  theatre?: { name: string; code: string } | null;
  showId?: string | null;
  show?: { startTime: string; movie?: { title: string } } | null;
  movieId?: string | null;
  status: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  signals?: any[];
}

export interface ThreatPredictionItem {
  id: string;
  theatreId?: string | null;
  theatre?: { name: string; code: string } | null;
  showId?: string | null;
  show?: { startTime: string; screen?: { name: string } } | null;
  movieId?: string | null;
  movie?: { title: string; rating?: string } | null;
  predictionType: string;
  predictedRisk: number;
  confidence: number;
  explanation: string;
  recommendedAction: string;
  predictionWindow: string;
  createdAt: string;
}

export interface IntelligenceStatsData {
  overallRiskScore: number;
  overallRiskLevel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  confidence: number;
  activePatternsCount: number;
  criticalPatternsCount: number;
  predictionsCount: number;
  monitoredTheatres: number;
  recommendation: string;
}

export async function fetchIntelligenceStats(token?: string): Promise<IntelligenceStatsData> {
  const res = await fetch(`${API_BASE}/intelligence/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load intelligence stats");
}

export async function fetchThreatPatterns(token?: string): Promise<ThreatPatternItem[]> {
  const res = await fetch(`${API_BASE}/intelligence/patterns`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load threat patterns");
}

export async function fetchThreatPredictions(token?: string): Promise<ThreatPredictionItem[]> {
  const res = await fetch(`${API_BASE}/intelligence/predictions`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load threat predictions");
}

export async function acknowledgeThreatPattern(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/intelligence/patterns/${id}/acknowledge`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function recalculateThreatIntelligence(token?: string) {
  const res = await fetch(`${API_BASE}/intelligence/recalculate`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// -------------------------------------------------------------
// PHASE 16: REAL-TIME ANTI-PIRACY & AUTOMATED SOC RESPONSE
// -------------------------------------------------------------

export interface RealtimeStatusData {
  status: string;
  connectedStreamClients: number;
  overallRiskScore: number;
  overallRiskLevel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  activeThreatClusters: number;
  timestamp: string;
}

export interface RealtimeThreatEventItem {
  id: string;
  correlationId: string;
  eventId: string;
  eventType: string;
  source: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  theatreId?: string | null;
  theatre?: { name: string; code: string } | null;
  showId?: string | null;
  show?: { startTime: string; movie?: { title: string } } | null;
  movieId?: string | null;
  movie?: { title: string } | null;
  activationId?: string | null;
  playbackSessionId?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface CorrelatedClusterItem {
  clusterId: string;
  correlationId: string;
  clusterType: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  theatreId?: string;
  showId?: string;
  movieId?: string;
  playbackSessionId?: string;
  events: any[];
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface RealtimeIncidentNotificationItem {
  id: string;
  incidentId?: string | null;
  notificationType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  theatreId?: string | null;
  theatre?: { name: string; code: string } | null;
  showId?: string | null;
  show?: { startTime: string } | null;
  movieId?: string | null;
  movie?: { title: string } | null;
  isRead: boolean;
  sentAt: string;
}

export async function fetchRealtimeStatus(token?: string): Promise<RealtimeStatusData> {
  const res = await fetch(`${API_BASE}/realtime/status`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load realtime status");
}

export async function fetchRealtimeEvents(query?: Record<string, string>, token?: string): Promise<RealtimeThreatEventItem[]> {
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const res = await fetch(`${API_BASE}/realtime/events${qs}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load realtime events");
}

export async function fetchRealtimeThreats(token?: string): Promise<CorrelatedClusterItem[]> {
  const res = await fetch(`${API_BASE}/realtime/threats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load realtime threats");
}

export async function fetchRealtimeIncidents(token?: string): Promise<RealtimeIncidentNotificationItem[]> {
  const res = await fetch(`${API_BASE}/realtime/incidents`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to load realtime incidents");
}

export async function approveResponseAction(actionId: string, token?: string) {
  const res = await fetch(`${API_BASE}/realtime/actions/${actionId}/approve`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function rejectResponseAction(actionId: string, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/realtime/actions/${actionId}/reject`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function executeCustomRealtimeAction(data: { actionType: string; targetId?: string; reason: string }, token?: string) {
  const res = await fetch(`${API_BASE}/realtime/actions/execute`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

/* =========================================================================
   PHASE 17: EVIDENCE MANAGEMENT, INVESTIGATION & COMPLIANCE
   ========================================================================= */

export interface EvidenceArtifactItem {
  id: string;
  evidenceRecordId: string;
  artifactName: string;
  artifactType: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath?: string | null;
  sha256Hash: string;
  payloadData?: string | null;
  createdAt: string;
}

export interface EvidenceChainEventItem {
  id: string;
  evidenceRecordId: string;
  eventType: string;
  actorId?: string | null;
  actorRole?: string | null;
  actorEmail?: string | null;
  previousChainHash: string;
  currentChainHash: string;
  eventData?: string | null;
  timestamp: string;
}

export interface EvidenceAccessLogItem {
  id: string;
  evidenceRecordId: string;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  accessType: string;
  ipAddress?: string | null;
  reason?: string | null;
  accessedAt: string;
}

export interface EvidenceRecordItem {
  id: string;
  evidenceNumber: string;
  title: string;
  description?: string | null;
  classification: "WATERMARK_MATCH" | "SCREEN_RECORDING_CAPTURE" | "SESSION_ANOMALY" | "DRM_TAMPER_LOG" | "UNAUTHORIZED_FEED" | "SPECTRAL_LEAK_ANALYSIS" | "PHYSICAL_SENSOR_TRIGGER";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: "COLLECTED" | "VERIFIED" | "FLAGGED_TAMPERED" | "UNDER_REVIEW" | "ARCHIVED" | "LEGAL_HOLD";
  retentionStatus: "ACTIVE" | "EXPIRED" | "ARCHIVED" | "LEGAL_HOLD" | "PURGED";
  theatreId?: string | null;
  showId?: string | null;
  movieId?: string | null;
  productionCompanyId?: string | null;
  playbackSessionId?: string | null;
  incidentId?: string | null;
  securityIncidentId?: string | null;
  source: string;
  capturedBy?: string | null;
  metadata?: string | null;
  integrityHash?: string | null;
  lastVerifiedAt?: string | null;
  retentionExpiresAt?: string | null;
  legalHoldReason?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  movie?: { id: string; title: string } | null;
  productionCompany?: { id: string; name: string } | null;
  artifacts?: EvidenceArtifactItem[];
  chainEvents?: EvidenceChainEventItem[];
  accessLogs?: EvidenceAccessLogItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationNoteItem {
  id: string;
  caseId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  author?: { id: string; name: string; email: string; role: string } | null;
  createdAt: string;
}

export interface InvestigationTimelineEventItem {
  id: string;
  caseId: string;
  title: string;
  description: string;
  eventType: string;
  actorId?: string | null;
  timestamp: string;
}

export interface InvestigationStatusHistoryItem {
  id: string;
  caseId: string;
  fromStatus: string;
  toStatus: string;
  changedBy?: string | null;
  reason?: string | null;
  changedAt: string;
}

export interface InvestigationCaseItem {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  status: "OPEN" | "TRIAGED" | "INVESTIGATING" | "CONTAINED" | "ESCALATED" | "RESOLVED" | "CLOSED" | "ARCHIVED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  threatClassification: string;
  theatreId?: string | null;
  showId?: string | null;
  movieId?: string | null;
  productionCompanyId?: string | null;
  playbackSessionId?: string | null;
  assignedAnalystId?: string | null;
  closedAt?: string | null;
  closureReason?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  movie?: { id: string; title: string } | null;
  productionCompany?: { id: string; name: string } | null;
  assignedAnalyst?: { id: string; name: string; email: string } | null;
  notes?: InvestigationNoteItem[];
  evidenceLinks?: Array<{ id: string; relevance?: string | null; evidenceRecord: EvidenceRecordItem }>;
  timelineEvents?: InvestigationTimelineEventItem[];
  statusHistory?: InvestigationStatusHistoryItem[];
  _count?: {
    evidenceLinks?: number;
    notes?: number;
    timelineEvents?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceStatsData {
  evidenceHealth: {
    totalEvidence: number;
    verifiedCount: number;
    tamperedCount: number;
    legalHoldCount: number;
    pendingExpirationCount: number;
    retentionActiveCount: number;
  };
  investigationMetrics: {
    totalCases: number;
    openCases: number;
    containedOrResolved: number;
    criticalSeverityCount: number;
  };
  generatedAt: string;
}

export async function fetchEvidenceList(params?: { status?: string; classification?: string }, token?: string): Promise<EvidenceRecordItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.classification) query.append("classification", params.classification);
    const res = await fetch(`${API_BASE}/evidence?${query.toString()}`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      console.warn("fetchEvidenceList non-ok status:", res.status);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.evidence)) return data.evidence;
    return [];
  } catch (err) {
    console.warn("fetchEvidenceList error:", err);
    return [];
  }
}

export async function fetchEvidenceById(id: string, token?: string): Promise<EvidenceRecordItem> {
  const res = await fetch(`${API_BASE}/evidence/${id}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchEvidenceChain(id: string, token?: string): Promise<EvidenceChainEventItem[]> {
  try {
    const res = await fetch(`${API_BASE}/evidence/${id}/chain`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      console.warn("fetchEvidenceChain non-ok status:", res.status);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.events)) return data.events;
    return [];
  } catch (err) {
    console.warn("fetchEvidenceChain error:", err);
    return [];
  }
}

export async function verifyEvidenceIntegrity(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/evidence/${id}/verify`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function toggleEvidenceLegalHold(id: string, reason: string, isHold: boolean, token?: string) {
  const res = await fetch(`${API_BASE}/evidence/${id}/legal-hold`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ isHold, reason }),
  });
  return res.json();
}

export async function exportEvidenceRecord(id: string, format: "JSON" | "CSV" | "REPORT", token?: string) {
  const res = await fetch(`${API_BASE}/evidence/${id}/export`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ format, reason: "Forensic and legal audit export" }),
  });
  return res.json();
}

export async function fetchComplianceStats(token?: string): Promise<ComplianceStatsData> {
  const fallback: ComplianceStatsData = {
    evidenceHealth: {
      totalEvidence: 0,
      verifiedCount: 0,
      tamperedCount: 0,
      legalHoldCount: 0,
      pendingExpirationCount: 0,
      retentionActiveCount: 0,
    },
    investigationMetrics: {
      totalCases: 0,
      openCases: 0,
      containedOrResolved: 0,
      criticalSeverityCount: 0,
    },
    generatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${API_BASE}/evidence/stats`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      console.warn("fetchComplianceStats non-ok status:", res.status);
      return fallback;
    }
    const data = await res.json();
    if (data && data.evidenceHealth && data.investigationMetrics) return data;
    if (data && data.data && data.data.evidenceHealth && data.data.investigationMetrics) return data.data;
    return fallback;
  } catch (err) {
    console.warn("fetchComplianceStats error:", err);
    return fallback;
  }
}

export async function fetchInvestigationCases(params?: { status?: string }, token?: string): Promise<InvestigationCaseItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    const res = await fetch(`${API_BASE}/investigations?${query.toString()}`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      console.warn("fetchInvestigationCases non-ok status:", res.status);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.cases)) return data.cases;
    return [];
  } catch (err) {
    console.warn("fetchInvestigationCases error:", err);
    return [];
  }
}

export async function fetchInvestigationCaseById(id: string, token?: string): Promise<InvestigationCaseItem> {
  const res = await fetch(`${API_BASE}/investigations/${id}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function createInvestigationCase(data: any, token?: string): Promise<InvestigationCaseItem> {
  const res = await fetch(`${API_BASE}/investigations`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function assignCaseAnalyst(id: string, analystId: string, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/assign`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ analystId, notes }),
  });
  return res.json();
}

export async function updateCaseStatus(id: string, status: string, reason?: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/status`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  return res.json();
}

export async function addCaseNote(id: string, content: string, isInternal: boolean = true, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/notes`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ content, isInternal }),
  });
  return res.json();
}

export async function linkEvidenceToCase(id: string, evidenceRecordId: string, relevance?: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/evidence`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ evidenceRecordId, relevance }),
  });
  return res.json();
}

export async function closeInvestigationCase(id: string, closureReason: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/close`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ closureReason }),
  });
  return res.json();
}

export async function requestCaseContainment(id: string, actionType: string, reason: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/containment`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ actionType, reason }),
  });
  return res.json();
}

export async function resolveInvestigationCase(id: string, resolution: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/resolve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ resolution }),
  });
  return res.json();
}

export async function verifyInvestigationIntegrity(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/verify-integrity`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function triggerAutomatedEvidencePackage(id: string, data?: any, token?: string) {
  const res = await fetch(`${API_BASE}/investigations/${id}/automated-package`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  return res.json();
}

// ==========================================
// PHASE 18: EXTERNAL THREAT INTELLIGENCE
// ==========================================

export type ThreatIntelIndicatorType =
  | "IP_ADDRESS"
  | "DOMAIN"
  | "URL"
  | "FILE_HASH"
  | "EMAIL"
  | "CERTIFICATE"
  | "USER_AGENT"
  | "DEVICE_FINGERPRINT"
  | "CONTENT_IDENTIFIER"
  | "CAMPAIGN_IDENTIFIER";

export type ThreatIntelConfidenceLevel = "UNTRUSTED" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
export type ThreatIntelIndicatorStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";
export type ThreatIntelCampaignStatus = "OBSERVED" | "ACTIVE" | "ESCALATED" | "CONTAINED" | "RESOLVED" | "ARCHIVED";

export interface ThreatIntelSourceItem {
  id: string;
  name: string;
  providerType: string;
  description?: string | null;
  trustLevel: number;
  defaultConfidence: number;
  isEnabled: boolean;
  authConfigReference?: string | null;
  lastSyncSuccessAt?: string | null;
  lastSyncFailureAt?: string | null;
  lastFailureReason?: string | null;
  syncFrequencyMinutes: number;
  _count?: {
    indicators?: number;
    feeds?: number;
    imports?: number;
  };
  healthRecords?: Array<{
    status: string;
    responseLatencyMs: number;
    recordsIngested: number;
    checkedAt: string;
  }>;
  createdAt: string;
}

export interface ThreatIntelIndicatorItem {
  id: string;
  sourceId: string;
  source?: ThreatIntelSourceItem;
  indicatorType: ThreatIntelIndicatorType;
  value: string;
  rawValue?: string | null;
  confidenceScore: number;
  confidenceLevel: ThreatIntelConfidenceLevel;
  status: ThreatIntelIndicatorStatus;
  threatClassification?: string | null;
  description?: string | null;
  tags?: string | null;
  firstSeen: string;
  lastSeen: string;
  expiresAt?: string | null;
  isAnalystValidated: boolean;
  validatedBy?: string | null;
  validatedAt?: string | null;
  _count?: {
    observations?: number;
    matches?: number;
  };
  matches?: ThreatIntelMatchItem[];
  campaigns?: ThreatIntelCampaignItem[];
  createdAt: string;
}

export interface ThreatIntelMatchItem {
  id: string;
  indicatorId: string;
  indicator: ThreatIntelIndicatorItem;
  campaignId?: string | null;
  campaign?: ThreatIntelCampaignItem | null;
  correlationType: string;
  correlationDetails?: string | null;
  confidence: number;
  theatreId?: string | null;
  theatre?: { id: string; name: string; code: string } | null;
  movieId?: string | null;
  movie?: { id: string; title: string } | null;
  playbackSessionId?: string | null;
  playbackSession?: { id: string; sessionToken: string; status: string } | null;
  investigationCaseId?: string | null;
  investigationCase?: { id: string; caseNumber: string; title: string } | null;
  evidenceRecordId?: string | null;
  matchedAt: string;
}

export interface ThreatIntelCampaignItem {
  id: string;
  campaignIdentifier: string;
  name: string;
  description?: string | null;
  threatClassification: string;
  riskLevel: string;
  confidence: number;
  status: ThreatIntelCampaignStatus;
  theatreId?: string | null;
  theatre?: { id: string; name: string } | null;
  movieId?: string | null;
  movie?: { id: string; title: string } | null;
  productionCompanyId?: string | null;
  productionCompany?: { id: string; name: string } | null;
  investigationCaseId?: string | null;
  evidenceRecordId?: string | null;
  indicators?: ThreatIntelIndicatorItem[];
  matches?: ThreatIntelMatchItem[];
  _count?: {
    indicators?: number;
    matches?: number;
  };
  firstObservedAt: string;
  lastObservedAt: string;
  createdAt: string;
}

export interface ThreatIntelStatsData {
  totalSources: number;
  activeSources: number;
  totalIndicators: number;
  activeIndicators: number;
  highConfidenceIndicators: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalMatches: number;
}

export async function fetchThreatIntelStats(token?: string): Promise<ThreatIntelStatsData> {
  const res = await fetch(`${API_BASE}/threat-intelligence/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch threat intel stats");
}

export async function fetchThreatIntelSources(token?: string): Promise<ThreatIntelSourceItem[]> {
  const res = await fetch(`${API_BASE}/threat-intelligence/sources`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch threat intel sources");
}

export async function createThreatIntelSource(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/sources`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function syncThreatIntelSource(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/sources/${id}/sync`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchThreatIntelSourceHealth(token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/source-health`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch source health");
}

export async function fetchThreatIntelIndicators(params?: any, token?: string): Promise<ThreatIntelIndicatorItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch indicators");
}

export async function fetchThreatIntelIndicatorById(id: string, token?: string): Promise<ThreatIntelIndicatorItem> {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch indicator detail");
}

export async function validateThreatIntelIndicator(id: string, isConfirmed: boolean, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/indicators/${id}/validate`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ isConfirmed, notes }),
  });
  return res.json();
}

export async function fetchThreatIntelMatches(token?: string): Promise<ThreatIntelMatchItem[]> {
  const res = await fetch(`${API_BASE}/threat-intelligence/matches`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch matches");
}

export async function fetchThreatIntelCampaigns(token?: string): Promise<ThreatIntelCampaignItem[]> {
  const res = await fetch(`${API_BASE}/threat-intelligence/campaigns`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch campaigns");
}

export async function createThreatIntelCampaign(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/campaigns`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchThreatIntelCampaignById(id: string, token?: string): Promise<ThreatIntelCampaignItem> {
  const res = await fetch(`${API_BASE}/threat-intelligence/campaigns/${id}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch campaign");
}

export async function importThreatIntelFeed(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/feeds/import`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function analyzeThreatInput(type: string, value: string, token?: string) {
  const res = await fetch(`${API_BASE}/threat-intelligence/analyze`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ type, value }),
  });
  return res.json();
}

// ==========================================
// PHASE 19: ZERO-TRUST & ENTERPRISE GOVERNANCE
// ==========================================

export type PolicyType =
  | "ACCESS_CONTROL"
  | "PLAYBACK_AUTHORIZATION"
  | "DRM_LICENSE"
  | "EVIDENCE_ACCESS"
  | "INVESTIGATION_CASE"
  | "THREAT_INTEL"
  | "ADMIN_OPERATIONS"
  | "DATA_EXPORT"
  | "EMERGENCY_ACCESS";

export type AccessDecisionType = "ALLOW" | "STEP_UP" | "APPROVAL_REQUIRED" | "DENY";
export type DeviceTrustStatus = "TRUSTED" | "UNKNOWN" | "SUSPICIOUS" | "BLOCKED";
export type PrivilegedActionStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED" | "CANCELLED";
export type PrivilegedRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PolicyVersionItem {
  id: string;
  policyId: string;
  version: number;
  ruleSnapshot: string;
  changeReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface SecurityPolicyItem {
  id: string;
  name: string;
  description?: string | null;
  policyType: PolicyType;
  isEnabled: boolean;
  priority: number;
  version: number;
  rules: string;
  tenantType?: string | null;
  tenantId?: string | null;
  effectiveAt: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  versions?: PolicyVersionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessDecisionItem {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resourceType: string;
  resourceId?: string | null;
  action: string;
  decision: AccessDecisionType;
  riskScore: number;
  trustScore: number;
  evaluatedPolicyIds?: string | null;
  reasonCodes: string;
  correlationId: string;
  ipAddress?: string | null;
  deviceFingerprint?: string | null;
  timestamp: string;
}

export interface DeviceTrustRecordItem {
  id: string;
  deviceFingerprintHash: string;
  deviceName?: string | null;
  trustStatus: DeviceTrustStatus;
  lastSeenIp?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  trustScore: number;
  riskFactors?: string | null;
  observationCount: number;
  trustRevokedAt?: string | null;
  trustRevokedReason?: string | null;
  trustGrantedBy?: string | null;
  createdAt: string;
}

export interface PrivilegedActionItem {
  id: string;
  actionType: string;
  requestedBy: string;
  requesterEmail?: string | null;
  requesterRole?: string | null;
  targetResource: string;
  targetResourceId?: string | null;
  reason: string;
  riskLevel: PrivilegedRiskLevel;
  approvalStatus: PrivilegedActionStatus;
  approverId?: string | null;
  approverEmail?: string | null;
  approvalNotes?: string | null;
  approvedAt?: string | null;
  executedAt?: string | null;
  executionToken?: string | null;
  executionResult?: string | null;
  expiresAt: string;
  correlationId: string;
  createdAt: string;
}

export interface BreakGlassSessionItem {
  id: string;
  sessionIdentifier: string;
  activatedBy: string;
  activatorEmail?: string | null;
  reason: string;
  isActive: boolean;
  activatedAt: string;
  expiresAt: string;
  closedAt?: string | null;
  closedBy?: string | null;
  postReviewRequired: boolean;
  postReviewCompleted: boolean;
  postReviewCompletedAt?: string | null;
  postReviewCompletedBy?: string | null;
  postReviewNotes?: string | null;
  correlationId: string;
  createdAt: string;
}

export interface GovernanceStatsData {
  totalPolicies: number;
  activePolicies: number;
  totalDecisions: number;
  deniedDecisions: number;
  pendingApprovals: number;
  activeBreakGlassCount: number;
  trustedDevicesCount: number;
  suspiciousDevicesCount: number;
  overallTrustPosture: "OPTIMAL" | "GUARDED" | "ELEVATED" | "CRITICAL";
}

export async function fetchGovernanceStats(token?: string): Promise<GovernanceStatsData> {
  const res = await fetch(`${API_BASE}/governance/stats`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch governance stats");
}

export async function fetchSecurityPolicies(params?: any, token?: string): Promise<SecurityPolicyItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/governance/policies?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch security policies");
}

export async function createSecurityPolicy(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/governance/policies`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSecurityPolicy(id: string, data: any, token?: string) {
  const res = await fetch(`${API_BASE}/governance/policies/${id}`, {
    method: "PUT",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function rollbackSecurityPolicy(id: string, targetVersion: number, reason?: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/policies/${id}/rollback`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ targetVersion, reason }),
  });
  return res.json();
}

export async function fetchAccessDecisions(params?: any, token?: string): Promise<AccessDecisionItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/governance/decisions?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch access decisions");
}

export async function fetchDeviceTrustRecords(params?: any, token?: string): Promise<DeviceTrustRecordItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/governance/devices?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch devices");
}

export async function updateDeviceTrustStatus(id: string, trustStatus: DeviceTrustStatus, reason: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/devices/${id}/trust`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ trustStatus, reason }),
  });
  return res.json();
}

export async function fetchPrivilegedActions(params?: any, token?: string): Promise<PrivilegedActionItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/governance/privileged-actions?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch privileged actions");
}

export async function requestPrivilegedAction(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/governance/privileged-actions`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function approvePrivilegedAction(id: string, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/privileged-actions/${id}/approve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function rejectPrivilegedAction(id: string, reason: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/privileged-actions/${id}/reject`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function fetchBreakGlassSessions(params?: any, token?: string): Promise<BreakGlassSessionItem[]> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/governance/break-glass?${query}`, {
    headers: getAuthHeader(token),
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.message || "Failed to fetch break glass sessions");
}

export async function startBreakGlassSession(reason: string, durationMinutes: number = 60, token?: string) {
  const res = await fetch(`${API_BASE}/governance/break-glass/start`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reason, durationMinutes }),
  });
  return res.json();
}

export async function closeBreakGlassSession(id: string, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/break-glass/${id}/close`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function reviewBreakGlassSession(id: string, reviewNotes: string, token?: string) {
  const res = await fetch(`${API_BASE}/governance/break-glass/${id}/review`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reviewNotes }),
  });
  return res.json();
}

// ==========================================
// PHASE 20: ENTERPRISE THREAT OPERATIONS & UNIFIED SOC
// ==========================================

export interface SocMetrics {
  meanTimeToAcknowledgeMin: number;
  meanTimeToResolveMin: number;
  criticalIncidentsCount: number;
  highIncidentsCount: number;
  totalActiveIncidents: number;
  workflowExecutionsCount: number;
  workflowSuccessRate: number;
  evidenceTamperingAlertsCount: number;
  iocCorrelationsCount: number;
  privilegedApprovalLatencyMin: number;
  breakGlassActiveCount: number;
  threatsByTheatre: Array<{ theatreName: string; incidentCount: number }>;
  threatsByMovie: Array<{ movieTitle: string; incidentCount: number }>;
}

export interface SocRecommendation {
  id: string;
  category: string;
  why: string;
  evidence: string;
  risk: string;
  recommendedAction: string;
  requiredApproval: string;
  targetResource: string;
  targetResourceId?: string;
}

export interface SocSummary {
  globalThreatRiskScore: number;
  overallPosture: "OPTIMAL" | "GUARDED" | "ELEVATED" | "CRITICAL";
  metrics: SocMetrics;
  activeIncidents: any[];
  recentThreatAlerts: any[];
  recentIocMatches: any[];
  recentEvidenceViolations: any[];
  pendingPrivilegedApprovals: any[];
  activeBreakGlassSessions: any[];
  recommendations: SocRecommendation[];
}

export interface SocIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "TRIAGED" | "INVESTIGATING" | "CONTAINMENT_PENDING" | "CONTAINED" | "MONITORING" | "RESOLVED" | "CLOSED" | "NEW" | "OPEN" | "ACKNOWLEDGED" | "ESCALATED";
  source: string;
  riskScore: number;
  theatreId?: string;
  theatre?: { name: string; code: string };
  movieId?: string;
  movie?: { title: string };
  assignedTo?: { id: string; name: string; email: string };
  timeline?: any[];
  escalations?: any[];
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface SocWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerCondition: string;
  actionType: string;
  actionPayload?: string;
  isEnabled: boolean;
  priority: number;
  executions?: any[];
  createdAt: string;
}

export interface SocNotification {
  id: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  targetRole?: string;
  isRead: boolean;
  correlationId: string;
  createdAt: string;
}

export async function fetchSocSummary(token?: string): Promise<{ success: boolean; data: SocSummary }> {
  const res = await fetch(`${API_BASE}/soc/summary`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchSocMetrics(token?: string): Promise<{ success: boolean; data: SocMetrics }> {
  const res = await fetch(`${API_BASE}/soc/metrics`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchSocIncidents(params?: any, token?: string): Promise<{ success: boolean; data: SocIncident[] }> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/soc/incidents?${query}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function createSocIncident(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/soc/incidents`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSocIncidentDetails(id: string, token?: string): Promise<{ success: boolean; data: SocIncident }> {
  const res = await fetch(`${API_BASE}/soc/incidents/${id}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchSocIncidentTimeline(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/soc/incidents/${id}/timeline`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function assignSocAnalyst(id: string, analystId: string, analystEmail?: string, token?: string) {
  const res = await fetch(`${API_BASE}/soc/incidents/${id}/assign`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ analystId, analystEmail }),
  });
  return res.json();
}

export async function transitionSocIncidentStatus(id: string, newStatus: string, notes?: string, token?: string) {
  const res = await fetch(`${API_BASE}/soc/incidents/${id}/transition`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ newStatus, notes }),
  });
  return res.json();
}

export async function escalateSocIncident(id: string, data: any, token?: string) {
  const res = await fetch(`${API_BASE}/soc/incidents/${id}/escalate`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSocWorkflows(token?: string): Promise<{ success: boolean; data: SocWorkflow[] }> {
  const res = await fetch(`${API_BASE}/soc/workflows`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function createSocWorkflow(data: any, token?: string) {
  const res = await fetch(`${API_BASE}/soc/workflows`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSocWorkflowExecutions(params?: any, token?: string) {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/soc/workflows/executions?${query}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchSocNotifications(params?: any, token?: string): Promise<{ success: boolean; data: SocNotification[] }> {
  const query = new URLSearchParams(params || {}).toString();
  const res = await fetch(`${API_BASE}/soc/notifications?${query}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function markSocNotificationRead(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/soc/notifications/${id}/read`, {
    method: "POST",
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ==========================================
// PHASE 27: PIRACY RESPONSE & ENFORCEMENT
// ==========================================

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

export interface EnforcementEvidenceItem {
  evidenceId: string;
  evidenceNumber: string;
  classification: string;
  severity: string;
  status: string;
  source: string;
  integrityHash: string;
  isIntegrityVerified: boolean;
  artifactCount: number;
  capturedAt: string;
}

export interface EnforcementTimelineItem {
  timestamp: string;
  eventType: string;
  title: string;
  description: string;
  actorRole?: string;
}

export interface EnforcementPackageData {
  packageId: string;
  generatedAt: string;
  generatedBy: {
    id: string;
    email: string;
    role: string;
  };
  caseReference: {
    id: string;
    caseNumber: string;
    title: string;
    severity: string;
    threatClassification?: string;
    status: string;
    openedAt: string;
  };
  incidentReference?: {
    id: string;
    incidentNumber: string;
    title: string;
    severity: string;
    riskScore: number;
  };
  screeningSession?: {
    sessionId: string;
    activationId?: string;
    ticketNumber?: string;
    seatNumber?: string;
    screenName?: string;
    showStartTime?: string;
  };
  theatre?: {
    id: string;
    name: string;
    code: string;
    location: string;
  };
  movie?: {
    id: string;
    title: string;
    language?: string;
    durationMinutes?: number;
  };
  watermarkAttribution?: {
    watermarkId: string;
    displayString?: string;
    timeSlot?: number;
    theatreCode?: string;
    seatNumber?: string;
    confidenceScore: number;
  };
  evidenceRecords: EnforcementEvidenceItem[];
  timeline: EnforcementTimelineItem[];
  analystNotesCount: number;
  packageIntegrityHash: string;
  isFullyVerified: boolean;
  complianceNotice: string;
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

export interface EnforcementActionItem {
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

export async function fetchEnforcementActions(
  filters?: {
    theatreId?: string;
    productionCompanyId?: string;
    status?: string;
    severity?: string;
    caseId?: string;
  },
  token?: string
): Promise<EnforcementActionItem[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.theatreId) query.append("theatreId", filters.theatreId);
    if (filters?.productionCompanyId) query.append("productionCompanyId", filters.productionCompanyId);
    if (filters?.status) query.append("status", filters.status);
    if (filters?.severity) query.append("severity", filters.severity);
    if (filters?.caseId) query.append("caseId", filters.caseId);

    const res = await fetch(`${API_BASE}/enforcement?${query.toString()}`, {
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      console.warn("fetchEnforcementActions non-ok status:", res.status);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) {
    console.warn("fetchEnforcementActions error:", err);
    return [];
  }
}

export async function fetchEnforcementActionById(id: string, token?: string): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function createEnforcementAction(
  data: {
    caseId: string;
    title: string;
    description?: string;
    actionType: EnforcementActionType;
    targetEntity?: string;
    targetJurisdiction?: string;
    severity?: EnforcementSeverity;
  },
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateEnforcementPackage(id: string, token?: string): Promise<EnforcementPackageData> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/package`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function submitEnforcementForReview(
  id: string,
  notes?: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/review`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function approveEnforcementAction(
  id: string,
  notes?: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/approve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function rejectEnforcementAction(
  id: string,
  reason: string,
  notes?: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/reject`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reason, notes }),
  });
  return res.json();
}

export async function submitEnforcementAction(
  id: string,
  submissionReference?: string,
  notes?: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/submit`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ submissionReference, notes }),
  });
  return res.json();
}

export async function completeEnforcementAction(
  id: string,
  resolutionSummary: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/complete`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ resolutionSummary }),
  });
  return res.json();
}

export async function cancelEnforcementAction(
  id: string,
  cancellationReason: string,
  token?: string
): Promise<EnforcementActionItem> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/cancel`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ cancellationReason }),
  });
  return res.json();
}

export async function verifyEnforcementPackage(
  id: string,
  token?: string
): Promise<{ isValid: boolean; calculatedHash: string; providedHash: string; enforcementNumber: string }> {
  const res = await fetch(`${API_BASE}/enforcement/${id}/verify`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

// ==========================================
// PHASE 28: STUDIO INTELLIGENCE & REPORTING
// ==========================================

export interface MovieRiskMetric {
  movieId: string;
  movieTitle: string;
  productionCompanyId?: string | null;
  productionCompanyName?: string | null;
  incidentCount: number;
  criticalIncidentCount: number;
  averageRiskScore: number;
  watermarkHits: number;
  activeInvestigations: number;
  activeEnforcements: number;
  riskCategory: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
}

export interface TheatreRiskMetric {
  theatreId: string;
  theatreName: string;
  theatreCode: string;
  location?: string | null;
  incidentCount: number;
  averageRiskScore: number;
  suspiciousSessionsCount: number;
  watermarkDetections: number;
  vulnerabilityRating: "LOW" | "MODERATE" | "ELEVATED" | "SEVERE";
}

export interface DailyRiskTrend {
  date: string;
  incidentCount: number;
  averageRiskScore: number;
  highSeverityCount: number;
}

export interface SuspiciousSessionSummary {
  sessionId: string;
  movieTitle: string;
  theatreName: string;
  theatreCode: string;
  screenName: string;
  seatNumber?: string;
  riskScore: number;
  detectedSignalsCount: number;
  hasWatermarkAttribution: boolean;
  timestamp: string;
}

export interface StudioIntelligenceSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  studioScope: {
    productionCompanyId?: string | null;
    productionCompanyName?: string | null;
    isGlobalAdmin: boolean;
  };
  kpis: {
    totalIncidents: number;
    highRiskIncidents: number;
    highRiskRatio: number;
    totalEvidenceRecords: number;
    watermarkHits: number;
    activeInvestigations: number;
    activeEnforcements: number;
    completedEnforcements: number;
    takedownSuccessRate: number;
    globalStudioRiskScore: number;
    overallThreatPosture: "NOMINAL" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  };
  investigationPipeline: Record<string, number>;
  enforcementPipeline: Record<string, number>;
  movieRankings: MovieRiskMetric[];
  theatreRankings: TheatreRiskMetric[];
  riskTrends: DailyRiskTrend[];
  suspiciousSessions: SuspiciousSessionSummary[];
  evidenceBreakdown: {
    watermarkCaptures: number;
    opticalRecordings: number;
    audioLeaks: number;
    drmAnomalies: number;
    heuristicAnomalies: number;
    totalVerifiedArtifacts: number;
  };
}

export interface StudioManagementReport {
  reportId: string;
  generatedAt: string;
  generatedBy: {
    id: string;
    email: string;
    role: string;
  };
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  studioScope: {
    productionCompanyId?: string | null;
    productionCompanyName?: string | null;
  };
  targetMovie?: {
    id: string;
    title: string;
    durationMinutes?: number;
    language?: string;
  } | null;
  executiveSummary: {
    headline: string;
    overallRiskPosture: string;
    globalRiskScore: number;
    totalIncidents: number;
    highRiskIncidents: number;
    takedownEfficacyRate: number;
    totalForensicEvidenceItems: number;
    activeEnforcementsCount: number;
  };
  affectedTheatresSummary: Array<{
    theatreId: string;
    theatreName: string;
    theatreCode: string;
    location?: string | null;
    incidentCount: number;
    vulnerabilityRating: string;
  }>;
  incidentBreakdown: {
    bySeverity: Record<string, number>;
    byClassification: Record<string, number>;
  };
  evidenceAndWatermarks: {
    totalEvidenceVaultRecords: number;
    watermarkDetectionsCount: number;
    verifiedHashIntegrityCount: number;
    suspiciousSessionsCount: number;
  };
  investigationPipelineSummary: {
    totalCases: number;
    activeCases: number;
    containedCases: number;
    resolvedCases: number;
  };
  enforcementResponseSummary: {
    totalEnforcementActions: number;
    draftActions: number;
    approvedActions: number;
    submittedActions: number;
    completedTakedowns: number;
    rejectedOrCancelled: number;
    successRatePercentage: number;
  };
  complianceCertification: string;
  reportIntegrityHash: string;
}

export async function fetchStudioIntelligence(
  filters?: {
    productionCompanyId?: string;
    movieId?: string;
    theatreId?: string;
    startDate?: string;
    endDate?: string;
  },
  token?: string
): Promise<{ success: boolean; data: StudioIntelligenceSummary }> {
  const query = new URLSearchParams();
  if (filters?.productionCompanyId) query.append("productionCompanyId", filters.productionCompanyId);
  if (filters?.movieId) query.append("movieId", filters.movieId);
  if (filters?.theatreId) query.append("theatreId", filters.theatreId);
  if (filters?.startDate) query.append("startDate", filters.startDate);
  if (filters?.endDate) query.append("endDate", filters.endDate);

  const res = await fetch(`${API_BASE}/intelligence/studio/dashboard?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function generateStudioReport(
  data: {
    productionCompanyId?: string;
    movieId?: string;
    theatreId?: string;
    startDate?: string;
    endDate?: string;
  },
  token?: string
): Promise<{ success: boolean; data: StudioManagementReport }> {
  const res = await fetch(`${API_BASE}/intelligence/studio/report`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function exportStudioReportCsv(
  filters?: {
    productionCompanyId?: string;
    movieId?: string;
    theatreId?: string;
    startDate?: string;
    endDate?: string;
  },
  token?: string
): Promise<Blob> {
  const query = new URLSearchParams();
  if (filters?.productionCompanyId) query.append("productionCompanyId", filters.productionCompanyId);
  if (filters?.movieId) query.append("movieId", filters.movieId);
  if (filters?.theatreId) query.append("theatreId", filters.theatreId);
  if (filters?.startDate) query.append("startDate", filters.startDate);
  if (filters?.endDate) query.append("endDate", filters.endDate);
  query.append("format", "csv");

  const res = await fetch(`${API_BASE}/intelligence/studio/report/export?${query.toString()}`, {
    headers: getAuthHeader(token),
  });
  return res.blob();
}

// ==========================================
// PHASE 29: PIRACY RESPONSE ORCHESTRATION
// ==========================================

export interface OrchestrationStageData {
  session: {
    sessionId: string;
    activationId?: string;
    ticketNumber?: string;
    seatNumber?: string;
    movieTitle: string;
    theatreName: string;
    theatreCode: string;
    protectionStatus: string;
  };
  detection: {
    signalsEvaluated: number;
    signals: Array<{
      signalType: string;
      severity: string;
      riskScore: number;
      timestamp: string;
    }>;
    compositeRiskScore: number;
    escalationDecision: "NO_ESCALATION" | "USER_WARNING_ONLY" | "SOC_INCIDENT_ESCALATION";
    warningMessage?: string;
  };
  soc: {
    incidentId?: string;
    incidentNumber?: string;
    title?: string;
    severity?: string;
    status?: string;
    createdNewIncident: boolean;
  } | null;
  evidence: {
    evidenceId?: string;
    evidenceNumber?: string;
    classification?: string;
    sha256Hash?: string;
    isVerified: boolean;
    watermark?: {
      watermarkId: string;
      displayString: string;
      timeSlot: number;
    };
  } | null;
  investigationCase: {
    caseId?: string;
    caseNumber?: string;
    status?: string;
    severity?: string;
    createdNewCase: boolean;
  } | null;
  enforcement: {
    enforcementId?: string;
    enforcementNumber?: string;
    actionType?: string;
    status?: string;
    requiresHumanApproval: boolean;
    approvalStatus: string;
  } | null;
  studioIntelligence: {
    synced: boolean;
    threatPosture: string;
  };
}

export interface OrchestrationSummaryItem {
  orchestrationId: string;
  correlationId: string;
  status: "NOMINAL" | "WARNING" | "ESCALATED" | "COMPLETED";
  riskScore: number;
  escalated: boolean;
  pipelineStages: OrchestrationStageData;
  auditLogId?: string;
  sanitized: boolean;
  timestamp: string;
}

export async function processPiracyOrchestration(
  data: {
    sessionId: string;
    signals: Array<{
      signalType: string;
      severity?: string;
      payload?: Record<string, any>;
      metadata?: Record<string, any>;
    }>;
    theatreId?: string;
    showId?: string;
    movieId?: string;
    activationId?: string;
  },
  token?: string
): Promise<{ success: boolean; data: OrchestrationSummaryItem }> {
  const res = await fetch(`${API_BASE}/orchestration/process`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSessionOrchestration(
  sessionId: string,
  token?: string
): Promise<{ success: boolean; data: OrchestrationSummaryItem }> {
  const res = await fetch(`${API_BASE}/orchestration/session/${encodeURIComponent(sessionId)}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function fetchIncidentOrchestration(
  incidentId: string,
  token?: string
): Promise<{ success: boolean; data: OrchestrationSummaryItem }> {
  const res = await fetch(`${API_BASE}/orchestration/incident/${encodeURIComponent(incidentId)}`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export interface DemoStageItem {
  stage: string;
  status: "SUCCESS" | "WARNING" | "BLOCKED" | "FAILED";
  title: string;
  details: string;
  data?: Record<string, any>;
  timestamp: string;
}

export interface EndToEndDemoResult {
  executionId: string;
  correlationId: string;
  mode: "SAFE_DEMO" | "PRODUCTION_VALIDATION";
  overallStatus: "NOMINAL" | "WARNING" | "ESCALATED" | "COMPLETED";
  riskScore: number;
  stages: DemoStageItem[];
  summary: {
    sessionId: string;
    activationCode: string;
    secureQrToken: string;
    movieTitle: string;
    theatreName: string;
    theatreCode: string;
    protectionStatus: string;
    incidentId?: string;
    incidentNumber?: string;
    watermarkId?: string;
    watermarkDisplay?: string;
    evidenceId?: string;
    evidenceNumber?: string;
    evidenceHash?: string;
    isEvidenceVerified: boolean;
    caseId?: string;
    caseNumber?: string;
    caseStatus?: string;
    enforcementId?: string;
    enforcementNumber?: string;
    enforcementStatus?: string;
    humanApprovalStatus: string;
    isHumanApprovalMandatory: boolean;
    threatPosture: string;
    globalStudioRiskScore: number;
    zeroPiiVerified: boolean;
    tenantIsolationVerified: boolean;
  };
  studioIntelligence?: any;
  timestamp: string;
}

export interface DemoStatusResult {
  fixtures: {
    theatreName: string;
    theatreCode: string;
    movieTitle: string;
    ticketNumber: string;
    activationCode: string;
    secureQrToken: string;
    ticketStatus: string;
    activationStatus: string;
  };
  trace: OrchestrationSummaryItem | null;
}

export async function runEndToEndDemo(
  params?: { signalLevel?: string; autoApproveEnforcement?: boolean },
  token?: string
): Promise<{ success: boolean; data: EndToEndDemoResult }> {
  const res = await fetch(`${API_BASE}/orchestration/demo/run`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

export async function fetchDemoStatus(
  token?: string
): Promise<{ success: boolean; data: DemoStatusResult }> {
  const res = await fetch(`${API_BASE}/orchestration/demo/status`, {
    headers: getAuthHeader(token),
  });
  return res.json();
}

export async function resetDemoScenario(
  token?: string
): Promise<{ success: boolean; message: string; data: any }> {
  const res = await fetch(`${API_BASE}/orchestration/demo/reset`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function approveDemoEnforcement(
  enforcementId: string,
  notes?: string,
  token?: string
): Promise<{ success: boolean; data: any }> {
  const res = await fetch(`${API_BASE}/orchestration/demo/enforcement/approve`, {
    method: "POST",
    headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ enforcementId, notes }),
  });
  return res.json();
}






















