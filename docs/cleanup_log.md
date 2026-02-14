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

---

# Debug Cleanup — Feb 10, 2026

## Deleted Files (31 files)

### Debug Output Files (30 files in project root)

| File | Description |
|------|-------------|
| `test_debug.txt` | Ramp logic debug output |
| `test_debug_2.txt` | Ramp logic debug output |
| `test_debug_accel.txt` | Accelerator debug output |
| `test_debug_details.txt` | Detailed debug output |
| `test_debug_final.txt` | Final debug output |
| `test_debug_fixed.txt` | Debug output after fix |
| `test_debug_force.txt` | Forced debug output |
| `test_debug_force_3.txt` | Forced debug output |
| `test_debug_no_cache.txt` | No-cache debug output |
| `test_debug_ramp_final.txt` | Final ramp debug output |
| `test_debug_v2.txt` | Debug output v2 |
| `test_after_fix.txt` | Post-fix validation output |
| `test_binary_search.txt` | Binary search debug |
| `test_data_check.txt` | Data check output |
| `test_data_check_fixed.txt` | Data check after fix |
| `test_data_check_fixed_2.txt` | Data check after fix v2 |
| `test_failure.txt` | Test failure output |
| `test_failure_2.txt` | Test failure output |
| `test_failure_3.txt` | Test failure output |
| `test_failure_4.txt` | Test failure output |
| `test_failure_msg.txt` | Test failure message |
| `test_final_check.txt` | Final check output |
| `test_id_compare.txt` | ID comparison debug |
| `test_output.txt` | General test output |
| `test_ramp_active.txt` | Ramp active debug |
| `test_ramp_logic.txt` | Ramp logic debug |
| `test_ramp_logic_v2.txt` | Ramp logic debug v2 |
| `test_ramp_match.txt` | Ramp match debug |
| `test_sanity.txt` | Sanity check output |
| `test_setup_check.txt` | Setup check output |
| `test_stdout_debug.txt` | Stdout debug output |
| `test_stdout_debug_final.txt` | Stdout debug final |
| `test_stdout_debug_final_v2.txt` | Stdout debug final v2 |
| `test_stdout_debug_final_v3.txt` | Stdout debug final v3 |
| `test_steps_check.txt` | Steps check output |
| `test_trace_ids.txt` | ID trace debug |
| `test_versions_debug.txt` | Versions debug output |

**Reason**: All were debug/test output files generated during ramp logic development. Not source code.

### `scripts/test_imports.js`
One-time script to verify `bcryptjs` and `PrismaClient` can be loaded.

**Reason**: Development debugging script, no longer needed.

---

## Removed Debug Statements

### `src/lib/utils/rampLogic.ts`
- Removed 2 `process.stdout.write` debug statements (`[RAMP MATCH]`, `[RAMP DEBUG]`)
- Simplified `rampSteps.find()` callback from multi-line with debug logging to single expression

### `src/lib/utils/calculateCommissions.ts`
- Removed 7 `process.stdout.write` debug statements (`[DEBUG STDOUT]`)
- Removed 1 `console.log` for plan version update tracking
- Total: ~15 lines of debug code removed

### `src/lib/prisma.ts`
- Removed `try/catch` block with 2 `console.log` statements that logged `@prisma/client` resolution path on startup
- Total: ~5 lines removed

---

# Cleanup — Feb 12, 2026

## Deleted Files (10 files)

### Prisma Debug Scripts
| File | Description |
|------|-------------|
| `prisma/test-connect.ts` | One-off Prisma connection test (adapter-based) |
| `prisma/test-connection.ts` | One-off Prisma connection test (dotenv-based) |

**Reason**: Debug scripts used during initial DB setup. Not referenced by any code or npm script.

### SQL Password Files
| File | Description |
|------|-------------|
| `prisma/update_passwords.sql` | Manual SQL to set user password hashes |
| `prisma/update_password_final.sql` | Updated version of above with verified hashes |

**Reason**: One-time manual fix scripts. Seed script now handles passwords correctly.

### Development Scripts
| File | Description |
|------|-------------|
| `scripts/reset-admin.js` | Reset admin password via bcryptjs + Prisma |

**Reason**: Debug utility superseded by seed script. Not referenced in `package.json`.

### Default Next.js Assets (5 files)
| File |
|------|
| `public/file.svg` |
| `public/globe.svg` |
| `public/next.svg` |
| `public/vercel.svg` |
| `public/window.svg` |

**Reason**: Default boilerplate SVGs from `create-next-app`. Not referenced by any component.

## Removed Directories
- `scripts/` — Empty after deleting `reset-admin.js`

---

# Cleanup — Feb 13, 2026

## Order Status Removal

Removed the `OrderStatus` enum and `status` column from orders entirely. All imported orders are now treated as approved.

### Schema Changes
- Removed `OrderStatus` enum (`APPROVED`, `PENDING`, `DRAFT`, `CANCELLED`)
- Removed `status` field from `Order` model
- Migration: `20260214015456_remove_order_status`

### Files Updated (12 files)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Removed enum + field |
| `prisma/seed.ts` | Removed `OrderStatus` import and status from all 20 seed orders |
| `src/lib/utils/calculateCommissions.ts` | Removed `APPROVED` filter — all orders count |
| `src/lib/utils/calculateCommissions.test.ts` | Removed `OrderStatus` from import + 6 test fixtures |
| `src/app/api/import/execute/route.ts` | Removed status mapping from CSV import |
| `src/app/api/ingest/bigquery/orders/route.ts` | Removed status from interface + DB operations |
| `src/app/admin/orders/actions.ts` | Removed status from `OrderFilters` type + query |
| `src/app/admin/orders/orders-client.tsx` | Removed status column, Badge, statusColors |
| `src/app/admin/orders/[id]/page.tsx` | Removed status badges from detail view |
| `src/components/dashboard/orders-table.tsx` | Removed status column and Badge |
| `src/app/dashboard/actions.ts` | Updated stale "all statuses" comment |
| `src/app/admin/layout.tsx` | Removed then re-added Orders nav link per user preference |

