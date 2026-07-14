import type { OrderTotals } from "../pricing";
import type { Order } from "@prisma/client";

// Combine the DB order model with the calculated totals for receipt generation.
export type OrderWithTotals = Omit<Order, "subtotal" | "tax" | "total"> & OrderTotals;

export interface ReceiptPrinter {
  /** Print a physical receipt for the given order. */
  printReceipt(order: OrderWithTotals): Promise<{ success: boolean; error?: string }>;
  /** Query the printer state (paper out, cover open, etc). */
  getStatus(): Promise<"ready" | "offline" | "out_of_paper" | "unknown">;
}
