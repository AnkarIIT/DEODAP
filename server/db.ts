import { prisma } from './prisma';
import {
  Category,
  Product,
  Supplier,
  SupplierProduct,
  User,
  Order,
  Coupon,
  Review,
  InventoryItem,
  PricingRule,
  ReturnRequest,
  OrderStatusLog,
  Payment,
  Shipment,
  SupplierOrder,
  Address,
  OrderItem,
} from './types';

/**
 * Database facade backed entirely by Prisma (Neon PostgreSQL).
 *
 * Single source of truth: PostgreSQL via Prisma.
 * No in-memory store, no store.json, no debounced sync.
 * Every method maps PostgreSQL rows to the runtime types used by routes.
 */

const DEFAULTS: Record<string, string> = {
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

const DEFAULT_PRICING_RULE: PricingRule = {
  defaultMarkupPercent: 40,
  fixedHandlingFee: 40,
  minMarginAmount: 100,
  freeShippingThreshold: 499,
  standardShippingFee: 40,
  codConvenienceFee: 39,
  categoryMarkupPercent: {},
};

const iso = (d: Date | null | undefined): string => (d ? new Date(d).toISOString() : new Date().toISOString());

// ---------------------------------------------------------------------------
// Generic parsing helpers
// ---------------------------------------------------------------------------

function mapUser(u: any): User {
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    name: u.name,
    phone: u.phone ?? '',
    role: u.role,
    createdAt: iso(u.createdAt),
    updatedAt: iso(u.updatedAt),
  };
}

function mapProduct(p: any): Product {
  const primarySp: any = Array.isArray(p.supplierProducts) ? p.supplierProducts[0] : undefined;
  const supplier = primarySp?.supplier;
  const metadata: any = p.metadata ?? {};
  const supplierPrice = primarySp?.costPrice ?? 0;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    shortDesc: p.shortDesc ?? undefined,
    categoryId: p.categoryId,
    categorySlug: p.category?.slug,
    categoryName: p.category?.name,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    images: p.images ?? [],
    thumbnail: p.thumbnail,
    badge: p.badge ?? undefined,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isTrending: p.isTrending,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    isActive: p.isActive,
    specifications: p.specifications ?? undefined,
    warrantyInfo: p.warrantyInfo ?? undefined,
    codAvailable: p.codAvailable,
    supplierPrice: supplierPrice || undefined,
    marginAmount: p.sellingPrice - supplierPrice,
    qualityScore: p.qualityScore ?? metadata.qualityScore ?? undefined,
    supplierCode: supplier?.code,
    supplierProductId: primarySp?.externalProductId ?? metadata.supplierProductId,
    supplierHandle: supplier?.slug ?? metadata.supplierHandle,
    inventoryCount: Array.isArray(p.inventory)
      ? p.inventory.reduce((sum: number, i: any) => sum + i.availableStock, 0)
      : undefined,
    syncTimestamp: metadata.syncTimestamp,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

function mapSupplier(s: any): Supplier {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    code: s.code,
    status: s.status,
    integrationType: s.integrationType,
    contactEmail: s.contactEmail ?? undefined,
    contactPhone: s.contactPhone ?? undefined,
    reliabilityScore: s.reliabilityScore,
    avgDeliveryDays: s.avgDeliveryDays,
    returnScore: s.returnScore,
    apiEndpoint: s.apiEndpoint ?? undefined,
    notes: s.notes ?? undefined,
  };
}

function mapSupplierProduct(sp: any): SupplierProduct {
  return {
    id: sp.id,
    supplierId: sp.supplierId,
    productId: sp.productId,
    externalProductId: sp.externalProductId,
    costPrice: sp.costPrice,
    shippingCost: sp.shippingCost,
    stock: sp.stock,
    isAvailable: sp.isAvailable,
    leadTimeDays: sp.leadTimeDays,
    lastSyncedAt: iso(sp.lastSyncedAt),
    supplierName: sp.supplier?.name,
    supplierCode: sp.supplier?.code,
    reliabilityScore: sp.supplier?.reliabilityScore,
    avgDeliveryDays: sp.supplier?.avgDeliveryDays,
    returnScore: sp.supplier?.returnScore,
    landedCost: sp.costPrice + sp.shippingCost,
  };
}

