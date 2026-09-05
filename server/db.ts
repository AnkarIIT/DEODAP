import fs from 'fs';
import path from 'path';
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
} from './types';
import { generateSeedDatabase } from './seedData';
import { initNeonSchema, loadStoreFromNeon, saveStoreToNeon, checkNeonStatus, DbStatus } from './neon';

export interface DatabaseStore {
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  inventory: InventoryItem[];
  users: User[];
  addresses: any[];
  orders: Order[];
  coupons: Coupon[];
  reviews: Review[];
  returnRequests: ReturnRequest[];
  pricingRule: PricingRule;
  settings: Record<string, string>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

class Database {
  private data!: DatabaseStore;
  private neonSyncTimeout: NodeJS.Timeout | null = null;
  private neonConnected: boolean = false;

  constructor() {
    this.init();
    this.initNeon();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure all arrays exist
        if (!this.data.categories || !this.data.products || this.data.products.length === 0) {
          this.reseed();
        } else {
          this.normalizeProductCategories();
        }
      } else {
        this.reseed();
      }
    } catch (err) {
      console.warn('Error reading store.json, reseeding default data...', err);
      this.reseed();
    }
  }

  private async initNeon() {
    try {
      await initNeonSchema();
      this.neonConnected = true;

      // Try loading data from Neon cloud database
      const neonStore = await loadStoreFromNeon();
      if (neonStore && neonStore.products && neonStore.products.length > 0) {
        console.log(`[Neon PostgreSQL] Successfully synced ${neonStore.products.length} products and ${neonStore.orders?.length || 0} orders from Neon cloud.`);
        this.data = neonStore;
        this.normalizeProductCategories();
        // Also save to disk cache
        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (_) {}
      } else {
        console.log('[Neon PostgreSQL] Cloud database is empty, seeding initial store data to Neon...');
        await saveStoreToNeon(this.data);
        console.log('[Neon PostgreSQL] Initial store data seeded into Neon cloud database.');
      }
    } catch (err) {
      console.error('[Neon PostgreSQL] Initialization error:', err);
    }
  }

  public async getNeonDbStatus(): Promise<DbStatus> {
    return checkNeonStatus();
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }

    // Debounced asynchronous sync to Neon PostgreSQL cloud database
    if (this.neonSyncTimeout) {
      clearTimeout(this.neonSyncTimeout);
    }
    this.neonSyncTimeout = setTimeout(async () => {
      try {
        await saveStoreToNeon(this.data);
      } catch (err) {
        console.error('[Neon PostgreSQL] Background sync error:', err);
      }
    }, 400);
  }

  public reseed() {
    const seed = generateSeedDatabase();
    this.data = {
      ...seed,
      settings: {
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
      },
    };
    this.save();
    console.log(`Database seeded with ${this.data.products.length} products, ${this.data.suppliers.length} suppliers.`);
  }

  public normalizeProductCategories() {
    if (!this.data || !this.data.products || !this.data.categories) return;
    for (const p of this.data.products) {
      if (!p.categorySlug || !p.categoryName) {
        const cat = this.data.categories.find(
          (c) => c.id === p.categoryId || c.slug === p.categoryId || c.slug === p.categorySlug
        );
        if (cat) {
          p.categorySlug = cat.slug;
          p.categoryName = cat.name;
          p.categoryId = cat.id;
        } else if (p.categoryId) {
          const match = this.data.categories.find((c) => c.id.includes(p.categoryId) || p.categoryId.includes(c.id));
          if (match) {
            p.categorySlug = match.slug;
            p.categoryName = match.name;
            p.categoryId = match.id;
          }
        }
      }
    }
  }

  // Users
  public getUsers() {
    return this.data.users;
  }

  public findUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: User) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }

  // Addresses
  public getAddresses(userId: string) {
    return this.data.addresses.filter((a) => a.userId === userId);
  }

  public findAddressById(id: string) {
    return this.data.addresses.find((a) => a.id === id);
  }

  public createAddress(address: any) {
    if (address.isDefault) {
      this.data.addresses.forEach((a) => {
        if (a.userId === address.userId) a.isDefault = false;
      });
    }
    this.data.addresses.push(address);
    this.save();
    return address;
  }

  // Categories
  public getCategories() {
    return this.data.categories.filter((c) => c.isActive);
  }

  public findCategoryBySlug(slug: string) {
    return this.data.categories.find((c) => c.slug === slug);
  }

  public createCategory(category: Category) {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  // Products
  public getProducts(filter?: {
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
  }) {
    let list = this.data.products.filter((p) => p.isActive);

    if (filter) {
      if (filter.categoryId && filter.categoryId !== 'all') {
        const catTarget = filter.categoryId.toLowerCase();
        const matchedCat = this.data.categories.find(
          (c) => c.id.toLowerCase() === catTarget || c.slug.toLowerCase() === catTarget
        );
        list = list.filter((p) => {
          if (p.categoryId && p.categoryId.toLowerCase() === catTarget) return true;
          if (p.categorySlug && p.categorySlug.toLowerCase() === catTarget) return true;
          if (matchedCat && (p.categoryId === matchedCat.id || p.categorySlug === matchedCat.slug)) return true;
          return false;
        });
      }
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }
      if (filter.minPrice !== undefined) {
        list = list.filter((p) => p.sellingPrice >= filter.minPrice!);
      }
      if (filter.maxPrice !== undefined) {
        list = list.filter((p) => p.sellingPrice <= filter.maxPrice!);
      }
      if (filter.minRating !== undefined) {
        list = list.filter((p) => p.rating >= filter.minRating!);
      }
      if (filter.isTrending) {
        list = list.filter((p) => p.isTrending);
      }
      if (filter.isBestSeller) {
        list = list.filter((p) => p.isBestSeller);
      }
      if (filter.isNewArrival) {
        list = list.filter((p) => p.isNewArrival);
      }

      // Sorting
      if (filter.sort === 'price_asc') {
        list.sort((a, b) => a.sellingPrice - b.sellingPrice);
      } else if (filter.sort === 'price_desc') {
        list.sort((a, b) => b.sellingPrice - a.sellingPrice);
      } else if (filter.sort === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (filter.sort === 'newest') {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (filter.sort === 'popularity') {
        list.sort((a, b) => b.reviewCount - a.reviewCount);
      }
    }

    return list;
  }

  public findProductByIdOrSlug(identifier: string) {
    return this.data.products.find((p) => p.id === identifier || p.slug === identifier);
  }

  public createProduct(product: Product) {
    this.data.products.push(product);
    this.save();
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.products[idx];
    }
    return null;
  }

  public deleteProduct(id: string) {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.products[idx].isActive = false;
      this.save();
      return true;
    }
    return false;
  }

  // Suppliers & Supplier Products
  public getSuppliers() {
    return this.data.suppliers;
  }

  public findSupplierById(id: string) {
    return this.data.suppliers.find((s) => s.id === id || s.code === id);
  }

  public createSupplier(supplier: Supplier) {
    this.data.suppliers.push(supplier);
    this.save();
    return supplier;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>) {
    const idx = this.data.suppliers.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates };
      this.save();
      return this.data.suppliers[idx];
    }
    return null;
  }

  public getSupplierProducts(productId?: string, supplierId?: string) {
    let list = this.data.supplierProducts;
    if (productId) list = list.filter((sp) => sp.productId === productId);
    if (supplierId) list = list.filter((sp) => sp.supplierId === supplierId);

    // Join supplier details
    return list.map((sp) => {
      const supplier = this.findSupplierById(sp.supplierId);
      const landedCost = sp.costPrice + sp.shippingCost;
      return {
        ...sp,
        supplierName: supplier?.name || 'Unknown Supplier',
        supplierCode: supplier?.code || 'UNKNOWN',
        reliabilityScore: supplier?.reliabilityScore || 90,
        avgDeliveryDays: supplier?.avgDeliveryDays || 4,
        returnScore: supplier?.returnScore || 90,
        landedCost,
      };
    });
  }

  public createSupplierProduct(sp: SupplierProduct) {
    this.data.supplierProducts.push(sp);
    this.save();
    return sp;
  }

  public updateSupplierProduct(id: string, updates: Partial<SupplierProduct>) {
    const idx = this.data.supplierProducts.findIndex((sp) => sp.id === id);
    if (idx !== -1) {
      this.data.supplierProducts[idx] = { ...this.data.supplierProducts[idx], ...updates, lastSyncedAt: new Date().toISOString() };
      this.save();
      return this.data.supplierProducts[idx];
    }
    return null;
  }

  // Inventory
  public getInventory() {
    return this.data.inventory;
  }

  public updateInventoryStock(productId: string, supplierId: string, diff: number) {
    const inv = this.data.inventory.find((i) => i.productId === productId && i.supplierId === supplierId);
    if (inv) {
      inv.availableStock = Math.max(0, inv.availableStock + diff);
      inv.totalStock = inv.availableStock + inv.reservedStock;
      inv.updatedAt = new Date().toISOString();
      this.save();
      return inv;
    }
    return null;
  }

  // Orders
  public getOrders(userId?: string) {
    if (userId) {
      return this.data.orders
        .filter((o) => o.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findOrderByIdOrNumber(identifier: string) {
    return this.data.orders.find((o) => o.id === identifier || o.orderNumber === identifier);
  }

  public createOrder(order: Order) {
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>) {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.orders[idx];
    }
    return null;
  }

  // Order status logs
  public addOrderStatusLog(orderId: string, log: OrderStatusLog) {
    const order = this.findOrderByIdOrNumber(orderId);
    if (order) {
      if (!order.statusLogs) order.statusLogs = [];
      order.statusLogs.push(log);
      this.save();
      return log;
    }
    return null;
  }

  // Payments
  public addPayment(orderId: string, payment: Payment) {
    const order = this.findOrderByIdOrNumber(orderId);
    if (order) {
      if (!order.payments) order.payments = [];
      order.payments.push(payment);
      this.save();
      return payment;
    }
    return null;
  }

  // Shipments
  public addShipment(orderId: string, shipment: Shipment) {
    const order = this.findOrderByIdOrNumber(orderId);
    if (order) {
      if (!order.shipments) order.shipments = [];
      order.shipments.push(shipment);
      this.save();
      return shipment;
    }
    return null;
  }

  // Supplier Orders
  public addSupplierOrder(orderId: string, so: SupplierOrder) {
    const order = this.findOrderByIdOrNumber(orderId);
    if (order) {
      if (!order.supplierOrders) order.supplierOrders = [];
      order.supplierOrders.push(so);
      this.save();
      return so;
    }
    return null;
  }

  // Return Requests
  public getReturnRequests(userId?: string) {
    if (userId) {
      return this.data.returnRequests.filter((r) => r.userId === userId);
    }
    return this.data.returnRequests;
  }

  public createReturnRequest(req: ReturnRequest) {
    this.data.returnRequests.unshift(req);
    this.save();
    return req;
  }

  public updateReturnRequest(id: string, updates: Partial<ReturnRequest>) {
    const idx = this.data.returnRequests.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.data.returnRequests[idx] = { ...this.data.returnRequests[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.returnRequests[idx];
    }
    return null;
  }

  // Coupons
  public findCoupon(code: string) {
    return this.data.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
  }

  public getCoupons() {
    return this.data.coupons;
  }

  public createCoupon(coupon: Coupon) {
    this.data.coupons.push(coupon);
    this.save();
    return coupon;
  }

  // Reviews
  public getReviewsForProduct(productId: string) {
    return this.data.reviews.filter((r) => r.productId === productId);
  }

  public addReview(review: Review) {
    this.data.reviews.unshift(review);
    // Update product rating
    const p = this.data.products.find((prod) => prod.id === review.productId);
    if (p) {
      const prodReviews = this.getReviewsForProduct(review.productId);
      const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
      p.rating = Math.round(avg * 10) / 10;
      p.reviewCount = prodReviews.length;
    }
    this.save();
    return review;
  }

  // Pricing Rule & Settings
  public getPricingRule() {
    return this.data.pricingRule;
  }

  public updatePricingRule(rule: Partial<PricingRule>) {
    this.data.pricingRule = { ...this.data.pricingRule, ...rule };
    this.save();
    return this.data.pricingRule;
  }

  public getSettings() {
    return this.data.settings;
  }

  public updateSetting(key: string, value: string) {
    this.data.settings[key] = value;
    this.save();
    return this.data.settings;
  }
}

export const db = new Database();
