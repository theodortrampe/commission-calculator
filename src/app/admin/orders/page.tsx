import { getAllOrders, getAllReps, getOrderMonths } from "./actions";
import { OrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
    const [orders, reps, months] = await Promise.all([
        getAllOrders(),
        getAllReps(),
        getOrderMonths(),
    ]);

    return (
        <div className="container mx-auto py-10 px-4">
            <OrdersClient
                initialOrders={orders}
                reps={reps}
                months={months}
            />
        </div>
    );
}
