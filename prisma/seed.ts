import { PrismaClient, Prisma } from "@prisma/client";
import menuData from "../data/menu.json";


const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Categories ────────────────────────────────────────────────────────────
  const categorySlugMap: Record<string, string> = {}; // slug → cuid

  for (const cat of menuData.categories) {
    if (cat.id === "all") continue; // "All Menu" is a UI filter, not a real category
    const created = await prisma.category.upsert({
      where: { slug: cat.id },
      update: { name: cat.name, icon: cat.icon },
      create: { name: cat.name, slug: cat.id, icon: cat.icon },
    });
    categorySlugMap[cat.id] = created.id;
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  for (const item of menuData.menuItems) {
    const categoryId = categorySlugMap[item.category];
    if (!categoryId) {
      console.warn(`  ⚠ Skipping "${item.name}": unknown category "${item.category}"`);
      continue;
    }

    // Base price: use first variant price if variants exist, else item.price
    const basePrice: Prisma.Decimal = new Prisma.Decimal(
      // @ts-ignore
      item.variants && item.variants.length > 0 ? item.variants[0].price : item.price
    );

    const product = await prisma.product.upsert({
      where: { id: `seed-${item.id}` },
      update: {
        name: item.name,
        imageUrl: item.image,
        categoryId,
        isAvailable: true,
        available: item.available,
        sold: item.sold,
        unit: item.unit,
      },
      create: {
        id: `seed-${item.id}`,
        name: item.name,
        imageUrl: item.image,
        categoryId,
        isAvailable: true,
        available: item.available,
        sold: item.sold,
        unit: item.unit,
      },
    });

    // Variants
    // @ts-ignore
    if (item.variants && item.variants.length > 0) {
      // @ts-ignore
      for (const v of item.variants) {
        await prisma.variant.upsert({
          where: { id: `seed-v-${item.id}-${v.name}` },
          update: { price: new Prisma.Decimal(v.price) },
          create: {
            id: `seed-v-${item.id}-${v.name}`,
            productId: product.id,
            name: v.name,
            price: new Prisma.Decimal(v.price),
          },
        });
      }
    } else {
      // Create a default variant so the pricing engine has a base price
      await prisma.variant.upsert({
        where: { id: `seed-v-${item.id}-Regular` },
        update: { price: basePrice },
        create: {
          id: `seed-v-${item.id}-Regular`,
          productId: product.id,
          name: "Regular",
          price: basePrice,
        },
      });
    }

    // Option Groups + Choices
    // @ts-ignore
    if (item.options && item.options.length > 0) {
      // @ts-ignore
      for (const og of item.options) {
        const groupId = `seed-og-${item.id}-${og.name}`;
        await prisma.optionGroup.upsert({
          where: { id: groupId },
          update: { name: og.name, required: og.required },
          create: {
            id: groupId,
            productId: product.id,
            name: og.name,
            required: og.required,
          },
        });

        for (const choice of og.choices) {
          const choiceId = `seed-oc-${item.id}-${og.name}-${choice.name}`;
          const additionalPrice = new Prisma.Decimal((choice as any).additionalPrice ?? 0);
          await prisma.optionChoice.upsert({
            where: { id: choiceId },
            update: { additionalPrice },
            create: {
              id: choiceId,
              optionGroupId: groupId,
              name: choice.name,
              additionalPrice,
            },
          });
        }
      }
    }

    // Promotion: if discount exists, create a PERCENT_OFF promotion active for 1 year
    if (item.discount) {
      const promoId = `seed-promo-${item.id}`;
      const now = new Date();
      const yearFromNow = new Date(now);
      yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);

      await prisma.promotion.upsert({
        where: { id: promoId },
        update: {
          type: "PERCENT_OFF",
          value: new Prisma.Decimal(item.discount),
          startsAt: now,
          endsAt: yearFromNow,
          isActive: true,
        },
        create: {
          id: promoId,
          productId: product.id,
          type: "PERCENT_OFF",
          value: new Prisma.Decimal(item.discount),
          startsAt: now,
          endsAt: yearFromNow,
          isActive: true,
        },
      });
    }

    console.log(`  ✓ Product: ${item.name}`);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
