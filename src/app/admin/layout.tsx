import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Admin | Commission Calculator",
    description: "Manage payouts and commissions",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Admin header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center px-4">
                    <div className="flex items-center gap-2 font-semibold">
                        <span>Commission Admin</span>
                    </div>
                    <nav className="ml-8 flex items-center gap-4">
                        <Link
                            href="/admin/payouts"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Payouts
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Settings
                        </Link>
                        <Link
                            href="/admin/data-import"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Data Import
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Back to Dashboard
                        </Link>
                    </nav>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
