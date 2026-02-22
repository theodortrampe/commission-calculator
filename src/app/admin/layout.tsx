import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
    title: "Admin | Commission Calculator",
    description: "Manage payouts and commissions",
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // This is a backup check - middleware should handle this
    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard?error=unauthorized");
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Admin header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center">
                        <div className="flex items-center gap-2 font-semibold">
                            <span>Commission Admin</span>
                        </div>
                        <nav className="ml-8 flex items-center gap-4">
                            <Link
                                href="/admin/users"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Users
                            </Link>
                            <Link
                                href="/admin/payouts"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Payouts
                            </Link>
                            <Link
                                href="/admin/orders"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Orders
                            </Link>
                            <Link
                                href="/admin/plans"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Plans
                            </Link>
                            <Link
                                href="/admin/assignments"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Assignments
                            </Link>
                            <Link
                                href="/admin/data-import"
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Data Import
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {session.user.name} ({session.user.role})
                        </span>
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
            </header >
            <main>{children}</main>
        </div >
    );
}
