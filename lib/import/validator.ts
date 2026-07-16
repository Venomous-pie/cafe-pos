/**
 * Import Validation Engine
 *
 * Validates mapped rows before committing to the database.
 * Returns per-row errors without failing the whole batch.
 */

import { prisma } from "@/lib/db";
import type { SystemField } from "./mapper";

export interface MappedRow {
  /** raw spreadsheet row index (1-based, after header) */
  rowIndex: number;
  fields: Partial<Record<SystemField, string>>;
}

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

export interface ValidatedRow {
  rowIndex: number;
  name: string;
  sku: string | null;
  basePrice: number | null;
  categoryName: string;
  description: string | null;
  unit: string;
  trackStock: boolean;
  imageUrl: string | null;
  customFields: Record<string, string> | null;
}

export interface ValidationResult {
  valid: ValidatedRow[];
  errors: RowError[];
}

/** Strip currency symbols and whitespace, then parse as float */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[₱$,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseBool(raw: string): boolean {
  return ["true", "yes", "1", "y"].includes(raw.toLowerCase().trim());
}

export async function validateRows(
  rows: MappedRow[],
  importBatchId: string
): Promise<ValidationResult> {
  const valid: ValidatedRow[] = [];
  const errors: RowError[] = [];

  // Pre-fetch existing SKUs so we can detect duplicates within the batch too
  const existingSkus = new Set(
    (await prisma.product.findMany({ select: { sku: true } }))
      .map((p) => p.sku)
      .filter(Boolean) as string[]
  );
  const batchSkus = new Set<string>();

  for (const row of rows) {
    const { rowIndex, fields } = row;
    const rowErrors: RowError[] = [];

    // --- Required: name ---
    const name = fields.name?.trim() ?? "";
    if (!name) {
      rowErrors.push({ rowIndex, field: "name", message: "Product name is required" });
    }

    // --- Required: categoryName ---
    const categoryName = fields.categoryName?.trim() ?? "";
    if (!categoryName) {
      rowErrors.push({ rowIndex, field: "categoryName", message: "Category is required" });
    }

    // --- Required: basePrice (must be a valid non-negative number) ---
    const rawPrice = fields.basePrice ?? "";
    const basePrice = rawPrice.trim() === "" ? null : parsePrice(rawPrice);
    if (rawPrice.trim() !== "" && basePrice === null) {
      rowErrors.push({ rowIndex, field: "basePrice", message: `Cannot parse price: "${rawPrice}"` });
    } else if (basePrice !== null && basePrice < 0) {
      rowErrors.push({ rowIndex, field: "basePrice", message: "Price cannot be negative" });
    }

    // --- Optional: SKU uniqueness ---
    const sku = fields.sku?.trim() || null;
    if (sku) {
      if (existingSkus.has(sku) || batchSkus.has(sku)) {
        rowErrors.push({ rowIndex, field: "sku", message: `Duplicate SKU: "${sku}"` });
      } else {
        batchSkus.add(sku);
      }
    }

    // --- Optional: trackStock ---
    const trackStock = fields.trackStock ? parseBool(fields.trackStock) : false;

    // --- Optional: customFields (pass through as-is) ---
    let customFields: Record<string, string> | null = null;
    if (fields.customFields) {
      try {
        customFields = JSON.parse(fields.customFields);
      } catch {
        customFields = { raw: fields.customFields };
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({
        rowIndex,
        name,
        sku,
        basePrice,
        categoryName,
        description: fields.description?.trim() || null,
        unit: fields.unit?.trim() || "Piece",
        trackStock,
        imageUrl: fields.imageUrl?.trim() || null,
        customFields,
      });
    }
  }

  return { valid, errors };
}
