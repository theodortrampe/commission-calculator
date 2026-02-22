"use server";

import { prisma as db } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function getUsers() {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    return db.user.findMany({
        where: { organizationId: session.user.organizationId },
        include: { manager: true },
        orderBy: { name: "asc" }
    });
}

export async function getManagers() {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    return db.user.findMany({
        where: {
            organizationId: session.user.organizationId,
            role: { in: ["ADMIN", "MANAGER"] },
            isActive: true
        },
        orderBy: { name: "asc" }
    });
}

export async function createUser(data: {
    name: string;
    email: string;
    role: Role;
    managerId?: string | null;
    currency: string;
}) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await db.user.create({
        data: {
            name: data.name,
            email: data.email,
            role: data.role,
            currency: data.currency,
            managerId: data.managerId || null,
            passwordHash,
            organizationId: session.user.organizationId,
            isActive: true,
        },
    });

    revalidatePath("/admin/users");

    // Return temp password so admin can share it
    return { user: newUser, tempPassword };
}

export async function updateUser(userId: string, data: {
    name: string;
    role: Role;
    managerId?: string | null;
    currency: string;
}) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const updatedUser = await db.user.update({
        where: {
            id: userId,
            organizationId: session.user.organizationId // ensure tenant boundaries
        },
        data: {
            name: data.name,
            role: data.role,
            managerId: data.managerId || null,
            currency: data.currency,
        },
    });

    revalidatePath("/admin/users");
    return updatedUser;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Prevent deactivating yourself
    if (userId === session.user.id) {
        throw new Error("You cannot deactivate your own account.");
    }

    const updatedUser = await db.user.update({
        where: {
            id: userId,
            organizationId: session.user.organizationId
        },
        data: { isActive },
    });

    revalidatePath("/admin/users");
    return updatedUser;
}
