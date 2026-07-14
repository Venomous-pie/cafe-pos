import { NextResponse } from "next/server";
import { storeConfig } from "@/lib/config";

export async function GET() {
  return NextResponse.json(storeConfig);
}
