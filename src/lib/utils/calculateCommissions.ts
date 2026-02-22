import { prisma } from "@/lib/prisma";
import {
    calculateCommissionWithAccelerators,
    calculateKickers,
    AcceleratorConfig,
    KickerConfig,
    CommissionResult,
} from "./commissionLogic";
import { calculateRampOverride, RampOverrideResult, RampStepConfig } from "./rampLogic";

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
 * 2. Fetches all orders for the user within the date range
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
    // Use UTC methods to ensure we get the correct month regardless of server timezone
    const periodMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

    // Fetch UserPeriodData for the relevant month
    // We want the full UTC day range.

    // Create new dates to avoid mutating the original
    const startOfMonth = new Date(Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth() + 1, 1));

    // Exact calculation dates (no buffer)
    const calculationStart = new Date(startOfMonth);
    const calculationEnd = new Date(startOfNextMonth);

    // Allow for a buffer to catch entries that might be slightly off due to timezone conversion during seed
    // e.g. 2026-01-31T23:00:00.000Z instead of 2026-02-01T00:00:00.000Z
    // We only use these for the DB query to be loose
    const queryStart = new Date(startOfMonth);
    const queryEnd = new Date(startOfNextMonth);
    queryStart.setHours(queryStart.getHours() - 12);
    queryEnd.setHours(queryEnd.getHours() + 12);

    const periodData = await prisma.userPeriodData.findFirst({
        where: {
            userId,
            month: {
                gte: queryStart,
                lt: queryEnd,
            },
        },
        include: {
            plan: true,
            user: { select: { currency: true } },
        },
    });

    if (!periodData) {
        throw new Error(
            `No period data found for user ${userId} in ${periodMonth.toISOString().slice(0, 7)}`
        );
    }

    // --- Plan Lookup via Assignment ---
    // Check for an active plan assignment for this period
    const activeAssignment = await prisma.planAssignment.findFirst({
        where: {
            userId,
            startDate: { lte: queryEnd },
            OR: [
                { endDate: null },
                { endDate: { gte: queryStart } }
            ]
        },
        include: {
            plan: true,
        },
        orderBy: { startDate: 'desc' }
    });

    // Use the plan from assignment, falling back to the one linked in periodData
    let plan = activeAssignment?.plan ?? periodData.plan;

    // If assignment points to a different plan than periodData, update periodData
    if (activeAssignment && periodData.planId !== activeAssignment.plan.id) {
        await prisma.userPeriodData.update({
            where: { id: periodData.id },
            data: { planId: activeAssignment.plan.id }
        });
        plan = activeAssignment.plan;
    }

    // --- Proration Logic ---
    // 1. Determine the full duration of the requested period in days
    const oneDayMs = 1000 * 60 * 60 * 24;
    const totalDaysInPeriod = Math.round((calculationEnd.getTime() - calculationStart.getTime()) / oneDayMs);


    // 2. Determine active days based on assignment intersection
    let activeDays = totalDaysInPeriod;


    if (activeAssignment) {
        // Intersect assignment dates with period dates

        // assignment start date might be before the period
        const assignmentStart = activeAssignment.startDate > calculationStart ? activeAssignment.startDate : calculationStart;

        // assignment end date might be null (forever) or after the period
        const assignmentEnd = activeAssignment.endDate && activeAssignment.endDate < calculationEnd
            ? activeAssignment.endDate
            : calculationEnd;

        // Calculate difference in days
        // We use Math.max(0, ...) to handle cases where assignment might technically be outside range 
        const diffMs = assignmentEnd.getTime() - assignmentStart.getTime();
        activeDays = Math.round(diffMs / oneDayMs);

        // Ensure we don't exceed total days (floating point safety)
        activeDays = Math.min(activeDays, totalDaysInPeriod);
        activeDays = Math.max(0, activeDays);
    }

    // 3. Calculate Proration Factor
    const prorationFactor = activeDays / totalDaysInPeriod;

    // --- Ramp Schedule Logic ---
    let effectiveQuota = periodData.quota;
    let effectiveOTE = periodData.ote;
    let rampOverride: RampOverrideResult | null = null;
    const baseRateMultiplierOverride = plan?.baseRateMultiplier ?? 1.0;
    let acceleratorsEnabledOverride = plan?.acceleratorsEnabled ?? true;
    let kickersEnabledOverride = plan?.kickersEnabled ?? false;
    let guaranteedDrawPercent = 0;

    // Check ramp only if we have an assignment start date
    if (activeAssignment && activeAssignment.startDate && plan) {
        // Fetch steps explicitly
        const steps = await prisma.rampStep.findMany({
            where: { planId: plan.id }
        });

        const rampStepsConfig = steps.map(s => ({
            ...s,
        })) as unknown as RampStepConfig[];

        rampOverride = calculateRampOverride(activeAssignment.startDate, calculationStart, rampStepsConfig);

        if (rampOverride.isRampActive) {
            // Apply Ramp Multiplier to Quota
            effectiveQuota = periodData.quota * rampOverride.effectiveQuotaMultiplier;
            effectiveOTE = periodData.ote * rampOverride.effectiveQuotaMultiplier;

            // Disable Accelerators and Kickers during ramp
            if (rampOverride.disableAccelerators) {
                acceleratorsEnabledOverride = false;
            }
            if (rampOverride.disableKickers) {
                kickersEnabledOverride = false;
            }

            // Set Guaranteed Draw Percent
            guaranteedDrawPercent = rampOverride.guaranteedDrawPercent;
        }
    }

    // 4. Apply Proration
    // Quota and OTE are prorated. Effective Rate remains constant (as it's a ratio).
    const proratedQuota = effectiveQuota * prorationFactor;
    const proratedOTE = effectiveOTE * prorationFactor;
    // Calculate guaranteed draw as % of FULL (un-ramped) variable bonus, then prorate
    // The draw guarantees income based on the full plan variable component, not the reduced ramp target
    const fullVariableBonus = periodData.ote - periodData.baseSalary;
    const proratedDraw = guaranteedDrawPercent > 0 ? (guaranteedDrawPercent / 100) * fullVariableBonus * prorationFactor : 0;

    // Fetch all orders within the date range
    const orders = await prisma.order.findMany({
        where: {
            userId,
            bookingDate: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Calculate total revenue using agent's currency
    const currency = periodData.user.currency || "USD";
    const orderRevenue = orders.reduce((sum, order) =>
        sum + (currency === "EUR" ? order.convertedEur : order.convertedUsd), 0);
    const totalRevenue = orderRevenue + revenueAdjustment;

    // Calculate attainment percentage against PRORATED quota
    const attainmentPercent = (totalRevenue / proratedQuota) * 100;

    // Get plan config
    const baseRateMultiplier = baseRateMultiplierOverride;
    const acceleratorsEnabled = acceleratorsEnabledOverride;
    const kickersEnabled = kickersEnabledOverride;

    // Calculate base + accelerator commission
    const acceleratorConfig = acceleratorsEnabled
        ? (plan?.accelerators as AcceleratorConfig | null)
        : null;

    const { commissionEarned: baseCommissionEarned, breakdown } = calculateCommissionWithAccelerators(
        totalRevenue,
        proratedQuota, // Use Prorated Quota
        periodData.effectiveRate,
        acceleratorConfig,
        baseRateMultiplier
    );

    // Calculate kickers (using Prorated OTE)
    const kickerConfig = plan?.kickers as KickerConfig | null;
    const { kickerAmount, kickersApplied } = calculateKickers(
        attainmentPercent,
        proratedOTE, // Use Prorated OTE for kicker value calculation
        kickerConfig,
        kickersEnabled
    );

    // Total commission includes base + accelerator + kickers
    let totalCommission = baseCommissionEarned + kickerAmount;
    let drawTopUp = 0;

    // Apply Draw Logic
    if (proratedDraw > 0 && proratedDraw > totalCommission) {
        drawTopUp = proratedDraw - totalCommission;
        totalCommission = proratedDraw;
    }

    // Construct Ramp Result if active
    let ramp: CommissionResult['ramp'];

    if (rampOverride?.isRampActive) {
        ramp = {
            isActive: true,
            monthIndex: rampOverride.monthIndex ?? 0,
            originalQuota: periodData.quota,
            rampedQuotaPreProration: effectiveQuota,
            guaranteedDrawPercent: guaranteedDrawPercent,
            guaranteedDrawAmount: proratedDraw,
            drawTopUp
        };
    }

    // Update breakdown with kicker info
    breakdown.kickerAmount = kickerAmount;
    breakdown.kickersApplied = kickersApplied;

    return {
        totalRevenue,
        attainmentPercent,
        commissionEarned: totalCommission,
        breakdown,
        periodData: {
            quota: proratedQuota, // Return the actually used (prorated) quota
            effectiveRate: periodData.effectiveRate,
            planName: plan?.name ?? null,
            ote: proratedOTE, // Return the actually used (prorated) OTE
            baseSalary: periodData.baseSalary, // Base typically passed through, effectively prorated if we calculated payout
            currency,
        },
        proration: {
            activeDays,
            totalDays: totalDaysInPeriod,
            factor: prorationFactor
        },
        ramp
    };
}
