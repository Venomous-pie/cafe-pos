import type { CashDrawer } from "./CashDrawer";

/**
 * Real ESC/POS cash drawer implementation.
 * Sends the `ESC p` pulse command via the receipt printer (RJ11 connection).
 */
export class EscPosCashDrawer implements CashDrawer {
  async open(): Promise<{ success: boolean; error?: string }> {
    throw new Error("Not implemented: Install node-escpos to send pulse command.");
  }

  async getStatus(): Promise<"closed" | "open" | "unknown"> {
    return "unknown" as const;
  }
}