function mapOrderItem(oi: any): any {
  return {
    id: oi.id,
    orderId: oi.orderId,
    productId: oi.productId,
    productTitle: oi.product?.title ?? oi.productTitle ?? '',
    productThumbnail: oi.product?.thumbnail ?? oi.productThumbnail ?? '',
    variantId: oi.variantId ?? undefined,
    variantTitle: oi.variant?.title ?? oi.variantTitle ?? undefined,
    quantity: oi.quantity,
    unitPrice: oi.unitPrice,
    totalPrice: oi.totalPrice,
    supplierCost: oi.supplierCost ?? undefined,
    selectedSupplier: oi.selectedSupplier ?? undefined,
    selectedSupplierId: oi.selectedSupplierId ?? undefined,
  };
}

function mapShipment(sh: any): Shipment {
  return {
    id: sh.id,
    orderId: sh.orderId,
    carrier: sh.carrier,
    trackingNumber: sh.trackingNumber,
    trackingUrl: sh.trackingUrl ?? undefined,
    currentStatus: sh.currentStatus,
    estimatedDelivery: sh.estimatedDelivery ? iso(sh.estimatedDelivery) : undefined,
    shippedAt: sh.shippedAt ? iso(sh.shippedAt) : undefined,
    deliveredAt: sh.deliveredAt ? iso(sh.deliveredAt) : undefined,
    createdAt: iso(sh.createdAt),
  };
}

function mapSupplierOrder(so: any): SupplierOrder {
  return {
    id: so.id,
    orderId: so.orderId,
    supplierId: so.supplierId,
    supplierName: so.supplier?.name ?? '',
    supplierProductId: so.supplierProductId ?? undefined,
    externalOrderId: so.externalOrderId ?? undefined,
    status: so.status,
    wholesaleCost: so.wholesaleCost,
    shippingCharged: so.shippingCharged,
    trackingNumber: so.trackingNumber ?? undefined,
    carrier: so.carrier ?? undefined,
    errorMessage: so.errorMessage ?? undefined,
    items: so.items ?? undefined,
    notes: so.notes ?? undefined,
    createdAt: iso(so.createdAt),
    updatedAt: iso(so.updatedAt),
  };
}

function mapReturnRequest(r: any): ReturnRequest {
  return {
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order?.orderNumber ?? '',
    orderItemId: r.orderItemId,
    productTitle: r.orderItem?.product?.title ?? '',
    userId: r.userId,
    userName: r.user?.name ?? '',
    reason: r.reason,
    description: r.description ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    status: r.status,
    adminNote: r.adminNote ?? undefined,
    refundAmount: r.refundAmount ?? undefined,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    customerName: o.customerName ?? o.user?.name,
    customerEmail: o.user?.email,
    customerPhone: o.phone ?? o.user?.phone ?? undefined,
    addressId: o.addressId,
    shippingAddress: {
      fullName: o.customerName ?? o.deliveryAddress?.fullName ?? o.user?.name ?? '',
      phone: o.phone ?? o.deliveryAddress?.phone ?? o.user?.phone ?? '',
      street: o.address ?? o.deliveryAddress?.street ?? '',
      city: o.city ?? o.deliveryAddress?.city ?? '',
      state: o.state ?? o.deliveryAddress?.state ?? '',
      pincode: o.pincode ?? o.deliveryAddress?.pincode ?? '',
      landmark: o.deliveryAddress?.landmark ?? undefined,
    },
    status: o.orderStatus,
    paymentStatus: o.paymentStatus ?? 'PENDING_PAYMENT',
    automationStatus: o.automationStatus ?? 'PENDING',
    supplierId: o.supplierId ?? undefined,
    supplierProductId: o.supplierProductId ?? undefined,
    supplierOrderId: o.supplierOrderId ?? undefined,
    supplierOrderStatus: o.supplierOrderStatus ?? undefined,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount,
    couponCode: o.couponCode ?? undefined,
    totalAmount: o.totalAmount,
    estimatedProfit: o.estimatedProfit ?? undefined,
    paymentMethod: o.paymentMethod,
    notes: o.notes ?? undefined,
    createdAt: iso(o.createdAt),
    updatedAt: iso(o.updatedAt),
    items: (o.items ?? []).map(mapOrderItem),
    payments: (o.payments ?? []).map((pay: any) => ({
      id: pay.id,
      orderId: pay.orderId,
      method: pay.method,
      status: pay.status,
      amount: pay.amount,
      currency: pay.currency,
      transactionRef: pay.transactionRef ?? undefined,
      upiPayerVpa: pay.upiPayerVpa ?? undefined,
      verifiedBy: pay.verifiedBy ?? undefined,
      verifiedAt: pay.verifiedAt ? iso(pay.verifiedAt) : undefined,
      notes: pay.notes ?? undefined,
      createdAt: iso(pay.createdAt),
    })),
    shipments: (o.shipments ?? []).map(mapShipment),
    statusLogs: (o.statusLogs ?? []).map((log: any) => ({
      id: log.id,
      orderId: log.orderId,
      fromStatus: log.fromStatus ?? undefined,
      toStatus: log.toStatus,
      note: log.note ?? undefined,
      actorRole: log.actorRole,
      createdAt: iso(log.createdAt),
    })),
    supplierOrders: (o.supplierOrders ?? []).map(mapSupplierOrder),
    returnRequests: o.returnRequests ? (o.returnRequests as any[]).map(mapReturnRequest) : undefined,
  };
}

