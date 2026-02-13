
export interface RampStepConfig {
    monthIndex: number;
    quotaPercentage: number;
    guaranteedDrawPercent: number | null; // % of variable bonus
    drawType: "NON_RECOVERABLE" | "RECOVERABLE";
    disableAccelerators?: boolean;
    disableKickers?: boolean;
}

export interface RampOverrideResult {
    isRampActive: boolean;
    effectiveQuotaMultiplier: number; // 1.0 if no ramp, otherwise rampStep.quotaPercentage
    guaranteedDrawPercent: number; // % of variable bonus
    drawType: "NON_RECOVERABLE" | "RECOVERABLE" | null;
    monthIndex: number | null;
    disableAccelerators: boolean;
    disableKickers: boolean;
}

/**
 * Calculates ramp overrides for a given period and assignment.
 * 
 * @param assignmentStartDate The start date of the user's plan assignment.
 * @param periodMonth The month we are calculating for (Date object, typically 1st of month).
 * @param rampSteps Array of ramp steps from the plan version.
 */
export function calculateRampOverride(
    assignmentStartDate: Date,
    periodMonth: Date,
    rampSteps: RampStepConfig[]
): RampOverrideResult {
    if (!rampSteps || rampSteps.length === 0) {
        return {
            isRampActive: false,
            effectiveQuotaMultiplier: 1.0,
            guaranteedDrawPercent: 0,
            drawType: null,
            monthIndex: null,
            disableAccelerators: false,
            disableKickers: false
        };
    }

    // Calculate Tenure Month
    // Month 1 = Month of start date.
    // Example: Start Jan 15. Period Jan 1. -> Month 1.
    // Example: Start Jan 15. Period Feb 1. -> Month 2.
    // Logic: (PeriodYear - StartYear) * 12 + (PeriodMonth - StartMonth) + 1

    // Ensure we work with UTC dates if inputs are UTC
    const startYear = assignmentStartDate.getUTCFullYear();
    const startMonth = assignmentStartDate.getUTCMonth();

    const periodYear = periodMonth.getUTCFullYear();
    const periodMonthIndex = periodMonth.getUTCMonth();

    const tenureMonth = (periodYear - startYear) * 12 + (periodMonthIndex - startMonth) + 1;

    if (tenureMonth < 1) {
        // Period is before assignment start. Should typically not happen if queries are correct,
        // but if it does, no ramp applies (or maybe no commission at all, but that's handled elsewhere).
        return {
            isRampActive: false,
            effectiveQuotaMultiplier: 1.0,
            guaranteedDrawPercent: 0,
            drawType: null,
            monthIndex: null,
            disableAccelerators: false,
            disableKickers: false
        };
    }

    // Find applicable step
    const step = rampSteps.find(s => s.monthIndex === tenureMonth);

    if (step) {
        return {
            isRampActive: true,
            effectiveQuotaMultiplier: step.quotaPercentage,
            guaranteedDrawPercent: step.guaranteedDrawPercent ? Number(step.guaranteedDrawPercent) : 0,
            drawType: step.drawType,
            monthIndex: tenureMonth,
            disableAccelerators: step.disableAccelerators ?? true,
            disableKickers: step.disableKickers ?? true
        };
    }

    return {
        isRampActive: false,
        effectiveQuotaMultiplier: 1.0,
        guaranteedDrawPercent: 0,
        drawType: null,
        monthIndex: null,
        disableAccelerators: false,
        disableKickers: false
    };
}
