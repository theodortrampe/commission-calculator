"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

import { MonthPicker } from "@/components/ui/month-picker";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CommissionMathExplainer } from "@/components/dashboard/commission-math-explainer";
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

                {/* How Your Commission is Calculated */}
                <div className="mt-8 p-6 rounded-lg border bg-muted/30">
                    <h3 className="font-semibold mb-6">How Your Commission is Calculated</h3>

                    {/* Compensation Summary — Effective Quota & Math Explainer */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Your Compensation Plan</h4>
                        <CommissionMathExplainer commission={data.commission} />
                    </div>

                    {/* Revenue Summary */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Revenue Summary</h4>
                        <div className="grid gap-4 md:grid-cols-3 text-sm">
                            <div className="p-3 rounded-md bg-background border">
                                <p className="text-muted-foreground text-xs">Total Approved Revenue</p>
                                <p className="font-mono font-medium text-lg">
                                    ${data.commission.totalRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 rounded-md bg-background border">
                                <p className="text-muted-foreground text-xs">Base Revenue (up to quota)</p>
                                <p className="font-mono font-medium text-lg">
                                    ${data.commission.breakdown.baseRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 rounded-md bg-background border">
                                <p className="text-muted-foreground text-xs">Overage Revenue (above quota)</p>
                                <p className="font-mono font-medium text-lg">
                                    ${data.commission.breakdown.overageRevenue.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Commission Calculation */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Commission Calculation</h4>
                        <div className="space-y-3 text-sm font-mono bg-background p-4 rounded-md border">
                            {/* Base Commission */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted-foreground">Base Commission:</span>
                                <span>${data.commission.breakdown.baseRevenue.toLocaleString()}</span>
                                <span className="text-muted-foreground">×</span>
                                <span>{(data.commission.periodData.effectiveRate * 100).toFixed(2)}%</span>
                                <span className="text-muted-foreground">=</span>
                                <span className="font-semibold">${data.commission.breakdown.baseCommission.toLocaleString()}</span>
                            </div>

                            {/* Overage Commission (if applicable) */}
                            {data.commission.breakdown.overageRevenue > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground">Overage Commission:</span>
                                    <span>${data.commission.breakdown.overageRevenue.toLocaleString()}</span>
                                    <span className="text-muted-foreground">×</span>
                                    <span>{(data.commission.periodData.effectiveRate * 100).toFixed(2)}%</span>
                                    <span className="text-muted-foreground">×</span>
                                    <span>{data.commission.breakdown.acceleratorMultiplier}x</span>
                                    <span className="text-muted-foreground">=</span>
                                    <span className="font-semibold">${data.commission.breakdown.overageCommission.toLocaleString()}</span>
                                </div>
                            )}

                            {/* Kicker Bonus (if applicable) */}
                            {data.commission.breakdown.kickerAmount > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground">Kicker Bonus:</span>
                                    <span className="font-semibold">${data.commission.breakdown.kickerAmount.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({data.commission.breakdown.kickersApplied.join(", ")})
                                    </span>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="border-t my-2"></div>

                            {/* Total */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted-foreground">Total Commission:</span>
                                <span>${data.commission.breakdown.baseCommission.toLocaleString()}</span>
                                {data.commission.breakdown.overageRevenue > 0 && (
                                    <>
                                        <span className="text-muted-foreground">+</span>
                                        <span>${data.commission.breakdown.overageCommission.toLocaleString()}</span>
                                    </>
                                )}
                                {data.commission.breakdown.kickerAmount > 0 && (
                                    <>
                                        <span className="text-muted-foreground">+</span>
                                        <span>${data.commission.breakdown.kickerAmount.toLocaleString()}</span>
                                    </>
                                )}
                                <span className="text-muted-foreground">=</span>
                                <span className="font-bold text-lg">${data.commission.commissionEarned.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Accelerator Tier */}
                    {data.commission.breakdown.overageRevenue > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Accelerator Applied</h4>
                            <div className="p-3 rounded-md bg-background border text-sm">
                                <p className="font-medium">{data.commission.breakdown.tierApplied}</p>
                                <p className="text-muted-foreground text-xs mt-1">
                                    You exceeded quota by {(data.commission.attainmentPercent - 100).toFixed(1)}%,
                                    earning a {data.commission.breakdown.acceleratorMultiplier}x multiplier on overage revenue.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Kicker Bonuses */}
                    {data.commission.breakdown.kickerAmount > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Kicker Bonuses Earned</h4>
                            <div className="p-3 rounded-md bg-background border text-sm">
                                <p className="font-medium">${data.commission.breakdown.kickerAmount.toLocaleString()} bonus</p>
                                <p className="text-muted-foreground text-xs mt-1">
                                    Kickers applied: {data.commission.breakdown.kickersApplied.join(", ")}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
