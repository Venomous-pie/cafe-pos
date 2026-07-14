import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReceiptPrinter, OrderWithTotals } from "@/lib/hardware";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // We need to fetch the order and its items, and reconstruct the "Totals" object
    // that the printer expects. Since the totals are already snapshotted on the order,
    // we don't need to re-run pricing, just map it.
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderWithTotals: OrderWithTotals = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      lineItems: order.items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        variantName: item.variantName,
        selectedChoiceIds: JSON.parse(item.selectedChoiceIds),
        selectedChoiceNames: [], // We don't snapshot choice names yet, so reprint won't have them
        quantity: item.quantity,
        basePrice: 0, // Mocked for reprint
        optionsPrice: 0, // Mocked
        promotionDiscount: 0, // Mocked
        priceEach: Number(item.priceEach),
        lineTotal: Number(item.priceEach) * item.quantity,
        appliedPromotion: null // Mocked
      }))
    };

    const printer = getReceiptPrinter();
    const result = await printer.printReceipt(orderWithTotals);

    if (!result.success) {
       return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reprint receipt:", error);
    return NextResponse.json({ error: "Failed to reprint receipt" }, { status: 500 });
  }
}
