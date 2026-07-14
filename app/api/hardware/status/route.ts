import { NextResponse } from "next/server";
import { getCashDrawer, getReceiptPrinter } from "@/lib/hardware";

export async function GET() {
  try {
    const drawer = getCashDrawer();
    const printer = getReceiptPrinter();

    const [drawerStatus, printerStatus] = await Promise.all([
      drawer.getStatus(),
      printer.getStatus()
    ]);

    return NextResponse.json({
      cashDrawer: drawerStatus,
      receiptPrinter: printerStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to fetch hardware status:", error);
    return NextResponse.json({ error: "Failed to fetch hardware status" }, { status: 500 });
  }
}
