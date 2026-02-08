# Roadmap & Future Work

## Priority 1: Critical Fixes ✅

> **Completed 2026-02-07** - All TypeScript errors resolved, unit tests passing.

### What was fixed:
- [x] Added `@types/better-sqlite3` for TypeScript support in seed
- [x] Added missing server actions (`getPayoutById`, `createAdjustment`, `updatePayoutStatus`)
- [x] Fixed stale `PAID` status references (enum simplified to Draft → Published)
- [x] Fixed JSON type assertions in settings actions
- [x] Select component already existed (no action needed)

---

## Priority 2: Core Features

### Authentication & Authorization ✅
> **Completed 2026-02-07** - Auth.js v5 with Google OAuth + credentials

- [x] NextAuth.js (Auth.js v5) for user login
- [x] Role-based access control (Admin vs Rep)
- [x] Protect admin routes from rep access
- [x] Rep-specific dashboard filtering

### Order Management ✅
> **Completed 2026-02-07** - View orders, CSV/Excel import (approval done externally)

- [x] Admin UI to view orders
- [x] Consolidated Data Import (CSV/Excel + BigQuery)
- [x] Order detail page

### Rep Self-Service ✅
> **Completed 2026-02-07** - Payout history, adjustments, notifications

- [x] Rep can view their own payouts
- [x] Rep can see adjustment reasons
- [x] Notifications when payout is published (stub)

---

## Priority 3: Enhancements

### Reporting & Analytics
- [ ] Historical earnings charts
- [ ] Team performance comparison
- [ ] Quota vs actual trending
- [ ] Payout forecast for current month

### Comp Plan Management
- [ ] UI to create/edit comp plans
- [ ] Plan versioning (effective dates)
- [ ] Plan assignment to users
- [ ] Split comp plans (different rates by product)

### Audit & Compliance
- [ ] Adjustment approval workflow
- [ ] Payout change history
- [ ] Export audit logs
- [ ] Manager sign-off on payouts

---

## Priority 4: Infrastructure

### Performance
- [ ] Parallelize commission calculations
- [ ] Cache period data lookups
- [ ] Optimize N+1 queries in getAllUserEarnings

### Testing
- [ ] E2E tests with Playwright
- [ ] Integration tests for API endpoints
- [ ] Visual regression tests for UI

### Deployment
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Staging environment
- [ ] Database migrations strategy
- [ ] Production PostgreSQL setup

---

## Priority 5: Nice to Have

### UX Improvements
- [ ] Dark mode toggle
- [ ] Mobile responsive payouts table
- [ ] Keyboard shortcuts
- [ ] Inline editing of adjustments

### Integrations
- [ ] Slack notifications for published payouts
- [ ] Salesforce order sync
- [ ] BigQuery direct connection
- [ ] Payroll system export (ADP, Gusto)

---

## Recently Completed (2026-02-06)

- [x] Consolidated payouts table with all data inline
- [x] Per-person adjustments (Revenue + Fixed Bonus types)
- [x] Bulk payout generation and publishing
- [x] Adjustments table with net payout impact
- [x] Removed PAID status (simplified to Draft → Published)
- [x] Variable Bonus column (OTE - Base Salary)
- [x] Code cleanup (~200 lines removed)
