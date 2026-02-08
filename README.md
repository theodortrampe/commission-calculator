# Commission Calculator

A Next.js application for managing sales rep commission calculations, payouts, and performance tracking.

## Features

### Agent Dashboard (`/dashboard`)
- View real-time earnings and quota attainment
- Track orders by status (Approved, Pending, Draft, Cancelled)
- Month-by-month performance comparison
- Stats cards showing current month earnings, % to quota, and pending payouts

### Admin Payouts (`/admin/payouts`)
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

### Admin Settings (`/admin/settings`)
- Configure compensation plans with accelerator tiers
- Enable/disable kicker bonuses
- Set base rate multipliers

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

1. Clone the repository:
```bash
git clone https://github.com/theodore-trampe/commission-calculator.git
cd commission-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Configure Environment:
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./prisma/dev.db"
```

4. Set up the database:
```bash
npx prisma db push
npx prisma db seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Commission Calculation

The system calculates commissions using:

1. **Effective Rate** = (OTE - Base Salary) / Quota
2. **Base Commission** = Revenue up to Quota × Effective Rate
3. **Accelerators** = Revenue over Quota × Multiplier × Effective Rate
4. **Kickers** = Fixed % of OTE at attainment milestones

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
- [Cleanup Log (Feb 7, 2026)](./docs/cleanup_log.md)

## License

MIT
