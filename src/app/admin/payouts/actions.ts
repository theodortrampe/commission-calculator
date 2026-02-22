"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { calculateCommissions, CommissionResult } from "@/lib/utils/calculateCommissions";
import { Payout, PayoutStatus, User, Adjustment, AdjustmentType } from "@prisma/client";

// Type for payout with its related data
export interface PayoutWithAdjustments extends Payout {
    user: User;
    adjustments: Adjustment[];
}

/**
 * Get a single payout by ID with user and adjustments
 */
export async function getPayoutById(payoutId: string): Promise<PayoutWithAdjustments | null> {
    const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: {
            user: true,
            adjustments: {
                orderBy: { createdAt: "desc" },
            },
        },
    });
    return payout;
}

/**
 * Create an adjustment for an existing payout (legacy per-payout adjustment)
 */
export async function createAdjustment(
    payoutId: string,
    amount: number,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const payout = await prisma.payout.findUnique({
            where: { id: payoutId },
        });

        if (!payout) {
            return { success: false, error: "Payout not found" };
        }

        if (payout.status !== "DRAFT") {
            return { success: false, error: "Can only adjust DRAFT payouts" };
        }

        // Create adjustment and update payout final amount
        await prisma.$transaction([
            prisma.adjustment.create({
                data: {
                    userId: payout.userId,
                    organizationId: payout.organizationId,
                    payoutId: payoutId,
                    month: payout.periodStart,
                    amount,
                    reason,
                    adjustmentType: "FIXED_BONUS",
                },
            }),
            prisma.payout.update({
                where: { id: payoutId },
                data: {
                    finalPayout: payout.finalPayout + amount,
                },
            }),
        ]);

        revalidatePath("/admin/payouts");
        revalidatePath(`/admin/payouts/${payoutId}`);

        return { success: true };
    } catch {
        return { success: false, error: "Failed to create adjustment" };
    }
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
    payoutId: string,
    newStatus: PayoutStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const payout = await prisma.payout.update({
            where: { id: payoutId },
            data: { status: newStatus },
            include: { user: true },
        });

        // Trigger notification when payout is published
        if (newStatus === "PUBLISHED") {
            // Dynamic import to avoid Edge runtime issues
            const { notifyPayoutPublished } = await import("@/lib/notifications");
            await notifyPayoutPublished({
                userId: payout.userId,
                userEmail: payout.user.email,
                userName: payout.user.name,
                payoutId: payout.id,
                payoutAmount: payout.finalPayout,
                periodMonth: payout.periodStart,
            });
        }

        revalidatePath("/admin/payouts");
        revalidatePath(`/admin/payouts/${payoutId}`);

        return { success: true };
    } catch {
        return { success: false, error: "Failed to update payout status" };
    }
}

export interface UserEarningsSummary {
    user: User;
    commission: CommissionResult | null;
    existingPayout: Payout | null;
    adjustments: Adjustment[];
    revenueAdjustmentTotal: number;
    fixedBonusTotal: number;
    /** The delta in commission caused by revenue adjustments (commission with adj - commission without) */
    revenueAdjustmentImpact: number;
    error?: string;
}

/**
 * Get all sales reps with their earnings for a specific month.
 * Now includes adjustments for each user with net payout impact.
 */
export async function getAllUserEarnings(month: Date): Promise<UserEarningsSummary[]> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const periodMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    // Get all REP users
    const users = await prisma.user.findMany({
        where: {
            role: "REP",
            organizationId: CURRENT_ORG_ID,
        },
        orderBy: {
            name: "asc",
        },
    });

    const results: UserEarningsSummary[] = [];

    for (const user of users) {
        // Check for existing payout
        const existingPayout = await prisma.payout.findFirst({
            where: {
                userId: user.id,
                periodStart: startDate,
                periodEnd: endDate,
            },
        });

        // Get adjustments for this user/month
        const adjustments = await prisma.adjustment.findMany({
            where: {
                userId: user.id,
                month: periodMonth,
            },
        });

        // Calculate adjustment totals by type
        const revenueAdjustmentTotal = adjustments
            .filter(a => a.adjustmentType === "REVENUE")
            .reduce((sum, a) => sum + a.amount, 0);
        const fixedBonusTotal = adjustments
            .filter(a => a.adjustmentType === "FIXED_BONUS")
            .reduce((sum, a) => sum + a.amount, 0);

        // Calculate commission (with revenue adjustments factored in)
        let commission: CommissionResult | null = null;
        let commissionWithoutAdj: CommissionResult | null = null;
        let error: string | undefined;
        let revenueAdjustmentImpact = 0;

        try {
            // Calculate with adjustments
            commission = await calculateCommissions({
                userId: user.id,
                startDate,
                endDate,
                revenueAdjustment: revenueAdjustmentTotal,
            });

            // If there are revenue adjustments, also calculate without to get delta
            if (revenueAdjustmentTotal !== 0) {
                commissionWithoutAdj = await calculateCommissions({
                    userId: user.id,
                    startDate,
                    endDate,
                    revenueAdjustment: 0,
                });
                revenueAdjustmentImpact = commission.commissionEarned - commissionWithoutAdj.commissionEarned;
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to calculate commission";
        }

        results.push({
            user,
            commission,
            existingPayout,
            adjustments,
            revenueAdjustmentTotal,
            fixedBonusTotal,
            revenueAdjustmentImpact,
            error,
        });
    }

    return results;
}

