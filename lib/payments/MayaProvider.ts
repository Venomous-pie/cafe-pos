import type { PaymentProvider } from "./PaymentProvider";

/**
 * Maya (formerly PayMaya) stub.
 * Replace the body of `initiate` with the real Maya API SDK call when available.
 */
export class MayaProvider implements PaymentProvider {
  async initiate(orderId: string, amount: number) {
    console.log(
      `[MayaProvider] Initiating Maya payment for order ${orderId} — ₱${amount.toFixed(2)}`
    );
    await delay(300);
    const reference = `MAYA-${orderId}-${Date.now()}`;
    console.log(`[MayaProvider] Payment reference: ${reference} — status: success (stub)`);
    return { status: "success" as const, reference };
  }

  async checkStatus(reference: string) {
    console.log(`[MayaProvider] Checking status for reference ${reference} (stub)`);
    return "success" as const;
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
