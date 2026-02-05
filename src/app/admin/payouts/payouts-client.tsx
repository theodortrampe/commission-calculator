"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Loader2, Plus, AlertCircle, Download } from "lucide-react";

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
import { UserEarningsSummary, generatePayout, getAllUserEarnings } from "./actions";
import Link from "next/link";

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
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);

    const handleMonthChange = (month: Date) => {
        setSelectedMonth(month);
        startTransition(async () => {
            const newData = await getAllUserEarnings(month);
            setData(newData);
        });
    };

    const handleGeneratePayout = async (userId: string) => {
        setGeneratingFor(userId);
        const result = await generatePayout(userId, selectedMonth);

        if (result.success) {
            // Refresh data
            const newData = await getAllUserEarnings(selectedMonth);
            setData(newData);
        } else {
            alert(result.error || "Failed to generate payout");
        }
        setGeneratingFor(null);
    };

    const handleExportCSV = () => {
        // CSV Header
        const headers = [
            "Rep Name",
            "Month",
            "Quota",
            "Total Revenue",
            "Commission Earned",
            "Adjustments",
            "Final Payout",
        ];

        // CSV Rows
        const rows = data.map((item) => {
            const payout = item.existingPayout;
            const commission = item.commission;
            const quota = commission?.periodData.quota || 0;
            const totalRevenue = commission?.totalRevenue || 0;
            const commissionEarned = commission?.commissionEarned || 0;

            // For adjustments and final payout, we need the payout data
            const adjustments = payout
                ? payout.finalPayout - payout.grossEarnings
                : 0;
            const finalPayout = payout?.finalPayout || commissionEarned;

            return [
                item.user.name,
                format(selectedMonth, "yyyy-MM"),
                quota.toFixed(2),
                totalRevenue.toFixed(2),
                commissionEarned.toFixed(2),
                adjustments.toFixed(2),
                finalPayout.toFixed(2),
            ];
        });

        // Build CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
        ].join("\n");

        // Create and download file
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
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={data.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export to CSV
                    </Button>
                    <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
                </div>
            </div>

            {/* Users Earnings Table */}
            <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sales Rep</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Attainment</TableHead>
                                <TableHead className="text-right">Earnings</TableHead>
                                <TableHead className="text-center">Payout Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No sales reps found. Run the seed script to create test data.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.user.id}>
                                        <TableCell className="font-medium">{item.user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.user.email}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {item.commission
                                                ? formatCurrency(item.commission.totalRevenue)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.commission ? (
                                                <span
                                                    className={
                                                        item.commission.attainmentPercent >= 100
                                                            ? "text-emerald-600 font-medium"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {item.commission.attainmentPercent.toFixed(1)}%
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            {item.commission
                                                ? formatCurrency(item.commission.commissionEarned)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.existingPayout ? (
                                                <Link href={`/admin/payouts/${item.existingPayout.id}`}>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            item.existingPayout.status === "DRAFT"
                                                                ? "bg-amber-500/15 text-amber-700 border-amber-500/20 cursor-pointer hover:bg-amber-500/25"
                                                                : item.existingPayout.status === "PUBLISHED"
                                                                    ? "bg-blue-500/15 text-blue-700 border-blue-500/20 cursor-pointer hover:bg-blue-500/25"
                                                                    : "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/25"
                                                        }
                                                    >
                                                        {item.existingPayout.status}
                                                    </Badge>
                                                </Link>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    No Payout
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.error ? (
                                                <div className="flex items-center justify-end gap-1 text-red-500 text-sm">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>Error</span>
                                                </div>
                                            ) : item.existingPayout ? (
                                                <Link href={`/admin/payouts/${item.existingPayout.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleGeneratePayout(item.user.id)}
                                                    disabled={generatingFor === item.user.id || !item.commission}
                                                >
                                                    {generatingFor === item.user.id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            Generate Payout
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Summary */}
                {data.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Reps</p>
                                <p className="text-2xl font-bold">{data.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Payouts Generated</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {data.filter((d) => d.existingPayout).length}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Earnings</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(
                                        data.reduce((sum, d) => sum + (d.commission?.commissionEarned || 0), 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
