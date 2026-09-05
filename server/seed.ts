import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { prisma } from './prisma';
import {
  SEED_CATEGORIES,
  SEED_SUPPLIERS,
  SEED_USERS,
  SEED_ADDRESSES,
  SEED_COUPONS,
  SEED_PRICING_RULE,
  RAW_PRODUCTS_DATA,
} from './seedData';

/**
 * Idempotent environment-driven seed for Prisma (Neon PostgreSQL).
 * Never seeds hardcoded passwords: CUSTOMER_PASSWORD comes from the
 * environment, otherwise a random dev password is generated.
 */
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || crypto.randomUUID() + 'C7';
const CUSTOMER_HASH = bcrypt.hashSync(CUSTOMER_PASSWORD, 10);

const SETTING_DEFAULTS: Record<string, string> = {
  storeName: 'Shoply',
  supportEmail: 'support@shoply.in',
  supportPhone: '+91 82350 58525',
  upiMerchantId: '8235058525@sbi',
  upiMerchantName: 'Shoply India',
  minimumOrderAmount: '149',
  freeShippingThreshold: '499',
  standardShippingFee: '40',
  codFee: '0',
  currency: 'INR',
  dbMode: 'DEMO',
  isDevData: 'true',
};

export async function seedDatabase(): Promise<void> {
  // 1. Settings (create-only, never overwrite operator edits)
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  await prisma.setting.upsert({
    where: { key: 'pricing_rule' },
    create: { key: 'pricing_rule', value: JSON.stringify(SEED_PRICING_RULE) },
    update: {},
  });

  // 2. Categories
  for (const c of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? null,
        imageUrl: c.imageUrl ?? null,
        icon: c.icon ?? null,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      },
      update: { name: c.name, description: c.description ?? null, imageUrl: c.imageUrl ?? null, icon: c.icon ?? null },
    });
  }

  // 3. Suppliers
  for (const s of SEED_SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        slug: s.slug,
        code: s.code,
        status: s.status as any,
        integrationType: s.integrationType as any,
        contactEmail: s.contactEmail ?? null,
        contactPhone: s.contactPhone ?? null,
        reliabilityScore: s.reliabilityScore,
        avgDeliveryDays: s.avgDeliveryDays,
        returnScore: s.returnScore,
        apiEndpoint: (s as any).apiEndpoint ?? null,
        notes: s.notes ?? null,
      },
      update: {
        name: s.name,
        status: s.status as any,
        reliabilityScore: s.reliabilityScore,
        avgDeliveryDays: s.avgDeliveryDays,
        returnScore: s.returnScore,
        notes: s.notes ?? null,
      },
    });
  }

  // 4. Users (idempotent; hash stays with the role)
  const userRows = SEED_USERS.map((u) => ({
    ...u,
    passwordHash: CUSTOMER_HASH,
  }));
  for (const u of userRows) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        phone: u.phone || null,
        role: u.role as any,
      },
      update: { name: u.name, phone: u.phone || null, role: u.role as any },
    });
  }

  // 5. Addresses
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV SEED] Customer login -> customer@bharatcart.in / ' + CUSTOMER_PASSWORD);
  }
  for (const a of SEED_ADDRESSES) {
    await prisma.address.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        userId: a.userId,
        fullName: a.fullName,
        phone: a.phone,
        street: a.street,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        landmark: a.landmark ?? null,
        isDefault: a.isDefault,
      },
      update: {},
    });
  }

  // 6. Coupons
  for (const c of SEED_COUPONS) {
    await prisma.coupon.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        code: c.code,
        discountPercent: c.discountPercent ?? null,
        discountAmount: c.discountAmount ?? null,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount ?? null,
        isActive: c.isActive,
        usedCount: c.usedCount ?? 0,
      },
      update: { isActive: c.isActive },
    });
  }

  // 7. Products (52 curated SKUs) + supplier mappings + inventory
  const supplierByCode = new Map<string, string>();
  for (const s of SEED_SUPPLIERS) supplierByCode.set(s.code, s.id);

  for (const raw of RAW_PRODUCTS_DATA) {
    const slug = raw.slug;
    const product = await prisma.product.findUnique({ where: { slug } });
    const data: any = {
      title: raw.title,
      description: raw.description,
      shortDesc: raw.shortDesc,
      vendor: 'DEODAP',
      categoryId: raw.categoryId,
      mrp: raw.mrp,
      sellingPrice: raw.sellingPrice,
      images: raw.images,
      thumbnail: raw.thumbnail,
      badge: raw.badge ?? null,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      isTrending: raw.isTrending,
      isBestSeller: raw.isBestSeller,
      isNewArrival: raw.isNewArrival,
      isActive: true,
      specifications: raw.specifications ? JSON.parse(JSON.stringify(raw.specifications)) : null,
      codAvailable: true,
      qualityScore: 92,
      metadata: { supplierCode: 'DEODAP', seedDemo: true },
    };
    const saved = product
      ? await prisma.product.update({ where: { id: product.id }, data })
      : await prisma.product.create({ data: { id: raw.id, slug, ...data } });

    const mappings: Array<{ code: string; cost: number }> = [
      { code: 'DEODAP', cost: raw.deodapCost },
      { code: 'MEESHO', cost: raw.meeshoCost },
      { code: 'BHARAT_EXPRESS', cost: raw.bharatCost },
    ];
    for (const m of mappings) {
      const supplierId = supplierByCode.get(m.code);
      if (!supplierId) continue;
      const externalId = `EXT-${m.code}-${raw.id}`;
      await prisma.supplierProduct.upsert({
        where: { supplierId_externalProductId: { supplierId, externalProductId: externalId } },
        create: {
          id: `sp-${raw.id}-${m.code.toLowerCase()}`,
          supplierId,
          productId: saved.id,
          externalProductId: externalId,
          costPrice: m.cost,
          shippingCost: 45,
          stock: 100,
          isAvailable: true,
          leadTimeDays: m.code === 'BHARAT_EXPRESS' ? 2 : 3,
        },
        update: { costPrice: m.cost, productId: saved.id, stock: 100, isAvailable: true },
      });
      await prisma.inventory.upsert({
        where: { productId_supplierId: { productId: saved.id, supplierId } },
        create: {
          id: `inv-${raw.id}-${m.code.toLowerCase()}`,
          productId: saved.id,
          supplierId,
          totalStock: 100,
          availableStock: 100,
          lowStockAlert: 15,
        },
        update: { availableStock: 100, totalStock: 100 },
      });
    }
  }

  console.log('[SEED] Database seeded: settings, pricing rule, categories, suppliers, users, coupons, products, inventory.');
}

// CLI entry: npx tsx server/seed.ts
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error('[SEED] Failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}