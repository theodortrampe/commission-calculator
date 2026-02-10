# Project Roadmap & Planning

## Current Status (Feb 7, 2026)
- ✅ **Authentication**: Role-based access (Admin/Rep) via Auth.js (Google OAuth + credentials).
- ✅ **Core Calculation**: Commission logic with accelerators and kickers.
- ✅ **Data Import**: Consolidated CSV/Excel & BigQuery ingestion.
- ✅ **Payouts**: Admin payout management (draft/publish) and rep dashboard.
- ✅ **Order Management**: View orders, manual entry/edit.
- ✅ **Rep Self-Service**: Payout history, adjustments view.

## Priority 1: Reporting & Analytics 📊
**Goal**: Provide deeper insights into performance trends.
- [ ] **Historical Earnings Chart**: Visual graph of earnings over last 12 months.
- [ ] **Quota Attainment Trends**: Month-over-month attainment comparison.
- [ ] **Team Performance**: Admin view of leaderboard or team averages.
- [ ] **Payout Forecast**: Estimate end-of-month payout based on current pipeline.

## Priority 2: User Management 👥
**Goal**: Allow admins to manage users directly in the app.
- [ ] **User Directory**: List all users, edit roles, assign managers.
- [ ] **Invite System**: Send email invites to new reps.
- [ ] **Deactivation**: Handle rep departures (offboarding).

## Priority 3: Comp Plan Management ⚙️ (Completed)
- ✅ **Comp Plan Management**: Create/edit plans, versions, and logic.
- ✅ **Assignments**: Assign plans to users/roles.
- ✅ **Admin Navigation**: Unified navigation.

## Priority 4: Audit & Compliance 🛡️
**Goal**: Ensure data integrity and accountability.
- [ ] **Adjustment Approval Workflow**: Require manager approval for manual adjustments.
- [ ] **Payout Change History**: Track changes to finalized payouts.
- [ ] **Audit Logs**: Log who changed what (adjustments, plan changes, user roles).
- [ ] **Manager Sign-off**: Formal acknowledgement of payouts.

## Priority 5: Infrastructure & Security 🔒
**Goal**: Scalability, stability, and security.
- [ ] **API Key Protection**: Secure BigQuery ingestion endpoints.
- [ ] **Rate Limiting**: Protect API against abuse.
- [ ] **Performance**:
    - [ ] Parallelize commission calculations.
    - [ ] Cache period data lookups.
    - [ ] Optimize N+1 queries.
- [ ] **Testing**:
    - [ ] E2E tests with Playwright (Critical flows: Import -> Calculate -> Payout).
    - [ ] Integration tests for API endpoints.
- [ ] **Deployment**:
    - [ ] CI/CD pipeline (GitHub Actions).
    - [ ] Database migrations strategy for production.

## Priority 6: Notification System 🔔
**Goal**: Keep users informed of important events.
- [ ] **Email Integration**: Connect `resend` or `sendgrid`.
- [ ] **Event Triggers**:
    - "Payout Published" (to Rep).
    - "Quota Attained" (to Rep/Manager).
    - "Import Failed" (to Admin).
- [ ] **Slack Integration**: Notifications for published payouts.

## Nice to Have / UX Improvements ✨
- [ ] **Dark Mode Toggle**: System-wide theme preference.
- [ ] **Mobile Responsiveness**: Better mobile view for payouts table.
- [ ] **Keyboard Shortcuts**: Quick navigation for power users.
- [ ] **Salesforce Sync**: Direct order synchronization.
