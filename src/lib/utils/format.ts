/**
 * Shared currency formatting utility.
 * Use this instead of local formatCurrency functions.
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
