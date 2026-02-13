# Known Issues

Tracked issues and technical debt to address in future sessions.

---

## Medium Priority

### 1. Notification System — Stub Only
**File**: `src/lib/notifications.ts`

The `notifyPayoutPublished` function is a console.log stub. No actual email/Slack integration exists. The file includes a commented-out Resend example. Implement when ready to notify reps of published payouts.

### 2. BigQuery Ingest API — Breaking Change in Payload
**File**: `src/app/api/ingest/bigquery/route.ts`

The `planId` field in the `BigQueryRow` interface was renamed to `planVersionId` to match the schema change. Any existing BigQuery sync jobs or external integrations sending `planId` will silently fail to link period data to a plan version. Document or add backward compatibility.

### 3. Import Execute Route — Version Lookup on Import
**File**: `src/app/api/import/execute/route.ts`

When importing compensation data, the code now fetches the default plan's latest version ID to populate `planVersionId`. This means all imported data is linked to whatever version happens to be latest at import time, which may not be the correct version for historical data imports.

---

## Low Priority

### 4. Middleware Deprecation Warning
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```
Next.js 16 has deprecated the `middleware.ts` convention. Should migrate to the new `proxy` convention when time permits.

### 5. Test Coverage for New UI Components
The following new components lack test coverage:
- `CommissionMathExplainer` — complex conditional rendering
- `AuditLogSheet` — calculation breakdown display
- `RampConfigurationForm` — dynamic form with add/remove steps
- `saveRampSteps` server action — atomic transaction logic

### 6. Seed Script Lint Errors
**File**: `prisma/seed.ts`

The seed script has several TypeScript lint errors related to field names (`planId`, `organizationId`) that don't match the current Prisma schema. These are pre-existing issues from earlier schema refactors. The seed still runs correctly at runtime but the types are out of sync with the generated Prisma client.

---

## Resolved Issues

### ~~Prisma Decimal Handling~~ (Resolved Feb 12, 2026)
The `guaranteedDraw` field previously used `Decimal` in the Prisma schema, causing type mismatch issues. **Resolution**: Refactored to `guaranteedDrawPercent Float?` — now stores a percentage of variable bonus instead of a fixed dollar amount, eliminating the Decimal precision concern entirely.
