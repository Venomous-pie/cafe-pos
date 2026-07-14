import type { PaymentProvider } from "./PaymentProvider";

/**
 * GCash stub — simulates a successful QR payment after a short delay.
 * Replace the body of `initiate` with the real GCash API SDK call when available.
 * The interface contract (params, return shape) stays the same.
 */
export class GCashProvider implements PaymentProvider {
  async initiate(orderId: string, amount: number) {
    console.log(
      `[GCashProvider] Initiating GCash payment for order ${orderId} — ₱${amount.toFixed(2)}`
    );
    await delay(300);
    const reference = `GCASH-${orderId}-${Date.now()}`;
    console.log(`[GCashProvider] Payment reference: ${reference} — status: success (stub)`);
    return { status: "success" as const, reference };
  }

  async checkStatus(reference: string) {
    console.log(`[GCashProvider] Checking status for reference ${reference} (stub)`);
    return "success" as const;
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
