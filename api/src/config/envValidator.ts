import dotenv from "dotenv";
import path from "path";

export interface ValidatedEnv {
  NODE_ENV: "development" | "staging" | "production" | "test";
  PORT: number;
  APP_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  STORAGE_BASE_DIR: string;
  MAX_VIDEO_UPLOAD_MB: number;
  DRM_PROVIDER: string;
  DRM_LICENSE_SERVER_URL?: string;
  CORS_ORIGIN: string[];
  MAINTENANCE_MODE: boolean;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  TRUST_PROXY: string | boolean | number;
  REQUEST_TIMEOUT_MS: number;
  DRAIN_TIMEOUT_MS: number;
  API_BASE_URL: string;
  WEB_BASE_URL: string;
  // Production Security & Observability additions
  BACKUP_STORAGE_DIR: string;
  METRICS_ENABLED: boolean;
  ALERTING_ENABLED: boolean;
  ENCRYPTION_KEY_ID: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  environment: string;
  missingKeys: string[];
  insecureKeys: string[];
  summary: string;
}

export function validateEnvironmentConfiguration(customEnv?: Record<string, string | undefined>): ConfigValidationResult {
  const targetEnv = customEnv || process.env;
  const rawNodeEnv = (targetEnv.NODE_ENV || "development").toLowerCase();
  const isProd = rawNodeEnv === "production" || rawNodeEnv === "staging";

  const missingKeys: string[] = [];
  const insecureKeys: string[] = [];

  const requiredInProd = [
    "DATABASE_URL",
    "JWT_SECRET",
  ];

  for (const key of requiredInProd) {
    const val = targetEnv[key];
    if (!val || val.trim() === "") {
      if (isProd) missingKeys.push(key);
    }
  }

  // Check weak secrets in production
  const jwt = targetEnv.JWT_SECRET || "";
  const weakPlaceholders = [
    "replace-with-cryptographically-secure-random-jwt-secret-in-production",
    "anti-piracy-theatre-platform-dev-secret-key-2026",
    "super-secret-theatre-anti-piracy-key-replace-in-production",
    "secret",
    "jwtsecret",
    "changeme",
    "development-secret-key-change-this-in-production-min-32-chars-long",
  ];

  if (isProd) {
    if (jwt && (jwt.length < 32 || weakPlaceholders.includes(jwt))) {
      insecureKeys.push("JWT_SECRET");
    }
    const cors = targetEnv.CORS_ORIGIN || "";
    if (cors.includes("*")) {
      insecureKeys.push("CORS_ORIGIN (wildcard prohibited in production)");
    }
  }

  const valid = missingKeys.length === 0 && insecureKeys.length === 0;

  return {
    valid,
    environment: rawNodeEnv,
    missingKeys,
    insecureKeys,
    summary: valid
      ? `Configuration valid for [${rawNodeEnv}]`
      : `Configuration validation failed for [${rawNodeEnv}]: Missing [${missingKeys.join(", ")}], Insecure [${insecureKeys.join(", ")}]`,
  };
}

export function validateAndLoadEnv(): ValidatedEnv {
  // Load environment variables without duplicating or overwriting inappropriately
  dotenv.config();
  dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

  const rawNodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
  const validEnvs = ["development", "staging", "production", "test"] as const;
  const nodeEnv: "development" | "staging" | "production" | "test" =
    validEnvs.includes(rawNodeEnv as any)
      ? (rawNodeEnv as any)
      : "development";

  const isProd = nodeEnv === "production" || nodeEnv === "staging";
  const port = parseInt(process.env.PORT || "4000", 10);
  const appVersion = process.env.APP_VERSION || "1.0.0";

  // Validate safely
  const validation = validateEnvironmentConfiguration();
  if (isProd && !validation.valid) {
    // Fail safely without printing secret values
    throw new Error(`FATAL STARTUP ERROR: Environment configuration invalid for [${nodeEnv}]. Missing: ${validation.missingKeys.join(", ") || "None"}. Insecure: ${validation.insecureKeys.join(", ") || "None"}.`);
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    (isProd
      ? ""
      : "postgresql://postgres:database@localhost:5432/theatre_antipiracy_db?schema=public");

  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    jwtSecret = "anti-piracy-theatre-platform-dev-secret-key-2026";
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "24h";
  const storageBaseDir = process.env.STORAGE_BASE_DIR || path.resolve(process.cwd(), "private_storage");
  const maxUploadMb = parseInt(process.env.MAX_VIDEO_UPLOAD_MB || "5000", 10);
  const drmProvider = (process.env.DRM_PROVIDER || "mock").toLowerCase();
  const drmLicenseServerUrl = process.env.DRM_LICENSE_SERVER_URL;

  const rawCors = process.env.CORS_ORIGIN;
  let corsOrigins: string[];
  if (rawCors) {
    corsOrigins = rawCors.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    corsOrigins = isProd
      ? ["https://theatre-security.com", "https://admin.theatre-security.com"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  const maintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const rawLogLevel = (process.env.LOG_LEVEL || (isProd ? "info" : "debug")).toLowerCase();
  const logLevel: "debug" | "info" | "warn" | "error" =
    ["debug", "info", "warn", "error"].includes(rawLogLevel)
      ? (rawLogLevel as any)
      : "info";

  let trustProxy: string | boolean | number = false;
  if (process.env.TRUST_PROXY) {
    const tp = process.env.TRUST_PROXY.trim().toLowerCase();
    if (tp === "true" || tp === "1") {
      trustProxy = true;
    } else if (tp === "false" || tp === "0") {
      trustProxy = false;
    } else if (!isNaN(Number(tp))) {
      trustProxy = Number(tp);
    } else {
      trustProxy = process.env.TRUST_PROXY;
    }
  }

  const requestTimeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10);
  const drainTimeoutMs = parseInt(process.env.DRAIN_TIMEOUT_MS || "10000", 10);
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
  const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
  const backupStorageDir = process.env.BACKUP_STORAGE_DIR || path.resolve(storageBaseDir, "backups");
  const metricsEnabled = process.env.METRICS_ENABLED !== "false";
  const alertingEnabled = process.env.ALERTING_ENABLED !== "false";
  const encryptionKeyId = process.env.ENCRYPTION_KEY_ID || "kms-theatre-prod-key-01";
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    APP_VERSION: appVersion,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    STORAGE_BASE_DIR: storageBaseDir,
    MAX_VIDEO_UPLOAD_MB: maxUploadMb,
    DRM_PROVIDER: drmProvider,
    DRM_LICENSE_SERVER_URL: drmLicenseServerUrl,
    CORS_ORIGIN: corsOrigins,
    MAINTENANCE_MODE: maintenanceMode,
    LOG_LEVEL: logLevel,
    TRUST_PROXY: trustProxy,
    REQUEST_TIMEOUT_MS: requestTimeoutMs,
    DRAIN_TIMEOUT_MS: drainTimeoutMs,
    API_BASE_URL: apiBaseUrl,
    WEB_BASE_URL: webBaseUrl,
    BACKUP_STORAGE_DIR: backupStorageDir,
    METRICS_ENABLED: metricsEnabled,
    ALERTING_ENABLED: alertingEnabled,
    ENCRYPTION_KEY_ID: encryptionKeyId,
    RATE_LIMIT_WINDOW_MS: rateLimitWindowMs,
    RATE_LIMIT_MAX: rateLimitMax,
  };
}

export const env = validateAndLoadEnv();
