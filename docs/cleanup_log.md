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
