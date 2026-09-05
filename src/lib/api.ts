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
};
