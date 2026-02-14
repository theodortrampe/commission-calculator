
import { prisma } from "@/lib/prisma";
import { calculateCommissions } from "./calculateCommissions";
import { PayoutFreq, Role } from "@prisma/client";
import { CURRENT_ORG_ID } from "@/lib/constants";

// Increase timeout for DB operations
jest.setTimeout(30000);

describe("calculateCommissions Integration Test", () => {
    // Shared IDs
    let userId: string;
    let planId: string;

    const testMonth = new Date(Date.UTC(2025, 0, 1)); // Jan 2025

    beforeAll(async () => {
        // Clean up
        await prisma.adjustment.deleteMany();
        await prisma.payout.deleteMany();
        await prisma.order.deleteMany();
        await prisma.userPeriodData.deleteMany();
        await prisma.planAssignment.deleteMany();
        await prisma.rampStep.deleteMany();
        await prisma.user.deleteMany();
        await prisma.compPlan.deleteMany();
        await prisma.organization.deleteMany();

        // 0. Create Organization
        await prisma.organization.create({
            data: {
                id: CURRENT_ORG_ID,
                name: 'Test Organization',
                slug: 'test-org',
            },
        });

        // 1. Create User
        const user = await prisma.user.create({
            data: {
                name: "Test User",
                email: "test@example.com",
                role: Role.REP,
                organizationId: CURRENT_ORG_ID,
            }
        });
        userId = user.id;

        // 2. Create Comp Plan with config directly
        const plan = await prisma.compPlan.create({
            data: {
                name: "Test Plan",
                frequency: PayoutFreq.MONTHLY,
                description: "Test Plan Description",
                organizationId: CURRENT_ORG_ID,
                baseRateMultiplier: 1.0,
                acceleratorsEnabled: false,
                kickersEnabled: false,
            }
        });
        planId = plan.id;
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
        await prisma.rampStep.deleteMany();
    });

    it("should use the plan from UserPeriodData if no assignment exists", async () => {
        // Setup Period Data pointing to the plan
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth,
                quota: 10000,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1, // 10%
                planId
            }
        });

        // Add Order
        await prisma.order.create({
            data: {
                userId,
                organizationId: CURRENT_ORG_ID,
                orderNumber: "ORD-002",
                bookingDate: testMonth,
                convertedUsd: 1000,
                convertedEur: 900,
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Plan has 1.0 multiplier. Base Rate 10%.
        // Commission = 1000 * 0.1 * 1.0 = 100
        expect(result.commissionEarned).toBeCloseTo(100);
        expect(result.periodData.planName).toBe("Test Plan");
    });

    it("should use plan config from assignment when present", async () => {
        // Update the plan to have 2.0 multiplier for this test
        await prisma.compPlan.update({
            where: { id: planId },
            data: { baseRateMultiplier: 2.0 }
        });

        // Setup Period Data
        await prisma.userPeriodData.create({
            data: {
                userId,
                month: testMonth,
                quota: 10000,
                baseSalary: 5000,
                ote: 10000,
                effectiveRate: 0.1,
                planId
            }
        });

        // Create Assignment
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
                organizationId: CURRENT_ORG_ID,
                orderNumber: "ORD-001",
                bookingDate: testMonth,
                convertedUsd: 1000,
                convertedEur: 900,
            }
        });

        const result = await calculateCommissions({
            userId,
            startDate: testMonth,
            endDate: new Date(Date.UTC(2025, 0, 31, 23, 59, 59))
        });

        // Plan has 2.0 multiplier. Base Rate 10%.
        // Commission = 1000 * 0.1 * 2.0 = 200
        expect(result.commissionEarned).toBeCloseTo(200);

        // Reset multiplier for other tests
        await prisma.compPlan.update({
            where: { id: planId },
            data: { baseRateMultiplier: 1.0 }
        });
    });

    it("should prorate quota and OTE for partial month assignment", async () => {
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
                planId
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
                organizationId: CURRENT_ORG_ID,
                orderNumber: "ORD-PRORATED",
                bookingDate: new Date(Date.UTC(2025, 0, 20)), // Inside active period
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
        // 1. Setup Ramp Step on Plan
        // Month 1: 50% Quota, 80% of variable bonus draw
        // Variable bonus = OTE - base = 10000 - 5000 = 5000
        // Draw amount = 80% × 5000 = $4000
        await prisma.rampStep.create({
            data: {
                planId,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 80,
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
                planId
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
                organizationId: CURRENT_ORG_ID,
                orderNumber: "ORD-RAMP-1",
                bookingDate: new Date(Date.UTC(2025, 0, 15)),
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
        // Re-create ramp step for this test.
        // Draw: 80% of variable bonus (OTE 10000 - base 5000 = 5000 variable)
        // = $4000 pre-proration
        await prisma.rampStep.create({
            data: {
                planId,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 80,
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
                planId
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
        const expectedDraw = 0.8 * (10000 - 5000) * expectedFactor; // 80% of variable bonus ($5000), then prorated

        expect(result.ramp?.isActive).toBe(true);
        expect(result.periodData.quota).toBeCloseTo(expectedQuota, 2);

        // Commission should be the prorated draw amount
        expect(result.commissionEarned).toBeCloseTo(expectedDraw, 2);
    });

    it('should allow accelerators during ramp if disableAccelerators is false', async () => {
        // 1. Update plan to enable accelerators with tiers
        await prisma.compPlan.update({
            where: { id: planId },
            data: {
                acceleratorsEnabled: true,
                accelerators: {
                    tiers: [{ minAttainment: 100, maxAttainment: null, multiplier: 2.0 }]
                }
            }
        });

        // 2. Create ramp step with disableAccelerators = false
        await prisma.rampStep.create({
            data: {
                planId,
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 0,
                drawType: 'NON_RECOVERABLE',
                disableAccelerators: false, // ENABLED!
                disableKickers: true
            }
        });

        // 3. Setup Period Data
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
                planId
            }
        });

        // 3b. Create Plan Assignment (CRITICAL for Ramp Start Date)
        await prisma.planAssignment.create({
            data: {
                userId: userId,
                planId: planId,
                startDate: new Date('2025-01-01T00:00:00Z'),
            }
        });

        // 4. Create Orders (High revenue to trigger accelerator)
        // Ramp Quota is 5000.
        // Revenue 8000.
        // Base: 5000 * 10% = 500
        // Overage: 3000 * 10% * 2.0 (Accelerator) = 600
        // Total: 1100
        await prisma.order.create({
            data: {
                orderNumber: 'ORD-RAMP-ACC-1',
                userId: userId,
                organizationId: CURRENT_ORG_ID,
                convertedUsd: 8000,
                convertedEur: 7500,
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

        // Reset accelerators for other tests
        await prisma.compPlan.update({
            where: { id: planId },
            data: {
                acceleratorsEnabled: false,
                accelerators: null
            }
        });
    });
});
