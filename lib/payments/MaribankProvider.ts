import type { PaymentProvider } from "./PaymentProvider";

/**
 * Maribank stub.
 * Replace the body of `initiate` with the real Maribank API SDK call when available.
 */
export class MaribankProvider implements PaymentProvider {
  async initiate(orderId: string, amount: number) {
    console.log(
      `[MaribankProvider] Initiating Maribank payment for order ${orderId} — ₱${amount.toFixed(2)}`
    );
    await delay(300);
    const reference = `MARIBANK-${orderId}-${Date.now()}`;
    console.log(`[MaribankProvider] Payment reference: ${reference} — status: success (stub)`);
    return { status: "success" as const, reference };
  }

  async checkStatus(reference: string) {
    console.log(`[MaribankProvider] Checking status for reference ${reference} (stub)`);
    return "success" as const;
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
