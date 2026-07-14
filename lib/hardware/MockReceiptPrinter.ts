import type { ReceiptPrinter, OrderWithTotals } from "./ReceiptPrinter";

/**
 * Mock receipt printer — formats a plain text receipt and logs it to the console.
 */
export class MockReceiptPrinter implements ReceiptPrinter {
  async printReceipt(order: OrderWithTotals) {
    await delay(100);

    const lines: string[] = [];
    const hr = "--------------------------------";
    
    lines.push("");
    lines.push("       CAFE POS RECEIPT       ");
    lines.push(hr);
    lines.push(`Order ID: ${order.id}`);
    lines.push(`Date:     ${order.createdAt.toLocaleString()}`);
    lines.push(`Payment:  ${order.paymentMethod.toUpperCase()}`);
    lines.push(hr);
    
    for (const item of order.lineItems) {
      const lineTotal = item.lineTotal.toFixed(2).padStart(8);
      const qtyStr = `${item.quantity}x`.padEnd(4);
      let nameStr = item.productName;
      if (item.variantName) nameStr += ` (${item.variantName})`;
      
      // Truncate name if too long to fit with qty and total
      if (nameStr.length > 18) nameStr = nameStr.substring(0, 15) + "...";
      nameStr = nameStr.padEnd(18);
      
      lines.push(`${qtyStr}${nameStr}${lineTotal}`);
      
      // Options
      for (const choice of item.selectedChoiceNames) {
        lines.push(`    + ${choice}`);
      }
      
      // Promotions
      if (item.appliedPromotion) {
        const promoStr = item.appliedPromotion.type === "PERCENT_OFF" 
          ? `-${item.appliedPromotion.value}% Promo`
          : `-${item.appliedPromotion.value} Promo`;
        lines.push(`    ${promoStr}`);
      }
    }
    
    lines.push(hr);
    lines.push(`Subtotal: ${order.subtotal.toFixed(2).padStart(22)}`);
    lines.push(`Tax:      ${order.tax.toFixed(2).padStart(22)}`);
    lines.push(`TOTAL:    ${order.total.toFixed(2).padStart(22)}`);
    lines.push(hr);
    lines.push("        THANK YOU!        ");
    lines.push("");

    console.log(lines.join("\n"));
    
    return { success: true };
  }

  async getStatus() {
    return "ready" as const;
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
