import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrderById } from "../actions";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/orders"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Order {order.orderNumber}
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Booked on {format(order.bookingDate, "MMMM d, yyyy")}
                    </p>
                </div>
            </div>

            {/* Order Details */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Order Number</p>
                                <p className="font-mono font-medium">{order.orderNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Booking Date</p>
                                <p className="font-medium">{format(order.bookingDate, "MMM d, yyyy")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Financial Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Amount (USD)</p>
                                <p className="text-2xl font-bold font-mono">
                                    ${order.convertedUsd.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Amount (EUR)</p>
                                <p className="text-2xl font-bold font-mono">
                                    €{order.convertedEur.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Sales Rep</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-lg font-medium">
                                    {order.user.name.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium">{order.user.name}</p>
                                <p className="text-sm text-muted-foreground">{order.user.email}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
