import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const config = { api: { bodyParser: false } };

const MAX_PREVIEW_ROWS = 5;

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
        preview: MAX_PREVIEW_ROWS + 1, // +1 so we can detect truncation
      });

      if (result.errors.length > 0 && result.data.length === 0) {
        return NextResponse.json(
          { error: "Could not parse CSV: " + result.errors[0].message },
          { status: 422 }
        );
      }

      headers = result.meta.fields ?? [];
      rows = result.data.slice(0, MAX_PREVIEW_ROWS) as Record<string, string>[];
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rawRows.length === 0) {
        return NextResponse.json(
          { error: "The spreadsheet appears to be empty" },
          { status: 422 }
        );
      }

      headers = Object.keys(rawRows[0]);
      rows = rawRows.slice(0, MAX_PREVIEW_ROWS).map((r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, String(v)])
        )
      );
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .csv, .xlsx, or .xls file." },
        { status: 415 }
      );
    }

    return NextResponse.json({ headers, rows });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
