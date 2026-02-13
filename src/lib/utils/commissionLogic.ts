// Types for accelerator tiers
export interface AcceleratorTier {
    minAttainment: number;
    maxAttainment: number | null;
    multiplier: number;
}

export interface AcceleratorConfig {
    tiers: AcceleratorTier[];
    description?: string;
}

// Types for kickers
export interface KickerTier {
    attainmentThreshold: number; // e.g., 100 means "hit 100%"
    kickerPercent: number; // e.g., 5 means "5% of OTE"
}

export interface KickerConfig {
    tiers: KickerTier[];
}

// Output types
export interface CommissionBreakdown {
    baseRevenue: number;
    baseCommission: number;
    overageRevenue: number;
    overageCommission: number;
    acceleratorMultiplier: number;
    tierApplied: string;
    baseRateMultiplier: number;
    kickerAmount: number;
    kickersApplied: string[];
}

export interface CommissionResult {
    totalRevenue: number;
    attainmentPercent: number;
    commissionEarned: number;
    breakdown: CommissionBreakdown;
    periodData: {
        quota: number;
        effectiveRate: number;
        planName: string | null;
        ote: number;
        baseSalary: number;
    };
    proration?: {
        activeDays: number;
        totalDays: number;
        factor: number;
    };
    ramp?: {
        isActive: boolean;
        monthIndex: number;
        originalQuota: number;
        rampedQuotaPreProration: number;
        guaranteedDrawPercent: number;
        guaranteedDrawAmount: number;
        drawTopUp: number;
    };
}

/**
 * Pure function to calculate commission with accelerator logic.
 * This function has no database dependencies and can be easily unit tested.
 * 
 * @param totalRevenue - Total revenue from orders
 * @param quota - User's quota for the period
 * @param effectiveRate - (OTE - Base) / Quota
 * @param acceleratorConfig - Accelerator tier configuration from CompPlan
 * @param baseRateMultiplier - Multiplier applied to all commission (1.0 = normal)
 */
export function calculateCommissionWithAccelerators(
    totalRevenue: number,
    quota: number,
    effectiveRate: number,
    acceleratorConfig: AcceleratorConfig | null,
    baseRateMultiplier: number = 1.0
): { commissionEarned: number; breakdown: CommissionBreakdown } {
    const attainmentPercent = (totalRevenue / quota) * 100;

    // Revenue up to quota (capped at quota)
    const baseRevenue = Math.min(totalRevenue, quota);
    const baseCommission = baseRevenue * effectiveRate * baseRateMultiplier;

    // Revenue over quota
    const overageRevenue = Math.max(0, totalRevenue - quota);

    // Default: no accelerator (1x multiplier)
    let acceleratorMultiplier = 1.0;
    let tierApplied = "No accelerator (1x)";

    // Apply accelerator if attainment > 100% and accelerators are configured
    if (attainmentPercent > 100 && acceleratorConfig?.tiers) {
        const tier = findApplicableTier(attainmentPercent, acceleratorConfig.tiers);
        if (tier) {
            acceleratorMultiplier = tier.multiplier;
            tierApplied = formatTierDescription(tier);
        }
    }

    // Calculate overage commission with accelerator and base rate multiplier
    const overageCommission = overageRevenue * effectiveRate * acceleratorMultiplier * baseRateMultiplier;

    // Total commission (kickers added separately in calculateCommissions)
    const commissionEarned = baseCommission + overageCommission;

    return {
        commissionEarned,
        breakdown: {
            baseRevenue,
            baseCommission,
            overageRevenue,
            overageCommission,
            acceleratorMultiplier,
            tierApplied,
            baseRateMultiplier,
            kickerAmount: 0, // Calculated separately
            kickersApplied: [],
        },
    };
}

/**
 * Calculate kicker bonuses based on attainment milestones.
 * Kickers are fixed % of OTE earned when hitting thresholds.
 */
export function calculateKickers(
    attainmentPercent: number,
    ote: number,
    kickerConfig: KickerConfig | null,
    kickersEnabled: boolean
): { kickerAmount: number; kickersApplied: string[] } {
    if (!kickersEnabled || !kickerConfig?.tiers || kickerConfig.tiers.length === 0) {
        return { kickerAmount: 0, kickersApplied: [] };
    }

    let kickerAmount = 0;
    const kickersApplied: string[] = [];

    // Check each kicker tier - kickers are cumulative (you earn each one you hit)
    for (const tier of kickerConfig.tiers) {
        if (attainmentPercent >= tier.attainmentThreshold) {
            const bonus = (tier.kickerPercent / 100) * ote;
            kickerAmount += bonus;
            kickersApplied.push(`${tier.kickerPercent}% at ${tier.attainmentThreshold}%`);
        }
    }

    return { kickerAmount, kickersApplied };
}

/**
 * Finds the applicable accelerator tier for a given attainment percentage.
 */
function findApplicableTier(
    attainmentPercent: number,
    tiers: AcceleratorTier[]
): AcceleratorTier | null {
    // Sort tiers by minAttainment descending to find the highest applicable tier
    const sortedTiers = [...tiers].sort((a, b) => b.minAttainment - a.minAttainment);

    for (const tier of sortedTiers) {
        const meetsMin = attainmentPercent >= tier.minAttainment;
        const meetsMax = tier.maxAttainment === null || attainmentPercent < tier.maxAttainment;

        if (meetsMin && meetsMax) {
            return tier;
        }
    }

    // If attainment exceeds all defined tiers, use the highest tier (with null maxAttainment)
    const highestTier = tiers.find((t) => t.maxAttainment === null);
    if (highestTier && attainmentPercent >= highestTier.minAttainment) {
        return highestTier;
    }

    return null;
}

/**
 * Formats tier description for display.
 */
function formatTierDescription(tier: AcceleratorTier): string {
    if (tier.maxAttainment === null) {
        return `${tier.minAttainment}%+ tier (${tier.multiplier}x)`;
    }
    return `${tier.minAttainment}-${tier.maxAttainment}% tier (${tier.multiplier}x)`;
}
