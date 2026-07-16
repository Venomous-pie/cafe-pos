import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      basePrice,
      categoryName,
      description,
      imageUrl,
      unit = "Piece",
      trackStock = false,
      isActive = true,
      isAvailable = true,
      importBatchId,
      customFields,
    } = body;

    if (!name || !categoryName) {
      return NextResponse.json(
        { error: "name and categoryName are required" },
        { status: 400 }
      );
    }

    // Resolve category by name (case-insensitive), or create it
    let category = await prisma.category.findFirst({
      where: { name: { equals: categoryName } },
    });

    if (!category) {
      const slug = categoryName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      category = await prisma.category.create({
        data: { name: categoryName, slug },
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku || null,
        basePrice: basePrice != null ? basePrice : null,
        description: description || null,
        imageUrl: imageUrl || null,
        categoryId: category.id,
        unit,
        trackStock,
        isActive,
        isAvailable,
        importBatchId: importBatchId || null,
        customFields: customFields ? JSON.stringify(customFields) : null,
      },
      include: { category: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A product with that SKU already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

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
      // Find base price (assume basePrice field, fallback to first variant, as seeded)
      const basePrice = p.basePrice !== null ? Number(p.basePrice) : (p.variants.length > 0 ? Number(p.variants[0].price) : 0);
      
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
        trackStock: p.trackStock,
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
