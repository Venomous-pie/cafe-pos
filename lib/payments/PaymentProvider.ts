export interface PaymentProvider {
  /**
   * Initiate a payment for the given order.
   * Returns a status and optional reference string for async tracking.
   */
  initiate(
    orderId: string,
    amount: number
  ): Promise<{ status: "pending" | "success" | "failed"; reference?: string }>;

  /**
   * Check the current status of a payment by its provider reference.
   * Used for async payment methods (e.g., QR-based) that may need polling.
   */
  checkStatus(reference: string): Promise<"pending" | "success" | "failed">;
}
