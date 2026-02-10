
import { prisma } from "@/lib/prisma";
import { calculateCommissions } from "./calculateCommissions";
import { PayoutFreq, OrderStatus, Role } from "@prisma/client";

// Increase timeout for DB operations
jest.setTimeout(30000);

describe("calculateCommissions Integration Test", () => {
    // Shared IDs
    let userId: string;
    let planId: string;
    let version1Id: string;
    let version2Id: string;

    const testMonth = new Date(Date.UTC(2025, 0, 1)); // Jan 2025

    beforeAll(async () => {
        // Clean up
        await prisma.adjustment.deleteMany();
        await prisma.payout.deleteMany();
        await prisma.order.deleteMany();
        await prisma.userPeriodData.deleteMany();
        await prisma.planAssignment.deleteMany();
        await prisma.compPlanVersion.deleteMany();
        await prisma.user.deleteMany();
        await prisma.compPlan.deleteMany();

        // 1. Create User
        const user = await prisma.user.create({
            data: {
                name: "Test User",
                email: "test@example.com",
                role: Role.REP,
            }
        });
        userId = user.id;

        // 2. Create Comp Plan
        const plan = await prisma.compPlan.create({
            data: {
                name: "Test Plan",
                frequency: PayoutFreq.MONTHLY,
                description: "Test Plan Description",
            }
        });
        planId = plan.id;

        // 3. Create Version 1 (10% Rate)
        const v1 = await prisma.compPlanVersion.create({
            data: {
                planId: plan.id,
                versionNumber: 1,
                effectiveFrom: new Date(Date.UTC(2024, 0, 1)), // Old version
                baseRateMultiplier: 1.0,
                acceleratorsEnabled: false,
            }
        });
        version1Id = v1.id;

        // 4. Create Version 2 (20% Rate - Double Multiplier for test)
        const v2 = await prisma.compPlanVersion.create({
            data: {
                planId: plan.id,
                versionNumber: 2,
                effectiveFrom: new Date(Date.UTC(2025, 0, 15)), // Mid-Jan
                baseRateMultiplier: 2.0,
                acceleratorsEnabled: false,
            }
        });
        version2Id = v2.id;
    });

    afterAll(async () => {
        // Optional: cleanup
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        // Reset period data and orders between tests
        await prisma.order.deleteMany();
        await prisma.userPeriodData.deleteMany();
        await prisma.planAssignment.deleteMany();
    });

    it("should use the default plan version from UserPeriodData if no assignment exists", async () => {
        // Setup Period Data pointing to Version 1
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth,
                quota: 10000,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1, // 10%
                planVersionId: version1Id
            }
        });

        // Add Order
        await prisma.order.create({
            data: {
                userId,
                orderDate: testMonth,
                bookingDate: testMonth,
                status: OrderStatus.APPROVED,
                totalAmount: 1000,
                convertedUsd: 1000,
                customerName: "Client A",
                dealName: "Deal A"
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Version 1 has 1.0 multiplier. Base Rate 10%.
        // Commission = 1000 * 0.1 * 1.0 = 100
        expect(result.commissionEarned).toBeCloseTo(100);
        expect(result.periodData.planName).toBe("Test Plan");
    });

    it("should dynamically switch to a newer version based on assignment", async () => {
        // Setup Period Data initially pointing to Version 1
        const periodData = await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth,
                quota: 10000,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1,
                planVersionId: version1Id // Starts with V1
            }
        });

        // Create Assignment for Version 2 starting Jan 1st
        // Note: Assignments link to Plan, but logic picks version by date.
        // V2 effective from Jan 15th. 
        // If we assign the plan from Jan 1st, and calculation runs for Jan,
        // it should pick V2 if the logic finds V2 is effective <= period.

        // Wait, V2 is effective Jan 15. The period is Jan.
        // "Find the version effective for this period" usually means effectiveFrom <= periodStart (or End).
        // My logic: `activeAssignment.plan.versions.find(v => v.effectiveFrom <= periodMonth)`
        // periodMonth is Jan 1.
        // V2 effectiveFrom is Jan 15.
        // So it should actually pick V1 (effective Jan 1 2024) if strictly <= Jan 1 2025.
        // Let's adjust V2 effective date to Jan 1 2025 to ensure it gets picked.

        await prisma.compPlanVersion.update({
            where: { id: version2Id },
            data: { effectiveFrom: new Date(Date.UTC(2025, 0, 1)) }
        });

        await prisma.planAssignment.create({
            data: {
                userId,
                planId,
                startDate: new Date(Date.UTC(2025, 0, 1)),
            }
        });

        // Add Order
        await prisma.order.create({
            data: {
                userId,
                orderDate: testMonth,
                bookingDate: testMonth,
                status: OrderStatus.APPROVED,
                totalAmount: 1000,
                convertedUsd: 1000,
                customerName: "Client A",
                dealName: "Deal A"
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Version 2 has 2.0 multiplier. Base Rate 10%.
        // Commission = 1000 * 0.1 * 2.0 = 200
        expect(result.commissionEarned).toBeCloseTo(200);

        // Verify DB was updated
        const updatedPeriodData = await prisma.userPeriodData.findUnique({ where: { id: periodData.id } });
        expect(updatedPeriodData?.planVersionId).toBe(version2Id);
    });
});
