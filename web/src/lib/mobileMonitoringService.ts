import { MobileApiService, MobileSessionData } from "./mobileService";

export type NormalizedMobileEventType =
  | "CAMERA_ACTIVITY"
  | "SCREEN_CAPTURE_SIGNAL"
  | "SCREEN_VISIBILITY_CHANGE"
  | "FULLSCREEN_EXIT"
  | "SUSPICIOUS_ACTIVITY"
  | "MOBILE_SECURITY_EVENT";

export interface SecurityWarning {
  id: string;
  signalType: NormalizedMobileEventType;
  title: string;
  message: string;
  timestamp: string;
  riskScore: number;
}

export type WarningCallback = (warning: SecurityWarning) => void;
export type EventLoggedCallback = (event: { id: string; type: string; severity: string; time: string; status: string }) => void;

export class MobileMonitoringService {
  private static isMonitoring = false;
  private static currentSession: MobileSessionData | null = null;
  private static authToken: string | null = null;
  private static warningCallbacks: WarningCallback[] = [];
  private static eventLoggedCallbacks: EventLoggedCallback[] = [];
  private static lastEventTimestamps: Record<string, number> = {};

  // Debounce duplicate noisy signals (minimum 3.5 seconds between identical signal types)
  private static DEBOUNCE_MS = 3500;

  /**
   * Start passive client-side security monitoring for an active screening session
   */
  public static startMonitoring(
    session: MobileSessionData,
    token: string,
    onWarning?: WarningCallback,
    onEventLogged?: EventLoggedCallback
  ): void {
    if (typeof window === "undefined") return;

    this.currentSession = session;
    this.authToken = token;

    if (onWarning) this.warningCallbacks.push(onWarning);
    if (onEventLogged) this.eventLoggedCallbacks.push(onEventLogged);

    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // 1. Visibility Change Listener (Tab switch, home screen minimize)
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // 2. Window Blur Listener (App focus lost)
    window.addEventListener("blur", this.handleWindowBlur);

    // 3. Fullscreen Exit Listener
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);

    // 4. Capture Key Combos Listener (PrintScreen, Ctrl+P, Mac Screenshots)
    window.addEventListener("keydown", this.handleKeyCombination);

    // 5. Camera Permission & Hardware Query Listener
    this.monitorCameraState();
  }

  /**
   * Stop active security monitoring and remove event listeners
   */
  public static stopMonitoring(): void {
    if (typeof window === "undefined" || !this.isMonitoring) return;
    this.isMonitoring = false;

    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleWindowBlur);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    window.removeEventListener("keydown", this.handleKeyCombination);

    this.warningCallbacks = [];
    this.eventLoggedCallbacks = [];
    this.currentSession = null;
    this.authToken = null;
  }

  public static getStatus(): boolean {
    return this.isMonitoring;
  }

  // --- INTERNAL SIGNAL HANDLERS ---

  private static handleVisibilityChange = () => {
    if (document.hidden) {
      MobileMonitoringService.dispatchSignal("SCREEN_VISIBILITY_CHANGE", {
        reason: "Screen hidden or application minimized during active screening",
      });
    }
  };

  private static handleWindowBlur = () => {
    MobileMonitoringService.dispatchSignal("SUSPICIOUS_ACTIVITY", {
      reason: "Application window focus lost to background task or overlay",
    });
  };

  private static handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      MobileMonitoringService.dispatchSignal("FULLSCREEN_EXIT", {
        reason: "Fullscreen viewing mode was exited during active screening session",
      });
    }
  };

  private static handleKeyCombination = (e: KeyboardEvent) => {
    // PrintScreen
    if (e.key === "PrintScreen" || e.keyCode === 44) {
      e.preventDefault();
      MobileMonitoringService.dispatchSignal("SCREEN_CAPTURE_SIGNAL", {
        key: "PrintScreen",
        reason: "System print screen / screenshot key pressed",
      });
    }

    // Ctrl+P (Print) or Command+P
    if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      MobileMonitoringService.dispatchSignal("SCREEN_CAPTURE_SIGNAL", {
        key: "PrintKeyCombination",
        reason: "Print shortcut triggered during protected playback",
      });
    }

    // Command + Shift + 3 or 4 (Mac Screenshots)
    if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
      MobileMonitoringService.dispatchSignal("SCREEN_CAPTURE_SIGNAL", {
        key: "MacScreenshotCombination",
        reason: "macOS screen recording / capture shortcut triggered",
      });
    }
  };

  private static monitorCameraState = async () => {
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "camera" as any });
        status.onchange = () => {
          if (status.state === "granted") {
            MobileMonitoringService.dispatchSignal("CAMERA_ACTIVITY", {
              permissionState: status.state,
              reason: "Camera permission state changed to granted during screening",
            });
          }
        };
      } catch {
        // Non-fatal
      }
    }
  };

  /**
   * Dispatches normalized signal to backend SOC API with debouncing and safe warning display
   */
  public static async dispatchSignal(
    signalType: NormalizedMobileEventType,
    payload: Record<string, any> = {}
  ): Promise<void> {
    const now = Date.now();
    const lastTime = this.lastEventTimestamps[signalType] || 0;

    // Debounce rapid noisy signals
    if (now - lastTime < this.DEBOUNCE_MS) {
      return;
    }
    this.lastEventTimestamps[signalType] = now;

    const session = this.currentSession;
    if (!session) return;

    // Safety rule: Calculate severity based on signal
    const severity =
      signalType === "SCREEN_CAPTURE_SIGNAL"
        ? "HIGH"
        : signalType === "CAMERA_ACTIVITY"
        ? "HIGH"
        : signalType === "FULLSCREEN_EXIT"
        ? "MEDIUM"
        : "LOW";

    try {
      const res = await MobileApiService.sendSecurityEvent(
        {
          eventType: signalType,
          severity,
          sessionId: session.sessionId,
          theatreId: session.theatre.id,
          showId: session.show.id,
          movieId: session.movie.id,
          activationId: session.activationId,
          payload: {
            ...payload,
            clientTimestamp: new Date().toISOString(),
            platform: "Mobile-Monitoring-Service",
          },
          metadata: {
            staffName: session.staffName,
            movieTitle: session.movie.title,
          },
        },
        this.authToken || undefined
      );

      // Log event into session history
      const loggedItem = {
        id: res.data?.eventId || `EVT-${Date.now().toString().slice(-4)}`,
        type: signalType,
        severity,
        time: new Date().toLocaleTimeString(),
        status: res.data?.status || "INGESTED",
      };
      this.eventLoggedCallbacks.forEach((cb) => cb(loggedItem));

      // Trigger warning banner if needed
      const warning: SecurityWarning = {
        id: loggedItem.id,
        signalType,
        title: "⚠️ Anti-Piracy Protection Notice",
        message:
          signalType === "SCREEN_CAPTURE_SIGNAL"
            ? "Screen capture key combination detected. Recording or photography is strictly prohibited."
            : signalType === "CAMERA_ACTIVITY"
            ? "Camera state change detected. Video recording is forbidden during screening."
            : signalType === "FULLSCREEN_EXIT"
            ? "Fullscreen viewing mode was exited. Please maintain full focus on the screening session."
            : "Recording or photography is not permitted during this screening.",
        timestamp: new Date().toLocaleTimeString(),
        riskScore: res.data?.riskScore || (severity === "HIGH" ? 75 : 35),
      };

      this.warningCallbacks.forEach((cb) => cb(warning));
    } catch (err) {
      console.warn("Could not dispatch mobile security signal:", err);
    }
  }
}
