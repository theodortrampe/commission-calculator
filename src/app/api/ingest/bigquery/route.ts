import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CURRENT_ORG_ID } from "@/lib/constants";
import { Role } from "@prisma/client";

/**
 * BigQuery Row Schema
 * Represents the expected payload from BigQuery sync
 */
interface BigQueryRow {
    email: string;
    name?: string;
    title?: string;
    month: string; // ISO date string e.g., "2026-02-01"
    quota: number;
    baseSalary: number;
    ote?: number;
    commissionRate?: number;
    planId?: string;
    role?: "ADMIN" | "REP" | "MANAGER";
    currency?: "EUR" | "USD";
}

interface IngestResponse {
    success: boolean;
    message: string;
    data?: {
        userId: string;
        userCreated: boolean;
        periodDataId: string;
        effectiveRate: number;
    };
    error?: string;
}

/**
 * POST /api/ingest/bigquery
 * 
 * Accepts a JSON payload representing a BigQuery row and:
 * 1. Finds or creates the User by email
 * 2. Upserts UserPeriodData for the specific month
 * 3. Calculates and saves the effectiveRate
 * 
 * Supports two compensation modes via `compensationMode` field:
 * - "ote" (default): requires `ote` field, derives effectiveRate = (ote - baseSalary) / quota
 * - "commissionRate": requires `commissionRate` field, derives ote = baseSalary + (commissionRate * quota)
 */
export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
    try {
        const body = await request.json() as BigQueryRow & { compensationMode?: "ote" | "commissionRate" };
        const compensationMode = body.compensationMode || "ote";

        // Validate required fields
        if (!body.email) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "email is required" },
                { status: 400 }
            );
        }

        if (!body.month) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "month is required" },
                { status: 400 }
            );
        }

        if (typeof body.quota !== "number" || body.quota <= 0) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "quota must be a positive number" },
                { status: 400 }
            );
        }

        if (typeof body.baseSalary !== "number") {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "baseSalary must be a number" },
                { status: 400 }
            );
        }

        // Derive OTE and effectiveRate based on compensation mode
        let ote: number;
        let effectiveRate: number;

        if (compensationMode === "commissionRate") {
            if (typeof body.commissionRate !== "number" || body.commissionRate <= 0) {
                return NextResponse.json(
                    { success: false, message: "Validation failed", error: "commissionRate must be a positive number when compensationMode is 'commissionRate'" },
                    { status: 400 }
                );
            }
            effectiveRate = body.commissionRate;
            ote = body.baseSalary + (body.commissionRate * body.quota);
        } else {
            if (typeof body.ote !== "number") {
                return NextResponse.json(
                    { success: false, message: "Validation failed", error: "ote must be a number when compensationMode is 'ote'" },
                    { status: 400 }
                );
            }
            ote = body.ote;
            effectiveRate = (body.ote - body.baseSalary) / body.quota;
        }

        // Parse month to first day of month
        const monthDate = new Date(body.month);
        const normalizedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

        if (isNaN(normalizedMonth.getTime())) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "month must be a valid date" },
                { status: 400 }
            );
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email_organizationId: { email: body.email, organizationId: CURRENT_ORG_ID } },
        });

        let userCreated = false;

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: body.email,
                    name: body.name || body.email.split("@")[0],
                    role: (body.role as Role) || Role.REP,
                    organizationId: CURRENT_ORG_ID,
                    currency: body.currency || "USD",
                },
            });
            userCreated = true;
        } else if (body.currency && ["EUR", "USD"].includes(body.currency)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { currency: body.currency },
            });
        }

        // Upsert UserPeriodData
        const periodData = await prisma.userPeriodData.upsert({
            where: {
                userId_month: {
                    userId: user.id,
                    month: normalizedMonth,
                },
            },
            create: {
                userId: user.id,
                month: normalizedMonth,
                title: body.title,
                quota: body.quota,
                baseSalary: body.baseSalary,
                ote,
                effectiveRate,
                planId: body.planId || null,
            },
            update: {
                title: body.title,
                quota: body.quota,
                baseSalary: body.baseSalary,
                ote,
                effectiveRate,
                planId: body.planId || null,
            },
        });

        return NextResponse.json({
            success: true,
            message: userCreated
                ? `User created and period data saved for ${body.email}`
                : `Period data updated for ${body.email}`,
            data: {
                userId: user.id,
                userCreated,
                periodDataId: periodData.id,
                effectiveRate,
            },
        });
    } catch (error) {
        console.error("BigQuery ingest error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/ingest/bigquery (batch)
 * Bulk import multiple rows
 * 
 * Requires `compensationMode` field: "ote" (default) or "commissionRate"
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json() as {
            rows: BigQueryRow[];
            compensationMode?: "ote" | "commissionRate";
        };
        const compensationMode = body.compensationMode || "ote";

        if (!Array.isArray(body.rows)) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "rows must be an array" },
                { status: 400 }
            );
        }

        const results: { email: string; success: boolean; error?: string }[] = [];

        for (const row of body.rows) {
            try {
                // Validate common required fields
                if (!row.email || !row.month || !row.quota || !row.baseSalary) {
                    results.push({ email: row.email || "unknown", success: false, error: "Missing required fields (email, month, quota, baseSalary)" });
                    continue;
                }

                // Derive OTE and effectiveRate based on compensation mode
                let ote: number;
                let effectiveRate: number;

                if (compensationMode === "commissionRate") {
                    if (!row.commissionRate || row.commissionRate <= 0) {
                        results.push({ email: row.email, success: false, error: "commissionRate must be a positive number" });
                        continue;
                    }
                    effectiveRate = row.commissionRate;
                    ote = row.baseSalary + (row.commissionRate * row.quota);
                } else {
                    if (!row.ote) {
                        results.push({ email: row.email, success: false, error: "ote is required when compensationMode is 'ote'" });
                        continue;
                    }
                    ote = row.ote;
                    effectiveRate = (row.ote - row.baseSalary) / row.quota;
                }

                const monthDate = new Date(row.month);
                const normalizedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

                // Upsert user
                const user = await prisma.user.upsert({
                    where: { email_organizationId: { email: row.email, organizationId: CURRENT_ORG_ID } },
                    create: {
                        email: row.email,
                        name: row.name || row.email.split("@")[0],
                        role: (row.role as Role) || Role.REP,
                        organizationId: CURRENT_ORG_ID,
                        currency: row.currency || "USD",
                    },
                    update: {
                        name: row.name || undefined,
                        ...(row.currency && ["EUR", "USD"].includes(row.currency) ? { currency: row.currency } : {}),
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
                        title: row.title,
                        quota: row.quota,
                        baseSalary: row.baseSalary,
                        ote,
                        effectiveRate,
                        planId: row.planId || null,
                    },
                    update: {
                        title: row.title,
                        quota: row.quota,
                        baseSalary: row.baseSalary,
                        ote,
                        effectiveRate,
                        planId: row.planId || null,
                    },
                });

                results.push({ email: row.email, success: true });
            } catch (err) {
                results.push({
                    email: row.email || "unknown",
                    success: false,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            success: failureCount === 0,
            message: `Processed ${results.length} rows: ${successCount} succeeded, ${failureCount} failed`,
            results,
        });
    } catch (error) {
        console.error("BigQuery batch ingest error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
