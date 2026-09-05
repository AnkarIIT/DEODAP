export interface RawSupplierProduct {
  externalId: string;
  title: string;
  handle: string;
  description: string;
  category: string;
  tags: string[];
  vendor?: string;
  images: string[];
  thumbnail: string;
  wholesalePrice: number;
  compareAtPrice?: number;
  inStock: boolean;
  availableQuantity: number;
  variantsCount: number;
  publishedAt?: string;
  rawPayload?: any;
}

export interface SupplierFeedFetchOptions {
  page?: number;
  limit?: number;
  collectionSlug?: string;
}

export interface SupplierFeedResult {
  supplierCode: string;
  supplierName: string;
  products: RawSupplierProduct[];
  totalFoundOnPage: number;
  hasMore: boolean;
  nextPage?: number;
}

export interface SupplierConnector {
  supplierCode: string;
  supplierName: string;
  isFeedPublic: boolean;
  isAuthorizedResale: boolean;
  complianceNotice: string;

  testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }>;
  fetchFeed(options?: SupplierFeedFetchOptions): Promise<SupplierFeedResult>;
}
