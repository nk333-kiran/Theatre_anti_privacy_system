# Enterprise Security Governance & Compliance

## 1. Governance Architecture

The Enterprise Governance layer bridges technical zero-trust controls with executive oversight, regulatory compliance, and multi-tenant accountability:
- **Policy Control**: Centralized rule definitions, staged rollouts, and rollback management.
- **Tenant Scope Enforcement**: Strict multi-tenant boundaries between studios and theatre exhibitors.
- **Evidence Governance**: Tamper-evident chain of custody, legal hold protections, and automated retention compliance.
- **Device Lifecycle**: Continuous trust scoring of theatre playback servers and staff terminals.

---

## 2. Multi-Tenant Role Isolation Matrix

| Role | Studio Content | Theatre Playback | Forensic Evidence | Security Policies | Break-Glass |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`ADMIN`** | Full | Full | Full | Read / Write | Can Activate |
| **`THEATRE_ADMIN`** | None | Own Venue | Own Venue | Read | No |
| **`PRODUCTION_COMPANY`** | Own Studio | Release Only | Own Releases | Read | No |
| **`THEATRE_STAFF`** | None | Assigned Show | Checkpoints | None | No |

---

## 3. Governance Audit Trail

All governance-related events are persisted immutably in `GovernanceAuditEvent`:
- `POLICY_CREATED`, `POLICY_MODIFIED`, `POLICY_ACTIVATED`, `POLICY_ROLLBACK`
- `PRIVILEGED_ACTION_REQUESTED`, `PRIVILEGED_ACTION_APPROVED`, `PRIVILEGED_ACTION_REJECTED`, `PRIVILEGED_ACTION_EXECUTED`
- `BREAK_GLASS_ACTIVATED`, `BREAK_GLASS_CLOSED`, `BREAK_GLASS_EXPIRED`
- `DEVICE_TRUST_UPDATED`
