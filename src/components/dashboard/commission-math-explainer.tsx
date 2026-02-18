"use client";

import { Info, TrendingUp, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CommissionResult } from "@/lib/utils/calculateCommissions";
import { formatCurrency } from "@/lib/utils/format";

interface CommissionMathExplainerProps {
    commission: CommissionResult;
}



function formatPercent(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
}

export function CommissionMathExplainer({ commission }: CommissionMathExplainerProps) {
    const c = commission.periodData.currency;
    const isRamped = commission.ramp?.isActive ?? false;
    const isProrated = (commission.proration?.factor ?? 1) < 1;
    const hasDrawTopUp = (commission.ramp?.drawTopUp ?? 0) > 0;

    // Calculate the base quota (pre-ramp, pre-proration)
    const originalQuota = commission.ramp?.originalQuota ?? commission.periodData.quota;
    const rampMultiplier = isRamped ? (commission.ramp!.rampedQuotaPreProration / originalQuota) : 1;
    const prorationFactor = commission.proration?.factor ?? 1;
    const effectiveQuota = commission.periodData.quota; // Already the final prorated+ramped quota

    // For the draw split bar
    const commissionEarned = commission.commissionEarned;
    const drawTopUp = commission.ramp?.drawTopUp ?? 0;
    const totalPayout = commissionEarned; // commissionEarned already includes drawTopUp
    const earnedWithoutDraw = totalPayout - drawTopUp;

    // Calculate bar widths
    const earnedPercent = totalPayout > 0 ? (earnedWithoutDraw / totalPayout) * 100 : 100;
    const drawPercent = totalPayout > 0 ? (drawTopUp / totalPayout) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Effective Quota Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Effective Quota
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {isRamped && (
                                <Badge
                                    variant="outline"
                                    className="bg-amber-500/15 text-amber-700 border-amber-500/20"
                                >
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Ramp Month {commission.ramp!.monthIndex}
                                </Badge>
                            )}
                            {isProrated && commission.proration && (
                                <Badge
                                    variant="outline"
                                    className="bg-blue-500/15 text-blue-700 border-blue-500/20"
                                >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {commission.proration.activeDays} of {commission.proration.totalDays} days
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono mb-3">
                        {formatCurrency(effectiveQuota, c)}
                    </div>

                    {/* Math Explainer Accordion */}
                    {(isRamped || isProrated) && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="math" className="border-none">
                                <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                                    <span className="flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        How was this calculated?
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="bg-muted/50 rounded-md p-3 font-mono text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground">Base Quota</span>
                                            <span className="font-semibold">{formatCurrency(originalQuota, c)}</span>

                                            {isRamped && (
                                                <>
                                                    <span className="text-muted-foreground">×</span>
                                                    <span className="text-amber-700 font-semibold">
                                                        Ramp ({formatPercent(rampMultiplier)})
                                                    </span>
                                                </>
                                            )}

                                            {isProrated && (
                                                <>
                                                    <span className="text-muted-foreground">×</span>
                                                    <span className="text-blue-700 font-semibold">
                                                        Proration ({prorationFactor.toFixed(2)})
                                                    </span>
                                                </>
                                            )}

                                            <span className="text-muted-foreground">=</span>
                                            <span className="font-bold">{formatCurrency(effectiveQuota, c)}</span>
                                        </div>

                                        {/* Details breakdown */}
                                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            {isRamped && (
                                                <p>
                                                    Ramp reduces your quota to {formatPercent(rampMultiplier)} during month {commission.ramp!.monthIndex} of your onboarding.
                                                </p>
                                            )}
                                            {isProrated && commission.proration && (
                                                <p>
                                                    Proration: {commission.proration.activeDays} active days out of {commission.proration.totalDays} total days in the period.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                    {/* Non-ramped, non-prorated: simple quota display */}
                    {!isRamped && !isProrated && (
                        <p className="text-xs text-muted-foreground">
                            Full quota with no ramp or proration adjustments.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Compensation Details */}
            <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="p-3 rounded-md bg-background border">
                    <p className="text-muted-foreground text-xs">Effective Commission Rate</p>
                    <p className="font-mono font-medium text-lg">
                        {(commission.periodData.effectiveRate * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">(OTE - Base) ÷ Quota</p>
                </div>
                <div className="p-3 rounded-md bg-background border">
                    <p className="text-muted-foreground text-xs">Plan</p>
                    <p className="font-medium">
                        {commission.periodData.planName ?? "Standard"}
                    </p>
                </div>
                <div className="p-3 rounded-md bg-background border">
                    <p className="text-muted-foreground text-xs">OTE (Effective)</p>
                    <p className="font-mono font-medium text-lg">
                        {formatCurrency(commission.periodData.ote, c)}
                    </p>
                    {(isRamped || isProrated) && (
                        <p className="text-xs text-muted-foreground mt-1">Adjusted for ramp/proration</p>
                    )}
                </div>
            </div>

            {/* Earnings Breakdown with Draw Split */}
            {hasDrawTopUp && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Earnings Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Draw Split Bar */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                <span>Total Payout: {formatCurrency(totalPayout, c)}</span>
                            </div>
                            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${earnedPercent}%` }}
                                    title={`Commission Earned: ${formatCurrency(earnedWithoutDraw, c)}`}
                                />
                                <div
                                    className="h-full bg-amber-400 transition-all"
                                    style={{ width: `${drawPercent}%` }}
                                    title={`Draw Top-Up: ${formatCurrency(drawTopUp, c)}`}
                                />
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-muted-foreground">Commission Earned</span>
                                    <span className="font-mono font-medium">{formatCurrency(earnedWithoutDraw, c)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                    <span className="text-muted-foreground">Draw Top-Up</span>
                                    <span className="font-mono font-medium">{formatCurrency(drawTopUp, c)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Guaranteed Draw Amount */}
                        <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm">
                            <p className="text-amber-700 font-medium text-xs">Guaranteed Draw Active</p>
                            <p className="text-sm mt-1">
                                Your guaranteed minimum is {formatCurrency(commission.ramp?.guaranteedDrawAmount ?? 0, c)}.
                                Since your earned commission ({formatCurrency(earnedWithoutDraw, c)}) is below this,
                                a {formatCurrency(drawTopUp, c)} draw top-up has been applied.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ramp Alert: Accelerators & Kickers disabled */}
            {isRamped && (
                <Alert className="border-amber-500/20 bg-amber-500/5">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-700">
                        <strong>Ramp Period Active</strong> — Accelerators &amp; Kickers are disabled during Ramp periods.
                        Your quota multiplier will increase as you progress through onboarding.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
