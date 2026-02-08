import { redirect } from "next/navigation";

import { auth, signOut } from "../../../auth";
import { prisma } from "@/lib/prisma";
import { getDashboardData, getAvailableMonths } from "./actions";
import { DashboardClient } from "./dashboard-client";

// Force dynamic rendering to avoid database calls during build
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Get authenticated user
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Fetch full user from database
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        redirect("/login");
    }

    // Admins should use the admin panel, not the rep dashboard
    if (user.role === "ADMIN") {
        redirect("/admin/payouts");
    }

    // Get current month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch initial data
    let dashboardData;
    try {
        dashboardData = await getDashboardData({
            userId: user.id,
            month: currentMonth,
        });
    } catch (_error) {
        // Handle case where no period data exists
        return (
            <div className="container mx-auto py-10 px-4">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <h1 className="text-2xl font-bold mb-2">No Data Available</h1>
                    <p className="text-muted-foreground mb-4">
                        No commission data found for the current month.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Please run <code className="bg-muted px-2 py-1 rounded">npx prisma db seed</code> to populate test data.
                    </p>
                </div>
            </div>
        );
    }

    // Get available months for date picker
    const availableMonths = await getAvailableMonths(user.id);

    return (
        <div className="container mx-auto py-10 px-4">
            {/* User info banner */}
            <div className="mb-6 p-4 rounded-lg bg-muted/50 border flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-sm text-muted-foreground">Logged in as</p>
                        <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Role</p>
                        <p className="font-medium">{user.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: "/login" });
                        }}
                    >
                        <button
                            type="submit"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </div>

            <DashboardClient
                initialData={dashboardData}
                userId={user.id}
                availableMonths={availableMonths}
                currentMonth={currentMonth}
            />
        </div>
    );
}
