import { redirect } from "next/navigation";
import { getDashboardData, getAvailableMonths, getCurrentDemoUser } from "./actions";
import { DashboardClient } from "./dashboard-client";

// Force dynamic rendering to avoid database calls during build
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Get demo user (in production, this would use authentication)
    const user = await getCurrentDemoUser();

    if (!user) {
        redirect("/");
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
    } catch (error) {
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
                <div>
                    <p className="text-sm text-muted-foreground">Logged in as</p>
                    <p className="font-medium">{user.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{user.role}</p>
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
