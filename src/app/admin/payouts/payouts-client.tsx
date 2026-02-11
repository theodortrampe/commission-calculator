"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Loader2, Plus, AlertCircle, Download, FileCheck, Send, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MonthPicker } from "@/components/ui/month-picker";
import {
    UserEarningsSummary,
    getAllUserEarnings,
    generateBulkPayouts,
    publishBulkPayouts,
} from "./actions";
import { AdjustmentDialog } from "./adjustment-dialog";
import { AuditLogSheet } from "./audit-log-sheet";

interface PayoutsClientProps {
    initialData: UserEarningsSummary[];
    currentMonth: Date;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function PayoutsClient({ initialData, currentMonth }: PayoutsClientProps) {
    const [data, setData] = useState<UserEarningsSummary[]>(initialData);
    const [selectedMonth, setSelectedMonth] = useState<Date>(currentMonth);
    const [isPending, startTransition] = useTransition();

    // Bulk action states
    const [isDraftingAll, setIsDraftingAll] = useState(false);
    const [isPublishingAll, setIsPublishingAll] = useState(false);

    // Adjustment dialog state
    const [adjustmentDialog, setAdjustmentDialog] = useState<{
        open: boolean;
        userId: string;
        userName: string;
    }>({ open: false, userId: "", userName: "" });

    // Audit sheet state
    const [auditSheet, setAuditSheet] = useState<{
        open: boolean;
        item: UserEarningsSummary | null;
    }>({ open: false, item: null });

    const refreshData = async () => {
        const newData = await getAllUserEarnings(selectedMonth);
        setData(newData);
    };

    const handleMonthChange = (month: Date) => {
        setSelectedMonth(month);
        startTransition(async () => {
            const newData = await getAllUserEarnings(month);
            setData(newData);
        });
    };

    const handleDraftAll = async () => {
        setIsDraftingAll(true);
        const result = await generateBulkPayouts(selectedMonth);

        if (result.success) {
            await refreshData();
            if (result.errors.length > 0) {
                alert(`Generated ${result.generated} payouts with ${result.errors.length} errors:\n${result.errors.join("\n")}`);
            }
        } else {
            alert(result.errors.join("\n") || "Failed to generate payouts");
        }
        setIsDraftingAll(false);
    };

    const handlePublishAll = async () => {
        setIsPublishingAll(true);
        const result = await publishBulkPayouts(selectedMonth);

        if (result.success) {
            await refreshData();
        } else {
            alert(result.error || "Failed to publish payouts");
        }
        setIsPublishingAll(false);
    };

    const handleExportCSV = () => {
        const headers = [
            "Rep Name",
            "OTE",
            "Quota",
            "Revenue",
            "Adjusted Revenue",
            "Attainment",
            "Earnings",
            "Adjusted Earnings",
            "Status",
        ];

        const rows = data.map((item) => {
            const commission = item.commission;
            const ote = commission?.periodData.ote || 0;
            const quota = commission?.periodData.quota || 0;
            const revenue = commission ? commission.totalRevenue - item.revenueAdjustmentTotal : 0;
            const adjustedRevenue = commission?.totalRevenue || 0;
            const attainment = commission?.attainmentPercent || 0;
            const earnings = commission?.commissionEarned || 0;
            const adjustedEarnings = earnings + item.fixedBonusTotal;
            const status = item.existingPayout?.status || "NO_PAYOUT";

            return [
                item.user.name,
                ote.toFixed(2),
                quota.toFixed(2),
                revenue.toFixed(2),
                adjustedRevenue.toFixed(2),
                attainment.toFixed(1) + "%",
                earnings.toFixed(2),
                adjustedEarnings.toFixed(2),
                status,
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payouts-${format(selectedMonth, "yyyy-MM")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Calculate summary stats
    const draftCount = data.filter((d) => d.existingPayout?.status === "DRAFT").length;
    const publishedCount = data.filter((d) => d.existingPayout?.status === "PUBLISHED").length;
    const noPayoutCount = data.filter((d) => !d.existingPayout).length;

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payouts Management</h1>
                    <p className="text-muted-foreground">
                        Generate and manage payouts for {format(selectedMonth, "MMMM yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
                <Button
                    onClick={handleDraftAll}
                    disabled={isDraftingAll || isPublishingAll || noPayoutCount === 0}
                >
                    {isDraftingAll ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Drafting...
                        </>
                    ) : (
                        <>
                            <FileCheck className="h-4 w-4 mr-2" />
                            Draft All Payouts ({noPayoutCount})
                        </>
                    )}
                </Button>
                <Button
                    variant="secondary"
                    onClick={handlePublishAll}
                    disabled={isDraftingAll || isPublishingAll || draftCount === 0}
                >
                    {isPublishingAll ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4 mr-2" />
                            Publish All ({draftCount})
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={data.length === 0}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Users Earnings Table */}
            <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
                <div className="rounded-lg border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sales Rep</TableHead>
                                <TableHead className="text-center">Type</TableHead>
                                <TableHead className="text-right">Draw</TableHead>
                                <TableHead className="text-right">Var. Bonus</TableHead>
                                <TableHead className="text-right">Quota</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Adj. Revenue</TableHead>
                                <TableHead className="text-right">Attainment</TableHead>
                                <TableHead className="text-right">Earnings</TableHead>
                                <TableHead className="text-right">Adj. Earnings</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                                        No sales reps found. Run the seed script to create test data.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => {
                                    const commission = item.commission;
                                    const ote = commission?.periodData.ote || 0;
                                    const baseSalary = commission?.periodData.baseSalary || 0;
                                    const variableBonus = ote - baseSalary;
                                    const quota = commission?.periodData.quota || 0;
                                    // Revenue is adjusted revenue minus the adjustment
                                    const adjustedRevenue = commission?.totalRevenue || 0;
                                    const baseRevenue = adjustedRevenue - item.revenueAdjustmentTotal;
                                    const attainment = commission?.attainmentPercent || 0;
                                    const earnings = commission?.commissionEarned || 0;
                                    const adjustedEarnings = earnings + item.fixedBonusTotal;


                                    const isRampActive = commission?.ramp?.isActive ?? false;
                                    const isProrated = (commission?.proration?.factor ?? 1) < 1;
                                    const drawTopUp = commission?.ramp?.drawTopUp ?? 0;

                                    return (
                                        <TableRow
                                            key={item.user.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setAuditSheet({ open: true, item })}
                                        >
                                            <TableCell className="font-medium">{item.user.name}</TableCell>
                                            {/* Type Column */}
                                            <TableCell className="text-center">
                                                {isRampActive ? (
                                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                                                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                                        Ramp
                                                    </Badge>
                                                ) : isProrated ? (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/20">
                                                        <Calendar className="h-2.5 w-2.5 mr-0.5" />
                                                        Prorated
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                                        Standard
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            {/* Draw Column */}
                                            <TableCell className="text-right font-mono text-sm">
                                                {drawTopUp > 0 ? (
                                                    <span className="text-amber-600 font-medium">
                                                        {formatCurrency(drawTopUp)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(variableBonus)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(quota)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(baseRevenue)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={item.revenueAdjustmentTotal !== 0 ? "text-purple-600 font-medium" : ""}>
                                                    {formatCurrency(adjustedRevenue)}
                                                </span>
                                                {item.revenueAdjustmentTotal > 0 && (
                                                    <span className="text-xs text-purple-500 ml-1">
                                                        (+{formatCurrency(item.revenueAdjustmentTotal)})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className={
                                                        attainment >= 100
                                                            ? "text-emerald-600 font-medium"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {attainment.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(earnings)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                <span className={item.fixedBonusTotal !== 0 ? "text-green-600" : ""}>
                                                    {formatCurrency(adjustedEarnings)}
                                                </span>
                                                {item.fixedBonusTotal > 0 && (
                                                    <span className="text-xs text-green-500 ml-1">
                                                        (+{formatCurrency(item.fixedBonusTotal)})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.existingPayout ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            item.existingPayout.status === "DRAFT"
                                                                ? "bg-amber-500/15 text-amber-700 border-amber-500/20"
                                                                : "bg-emerald-500/15 text-emerald-700 border-emerald-500/20"
                                                        }
                                                    >
                                                        {item.existingPayout.status}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        No Payout
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.error ? (
                                                    <div className="flex items-center justify-center gap-1 text-red-500 text-sm">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span>Error</span>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAdjustmentDialog({
                                                            open: true,
                                                            userId: item.user.id,
                                                            userName: item.user.name,
                                                        })}
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Adjust
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Summary */}
                {data.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Reps</p>
                                <p className="text-2xl font-bold">{data.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">No Payout</p>
                                <p className="text-2xl font-bold text-muted-foreground">{noPayoutCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Draft</p>
                                <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Published</p>
                                <p className="text-2xl font-bold text-emerald-600">{publishedCount}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Adjustments Table */}
                {data.some(d => d.adjustments.length > 0) && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">Adjustments</h2>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Person</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Net Impact on Payout</TableHead>
                                        <TableHead>Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.flatMap((item) =>
                                        item.adjustments.map((adj) => {
                                            // For REVENUE: net impact is the commission delta
                                            // For FIXED_BONUS: net impact is the amount directly
                                            const isRevenue = adj.adjustmentType === "REVENUE";
                                            const netImpact = isRevenue
                                                ? item.revenueAdjustmentImpact
                                                : adj.amount;

                                            return (
                                                <TableRow key={adj.id}>
                                                    <TableCell className="font-medium">
                                                        {item.user.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                isRevenue
                                                                    ? "bg-purple-500/15 text-purple-700 border-purple-500/20"
                                                                    : "bg-green-500/15 text-green-700 border-green-500/20"
                                                            }
                                                        >
                                                            {isRevenue ? "Revenue" : "Fixed Bonus"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {formatCurrency(adj.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium">
                                                        <span className={netImpact >= 0 ? "text-emerald-600" : "text-red-600"}>
                                                            {netImpact >= 0 ? "+" : ""}{formatCurrency(netImpact)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground max-w-xs truncate">
                                                        {adj.reason}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjustment Dialog */}
            <AdjustmentDialog
                open={adjustmentDialog.open}
                onOpenChange={(open) => setAdjustmentDialog({ ...adjustmentDialog, open })}
                userId={adjustmentDialog.userId}
                userName={adjustmentDialog.userName}
                month={selectedMonth}
                onSuccess={refreshData}
            />

            {/* Audit Log Sheet */}
            <AuditLogSheet
                item={auditSheet.item}
                open={auditSheet.open}
                onOpenChange={(open) => setAuditSheet({ ...auditSheet, open })}
            />
        </div>
    );
}