// ============================================
// Bulk Payout Actions
// ============================================

/**
 * Generate DRAFT payouts for all reps who don't have a payout for the given month.
 * Includes revenue adjustments in the commission calculation.
 */
export async function generateBulkPayouts(
    month: Date
): Promise<{ success: boolean; generated: number; errors: string[] }> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const periodMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    const errors: string[] = [];
    let generated = 0;

    try {
        // Get all REP users
        const users = await prisma.user.findMany({
            where: { role: "REP", organizationId: CURRENT_ORG_ID },
        });

        for (const user of users) {
            // Check for existing payout
            const existingPayout = await prisma.payout.findFirst({
                where: {
                    userId: user.id,
                    periodStart: startDate,
                    periodEnd: endDate,
                },
            });

            if (existingPayout) {
                continue; // Skip users who already have a payout
            }

            try {
                // Get revenue adjustments for this user/month
                const revenueAdjustments = await prisma.adjustment.findMany({
                    where: {
                        userId: user.id,
                        month: periodMonth,
                        adjustmentType: "REVENUE",
                    },
                });
                const totalRevenueAdjustment = revenueAdjustments.reduce((sum, adj) => sum + adj.amount, 0);

                // Get fixed bonus adjustments
                const fixedBonusAdjustments = await prisma.adjustment.findMany({
                    where: {
                        userId: user.id,
                        month: periodMonth,
                        adjustmentType: "FIXED_BONUS",
                    },
                });
                const totalFixedBonus = fixedBonusAdjustments.reduce((sum, adj) => sum + adj.amount, 0);

                // Calculate commission with revenue adjustment
                const commission = await calculateCommissions({
                    userId: user.id,
                    startDate,
                    endDate,
                    revenueAdjustment: totalRevenueAdjustment,
                });

                // Create payout record
                const payout = await prisma.payout.create({
                    data: {
                        userId: user.id,
                        organizationId: CURRENT_ORG_ID,
                        periodStart: startDate,
                        periodEnd: endDate,
                        grossEarnings: commission.commissionEarned,
                        finalPayout: commission.commissionEarned + totalFixedBonus,
                        status: PayoutStatus.DRAFT,
                    },
                });

                // Link all adjustments to this payout
                const allAdjustmentIds = [...revenueAdjustments, ...fixedBonusAdjustments].map(a => a.id);
                if (allAdjustmentIds.length > 0) {
                    await prisma.adjustment.updateMany({
                        where: { id: { in: allAdjustmentIds } },
                        data: { payoutId: payout.id },
                    });
                }

                generated++;
            } catch (e) {
                errors.push(`${user.name}: ${e instanceof Error ? e.message : "Failed to generate payout"}`);
            }
        }

        revalidatePath("/admin/payouts");

        return { success: true, generated, errors };
    } catch (e) {
        return {
            success: false,
            generated: 0,
            errors: [e instanceof Error ? e.message : "Bulk generation failed"],
        };
    }
}

/**
 * Publish all DRAFT payouts for a given month.
 */
export async function publishBulkPayouts(
    month: Date
): Promise<{ success: boolean; published: number; error?: string }> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    try {
        const result = await prisma.payout.updateMany({
            where: {
                organizationId: CURRENT_ORG_ID,
                periodStart: startDate,
                periodEnd: endDate,
                status: PayoutStatus.DRAFT,
            },
            data: {
                status: PayoutStatus.PUBLISHED,
            },
        });

        revalidatePath("/admin/payouts");

        return { success: true, published: result.count };
    } catch (e) {
        return {
            success: false,
            published: 0,
            error: e instanceof Error ? e.message : "Failed to publish payouts",
        };
    }
}

/**
 * Create an adjustment for a user (can be before payout exists).
 * Type: REVENUE adjustments flow through commission calculation.
 * Type: FIXED_BONUS adjustments are added directly to final payout.
 */
export async function createUserAdjustment(
    userId: string,
    month: Date,
    amount: number,
    reason: string,
    adjustmentType: AdjustmentType
): Promise<{ success: boolean; error?: string }> {
    const periodMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    try {
        // Create the adjustment
        await prisma.adjustment.create({
            data: {
                userId,
                organizationId: CURRENT_ORG_ID,
                month: periodMonth,
                amount,
                reason,
                adjustmentType,
            },
        });

        revalidatePath("/admin/payouts");

        return { success: true };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to create adjustment",
        };
    }
}

