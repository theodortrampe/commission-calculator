# Known Issues

Tracked issues and technical debt to address in future sessions.

---

## Medium Priority

### 1. Notification System — Stub Only
**File**: `src/lib/notifications.ts`

The `notifyPayoutPublished` function is a console.log stub. No actual email/Slack integration exists. The file includes a commented-out Resend example. Implement when ready to notify reps of published payouts.

---

## Low Priority

### 2. Multi-Tenancy Hardcoded Org ID
**File**: `src/lib/constants.ts`

`CURRENT_ORG_ID` is hardcoded. Should be replaced with dynamic auth-based lookup when multi-tenancy is fully implemented.

---

## Resolved Issues

### ~~Hardcoded Currency Formatting~~ (Resolved Feb 18, 2026)
All frontend components used hardcoded `$` and `USD` labels regardless of the agent's currency setting. **Resolution**: Created shared `formatCurrency` utility in `src/lib/utils/format.ts` and replaced all hardcoded formatting across 12 UI components. Added `currency` field to `User` model. Calculation engine now selects `convertedEur`/`convertedUsd` based on user preference.

### ~~Plan Config NaN Bug~~ (Resolved Feb 18, 2026)
Adding a new accelerator tier in `version-editor.tsx` produced `NaN` for the prior tier's max attainment, preventing save. **Resolution**: Fixed `appendTier` logic to correctly set the prior tier's upper bound.

### ~~Test Coverage for UI Components~~ (Resolved Feb 17, 2026)
`CommissionMathExplainer`, `AuditLogSheet`, `RampConfigurationForm`, and `saveRampSteps` lacked tests. **Resolution**: Added 4 test files (32 new tests) using `@testing-library/react` for components and mocked Prisma for the server action. Updated Jest config with dual-project setup (node + jsdom). All 45 tests passing.

### ~~Middleware Deprecation Warning~~ (Resolved Feb 17, 2026)
Next.js 16 deprecated the `middleware.ts` file convention. **Resolution**: Renamed `src/middleware.ts` → `src/proxy.ts` and changed the default export to a named `proxy` export. Build confirms no deprecation warning.

### ~~Prisma Decimal Handling~~ (Resolved Feb 12, 2026)
The `guaranteedDraw` field previously used `Decimal` in the Prisma schema, causing type mismatch issues. **Resolution**: Refactored to `guaranteedDrawPercent Float?` — now stores a percentage of variable bonus instead of a fixed dollar amount, eliminating the Decimal precision concern entirely.

### ~~BigQuery Ingest / Import Route — planVersionId~~ (Resolved Feb 13, 2026)
Previously tracked as breaking change due to `planId` → `planVersionId` rename. **Resolution**: The plan versioning concept was removed; plans now use a single flat model with `planId` throughout. No breaking change remains.

### ~~Seed Script Lint Errors~~ (Resolved Feb 13, 2026)
Previously had TypeScript lint errors related to `OrderStatus` and `planVersionId` references. **Resolution**: Removed `OrderStatus` from seed data and regenerated Prisma client during the order status descoping.
