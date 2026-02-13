import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { Role, OrderStatus } from "@prisma/client";

interface ColumnMapping {
    [expectedColumn: string]: string;
}

interface ImportRow {
    [key: string]: unknown;
}

interface CompensationData {
    email: string;
    name?: string;
    title?: string;
    month: string;
    quota: number;
    baseSalary: number;
    ote: number;
    role?: string;
    planId?: string;
}

interface OrderData {
    orderNumber: string;
    userEmail: string;
    convertedUsd: number;
    convertedEur?: number;
    status?: string;
    bookingDate: string;
}

/**
 * POST /api/import/execute
 * 
 * Executes the import using provided rows and column mapping
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json() as {
            dataType: "compensation" | "orders";
            rows: ImportRow[];
            columnMapping: ColumnMapping;
        };

        const { dataType, rows, columnMapping } = body;

        if (!dataType || !["compensation", "orders"].includes(dataType)) {
            return NextResponse.json(
                { success: false, error: "Invalid dataType" },
                { status: 400 }
            );
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "No rows to import" },
                { status: 400 }
            );
        }

        const results: { row: number; success: boolean; error?: string }[] = [];

        // Helper to get mapped value
        const getValue = (row: ImportRow, key: string): unknown => {
            const mappedKey = columnMapping[key];
            return mappedKey ? row[mappedKey] : undefined;
        };

        if (dataType === "compensation") {
            // Get default plan
            const defaultPlan = await prisma.compPlan.findFirst({
                where: { organizationId: CURRENT_ORG_ID },
            });
            const defaultPlanId = defaultPlan?.id ?? null;

            for (let i = 0; i < rows.length; i++) {
                try {
                    const row = rows[i];

                    const email = String(getValue(row, "email") || "").trim();
                    const name = String(getValue(row, "name") || "").trim();
                    const title = String(getValue(row, "title") || "").trim();
                    const monthStr = String(getValue(row, "month") || "").trim();
                    const quota = Number(getValue(row, "quota"));
                    const baseSalary = Number(getValue(row, "baseSalary"));
                    const ote = Number(getValue(row, "ote"));
                    const role = String(getValue(row, "role") || "REP").toUpperCase() as Role;

                    if (!email) {
                        results.push({ row: i + 1, success: false, error: "Email is required" });
                        continue;
                    }

                    if (!monthStr) {
                        results.push({ row: i + 1, success: false, error: "Month is required" });
                        continue;
                    }

                    if (isNaN(quota) || quota <= 0) {
                        results.push({ row: i + 1, success: false, error: "Quota must be a positive number" });
                        continue;
                    }

                    const monthDate = new Date(monthStr);
                    if (isNaN(monthDate.getTime())) {
                        results.push({ row: i + 1, success: false, error: "Invalid month date" });
                        continue;
                    }

                    const normalizedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                    const effectiveRate = (ote - baseSalary) / quota;

                    // Upsert user
                    const user = await prisma.user.upsert({
                        where: { email_organizationId: { email, organizationId: CURRENT_ORG_ID } },
                        create: {
                            email,
                            name: name || email.split("@")[0],
                            role: ["ADMIN", "REP", "MANAGER"].includes(role) ? role : Role.REP,
                            organizationId: CURRENT_ORG_ID,
                        },
                        update: {
                            name: name || undefined,
                        },
                    });

                    // Upsert period data
                    await prisma.userPeriodData.upsert({
                        where: {
                            userId_month: {
                                userId: user.id,
                                month: normalizedMonth,
                            },
                        },
                        create: {
                            userId: user.id,
                            month: normalizedMonth,
                            title: title || null,
                            quota,
                            baseSalary,
                            ote,
                            effectiveRate,
                            planId: defaultPlanId,
                        },
                        update: {
                            title: title || undefined,
                            quota,
                            baseSalary,
                            ote,
                            effectiveRate,
                        },
                    });

                    results.push({ row: i + 1, success: true });
                } catch (err) {
                    results.push({
                        row: i + 1,
                        success: false,
                        error: err instanceof Error ? err.message : "Unknown error",
                    });
                }
            }
        } else if (dataType === "orders") {
            for (let i = 0; i < rows.length; i++) {
                try {
                    const row = rows[i];

                    const orderNumber = String(getValue(row, "orderNumber") || "").trim();
                    const userEmail = String(getValue(row, "userEmail") || "").trim();
                    const convertedUsd = Number(getValue(row, "convertedUsd"));
                    const convertedEur = getValue(row, "convertedEur")
                        ? Number(getValue(row, "convertedEur"))
                        : convertedUsd * 0.91;
                    const statusStr = String(getValue(row, "status") || "APPROVED").toUpperCase();
                    const bookingDateStr = String(getValue(row, "bookingDate") || "").trim();

                    if (!orderNumber) {
                        results.push({ row: i + 1, success: false, error: "Order number is required" });
                        continue;
                    }

                    if (!userEmail) {
                        results.push({ row: i + 1, success: false, error: "User email is required" });
                        continue;
                    }

                    if (isNaN(convertedUsd)) {
                        results.push({ row: i + 1, success: false, error: "Converted USD must be a number" });
                        continue;
                    }

                    const bookingDate = new Date(bookingDateStr);
                    if (isNaN(bookingDate.getTime())) {
                        results.push({ row: i + 1, success: false, error: "Invalid booking date" });
                        continue;
                    }

                    // Find user
                    const user = await prisma.user.findUnique({
                        where: { email_organizationId: { email: userEmail, organizationId: CURRENT_ORG_ID } },
                    });

                    if (!user) {
                        results.push({
                            row: i + 1,
                            success: false,
                            error: `User not found: ${userEmail}`
                        });
                        continue;
                    }

                    const statusMap: Record<string, OrderStatus> = {
                        APPROVED: OrderStatus.APPROVED,
                        PENDING: OrderStatus.PENDING,
                        DRAFT: OrderStatus.DRAFT,
                        CANCELLED: OrderStatus.CANCELLED,
                    };
                    const status = statusMap[statusStr] ?? OrderStatus.APPROVED;

                    // Upsert order
                    await prisma.order.upsert({
                        where: { orderNumber },
                        create: {
                            orderNumber,
                            convertedUsd,
                            convertedEur,
                            status,
                            bookingDate,
                            userId: user.id,
                            organizationId: CURRENT_ORG_ID,
                        },
                        update: {
                            convertedUsd,
                            convertedEur,
                            status,
                            bookingDate,
                            userId: user.id,
                        },
                    });

                    results.push({ row: i + 1, success: true });
                } catch (err) {
                    results.push({
                        row: i + 1,
                        success: false,
                        error: err instanceof Error ? err.message : "Unknown error",
                    });
                }
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            success: failureCount === 0,
            message: `Imported ${successCount} of ${rows.length} rows (${failureCount} failed)`,
            results,
        });
    } catch (error) {
        console.error("Import execution error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to execute import",
            },
            { status: 500 }
        );
    }
}
