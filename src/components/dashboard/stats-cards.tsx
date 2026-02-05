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
            <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Current Month Earnings
                    </CardTitle>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(commission.commissionEarned)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        From {formatCurrency(commission.totalRevenue)} revenue
                    </p>
                    {commission.breakdown.acceleratorMultiplier > 1 && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                            🚀 {commission.breakdown.tierApplied}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* % to Quota */}
            <Card className={`bg-gradient-to-br ${isOverQuota
                    ? "from-blue-500/10 via-transparent to-transparent border-blue-500/20"
                    : "from-amber-500/10 via-transparent to-transparent border-amber-500/20"
                }`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        % to Quota
                    </CardTitle>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isOverQuota ? "bg-blue-500/20" : "bg-amber-500/20"
                        }`}>
                        <Target className={`h-4 w-4 ${isOverQuota ? "text-blue-600" : "text-amber-600"}`} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${isOverQuota
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}>
                        {formatPercent(commission.attainmentPercent)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <AttainmentIcon className={`h-3 w-3 ${isOverQuota ? "text-blue-600" : "text-amber-600"
                            }`} />
                        <p className="text-xs text-muted-foreground">
                            Quota: {formatCurrency(commission.periodData.quota)}
                        </p>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isOverQuota ? "bg-blue-500" : "bg-amber-500"
                                }`}
                            style={{ width: `${Math.min(commission.attainmentPercent, 100)}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Pending Payouts */}
            <Card className="bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pending Payouts
                    </CardTitle>
                    <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-violet-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
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
