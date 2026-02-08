# Project Roadmap & Planning

## Current Status (Feb 7, 2026)
- ✅ **Authentication**: Role-based access (Admin/Rep) via Auth.js.
- ✅ **Core Calculation**: Commission logic with accelerators and kickers.
- ✅ **Data Import**: Consolidated CSV/Excel & BigQuery ingestion.
- ✅ **Payouts**: Admin payout management (draft/publish) and rep dashboard.

## Next Priorities

### 1. Reporting & Analytics 📊
**Goal**: Provide deeper insights into performance trends.
- [ ] **Historical Earnings Chart**: Visual graph of earnings over last 12 months.
- [ ] **Quota Attainment Trends**: Month-over-month attainment comparison.
- [ ] **Team Performance**: Admin view of leaderboard or team averages.

### 2. User Management 👥
**Goal**: Allow admins to manage users directly in the app.
- [ ] **User Directory**: List all users, edit roles, assign managers.
- [ ] **Invite System**: Send email invites to new reps.
- [ ] **Deactivation**: Handle rep departures (offboarding).

### 3. Notification System 🔔
**Goal**: Keep users informed of important events.
- [ ] **Email Integration**: Connect `resend` or `sendgrid` to the `notify` stub.
- [ ] **Events**:
    - "Payout Published" (to Rep)
    - "Quota Attained" (to Rep/Manager)
    - "Import Failed" (to Admin)

### 4. Testing & Reliability 🧪
**Goal**: Ensure system stability.
- [ ] **Unit Tests**: Test commission logic edge cases (jest/vitest).
- [ ] **E2E Tests**: Verify critical flows like Import -> Calculate -> Payout (Playwright).
- [ ] **Error Boundaries**: Better UI handling for crashes.

### 5. Security Enhancements 🔒
- [ ] **API Key Protection**: Secure the BigQuery ingestion endpoints.
- [ ] **Rate Limiting**: Protect against abuse.
- [ ] **Audit Logs**: Track who changed what (adjustments, plan changes).
