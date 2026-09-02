"use strict";
/**
 * Production Secrets Manager & Leak Prevention
 *
 * Supports pluggable providers (EnvSecretProvider, AWS Secrets Manager,
 * Azure Key Vault, Google Secret Manager, HashiCorp Vault).
 * Provides leak scanning to prevent secrets from reaching logs, frontend bundles, or databases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.secretsManager = exports.SecretsManager = exports.EnvSecretProvider = void 0;
class EnvSecretProvider {
    name = "EnvironmentSecretProvider";
    async getSecret(key) {
        return this.getSecretSync(key);
    }
    getSecretSync(key) {
        return process.env[key];
    }
    async hasSecret(key) {
        return process.env[key] !== undefined && process.env[key] !== "";
    }
}
exports.EnvSecretProvider = EnvSecretProvider;
class SecretsManager {
    static instance;
    provider;
    knownSecretKeys = new Set([
        "DATABASE_URL",
        "JWT_SECRET",
        "ENCRYPTION_MASTER_KEY",
        "FORENSIC_HMAC_SECRET",
        "DRM_PRIVATE_KEY",
        "AWS_SECRET_ACCESS_KEY",
        "AZURE_CLIENT_SECRET",
        "GCP_SERVICE_ACCOUNT_KEY",
        "VAULT_TOKEN",
    ]);
    constructor() {
        this.provider = new EnvSecretProvider();
    }
    static getInstance() {
        if (!SecretsManager.instance) {
            SecretsManager.instance = new SecretsManager();
        }
        return SecretsManager.instance;
    }
    setProvider(provider) {
        this.provider = provider;
    }
    getProviderName() {
        return this.provider.name;
    }
    async getSecret(key) {
        return this.provider.getSecret(key);
    }
    getSecretSync(key) {
        return this.provider.getSecretSync(key);
    }
    getRequiredSecret(key) {
        const val = this.provider.getSecretSync(key);
        if (!val) {
            throw new Error(`CRITICAL: Required production secret [${key}] is missing from provider [${this.provider.name}].`);
        }
        return val;
    }
    /**
     * Scans a target string or object to ensure known secret values are not leaked.
     */
    scanForLeaks(target, contextLabel) {
        const textToScan = typeof target === "string" ? target : JSON.stringify(target);
        const leaks = [];
        for (const key of this.knownSecretKeys) {
            const secretVal = this.provider.getSecretSync(key);
            if (secretVal && secretVal.length > 5 && textToScan.includes(secretVal)) {
                leaks.push({
                    location: contextLabel,
                    keyName: key,
                    severity: "CRITICAL",
                });
            }
        }
        return {
            passed: leaks.length === 0,
            leaksDetected: leaks,
        };
    }
    /**
     * Redacts any known secret values from arbitrary strings or logs.
     */
    redactKnownSecrets(text) {
        let sanitized = text;
        for (const key of this.knownSecretKeys) {
            const secretVal = this.provider.getSecretSync(key);
            if (secretVal && secretVal.length > 3) {
                sanitized = sanitized.split(secretVal).join(`[REDACTED_${key}]`);
            }
        }
        return sanitized;
    }
}
exports.SecretsManager = SecretsManager;
exports.secretsManager = SecretsManager.getInstance();