const ORDER_INCLUDE = {
  user: true,
  deliveryAddress: true,
  items: { include: { product: true, variant: true } },
  payments: true,
  shipments: true,
  statusLogs: true,
  supplierOrders: { include: { supplier: true } },
  returnRequests: { include: { user: true, orderItem: { include: { product: true } } } },
} as const;

const PRODUCT_INCLUDE = {
  category: true,
  supplierProducts: { include: { supplier: true }, orderBy: { costPrice: 'asc' } },
  inventory: true,
} as const;

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

class Database {
  // NeonDB status (safe, no secrets leaked)
  public async getNeonDbStatus() {
    try {
      const rows: any = await prisma.$queryRaw`SELECT version() AS version`;
      const version: string = rows?.[0]?.version ?? 'unknown';
      const tableRes: any = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
      const tableCount = tableRes?.length ?? 0;
      return {
        connected: true,
        version,
        database: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) || 'neondb' : 'neondb',
        user: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : 'owner',
        tableCount,
        tables: (tableRes ?? []).map((r: any) => r.table_name),
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  // ------------------------------------------------------------------ Users
  public async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(mapUser);
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return u ? mapUser(u) : null;
  }

  public async findUserById(id: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? mapUser(u) : null;
  }

  public async createUser(user: User): Promise<User> {
    const u = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role as any,
      },
    });
    return mapUser(u);
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const u = await prisma.user.update({
      where: { id },
      data: { ...updates, updatedAt: new Date() } as any,
    });
    return mapUser(u);
  }

  // --------------------------------------------------------------- Addresses
  public async getAddresses(userId: string): Promise<Address[]> {
    const rows = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((a: any) => ({
      id: a.id,
      userId: a.userId,
      fullName: a.fullName,
      phone: a.phone,
      street: a.street,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      landmark: a.landmark ?? undefined,
      isDefault: a.isDefault,
      createdAt: iso(a.createdAt),
    }));
  }

  public async findAddressById(id: string): Promise<Address | null> {
    const a = await prisma.address.findUnique({ where: { id } });
    return a ? mapAddress(a) : null;
  }

  public async createAddress(address: Address): Promise<Address> {
    if (address.isDefault) {
      await prisma.address.updateMany({ where: { userId: address.userId }, data: { isDefault: false } });
    }
    const a = await prisma.address.create({
      data: {
        id: address.id,
        userId: address.userId,
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark ?? null,
        isDefault: address.isDefault,
      },
    });
    return mapAddress(a);
  }

  // -------------------------------------------------------------- Categories
  public async getCategories(): Promise<Category[]> {
    const cats = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return cats.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? undefined,
      imageUrl: c.imageUrl ?? undefined,
      icon: c.icon ?? undefined,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
    }));
  }

  public async findCategoryBySlug(slug: string): Promise<Category | null> {
    const c = await prisma.category.findUnique({ where: { slug } });
    return c ? mapCategory(c) : null;
  }

  public async createCategory(category: Category): Promise<Category> {
    const c = await prisma.category.create({
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        imageUrl: category.imageUrl ?? null,
        icon: category.icon ?? null,
        sortOrder: category.sortOrder ?? 0,
        isActive: category.isActive ?? true,
      },
    });
    return mapCategory(c);
  }

  // --------------------------------------------------------------- Products
  public async getProducts(filter?: {
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStockOnly?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    sort?: string;
  }): Promise<Product[]> {
    const where: any = { isActive: true };
    if (filter?.categoryId && filter.categoryId !== 'all') {
      const cat = await prisma.category.findFirst({
        where: { OR: [{ id: filter.categoryId }, { slug: filter.categoryId.toLowerCase() }] },
      });
      if (cat) where.categoryId = cat.id;
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (filter?.minPrice !== undefined) where.sellingPrice = { ...(where.sellingPrice ?? {}), gte: filter.minPrice };
    if (filter?.maxPrice !== undefined) where.sellingPrice = { ...(where.sellingPrice ?? {}), lte: filter.maxPrice };
    if (filter?.minRating !== undefined) where.rating = { gte: filter.minRating };
    if (filter?.isTrending) where.isTrending = true;
    if (filter?.isBestSeller) where.isBestSeller = true;
    if (filter?.isNewArrival) where.isNewArrival = true;

    let orderBy: any = { createdAt: 'desc' };
    if (filter?.sort === 'price_asc') orderBy = { sellingPrice: 'asc' };
    else if (filter?.sort === 'price_desc') orderBy = { sellingPrice: 'desc' };
    else if (filter?.sort === 'rating') orderBy = { rating: 'desc' };
    else if (filter?.sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (filter?.sort === 'popularity') orderBy = { reviewCount: 'desc' };

    const rows = await prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy });
    return rows.map(mapProduct);
  }

  public async findProductByIdOrSlug(identifier: string): Promise<Product | null> {
    const p = await prisma.product.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }] },
      include: PRODUCT_INCLUDE,
    });
    return p ? mapProduct(p) : null;
  }

  public async createProduct(product: Product): Promise<Product> {
    if (!product.categoryId) {
      throw new Error('createProduct requires a valid categoryId.');
    }
    const p = await prisma.product.create({
      data: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description ?? '',
        shortDesc: product.shortDesc ?? null,
        vendor: (product.supplierCode || product.supplierHandle) ?? null,
        categoryId: product.categoryId,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        images: product.images ?? [],
        thumbnail: product.thumbnail,
        badge: product.badge ?? null,
        rating: product.rating ?? 4.5,
        reviewCount: product.reviewCount ?? 0,
        isTrending: product.isTrending ?? false,
        isBestSeller: product.isBestSeller ?? false,
        isNewArrival: product.isNewArrival ?? false,
        isActive: product.isActive ?? true,
        specifications: (product.specifications as any) ?? null,
        warrantyInfo: product.warrantyInfo ?? null,
        codAvailable: product.codAvailable ?? true,
        qualityScore: product.qualityScore ?? null,
        metadata: {
          ...(product.supplierCode ? { supplierCode: product.supplierCode } : {}),
          ...(product.supplierHandle ? { supplierHandle: product.supplierHandle } : {}),
          ...(product.supplierProductId ? { supplierProductId: product.supplierProductId } : {}),
          ...(product.syncTimestamp ? { syncTimestamp: product.syncTimestamp } : {}),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    // Attach supplier mapping if a wholesale price was supplied
    if (typeof product.supplierPrice === 'number' && product.supplierPrice > 0) {
      const supplier = await prisma.supplier.findFirst({
        where: { OR: [{ code: product.supplierCode ?? '' }, { name: 'DeoDap Wholesale Surat' }] },
      });
      if (supplier) {
        await prisma.supplierProduct.create({
          data: {
            id: `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            supplierId: supplier.id,
            productId: p.id,
            externalProductId: product.supplierProductId ?? p.slug,
            costPrice: product.supplierPrice,
            shippingCost: 45,
            stock: 100,
            isAvailable: true,
            leadTimeDays: 3,
          },
        });
      }
    }
    return mapProduct(p);
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const data: any = { ...updates, updatedAt: new Date() };
    delete data.id;
    delete data.categoryId;
    delete data.supplierProducts;
    if ('images' in data) data.images = updates.images ?? [];
    if (updates.supplierCode || updates.supplierProductId || updates.syncTimestamp) {
      data.metadata = {
        ...((updates as any).metadata ?? {}),
        ...(updates.supplierCode ? { supplierCode: updates.supplierCode } : {}),
        ...(updates.supplierProductId ? { supplierProductId: updates.supplierProductId } : {}),
        ...(updates.syncTimestamp ? { syncTimestamp: updates.syncTimestamp } : {}),
      };
      delete data.supplierCode;
      delete data.supplierProductId;
      delete data.syncTimestamp;
    }
    const p = await prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });
    return mapProduct(p);
  }

  public async deleteProduct(id: string): Promise<boolean> {
    await prisma.product.update({ where: { id }, data: { isActive: false, updatedAt: new Date() } });
    return true;
  }

  // --------------------------------------------------------------- Suppliers
  public async getSuppliers(): Promise<Supplier[]> {
    const rows = await prisma.supplier.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(mapSupplier);
  }

  public async findSupplierById(id: string): Promise<Supplier | null> {
    const s = await prisma.supplier.findFirst({ where: { OR: [{ id }, { code: id }] } });
    return s ? mapSupplier(s) : null;
  }

  public async createSupplier(supplier: Supplier): Promise<Supplier> {
    const s = await prisma.supplier.create({
      data: {
        id: supplier.id,
        name: supplier.name,
        slug: supplier.slug,
        code: supplier.code.toUpperCase(),
        status: (supplier.status as any) ?? 'ACTIVE',
        integrationType: (supplier.integrationType as any) ?? 'MOCK_DEODAP',
        contactEmail: supplier.contactEmail ?? null,
        contactPhone: supplier.contactPhone ?? null,
        reliabilityScore: supplier.reliabilityScore ?? 90,
        avgDeliveryDays: supplier.avgDeliveryDays ?? 4,
        returnScore: supplier.returnScore ?? 90,
        apiEndpoint: (supplier as any).apiEndpoint ?? null,
        notes: supplier.notes ?? null,
      },
    });
    return mapSupplier(s);
  }

  public async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const data: any = { ...updates, updatedAt: new Date() };
    delete data.id;
    const s = await prisma.supplier.update({ where: { id }, data });
    return mapSupplier(s);
  }

  // ------------------------------------------------------- SupplierProducts
  public async getSupplierProducts(productId?: string, supplierId?: string): Promise<SupplierProduct[]> {
    const where: any = {};
    if (productId) where.productId = productId;
    if (supplierId) where.supplierId = supplierId;
    const rows = await prisma.supplierProduct.findMany({
      where,
      include: { supplier: true },
      orderBy: { costPrice: 'asc' },
    });
    return rows.map(mapSupplierProduct);
  }

  public async createSupplierProduct(sp: SupplierProduct): Promise<SupplierProduct> {
    const row = await prisma.supplierProduct.create({
      data: {
        id: sp.id,
        supplierId: sp.supplierId,
        productId: sp.productId,
        externalProductId: sp.externalProductId,
        costPrice: sp.costPrice,
        shippingCost: sp.shippingCost ?? 45,
        stock: sp.stock ?? 100,
        isAvailable: sp.isAvailable ?? true,
        leadTimeDays: sp.leadTimeDays ?? 3,
        lastSyncedAt: sp.lastSyncedAt ? new Date(sp.lastSyncedAt) : new Date(),
      },
      include: { supplier: true },
    });
    return mapSupplierProduct(row);
  }

  public async updateSupplierProduct(id: string, updates: Partial<SupplierProduct>): Promise<SupplierProduct | null> {
    const data: any = { ...updates, lastSyncedAt: new Date() };
    delete data.id;
    delete data.supplierId;
    delete data.productId;
    const row = await prisma.supplierProduct.update({
      where: { id },
      data,
      include: { supplier: true },
    });
    return mapSupplierProduct(row);
  }

  // --------------------------------------------------------------- Inventory
  public async getInventory(): Promise<InventoryItem[]> {
    const rows = await prisma.inventory.findMany({ include: { product: true, supplier: true } });
    return rows.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      supplierId: i.supplierId,
      productTitle: i.product?.title,
      supplierName: i.supplier?.name,
      totalStock: i.totalStock,
      reservedStock: i.reservedStock,
      availableStock: i.availableStock,
      lowStockAlert: i.lowStockAlert,
      updatedAt: iso(i.updatedAt),
    }));
  }

  public async updateInventoryStock(productId: string, supplierId: string, diff: number): Promise<InventoryItem | null> {
    const inv = await prisma.inventory.findUnique({
      where: { productId_supplierId: { productId, supplierId } },
    });
    if (!inv) return null;
    const availableStock = Math.max(0, inv.availableStock + diff);
    const updated = await prisma.inventory.update({
      where: { id: inv.id },
      data: { availableStock, totalStock: availableStock + inv.reservedStock, updatedAt: new Date() },
      include: { product: true, supplier: true },
    });
    return {
      id: updated.id,
      productId: updated.productId,
      supplierId: updated.supplierId,
      productTitle: (updated as any).product?.title,
      supplierName: (updated as any).supplier?.name,
      totalStock: updated.totalStock,
      reservedStock: updated.reservedStock,
      availableStock: updated.availableStock,
      lowStockAlert: updated.lowStockAlert,
      updatedAt: iso(updated.updatedAt),
    };
  }

  // ---------------------------------------------------------------- Orders
  public async getOrders(userId?: string): Promise<Order[]> {
    const where = userId ? { userId } : {};
    const rows = await prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
    return rows.map(mapOrder);
  }

  public async findOrderByIdOrNumber(identifier: string): Promise<Order | null> {
    const o = await prisma.order.findFirst({
      where: { OR: [{ id: identifier }, { orderNumber: identifier }] },
      include: ORDER_INCLUDE,
    });
    return o ? mapOrder(o) : null;
  }

  public async createOrder(order: Order): Promise<Order> {
    const created = await prisma.order.create({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        addressId: order.addressId,
        // Flat automation contract snapshot
        customerName: order.customerName ?? null,
        phone: order.customerPhone ?? null,
        address: order.shippingAddress?.street ?? null,
        city: order.shippingAddress?.city ?? null,
        state: order.shippingAddress?.state ?? null,
        pincode: order.shippingAddress?.pincode ?? null,
        paymentStatus: order.paymentStatus ?? 'PENDING_PAYMENT',
        orderStatus: order.status as any,
        automationStatus: order.automationStatus ?? 'PENDING',
        supplierId: order.supplierId ?? null,
        supplierProductId: order.supplierProductId ?? null,
        supplierOrderId: order.supplierOrderId ?? null,
        supplierOrderStatus: order.supplierOrderStatus ?? null,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        couponCode: order.couponCode ?? null,
        totalAmount: order.totalAmount,
        estimatedProfit: order.estimatedProfit
          ?? order.items.reduce((sum, i) => sum + ((i.supplierCost ?? 0) * i.quantity), 0),
        paymentMethod: order.paymentMethod as any,
        notes: order.notes ?? null,
        items: {
          create: order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            supplierCost: i.supplierCost ?? null,
            selectedSupplier: i.selectedSupplier ?? null,
            selectedSupplierId: i.selectedSupplierId ?? null,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
    return mapOrder(created);
  }

  public async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    const data: any = { updatedAt: new Date() };
    // Map runtime status -> DB orderStatus column
    if (updates.status !== undefined) data.orderStatus = updates.status as any;
    // Flat automation contract fields pass through directly
    for (const key of [
      'paymentStatus',
      'automationStatus',
      'supplierId',
      'supplierProductId',
      'supplierOrderId',
      'supplierOrderStatus',
      'customerName',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
    ] as const) {
      if ((updates as any)[key] !== undefined) data[key] = (updates as any)[key];
    }
    // Other scalar updates (totals, notes, etc.)
    for (const key of [
      'subtotal',
      'shippingFee',
      'discount',
      'couponCode',
      'totalAmount',
      'estimatedProfit',
      'paymentMethod',
      'notes',
    ] as const) {
      if ((updates as any)[key] !== undefined) data[key] = (updates as any)[key];
    }
    const o = await prisma.order.update({ where: { id }, data, include: ORDER_INCLUDE });
    return mapOrder(o);
  }

  // --------------------------------------------------------- Order StatusLog
  public async addOrderStatusLog(orderId: string, log: OrderStatusLog): Promise<OrderStatusLog | null> {
    const row = await prisma.orderStatusLog.create({
      data: {
        id: log.id,
        orderId,
        fromStatus: (log.fromStatus as any) ?? null,
        toStatus: log.toStatus as any,
        note: log.note ?? null,
        actorRole: log.actorRole ?? 'SYSTEM',
      },
    });
    return {
      id: row.id,
      orderId: row.orderId,
      fromStatus: row.fromStatus as any,
      toStatus: row.toStatus as any,
      note: row.note ?? undefined,
      actorRole: row.actorRole,
      createdAt: iso(row.createdAt),
    };
  }

  // ---------------------------------------------------------------- Payments
  public async addPayment(orderId: string, payment: Payment): Promise<Payment | null> {
    const row = await prisma.payment.create({
      data: {
        id: payment.id,
        orderId,
        method: payment.method as any,
        status: payment.status as any,
        amount: payment.amount,
        currency: payment.currency ?? 'INR',
        transactionRef: payment.transactionRef ?? null,
        upiPayerVpa: (payment as any).upiPayerVpa ?? null,
        verifiedBy: payment.verifiedBy ?? null,
        verifiedAt: payment.verifiedAt ? new Date(payment.verifiedAt) : null,
        notes: payment.notes ?? null,
      },
    });
    return {
      id: row.id,
      orderId: row.orderId,
      method: row.method as any,
      status: row.status as any,
      amount: row.amount,
      currency: row.currency,
      transactionRef: row.transactionRef ?? undefined,
      upiPayerVpa: (row as any).upiPayerVpa ?? undefined,
      verifiedBy: row.verifiedBy ?? undefined,
      verifiedAt: row.verifiedAt ? iso(row.verifiedAt) : undefined,
      notes: row.notes ?? undefined,
      createdAt: iso(row.createdAt),
    };
  }

  public async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment | null> {
    const data: any = { ...updates, updatedAt: new Date() };
    delete data.id;
    delete data.orderId;
    const row = await prisma.payment.update({ where: { id: paymentId }, data });
    return {
      id: row.id,
      orderId: row.orderId,
      method: row.method as any,
      status: row.status as any,
      amount: row.amount,
      currency: row.currency,
      transactionRef: row.transactionRef ?? undefined,
      upiPayerVpa: (row as any).upiPayerVpa ?? undefined,
      verifiedBy: row.verifiedBy ?? undefined,
      verifiedAt: row.verifiedAt ? iso(row.verifiedAt) : undefined,
      notes: row.notes ?? undefined,
      createdAt: iso(row.createdAt),
    };
  }

  // Persist per-item supplier assignments (supplierCost, selectedSupplier...)
  public async updateOrderItems(orderId: string, items: Array<Partial<OrderItem>>): Promise<void> {
    for (const item of items) {
      if (!item.id) continue;
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          supplierCost: item.supplierCost ?? null,
          selectedSupplier: item.selectedSupplier ?? null,
          selectedSupplierId: item.selectedSupplierId ?? null,
        },
      });
    }
  }

  // --------------------------------------------------------------- Shipments
  public async addShipment(orderId: string, shipment: Shipment): Promise<Shipment | null> {
    const row = await prisma.shipment.create({
      data: {
        id: shipment.id,
        orderId,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl ?? null,
        currentStatus: shipment.currentStatus ?? 'Shipment manifest created',
        estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery) : null,
        shippedAt: shipment.shippedAt ? new Date(shipment.shippedAt) : null,
        deliveredAt: shipment.deliveredAt ? new Date(shipment.deliveredAt) : null,
      },
    });
    return mapShipment(row);
  }

  // ---------------------------------------------------------- SupplierOrders
  public async addSupplierOrder(orderId: string, so: SupplierOrder): Promise<SupplierOrder | null> {
    const row = await prisma.supplierOrder.create({
      data: {
        id: so.id,
        orderId,
        supplierId: so.supplierId,
        supplierProductId: so.supplierProductId ?? null,
        externalOrderId: so.externalOrderId ?? null,
        status: so.status as any,
        wholesaleCost: so.wholesaleCost,
        shippingCharged: so.shippingCharged,
        trackingNumber: so.trackingNumber ?? null,
        carrier: so.carrier ?? null,
        errorMessage: so.errorMessage ?? null,
        items: (so.items as any) ?? null,
        notes: so.notes ?? null,
      },
      include: { supplier: true },
    });
    return mapSupplierOrder(row);
  }

  // ---------------------------------------------------------- ReturnRequests
  public async getReturnRequests(userId?: string): Promise<ReturnRequest[]> {
    const where = userId ? { userId } : {};
    const rows = await prisma.returnRequest.findMany({
      where,
      include: { user: true, order: true, orderItem: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapReturnRequest);
  }

  public async createReturnRequest(req: ReturnRequest): Promise<ReturnRequest> {
    const row = await prisma.returnRequest.create({
      data: {
        id: req.id,
        orderId: req.orderId,
        orderItemId: req.orderItemId,
        userId: req.userId,
        reason: req.reason,
        description: req.description ?? null,
        imageUrl: req.imageUrl ?? null,
        status: req.status as any,
        adminNote: req.adminNote ?? null,
        refundAmount: req.refundAmount ?? null,
      },
      include: { user: true, order: true, orderItem: { include: { product: true } } },
    });
    return mapReturnRequest(row);
  }

  public async updateReturnRequest(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | null> {
    const data: any = { ...updates, updatedAt: new Date() };
    delete data.id;
    delete data.orderId;
    delete data.orderNumber;
    delete data.orderItemId;
    delete data.productTitle;
    delete data.userId;
    delete data.userName;
    const row = await prisma.returnRequest.update({
      where: { id },
      data,
      include: { user: true, order: true, orderItem: { include: { product: true } } },
    });
    return mapReturnRequest(row);
  }

  // ---------------------------------------------------------------- Coupons
  public async findCoupon(code: string): Promise<Coupon | null> {
    const c = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return c ? mapCoupon(c) : null;
  }

  public async getCoupons(): Promise<Coupon[]> {
    const rows = await prisma.coupon.findMany();
    return rows.map(mapCoupon);
  }

  public async createCoupon(coupon: Coupon): Promise<Coupon> {
    const row = await prisma.coupon.create({
      data: {
        id: coupon.id,
        code: coupon.code.toUpperCase(),
        discountPercent: coupon.discountPercent ?? null,
        discountAmount: coupon.discountAmount ?? null,
        minOrderValue: coupon.minOrderValue ?? 0,
        maxDiscount: coupon.maxDiscount ?? null,
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt) : null,
        isActive: coupon.isActive ?? true,
        usedCount: coupon.usedCount ?? 0,
      },
    });
    return mapCoupon(row);
  }

  // ---------------------------------------------------------------- Reviews
  public async getReviewsForProduct(productId: string): Promise<Review[]> {
    const rows = await prisma.review.findMany({
      where: { productId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      userName: r.user?.name ?? '',
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: iso(r.createdAt),
    }));
  }

  public async addReview(review: Review): Promise<Review> {
    return prisma.$transaction(async (tx) => {
      const row = await tx.review.create({
        data: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          verifiedPurchase: review.verifiedPurchase ?? true,
        },
        include: { user: true },
      });
      const agg = await tx.review.aggregate({
        where: { productId: review.productId },
        _count: true,
        _avg: { rating: true },
      });
      await tx.product.update({
        where: { id: review.productId },
        data: { rating: Math.round((agg._avg.rating || 0) * 10) / 10, reviewCount: agg._count },
      });
      return {
        id: row.id,
        productId: row.productId,
        userId: row.userId,
        userName: (row as any).user?.name ?? '',
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        verifiedPurchase: row.verifiedPurchase,
        createdAt: iso(row.createdAt),
      };
    });
  }

  // -------------------------------------------------------- Pricing / Settings
  public async getPricingRule(): Promise<PricingRule> {
    const setting = await prisma.setting.findUnique({ where: { key: 'pricing_rule' } });
    if (!setting?.value) return { ...DEFAULT_PRICING_RULE };
    try {
      return { ...DEFAULT_PRICING_RULE, ...JSON.parse(setting.value) };
    } catch {
      return { ...DEFAULT_PRICING_RULE };
    }
  }

  public async updatePricingRule(rule: Partial<PricingRule>): Promise<PricingRule> {
    const current = await this.getPricingRule();
    const next = { ...current, ...rule };
    await prisma.setting.upsert({
      where: { key: 'pricing_rule' },
      create: { key: 'pricing_rule', value: JSON.stringify(next), description: 'Pricing engine configuration' },
      update: { value: JSON.stringify(next) },
    });
    return next;
  }

  public async getSettings(): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany();
    const map = { ...DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  public async updateSetting(key: string, value: string): Promise<Record<string, string>> {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value, description: null },
      update: { value },
    });
    return this.getSettings();
  }
}

function mapAddress(a: any): Address {
  return {
    id: a.id,
    userId: a.userId,
    fullName: a.fullName,
    phone: a.phone,
    street: a.street,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    landmark: a.landmark ?? undefined,
    isDefault: a.isDefault,
    createdAt: iso(a.createdAt),
  };
}

function mapCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    imageUrl: c.imageUrl ?? undefined,
    icon: c.icon ?? undefined,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };
}

function mapCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    discountPercent: c.discountPercent ?? undefined,
    discountAmount: c.discountAmount ?? undefined,
    minOrderValue: c.minOrderValue,
    maxDiscount: c.maxDiscount ?? undefined,
    expiresAt: c.expiresAt ? iso(c.expiresAt) : undefined,
    isActive: c.isActive,
    usedCount: c.usedCount,
  };
}

export const db = new Database();