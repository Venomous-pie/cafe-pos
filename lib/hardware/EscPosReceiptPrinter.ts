import type { ReceiptPrinter, OrderWithTotals } from "./ReceiptPrinter";

/**
 * Real ESC/POS receipt printer implementation.
 */
export class EscPosReceiptPrinter implements ReceiptPrinter {
  async printReceipt(_order: OrderWithTotals): Promise<{ success: boolean; error?: string }> {
    throw new Error("Not implemented: Install node-escpos to print receipts.");
  }

  async getStatus(): Promise<"ready" | "offline" | "out_of_paper" | "unknown"> {
    return "unknown" as const;
  }
}
