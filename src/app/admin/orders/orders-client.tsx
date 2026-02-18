"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { OrderWithUser, getAllOrders } from "./actions";
import { formatCurrency } from "@/lib/utils/format";

interface OrdersClientProps {
    initialOrders: OrderWithUser[];
    reps: { id: string; name: string }[];
    months: Date[];
}

export function OrdersClient({ initialOrders, reps, months }: OrdersClientProps) {
    const [orders, setOrders] = useState<OrderWithUser[]>(initialOrders);
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [selectedRep, setSelectedRep] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");

    const handleFilter = () => {
        startTransition(async () => {
            const filters: Record<string, unknown> = {};
            if (selectedRep !== "all") filters.userId = selectedRep;
            if (selectedMonth !== "all") filters.month = new Date(selectedMonth);
            if (search) filters.search = search;

            const result = await getAllOrders(filters as Parameters<typeof getAllOrders>[0]);
            setOrders(result);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilter();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">
                        View and manage orders across all reps
                    </p>
                </div>
                <Link href="/admin/data-import">
                    <Button>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Import Orders
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={selectedRep} onValueChange={(v) => { setSelectedRep(v); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select rep" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reps</SelectItem>
                                {reps.map((rep) => (
                                    <SelectItem key={rep.id} value={rep.id}>
                                        {rep.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {months.map((month) => (
                                    <SelectItem key={month.toISOString()} value={month.toISOString()}>
                                        {format(month, "MMMM yyyy")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="submit" variant="secondary" disabled={isPending}>
                            {isPending ? "Filtering..." : "Apply Filters"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Rep</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Booking Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {order.orderNumber}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{order.user.name}</TableCell>
                                        <TableCell className="font-mono">
                                            {formatCurrency(order.convertedUsd, "USD")}
                                        </TableCell>
                                        <TableCell>
                                            {format(order.bookingDate, "MMM d, yyyy")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Summary */}
            <p className="text-sm text-muted-foreground text-center">
                Showing {orders.length} order{orders.length !== 1 ? "s" : ""}
            </p>
        </div>
    );
}
