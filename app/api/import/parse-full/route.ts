/**
 * POST /api/import/parse-full
 * Same as /api/import/parse but returns ALL rows (no preview limit).
 * Used by the commit step to get the full dataset.
 */
import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      headers = result.meta.fields ?? [];
      rows = result.data as Record<string, string>[];
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
      rows = rawRows.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))
      );
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    return NextResponse.json({ headers, rows });
  } catch (error) {
    console.error("Full parse error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
