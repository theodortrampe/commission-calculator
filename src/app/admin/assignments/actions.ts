
"use server";

import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type AssignmentWithDetails = {
    id: string;
    user: { id: string; name: string | null } | null;
    role: Role | null;
    plan: { id: string; name: string };
    startDate: Date;
    endDate: Date | null;
    isLocked: boolean;
    isOverlapping: boolean;
};

/**
 * Check if an assignment has any PUBLISHED payouts overlapping its date range.
 * If locked, the assignment cannot be edited or deleted.
 */
async function hasPublishedPayouts(assignment: {
    userId: string | null;
    role: Role | null;
    startDate: Date;
    endDate: Date | null;
}): Promise<boolean> {
    // Collect userIds to check
    const userIds: string[] = [];

    if (assignment.userId) {
        userIds.push(assignment.userId);
    } else if (assignment.role) {
        // Role-based: find all users with this role
        const users = await prisma.user.findMany({
            where: {
                organizationId: CURRENT_ORG_ID,
                role: assignment.role,
            },
            select: { id: true },
        });
        userIds.push(...users.map((u) => u.id));
    }

    if (userIds.length === 0) return false;

    // Check for PUBLISHED payouts whose period overlaps the assignment's date range
    const count = await prisma.payout.count({
        where: {
            userId: { in: userIds },
            status: "PUBLISHED",
            // Overlap condition: payout.periodStart <= assignment.endDate AND payout.periodEnd >= assignment.startDate
            periodEnd: { gte: assignment.startDate },
            ...(assignment.endDate
                ? { periodStart: { lte: assignment.endDate } }
                : {}),
        },
    });

    return count > 0;
}

export async function getAssignments(): Promise<AssignmentWithDetails[]> {
    const assignments = await prisma.planAssignment.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            plan: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { startDate: "desc" },
            { user: { name: "asc" } },
        ],
    });

    // Enrich each assignment with lock status and overlap detection
    const enriched = await Promise.all(
        assignments.map(async (a) => {
            const isLocked = await hasPublishedPayouts({
                userId: a.userId,
                role: a.role,
                startDate: a.startDate,
                endDate: a.endDate,
            });

            // Check for overlapping assignments (same user, overlapping dates)
            const isOverlapping = assignments.some((other) => {
                if (other.id === a.id) return false;
                // Only check user-based overlap (same userId)
                if (!a.userId || !other.userId || a.userId !== other.userId) return false;
                // Date range overlap check
                const aEnd = a.endDate || new Date("9999-12-31");
                const otherEnd = other.endDate || new Date("9999-12-31");
                return a.startDate <= otherEnd && other.startDate <= aEnd;
            });

            return { ...a, isLocked, isOverlapping };
        })
    );

    return enriched;
}

export async function getUsersAndPlans() {
    const [users, plans] = await Promise.all([
        prisma.user.findMany({
            where: {
                organizationId: CURRENT_ORG_ID,
                role: {
                    in: [Role.REP, Role.MANAGER], // Allow assigning to REPs and MANAGERs
                },
            },
            select: {
                id: true,
                name: true,
                role: true,
            },
            orderBy: {
                name: "asc",
            },
        }),
        prisma.compPlan.findMany({
            where: { organizationId: CURRENT_ORG_ID },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: "asc",
            },
        }),
    ]);

    return { users, plans };
}

export async function createAssignment(data: {
    userId: string | null;
    role: Role | null;
    planId: string;
    startDate: Date;
    endDate?: Date | null;
}) {
    if (!data.userId && !data.role) {
        throw new Error("Must assign to either a User or a Role.");
    }

    await prisma.planAssignment.create({
        data: {
            userId: data.userId || null,
            role: data.role || null,
            planId: data.planId,
            startDate: data.startDate,
            endDate: data.endDate || null,
        },
    });

    revalidatePath("/admin/assignments");
}

export async function deleteAssignment(id: string) {
    // Check lock status before allowing delete
    const assignment = await prisma.planAssignment.findUnique({
        where: { id },
    });
    if (!assignment) throw new Error("Assignment not found.");

    const locked = await hasPublishedPayouts(assignment);
    if (locked) {
        throw new Error("Cannot delete this assignment — payouts have already been published for this period.");
    }

    await prisma.planAssignment.delete({
        where: { id },
    });
    revalidatePath("/admin/assignments");
}

export async function updateAssignment(
    id: string,
    data: {
        userId: string | null;
        role: Role | null;
        planId: string;
        startDate: Date;
        endDate?: Date | null;
    }
) {
    if (!data.userId && !data.role) {
        throw new Error("Must assign to either a User or a Role.");
    }

    if (data.endDate && data.endDate < data.startDate) {
        throw new Error("End date cannot be before start date.");
    }

    // Check lock status before allowing update
    const assignment = await prisma.planAssignment.findUnique({
        where: { id },
    });
    if (!assignment) throw new Error("Assignment not found.");

    const locked = await hasPublishedPayouts(assignment);
    if (locked) {
        throw new Error("Cannot edit this assignment — payouts have already been published for this period.");
    }

    await prisma.planAssignment.update({
        where: { id },
        data: {
            userId: data.userId || null,
            role: data.role || null,
            planId: data.planId,
            startDate: data.startDate,
            endDate: data.endDate || null,
        },
    });

    revalidatePath("/admin/assignments");
}

export async function endAssignment(id: string) {
    const assignment = await prisma.planAssignment.findUnique({
        where: { id },
    });
    if (!assignment) throw new Error("Assignment not found.");

    const locked = await hasPublishedPayouts(assignment);
    if (locked) {
        throw new Error("Cannot modify this assignment — payouts have already been published for this period.");
    }

    // Set end date to last day of the current month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await prisma.planAssignment.update({
        where: { id },
        data: { endDate: lastDay },
    });

    revalidatePath("/admin/assignments");
}
