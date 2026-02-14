"use client";

import { Order } from "@prisma/client";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface OrdersTableProps {
    orders: Order[];
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function OrdersTable({ orders }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-muted-foreground">No orders found for this period</div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Booking Date</TableHead>
                        <TableHead className="text-right">Amount (USD)</TableHead>
                        <TableHead className="text-right">Amount (EUR)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>{format(new Date(order.bookingDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-mono">
                                {formatCurrency(order.convertedUsd)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                                €{order.convertedEur.toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
