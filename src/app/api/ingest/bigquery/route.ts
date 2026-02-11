import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    ote: number;
    planVersionId?: string;
    role?: "ADMIN" | "REP" | "MANAGER";
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
 */
export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
    try {
        const body = await request.json() as BigQueryRow;

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

        if (typeof body.ote !== "number") {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "ote must be a number" },
                { status: 400 }
            );
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

        // Calculate effective rate: (OTE - Base) / Quota
        const effectiveRate = (body.ote - body.baseSalary) / body.quota;

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: body.email },
        });

        let userCreated = false;

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: body.email,
                    name: body.name || body.email.split("@")[0],
                    role: (body.role as Role) || Role.REP,
                },
            });
            userCreated = true;
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
                ote: body.ote,
                effectiveRate,
                planVersionId: body.planVersionId || null,
            },
            update: {
                title: body.title,
                quota: body.quota,
                baseSalary: body.baseSalary,
                ote: body.ote,
                effectiveRate,
                planVersionId: body.planVersionId || null,
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
 * POST /api/ingest/bigquery (batch)
 * Bulk import multiple rows
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json() as { rows: BigQueryRow[] };

        if (!Array.isArray(body.rows)) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "rows must be an array" },
                { status: 400 }
            );
        }

        const results: { email: string; success: boolean; error?: string }[] = [];

        for (const row of body.rows) {
            try {
                // Validate row
                if (!row.email || !row.month || !row.quota || !row.baseSalary || !row.ote) {
                    results.push({ email: row.email || "unknown", success: false, error: "Missing required fields" });
                    continue;
                }

                const monthDate = new Date(row.month);
                const normalizedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const effectiveRate = (row.ote - row.baseSalary) / row.quota;

                // Upsert user
                const user = await prisma.user.upsert({
                    where: { email: row.email },
                    create: {
                        email: row.email,
                        name: row.name || row.email.split("@")[0],
                        role: (row.role as Role) || Role.REP,
                    },
                    update: {
                        name: row.name || undefined,
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
                        ote: row.ote,
                        effectiveRate,
                        planVersionId: row.planVersionId || null,
                    },
                    update: {
                        title: row.title,
                        quota: row.quota,
                        baseSalary: row.baseSalary,
                        ote: row.ote,
                        effectiveRate,
                        planVersionId: row.planVersionId || null,
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
