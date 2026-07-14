import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateOrderTotals, OrderItemInput } from "@/lib/pricing";
import { getProvider } from "@/lib/payments";
import { getCashDrawer, getReceiptPrinter, OrderWithTotals } from "@/lib/hardware";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status } : {};

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentMethod, items } = body;

    if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // 1. Calculate authoritative totals
    const totals = await calculateOrderTotals(items as OrderItemInput[]);

    // 2. Create the Order in the database (initially pending)
    const order = await prisma.order.create({
      data: {
        status: "pending",
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: paymentMethod,
        paymentStatus: "pending",
        items: {
          create: totals.lineItems.map(li => ({
            productId: li.productId,
            variantName: li.variantName,
            selectedChoiceIds: JSON.stringify(li.selectedChoiceIds),
            quantity: li.quantity,
            priceEach: li.priceEach,
          }))
        }
      },
      include: { items: true }
    });

    // 3. Initiate payment
    try {
      const provider = getProvider(paymentMethod);
      const paymentResult = await provider.initiate(order.id, totals.total);

      if (paymentResult.status === "failed") {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "failed", status: "cancelled" }
        });
        return NextResponse.json({ error: "Payment failed" }, { status: 400 });
      }

      // If pending (e.g. QR code shown, waiting for scan), we might return early here in a real app,
      // but for this slice, all our providers immediately resolve 'success'.
      
      // Update to paid
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "paid", status: "completed" }
      });

    } catch (paymentErr: any) {
      console.error("Payment provider error:", paymentErr);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "failed", status: "cancelled" }
      });
      return NextResponse.json({ error: `Payment error: ${paymentErr.message}` }, { status: 400 });
    }

    // 4. Hardware Interaction (Cash Drawer + Printer)
    let hardwareWarning = null;
    const orderWithTotals: OrderWithTotals = { 
      ...order,
      ...totals,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total)
    };

    try {
      if (paymentMethod === "cash") {
        const drawer = getCashDrawer();
        await drawer.open();
      }

      const printer = getReceiptPrinter();
      await printer.printReceipt(orderWithTotals);

    } catch (hardwareErr: any) {
      console.error("Hardware error during order completion:", hardwareErr);
      hardwareWarning = `Receipt printer or cash drawer failed: ${hardwareErr.message}. The transaction was successful.`;
      
      await prisma.order.update({
        where: { id: order.id },
        data: { hardwareWarning }
      });
    }

    // 5. Return final order state
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true }
    });

    return NextResponse.json({ ...finalOrder, hardwareWarning });

  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: error.message || "Order creation failed" }, { status: 500 });
  }
}
