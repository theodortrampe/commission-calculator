import "dotenv/config";
import { PrismaClient, Role, OrderStatus, PayoutFreq } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import bcrypt from "bcryptjs";

// Create adapter
const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter });

// Pre-hash passwords for seed users
const ADMIN_PASSWORD = bcrypt.hashSync("admin123", 10);
const REP_PASSWORD = bcrypt.hashSync("rep123", 10);

async function main() {
    console.log("🌱 Starting seed...");

    // Clean up existing data (in correct order for foreign keys)
    // Clean up existing data (in correct order for foreign keys)
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.adjustment.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.order.deleteMany();
    await prisma.userPeriodData.deleteMany();
    await prisma.planAssignment.deleteMany();
    await prisma.rampStep.deleteMany();
    await prisma.user.deleteMany();
    await prisma.compPlan.deleteMany();
    await prisma.organization.deleteMany();

    console.log("🧹 Cleaned up existing data");

    // Create default Organization
    const org = await prisma.organization.create({
        data: {
            id: 'default-org-001',
            name: 'Demo Company',
            slug: 'demo',
        },
    });
    console.log(`✅ Created Organization: ${org.name}`);

    // Create CompPlan with accelerator structure
    const compPlan = await prisma.compPlan.create({
        data: {
            name: "AE 2024 Accelerator Plan",
            frequency: PayoutFreq.MONTHLY,
            description: "Standard AE plan with accelerators",
            organizationId: org.id,
            baseRateMultiplier: 1.0,
            acceleratorsEnabled: true,
            kickersEnabled: false,
            accelerators: {
                tiers: [
                    { minAttainment: 0, maxAttainment: 100, multiplier: 1.0 },
                    { minAttainment: 100, maxAttainment: 125, multiplier: 1.5 },
                    { minAttainment: 125, maxAttainment: 150, multiplier: 2.0 },
                    { minAttainment: 150, maxAttainment: null, multiplier: 2.5 },
                ],
                description: "1x up to 100%, 1.5x from 100-125%, 2x from 125-150%, 2.5x above 150%",
            },
        }
    });
    console.log("✅ Created CompPlan:", compPlan.name);

    // Create Admin user with password
    const admin = await prisma.user.create({
        data: {
            email: "admin@company.com",
            name: "Admin User",
            role: Role.ADMIN,
            passwordHash: ADMIN_PASSWORD,
            organizationId: org.id,
        },
    });
    console.log("✅ Created Admin:", admin.name);

    // Create Sales Reps with passwords
    const johnDoe = await prisma.user.create({
        data: {
            email: "john.doe@company.com",
            name: "John Doe",
            role: Role.REP,
            passwordHash: REP_PASSWORD,
            organizationId: org.id,
        },
    });
    console.log("✅ Created Rep:", johnDoe.name);

    // Assign Plan to John Doe
    await prisma.planAssignment.create({
        data: {
            userId: johnDoe.id,
            planId: compPlan.id,
            startDate: new Date(2025, 0, 1),
        }
    });

    const janeSmith = await prisma.user.create({
        data: {
            email: "jane.smith@company.com",
            name: "Jane Smith",
            role: Role.REP,
            passwordHash: REP_PASSWORD,
            organizationId: org.id,
        },
    });
    console.log("✅ Created Rep:", janeSmith.name);

    // Assign Plan to Jane Smith
    await prisma.planAssignment.create({
        data: {
            userId: janeSmith.id,
            planId: compPlan.id,
            startDate: new Date(2025, 0, 1),
        }
    });

    // Calculate months
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // UserPeriodData for John Doe
    await prisma.userPeriodData.create({
        data: {
            userId: johnDoe.id,
            month: currentMonth,
            title: "Senior Account Executive",
            quota: 150000,
            baseSalary: 80000,
            ote: 160000,
            effectiveRate: (160000 - 80000) / 150000,
            planId: compPlan.id,
        },
    });

    await prisma.userPeriodData.create({
        data: {
            userId: johnDoe.id,
            month: lastMonth,
            title: "Senior Account Executive",
            quota: 140000,
            baseSalary: 80000,
            ote: 160000,
            effectiveRate: (160000 - 80000) / 140000,
            planId: compPlan.id,
        },
    });
    console.log("✅ Created UserPeriodData for John Doe");

    // UserPeriodData for Jane Smith
    await prisma.userPeriodData.create({
        data: {
            userId: janeSmith.id,
            month: currentMonth,
            title: "Account Executive",
            quota: 100000,
            baseSalary: 60000,
            ote: 120000,
            effectiveRate: (120000 - 60000) / 100000,
            planId: compPlan.id,
        },
    });

    await prisma.userPeriodData.create({
        data: {
            userId: janeSmith.id,
            month: lastMonth,
            title: "Account Executive",
            quota: 90000,
            baseSalary: 60000,
            ote: 120000,
            effectiveRate: (120000 - 60000) / 90000,
            planId: compPlan.id,
        },
    });
    console.log("✅ Created UserPeriodData for Jane Smith");

    // Orders for John Doe - Current Month
    const johnCurrentOrders = [
        { orderNumber: "ORD-2026-001", convertedUsd: 45000, convertedEur: 41000, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-002", convertedUsd: 32000, convertedEur: 29000, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-003", convertedUsd: 28000, convertedEur: 25500, status: OrderStatus.PENDING },
        { orderNumber: "ORD-2026-004", convertedUsd: 55000, convertedEur: 50000, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-005", convertedUsd: 18000, convertedEur: 16400, status: OrderStatus.PENDING },
    ];

    for (const order of johnCurrentOrders) {
        await prisma.order.create({
            data: {
                ...order,
                userId: johnDoe.id,
                organizationId: org.id,
                bookingDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.floor(Math.random() * 28) + 1),
            },
        });
    }
    console.log("✅ Created 5 current month orders for John Doe");

    // Orders for John Doe - Last Month
    const johnLastOrders = [
        { orderNumber: "ORD-2026-006", convertedUsd: 38000, convertedEur: 34600, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-007", convertedUsd: 42000, convertedEur: 38200, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-008", convertedUsd: 25000, convertedEur: 22750, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-009", convertedUsd: 31000, convertedEur: 28200, status: OrderStatus.PENDING },
        { orderNumber: "ORD-2026-010", convertedUsd: 48000, convertedEur: 43680, status: OrderStatus.APPROVED },
    ];

    for (const order of johnLastOrders) {
        await prisma.order.create({
            data: {
                ...order,
                userId: johnDoe.id,
                organizationId: org.id,
                bookingDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), Math.floor(Math.random() * 28) + 1),
            },
        });
    }
    console.log("✅ Created 5 last month orders for John Doe");

    // Orders for Jane Smith - Current Month
    const janeCurrentOrders = [
        { orderNumber: "ORD-2026-011", convertedUsd: 35000, convertedEur: 31850, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-012", convertedUsd: 42000, convertedEur: 38220, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-013", convertedUsd: 18000, convertedEur: 16380, status: OrderStatus.PENDING },
        { orderNumber: "ORD-2026-014", convertedUsd: 48000, convertedEur: 43680, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-015", convertedUsd: 12000, convertedEur: 10920, status: OrderStatus.PENDING },
    ];

    for (const order of janeCurrentOrders) {
        await prisma.order.create({
            data: {
                ...order,
                userId: janeSmith.id,
                organizationId: org.id,
                bookingDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.floor(Math.random() * 28) + 1),
            },
        });
    }
    console.log("✅ Created 5 current month orders for Jane Smith");

    // Orders for Jane Smith - Last Month
    const janeLastOrders = [
        { orderNumber: "ORD-2026-016", convertedUsd: 28000, convertedEur: 25480, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-017", convertedUsd: 19000, convertedEur: 17290, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-018", convertedUsd: 33000, convertedEur: 30030, status: OrderStatus.APPROVED },
        { orderNumber: "ORD-2026-019", convertedUsd: 15000, convertedEur: 13650, status: OrderStatus.PENDING },
        { orderNumber: "ORD-2026-020", convertedUsd: 24000, convertedEur: 21840, status: OrderStatus.APPROVED },
    ];

    for (const order of janeLastOrders) {
        await prisma.order.create({
            data: {
                ...order,
                userId: janeSmith.id,
                organizationId: org.id,
                bookingDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), Math.floor(Math.random() * 28) + 1),
            },
        });
    }
    console.log("✅ Created 5 last month orders for Jane Smith");

    console.log("\n📊 Seed Summary:");
    console.log("================");
    console.log(`• 1 Organization (${org.name})`);
    console.log("• 1 Admin user");
    console.log("• 2 Sales Reps (John Doe, Jane Smith)");
    console.log("• 4 UserPeriodData records (2 per rep)");
    console.log("• 20 Orders (5 per rep per month)");
    console.log("• 1 CompPlan with accelerator tiers");
    console.log("\n🎉 Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
