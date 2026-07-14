import type { PaymentProvider } from "./PaymentProvider";

/**
 * Cash payments are confirmed manually by staff handing over cash.
 * Always resolves success immediately — the physical transaction is the source
 * of truth, not any digital gateway.
 */
export class CashProvider implements PaymentProvider {
  async initiate(orderId: string, amount: number) {
    console.log(
      `[CashProvider] Cash payment for order ${orderId} — ₱${amount.toFixed(2)}. Awaiting physical tender.`
    );
    return { status: "success" as const };
  }

  async checkStatus(_reference: string) {
    return "success" as const;
  }
}
