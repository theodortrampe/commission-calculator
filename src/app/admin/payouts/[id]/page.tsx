import { notFound } from "next/navigation";
import { getPayoutById } from "../actions";
import { PayoutDetailClient } from "./payout-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PayoutDetailPage({ params }: PageProps) {
    const { id } = await params;
    const payout = await getPayoutById(id);

    if (!payout) {
        notFound();
    }

    return <PayoutDetailClient initialData={payout} />;
}
