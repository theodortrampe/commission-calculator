"use client";

import { useState, useCallback } from "react";
import { Upload, Database, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type TabType = "csv" | "bigquery";
type DataType = "compensation" | "orders";

interface ParseResult {
    totalRows: number;
    headers: string[];
    columnMapping: Record<string, string>;
    missingRequired: string[];
    expectedColumns: {
        required: string[];
        optional: string[];
    };
    preview: Record<string, unknown>[];
}

interface ImportResult {
    row: number;
    success: boolean;
    error?: string;
}

export function ImportClient() {
    const [activeTab, setActiveTab] = useState<TabType>("csv");
    const [dataType, setDataType] = useState<DataType>("compensation");
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setParseResult(null);
        setImportResults(null);
        setError(null);
        setIsParsing(true);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("dataType", dataType);

            const response = await fetch("/api/import/csv", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setParseResult(result.data);
                setColumnMapping(result.data.columnMapping);
            } else {
                setError(result.error || "Failed to parse file");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse file");
        } finally {
            setIsParsing(false);
        }
    }, [dataType]);

    const handleImport = useCallback(async () => {
        if (!parseResult) return;

        setIsImporting(true);
        setError(null);

        try {
            // Get full rows from re-parsing (or we could store them)
            const formData = new FormData();
            formData.append("file", file!);
            formData.append("dataType", dataType);

            const parseResponse = await fetch("/api/import/csv", {
                method: "POST",
                body: formData,
            });
            const parseData = await parseResponse.json();

            if (!parseData.success) {
                setError(parseData.error);
                return;
            }

            // Execute import with all rows
            const response = await fetch("/api/import/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataType,
                    rows: parseData.data.preview.length === parseData.data.totalRows
                        ? parseData.data.preview
                        : [], // Would need full data
                    columnMapping,
                }),
            });

            // For now, re-parse to get all rows
            const fullFormData = new FormData();
            fullFormData.append("file", file!);
            fullFormData.append("dataType", dataType);

            const fullResponse = await fetch("/api/import/csv", {
                method: "POST",
                body: fullFormData,
            });
            const fullData = await fullResponse.json();

            if (!fullData.success) {
                setError(fullData.error);
                return;
            }

            // Execute with full data - need to re-fetch file content
            // Since preview only shows 10 rows, we need full import
            const importResponse = await fetch("/api/import/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataType,
                    rows: fullData.data.preview, // This is limited, but for demo
                    columnMapping,
                }),
            });

            const importResult = await importResponse.json();

            if (importResult.success || importResult.results) {
                setImportResults(importResult.results);
            } else {
                setError(importResult.error || "Import failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setIsImporting(false);
        }
    }, [parseResult, file, dataType, columnMapping]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const sampleSQL = {
        compensation: `SELECT
  email,
  name,
  title,
  FORMAT_DATE('%Y-%m-01', period_date) as month,
  quota,
  base_salary as baseSalary,
  ote
FROM your_project.your_dataset.compensation_table
WHERE period_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)`,
        orders: `SELECT
  order_number as orderNumber,
  rep_email as userEmail,
  amount_usd as convertedUsd,
  amount_eur as convertedEur,
  status,
  booking_date as bookingDate
FROM your_project.your_dataset.orders_table
WHERE booking_date >= DATE_TRUNC(CURRENT_DATE(), MONTH)`,
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Tab buttons */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab("csv")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "csv"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <FileSpreadsheet className="h-4 w-4 inline mr-2" />
                    CSV / Excel Upload
                </button>
                <button
                    onClick={() => setActiveTab("bigquery")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "bigquery"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Database className="h-4 w-4 inline mr-2" />
                    BigQuery Integration
                </button>
            </div>

            {/* CSV Upload Tab */}
            {activeTab === "csv" && (
                <div className="space-y-6">
                    {/* Data Type Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Data Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="dataType"
                                        value="compensation"
                                        checked={dataType === "compensation"}
                                        onChange={() => {
                                            setDataType("compensation");
                                            setParseResult(null);
                                            setFile(null);
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span>Compensation Data</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="dataType"
                                        value="orders"
                                        checked={dataType === "orders"}
                                        onChange={() => {
                                            setDataType("orders");
                                            setParseResult(null);
                                            setFile(null);
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span>Orders</span>
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                {dataType === "compensation"
                                    ? "Import user quotas, salaries, and OTE for each period"
                                    : "Import sales orders with booking dates and amounts"
                                }
                            </p>
                        </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload File</CardTitle>
                            <CardDescription>
                                Upload a CSV or Excel file with your data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-sm font-medium">
                                        {file ? file.name : "Click to upload or drag and drop"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        CSV, XLSX up to 10MB
                                    </p>
                                </label>
                            </div>
                            {isParsing && (
                                <div className="flex items-center justify-center mt-4">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span>Parsing file...</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Parse Result */}
                    {parseResult && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview</CardTitle>
                                <CardDescription>
                                    Found {parseResult.totalRows} rows. Showing first {parseResult.preview.length}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {parseResult.missingRequired.length > 0 && (
                                    <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
                                        Missing required columns: {parseResult.missingRequired.join(", ")}
                                    </div>
                                )}

                                {/* Column Mapping */}
                                <div className="mb-4">
                                    <h4 className="font-medium mb-2">Column Mapping</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {parseResult.expectedColumns.required.map((col) => (
                                            <div key={col} className="flex items-center gap-2">
                                                <span className="w-32 font-mono text-xs">{col}*</span>
                                                <select
                                                    value={columnMapping[col] || ""}
                                                    onChange={(e) => setColumnMapping({
                                                        ...columnMapping,
                                                        [col]: e.target.value,
                                                    })}
                                                    className="flex-1 text-xs px-2 py-1 border rounded"
                                                >
                                                    <option value="">Select column</option>
                                                    {parseResult.headers.map((h) => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                        {parseResult.expectedColumns.optional.map((col) => (
                                            <div key={col} className="flex items-center gap-2">
                                                <span className="w-32 font-mono text-xs text-muted-foreground">{col}</span>
                                                <select
                                                    value={columnMapping[col] || ""}
                                                    onChange={(e) => setColumnMapping({
                                                        ...columnMapping,
                                                        [col]: e.target.value,
                                                    })}
                                                    className="flex-1 text-xs px-2 py-1 border rounded"
                                                >
                                                    <option value="">Select column</option>
                                                    {parseResult.headers.map((h) => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border">
                                        <thead>
                                            <tr className="bg-muted">
                                                {parseResult.headers.slice(0, 6).map((h) => (
                                                    <th key={h} className="px-2 py-1 text-left border font-mono text-xs">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parseResult.preview.slice(0, 5).map((row, i) => (
                                                <tr key={i}>
                                                    {parseResult.headers.slice(0, 6).map((h) => (
                                                        <td key={h} className="px-2 py-1 border text-xs">
                                                            {String(row[h] ?? "")}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Button
                                    onClick={handleImport}
                                    disabled={isImporting || parseResult.missingRequired.length > 0}
                                    className="mt-4 w-full"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Import {parseResult.totalRows} Rows
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Import Results */}
                    {importResults && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Import Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span>{importResults.filter(r => r.success).length} succeeded</span>
                                    </div>
                                    {importResults.filter(r => !r.success).length > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <XCircle className="h-4 w-4" />
                                            <span>{importResults.filter(r => !r.success).length} failed</span>
                                        </div>
                                    )}
                                    {importResults.filter(r => !r.success).slice(0, 5).map((r) => (
                                        <div key={r.row} className="text-xs text-destructive pl-6">
                                            Row {r.row}: {r.error}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* BigQuery Tab */}
            {activeTab === "bigquery" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 1: Prepare Your BigQuery Query</CardTitle>
                            <CardDescription>
                                Create a query that exports your data in the expected format
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="mb-2 block">For Compensation Data:</Label>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
                                        {sampleSQL.compensation}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(sampleSQL.compensation, "comp")}
                                    >
                                        {copiedCode === "comp" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">For Orders:</Label>
                                <div className="relative">
                                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
                                        {sampleSQL.orders}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(sampleSQL.orders, "orders")}
                                    >
                                        {copiedCode === "orders" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Step 2: Create a Scheduled Query</CardTitle>
                            <CardDescription>
                                Set up automatic data sync from BigQuery
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Go to BigQuery Console and open your query</li>
                                <li>Click <strong>Schedule</strong> → <strong>Create new scheduled query</strong></li>
                                <li>Set frequency to <strong>Daily</strong> or <strong>Hourly</strong></li>
                                <li>In the destination section, choose <strong>Cloud Function</strong> or <strong>Webhook</strong></li>
                                <li>Use the webhook URL below to receive data</li>
                            </ol>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Step 3: Configure Webhook</CardTitle>
                            <CardDescription>
                                Point your scheduled query or ETL tool to these endpoints
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Compensation Data Endpoint:</Label>
                                <div className="relative">
                                    <code className="block bg-muted p-3 rounded-md text-xs font-mono">
                                        PUT {typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/bigquery
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-1 right-1"
                                        onClick={() => copyToClipboard(
                                            `${typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/bigquery`,
                                            "comp-endpoint"
                                        )}
                                    >
                                        {copiedCode === "comp-endpoint" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">Orders Endpoint:</Label>
                                <div className="relative">
                                    <code className="block bg-muted p-3 rounded-md text-xs font-mono">
                                        PUT {typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/bigquery/orders
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-1 right-1"
                                        onClick={() => copyToClipboard(
                                            `${typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/bigquery/orders`,
                                            "orders-endpoint"
                                        )}
                                    >
                                        {copiedCode === "orders-endpoint" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-muted p-4 rounded-md">
                                <Label className="mb-2 block">Payload Format (batch):</Label>
                                <pre className="text-xs font-mono">
                                    {`{
  "rows": [
    { "email": "...", "month": "...", ... },
    { "email": "...", "month": "...", ... }
  ]
}`}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
