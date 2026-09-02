"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  QrCode,
  Film,
  Lock,
  Mail,
  User,
  LogOut,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Radio,
  Activity,
  Send,
  Building2,
  Clock,
  Camera,
  CameraOff,
  ChevronRight,
  ChevronDown,
  Info,
  Timer,
  Eye,
  EyeOff,
  Maximize,
  Volume2,
  X,
  KeyRound,
  Fingerprint,
  Search,
  Database,
  FileCheck,
  Wifi,
  WifiOff,
  Smartphone,
  CheckCircle,
  Server,
  Settings,
  HelpCircle,
  UploadCloud,
  FileImage,
  Cpu,
  Globe,
  Sliders,
} from "lucide-react";
import {
  MobileApiService,
  MobileSessionData,
  MobileUserProfile,
  getMobileAuthToken,
  getMobileUser,
  clearMobileAuth,
  getCachedActiveSession,
} from "../../lib/mobileService";
import {
  MobileMonitoringService,
  SecurityWarning,
  NormalizedMobileEventType,
} from "../../lib/mobileMonitoringService";
import {
  getApiBaseUrl,
  setCustomApiBaseUrl,
  resetCustomApiBaseUrl,
} from "../../lib/api";

export type TabType = "home" | "scanner" | "session" | "security" | "attribution" | "diagnostics";

