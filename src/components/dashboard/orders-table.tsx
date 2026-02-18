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
import { formatCurrency } from "@/lib/utils/format";

interface OrdersTableProps {
    orders: Order[];
    currency?: string;
}

export function OrdersTable({ orders, currency = "USD" }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-muted-foreground">No orders found for this period</div>
            </div>
        );
    }

    const altCurrency = currency === "EUR" ? "USD" : "EUR";

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Booking Date</TableHead>
                        <TableHead className="text-right">Amount ({currency})</TableHead>
                        <TableHead className="text-right">Amount ({altCurrency})</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>{format(new Date(order.bookingDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-mono">
                                {formatCurrency(currency === "EUR" ? order.convertedEur : order.convertedUsd, currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                                {formatCurrency(currency === "EUR" ? order.convertedUsd : order.convertedEur, altCurrency)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
