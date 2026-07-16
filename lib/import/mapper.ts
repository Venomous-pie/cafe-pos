/**
 * Import Mapping Engine
 *
 * Maps spreadsheet column headers to Product schema fields.
 * Strategy: exact alias match first, then Jaro-Winkler fuzzy match.
 */

export type SystemField =
  | "name"
  | "sku"
  | "basePrice"
  | "categoryName"
  | "description"
  | "unit"
  | "trackStock"
  | "imageUrl"
  | "customFields"; // catch-all for unmapped columns

export interface FieldMeta {
  label: string;
  required: boolean;
  description: string;
}

export const SYSTEM_FIELDS: Record<SystemField, FieldMeta> = {
  name:         { label: "Product Name",  required: true,  description: "Name of the product" },
  sku:          { label: "SKU",           required: false, description: "Unique identifier / barcode" },
  basePrice:    { label: "Price",         required: true,  description: "Base selling price" },
  categoryName: { label: "Category",      required: true,  description: "Category the product belongs to" },
  description:  { label: "Description",   required: false, description: "Optional product description" },
  unit:         { label: "Unit",          required: false, description: "Unit of measure (e.g. Piece, Cup, Kg)" },
  trackStock:   { label: "Track Stock",   required: false, description: "Whether to track inventory for this product" },
  imageUrl:     { label: "Image URL",     required: false, description: "URL to product image" },
  customFields: { label: "Custom Fields", required: false, description: "Extra attributes stored as JSON" },
};

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Known aliases for each system field (will be normalized) */
const RAW_ALIASES: Record<SystemField, string[]> = {
  name:         ["name", "productname", "item", "itemname", "product", "title", "menuitem"],
  sku:          ["sku", "code", "barcode", "itemcode", "productcode", "ref", "id"],
  basePrice:    ["price", "baseprice", "cost", "sellingprice", "unitprice", "rate", "amount", "srp", "retailprice", "pricephp"],
  categoryName: ["category", "type", "group", "section", "department", "kind", "class", "classification", "categoryname"],
  description:  ["description", "desc", "details", "notes", "info", "about", "productdescription"],
  unit:         ["unit", "uom", "measure", "unitofmeasure", "soldby", "size", "portion"],
  trackStock:   ["trackstock", "stock", "inventory", "trackinventory", "managestock", "qty", "quantity", "stockqty", "stockquantity"],
  imageUrl:     ["image", "imageurl", "photo", "picture", "img", "thumbnail", "pic", "url"],
  customFields: [],
};

// ---------------------------------------------------------------------------
// Jaro-Winkler similarity (0–1, higher = more similar)
// ---------------------------------------------------------------------------

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const matchDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
  );
}

function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(a, b);
  let prefixLen = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }
  return jaro + prefixLen * prefixScale * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FieldSuggestion {
  field: SystemField | null; // null = no confident match
  confidence: "exact" | "fuzzy" | "none";
  score: number; // 0–1
}

const FUZZY_THRESHOLD = 0.82; // Increased threshold since we now normalize strings

/**
 * Suggest a system field for a single spreadsheet header.
 */
export function suggestField(header: string): FieldSuggestion {
  const normalised = normalize(header);
  if (!normalised) return { field: null, confidence: "none", score: 0 };

  // 1. Exact alias match
  for (const [field, aliases] of Object.entries(RAW_ALIASES) as [SystemField, string[]][]) {
    if (aliases.includes(normalised)) {
      return { field, confidence: "exact", score: 1 };
    }
  }

  // 2. Fuzzy match across all aliases
  let bestField: SystemField | null = null;
  let bestScore = 0;

  for (const [field, aliases] of Object.entries(RAW_ALIASES) as [SystemField, string[]][]) {
    for (const alias of aliases) {
      const score = jaroWinkler(normalised, alias);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
    // Also match against the field key itself
    const keyScore = jaroWinkler(normalised, normalize(field));
    if (keyScore > bestScore) {
      bestScore = keyScore;
      bestField = field;
    }
  }

  if (bestScore >= FUZZY_THRESHOLD && bestField) {
    return { field: bestField, confidence: "fuzzy", score: bestScore };
  }

  return { field: null, confidence: "none", score: bestScore };
}

/**
 * Suggest mappings for all headers in a spreadsheet.
 * Returns a map of header → suggested system field.
 */
export function suggestMappings(
  headers: string[]
): Record<string, FieldSuggestion> {
  const result: Record<string, FieldSuggestion> = {};
  const usedFields = new Set<SystemField>();

  for (const header of headers) {
    const suggestion = suggestField(header);

    // Don't assign the same system field twice — demote the second match to "none"
    if (suggestion.field && usedFields.has(suggestion.field)) {
      result[header] = { field: null, confidence: "none", score: suggestion.score };
    } else {
      result[header] = suggestion;
      if (suggestion.field) usedFields.add(suggestion.field);
    }
  }

  return result;
}
