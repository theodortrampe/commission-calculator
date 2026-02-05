"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculateCommissions, CommissionResult } from "@/lib/utils/calculateCommissions";
import { Payout, PayoutStatus, User, Adjustment } from "@prisma/client";

export interface UserEarningsSummary {
    user: User;
    commission: CommissionResult | null;
    existingPayout: Payout | null;
    error?: string;
}

export interface PayoutWithAdjustments extends Payout {
    adjustments: Adjustment[];
    user: User;
}

/**
 * Get all sales reps with their earnings for a specific month.
 */
export async function getAllUserEarnings(month: Date): Promise<UserEarningsSummary[]> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all REP users
    const users = await prisma.user.findMany({
        where: {
            role: "REP",
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

        // Calculate commission
        let commission: CommissionResult | null = null;
        let error: string | undefined;

        try {
            commission = await calculateCommissions({
                userId: user.id,
                startDate,
                endDate,
            });
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to calculate commission";
        }

        results.push({
            user,
            commission,
            existingPayout,
            error,
        });
    }

    return results;
}

/**
 * Generate a new payout for a user.
 */
export async function generatePayout(
    userId: string,
    month: Date
): Promise<{ success: boolean; payout?: Payout; error?: string }> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    try {
        // Check for existing payout
        const existingPayout = await prisma.payout.findFirst({
            where: {
                userId,
                periodStart: startDate,
                periodEnd: endDate,
            },
        });

        if (existingPayout) {
            return {
                success: false,
                error: "A payout already exists for this period",
            };
        }

        // Calculate commission
        const commission = await calculateCommissions({
            userId,
            startDate,
            endDate,
        });

        // Create payout record
        const payout = await prisma.payout.create({
            data: {
                userId,
                periodStart: startDate,
                periodEnd: endDate,
                grossEarnings: commission.commissionEarned,
                finalPayout: commission.commissionEarned,
                status: PayoutStatus.DRAFT,
            },
        });

        revalidatePath("/admin/payouts");

        return { success: true, payout };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to generate payout",
        };
    }
}

/**
 * Get a payout by ID with adjustments.
 */
export async function getPayoutById(
    payoutId: string
): Promise<PayoutWithAdjustments | null> {
    return prisma.payout.findUnique({
        where: { id: payoutId },
        include: {
            adjustments: {
                orderBy: { createdAt: "desc" },
            },
            user: true,
        },
    });
}

/**
 * Create an adjustment for a payout.
 */
export async function createAdjustment(
    payoutId: string,
    amount: number,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get current payout
        const payout = await prisma.payout.findUnique({
            where: { id: payoutId },
        });

        if (!payout) {
            return { success: false, error: "Payout not found" };
        }

        if (payout.status !== PayoutStatus.DRAFT) {
            return { success: false, error: "Can only adjust DRAFT payouts" };
        }

        // Create adjustment and update payout in a transaction
        await prisma.$transaction([
            prisma.adjustment.create({
                data: {
                    payoutId,
                    amount,
                    reason,
                },
            }),
            prisma.payout.update({
                where: { id: payoutId },
                data: {
                    finalPayout: payout.finalPayout + amount,
                },
            }),
        ]);

        revalidatePath(`/admin/payouts/${payoutId}`);
        revalidatePath("/admin/payouts");

        return { success: true };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to create adjustment",
        };
    }
}

/**
 * Update payout status.
 */
export async function updatePayoutStatus(
    payoutId: string,
    status: PayoutStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.payout.update({
            where: { id: payoutId },
            data: { status },
        });

        revalidatePath(`/admin/payouts/${payoutId}`);
        revalidatePath("/admin/payouts");

        return { success: true };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to update status",
        };
    }
}

/**
 * Get all payouts for a given month.
 */
export async function getPayoutsForMonth(month: Date): Promise<PayoutWithAdjustments[]> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    return prisma.payout.findMany({
        where: {
            periodStart: startDate,
            periodEnd: endDate,
        },
        include: {
            adjustments: true,
            user: true,
        },
        orderBy: {
            user: {
                name: "asc",
            },
        },
    });
}
