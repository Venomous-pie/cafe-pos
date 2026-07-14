import { MockCashDrawer } from "./MockCashDrawer";
import { EscPosCashDrawer } from "./EscPosCashDrawer";
import { MockReceiptPrinter } from "./MockReceiptPrinter";
import { EscPosReceiptPrinter } from "./EscPosReceiptPrinter";

export type { CashDrawer } from "./CashDrawer";
export type { ReceiptPrinter, OrderWithTotals } from "./ReceiptPrinter";

// Set to 'real' via environment variable to use actual ESC/POS hardware.
const HARDWARE_MODE = process.env.HARDWARE_MODE || "mock";

let cashDrawerInstance: any = null;
let receiptPrinterInstance: any = null;

export function getCashDrawer() {
  if (!cashDrawerInstance) {
    cashDrawerInstance =
      HARDWARE_MODE === "real" ? new EscPosCashDrawer() : new MockCashDrawer();
  }
  return cashDrawerInstance;
}

export function getReceiptPrinter() {
  if (!receiptPrinterInstance) {
    receiptPrinterInstance =
      HARDWARE_MODE === "real" ? new EscPosReceiptPrinter() : new MockReceiptPrinter();
  }
  return receiptPrinterInstance;
}
