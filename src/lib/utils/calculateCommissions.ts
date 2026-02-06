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
    const { userId, startDate, endDate } = input;

    // Get the month from startDate (assuming calculations are monthly)
    const periodMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    // Fetch UserPeriodData for the relevant month
    const periodData = await prisma.userPeriodData.findFirst({
        where: {
            userId,
            month: periodMonth,
        },
        include: {
            plan: true,
        },
    });

    if (!periodData) {
        throw new Error(
            `No period data found for user ${userId} in ${periodMonth.toISOString().slice(0, 7)}`
        );
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

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.convertedUsd, 0);

    // Calculate attainment percentage
    const attainmentPercent = (totalRevenue / periodData.quota) * 100;

    // Get plan config
    const plan = periodData.plan;
    const baseRateMultiplier = plan?.baseRateMultiplier ?? 1.0;
    const acceleratorsEnabled = plan?.acceleratorsEnabled ?? true;
    const kickersEnabled = plan?.kickersEnabled ?? false;

    // Calculate base + accelerator commission
    const acceleratorConfig = acceleratorsEnabled
        ? (plan?.accelerators as AcceleratorConfig | null)
        : null;

    const { commissionEarned: baseCommissionEarned, breakdown } = calculateCommissionWithAccelerators(
        totalRevenue,
        periodData.quota,
        periodData.effectiveRate,
        acceleratorConfig,
        baseRateMultiplier
    );

    // Calculate kickers
    const kickerConfig = plan?.kickers as KickerConfig | null;
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
            planName: plan?.name ?? null,
            ote: periodData.ote,
        },
    };
}
