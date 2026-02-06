import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * POST /api/import/csv
 * 
 * Accepts a file upload (CSV or XLSX) and returns parsed rows as JSON preview
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const dataType = formData.get("dataType") as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file uploaded" },
                { status: 400 }
            );
        }

        if (!dataType || !["compensation", "orders"].includes(dataType)) {
            return NextResponse.json(
                { success: false, error: "dataType must be 'compensation' or 'orders'" },
                { status: 400 }
            );
        }

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Parse with xlsx
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "File is empty or has no data rows" },
                { status: 400 }
            );
        }

        // Get headers from first row keys
        const headers = Object.keys(rows[0]);

        // Expected columns for each data type
        const expectedColumns = {
            compensation: {
                required: ["email", "month", "quota", "baseSalary", "ote"],
                optional: ["name", "title", "role", "planId"],
            },
            orders: {
                required: ["orderNumber", "userEmail", "convertedUsd", "bookingDate"],
                optional: ["convertedEur", "status"],
            },
        };

        const expected = expectedColumns[dataType as keyof typeof expectedColumns];

        // Auto-detect column mapping (case-insensitive)
        const columnMapping: Record<string, string> = {};
        const allExpected = [...expected.required, ...expected.optional];

        for (const expectedCol of allExpected) {
            const found = headers.find(
                (h) => h.toLowerCase().replace(/[_\s]/g, "") === expectedCol.toLowerCase()
            );
            if (found) {
                columnMapping[expectedCol] = found;
            }
        }

        // Check for missing required columns
        const missingRequired = expected.required.filter((col) => !columnMapping[col]);

        // Return preview with first 10 rows
        const preview = rows.slice(0, 10);

        return NextResponse.json({
            success: true,
            data: {
                totalRows: rows.length,
                headers,
                columnMapping,
                missingRequired,
                expectedColumns: expected,
                preview,
            },
        });
    } catch (error) {
        console.error("CSV parse error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to parse file",
            },
            { status: 500 }
        );
    }
}
