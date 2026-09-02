# Production Secrets Management

## 1. Secrets Provider Architecture

The platform provides an abstract secret provider interface (`ISecretProvider`) implemented by default by `EnvSecretProvider`, and easily extensible to enterprise Key Management Services:

- **AWS Secrets Manager / Parameter Store**
- **Azure Key Vault**
- **Google Cloud Secret Manager**
- **HashiCorp Vault**

```typescript
export interface ISecretProvider {
  name: string;
  getSecret(key: string): Promise<string | undefined>;
  getSecretSync(key: string): string | undefined;
  hasSecret(key: string): Promise<boolean>;
}
```

## 2. Zero-Leakage Guarantees

1. **Automated Leak Scanning**: `SecretsManager.scanForLeaks()` scans log outputs and response payloads for accidental secret values.
2. **Safe Error Handling**: `errorHandler` sanitizes database connection strings and raw error stacks in staging and production modes.
3. **Frontend Variable Isolation**: Only variables prefixed with `NEXT_PUBLIC_` are visible in frontend browser bundles; build-time security scans assert zero server secrets are present.
