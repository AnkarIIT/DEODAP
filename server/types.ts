export type Role = 'CUSTOMER' | 'ADMIN' | 'OPERATOR';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'PAID'
  | 'FULFILMENT_PENDING'
  | 'CONFIRMED'
  | 'SUPPLIER_SELECTION'
  | 'SUPPLIER_ORDER_PENDING'
  | 'SUPPLIER_ORDERED'
  | 'SUPPLIER_ORDER_FAILED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'FAILED';

export type PaymentStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'UPI_MANUAL'
  | 'MOCK_GATEWAY'
  | 'COD'
  | 'NETBANKING';

export type IntegrationType =
  | 'MOCK_DEODAP'
  | 'MANUAL_PORTAL'
  | 'OFFICIAL_API'
  | 'CSV_FEED';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'RESTRICTED';

export type SupplierOrderStatus =
  | 'PENDING'
  | 'PLACED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ITEM_RECEIVED'
  | 'REFUNDED';

/**
 * Supplier/catalog automation job status on an order.
 * PENDING -> PROCESSING -> COMPLETED | FAILED
 */
export type AutomationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  priceDiff: number;
  attributes: Record<string, string>;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  mrp: number;
  sellingPrice: number;
  images: string[];
  thumbnail: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  specifications?: Record<string, string>;
  warrantyInfo?: string;
  codAvailable: boolean;
  supplierPrice?: number; // Wholesale supplier cost
  marginAmount?: number; // Profit margin (sellingPrice - supplierPrice)
  qualityScore?: number; // Quality rating score (0-100)
  supplierCode?: string; // 'DEODAP' etc
  supplierProductId?: string; // External product ID from supplier
  supplierHandle?: string; // Supplier slug/handle
  inventoryCount?: number;
  syncTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strict Customer-Facing Product DTO:
 * Supplier fields (supplierPrice, marginAmount, qualityScore, supplierCode, supplierProductId, supplierHandle)
 * do not exist in this schema at all.
 */
export interface CustomerProductDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  mrp: number;
  sellingPrice: number;
  images: string[];
  thumbnail: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  specifications?: Record<string, string>;
  warrantyInfo?: string;
  codAvailable: boolean;
  inventoryCount?: number;
}

export interface CatalogSyncState {
  supplier: string;
  status: 'IDLE' | 'SYNCING' | 'COMPLETED' | 'FAILED';
  lastSyncAt: string | null;
  productsFound: number;
  eligibleCount: number;
  publishedCount: number;
  minQualityScore: number;
  maxPublishLimit: number;
  autoSyncIntervalHours: number;
  lastErrorMessage?: string;
}

export interface CatalogSyncItemResult {
  title: string;
  supplierPrice: number;
  sellingPrice: number;
  margin: number;
  score: number;
  status: 'PUBLISHED' | 'FILTERED';
  reason?: string;
}

export interface CatalogSyncLog {
  id: string;
  timestamp: string;
  supplier: string;
  productsFetched: number;
  eligible: number;
  published: number;
  durationMs: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  summary: string;
  sampleItems?: CatalogSyncItemResult[];
}

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: SupplierStatus;
  integrationType: IntegrationType;
  contactEmail?: string;
  contactPhone?: string;
  reliabilityScore: number;
  avgDeliveryDays: number;
  returnScore: number;
  apiEndpoint?: string;
  notes?: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  externalProductId: string;
  costPrice: number;
  shippingCost: number;
  stock: number;
  isAvailable: boolean;
  leadTimeDays: number;
  lastSyncedAt: string;
  // Included on join:
  supplierName?: string;
  supplierCode?: string;
  reliabilityScore?: number;
  avgDeliveryDays?: number;
  returnScore?: number;
  landedCost?: number;
  compositeScore?: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  supplierId: string;
  productTitle?: string;
  supplierName?: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockAlert: number;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productThumbnail: string;
  variantId?: string;
  variantTitle?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierCost?: number; // ADMIN ONLY
  selectedSupplier?: string; // ADMIN ONLY
  selectedSupplierId?: string; // ADMIN ONLY
}

export interface OrderStatusLog {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  note?: string;
  actorRole: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionRef?: string;
  upiPayerVpa?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  currentStatus: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface SupplierOrder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  supplierProductId?: string;
  externalOrderId?: string;
  status: SupplierOrderStatus;
  wholesaleCost: number;
  shippingCharged: number;
  trackingNumber?: string;
  carrier?: string;
  errorMessage?: string;
  items?: any[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productTitle: string;
  userId: string;
  userName: string;
  reason: string;
  description?: string;
  imageUrl?: string;
  status: ReturnStatus;
  adminNote?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiresAt?: string;
  isActive: boolean;
  usedCount: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressId: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  status: OrderStatus;
  // Flat automation contract fields (mirror of DB columns)
  paymentStatus: string; // PENDING_PAYMENT | PAYMENT_REVIEW | PAID | REFUNDED | FAILED
  automationStatus: AutomationStatus; // PENDING | PROCESSING | COMPLETED | FAILED
  supplierId?: string;
  supplierProductId?: string;
  supplierOrderId?: string;
  supplierOrderStatus?: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string;
  totalAmount: number;
  estimatedProfit?: number; // ADMIN ONLY
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
  statusLogs: OrderStatusLog[];
  supplierOrders: SupplierOrder[];
  returnRequests?: ReturnRequest[];
}

export interface PricingRule {
  defaultMarkupPercent: number; // e.g. 40%
  fixedHandlingFee: number; // e.g. ₹40
  minMarginAmount: number; // e.g. ₹100
  freeShippingThreshold: number; // e.g. ₹999
  standardShippingFee: number; // e.g. ₹49
  codConvenienceFee: number; // e.g. ₹39
  categoryMarkupPercent: Record<string, number>;
}
