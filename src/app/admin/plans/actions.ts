"use server";

import { prisma } from "@/lib/prisma";
import { DrawType, PayoutFreq } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CompPlanSummary = {
    id: string;
    name: string;
    frequency: PayoutFreq;
    description: string | null;
    _count: {
        versions: number;
        assignments: number;
    };
    latestVersion: {
        effectiveFrom: Date;
    } | null;
};

export async function getCompPlans(): Promise<CompPlanSummary[]> {
    const plans = await prisma.compPlan.findMany({
        include: {
            _count: {
                select: {
                    versions: true,
                    assignments: true,
                },
            },
            versions: {
                orderBy: {
                    effectiveFrom: "desc",
                },
                take: 1,
                select: {
                    effectiveFrom: true,
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
            versions: plan._count.versions,
            assignments: plan._count.assignments,
        },
        latestVersion: plan.versions[0] || null,
    }));
}


export async function getCompPlan(id: string) {
    const plan = await prisma.compPlan.findUnique({
        where: { id },
        include: {
            versions: {
                orderBy: {
                    effectiveFrom: "desc",
                },
                include: {
                    steps: {
                        orderBy: {
                            monthIndex: "asc",
                        },
                    },
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

export type CompPlanDetail = Awaited<ReturnType<typeof getCompPlan>>;

export async function createCompPlan(data: {
    name: string;
    description: string;
    frequency: PayoutFreq;
}) {
    // Create plan AND initial draft version
    const plan = await prisma.compPlan.create({
        data: {
            name: data.name,
            description: data.description,
            frequency: data.frequency,
            versions: {
                create: {
                    versionNumber: 1,
                    effectiveFrom: new Date(),
                    isDraft: true,
                    // Default logic
                    baseRateMultiplier: 1.0,
                    acceleratorsEnabled: true,
                    kickersEnabled: false,
                },
            },
        },
    });

    revalidatePath("/admin/plans");
    return plan.id;
}

export async function updateCompPlanVersion(versionId: string, data: {
    baseRateMultiplier: number;
    acceleratorsEnabled: boolean;
    kickersEnabled: boolean;
    accelerators: any;
    kickers: any;
}) {
    await prisma.compPlanVersion.update({
        where: { id: versionId },
        data: {
            baseRateMultiplier: data.baseRateMultiplier,
            acceleratorsEnabled: data.acceleratorsEnabled,
            kickersEnabled: data.kickersEnabled,
            accelerators: data.accelerators,
            kickers: data.kickers,
        },
    });

    revalidatePath("/admin/plans/[id]", "page");
}

export async function saveRampSteps(versionId: string, steps: {
    monthIndex: number;
    quotaPercentage: number;
    guaranteedDraw: number | null;
    drawType: "NON_RECOVERABLE" | "RECOVERABLE";
    disableAccelerators: boolean;
    disableKickers: boolean;
}[]): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete existing steps for this version and create new ones atomically
        await prisma.$transaction([
            prisma.rampStep.deleteMany({
                where: { planVersionId: versionId },
            }),
            ...steps.map(step =>
                prisma.rampStep.create({
                    data: {
                        planVersionId: versionId,
                        monthIndex: step.monthIndex,
                        quotaPercentage: step.quotaPercentage,
                        guaranteedDraw: step.guaranteedDraw,
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
