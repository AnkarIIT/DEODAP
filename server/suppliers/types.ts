export interface SupplierOrderItemData {
  externalProductId: string;
  quantity: number;
  expectedCost: number;
}

export interface SupplierOrderPayload {
  internalOrderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: SupplierOrderItemData[];
}

export interface SupplierOrderResponse {
  success: boolean;
  externalOrderId?: string;
  trackingNumber?: string;
  carrier?: string;
  status: 'ACCEPTED' | 'REJECTED' | 'MANUAL_PENDING';
  message: string;
  estimatedDispatchDays?: number;
  rawPayload?: any;
}

export interface SupplierTrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  trackingUrl?: string;
  checkpoints: Array<{
    timestamp: string;
    location: string;
    status: string;
  }>;
}

export interface SupplierAdapter {
  supplierCode: string;
  getProducts(): Promise<any[]>;
  getProduct(externalId: string): Promise<any | null>;
  checkStock(externalId: string): Promise<{ inStock: boolean; availableQuantity: number }>;
  createOrder(orderData: SupplierOrderPayload): Promise<SupplierOrderResponse>;
  getOrderStatus(externalOrderId: string): Promise<{ status: string; rawStatus: string }>;
  getTracking(externalOrderId: string): Promise<SupplierTrackingInfo>;
  cancelOrder(externalOrderId: string): Promise<{ success: boolean; message: string }>;
}

export interface SupplierEvaluationResult {
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
  compositeScore: number; // 0-100 calculated rating
  isEligible: boolean;
  ineligibilityReason?: string;
}
