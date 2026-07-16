/**
 * POST /api/import/commit
 *
 * Body:
 * {
 *   mappings: Record<string, SystemField | null>,  // header → field
 *   rows: Record<string, string>[],                 // all data rows (not just preview)
 *   importBatchId: string
 * }
 *
 * Returns:
 * {
 *   imported: number,
 *   skipped: number,
 *   errors: RowError[]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRows } from "@/lib/import/validator";
import type { SystemField } from "@/lib/import/mapper";
import type { MappedRow } from "@/lib/import/validator";
import { cuid } from "@/lib/import/cuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mappings,
      rows,
      importBatchId = cuid(),
    }: {
      mappings: Record<string, SystemField | null>;
      rows: Record<string, string>[];
      importBatchId?: string;
    } = body;

    if (!mappings || !rows || rows.length === 0) {
      return NextResponse.json(
        { error: "mappings and rows are required" },
        { status: 400 }
      );
    }

    // Transform raw rows into MappedRow shape using the confirmed mappings
    const mappedRows: MappedRow[] = rows.map((raw, i) => {
      const fields: Partial<Record<SystemField, string>> = {};
      for (const [header, field] of Object.entries(mappings)) {
        if (field && raw[header] !== undefined) {
          fields[field] = String(raw[header]);
        }
      }
      return { rowIndex: i + 2, fields }; // +2: row 1 is header
    });

    const { valid, errors } = await validateRows(mappedRows, importBatchId);

    if (valid.length === 0) {
      return NextResponse.json({ imported: 0, skipped: rows.length, errors });
    }

    // Resolve/create categories in bulk before inserting products
    const categoryNames = [...new Set(valid.map((r) => r.categoryName))];
    const categoryMap: Record<string, string> = {}; // name → id

    for (const catName of categoryNames) {
      let cat = await prisma.category.findFirst({
        where: { name: { equals: catName } },
      });
      if (!cat) {
        const slug = catName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        cat = await prisma.category.create({
          data: { name: catName, slug },
        });
      }
      categoryMap[catName] = cat.id;
    }

    // Batch insert
    await prisma.product.createMany({
      data: valid.map((r) => ({
        name: r.name,
        sku: r.sku,
        basePrice: r.basePrice,
        categoryId: categoryMap[r.categoryName],
        description: r.description,
        imageUrl: r.imageUrl,
        unit: r.unit,
        trackStock: r.trackStock,
        isActive: true,
        isAvailable: true,
        importBatchId,
        customFields: r.customFields ? JSON.stringify(r.customFields) : null,
      })),
    });

    return NextResponse.json({
      imported: valid.length,
      skipped: rows.length - valid.length,
      errors,
      importBatchId,
    });
  } catch (error) {
    console.error("Import commit error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/import/commit?batchId=xxx
 * Rolls back all products from a given import batch.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const { count } = await prisma.product.deleteMany({
      where: { importBatchId: batchId },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("Rollback error:", error);
    return NextResponse.json({ error: "Rollback failed" }, { status: 500 });
  }
}
