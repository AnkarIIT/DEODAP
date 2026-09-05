import { Product, Category, Order, Address, Review, ReturnRequest } from '../types';

const TOKEN_KEY = 'bharatcart_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, phone?: string) =>
    request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }),

  demoLogin: (role: 'ADMIN' | 'CUSTOMER') =>
    request<{ user: any; token: string; message: string }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getMe: () => request<{ user: any }>('/api/auth/me'),

  // Products & Categories
  getProducts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return request<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(`/api/products?${query.toString()}`);
  },

  getProduct: (idOrSlug: string) =>
    request<{
      product: Product;
      reviews: Review[];
      relatedProducts: Product[];
    }>(`/api/products/${idOrSlug}`),

  getCategories: () => request<{ categories: Category[] }>('/api/products/categories/all'),

  checkPincode: (pincode: string) =>
    request<{
      serviceable: boolean;
      pincode: string;
      deliveryDays: string;
      cashOnDelivery: boolean;
      courierPartner: string;
      message: string;
    }>(`/api/products/pincode/check?pincode=${pincode}`),

  // Cart & Pricing Engine
  calculateCart: (items: Array<{ productId: string; quantity: number }>, couponCode?: string, paymentMethod?: string) =>
    request<{
      items: any[];
      subtotal: number;
      shippingFee: number;
      discount: number;
      appliedCoupon: any;
      totalAmount: number;
    }>('/api/cart/calculate', {
      method: 'POST',
      body: JSON.stringify({ items, couponCode, paymentMethod }),
    }),

  applyCoupon: (code: string, subtotal: number) =>
    request<{
      success: boolean;
      coupon: { code: string; discountAmount: number };
      message: string;
    }>('/api/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),

  // Orders
  createOrder: (orderData: {
    items: Array<{ productId: string; quantity: number }>;
    address: Address;
    paymentMethod: string;
    couponCode?: string;
    notes?: string;
  }) =>
    request<{
      success: boolean;
      order: {
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        paymentMethod: string;
        shippingAddress: Address;
      };
      payment: any;
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getOrders: () => request<{ orders: Order[] }>('/api/orders'),

  getOrder: (idOrNumber: string) => request<{ order: Order }>(`/api/orders/${idOrNumber}`),

  cancelOrder: (idOrNumber: string) =>
    request<{ success: boolean; message: string }>(`/api/orders/${idOrNumber}/cancel`, {
      method: 'POST',
    }),

  // Payment
  submitUtr: (orderId: string, utrNumber: string) =>
    request<{ success: boolean; message: string; status: string; utr: string }>('/api/payments/submit-utr', {
      method: 'POST',
      body: JSON.stringify({ orderId, utrNumber }),
    }),

  simulateMockPayment: (orderId: string) =>
    request<{ success: boolean; message: string }>('/api/payments/pay-mock', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),

  // Returns
  createReturn: (data: { orderId: string; reason: string; description?: string; images?: string[] }) =>
    request<{ success: boolean; returnRequest: ReturnRequest; message: string }>('/api/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReturns: () => request<{ returns: ReturnRequest[] }>('/api/returns'),

  // Account
  getAddresses: () => request<{ addresses: Address[] }>('/api/account/addresses'),

  saveAddress: (address: Address) =>
    request<{ address: Address }>('/api/account/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    }),

  addReview: (data: { productId: string; rating: number; title?: string; comment: string }) =>
    request<{ review: Review }>('/api/account/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ADMIN APIS
  admin: {
    getDashboard: () => request<any>('/api/admin/dashboard'),
    getOrders: (params: { status?: string; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.search) q.append('search', params.search);
      return request<{ orders: Order[] }>(`/api/admin/orders?${q.toString()}`);
    },
    getOrderDetails: (id: string) =>
      request<{
        order: Order;
        itemEvaluations: Array<{
          orderItemId: string;
          productId: string;
          productTitle: string;
          quantity: number;
          evaluations: any[];
        }>;
      }>(`/api/admin/orders/${id}`),

    updateOrderStatus: (id: string, status: string, note?: string) =>
      request<{ success: boolean; order: Order }>(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),

    verifyPayment: (id: string, utrNumber?: string, note?: string) =>
      request<{ success: boolean; order: Order; message: string }>(`/api/admin/orders/${id}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ utrNumber, note }),
      }),

    rejectPayment: (id: string, reason?: string) =>
      request<{ success: boolean; order: Order; message: string }>(`/api/admin/orders/${id}/reject-payment`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    dispatchSupplier: (id: string, supplierId?: string, items?: any[]) =>
      request<any>(`/api/admin/orders/${id}/dispatch-supplier`, {
        method: 'POST',
        body: JSON.stringify({ supplierId, items }),
      }),

    recordSupplierOrder: (id: string, supplierOrderId: string, supplierCode: string = 'DEODAP', notes?: string) =>
      request<{ success: boolean; order: Order; message: string }>(`/api/admin/orders/${id}/manual-supplier-order`, {
        method: 'POST',
        body: JSON.stringify({ supplierOrderId, supplierCode, notes }),
      }),

    updateTracking: (id: string, carrier: string, trackingNumber: string, trackingUrl?: string) =>
      request<{ success: boolean; message: string }>(`/api/admin/orders/${id}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify({ carrier, trackingNumber, trackingUrl }),
      }),

    getProducts: () => request<{ products: Product[] }>('/api/admin/products'),

    createProduct: (data: any) =>
      request<{ success: boolean; product: Product }>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateProduct: (id: string, data: any) =>
      request<{ success: boolean; product: Product }>(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteProduct: (id: string) =>
      request<{ success: boolean }>(`/api/admin/products/${id}`, {
        method: 'DELETE',
      }),

    importCSV: (csvData: string, fileName?: string) =>
      request<{ success: boolean; result: any }>('/api/admin/products/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvData, fileName }),
      }),

    getSuppliers: () => request<{ suppliers: any[] }>('/api/admin/suppliers'),

    createSupplier: (data: any) =>
      request<{ success: boolean; supplier: any }>('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    testSupplierConnection: (code: string) =>
      request<any>(`/api/admin/suppliers/${code}/test-connection`, {
        method: 'POST',
      }),

    getInventory: () => request<{ inventory: any[] }>('/api/admin/inventory'),

    adjustInventory: (productId: string, supplierId: string, stockChange: number) =>
      request<{ success: boolean; inventory: any }>('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ productId, supplierId, stockChange }),
      }),

    getReturns: () => request<{ returns: ReturnRequest[] }>('/api/admin/returns'),

    processReturnAction: (id: string, action: string, note?: string, refundAmount?: number) =>
      request<{ success: boolean; message: string }>(`/api/admin/returns/${id}/action`, {
        method: 'PATCH',
        body: JSON.stringify({ action, note, refundAmount }),
      }),

    getPricingRules: () => request<{ rule: any }>('/api/admin/pricing-rules'),

    updatePricingRules: (rules: any) =>
      request<{ success: boolean; rule: any }>('/api/admin/pricing-rules', {
        method: 'POST',
        body: JSON.stringify(rules),
      }),

    getSettings: () => request<{ settings: any }>('/api/admin/settings'),

    updateSettings: (settings: any) =>
      request<{ success: boolean; settings: any }>('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      }),

    reseedDatabase: () =>
      request<{ success: boolean; message: string }>('/api/admin/reseed-database', {
        method: 'POST',
      }),

    getDatabaseStatus: () =>
      request<{
        connected: boolean;
        version?: string;
        database?: string;
        user?: string;
        tableCount?: number;
        tables?: string[];
        error?: string;
      }>('/api/database/status'),

    getCatalogAutomationStatus: () =>
      request<{
        state: any;
        connector: any;
        pricingFormula: any;
        logs: any[];
      }>('/api/admin/catalog-automation/status'),

    syncCatalogAutomation: () =>
      request<{
        success: boolean;
        productsFetched: number;
        eligibleCount: number;
        publishedCount: number;
        createdCount: number;
        updatedCount: number;
        durationMs: number;
        message: string;
        sampleCandidates?: any[];
      }>('/api/admin/catalog-automation/sync', {
        method: 'POST',
      }),

    updateCatalogAutomationConfig: (config: any) =>
      request<{ success: boolean; state: any }>('/api/admin/catalog-automation/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),

    testDeoDapConnection: () =>
      request<{ ok: boolean; message: string; latencyMs?: number }>('/api/admin/catalog-automation/test-connection'),

    previewPricing: (cost: number) =>
      request<{
        costPrice: number;
        sellingPrice: number;
        mrp: number;
        margin: number;
        marginPercent: number;
      }>(`/api/admin/catalog-automation/preview-pricing?cost=${cost}`),
  },
};
