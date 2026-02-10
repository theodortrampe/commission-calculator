
import { Suspense } from "react";
import { getCompPlans } from "./actions";
import { PlansClient } from "./plans-client";
import { Loader2 } from "lucide-react";

export default async function PlansPage() {
    const plans = await getCompPlans();

    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PlansClient plans={plans} />
        </Suspense>
    );
}
