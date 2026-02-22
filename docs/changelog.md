# Changelog

All notable changes to this project are documented in this file.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.2.1] — 2026-02-22

### Modified
- **Codebase Type Refinement** — Replaced broad `any` types with more specific type assertions (`unknown`, `never`, etc.) across admin plan forms, action payloads, and test files to improve type safety.
- **Error Handling Improvements** — Standardized error handling in `catch` blocks (e.g. `actions.ts`, `user-form-dialog.tsx`, `user-table.tsx`) to properly check `e instanceof Error` instead of using typed `any` catch variables.
- **Linting & Code Cleanup** — Resolved all remaining ESLint and TypeScript compilation warnings across the project. Removed unused imports and variables in UI components and test mocks (e.g., `ResizeObserver` polyfill warning).

---

## [1.2.0] — 2026-02-18

### Added
- **Test coverage for UI components and server action** — 32 new tests across 4 test files:
  - `CommissionMathExplainer` — 7 tests covering standard, ramped, prorated, draw top-up rendering branches
  - `AuditLogSheet` — 9 tests covering null states, conditional badges, ramp/proration/kicker/overage sections
  - `RampConfigurationForm` — 9 tests covering empty state, add/remove steps, global toggles, Card vs Inline variants
  - `saveRampSteps` server action — 7 tests covering transaction flow, field mapping, error handling, `revalidatePath`
- Installed `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom` as devDependencies

### Modified
- **Migrated `middleware.ts` → `proxy.ts`** — Renamed `src/middleware.ts` to `src/proxy.ts` and changed the default export to a named `proxy` export, resolving the Next.js 16 deprecation warning
- **Updated `jest.config.js`** — Split into dual-project setup: `node` environment for `.test.ts` files, `jsdom` environment for `.test.tsx` component tests
- **Updated `docs/known_issues.md`** — Moved middleware deprecation warning and test coverage items to Resolved Issues section

### Fixed
- **Plan configuration bug** — Fixed `appendTier` logic in `version-editor.tsx` that produced NaN for prior tier's max attainment when adding a new accelerator tier

---

## [1.1.0] — 2026-02-18

### Added
- **Per-agent currency support (EUR/USD)** — Added `currency` field to `User` model (default `"USD"`) with migration `20260218022503_add_user_currency`
- **Shared `formatCurrency` utility** — Created `src/lib/utils/format.ts` with locale-aware formatting: EUR uses `de-DE`, USD uses `en-US`
- **Currency in data import** — All three import routes (`csv/route.ts`, `execute/route.ts`, `bigquery/route.ts`) accept optional `currency` field and store it on user upsert
- **CSV Expected Columns reference** — Added a dynamic "Expected Columns" card to the CSV upload tab in `import-client.tsx`, showing required/optional columns with descriptions before file upload
- **Currency in BigQuery SQL samples** — Updated sample queries and JSON payload examples to include the `currency` field

### Modified
- **Calculation engine** — `calculateCommissions.ts` now selects `convertedEur` or `convertedUsd` based on the user's currency setting; `commissionLogic.ts` includes `currency` in `CommissionResult.periodData`
- **Dashboard components** — Replaced hardcoded `$` formatting with `formatCurrency` in `stats-cards.tsx`, `commission-math-explainer.tsx`, `orders-table.tsx`, and `dashboard-client.tsx`
- **Admin payout views** — Replaced local `formatCurrency` functions with shared import in `payouts-client.tsx` (14 calls), `payout-detail-client.tsx` (5 calls), `audit-log-sheet.tsx` (18 calls)
- **Rep payout pages** — Updated `dashboard/payouts/actions.ts` to include `user.currency` in Prisma queries; replaced hardcoded `$` in `payouts/page.tsx` and `payouts/[id]/page.tsx`
- **Admin order pages** — Replaced hardcoded `$`/`€` with `formatCurrency` in `orders-client.tsx` and `orders/[id]/page.tsx`
- **Import client descriptions** — Updated compensation data type description to mention optional currency field

