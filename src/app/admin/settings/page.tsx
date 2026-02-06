import { redirect } from "next/navigation";
import { getCompPlanSettings } from "./actions";
import { SettingsClient } from "./settings-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const settings = await getCompPlanSettings();

    if (!settings) {
        return (
            <div className="container mx-auto py-10 px-4">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <h1 className="text-2xl font-bold mb-2">No Compensation Plan Found</h1>
                    <p className="text-muted-foreground mb-4">
                        Please run the database seed to create a compensation plan.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        <code className="bg-muted px-2 py-1 rounded">npx prisma db seed</code>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Commission Settings</h1>
                <p className="text-muted-foreground">
                    Configure commission rates and accelerator tiers for {settings.name}
                </p>
            </div>
            <SettingsClient settings={settings} />
        </div>
    );
}
