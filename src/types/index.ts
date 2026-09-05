export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  sortOrder: number;
  productCount?: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
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
  codAvailable: boolean;
  // Admin only:
  lowestCostPrice?: number;
  grossMargin?: number;
  marginPercent?: number;
  supplierCount?: number;
}

export interface CartItem {
  productId: string;
  productTitle: string;
  productThumbnail: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'PAID'
  | 'CONFIRMED'
  | 'SUPPLIER_SELECTION'
  | 'SUPPLIER_ORDER_PENDING'
  | 'SUPPLIER_ORDERED'
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

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productThumbnail: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierCost?: number;
  selectedSupplier?: string;
  selectedSupplierId?: string;
}

export interface OrderStatusLog {
  id?: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  note?: string;
  actorRole?: string;
  createdAt: string;
}

export interface OrderShipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  currentStatus: string;
  shippedAt: string;
}

export interface OrderPayment {
  id: string;
  method: string;
  status: string;
  amount: number;
  transactionRef?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: Address;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string;
  totalAmount: number;
  estimatedProfit?: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
  shipments: OrderShipment[];
  statusLogs: OrderStatusLog[];
  supplierOrders?: any[];
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
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
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'RECEIVED' | 'REFUNDED';
  adminNote?: string;
  refundAmount?: number;
  createdAt: string;
}

export interface SupplierEvaluation {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  costPrice: number;
  shippingCost: number;
  landedCost: number;
  stock: number;
  leadTimeDays: number;
  reliabilityScore: number;
  returnScore: number;
  compositeScore: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}
