import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getRepPayouts } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const statusColors = {
    DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default async function RepPayoutsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const payouts = await getRepPayouts(session.user.id);

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Payouts</h1>
                    <p className="text-muted-foreground">
                        View your payout history and adjustments
                    </p>
                </div>
            </div>

            {/* Payouts List */}
            {payouts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Payouts Yet</h3>
                        <p className="text-muted-foreground">
                            Your payouts will appear here once they are generated.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {payouts.map((payout) => (
                        <Link key={payout.id} href={`/dashboard/payouts/${payout.id}`}>
                            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            {format(payout.periodStart, "MMMM yyyy")}
                                        </CardTitle>
                                        <Badge className={statusColors[payout.status]}>
                                            {payout.status === "DRAFT" ? "Pending" : "Finalized"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Gross Earnings</p>
                                                <p className="font-mono font-medium">
                                                    ${payout.grossEarnings.toLocaleString()}
                                                </p>
                                            </div>
                                            {payout.adjustments.length > 0 && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Adjustments</p>
                                                    <p className="font-mono font-medium">
                                                        {payout.adjustments.length} adjustment{payout.adjustments.length !== 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Final Payout</p>
                                            <p className="text-xl font-bold font-mono flex items-center gap-1">
                                                <DollarSign className="h-4 w-4" />
                                                {payout.finalPayout.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
