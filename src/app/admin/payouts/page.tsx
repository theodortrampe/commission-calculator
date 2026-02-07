import { getAllUserEarnings } from "./actions";
import { PayoutsClient } from "./payouts-client";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const initialData = await getAllUserEarnings(currentMonth);

    return (
        <PayoutsClient
            initialData={initialData}
            currentMonth={currentMonth}
        />
    );
}


