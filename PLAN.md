# Roadmap & Future Work

## Priority 1: Critical Fixes

### Install Missing Select Component
```bash
npx shadcn@latest add select
```
The adjustment dialog uses Select but the component file is missing.

### Fix TypeScript Lint Errors
Run `npx prisma generate` to refresh types after schema changes. The lint errors are stale cache.

---

## Priority 2: Core Features

### Authentication & Authorization
- [ ] Add NextAuth.js for user login
- [ ] Role-based access control (Admin vs Rep)
- [ ] Protect admin routes from rep access
- [ ] Rep-specific dashboard filtering

### Order Management
- [ ] Admin UI to view/approve/reject orders
- [ ] Order import from CSV/Excel
- [ ] Order editing and audit trail

### Rep Self-Service
- [ ] Rep can view their own payouts
- [ ] Rep can see adjustment reasons
- [ ] Notifictions when payout is published

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
