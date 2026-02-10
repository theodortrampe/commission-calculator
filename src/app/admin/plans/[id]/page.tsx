
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";

import { getCompPlan } from "../actions";
import { PlanDetailsClient } from "./plan-details-client";

export default async function PlanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch plan details
    const plan = await getCompPlan(id);

    if (!plan) {
        notFound();
    }

    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PlanDetailsClient plan={plan} />
        </Suspense>
    );
}
