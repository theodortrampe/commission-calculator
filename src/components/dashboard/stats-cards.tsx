"use client";

import { DollarSign, Target, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommissionResult } from "@/lib/utils/calculateCommissions";

interface StatsCardsProps {
    commission: CommissionResult;
    pendingPayoutsTotal: number;
    pendingPayoutsCount: number;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatPercent(percent: number): string {
    return `${percent.toFixed(1)}%`;
}

export function StatsCards({ commission, pendingPayoutsTotal, pendingPayoutsCount }: StatsCardsProps) {
    const isOverQuota = commission.attainmentPercent >= 100;
    const AttainmentIcon = isOverQuota ? TrendingUp : TrendingDown;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Current Month Earnings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Current Month Earnings
                    </CardTitle>
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(commission.commissionEarned)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        From {formatCurrency(commission.totalRevenue)} revenue
                    </p>
                    {commission.breakdown.acceleratorMultiplier > 1 && (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {commission.breakdown.tierApplied}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* % to Quota */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        % to Quota
                    </CardTitle>
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Target className="h-4 w-4 text-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatPercent(commission.attainmentPercent)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <AttainmentIcon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Quota: {formatCurrency(commission.periodData.quota)}
                        </p>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all bg-foreground"
                            style={{ width: `${Math.min(commission.attainmentPercent, 100)}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Pending Payouts */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pending Payouts
                    </CardTitle>
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Clock className="h-4 w-4 text-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(pendingPayoutsTotal)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {pendingPayoutsCount === 0
                            ? "No pending payouts"
                            : `${pendingPayoutsCount} payout${pendingPayoutsCount > 1 ? "s" : ""} awaiting approval`
                        }
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
