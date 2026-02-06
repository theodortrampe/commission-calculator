import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

/**
 * BigQuery Orders Row Schema
 * Represents the expected payload from BigQuery sync for orders
 */
interface BigQueryOrderRow {
    orderNumber: string;
    userEmail: string;
    convertedUsd: number;
    convertedEur?: number;
    status: "APPROVED" | "PENDING" | "DRAFT" | "CANCELLED";
    bookingDate: string; // ISO date string
}

interface IngestResponse {
    success: boolean;
    message: string;
    data?: {
        orderId: string;
        orderCreated: boolean;
    };
    error?: string;
}

/**
 * POST /api/ingest/bigquery/orders
 * 
 * Accepts a JSON payload representing an order and:
 * 1. Finds the User by email
 * 2. Creates or updates an Order
 */
export async function POST(request: NextRequest): Promise<NextResponse<IngestResponse>> {
    try {
        const body = await request.json() as BigQueryOrderRow;

        // Validate required fields
        if (!body.orderNumber) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "orderNumber is required" },
                { status: 400 }
            );
        }

        if (!body.userEmail) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "userEmail is required" },
                { status: 400 }
            );
        }

        if (typeof body.convertedUsd !== "number") {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "convertedUsd must be a number" },
                { status: 400 }
            );
        }

        if (!body.bookingDate) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "bookingDate is required" },
                { status: 400 }
            );
        }

        const bookingDate = new Date(body.bookingDate);
        if (isNaN(bookingDate.getTime())) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "bookingDate must be a valid date" },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: body.userEmail },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found", error: `No user found with email ${body.userEmail}` },
                { status: 404 }
            );
        }

        // Map status string to enum
        const statusMap: Record<string, OrderStatus> = {
            APPROVED: OrderStatus.APPROVED,
            PENDING: OrderStatus.PENDING,
            DRAFT: OrderStatus.DRAFT,
            CANCELLED: OrderStatus.CANCELLED,
        };

        const status = statusMap[body.status] ?? OrderStatus.PENDING;

        // Check if order exists
        const existingOrder = await prisma.order.findUnique({
            where: { orderNumber: body.orderNumber },
        });

        let order;
        let orderCreated = false;

        if (existingOrder) {
            order = await prisma.order.update({
                where: { orderNumber: body.orderNumber },
                data: {
                    convertedUsd: body.convertedUsd,
                    convertedEur: body.convertedEur ?? body.convertedUsd * 0.91,
                    status,
                    bookingDate,
                    userId: user.id,
                },
            });
        } else {
            order = await prisma.order.create({
                data: {
                    orderNumber: body.orderNumber,
                    convertedUsd: body.convertedUsd,
                    convertedEur: body.convertedEur ?? body.convertedUsd * 0.91,
                    status,
                    bookingDate,
                    userId: user.id,
                },
            });
            orderCreated = true;
        }

        return NextResponse.json({
            success: true,
            message: orderCreated
                ? `Order ${body.orderNumber} created for ${body.userEmail}`
                : `Order ${body.orderNumber} updated`,
            data: {
                orderId: order.id,
                orderCreated,
            },
        });
    } catch (error) {
        console.error("BigQuery orders ingest error:", error);

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
 * PUT /api/ingest/bigquery/orders (batch)
 * Bulk import multiple orders
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json() as { rows: BigQueryOrderRow[] };

        if (!Array.isArray(body.rows)) {
            return NextResponse.json(
                { success: false, message: "Validation failed", error: "rows must be an array" },
                { status: 400 }
            );
        }

        const results: { orderNumber: string; success: boolean; error?: string }[] = [];

        for (const row of body.rows) {
            try {
                // Validate row
                if (!row.orderNumber || !row.userEmail || typeof row.convertedUsd !== "number" || !row.bookingDate) {
                    results.push({
                        orderNumber: row.orderNumber || "unknown",
                        success: false,
                        error: "Missing required fields"
                    });
                    continue;
                }

                const bookingDate = new Date(row.bookingDate);
                if (isNaN(bookingDate.getTime())) {
                    results.push({
                        orderNumber: row.orderNumber,
                        success: false,
                        error: "Invalid booking date"
                    });
                    continue;
                }

                // Find user
                const user = await prisma.user.findUnique({
                    where: { email: row.userEmail },
                });

                if (!user) {
                    results.push({
                        orderNumber: row.orderNumber,
                        success: false,
                        error: `User not found: ${row.userEmail}`
                    });
                    continue;
                }

                const statusMap: Record<string, OrderStatus> = {
                    APPROVED: OrderStatus.APPROVED,
                    PENDING: OrderStatus.PENDING,
                    DRAFT: OrderStatus.DRAFT,
                    CANCELLED: OrderStatus.CANCELLED,
                };
                const status = statusMap[row.status] ?? OrderStatus.PENDING;

                // Upsert order
                await prisma.order.upsert({
                    where: { orderNumber: row.orderNumber },
                    create: {
                        orderNumber: row.orderNumber,
                        convertedUsd: row.convertedUsd,
                        convertedEur: row.convertedEur ?? row.convertedUsd * 0.91,
                        status,
                        bookingDate,
                        userId: user.id,
                    },
                    update: {
                        convertedUsd: row.convertedUsd,
                        convertedEur: row.convertedEur ?? row.convertedUsd * 0.91,
                        status,
                        bookingDate,
                        userId: user.id,
                    },
                });

                results.push({ orderNumber: row.orderNumber, success: true });
            } catch (err) {
                results.push({
                    orderNumber: row.orderNumber || "unknown",
                    success: false,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            success: failureCount === 0,
            message: `Processed ${results.length} orders: ${successCount} succeeded, ${failureCount} failed`,
            results,
        });
    } catch (error) {
        console.error("BigQuery orders batch ingest error:", error);

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
