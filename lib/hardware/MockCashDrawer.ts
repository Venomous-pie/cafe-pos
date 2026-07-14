import type { CashDrawer } from "./CashDrawer";

/**
 * Mock cash drawer — logs the open event to the console.
 * Used in development and when HARDWARE_MODE=mock (the default).
 */
export class MockCashDrawer implements CashDrawer {
  async open() {
    await delay(50); // simulate tiny hardware latency
    console.log("[MockCashDrawer] 🗂  Drawer opened.");
    return { success: true };
  }

  async getStatus() {
    return "closed" as const; // mock always reports closed (no physical sensor)
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
