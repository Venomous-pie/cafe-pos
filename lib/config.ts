/**
 * Server-side store configuration.
 * Values come from environment variables; sensible placeholders are used as
 * fallbacks so the app starts without any .env.local configuration.
 *
 * Set these in .env.local (never commit real values to source control):
 *   STORE_NAME=My Cafe
 *   STORE_ADDRESS=123 Coffee Lane, Brew City
 *   STORE_TIN=123-456-789-000
 *   CASHIER_NAME=Jane Doe
 */
export const storeConfig = {
  storeName: process.env.STORE_NAME ?? "Cafe POS",
  storeAddress: process.env.STORE_ADDRESS ?? "123 Coffee Lane, Brew City",
  storeTin: process.env.STORE_TIN ?? "000-000-000-000",
  cashierName: process.env.CASHIER_NAME ?? "Cashier",
} as const;
