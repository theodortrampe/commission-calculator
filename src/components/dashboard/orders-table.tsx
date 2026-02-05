"use client";

import { Order, OrderStatus } from "@prisma/client";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OrdersTableProps {
    orders: Order[];
}

const statusColors: Record<OrderStatus, string> = {
    APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    DRAFT: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20",
    CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
};

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
                        <TableHead className="text-center">Status</TableHead>
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
                            <TableCell className="text-center">
                                <Badge variant="outline" className={statusColors[order.status]}>
                                    {order.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
