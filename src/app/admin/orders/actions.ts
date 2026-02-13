"use server";

import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { Order, User, OrderStatus } from "@prisma/client";

export interface OrderWithUser extends Order {
    user: User;
}

export interface OrderFilters {
    userId?: string;
    month?: Date;
    search?: string;
    status?: OrderStatus;
}

/**
 * Get all orders with optional filters
 */
export async function getAllOrders(filters: OrderFilters = {}): Promise<OrderWithUser[]> {
    const where: Record<string, unknown> = { organizationId: CURRENT_ORG_ID };

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.month) {
        const startDate = new Date(filters.month.getFullYear(), filters.month.getMonth(), 1);
        const endDate = new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 0, 23, 59, 59, 999);
        where.bookingDate = {
            gte: startDate,
            lte: endDate,
        };
    }

    if (filters.search) {
        where.orderNumber = {
            contains: filters.search,
        };
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: true,
        },
        orderBy: { bookingDate: "desc" },
    });

    return orders;
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderWithUser | null> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
    });
    return order;
}

/**
 * Get all reps for filter dropdown
 */
export async function getAllReps(): Promise<Pick<User, "id" | "name">[]> {
    const users = await prisma.user.findMany({
        where: { role: "REP", organizationId: CURRENT_ORG_ID },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
    return users;
}

/**
 * Get available months for filter dropdown
 */
export async function getOrderMonths(): Promise<Date[]> {
    const orders = await prisma.order.findMany({
        where: { organizationId: CURRENT_ORG_ID },
        select: { bookingDate: true },
        distinct: ["bookingDate"],
        orderBy: { bookingDate: "desc" },
    });

    // Get unique months
    const months = new Map<string, Date>();
    orders.forEach((order) => {
        const monthKey = `${order.bookingDate.getFullYear()}-${order.bookingDate.getMonth()}`;
        if (!months.has(monthKey)) {
            months.set(monthKey, new Date(order.bookingDate.getFullYear(), order.bookingDate.getMonth(), 1));
        }
    });

    return Array.from(months.values());
}
