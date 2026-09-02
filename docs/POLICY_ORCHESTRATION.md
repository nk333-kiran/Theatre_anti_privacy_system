# Security Policy Orchestration & Version Management

## 1. Overview

The Policy Orchestrator (`policyOrchestrator.ts`) provides a declarative, version-controlled policy framework governing all sensitive actions across the platform, including playback authorization, DRM licensing, evidence access, and administrative operations.

---

## 2. Policy Structure

```json
{
  "name": "4K Release DRM Licensing Gate",
  "policyType": "DRM_LICENSE",
  "priority": 10,
  "rules": [
    {
      "id": "rule-drm-1",
      "name": "Require Trusted Device",
      "effect": "DENY",
      "condition": {
        "requireTrustedDevice": true
      }
    },
    {
      "id": "rule-drm-2",
      "name": "Require High Trust Score",
      "effect": "REQUIRE_APPROVAL",
      "condition": {
        "minTrustScore": 75
      }
    }
  ]
}
```

---

## 3. Evaluation Precedence & Conflict Resolution

1. **Priority Ordering**: Policies are indexed with an integer `priority` (1–100). Lower integer indices are evaluated before higher ones.
2. **Explicit Deny Precedence**: If a rule with `DENY` effect is satisfied, access is immediately denied regardless of subsequent matching `ALLOW` rules.
3. **Approval Override**: If a rule triggers `REQUIRE_APPROVAL`, the request is routed into the two-person Privileged Action approval workflow.
4. **Tenant Scoping**: Global policies apply across all venues. Tenant-specific policies override global defaults when matched.

---

## 4. Immutable Version Snapshots & Rollback

- Every modification to a policy increments its `version` counter and archives the previous state in `PolicyVersion`.
- Administrators can perform a one-click rollback to any historical version snapshot.
- Rollbacks create an explicit forward version (e.g. rolling back from v3 to v1 creates v4 with the rule set of v1), maintaining full audit integrity.
