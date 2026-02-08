# Code Cleanup Log - Feb 7, 2026

## Deleted Files
- `src/lib/import/orders.ts`: Redundant legacy code replaced by API routes.
- `src/lib/import/`: Directory removed as it was empty after file deletion.
- `src/app/admin/orders/import/`: Directory removed (functionality consolidated into `/admin/data-import`).

## Refactored Code
- `src/app/admin/data-import/import-client.tsx`: Removed redundant double-parsing logic in `handleImport`. Now uses single-pass flow.
- `src/app/dashboard/actions.ts`: Removed unused `OrderStatus` import.
- `src/app/admin/payouts/payouts-client.tsx`: Removed unused `hasAdjustments` variable.
- `src/app/dashboard/page.tsx`: Removed unused `Link` import.
- `src/lib/prisma.ts`: Removed unused `Database` import and `sqlite` type definition.

## Fixes
- **Prisma Client**: Regenerated client to resolve missing `Session` and `Account` types in `seed.ts`.
- **Type Safety**: Verified no unused locals or parameters remain (via temporary strict `tsconfig` check).

---

# Cleanup Changelog (2026-02-06)

## Deleted Files

### `src/app/admin/payouts/[id]/` (entire folder)
- `page.tsx` - Payout detail page route
- `payout-detail-client.tsx` - Detail view component with PAID status references

**Reason**: View button was removed from payouts table; this page is no longer navigated to.

---

### `scripts/migrate-paid.js`
One-time migration script to convert PAID status to PUBLISHED.

**Reason**: Migration completed, no longer needed.

---

## Removed Functions from `actions.ts`

| Function | Purpose | Replaced By |
|----------|---------|-------------|
| `generatePayout()` | Create single payout | `generateBulkPayouts()` |
| `getPayoutById()` | Fetch single payout | No longer needed |
| `createAdjustment()` | Payout-scoped adjustment | `createUserAdjustment()` |
| `updatePayoutStatus()` | Single status update | `publishBulkPayouts()` |
| `getPayoutsForMonth()` | Get payouts list | `getAllUserEarnings()` |
| `getAdjustmentsForMonth()` | Get adjustments list | Embedded in `getAllUserEarnings()` |

---

## Removed Interfaces from `actions.ts`

| Interface | Reason |
|-----------|--------|
| `PayoutWithAdjustments` | Only used by deleted functions |
| `AdjustmentWithUser` | Only used by `getAdjustmentsForMonth()` |

---

## Lines Removed
~200 lines of dead code removed from `actions.ts`

## Files Affected
- `src/app/admin/payouts/actions.ts` - Major cleanup
- `src/app/admin/payouts/[id]/` - Deleted
- `scripts/migrate-paid.js` - Deleted

---

# Code Organization - Feb 8, 2026

## File Movements
- Moved `auth.ts` from root to `src/auth.ts` to consolidate source code.
- Moved `auth.edge.ts` from root to `src/auth.edge.ts` to keep auth logic together.
- Moved content of `CLEANUP_CHANGELOG.md` to `docs/cleanup_log.md` and deleted the original file.

## Code Updates
- Updated `src/middleware.ts` to import `auth.edge` from local `./auth.edge`.
- Updated `src/app/api/auth/[...nextauth]/route.ts` to import `auth` from `@/auth`.
- **Fixed Build Error**: Wrapped `LoginPage` in `src/app/login/page.tsx` with a `Suspense` boundary to handle `useSearchParams` during build.
