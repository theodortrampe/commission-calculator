# Commission Calculator

A Next.js application for managing sales rep commission calculations, payouts, and performance tracking.

## Features

### Rep Dashboard (`/dashboard`)
- View real-time earnings and quota attainment
- Track orders by status (Approved, Pending, Draft, Cancelled)
- Month-by-month performance comparison
- Stats cards showing current month earnings, % to quota, effective quota, and draw top-up info
- **Commission Math Explainer** — visual breakdown of how commissions were calculated, including ramp/proration badges and draw adjustments

### Admin Panel
#### Payouts (`/admin/payouts`)
- **Consolidated payouts table** with all data inline:
  - Variable Bonus (OTE - Base Salary)
  - Quota, Revenue, Adjusted Revenue
  - Attainment %, Earnings, Adjusted Earnings
  - Payout Status (Draft/Published)
- **Bulk actions**: Draft All / Publish All for the month
- **Per-person adjustments**:
  - Revenue adjustments (flow through commission calculation)
  - Fixed bonuses (added directly to payout)
- **Adjustments table** showing impact on payouts
- Export payout data to CSV
- **Audit Log Sheet** — click any payout row to see a detailed calculation breakdown with step-by-step math

#### Plans Management (`/admin/plans`)
- Create and manage Compensation Plans (e.g., "AE 2024", "SDR Q1")
- Version control for plans (Draft, Active, Scheduled)
- **Configure Logic**: Define accelerators, kickers, and base rates per version
- **Ramp Schedule Configuration**: Define per-month quota percentages, guaranteed draws (recoverable/non-recoverable), and override accelerator/kicker settings during ramp periods

#### Assignments (`/admin/assignments`)
- Assign plans to specific Users or Roles (e.g., "All Managers")
- Date-based assignments (Start/End dates)
- Automatically determines which plan version applies to a given period

#### Admin Settings (`/admin/settings`)
#### Admin Settings (`/admin/settings`)
- Global configuration for default plan logic.
- **Quota & Rates**: Set default base rate multiplier and monthly quota.
- **Toggle Logic**: Enable/disable accelerators or kickers globally for default assignments.

### Data Ingestion API (`/api/ingest/bigquery`)
- RESTful API for ingesting sales data
- Supports single row (POST) and batch (PUT) operations
- Automatic user creation and period data upsert
- Calculates effective commission rate from OTE and quota

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: Prisma 7
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/theodortrampe/commission-calculator.git
   cd commission-calculator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```

4. **Generate Auth Secret:**
   ```bash
   npx auth secret
   ```

5. **Set up the database:**
   ```bash
   # Push schema to database
   npx prisma db push

   # Generate Prisma Client (Important!)
   npx prisma generate

   # Seed the database with sample data (includes orders and complex relationships)
   npx prisma db seed
   ```

### Testing Deployments

When testing in a staging or preview environment, ensure you run the seeding command after the database is reachable:
1. Ensure `DATABASE_URL` is correctly set in your environment variables.
2. Run `npx prisma db push` to ensure the schema is up to date.
3. Run `npx prisma db seed` to populate the environment with test users (Admin/Rep) and sample orders.

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000)**

### Default Login Credentials

After seeding, you can log in with:

- **Admin:** `admin@company.com` / `admin123`
- **Sales Rep:** `john.doe@company.com` / `admin123`



## Commission Calculation

The system calculates commissions using:

1. **Effective Rate** = (OTE - Base Salary) / Quota
2. **Base Commission** = Revenue up to Quota × Effective Rate
3. **Accelerators** = Revenue over Quota × Multiplier × Effective Rate
4. **Kickers** = Fixed % of OTE at attainment milestones
5. **Ramp Override** = During ramp period, quota is scaled by ramp %, guaranteed draws apply, and accelerators/kickers can be disabled per step

### Accelerator Tiers (configurable)
| Attainment | Multiplier |
|------------|------------|
| 0-100%     | 1.0x       |
| 100-125%   | 1.5x       |
| 125-150%   | 2.0x       |
| 150%+      | 2.5x       |

### Adjustment Types
| Type | How it Works |
|------|-------------|
| Revenue Adjustment | Added to total revenue → affects commission via accelerators/kickers |
| Fixed Bonus | Added directly to final payout amount |

## Testing

```bash
npm test
```

Tests cover commission calculation with accelerators, kickers, and edge cases.

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Set `DATABASE_URL` environment variable
4. Deploy


## Documentation

- [Project Roadmap & Planning](./PLANNING.md)
- [Data Import Guide](./docs/data_import_guide.md)
- [Known Issues](./docs/known_issues.md)
- [Cleanup Log](./docs/cleanup_log.md)

## License

MIT