export default function MobileAppPage() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [email, setEmail] = useState("staff@theatre.com");
  const [password, setPassword] = useState("admin123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Camera & Real QR Scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [isSecureContextState, setIsSecureContextState] = useState(true);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scanner manual/fallback & file scan state
  const [manualCode, setManualCode] = useState("");
  const [showDevTools, setShowDevTools] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [fileScanLoading, setFileScanLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    data?: MobileSessionData;
    message?: string;
    errorCode?: string;
  } | null>(null);

  // Protected Session state
  const [activeSession, setActiveSession] = useState<MobileSessionData | null>(null);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [sessionRemainingSec, setSessionRemainingSec] = useState<number | null>(null);

  // Dynamic Watermark state
  const [watermark, setWatermark] = useState<{
    watermarkId: string;
    sessionId: string;
    theatreCode: string;
    theatreName: string;
    screenName: string;
    seatNumber: string;
    timestamp: string;
    timeSlot: number;
    rotationIntervalSec: number;
    displayString: string;
  } | null>(null);
  const [watermarkLoading, setWatermarkLoading] = useState(false);

  // Forensic Attribution state
  const [attributionInput, setAttributionInput] = useState("");
  const [attributionLoading, setAttributionLoading] = useState(false);
  const [attributionResult, setAttributionResult] = useState<any | null>(null);
  const [attributionError, setAttributionError] = useState<string | null>(null);
  const [evidenceCreated, setEvidenceCreated] = useState<any | null>(null);

  // Anti-Piracy Monitoring & Warnings state
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [activeWarning, setActiveWarning] = useState<SecurityWarning | null>(null);

  // Security Event State
  const [eventType, setEventType] = useState<NormalizedMobileEventType>("MOBILE_SECURITY_EVENT");
  const [severity, setSeverity] = useState<"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [eventCategory, setEventCategory] = useState("DEVICE_INTEGRITY_CHECK");
  const [eventSending, setEventSending] = useState(false);
  const [eventResult, setEventResult] = useState<{
    eventId: string;
    correlationId: string;
    status: string;
    riskScore?: number;
    correlatedIncidentId?: string;
    warningRequired?: boolean;
    warningMessage?: string;
    timestamp: string;
  } | null>(null);
  const [eventHistory, setEventHistory] = useState<Array<{
    id: string;
    type: string;
    severity: string;
    time: string;
    status: string;
  }>>([]);

  // Diagnostics & Connectivity State
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>("");
  const [customApiInput, setCustomApiInput] = useState<string>("");
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [apiHealth, setApiHealth] = useState<{
    connected: boolean;
    latencyMs: number | null;
    statusText: string;
    checkedAt: string | null;
    error?: string;
  }>({
    connected: false,
    latencyMs: null,
    statusText: "Untested",
    checkedAt: null,
  });

  // Initialize auth & environment capabilities
  useEffect(() => {
    const existingToken = getMobileAuthToken();
    const existingUser = getMobileUser();
    const cachedSession = getCachedActiveSession();

    if (existingToken && existingUser) {
      setToken(existingToken);
      setUser(existingUser);
    }
    if (cachedSession) {
      setActiveSession(cachedSession);
    }

    if (typeof window !== "undefined") {
      setIsSecureContextState(window.isSecureContext ?? false);
      setBarcodeDetectorSupported("BarcodeDetector" in window);
      const currentUrl = getApiBaseUrl();
      setApiBaseUrlState(currentUrl);
      setCustomApiInput(currentUrl);
    }

    setAuthLoading(false);
  }, []);

  // Run initial background API connectivity probe
  useEffect(() => {
    if (!authLoading) {
      performApiPing();
    }
  }, [authLoading]);

  // Protected Session Timer & Auto-Expiry Countdown
  useEffect(() => {
    if (!activeSession) {
      setSessionRemainingSec(null);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const endTimestamp = activeSession.expiresAt
        ? new Date(activeSession.expiresAt).getTime()
        : new Date(activeSession.show.endTime).getTime();

      const diffSec = Math.floor((endTimestamp - now) / 1000);
      if (diffSec <= 0) {
        setSessionRemainingSec(0);
        setActiveSession((prev) => (prev ? { ...prev, protectionStatus: "EXPIRED" } : null));
        MobileMonitoringService.stopMonitoring();
        setIsMonitoringActive(false);
      } else {
        setSessionRemainingSec(diffSec);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.sessionId, activeSession?.expiresAt, activeSession?.show.endTime]);

  // Dynamic Watermark Polling & Periodic Rotation (Every 25s)
  useEffect(() => {
    if (!activeSession || activeSession.protectionStatus !== "ACTIVE" || !token) {
      setWatermark(null);
      return;
    }

    const fetchWatermark = async () => {
      const res = await MobileApiService.getSessionWatermark(activeSession.sessionId, token);
      if (res.success && res.data) {
        setWatermark(res.data);
      }
    };

    fetchWatermark();
    const rotationInterval = setInterval(fetchWatermark, 25000);
    return () => clearInterval(rotationInterval);
  }, [activeSession?.sessionId, activeSession?.protectionStatus, token]);

  // Start / Stop Client Security Monitoring when Session changes
  useEffect(() => {
    if (token && activeSession && activeSession.protectionStatus === "ACTIVE") {
      MobileMonitoringService.startMonitoring(
        activeSession,
        token,
        (warning) => {
          setActiveWarning(warning);
        },
        (loggedEvent) => {
          setEventHistory((prev) => [loggedEvent, ...prev]);
        }
      );
      setIsMonitoringActive(true);
    } else {
      MobileMonitoringService.stopMonitoring();
      setIsMonitoringActive(false);
    }

    return () => {
      MobileMonitoringService.stopMonitoring();
    };
  }, [token, activeSession?.sessionId, activeSession?.protectionStatus]);

  // Cleanup camera stream on unmount or tab switch away from scanner
  useEffect(() => {
    if (activeTab !== "scanner") {
      stopCamera();
    }
  }, [activeTab]);

  // Ping API for connectivity diagnostics
  const performApiPing = async () => {
    setPingLoading(true);
    const start = performance.now();
    const url = getApiBaseUrl();
    const probeUrl = `${url.replace(/\/api$/, "")}/health`;

    try {
      const res = await fetch(probeUrl, { method: "GET", cache: "no-store" });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        setApiHealth({
          connected: true,
          latencyMs: duration,
          statusText: json.status === "OK" ? "Healthy (200 OK)" : `Connected (${res.status})`,
          checkedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setApiHealth({
          connected: false,
          latencyMs: duration,
          statusText: `HTTP Error ${res.status}`,
          checkedAt: new Date().toLocaleTimeString(),
          error: `Server returned status ${res.status}`,
        });
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setApiHealth({
        connected: false,
        latencyMs: duration,
        statusText: "Connection Failed",
        checkedAt: new Date().toLocaleTimeString(),
        error: err.message || "Network unreachable. Check LAN IP / Firewall.",
      });
    } finally {
      setPingLoading(false);
    }
  };

  // Format countdown mm:ss
  const formatCountdown = (totalSec: number | null) => {
    if (totalSec === null) return "--:--";
    if (totalSec <= 0) return "EXPIRED";
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Handle camera start with Android HTTPS / Insecure Context intelligence
  const startCamera = async () => {
    setCameraError(null);

    // Insecure context check on mobile
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setPermissionState("denied");
      setCameraError(
        "Android/Web security requires HTTPS or localhost for live camera access. Over plain HTTP LAN IP, use the 'Take Photo / Snapshot' button below or configure Chrome flags."
      );
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setCameraError("Live camera stream is not supported in this browser context. Please use Photo Capture or manual code entry.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setPermissionState("granted");

      // Start automatic barcode detection loop if available
      startBarcodeDetection();
    } catch (err: any) {
      setCameraActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setCameraError("Camera permission denied. Please allow camera permissions in browser settings or use the Photo / Snapshot button.");
      } else {
        setCameraError(err.message || "Failed to start camera viewfinder.");
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Automated frame scanner using BarcodeDetector API if supported
  const startBarcodeDetection = () => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "data_matrix"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !scanLoading) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detectedCode = barcodes[0].rawValue;
                if (detectedCode) {
                  stopCamera();
                  handleVerifyTicket(detectedCode);
                }
              }
            } catch {
              // Frame decode error - continue
            }
          }
        }, 400);
      } catch {
        // Fallback to manual entry
      }
    }
  };

  // Handle Photo / File Snapshot Upload (Android Native Camera Fallback)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanLoading(true);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.onload = async () => {
        try {
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["qr_code", "data_matrix"],
            });
            const barcodes = await barcodeDetector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              setFileScanLoading(false);
              handleVerifyTicket(barcodes[0].rawValue);
              return;
            }
          }

          // Fallback: If BarcodeDetector couldn't extract or is unsupported, inform operator
          setFileScanLoading(false);
          setScanResult({
            success: false,
            message: "Captured image processed. If automatic QR decode is not supported by your browser, please enter the ticket number or token below.",
            errorCode: "PHOTO_PROCESSED_USE_CODE",
          });
        } catch (err: any) {
          setFileScanLoading(false);
          setScanResult({
            success: false,
            message: "Unable to parse QR code from photo. Please align and snap closer or enter code manually.",
            errorCode: "DECODE_ERROR",
          });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value so same photo can be re-selected
    e.target.value = "";
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const res = await MobileApiService.login(email, password);
    setLoginLoading(false);

    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      setActiveTab("home");
      performApiPing();
    } else {
      setLoginError(res.message || "Invalid credentials. Please check email and password.");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    stopCamera();
    MobileMonitoringService.stopMonitoring();
    clearMobileAuth();
    setToken(null);
    setUser(null);
    setActiveSession(null);
    setWatermark(null);
    setScanResult(null);
    setActiveWarning(null);
    setActiveTab("home");
  };

  // Handle Ticket QR Verification
  const handleVerifyTicket = async (codeToVerify?: string) => {
    const payload = codeToVerify || manualCode;
    if (!payload.trim()) {
      setScanResult({
        success: false,
        message: "Please enter or scan a valid QR ticket code.",
        errorCode: "EMPTY_INPUT",
      });
      return;
    }

    setScanLoading(true);
    setScanResult(null);
    setLastScannedCode(payload.trim());
    setLastScannedTime(new Date().toLocaleTimeString());

    const result = await MobileApiService.verifyTicketQR(payload, token || undefined);
    setScanLoading(false);
    setScanResult(result);

    if (result.success && result.data) {
      setActiveSession(result.data);
      stopCamera();
      // Auto-log initial screening event
      setEventHistory((prev) => [
        {
          id: `EVT-VERIFY-${Date.now().toString().slice(-4)}`,
          type: "QR_TICKET_VERIFIED",
          severity: "INFO",
          time: new Date().toLocaleTimeString(),
          status: "INGESTED",
        },
        ...prev,
      ]);
    }
  };

  // Refresh Session
  const handleRefreshSession = async () => {
    if (!activeSession) return;
    setSessionRefreshing(true);
    const res = await MobileApiService.getSession(activeSession.sessionId, token || undefined);
    setSessionRefreshing(false);
    if (res.success && res.data) {
      setActiveSession(res.data);
    }
  };

  // Copy Session ID
  const handleCopySessionId = () => {
    if (activeSession?.sessionId) {
      navigator.clipboard.writeText(activeSession.sessionId);
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    }
  };

  // Handle Forensic Attribution Lookup
  const handleAttributeWatermark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attributionInput.trim()) return;

    setAttributionLoading(true);
    setAttributionResult(null);
    setAttributionError(null);
    setEvidenceCreated(null);

    const res = await MobileApiService.attributeWatermark(attributionInput.trim(), token || undefined);
    setAttributionLoading(false);

    if (res.success && res.data) {
      setAttributionResult(res.data);
    } else {
      setAttributionError(res.message || "Watermark signature verification failed or tampered.");
    }
  };

  // Handle Recording Forensic Evidence to Evidence Vault
  const handleCreateEvidence = async () => {
    if (!attributionResult) return;
    const res = await MobileApiService.createForensicEvidence(
      {
        watermarkId: attributionResult.watermarkId,
        sessionId: attributionResult.sessionId,
        reason: "Operator initiated forensic watermark trace log",
      },
      token || undefined
    );
    if (res.success && res.data) {
      setEvidenceCreated(res.data);
    }
  };

  // Handle Dispatching Mobile Security Event
  const handleSendSecurityEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventSending(true);
    setEventResult(null);

    const res = await MobileApiService.sendSecurityEvent(
      {
        eventType,
        severity,
        sessionId: activeSession?.sessionId,
        theatreId: activeSession?.theatre.id || user?.theatreId || undefined,
        showId: activeSession?.show.id,
        movieId: activeSession?.movie.id,
        activationId: activeSession?.activationId,
        payload: {
          eventCategory,
          batteryLevel: 94,
          networkType: "5G-SECURE",
          platform: "Mobile-PWA",
          activeWatermarkId: watermark?.watermarkId,
        },
        metadata: {
          staffName: user?.name,
          staffRole: user?.role,
        },
      },
      token || undefined
    );

    setEventSending(false);

    if (res.success && res.data) {
      setEventResult(res.data);
      setEventHistory((prev) => [
        {
          id: res.data!.eventId,
          type: eventType,
          severity,
          time: new Date().toLocaleTimeString(),
          status: res.data!.status,
        },
        ...prev,
      ]);

      if (res.data.warningRequired && res.data.warningMessage) {
        setActiveWarning({
          id: res.data.eventId,
          signalType: eventType,
          title: "⚠️ Anti-Piracy Protection Notice",
          message: res.data.warningMessage,
          timestamp: new Date().toLocaleTimeString(),
          riskScore: res.data.riskScore || 50,
        });
      }
    }
  };

  // Handle Save Custom API URL
  const handleSaveCustomApiUrl = () => {
    if (customApiInput.trim()) {
      setCustomApiBaseUrl(customApiInput.trim());
      setApiBaseUrlState(customApiInput.trim());
    } else {
      resetCustomApiBaseUrl();
      setApiBaseUrlState(getApiBaseUrl());
      setCustomApiInput(getApiBaseUrl());
    }
    setShowApiConfig(false);
    performApiPing();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 tracking-wider uppercase font-mono">
            Initializing Mobile Guard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-0 sm:p-4">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-slate-900 sm:rounded-3xl border border-slate-800 shadow-2xl min-h-screen sm:min-h-[840px] flex flex-col relative overflow-hidden">
        
        {/* Top Status Header */}
        <header className="bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white uppercase">Mobile Guard</span>
                {isMonitoringActive ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    WATERMARK ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Real Device Integration &bull; Phase 31</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Diagnostic Pill */}
            <button
              onClick={() => setActiveTab("diagnostics")}
              title="Connection Diagnostics"
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 border transition ${
                apiHealth.connected
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${apiHealth.connected ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
              <span>{apiHealth.connected ? `${apiHealth.latencyMs || 0}ms` : "OFFLINE"}</span>
            </button>

            {token && user && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Global Security Warning Modal Banner */}
        {activeWarning && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-3 z-40 backdrop-blur flex items-start gap-3 animate-in fade-in slide-in-from-top duration-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                  {activeWarning.title}
                </span>
                <span className="text-[10px] font-mono text-amber-400/80">{activeWarning.timestamp}</span>
              </div>
              <p className="mt-0.5 text-amber-200/90 text-[11px] leading-relaxed">
                {activeWarning.message}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-400">Signal: {activeWarning.signalType}</span>
                <button
                  onClick={() => setActiveWarning(null)}
                  className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] transition border border-amber-500/30"
                >
                  Acknowledge & Continue
                </button>
              </div>
            </div>
            <button
              onClick={() => setActiveWarning(null)}
              className="text-amber-400/70 hover:text-white transition"
              title="Close Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {!token ? (
            /* ======================================================= */
            /* SCREEN 1: LOGIN                                         */
            /* ======================================================= */
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-1.5">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Staff Authentication</h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Secure sign-in for checkpoint staff & theatre administrators
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{loginError}</span>
                    {!apiHealth.connected && (
                      <p className="text-[11px] text-rose-300/80 mt-1">
                        API server is currently unreachable. Check that backend is running and LAN IP is configured.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Staff Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@theatre.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
                >
                  {loginLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Checkpoint</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials Helper */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Demo Credentials</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("staff@theatre.com");
                      setPassword("admin123");
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition"
                  >
                    Theatre Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@theatre.com");
                      setPassword("admin123");
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition"
                  >
                    Theatre Admin
                  </button>
                </div>
              </div>

              {/* Diagnostic Link on Login */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("diagnostics")}
                  className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 font-mono transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Network & Device Diagnostics</span>
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================= */
            /* AUTHENTICATED TABS                                      */
            /* ======================================================= */
            <>
              {/* TAB 1: HOME */}
              {activeTab === "home" && (
                <div className="space-y-4">
                  {/* User Profile Card */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-white leading-tight">{user?.name}</h2>
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">{user?.email}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {user?.role}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Venue Security Binding:</span>
                      <span className="text-slate-200 font-semibold">{user?.theatreId ? "AUTHORIZED VENUE" : "GLOBAL ADMIN"}</span>
                    </div>
                  </div>

                  {/* Primary Call to Action: Scan Movie Ticket */}
                  <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/40">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Scan Movie Ticket</h3>
                        <p className="text-xs text-slate-400">Live camera QR verification</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      Point device camera at attendee ticket QR code to verify admission and launch active anti-piracy session.
                    </p>

                    <button
                      onClick={() => {
                        setScanResult(null);
                        setActiveTab("scanner");
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-600/30 transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Launch QR Camera Scanner</span>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                  </div>

                  {/* Active Session Shortcut (if exists) */}
                  {activeSession ? (
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Active Protection Session
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          {activeSession.protectionStatus}
                        </span>
                      </div>

                      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white truncate max-w-[180px]">
                            {activeSession.movie.title}
                          </span>
                          <span className="text-slate-400 font-mono">Seat: {activeSession.seatNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{activeSession.theatre.name}</span>
                          <span>{activeSession.screen.name}</span>
                        </div>
                        {/* Live Session Timer & Watermark Pill */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                            Watermark:
                          </span>
                          <span className="text-indigo-300 truncate max-w-[160px]">
                            {watermark ? watermark.watermarkId : "ROTATING..."}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("session")}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
                      >
                        <Film className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Protected Screening Session</span>
                        <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
                      <p className="text-xs text-slate-400">No active screening session.</p>
                      <p className="text-[11px] text-slate-500">Scan a ticket to initialize session monitoring.</p>
                    </div>
                  )}

                  {/* Forensic Attribution Shortcut */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Watermark Forensic Attribution
                        </h4>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono">EVIDENCE VAULT</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Investigate leaked recordings by matching dynamic watermark identifiers to specific patron sessions.
                    </p>
                    <button
                      onClick={() => setActiveTab("attribution")}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition"
                    >
                      <Search className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Investigate Watermark Leak</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
                    </button>
                  </div>

                  {/* Diagnostics Shortcut */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Device & LAN Diagnostics</h4>
                        <p className="text-[11px] text-slate-400">Connectivity, Camera & Sensors</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("diagnostics")}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      Open Diagnostics
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: QR SCANNER */}
              {activeTab === "scanner" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">QR Ticket Scanner</h2>
                      <p className="text-xs text-slate-400">Live camera scan & ticket verification</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {cameraActive ? "CAMERA ACTIVE" : "STANDBY"}
                    </span>
                  </div>

                  {/* Real Camera Viewfinder Container */}
                  <div className="relative aspect-square max-h-72 w-full bg-slate-950 border-2 border-indigo-500/40 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-inner">
                    {/* Live HTML5 Video Element */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                    />

                    {/* Viewfinder Target Framing */}
                    <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400" />

                      {/* Animated Laser Scanning Line */}
                      {cameraActive && !scanLoading && (
                        <div className="w-full h-0.5 bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)] animate-pulse" />
                      )}
                    </div>

                    {/* Loading Overlay */}
                    {scanLoading || fileScanLoading ? (
                      <div className="relative z-20 flex flex-col items-center gap-3 bg-slate-950/85 p-4 rounded-2xl border border-indigo-500/30">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                        <p className="text-xs font-mono text-indigo-300 font-semibold animate-pulse">
                          {fileScanLoading ? "Decoding Ticket Photo..." : "Verifying Ticket with SOC..."}
                        </p>
                      </div>
                    ) : !cameraActive ? (
                      <div className="relative z-20 flex flex-col items-center gap-3 p-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <Camera className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Camera Standby</p>
                          <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                            Use live viewfinder or snap a photo of attendee ticket QR.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-1">
                          <button
                            onClick={startCamera}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Start Live Camera</span>
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
                          >
                            <FileImage className="w-4 h-4 text-indigo-400" />
                            <span>Take Photo / Snap QR</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 inset-x-3 z-20 flex justify-between items-center bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                        <span>Align ticket QR in frame</span>
                        <button
                          onClick={stopCamera}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <CameraOff className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden Native File / Camera Input for Android Fallback */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />

                  {/* Camera / Insecure Context Guidance Alert */}
                  {cameraError && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-semibold text-white">Camera Access Notice</p>
                          <p className="text-[11px] text-amber-300/90 mt-0.5">{cameraError}</p>
                        </div>
                      </div>

                      {/* Android HTTP over LAN guidance */}
                      <div className="pt-2 border-t border-amber-500/20 text-[11px] space-y-1 font-mono text-amber-200/80">
                        <p className="font-semibold text-amber-300">💡 Android Testing Options:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                          <li>
                            Use <strong>Take Photo / Snap QR</strong> button to capture via Android native camera app.
                          </li>
                          <li>
                            Or in Android Chrome, enable flag: <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> and add this host.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Scan Result Alert / Session Preview */}
                  {scanResult && (
                    <div
                      className={`p-4 rounded-2xl border ${
                        scanResult.success
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                          : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                      } space-y-3`}
                    >
                      <div className="flex items-start gap-3">
                        {scanResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {scanResult.success ? "VERIFIED — ADMISSION GRANTED" : "VERIFICATION REJECTED"}
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5">{scanResult.message}</p>
                          {scanResult.errorCode && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                              Error Code: {scanResult.errorCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {scanResult.success && scanResult.data && (
                        <div className="bg-slate-950/80 rounded-xl p-3 border border-emerald-500/20 text-xs space-y-1.5 font-mono text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Movie:</span>
                            <span className="text-white font-bold">{scanResult.data.movie.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Theatre:</span>
                            <span>{scanResult.data.theatre.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Screen / Seat:</span>
                            <span>
                              {scanResult.data.screen.name} &bull; Seat {scanResult.data.seatNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Session ID:</span>
                            <span className="text-emerald-400">{scanResult.data.sessionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Protection:</span>
                            <span className="text-emerald-400 font-bold">{scanResult.data.protectionStatus}</span>
                          </div>
                        </div>
                      )}

                      {scanResult.success ? (
                        <button
                          onClick={() => setActiveTab("session")}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Open Protected Screening Session</span>
                          <ArrowRight className="w-4 h-4 ml-auto" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setScanResult(null);
                            setManualCode("");
                            startCamera();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                        >
                          Scan Another Ticket
                        </button>
                      )}
                    </div>
                  )}

                  {/* Manual / Direct Code Entry (Fallback & Testing) */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Manual Token Entry / Backup Input
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDevTools(!showDevTools)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                      >
                        <span>{showDevTools ? "Hide Tools" : "Show Presets"}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showDevTools ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Paste QRTK token, activation link, or ticket ID"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        onClick={() => handleVerifyTicket(manualCode)}
                        disabled={scanLoading || !manualCode.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                      >
                        Verify
                      </button>
                    </div>

                    {/* Developer Presets (Collapsed by default) */}
                    {showDevTools && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <p className="text-[10px] text-slate-500 font-mono">Mobile Test Verification Presets:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["ACT-DEMO-01", "TCK-IMAX-01", "ACT-AVATAR-3", "TCK-VIP-99"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setManualCode(preset);
                                handleVerifyTicket(preset);
                              }}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-indigo-300 transition"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PROTECTED SCREENING SESSION WITH DYNAMIC WATERMARK OVERLAY */}
              {activeTab === "session" && (
                <div className="space-y-4">
                  {activeSession ? (
                    <>
                      {/* Session Header Badge & Live Protection Indicator */}
                      <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                        {/* Dynamic Floating Watermark Pattern Overlay */}
                        {activeSession.protectionStatus === "ACTIVE" && watermark && (
                          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 opacity-20 select-none overflow-hidden rotate-[-6deg]">
                            <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 truncate">
                              {watermark.displayString}
                            </div>
                            <div className="text-[9px] font-mono tracking-widest text-indigo-400 ml-8 truncate">
                              {watermark.watermarkId} &bull; {new Date(watermark.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 ml-auto truncate">
                              {activeSession.theatre.code} &bull; Seat {activeSession.seatNumber}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between relative z-20">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                              Protected Screening Session
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            activeSession.protectionStatus === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              activeSession.protectionStatus === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`} />
                            {activeSession.protectionStatus}
                          </span>
                        </div>

                        {/* Session Timer & Auto-Expiry Countdown */}
                        <div className="bg-slate-900/90 rounded-xl px-3 py-2.5 border border-slate-800 flex items-center justify-between relative z-20">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs text-slate-400 font-mono">Protection Window:</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {formatCountdown(sessionRemainingSec)}
                          </span>
                        </div>

                        {/* Session ID Pill with Copy */}
                        <div className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2 border border-slate-800 relative z-20">
                          <div className="text-xs font-mono truncate text-slate-300">
                            <span className="text-slate-500 mr-2">SESSION:</span>
                            <span>{activeSession.sessionId}</span>
                          </div>
                          <button
                            onClick={handleCopySessionId}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Copy Session ID"
                          >
                            {copiedSessionId ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Active Dynamic Watermark Badge */}
                      {watermark && (
                        <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider">
                              <Fingerprint className="w-4 h-4" />
                              <span>Dynamic Watermark (Rotating)</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              SLOT #{watermark.timeSlot}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 font-mono text-[11px] space-y-1">
                            <div className="flex justify-between text-slate-300">
                              <span className="text-slate-500">ID:</span>
                              <span className="text-indigo-300 font-semibold truncate max-w-[220px]">
                                {watermark.watermarkId}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Rotation Cycle: {watermark.rotationIntervalSec}s</span>
                              <span>Timestamp: {new Date(watermark.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Movie Information Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          <Film className="w-4 h-4" />
                          <span>Movie Details</span>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-extrabold text-white leading-tight">
                            {activeSession.movie.title}
                          </h3>

                          <div className="flex flex-wrap gap-2 text-xs font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {activeSession.movie.durationMinutes} mins
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {activeSession.movie.language}
                            </span>
                            {activeSession.movie.rating && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {activeSession.movie.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Theatre & Screen Details */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          <Building2 className="w-4 h-4" />
                          <span>Venue & Seating</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-500 font-mono block">THEATRE</span>
                            <span className="font-semibold text-slate-200">{activeSession.theatre.name}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{activeSession.theatre.location}</span>
                          </div>

                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-500 font-mono block">SCREEN / SEAT</span>
                            <span className="font-semibold text-slate-200">{activeSession.screen.name}</span>
                            <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
                              Seat: {activeSession.seatNumber}
                            </span>
                          </div>
                        </div>

                        {/* Show Times */}
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <div>
                              <span className="text-[10px] text-slate-500 font-mono block">SCHEDULED TIME</span>
                              <span className="text-slate-300 font-mono text-[11px]">
                                {new Date(activeSession.show.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {new Date(activeSession.show.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {activeSession.show.status}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => setActiveTab("security")}
                          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch SOC Security Event</span>
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={handleRefreshSession}
                            disabled={sessionRefreshing}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${sessionRefreshing ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                          </button>
                          <button
                            onClick={() => {
                              setScanResult(null);
                              setActiveTab("scanner");
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Scan Next Ticket</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Film className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">No Active Session Found</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                          Scan a movie ticket QR to load verified screening session parameters.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("scanner")}
                        className="mt-2 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Go to QR Scanner</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FORENSIC WATERMARK ATTRIBUTION & EVIDENCE VAULT */}
              {activeTab === "attribution" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Watermark Forensic Attribution</h2>
                      <p className="text-xs text-slate-400">Match leaked watermark code to session</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      VAULT LINKED
                    </span>
                  </div>

                  <form onSubmit={handleAttributeWatermark} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Watermark Identifier / String
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={attributionInput}
                          onChange={(e) => setAttributionInput(e.target.value)}
                          placeholder="WM-CODE-SESSION-SLOT-HMAC"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={attributionLoading || !attributionInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                        >
                          {attributionLoading ? "Attributing..." : "Attributed"}
                        </button>
                      </div>
                    </div>

                    {watermark && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Current Session Watermark:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAttributionInput(watermark.watermarkId);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Paste Active ID
                        </button>
                      </div>
                    )}
                  </form>

                  {attributionError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Attribution Failed</p>
                        <p className="text-[11px] text-rose-400/90 mt-0.5">{attributionError}</p>
                      </div>
                    </div>
                  )}

                  {attributionResult && (
                    <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            100% Cryptographic Match
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                          MATCH VERIFIED
                        </span>
                      </div>

                      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Movie:</span>
                          <span className="text-white font-bold">{attributionResult.movie.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Theatre / Screen:</span>
                          <span>{attributionResult.theatre.name} &bull; {attributionResult.screen.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Seat Number:</span>
                          <span className="text-emerald-400 font-bold">Seat {attributionResult.seatNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ticket Number:</span>
                          <span>{attributionResult.ticketNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Session ID:</span>
                          <span className="text-indigo-300">{attributionResult.sessionId}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateEvidence}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition"
                      >
                        <Database className="w-4 h-4" />
                        <span>Log Trace to Evidence Vault</span>
                      </button>

                      {evidenceCreated && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-[11px] font-mono text-emerald-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Evidence Number:</span>
                            <span className="font-bold">{evidenceCreated.evidenceNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SHA-256 Hash:</span>
                            <span className="truncate max-w-[150px]">{evidenceCreated.evidenceHash}</span>
                          </div>
                          <div className="flex justify-between text-slate-300 text-[10px]">
                            <span>Status: {evidenceCreated.status}</span>
                            <span>Classification: {evidenceCreated.classification}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SOC SECURITY EVENTS */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Security Telemetry & SOC</h2>
                      <p className="text-xs text-slate-400">Real-time anti-piracy signal transmitter</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      SOC CONNECTED
                    </span>
                  </div>

                  {/* Manual / Test Signal Dispatcher Form */}
                  <form
                    onSubmit={handleSendSecurityEvent}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Normalized Signal Type
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as NormalizedMobileEventType)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                      >
                        <option value="SCREEN_CAPTURE_SIGNAL">SCREEN_CAPTURE_SIGNAL (Key Combo / Capture)</option>
                        <option value="CAMERA_ACTIVITY">CAMERA_ACTIVITY (Camera State Query)</option>
                        <option value="SCREEN_VISIBILITY_CHANGE">SCREEN_VISIBILITY_CHANGE (Tab Switch)</option>
                        <option value="FULLSCREEN_EXIT">FULLSCREEN_EXIT (Window Resize/Exit)</option>
                        <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS_ACTIVITY (App Focus Lost)</option>
                        <option value="MOBILE_SECURITY_EVENT">MOBILE_SECURITY_EVENT (Standard Telemetry)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Severity
                        </label>
                        <select
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Category
                        </label>
                        <select
                          value={eventCategory}
                          onChange={(e) => setEventCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="DEVICE_INTEGRITY_CHECK">Integrity Check</option>
                          <option value="ANOMALOUS_HEURISTIC_OBSERVED">Anomalous Heuristic</option>
                          <option value="ENVIRONMENT_HEALTH">Environment Health</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Bound Session:</span>
                        <span className="text-slate-200 truncate max-w-[150px]">
                          {activeSession ? activeSession.sessionId : "UNBOUND"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Watermark:</span>
                        <span className="text-slate-200 truncate max-w-[150px]">
                          {watermark ? watermark.watermarkId : "NONE"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={eventSending}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-600/25 disabled:opacity-50 transition"
                    >
                      {eventSending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Signal to SOC API</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Dispatch Confirmation Card */}
                  {eventResult && (
                    <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2 text-xs text-emerald-300">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Security Event Ingested & Correlated</span>
                      </div>
                      <div className="font-mono text-[11px] space-y-1 text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Event ID:</span>
                          <span className="text-emerald-400">{eventResult.eventId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Correlation ID:</span>
                          <span>{eventResult.correlationId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Risk:</span>
                          <span className="text-amber-400 font-bold">{eventResult.riskScore || 30}/100</span>
                        </div>
                        {eventResult.correlatedIncidentId && (
                          <div className="flex justify-between text-indigo-300">
                            <span>SOC Incident ID:</span>
                            <span className="font-bold">{eventResult.correlatedIncidentId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Platform & Browser Architecture Statement */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <Info className="w-3.5 h-3.5" />
                      <span>Browser Sandbox & Non-Punitive Notice</span>
                    </div>
                    <p className="text-[10px]">
                      Client security signals utilize W3C standard event listeners. In strict compliance with web security boundaries, browser code does not claim to disable hardware lenses or detect external physical recording devices.
                    </p>
                  </div>

                  {/* Live Event Stream Log */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Session Security Event Stream
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">{eventHistory.length} events</span>
                    </div>

                    {eventHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono py-2 text-center">
                        No security signals detected in this session yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {eventHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px] font-mono"
                          >
                            <div>
                              <span className="text-slate-200 font-semibold">{item.type}</span>
                              <span className="text-slate-500 block text-[10px]">{item.id} &bull; {item.time}</span>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.severity === "HIGH" || item.severity === "CRITICAL"
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                              }`}
                            >
                              {item.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: DIAGNOSTICS & CONNECTION STATUS */}
              {activeTab === "diagnostics" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Device & Connection Diagnostics</h2>
                      <p className="text-xs text-slate-400">Real-time status of mobile integration stack</p>
                    </div>
                    <button
                      onClick={performApiPing}
                      disabled={pingLoading}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${pingLoading ? "animate-spin" : ""}`} />
                      <span>Ping Test</span>
                    </button>
                  </div>

                  {/* 1. API Connectivity Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          API Connectivity
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        apiHealth.connected
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}>
                        {apiHealth.connected ? "ONLINE" : "DISCONNECTED"}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Endpoint URL:</span>
                        <span className="text-indigo-300 truncate max-w-[200px]" title={apiBaseUrl}>
                          {apiBaseUrl}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Health Probe:</span>
                        <span className={apiHealth.connected ? "text-emerald-400" : "text-rose-400 font-bold"}>
                          {apiHealth.statusText}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Roundtrip Latency:</span>
                        <span>{apiHealth.latencyMs !== null ? `${apiHealth.latencyMs} ms` : "--"}</span>
                      </div>
                      {apiHealth.checkedAt && (
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Last Checked:</span>
                          <span>{apiHealth.checkedAt}</span>
                        </div>
                      )}
                    </div>

                    {/* URL Config Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowApiConfig(!showApiConfig)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                      >
                        <span>{showApiConfig ? "Hide API URL Configuration" : "Configure Custom API URL"}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showApiConfig ? "rotate-180" : ""}`} />
                      </button>

                      {showApiConfig && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                          <label className="block text-[10px] uppercase font-mono text-slate-400">
                            Custom Base URL (e.g. http://192.168.1.100:4000/api)
                          </label>
                          <input
                            type="text"
                            value={customApiInput}
                            onChange={(e) => setCustomApiInput(e.target.value)}
                            placeholder="http://192.168.x.x:4000/api"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                          />
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleSaveCustomApiUrl}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                            >
                              Save & Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                resetCustomApiBaseUrl();
                                setApiBaseUrlState(getApiBaseUrl());
                                setCustomApiInput(getApiBaseUrl());
                                setShowApiConfig(false);
                                performApiPing();
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs"
                            >
                              Reset to Default
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Authentication & Venue Binding Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Authentication Status
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        AUTHENTICATED
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Operator:</span>
                        <span className="text-white font-bold">{user?.name || "--"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="truncate max-w-[180px]">{user?.email || "--"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Role:</span>
                        <span className="text-indigo-400 font-bold">{user?.role || "--"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Venue Scope:</span>
                        <span className="text-slate-200">{user?.theatreId ? `VENUE BINDING (${user.theatreId.slice(0, 8)}...)` : "GLOBAL ADMIN"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Camera & Permission Environment Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Camera & Security Context
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        isSecureContextState
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      }`}>
                        {isSecureContextState ? "SECURE CONTEXT" : "INSECURE HTTP"}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">isSecureContext:</span>
                        <span className={isSecureContextState ? "text-emerald-400" : "text-amber-400"}>
                          {isSecureContextState ? "YES (HTTPS / Localhost)" : "NO (Plain HTTP)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">MediaDevices API:</span>
                        <span>{typeof navigator !== "undefined" && navigator.mediaDevices ? "AVAILABLE" : "RESTRICTED"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Permission State:</span>
                        <span className="uppercase text-slate-200 font-bold">{permissionState}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Camera Viewfinder:</span>
                        <span>{cameraActive ? "ACTIVE STREAM" : "STANDBY"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. QR Scanner Hardware & History */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          QR Scanner Subsystem
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {barcodeDetectorSupported ? "HW ACCELERATED" : "CANVAS / PHOTO"}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">BarcodeDetector API:</span>
                        <span>{barcodeDetectorSupported ? "SUPPORTED" : "FALLBACK MODE"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Photo Capture Scanner:</span>
                        <span className="text-emerald-400 font-semibold">READY (capture=environment)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Scanned Code:</span>
                        <span className="text-indigo-300 truncate max-w-[170px]">{lastScannedCode || "None"}</span>
                      </div>
                      {lastScannedTime && (
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Scan Timestamp:</span>
                          <span>{lastScannedTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Protected Session & Dynamic Watermark Status */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Screening Session & Watermark
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        activeSession?.protectionStatus === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {activeSession ? activeSession.protectionStatus : "NO SESSION"}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Session ID:</span>
                        <span className="text-indigo-300 truncate max-w-[180px]">
                          {activeSession ? activeSession.sessionId : "UNBOUND"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Watermark Status:</span>
                        <span>{watermark ? `ACTIVE (Slot #${watermark.timeSlot})` : "IDLE"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Remaining:</span>
                        <span className="text-emerald-400 font-bold">{formatCountdown(sessionRemainingSec)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. SOC Telemetry Connection */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          SOC Telemetry Link
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        INGESTION READY
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telemetry Stream:</span>
                        <span className={isMonitoringActive ? "text-emerald-400" : "text-slate-400"}>
                          {isMonitoringActive ? "TRANSMITTING" : "STANDBY"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dispatched Events:</span>
                        <span>{eventHistory.length} events logged</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Notice:</span>
                        <span>{activeWarning ? "WARNING ACTIVE" : "NONE (NORMAL)"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Fixed Navigation Bar (Visible when authenticated) */}
        {token && (
          <nav className="bg-slate-950/95 backdrop-blur border-t border-slate-800 px-1 py-2 absolute bottom-0 inset-x-0 z-30 flex items-center justify-around">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "home" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[9px]">Home</span>
            </button>

            <button
              onClick={() => {
                setScanResult(null);
                setActiveTab("scanner");
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "scanner" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[9px]">Scan</span>
            </button>

            <button
              onClick={() => setActiveTab("session")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "session" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="text-[9px]">Session</span>
            </button>

            <button
              onClick={() => setActiveTab("attribution")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "attribution" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span className="text-[9px]">Attrib</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "security" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span className="text-[9px]">SOC</span>
            </button>

            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                activeTab === "diagnostics" ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="text-[9px]">Diag</span>
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
