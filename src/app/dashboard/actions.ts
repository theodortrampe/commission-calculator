"use server";

import { prisma } from "@/lib/prisma";
import { calculateCommissions, CommissionResult } from "@/lib/utils/calculateCommissions";
import { Order, OrderStatus, PayoutStatus } from "@prisma/client";

export interface DashboardData {
    commission: CommissionResult;
    orders: Order[];
    pendingPayoutsTotal: number;
    pendingPayoutsCount: number;
}

export interface GetDashboardDataInput {
    userId: string;
    month: Date; // First day of the month
}

/**
 * Server action to fetch all dashboard data for a user for a specific month.
 */
export async function getDashboardData(
    input: GetDashboardDataInput
): Promise<DashboardData> {
    const { userId, month } = input;

    // Calculate start and end of month
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch commission data
    const commission = await calculateCommissions({
        userId,
        startDate,
        endDate,
    });

    // Fetch orders for this month (all statuses for display)
    const orders = await prisma.order.findMany({
        where: {
            userId,
            bookingDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            bookingDate: "desc",
        },
    });

    // Fetch pending payouts (DRAFT status)
    const pendingPayouts = await prisma.payout.findMany({
        where: {
            userId,
            status: PayoutStatus.DRAFT,
        },
    });

    const pendingPayoutsTotal = pendingPayouts.reduce(
        (sum, payout) => sum + payout.finalPayout,
        0
    );

    return {
        commission,
        orders,
        pendingPayoutsTotal,
        pendingPayoutsCount: pendingPayouts.length,
    };
}

/**
 * Get available months for the date picker (based on user's period data).
 */
export async function getAvailableMonths(userId: string): Promise<Date[]> {
    const periodData = await prisma.userPeriodData.findMany({
        where: { userId },
        select: { month: true },
        orderBy: { month: "desc" },
    });

    return periodData.map((p) => p.month);
}

/**
 * Get the current user for demo purposes.
 * In production, this would use authentication.
 */
export async function getCurrentDemoUser() {
    // For demo, return Jane Smith to showcase accelerator
    const user = await prisma.user.findFirst({
        where: {
            role: "REP",
            name: "Jane Smith",
        },
    });

    return user;
}
