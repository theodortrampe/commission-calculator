"use server";

import { prisma } from "@/lib/prisma";
import { Payout, Adjustment } from "@prisma/client";

export interface PayoutWithAdjustments extends Payout {
    adjustments: Adjustment[];
}

/**
 * Get all payouts for a rep (for their payout history page)
 */
export async function getRepPayouts(userId: string): Promise<PayoutWithAdjustments[]> {
    const payouts = await prisma.payout.findMany({
        where: { userId },
        include: {
            adjustments: {
                orderBy: { createdAt: "desc" },
            },
        },
        orderBy: { periodStart: "desc" },
    });

    return payouts;
}

/**
 * Get a single payout with adjustments for the detail page
 */
export async function getRepPayoutById(
    userId: string,
    payoutId: string
): Promise<PayoutWithAdjustments | null> {
    const payout = await prisma.payout.findFirst({
        where: {
            id: payoutId,
            userId, // Ensure rep can only see their own payouts
        },
        include: {
            adjustments: {
                orderBy: { createdAt: "desc" },
            },
        },
    });

    return payout;
}
