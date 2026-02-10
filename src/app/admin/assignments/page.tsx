
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { getAssignments, getUsersAndPlans } from "./actions";
import { AssignmentsClient } from "./assignments-client";

export default async function AssignmentsPage() {
    const assignments = await getAssignments();
    const { users, plans } = await getUsersAndPlans();

    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AssignmentsClient assignments={assignments} users={users} plans={plans} />
        </Suspense>
    );
}
