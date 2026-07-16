import { prisma } from "./db";

// ─── Constants ───────────────────────────────────────────────────────────────
// Keep in sync with the client-side TAX_RATE in OrderPanel.tsx.
// Move to a DB settings table later if per-location rates are needed.
export const TAX_RATE = 0.08;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface OrderItemInput {
  productId: string;
  variantName?: string | null;
  /** Map of OptionGroup name → OptionChoice name (e.g. { "Milk Type": "Oat Milk" }) */
  selectedOptions?: Record<string, string>;
  quantity: number;
}

export interface LineItem {
  productId: string;
  productName: string;
  variantName: string | null;
  selectedChoiceIds: string[];
  selectedChoiceNames: string[];
  quantity: number;
  basePrice: number;        // variant price (or lowest variant if no variant specified)
  optionsPrice: number;     // sum of additionalPrice for chosen options
  promotionDiscount: number; // amount knocked off after promotion
  priceEach: number;        // final unit price after options + promotion
  lineTotal: number;        // priceEach × quantity
  appliedPromotion: { type: string; value: number } | null;
}

export interface OrderTotals {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

// ─── Core calculation ────────────────────────────────────────────────────────
export async function calculateOrderTotals(
  items: OrderItemInput[]
): Promise<OrderTotals> {
  if (items.length === 0) {
    return { lineItems: [], subtotal: 0, tax: 0, total: 0 };
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  // Fetch all needed products with their variants, option groups/choices, and
  // active promotions in one round-trip.
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isAvailable: true },
    include: {
      variants: true,
      optionGroups: { include: { choices: true } },
      promotions: {
        where: {
          isActive: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "desc" },
        take: 1, // use the most recently started active promotion
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems: LineItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(
        `Product not found or unavailable: ${item.productId}`
      );
    }

    // ── Base price from variant ──────────────────────────────────────────────
    let basePrice: number;

    if (item.variantName) {
      const variant = product.variants.find((v) => v.name === item.variantName);
      if (!variant) {
        throw new Error(
          `Variant "${item.variantName}" not found on product "${product.name}"`
        );
      }
      basePrice = Number(variant.price);
    } else if (product.variants.length > 0) {
      // No variant specified but product has variants → use cheapest as fallback
      basePrice = Math.min(...product.variants.map((v) => Number(v.price)));
    } else if (product.basePrice !== null) {
      // No variants, use the flat basePrice field (from imports/flat products)
      basePrice = Number(product.basePrice);
    } else {
      // No variants and no basePrice — default to 0 (e.g. for free items)
      basePrice = 0;
    }

    // ── Options price ────────────────────────────────────────────────────────
    const selectedChoiceIds: string[] = [];
    const selectedChoiceNames: string[] = [];
    let optionsPrice = 0;

    if (item.selectedOptions) {
      for (const [groupName, choiceName] of Object.entries(item.selectedOptions)) {
        const group = product.optionGroups.find((g) => g.name === groupName);
        if (!group) continue; // ignore unknown groups (don't error — group may have been removed)

        const choice = group.choices.find((c) => c.name === choiceName);
        if (!choice) continue;

        selectedChoiceIds.push(choice.id);
        selectedChoiceNames.push(`${groupName}: ${choiceName}`);
        optionsPrice += Number(choice.additionalPrice);
      }
    }

    // ── Promotion ────────────────────────────────────────────────────────────
    const activePromo = product.promotions[0] ?? null;
    let promotionDiscount = 0;
    let appliedPromotion: { type: string; value: number } | null = null;

    if (activePromo) {
      const promoValue = Number(activePromo.value);
      if (activePromo.type === "PERCENT_OFF") {
        promotionDiscount = ((basePrice + optionsPrice) * promoValue) / 100;
      } else if (activePromo.type === "FIXED_OFF") {
        promotionDiscount = promoValue;
      }
      // Never discount below zero
      promotionDiscount = Math.min(promotionDiscount, basePrice + optionsPrice);
      appliedPromotion = { type: activePromo.type, value: promoValue };
    }

    const priceEach = basePrice + optionsPrice - promotionDiscount;
    const lineTotal = priceEach * item.quantity;

    lineItems.push({
      productId: product.id,
      productName: product.name,
      variantName: item.variantName ?? null,
      selectedChoiceIds,
      selectedChoiceNames,
      quantity: item.quantity,
      basePrice,
      optionsPrice,
      promotionDiscount,
      priceEach,
      lineTotal,
      appliedPromotion,
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return { lineItems, subtotal, tax, total };
}
