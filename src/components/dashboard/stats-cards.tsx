"use client";

import { DollarSign, Target, Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommissionResult } from "@/lib/utils/calculateCommissions";
import { formatCurrency } from "@/lib/utils/format";

interface StatsCardsProps {
    commission: CommissionResult;
    pendingPayoutsTotal: number;
    pendingPayoutsCount: number;
}



function formatPercent(percent: number): string {
    return `${percent.toFixed(1)}%`;
}

export function StatsCards({ commission, pendingPayoutsTotal, pendingPayoutsCount }: StatsCardsProps) {
    const isOverQuota = commission.attainmentPercent >= 100;
    const AttainmentIcon = isOverQuota ? TrendingUp : TrendingDown;
    const c = commission.periodData.currency;

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
                        {formatCurrency(commission.commissionEarned, c)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        From {formatCurrency(commission.totalRevenue, c)} revenue
                    </p>
                    {commission.breakdown.acceleratorMultiplier > 1 && (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {commission.breakdown.tierApplied}
                        </p>
                    )}
                    {(commission.ramp?.drawTopUp ?? 0) > 0 && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">
                            Includes {formatCurrency(commission.ramp!.drawTopUp, c)} draw top-up
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
                            Effective Quota: {formatCurrency(commission.periodData.quota, c)}
                        </p>
                    </div>
                    {/* Ramp/Proration indicators */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {commission.ramp?.isActive && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/20">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                Ramp
                            </Badge>
                        )}
                        {(commission.proration?.factor ?? 1) < 1 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-700 border-blue-500/20">
                                <Calendar className="h-2.5 w-2.5 mr-0.5" />
                                Prorated
                            </Badge>
                        )}
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
                        {formatCurrency(pendingPayoutsTotal, c)}
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
