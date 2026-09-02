export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before tripping (default: 5)
  resetTimeoutMs?: number; // Milliseconds to wait before half-open probe (default: 10000)
  halfOpenMaxProbes?: number; // Number of successful probes to close circuit (default: 2)
  fallbackValue?: any;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChangeTime: Date;
}
