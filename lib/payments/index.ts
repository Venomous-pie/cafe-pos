import type { PaymentProvider } from "./PaymentProvider";
import { CashProvider } from "./CashProvider";
import { GCashProvider } from "./GCashProvider";
import { MayaProvider } from "./MayaProvider";
import { MaribankProvider } from "./MaribankProvider";

export type { PaymentProvider };

const providers: Record<string, PaymentProvider> = {
  cash: new CashProvider(),
  gcash: new GCashProvider(),
  maya: new MayaProvider(),
  maribank: new MaribankProvider(),
};

/**
 * Returns the PaymentProvider for the given payment method id.
 * Throws if an unknown method is requested — this prevents silent no-ops.
 */
export function getProvider(method: string): PaymentProvider {
  const provider = providers[method];
  if (!provider) {
    throw new Error(
      `Unknown payment method: "${method}". Valid methods: ${Object.keys(providers).join(", ")}`
    );
  }
  return provider;
}
