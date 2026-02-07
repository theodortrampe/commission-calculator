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
