import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const searchQuery = searchParams.get("search");

    const whereClause: any = { isAvailable: true };

    if (categorySlug && categorySlug !== "all") {
      whereClause.category = { slug: categorySlug };
    }

    if (searchQuery) {
      whereClause.name = { contains: searchQuery };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variants: true,
        optionGroups: {
          include: { choices: true }
        },
        promotions: {
          where: {
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() }
          },
          orderBy: { startsAt: 'desc' },
          take: 1
        }
      }
    });

    // Map to the shape expected by the frontend
    const formatted = products.map(p => {
      // Find base price (assume first variant, as seeded)
      const basePrice = p.variants.length > 0 ? Number(p.variants[0].price) : 0;
      
      const activePromo = p.promotions[0];
      let activePromotion = undefined;
      let discount = null; // frontend compatibility
      
      if (activePromo) {
        activePromotion = { type: activePromo.type, value: Number(activePromo.value) };
        if (activePromo.type === "PERCENT_OFF") {
          discount = Number(activePromo.value);
        }
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category.slug,
        image: p.imageUrl,
        price: basePrice,
        originalPrice: activePromo ? basePrice : null,
        available: p.available,
        sold: p.sold,
        discount,
        activePromotion,
        unit: p.unit,
        variants: p.variants.map(v => ({ name: v.name, price: Number(v.price) })),
        options: p.optionGroups.map(og => ({
          name: og.name,
          required: og.required,
          choices: og.choices.map(c => ({
            name: c.name,
            additionalPrice: Number(c.additionalPrice)
          }))
        }))
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
