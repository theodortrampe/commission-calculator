import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | Commission Calculator",
    description: "View your commission earnings and orders",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Simple header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center px-4">
                    <div className="flex items-center gap-2 font-semibold">
                        <span className="text-xl">💰</span>
                        <span>Commission Calculator</span>
                    </div>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
