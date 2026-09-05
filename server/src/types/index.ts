export type Role = 'CUSTOMER' | 'ADMIN';

export type IntegrationType = 'MANUAL' | 'API' | 'FEED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'PAID'
  | 'FULFILMENT_PENDING'
  | 'SUPPLIER_ORDERED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'REFUNDED'
  | 'SUPPLIER_ORDER_FAILED';

export type PaymentStatus = 'PENDING' | 'REVIEW' | 'VERIFIED' | 'FAILED';

export type PaymentMethod = 'UPI' | 'COD' | 'CARD' | 'NETBANKING';

export type SupplierOrderStatus =
  | 'PENDING'
  | 'ORDERED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Customer-facing Product (supplier info stripped!)
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number; // Selling price
  mrp: number;
  discountPercent: number;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  rating: number;
  reviewCount: number;
  stock: number;
  isPublished: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Internal-only Supplier Product
export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  externalProductId: string;
  supplierPrice: number;
  supplierUrl?: string;
  supplierTitle: string;
  supplierImages: string[];
  stock: number;
  rawData?: any;
  lastSyncedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  integrationType: IntegrationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  quantity: number;
  price: number; // unit selling price
  subtotal: number;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  utr?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface SupplierOrder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName?: string;
  externalOrderId?: string;
  status: SupplierOrderStatus;
  supplierCost: number;
  shippingCost: number;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusLog {
  id: string;
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddressId: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  payment?: Payment;
  supplierOrder?: SupplierOrder;
  statusLogs: OrderStatusLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId?: string;
  reason: string;
  details?: string;
  status: ReturnStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FulfilmentPacket {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{
    title: string;
    quantity: number;
    productId: string;
    externalSupplierSku?: string;
    supplierPrice?: number;
  }>;
  totalCustomerPaid: number;
  estimatedSupplierCost: number;
  supplierName: string;
}
