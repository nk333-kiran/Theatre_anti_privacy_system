/**
 * Production Secrets Manager & Leak Prevention
 * 
 * Supports pluggable providers (EnvSecretProvider, AWS Secrets Manager,
 * Azure Key Vault, Google Secret Manager, HashiCorp Vault).
 * Provides leak scanning to prevent secrets from reaching logs, frontend bundles, or databases.
 */

export interface ISecretProvider {
  name: string;
  getSecret(key: string): Promise<string | undefined>;
  getSecretSync(key: string): string | undefined;
  hasSecret(key: string): Promise<boolean>;
}

export class EnvSecretProvider implements ISecretProvider {
  public readonly name = "EnvironmentSecretProvider";

  public async getSecret(key: string): Promise<string | undefined> {
    return this.getSecretSync(key);
  }

  public getSecretSync(key: string): string | undefined {
    return process.env[key];
  }

  public async hasSecret(key: string): Promise<boolean> {
    return process.env[key] !== undefined && process.env[key] !== "";
  }
}

export interface SecretAuditResult {
  passed: boolean;
  leaksDetected: Array<{
    location: string;
    keyName: string;
    severity: "HIGH" | "CRITICAL";
  }>;
}

export class SecretsManager {
  private static instance: SecretsManager;
  private provider: ISecretProvider;
  private knownSecretKeys: Set<string> = new Set([
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

  private constructor() {
    this.provider = new EnvSecretProvider();
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  public setProvider(provider: ISecretProvider): void {
    this.provider = provider;
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async getSecret(key: string): Promise<string | undefined> {
    return this.provider.getSecret(key);
  }

  public getSecretSync(key: string): string | undefined {
    return this.provider.getSecretSync(key);
  }

  public getRequiredSecret(key: string): string {
    const val = this.provider.getSecretSync(key);
    if (!val) {
      throw new Error(`CRITICAL: Required production secret [${key}] is missing from provider [${this.provider.name}].`);
    }
    return val;
  }

  /**
   * Scans a target string or object to ensure known secret values are not leaked.
   */
  public scanForLeaks(target: string | Record<string, any>, contextLabel: string): SecretAuditResult {
    const textToScan = typeof target === "string" ? target : JSON.stringify(target);
    const leaks: SecretAuditResult["leaksDetected"] = [];

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
  public redactKnownSecrets(text: string): string {
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

export const secretsManager = SecretsManager.getInstance();
