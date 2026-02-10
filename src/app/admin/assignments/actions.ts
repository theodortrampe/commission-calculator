
"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type AssignmentWithDetails = {
    id: string;
    user: { id: string; name: string | null } | null;
    role: Role | null;
    plan: { id: string; name: string };
    startDate: Date;
    endDate: Date | null;
};

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

    return assignments;
}

export async function getUsersAndPlans() {
    const [users, plans] = await Promise.all([
        prisma.user.findMany({
            where: {
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
    await prisma.planAssignment.delete({
        where: { id },
    });
    revalidatePath("/admin/assignments");
}
