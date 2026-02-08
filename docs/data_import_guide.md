# Data Import Guide

## Overview
The Data Import tool (`/admin/data-import`) allows you to bring in:
1.  **Compensation Data**: Quotas, base salaries, OTEs for reps.
2.  **Order Data**: Sales transactions.

All imports can be done via **CSV/Excel File Upload** or **BigQuery Integration**.

---

## 1. CSV / Excel Upload

### Preparing Files
- **Format**: `.csv`, `.xlsx`, or `.xls`
- **Headers**: Case-insensitive, spaces are ignored (e.g., "Order Number", "order_number", "OrderNumber" all work).

### Compensation Columns
| Column | Required | Description |
|--------|----------|-------------|
| `email` | Yes | Rep's email address |
| `month` | Yes | Period start date (e.g., "2024-01-01") |
| `quota` | Yes | Quota amount |
| `baseSalary`| Yes | Monthly base salary |
| `ote` | Yes | On-Target Earnings |
| `name` | No | Rep's full name |
| `title` | No | Job title |

### Order Columns
| Column | Required | Description |
|--------|----------|-------------|
| `orderNumber` | Yes | Unique order ID |
| `userEmail` | Yes | Rep's email address |
| `convertedUsd`| Yes | formatted value in USD |
| `bookingDate` | Yes | Date of booking |
| `status` | No | Defaults to `APPROVED` if omitted |

---

## 2. BigQuery Integration

### How it Works
1.  You create a **Scheduled Query** in BigQuery to export data periodically.
2.  The query sends data to our **Webhook Endpoints**.

### Queries
Find the SQL templates in the "BigQuery Integration" tab of the import page.

### Endpoints
- **Compensation**: `PUT /api/ingest/bigquery`
- **Orders**: `PUT /api/ingest/bigquery/orders`

### Authentication
Currently, the endpoints are open but obscure. For production, we recommend adding an API key check in the headers.

---

## Troubleshooting
- **User Not Found**: Ensure the rep's email in the import matches a user in the system. The import will try to create users if they don't exist (for Compensation) or fail (for Orders).
- **Duplicate Orders**: Re-importing an existing `orderNumber` will **update** the existing record.
