"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Check, Send, DollarSign } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import {
    PayoutWithAdjustments,
    createAdjustment,
    updatePayoutStatus,
    getPayoutById,
} from "../actions";
import { PayoutStatus } from "@prisma/client";

interface PayoutDetailClientProps {
    initialData: PayoutWithAdjustments;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

const statusColors: Record<PayoutStatus, string> = {
    DRAFT: "bg-amber-500/15 text-amber-700 border-amber-500/20",
    PUBLISHED: "bg-blue-500/15 text-blue-700 border-blue-500/20",
    PAID: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
};

export function PayoutDetailClient({ initialData }: PayoutDetailClientProps) {
    const router = useRouter();
    const [payout, setPayout] = useState<PayoutWithAdjustments>(initialData);
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);

    // Form state
    const [adjustmentAmount, setAdjustmentAmount] = useState("");
    const [adjustmentReason, setAdjustmentReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const amount = parseFloat(adjustmentAmount);
        if (isNaN(amount) || amount === 0) {
            alert("Please enter a valid amount");
            setIsSubmitting(false);
            return;
        }

        const result = await createAdjustment(payout.id, amount, adjustmentReason);

        if (result.success) {
            // Refresh payout data
            const updated = await getPayoutById(payout.id);
            if (updated) {
                setPayout(updated);
            }
            setAdjustmentAmount("");
            setAdjustmentReason("");
            setDialogOpen(false);
        } else {
            alert(result.error || "Failed to create adjustment");
        }

        setIsSubmitting(false);
    };

    const handleStatusUpdate = async (newStatus: PayoutStatus) => {
        startTransition(async () => {
            const result = await updatePayoutStatus(payout.id, newStatus);
            if (result.success) {
                const updated = await getPayoutById(payout.id);
                if (updated) {
                    setPayout(updated);
                }
            } else {
                alert(result.error || "Failed to update status");
            }
        });
    };

    const totalAdjustments = payout.adjustments.reduce((sum, a) => sum + a.amount, 0);

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/payouts">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Payout Details</h1>
                    <p className="text-muted-foreground">
                        {payout.user.name} • {format(new Date(payout.periodStart), "MMMM yyyy")}
                    </p>
                </div>
                <Badge variant="outline" className={statusColors[payout.status]}>
                    {payout.status}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Gross Earnings */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gross Earnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatCurrency(payout.grossEarnings)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Before adjustments</p>
                    </CardContent>
                </Card>

                {/* Adjustments */}
                <Card className={totalAdjustments !== 0 ? (totalAdjustments > 0 ? "border-emerald-500/30" : "border-red-500/30") : ""}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Adjustments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${totalAdjustments > 0 ? "text-emerald-600" : totalAdjustments < 0 ? "text-red-600" : ""
                            }`}>
                            {totalAdjustments >= 0 ? "+" : ""}{formatCurrency(totalAdjustments)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {payout.adjustments.length} adjustment{payout.adjustments.length !== 1 ? "s" : ""}
                        </p>
                    </CardContent>
                </Card>

                {/* Final Payout */}
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Final Payout
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(payout.finalPayout)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Amount to pay</p>
                    </CardContent>
                </Card>
            </div>

            {/* Adjustments Section */}
            <div className="rounded-lg border p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Adjustments</h2>
                    {payout.status === "DRAFT" && (
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Adjustment
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleCreateAdjustment}>
                                    <DialogHeader>
                                        <DialogTitle>Create Adjustment</DialogTitle>
                                        <DialogDescription>
                                            Add a bonus or clawback to this payout. Use positive amounts for bonuses
                                            and negative amounts for clawbacks.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="amount">Amount (USD)</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="1000 or -500"
                                                    className="pl-9"
                                                    value={adjustmentAmount}
                                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Positive = Bonus, Negative = Clawback
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="reason">Reason</Label>
                                            <Textarea
                                                id="reason"
                                                placeholder="Enter the reason for this adjustment..."
                                                value={adjustmentReason}
                                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Adjustment"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {payout.adjustments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No adjustments have been made to this payout.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payout.adjustments.map((adjustment) => (
                                <TableRow key={adjustment.id}>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(adjustment.createdAt), "MMM d, yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell>{adjustment.reason}</TableCell>
                                    <TableCell
                                        className={`text-right font-mono font-medium ${adjustment.amount >= 0 ? "text-emerald-600" : "text-red-600"
                                            }`}
                                    >
                                        {adjustment.amount >= 0 ? "+" : ""}{formatCurrency(adjustment.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Status Actions */}
            <Separator className="my-8" />

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Payout Status</h3>
                    <p className="text-sm text-muted-foreground">
                        Update the status of this payout
                    </p>
                </div>
                <div className="flex gap-2">
                    {payout.status === "DRAFT" && (
                        <Button
                            variant="outline"
                            onClick={() => handleStatusUpdate("PUBLISHED")}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Publish
                        </Button>
                    )}
                    {payout.status === "PUBLISHED" && (
                        <Button
                            onClick={() => handleStatusUpdate("PAID")}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            Mark as Paid
                        </Button>
                    )}
                    {payout.status === "PAID" && (
                        <p className="text-emerald-600 flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            This payout has been completed
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
