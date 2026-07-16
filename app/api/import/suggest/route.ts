/**
 * POST /api/import/suggest
 * Body: { headers: string[] }
 * Returns: Record<header, { field, confidence, score }>
 */
import { NextResponse } from "next/server";
import { suggestMappings } from "@/lib/import/mapper";

export async function POST(request: Request) {
  try {
    const { headers } = await request.json();
    if (!Array.isArray(headers)) {
      return NextResponse.json({ error: "headers must be an array" }, { status: 400 });
    }
    return NextResponse.json(suggestMappings(headers));
  } catch (error) {
    return NextResponse.json({ error: "Failed to suggest mappings" }, { status: 500 });
  }
}
