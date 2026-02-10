import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import {
    calculateCommissionWithAccelerators,
    calculateKickers,
    AcceleratorConfig,
    KickerConfig,
    CommissionResult,
} from "./commissionLogic";

export type { CommissionResult, CommissionBreakdown, AcceleratorConfig, AcceleratorTier, KickerConfig, KickerTier } from "./commissionLogic";
export { calculateCommissionWithAccelerators, calculateKickers } from "./commissionLogic";

export interface CalculateCommissionsInput {
    userId: string;
    startDate: Date;
    endDate: Date;
    /** Optional additional revenue from REVENUE adjustments */
    revenueAdjustment?: number;
}

/**
 * Calculates commissions for a user within a date range.
 * 
 * Logic:
 * 1. Fetches UserPeriodData for the relevant month to get effectiveRate and quota
 * 2. Fetches all APPROVED orders for the user within the date range
 * 3. Calculates Total Revenue (sum of convertedUsd)
 * 4. Calculates Attainment % (Revenue / Quota)
 * 5. Calculates Commission:
 *    - Base Commission = Revenue up to quota * effectiveRate
 *    - If Attainment > 100%, applies accelerator multiplier to overage only
 *    - If kickers enabled, adds fixed % of OTE at milestones
 */
export async function calculateCommissions(
    input: CalculateCommissionsInput
): Promise<CommissionResult> {
    const { userId, startDate, endDate, revenueAdjustment = 0 } = input;

    // Get the month from startDate (assuming calculations are monthly)
    const periodMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    // Fetch UserPeriodData for the relevant month
    // Use a range to be safe against timezone differences (UTC vs Local)
    // The previous implementation was adding/subtracting time based on local timezone which caused issues.
    // We want the full UTC day range.

    // Create new dates to avoid mutating the original
    const startOfMonth = new Date(Date.UTC(periodMonth.getFullYear(), periodMonth.getMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(periodMonth.getFullYear(), periodMonth.getMonth() + 1, 1));

    // Allow for a buffer to catch entries that might be slightly off due to timezone conversion during seed
    // e.g. 2026-01-31T23:00:00.000Z instead of 2026-02-01T00:00:00.000Z
    startOfMonth.setHours(startOfMonth.getHours() - 12);
    startOfNextMonth.setHours(startOfNextMonth.getHours() + 12);

    const periodData = await prisma.userPeriodData.findFirst({
        where: {
            userId,
            month: {
                gte: startOfMonth,
                lt: startOfNextMonth,
            },
        },
        include: {
            planVersion: {
                include: {
                    plan: true,
                }
            },
        },
    });

    if (!periodData) {
        throw new Error(
            `No period data found for user ${userId} in ${periodMonth.toISOString().slice(0, 7)}`
        );
    }

    // --- Dynamic Plan Version Lookup ---
    // Check for an active plan assignment for this period
    const activeAssignment = await prisma.planAssignment.findFirst({
        where: {
            userId,
            startDate: { lte: periodMonth },
            OR: [
                { endDate: null },
                { endDate: { gte: periodMonth } }
            ]
        },
        include: {
            plan: {
                include: {
                    versions: {
                        orderBy: { effectiveFrom: 'desc' }
                    }
                }
            }
        },
        orderBy: { startDate: 'desc' }
    });

    let planVersion = periodData.planVersion;

    if (activeAssignment) {
        // Find the version effective for this period
        const effectiveVersion = activeAssignment.plan.versions.find(v => v.effectiveFrom <= periodMonth);

        if (effectiveVersion) {
            // If the periodData points to a different version (or none), update it
            if (periodData.planVersionId !== effectiveVersion.id) {
                console.log(`Updating plan version for user ${userId} period ${periodMonth.toISOString()} to ${effectiveVersion.id}`);
                await prisma.userPeriodData.update({
                    where: { id: periodData.id },
                    data: { planVersionId: effectiveVersion.id }
                });

                // Use the new version for calculation
                planVersion = {
                    ...effectiveVersion,
                    plan: activeAssignment.plan
                };
            }
        }
    }

    // Fetch all APPROVED orders within the date range
    const orders = await prisma.order.findMany({
        where: {
            userId,
            status: OrderStatus.APPROVED,
            bookingDate: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Calculate total revenue (including any revenue adjustments)
    const orderRevenue = orders.reduce((sum, order) => sum + order.convertedUsd, 0);
    const totalRevenue = orderRevenue + revenueAdjustment;

    // Calculate attainment percentage
    const attainmentPercent = (totalRevenue / periodData.quota) * 100;

    // Get plan config from VERSION
    // planVersion is already set above
    const baseRateMultiplier = planVersion?.baseRateMultiplier ?? 1.0;
    const acceleratorsEnabled = planVersion?.acceleratorsEnabled ?? true;
    const kickersEnabled = planVersion?.kickersEnabled ?? false;

    // Calculate base + accelerator commission
    const acceleratorConfig = acceleratorsEnabled
        ? (planVersion?.accelerators as AcceleratorConfig | null)
        : null;

    const { commissionEarned: baseCommissionEarned, breakdown } = calculateCommissionWithAccelerators(
        totalRevenue,
        periodData.quota,
        periodData.effectiveRate,
        acceleratorConfig,
        baseRateMultiplier
    );

    // Calculate kickers
    const kickerConfig = planVersion?.kickers as KickerConfig | null;
    const { kickerAmount, kickersApplied } = calculateKickers(
        attainmentPercent,
        periodData.ote,
        kickerConfig,
        kickersEnabled
    );

    // Total commission includes base + accelerator + kickers
    const totalCommission = baseCommissionEarned + kickerAmount;

    // Update breakdown with kicker info
    breakdown.kickerAmount = kickerAmount;
    breakdown.kickersApplied = kickersApplied;

    return {
        totalRevenue,
        attainmentPercent,
        commissionEarned: totalCommission,
        breakdown,
        periodData: {
            quota: periodData.quota,
            effectiveRate: periodData.effectiveRate,
            planName: planVersion?.plan.name ?? null,
            ote: periodData.ote,
            baseSalary: periodData.baseSalary,
        },
    };
}
