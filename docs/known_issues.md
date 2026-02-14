# Known Issues

Tracked issues and technical debt to address in future sessions.

---

## Medium Priority

### 1. Notification System — Stub Only
**File**: `src/lib/notifications.ts`

The `notifyPayoutPublished` function is a console.log stub. No actual email/Slack integration exists. The file includes a commented-out Resend example. Implement when ready to notify reps of published payouts.

---

## Low Priority

### 2. Middleware Deprecation Warning
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```
Next.js 16 has deprecated the `middleware.ts` convention. Should migrate to the new `proxy` convention when time permits.

### 3. Test Coverage for New UI Components
The following components lack test coverage:
- `CommissionMathExplainer` — complex conditional rendering
- `AuditLogSheet` — calculation breakdown display
- `RampConfigurationForm` — dynamic form with add/remove steps
- `saveRampSteps` server action — atomic transaction logic

### 4. Multi-Tenancy Hardcoded Org ID
**File**: `src/lib/constants.ts`

`CURRENT_ORG_ID` is hardcoded. Should be replaced with dynamic auth-based lookup when multi-tenancy is fully implemented.

---

## Resolved Issues

### ~~Prisma Decimal Handling~~ (Resolved Feb 12, 2026)
The `guaranteedDraw` field previously used `Decimal` in the Prisma schema, causing type mismatch issues. **Resolution**: Refactored to `guaranteedDrawPercent Float?` — now stores a percentage of variable bonus instead of a fixed dollar amount, eliminating the Decimal precision concern entirely.

### ~~BigQuery Ingest / Import Route — planVersionId~~ (Resolved Feb 13, 2026)
Previously tracked as breaking change due to `planId` → `planVersionId` rename. **Resolution**: The plan versioning concept was removed; plans now use a single flat model with `planId` throughout. No breaking change remains.

### ~~Seed Script Lint Errors~~ (Resolved Feb 13, 2026)
Previously had TypeScript lint errors related to `OrderStatus` and `planVersionId` references. **Resolution**: Removed `OrderStatus` from seed data and regenerated Prisma client during the order status descoping.
