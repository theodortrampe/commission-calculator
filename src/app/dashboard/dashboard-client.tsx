"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

import { MonthPicker } from "@/components/ui/month-picker";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { Button } from "@/components/ui/button";
import { DashboardData, getDashboardData } from "./actions";

interface DashboardClientProps {
    initialData: DashboardData;
    userId: string;
    availableMonths: Date[];
    currentMonth: Date;
}

export function DashboardClient({
    initialData,
    userId,
    availableMonths,
    currentMonth,
}: DashboardClientProps) {
    const [data, setData] = useState<DashboardData>(initialData);
    const [selectedMonth, setSelectedMonth] = useState<Date>(currentMonth);
    const [isPending, startTransition] = useTransition();

    const handleMonthChange = (month: Date) => {
        setSelectedMonth(month);
        startTransition(async () => {
            const newData = await getDashboardData({ userId, month });
            setData(newData);
        });
    };

    const handleRefresh = () => {
        startTransition(async () => {
            const newData = await getDashboardData({ userId, month: selectedMonth });
            setData(newData);
        });
    };

    return (
        <div className="space-y-8">
            {/* Header with date picker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Your commission summary for {format(selectedMonth, "MMMM yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <MonthPicker
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        availableMonths={availableMonths}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isPending}
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Loading overlay */}
            <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
                {/* Stats Cards */}
                <StatsCards
                    commission={data.commission}
                    pendingPayoutsTotal={data.pendingPayoutsTotal}
                    pendingPayoutsCount={data.pendingPayoutsCount}
                />

                {/* Orders Section */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">Orders</h2>
                            <p className="text-sm text-muted-foreground">
                                {data.orders.length} order{data.orders.length !== 1 ? "s" : ""} this month
                            </p>
                        </div>
                    </div>
                    <OrdersTable orders={data.orders} />
                </div>

                {/* Commission Breakdown */}
                {data.commission.breakdown.overageRevenue > 0 && (
                    <div className="mt-8 p-6 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
                        <h3 className="font-semibold mb-4">Commission Breakdown</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Base Revenue</p>
                                <p className="font-mono font-medium">
                                    ${data.commission.breakdown.baseRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Base Commission</p>
                                <p className="font-mono font-medium">
                                    ${data.commission.breakdown.baseCommission.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Overage Revenue</p>
                                <p className="font-mono font-medium text-emerald-600">
                                    ${data.commission.breakdown.overageRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Accelerated Commission</p>
                                <p className="font-mono font-medium text-emerald-600">
                                    ${data.commission.breakdown.overageCommission.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
