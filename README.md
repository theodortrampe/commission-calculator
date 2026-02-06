# Commission Calculator

A Next.js 14 application for managing sales rep commission calculations, payouts, and performance tracking.

## Features

### Agent Dashboard (`/dashboard`)
- View real-time earnings and quota attainment
- Track orders by status (Approved, Pending, Draft, Cancelled)
- Month-by-month performance comparison
- Stats cards showing current month earnings, % to quota, and pending payouts

### Admin Payouts (`/admin/payouts`)
- View all sales reps' earnings for any month
- Generate payout records with one click
- Add manual adjustments (bonuses/clawbacks)
- Manage payout workflow: Draft → Published → Paid
- Export payout data to CSV

### Data Ingestion API (`/api/ingest/bigquery`)
- RESTful API for ingesting sales data
- Supports single row (POST) and batch (PUT) operations
- Automatic user creation and period data upsert
- Calculates effective commission rate from OTE and quota

## Tech Stack

- **Framework**: Next.js 14 (App Router)
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
git clone https://github.com/YOUR_USERNAME/commission-calculator.git
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
# Push schema to SQLite database
npx prisma db push

# Seed with sample data
npx prisma db seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.sql           # Sample data
│   └── seed.ts            # TypeScript seed (optional)
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── payouts/   # Admin payout management
│   │   ├── api/
│   │   │   └── ingest/    # Data ingestion API
│   │   └── dashboard/     # Agent dashboard
│   ├── components/
│   │   └── ui/            # shadcn/ui components
│   └── lib/
│       ├── prisma.ts      # Database client
│       ├── calculateCommissions.ts
│       └── commissionLogic.ts
└── prisma.config.ts       # Prisma configuration
```

## Database Schema

### Models

- **User**: Sales reps, managers, and admins
- **UserPeriodData**: Monthly quota, OTE, base salary per user
- **Order**: Sales orders with booking dates and amounts
- **CompPlan**: Compensation plans with accelerator tiers
- **Payout**: Historical payout records
- **Adjustment**: Manual bonuses/clawbacks on payouts

### Commission Calculation

The system calculates commissions using:

1. **Effective Rate** = (OTE - Base Salary) / Quota
2. **Base Commission** = Revenue up to Quota × Effective Rate
3. **Accelerators** = Revenue over Quota × Multiplier × Effective Rate

Accelerator tiers (configurable per comp plan):
- 0-100% attainment: 1.0x
- 100-125% attainment: 1.5x
- 125-150% attainment: 2.0x
- 150%+ attainment: 2.5x

### Kickers (New)

Fixed % of OTE earned at attainment milestones (e.g., 5% at 100%, 10% at 125%).

## Known Issues

> **Note**: These are tracked bugs that need fixing.

1. **Settings Save Fails** - Saving commission settings with both accelerators and kickers enabled may fail. Workaround: Try saving with only one enabled at a time.

2. **Prisma Client Type Errors** - Some TypeScript lint errors show for `@prisma/client` imports. These don't affect runtime but may show in IDE. Run `npx prisma generate` to refresh types.

## API Reference

### POST /api/ingest/bigquery

Ingest a single row of data.

```json
{
  "email": "rep@company.com",
  "name": "John Doe",
  "month": "2026-02-01",
  "quota": 100000,
  "baseSalary": 60000,
  "ote": 120000,
  "title": "Account Executive"
}
```

### PUT /api/ingest/bigquery

Ingest multiple rows in a batch.

```json
{
  "rows": [
    { "email": "...", "name": "...", ... },
    { "email": "...", "name": "...", ... }
  ]
}
```

## Environment Variables

Create a `.env` file in the root of the project:

```env
# Local SQLite (development)
DATABASE_URL="file:./prisma/dev.db"

# PostgreSQL (production)
# DATABASE_URL="postgresql://user:password@host:5432/database"
```

## Testing

Run the test suite:

```bash
npm test
```

Tests cover commission calculation logic with various scenarios including:
- Under quota performance
- At quota performance  
- Above quota with accelerators
- Edge cases and zero values

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set `DATABASE_URL` environment variable
4. Deploy

### Manual

```bash
npm run build
npm start
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
