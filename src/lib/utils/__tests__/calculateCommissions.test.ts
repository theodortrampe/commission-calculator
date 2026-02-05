import { calculateCommissionWithAccelerators } from "../commissionLogic";

describe("calculateCommissionWithAccelerators", () => {
    // Standard accelerator config matching seed data
    const acceleratorConfig = {
        tiers: [
            { minAttainment: 0, maxAttainment: 100, multiplier: 1.0 },
            { minAttainment: 100, maxAttainment: 125, multiplier: 1.5 },
            { minAttainment: 125, maxAttainment: 150, multiplier: 2.0 },
            { minAttainment: 150, maxAttainment: null, multiplier: 2.5 },
        ],
        description: "1x up to 100%, 1.5x from 100-125%, 2x from 125-150%, 2.5x above 150%",
    };

    describe("under quota (< 100% attainment)", () => {
        it("should calculate base commission only with no accelerator", () => {
            const quota = 100000;
            const effectiveRate = 0.6; // 60%
            const totalRevenue = 80000; // 80% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            expect(result.breakdown.baseRevenue).toBe(80000);
            expect(result.breakdown.baseCommission).toBe(48000); // 80000 * 0.6
            expect(result.breakdown.overageRevenue).toBe(0);
            expect(result.breakdown.overageCommission).toBe(0);
            expect(result.breakdown.acceleratorMultiplier).toBe(1.0);
            expect(result.commissionEarned).toBe(48000);
        });

        it("should handle exactly 100% attainment", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 100000; // 100% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            expect(result.breakdown.baseRevenue).toBe(100000);
            expect(result.breakdown.baseCommission).toBe(50000); // 100000 * 0.5
            expect(result.breakdown.overageRevenue).toBe(0);
            expect(result.breakdown.overageCommission).toBe(0);
            expect(result.commissionEarned).toBe(50000);
        });
    });

    describe("over quota with accelerators", () => {
        it("should apply 1.5x multiplier for 100-125% attainment tier", () => {
            const quota = 100000;
            const effectiveRate = 0.6; // 60%
            const totalRevenue = 110000; // 110% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            // Base: 100000 * 0.6 = 60000
            // Overage: 10000 * 0.6 * 1.5 = 9000
            // Total: 69000
            expect(result.breakdown.baseRevenue).toBe(100000);
            expect(result.breakdown.baseCommission).toBe(60000);
            expect(result.breakdown.overageRevenue).toBe(10000);
            expect(result.breakdown.overageCommission).toBe(9000); // 10000 * 0.6 * 1.5
            expect(result.breakdown.acceleratorMultiplier).toBe(1.5);
            expect(result.commissionEarned).toBe(69000);
        });

        it("should apply 2x multiplier for 125-150% attainment tier", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 140000; // 140% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            // Base: 100000 * 0.5 = 50000
            // Overage: 40000 * 0.5 * 2.0 = 40000
            // Total: 90000
            expect(result.breakdown.baseRevenue).toBe(100000);
            expect(result.breakdown.baseCommission).toBe(50000);
            expect(result.breakdown.overageRevenue).toBe(40000);
            expect(result.breakdown.overageCommission).toBe(40000);
            expect(result.breakdown.acceleratorMultiplier).toBe(2.0);
            expect(result.commissionEarned).toBe(90000);
        });

        it("should apply 2.5x multiplier for 150%+ attainment tier", () => {
            const quota = 100000;
            const effectiveRate = 0.6;
            const totalRevenue = 175000; // 175% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            // Base: 100000 * 0.6 = 60000
            // Overage: 75000 * 0.6 * 2.5 = 112500
            // Total: 172500
            expect(result.breakdown.baseRevenue).toBe(100000);
            expect(result.breakdown.baseCommission).toBe(60000);
            expect(result.breakdown.overageRevenue).toBe(75000);
            expect(result.breakdown.overageCommission).toBe(112500);
            expect(result.breakdown.acceleratorMultiplier).toBe(2.5);
            expect(result.commissionEarned).toBe(172500);
        });
    });

    describe("edge cases", () => {
        it("should handle zero revenue", () => {
            const result = calculateCommissionWithAccelerators(0, 100000, 0.6, acceleratorConfig);

            expect(result.breakdown.baseRevenue).toBe(0);
            expect(result.breakdown.baseCommission).toBe(0);
            expect(result.breakdown.overageRevenue).toBe(0);
            expect(result.breakdown.overageCommission).toBe(0);
            expect(result.commissionEarned).toBe(0);
        });

        it("should handle null accelerator config (no plan)", () => {
            const quota = 100000;
            const effectiveRate = 0.6;
            const totalRevenue = 150000; // 150% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                null // No accelerator config
            );

            // Without accelerators, overage gets 1x multiplier
            // Base: 100000 * 0.6 = 60000
            // Overage: 50000 * 0.6 * 1.0 = 30000
            // Total: 90000
            expect(result.breakdown.overageCommission).toBe(30000);
            expect(result.breakdown.acceleratorMultiplier).toBe(1.0);
            expect(result.commissionEarned).toBe(90000);
        });

        it("should handle very high attainment (200%+)", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 250000; // 250% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            // Should use highest tier (2.5x)
            expect(result.breakdown.acceleratorMultiplier).toBe(2.5);
            expect(result.breakdown.overageRevenue).toBe(150000);
            expect(result.breakdown.overageCommission).toBe(187500); // 150000 * 0.5 * 2.5
        });

        it("should handle different effective rates correctly", () => {
            // John Doe's rate: (160000 - 80000) / 150000 = 0.5333
            const quota = 150000;
            const effectiveRate = 0.5333;
            const totalRevenue = 178000; // ~118.67% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            // Base: 150000 * 0.5333 = 79995
            // Overage: 28000 * 0.5333 * 1.5 = 22398.6
            expect(result.breakdown.baseRevenue).toBe(150000);
            expect(result.breakdown.baseCommission).toBeCloseTo(79995, 0);
            expect(result.breakdown.overageRevenue).toBe(28000);
            expect(result.breakdown.acceleratorMultiplier).toBe(1.5);
            expect(result.breakdown.overageCommission).toBeCloseTo(22398.6, 0);
        });
    });

    describe("tier boundary tests", () => {
        it("should use 1.5x at exactly 100.01% attainment", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 100010; // 100.01% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            expect(result.breakdown.acceleratorMultiplier).toBe(1.5);
            expect(result.breakdown.overageRevenue).toBe(10);
            expect(result.breakdown.overageCommission).toBe(7.5); // 10 * 0.5 * 1.5
        });

        it("should use 2x at exactly 125% attainment", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 125000; // 125% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            expect(result.breakdown.acceleratorMultiplier).toBe(2.0);
        });

        it("should use 2.5x at exactly 150% attainment", () => {
            const quota = 100000;
            const effectiveRate = 0.5;
            const totalRevenue = 150000; // 150% attainment

            const result = calculateCommissionWithAccelerators(
                totalRevenue,
                quota,
                effectiveRate,
                acceleratorConfig
            );

            expect(result.breakdown.acceleratorMultiplier).toBe(2.5);
        });
    });
});
