
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

        // Reset Version 2 effective date to original (Jan 15) to avoid pollution
        if (version2Id) {
            await prisma.compPlanVersion.update({
                where: { id: version2Id },
                data: { effectiveFrom: new Date(Date.UTC(2025, 0, 15)) }
            });
        }
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
                orderNumber: "ORD-002",
                bookingDate: testMonth,
                status: OrderStatus.APPROVED,
                convertedUsd: 1000,
                convertedEur: 900,
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
                orderNumber: "ORD-001",
                bookingDate: testMonth,
                status: OrderStatus.APPROVED,
                convertedUsd: 1000,
                convertedEur: 900,
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

    it("should prorate quota and OTE for partial month assignment", async () => {
        // Clear previous data
        await prisma.planAssignment.deleteMany({ where: { userId } });
        await prisma.userPeriodData.deleteMany({ where: { userId } });

        // Setup Period Data (Full Month Values)
        const fullQuota = 10000;
        const fullOTE = 10000;
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth, // Jan 2025
                quota: fullQuota,
                baseSalary: 5000,
                ote: fullOTE,
                effectiveRate: 0.1,
                planVersionId: version1Id
            }
        });

        // Create Assignment starting Jan 15th
        // Jan 2025 has 31 days.
        // Active: Jan 15 - Jan 31 = 17 days.
        // Factor: 17 / 31 = 0.548387...
        await prisma.planAssignment.create({
            data: {
                userId,
                planId,
                startDate: new Date(Date.UTC(2025, 0, 15)),
            }
        });

        // Add Order for $6,000
        await prisma.order.create({
            data: {
                userId,
                orderNumber: "ORD-PRORATED",
                bookingDate: new Date(Date.UTC(2025, 0, 20)), // Inside active period
                status: OrderStatus.APPROVED,
                convertedUsd: 6000,
                convertedEur: 5400,
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        const expectedFactor = 17 / 31;
        const expectedQuota = fullQuota * expectedFactor;

        // Check Proration Data
        expect(result.proration).toBeDefined();
        expect(result.proration?.activeDays).toBe(17);
        expect(result.proration?.totalDays).toBe(31);
        expect(result.proration?.factor).toBeCloseTo(expectedFactor, 5);

        // Check Quota Scaling
        expect(result.periodData.quota).toBeCloseTo(expectedQuota, 2);

        // Check Attainment Calculation
        // Revenue 6000. Prorated Quota ~5483.
        // Attainment should be > 100%
        const expectedAttainment = (6000 / expectedQuota) * 100;
        expect(result.attainmentPercent).toBeCloseTo(expectedAttainment, 2);
    });

    it("should apply ramp logic: Quota override, Draw, and No Accelerators", async () => {
        // Clear previous data
        await prisma.planAssignment.deleteMany({ where: { userId } });
        await prisma.userPeriodData.deleteMany({ where: { userId } });
        await prisma.rampStep.deleteMany(); // Clear ramps

        // 1. Setup Ramp Step on Version 1
        // Month 1: 50% Quota, $4000 Draw
        await prisma.rampStep.create({
            data: {
                planVersionId: version1Id,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDraw: 4000,
                drawType: "NON_RECOVERABLE"
            }
        });

        // 2. Setup Period Data (Full Month Values)
        const fullQuota = 10000;
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth, // Jan 2025
                quota: fullQuota,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1,
                planVersionId: version1Id
            }
        });

        // 3. Create Assignment starting Jan 1st (Full Month Ramp)
        await prisma.planAssignment.create({
            data: {
                userId,
                planId,
                startDate: new Date(Date.UTC(2025, 0, 1)), // Starts Jan 1, so Jan is Month 1
            }
        });

        // 4. Add Order with Low Revenue ($1000)
        // Quota is 50% of 10000 = 5000.
        // Revenue 1000. Attainment = 20%.
        // Commission = 1000 * 0.1 = 100.
        // Draw is 4000.
        // Top-up = 4000 - 100 = 3900.
        await prisma.order.create({
            data: {
                userId,
                orderNumber: "ORD-RAMP-1",
                bookingDate: new Date(Date.UTC(2025, 0, 15)),
                status: OrderStatus.APPROVED,
                convertedUsd: 1000,
                convertedEur: 900,
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Verify Quota Override (50%)
        expect(result.periodData.quota).toBe(5000);

        // Verify Commission (Draw Applied)
        // Commission 100. Draw 4000.
        expect(result.commissionEarned).toBe(4000);

        // Verify Draw Top Up reported in breakdown or ramp object
        expect(result.ramp?.drawTopUp).toBe(3900);
        expect(result.ramp?.isActive).toBe(true);
    });

    it("should prorate ramp draw for partial month", async () => {
        // Clear previous data
        await prisma.planAssignment.deleteMany({ where: { userId } });
        await prisma.userPeriodData.deleteMany({ where: { userId } });

        // Ensure Ramp Step exists (it does from previous test, but let's be safe if tests run independently/parallel, though jest runs sequential in file)
        // To be safe, upsert or just assume creates are fine if we clean up.
        // We cleared rampStep table above? Yes.
        // Re-create ramp step for this test.
        await prisma.rampStep.deleteMany();
        await prisma.rampStep.create({
            data: {
                planVersionId: version1Id,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDraw: 4000,
                drawType: "NON_RECOVERABLE"
            }
        });

        // 1. Setup Period Data
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth,
                quota: 10000,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1,
                planVersionId: version1Id
            }
        });

        // 2. Create Assignment starting Jan 15th (Partial Month 1)
        await prisma.planAssignment.create({
            data: {
                userId,
                planId,
                startDate: new Date(Date.UTC(2025, 0, 15)),
            }
        });

        // 3. Add No Orders -> Zero Revenue

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Active Days: 17. Total: 31. Factor: ~0.548.
        const expectedFactor = 17 / 31;
        const expectedQuota = 5000 * expectedFactor; // Ramp 5000 -> Prorated
        const expectedDraw = 4000 * expectedFactor;  // Draw 4000 -> Prorated

        expect(result.ramp?.isActive).toBe(true);
        expect(result.periodData.quota).toBeCloseTo(expectedQuota, 2);

        // Commission should be the prorated draw amount
        expect(result.commissionEarned).toBeCloseTo(expectedDraw, 2);
    });

    it('should allow accelerators during ramp if disableAccelerators is false', async () => {
        // 1. Setup Ramp Step with disableAccelerators = false
        // We need to use a new plan version or ensure no conflict. 
        // Let's create a new version 2 for this test to be clean.
        const version2Id = 'test-version-2-accel';

        // Clean up previous test artifacts if any
        await prisma.order.deleteMany({ where: { orderNumber: 'ORD-RAMP-ACC-1' } });
        await prisma.userPeriodData.deleteMany({ where: { userId, month: new Date('2025-01-01T00:00:00Z') } });

        await prisma.compPlanVersion.upsert({
            where: { id: version2Id },
            create: {
                id: version2Id,
                planId: planId, // Reuse existing plan
                effectiveFrom: new Date('2025-01-01T00:00:00Z'),
                acceleratorsEnabled: true,
                accelerators: {
                    tiers: [{ minAttainment: 100, maxAttainment: null, multiplier: 2.0 }]
                }
            },
            update: {}
        });

        await prisma.rampStep.create({
            data: {
                planVersionId: version2Id,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDraw: 1000,
                drawType: 'NON_RECOVERABLE',
                disableAccelerators: false, // ENABLED!
                disableKickers: true
            }
        });

        // 2. Setup Period Data pointing to Version 2
        // Quota 10000 -> Ramp 5000
        // OTE 20000 -> Ramp 10000
        await prisma.userPeriodData.create({
            data: {
                userId: userId,
                month: new Date('2025-01-01T00:00:00Z'),
                quota: 10000,
                baseSalary: 100000,
                ote: 220000,
                effectiveRate: 0.1, // 10%
                planVersionId: version2Id
            }
        });

        // 2b. Create Plan Assignment (CRITICAL for Ramp Start Date)
        await prisma.planAssignment.create({
            data: {
                userId: userId,
                planId: planId,
                startDate: new Date('2025-01-01T00:00:00Z'),
            }
        });

        // 3. Create Orders (High revenue to trigger accelerator)
        // Ramp Quota is 5000.
        // Revenue 8000.
        // Base: 5000 * 10% = 500
        // Overage: 3000 * 10% * 2.0 (Accelerator) = 600
        // Total: 1100
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-RAMP-ACC-1',
                userId: userId,
                convertedUsd: 8000,
                convertedEur: 7500,
                status: 'APPROVED',
                bookingDate: new Date('2025-01-15T00:00:00Z')
            }
        });

        const result = await calculateCommissions({
            userId: userId,
            startDate: new Date('2025-01-01T00:00:00Z'),
            endDate: new Date('2025-01-31T23:59:59Z')
        });

        expect(result.ramp?.isActive).toBe(true);
        // We expect accelerator to apply.
        // Base: 500
        // Overage: 3000 * 10% * 2.0 = 600
        // Total: 1100
        expect(result.commissionEarned).toBeCloseTo(1100, 2);
        expect(result.breakdown.acceleratorMultiplier).toBeGreaterThan(1);
    });
});
