"use server";

import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { DrawType, PayoutFreq } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CompPlanSummary = {
    id: string;
    name: string;
    frequency: PayoutFreq;
    description: string | null;
    _count: {
        assignments: number;
    };
};

export async function getCompPlans(): Promise<CompPlanSummary[]> {
    const plans = await prisma.compPlan.findMany({
        where: { organizationId: CURRENT_ORG_ID },
        include: {
            _count: {
                select: {
                    assignments: true,
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });

    return plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        frequency: plan.frequency,
        description: plan.description,
        _count: {
            assignments: plan._count.assignments,
        },
    }));
}


import { CompPlan, RampStep } from "@prisma/client";

export type CompPlanDetail = CompPlan & {
    steps: RampStep[];
    _count: {
        assignments: number;
    };
};

export async function getCompPlan(id: string): Promise<CompPlanDetail | null> {
    const plan = await prisma.compPlan.findUnique({
        where: { id },
        include: {
            steps: {
                orderBy: {
                    monthIndex: "asc",
                },
            },
            _count: {
                select: {
                    assignments: true,
                },
            },
        },
    });
    return plan;
}

export async function createCompPlan(data: {
    name: string;
    description: string;
    frequency: PayoutFreq;
}) {
    const plan = await prisma.compPlan.create({
        data: {
            name: data.name,
            description: data.description,
            frequency: data.frequency,
            organizationId: CURRENT_ORG_ID,
            // Default logic
            baseRateMultiplier: 1.0,
            acceleratorsEnabled: true,
            kickersEnabled: false,
        },
    });

    revalidatePath("/admin/plans");
    return plan.id;
}

export async function updateCompPlan(planId: string, data: {
    baseRateMultiplier: number;
    frequency: PayoutFreq;
    acceleratorsEnabled: boolean;
    kickersEnabled: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accelerators: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kickers: any;
}) {
    await prisma.compPlan.update({
        where: { id: planId },
        data: {
            baseRateMultiplier: data.baseRateMultiplier,
            frequency: data.frequency,
            acceleratorsEnabled: data.acceleratorsEnabled,
            kickersEnabled: data.kickersEnabled,
            accelerators: data.accelerators,
            kickers: data.kickers,
        },
    });

    revalidatePath("/admin/plans/[id]", "page");
}

export async function saveRampSteps(planId: string, steps: {
    monthIndex: number;
    quotaPercentage: number;
    guaranteedDrawPercent: number | null;
    drawType: "NON_RECOVERABLE" | "RECOVERABLE";
    disableAccelerators: boolean;
    disableKickers: boolean;
}[]): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete existing steps for this plan and create new ones atomically
        await prisma.$transaction([
            prisma.rampStep.deleteMany({
                where: { planId },
            }),
            ...steps.map(step =>
                prisma.rampStep.create({
                    data: {
                        planId,
                        monthIndex: step.monthIndex,
                        quotaPercentage: step.quotaPercentage,
                        guaranteedDrawPercent: step.guaranteedDrawPercent,
                        drawType: step.drawType as DrawType,
                        disableAccelerators: step.disableAccelerators,
                        disableKickers: step.disableKickers,
                    },
                })
            ),
        ]);

        revalidatePath("/admin/plans/[id]", "page");
        return { success: true };
    } catch (error) {
        console.error("Failed to save ramp steps:", error);
        return { success: false, error: "Failed to save ramp steps" };
    }
}
