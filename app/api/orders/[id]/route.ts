import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot cancel an order with status "${order.status}"` },
        { status: 400 }
      );
    }

    const cancelled = await prisma.order.update({
      where: { id },
      data: { status: "cancelled", paymentStatus: "failed" },
      include: { items: true },
    });

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error("Failed to cancel order:", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
