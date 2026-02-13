"use client";

import { format } from "date-fns";
import { X, Calculator, Calendar, TrendingUp, ArrowRight } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserEarningsSummary } from "./actions";

interface AuditLogSheetProps {
    item: UserEarningsSummary | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function AuditRow({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className={`text-sm ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
            <span className={`text-sm font-mono ${highlight ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {value}
            </span>
        </div>
    );
}

export function AuditLogSheet({ item, open, onOpenChange }: AuditLogSheetProps) {
    if (!item?.commission) return null;

    const commission = item.commission;
    const isRamped = commission.ramp?.isActive ?? false;
    const isProrated = (commission.proration?.factor ?? 1) < 1;
    const hasDrawTopUp = (commission.ramp?.drawTopUp ?? 0) > 0;

    // Original quota from ramp data or the final quota
    const originalQuota = commission.ramp?.originalQuota ?? commission.periodData.quota;
    const rampMultiplier = isRamped ? commission.ramp!.rampedQuotaPreProration / originalQuota : 1;
    const prorationFactor = commission.proration?.factor ?? 1;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Audit: {item.user.name}
                    </SheetTitle>
                    <SheetDescription>
                        Full calculation breakdown for this payout period.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                        {isRamped && (
                            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20" variant="outline">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Ramp Month {commission.ramp!.monthIndex}
                            </Badge>
                        )}
                        {isProrated && (
                            <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20" variant="outline">
                                <Calendar className="h-3 w-3 mr-1" />
                                Prorated ({commission.proration!.activeDays}/{commission.proration!.totalDays} days)
                            </Badge>
                        )}
                        {!isRamped && !isProrated && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20" variant="outline">
                                Standard
                            </Badge>
                        )}
                    </div>

                    {/* 1. Quota Calculation */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Quota Calculation
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            <AuditRow label="Base Quota" value={formatCurrency(originalQuota)} />
                            {isRamped && (
                                <>
                                    <AuditRow
                                        label={`Ramp Step (Month ${commission.ramp!.monthIndex})`}
                                        value={`× ${(rampMultiplier * 100).toFixed(0)}%`}
                                    />
                                    <AuditRow
                                        label="Ramped Quota"
                                        value={formatCurrency(commission.ramp!.rampedQuotaPreProration)}
                                    />
                                </>
                            )}
                            {isProrated && commission.proration && (
                                <AuditRow
                                    label={`Proration (${commission.proration.activeDays}/${commission.proration.totalDays} days)`}
                                    value={`× ${prorationFactor.toFixed(4)}`}
                                />
                            )}
                            <Separator className="my-1" />
                            <AuditRow
                                label="Effective Quota"
                                value={formatCurrency(commission.periodData.quota)}
                                highlight
                            />
                        </div>
                    </div>

                    {/* 2. Revenue */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Revenue
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            <AuditRow label="Total Revenue" value={formatCurrency(commission.totalRevenue)} />
                            <AuditRow label="Attainment" value={`${commission.attainmentPercent.toFixed(1)}%`} highlight />
                        </div>
                    </div>

                    {/* 3. Commission Calculation */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Commission Calculation
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            <AuditRow
                                label="Base Revenue (up to quota)"
                                value={formatCurrency(commission.breakdown.baseRevenue)}
                            />
                            <AuditRow
                                label={`× Rate (${(commission.periodData.effectiveRate * 100).toFixed(2)}%)`}
                                value=""
                                muted
                            />
                            <AuditRow
                                label="Base Commission"
                                value={formatCurrency(commission.breakdown.baseCommission)}
                            />

                            {commission.breakdown.overageRevenue > 0 && (
                                <>
                                    <Separator className="my-1" />
                                    <AuditRow
                                        label="Overage Revenue"
                                        value={formatCurrency(commission.breakdown.overageRevenue)}
                                    />
                                    <AuditRow
                                        label={`× Rate × ${commission.breakdown.acceleratorMultiplier}x accel`}
                                        value=""
                                        muted
                                    />
                                    <AuditRow
                                        label="Overage Commission"
                                        value={formatCurrency(commission.breakdown.overageCommission)}
                                    />
                                    <AuditRow
                                        label="Tier Applied"
                                        value={commission.breakdown.tierApplied}
                                        muted
                                    />
                                </>
                            )}

                            {commission.breakdown.kickerAmount > 0 && (
                                <>
                                    <Separator className="my-1" />
                                    <AuditRow
                                        label="Kicker Bonus"
                                        value={formatCurrency(commission.breakdown.kickerAmount)}
                                    />
                                    <AuditRow
                                        label="Kickers Applied"
                                        value={commission.breakdown.kickersApplied.join(", ")}
                                        muted
                                    />
                                </>
                            )}

                            <Separator className="my-1" />
                            <AuditRow
                                label="Subtotal Commission"
                                value={formatCurrency(
                                    commission.breakdown.baseCommission +
                                    commission.breakdown.overageCommission +
                                    commission.breakdown.kickerAmount
                                )}
                                highlight
                            />
                        </div>
                    </div>

                    {/* 4. Draw Logic (if applicable) */}
                    {isRamped && (commission.ramp?.guaranteedDrawAmount ?? 0) > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Guaranteed Draw
                            </h4>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1">
                                <AuditRow
                                    label="Guaranteed Draw (prorated)"
                                    value={formatCurrency(commission.ramp!.guaranteedDrawAmount)}
                                />
                                {hasDrawTopUp && (
                                    <>
                                        <AuditRow
                                            label="Draw Top-Up Applied"
                                            value={`+ ${formatCurrency(commission.ramp!.drawTopUp)}`}
                                        />
                                    </>
                                )}
                                {!hasDrawTopUp && (
                                    <p className="text-xs text-muted-foreground">
                                        Commission exceeded guarantee — no top-up needed.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 5. Final Payout */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Final Payout
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            <AuditRow
                                label="Total Commission"
                                value={formatCurrency(commission.commissionEarned)}
                                highlight
                            />
                            {item.fixedBonusTotal !== 0 && (
                                <AuditRow
                                    label="Fixed Bonus Adjustments"
                                    value={`+ ${formatCurrency(item.fixedBonusTotal)}`}
                                />
                            )}
                            {item.fixedBonusTotal !== 0 && (
                                <>
                                    <Separator className="my-1" />
                                    <AuditRow
                                        label="Adjusted Payout"
                                        value={formatCurrency(commission.commissionEarned + item.fixedBonusTotal)}
                                        highlight
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* 6. Plan Info */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Plan Details
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                            <AuditRow label="Plan" value={commission.periodData.planName ?? "Standard"} />
                            <AuditRow label="Effective Rate" value={`${(commission.periodData.effectiveRate * 100).toFixed(2)}%`} />
                            <AuditRow label="OTE (Effective)" value={formatCurrency(commission.periodData.ote)} />
                            <AuditRow label="Base Salary" value={formatCurrency(commission.periodData.baseSalary)} />
                            {isRamped && (
                                <AuditRow
                                    label="Ramp Step"
                                    value={`${commission.periodData.planName ?? "Plan"}, Month ${commission.ramp!.monthIndex}`}
                                    muted
                                />
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
