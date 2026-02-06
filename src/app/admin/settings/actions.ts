"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface AcceleratorTier {
    minAttainment: number;
    maxAttainment: number | null;
    multiplier: number;
}

export interface AcceleratorConfig {
    tiers: AcceleratorTier[];
    description?: string;
}

export interface KickerTier {
    attainmentThreshold: number;
    kickerPercent: number;
}

export interface KickerConfig {
    tiers: KickerTier[];
}

export interface CompPlanSettings {
    id: string;
    name: string;
    baseRateMultiplier: number;
    acceleratorsEnabled: boolean;
    kickersEnabled: boolean;
    accelerators: AcceleratorConfig | null;
    kickers: KickerConfig | null;
}

/**
 * Fetch the current CompPlan settings
 */
export async function getCompPlanSettings(): Promise<CompPlanSettings | null> {
    const compPlan = await prisma.compPlan.findFirst({
        orderBy: { name: "asc" },
    });

    if (!compPlan) {
        return null;
    }

    return {
        id: compPlan.id,
        name: compPlan.name,
        baseRateMultiplier: compPlan.baseRateMultiplier,
        acceleratorsEnabled: compPlan.acceleratorsEnabled,
        kickersEnabled: compPlan.kickersEnabled,
        accelerators: compPlan.accelerators as AcceleratorConfig | null,
        kickers: compPlan.kickers as KickerConfig | null,
    };
}

export interface UpdateCompPlanInput {
    id: string;
    baseRateMultiplier: number;
    acceleratorsEnabled: boolean;
    kickersEnabled: boolean;
    accelerators: AcceleratorConfig;
    kickers: KickerConfig;
}

/**
 * Update CompPlan settings
 */
export async function updateCompPlanSettings(
    input: UpdateCompPlanInput
): Promise<{ success: boolean; error?: string }> {
    try {
        // Default baseRateMultiplier to 1 if invalid
        const baseRateMultiplier = (!input.baseRateMultiplier || input.baseRateMultiplier <= 0 || isNaN(input.baseRateMultiplier))
            ? 1.0
            : input.baseRateMultiplier;

        // Validate accelerator tiers if present
        const accelTiers = input.accelerators?.tiers ?? [];
        for (const tier of accelTiers) {
            if (tier.minAttainment < 0 || isNaN(tier.minAttainment)) {
                return { success: false, error: "Min attainment cannot be negative" };
            }
            if (tier.maxAttainment !== null && tier.maxAttainment <= tier.minAttainment) {
                return { success: false, error: "Max attainment must be greater than min attainment" };
            }
            if (!tier.multiplier || tier.multiplier <= 0 || isNaN(tier.multiplier)) {
                return { success: false, error: "Multiplier must be greater than 0" };
            }
        }

        // Validate kicker tiers if present
        const kickerTiers = input.kickers?.tiers ?? [];
        for (const tier of kickerTiers) {
            if (tier.attainmentThreshold < 0 || isNaN(tier.attainmentThreshold)) {
                return { success: false, error: "Attainment threshold cannot be negative" };
            }
            if (!tier.kickerPercent || tier.kickerPercent <= 0 || isNaN(tier.kickerPercent)) {
                return { success: false, error: "Kicker percent must be greater than 0" };
            }
        }

        // Generate description from accelerator tiers
        const acceleratorDescription = accelTiers
            .map((tier) => {
                if (tier.maxAttainment === null) {
                    return `${tier.multiplier}x above ${tier.minAttainment}%`;
                }
                return `${tier.multiplier}x from ${tier.minAttainment}-${tier.maxAttainment}%`;
            })
            .join(", ");

        await prisma.compPlan.update({
            where: { id: input.id },
            data: {
                baseRateMultiplier,
                acceleratorsEnabled: input.acceleratorsEnabled,
                kickersEnabled: input.kickersEnabled,
                accelerators: {
                    tiers: accelTiers,
                    description: acceleratorDescription,
                },
                kickers: {
                    tiers: kickerTiers,
                },
            },
        });

        revalidatePath("/admin/settings");
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error) {
        console.error("Failed to update CompPlan:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
