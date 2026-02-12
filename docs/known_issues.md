# Known Issues

Tracked issues and technical debt to address in future sessions.

---

## High Priority

### 1. Zod v4 Compatibility Workarounds
**Files**: `src/app/admin/assignments/new-assignment-dialog.tsx`, `src/app/admin/plans/[id]/version-editor.tsx`

Zod v4 changed several APIs:
- `z.date({ required_error: "..." })` no longer accepts options → replaced with `z.date()`
- `z.coerce.number()` inference changed → replaced with `z.number()`

These are functional workarounds but lose some validation behavior (custom error messages, automatic coercion). Should revisit when `@hookform/resolvers` has full Zod v4 support, or pin to Zod v3.

### 2. Ramp Configuration Form — Removed Zod Validation
**File**: `src/app/admin/plans/[id]/ramp-configuration-form.tsx`

The `zodResolver` was removed from this form due to Zod v4 compatibility issues. Form validation now relies on HTML `required` attributes and `react-hook-form` defaults only. Should add proper validation back once Zod v4 resolver support stabilizes.

---

## Medium Priority

### 3. Notification System — Stub Only
**File**: `src/lib/notifications.ts`

The `notifyPayoutPublished` function is a console.log stub. No actual email/Slack integration exists. The file includes a commented-out Resend example. Implement when ready to notify reps of published payouts.

### 4. BigQuery Ingest API — Breaking Change in Payload
**File**: `src/app/api/ingest/bigquery/route.ts`

The `planId` field in the `BigQueryRow` interface was renamed to `planVersionId` to match the schema change. Any existing BigQuery sync jobs or external integrations sending `planId` will silently fail to link period data to a plan version. Document or add backward compatibility.

### 5. Import Execute Route — Version Lookup on Import
**File**: `src/app/api/import/execute/route.ts`

When importing compensation data, the code now fetches the default plan's latest version ID to populate `planVersionId`. This means all imported data is linked to whatever version happens to be latest at import time, which may not be the correct version for historical data imports.

---

## Low Priority

### 6. Middleware Deprecation Warning
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```
Next.js 16 has deprecated the `middleware.ts` convention. Should migrate to the new `proxy` convention when time permits.

### 7. Test Coverage for New UI Components
The following new components lack test coverage:
- `CommissionMathExplainer` — complex conditional rendering
- `AuditLogSheet` — calculation breakdown display
- `RampConfigurationForm` — dynamic form with add/remove steps
- `saveRampSteps` server action — atomic transaction logic

### 8. Prisma Decimal Handling
**File**: `src/lib/utils/rampLogic.ts`

The `guaranteedDraw` field uses `Decimal` in the Prisma schema but is typed as `number | string | null` in the `RampStepConfig` interface (was previously importing from `@prisma/client/runtime/library` which doesn't exist in Prisma v7). The runtime `Number()` conversion works but could lose precision for very large values. Consider using a proper decimal library if precision matters.
