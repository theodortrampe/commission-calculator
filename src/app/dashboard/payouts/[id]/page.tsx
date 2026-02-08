import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "../../../../../auth";
import { getRepPayoutById } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Plus, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

const statusColors = {
    DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const adjustmentTypeLabels = {
    REVENUE: "Revenue Adjustment",
    FIXED_BONUS: "Bonus",
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RepPayoutDetailPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const payout = await getRepPayoutById(session.user.id, id);

    if (!payout) {
        notFound();
    }

    const totalAdjustments = payout.adjustments.reduce((sum, adj) => sum + adj.amount, 0);

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/payouts"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {format(payout.periodStart, "MMMM yyyy")} Payout
                        </h1>
                        <Badge className={statusColors[payout.status]}>
                            {payout.status === "DRAFT" ? "Pending Review" : "Finalized"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Period: {format(payout.periodStart, "MMM d")} - {format(payout.periodEnd, "MMM d, yyyy")}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gross Earnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-mono">
                            ${payout.grossEarnings.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Adjustments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold font-mono ${totalAdjustments >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {totalAdjustments >= 0 ? "+" : ""}${totalAdjustments.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Final Payout
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-mono flex items-center gap-1">
                            <DollarSign className="h-5 w-5" />
                            {payout.finalPayout.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Adjustments Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Adjustments</CardTitle>
                </CardHeader>
                <CardContent>
                    {payout.adjustments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No adjustments for this payout period.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {payout.adjustments.map((adjustment) => (
                                <div
                                    key={adjustment.id}
                                    className="flex items-start justify-between p-4 rounded-lg border bg-muted/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-full ${adjustment.amount >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                                            {adjustment.amount >= 0 ? (
                                                <Plus className="h-4 w-4" />
                                            ) : (
                                                <Minus className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {adjustmentTypeLabels[adjustment.adjustmentType]}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {adjustment.reason}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {format(adjustment.createdAt, "MMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-mono font-bold ${adjustment.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {adjustment.amount >= 0 ? "+" : ""}${adjustment.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Status Info */}
            {payout.status === "DRAFT" && (
                <div className="mt-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Pending Review:</strong> This payout is still being reviewed by your admin.
                        You will receive a notification when it is finalized.
                    </p>
                </div>
            )}
        </div>
    );
}