---

## [1.0.0] — 2026-02-14

### Added
- **Order status descoping** — Removed `OrderStatus` enum entirely; all imported orders are now treated as approved
  - Migration: `20260214015456_remove_order_status`
  - Updated 12 files: schema, seed, calculation engine, import routes, UI components

### Modified
- Simplified `calculateCommissions.ts` by removing `APPROVED` status filter
- Simplified order import routes (`execute/route.ts`, `bigquery/orders/route.ts`) by removing status mapping
- Cleaned up `orders-client.tsx` and `orders-table.tsx` by removing status column, Badge, and statusColors

---

## [0.9.0] — 2026-02-13

### Added
- **Guaranteed draw as percentage** — Refactored `guaranteedDraw` from fixed dollar `Decimal` to `guaranteedDrawPercent Float?` storing percentage of variable bonus
- **Configurable ramp logic** — Added `disableAccelerators` and `disableKickers` boolean flags to `RampStep` model
  - Calculation engine respects per-step flags for accelerator/kicker suppression
  - New test case verifying accelerators work correctly when not disabled by ramp

### Fixed
- Resolved Prisma `Decimal` type mismatch issues by replacing with `Float`
- Fixed seed script lint errors related to `OrderStatus` and `planVersionId` references

---

## [0.8.0] — 2026-02-12

### Removed
- **Prisma debug scripts** — Deleted `prisma/test-connect.ts`, `prisma/test-connection.ts`
- **SQL password files** — Deleted `prisma/update_passwords.sql`, `prisma/update_password_final.sql`
- **Development scripts** — Deleted `scripts/reset-admin.js` and empty `scripts/` directory
- **Default Next.js boilerplate SVGs** — Deleted 5 unused files from `public/`

---

## [0.7.0] — 2026-02-11

### Added
- **Configurable ramp logic** — `RampStep` model extended with `disableAccelerators` and `disableKickers` flags

### Removed
- **Debug output files** — Deleted 30+ `test_*.txt` debug files from project root
- **Debug script** — Deleted `scripts/test_imports.js`

### Fixed
- Removed `process.stdout.write` debug statements from `rampLogic.ts` (2 statements) and `calculateCommissions.ts` (7 statements)
- Removed `console.log` debug statements from `prisma.ts` (2 statements)

---

## [0.6.0] — 2026-02-08

### Modified
- **Source code organization** — Moved `auth.ts` and `auth.edge.ts` from project root into `src/` directory
- Updated `middleware.ts` and `[...nextauth]/route.ts` imports to reflect new locations

### Fixed
- Wrapped `LoginPage` in `Suspense` boundary to resolve `useSearchParams` build error

---

## [0.5.0] — 2026-02-07

### Removed
- **Legacy import code** — Deleted `src/lib/import/orders.ts` and empty `src/lib/import/` directory
- **Old import UI** — Deleted `src/app/admin/orders/import/` directory (consolidated into `/admin/data-import`)
- **Payout detail page** — Deleted `src/app/admin/payouts/[id]/` (view button removed from payouts table)
- **Migration script** — Deleted `scripts/migrate-paid.js` (PAID → PUBLISHED migration completed)
- **Dead code in `actions.ts`** — Removed ~200 lines: `generatePayout()`, `getPayoutById()`, `createAdjustment()`, `updatePayoutStatus()`, `getPayoutsForMonth()`, `getAdjustmentsForMonth()`, and related interfaces

### Modified
- Cleaned up `import-client.tsx` — Removed redundant double-parsing logic in `handleImport`
- Removed unused imports: `OrderStatus` from `dashboard/actions.ts`, `Link` from `dashboard/page.tsx`, `Database` from `prisma.ts`
- Removed unused variable `hasAdjustments` from `payouts-client.tsx`

### Fixed
- Regenerated Prisma client to resolve missing `Session` and `Account` types in `seed.ts`
