import { ImportClient } from "./import-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function DataImportPage() {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
                <p className="text-muted-foreground">
                    Import compensation data and orders via BigQuery or CSV/Excel upload
                </p>
            </div>
            <ImportClient />
        </div>
    );
}
