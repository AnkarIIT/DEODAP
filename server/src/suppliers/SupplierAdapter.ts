import { Product, SupplierProduct } from '../types';
import { PricingResult } from '../services/pricingService';

export interface RawSupplierItem {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  url?: string;
  sku?: string;
  weightGrams?: number;
  rating?: number;
}

export interface NormalizedCatalogItem {
  customerProduct: Omit<Product, 'createdAt' | 'updatedAt'>;
  internalSupplierProduct: Omit<SupplierProduct, 'id' | 'lastSyncedAt'>;
}

export interface SupplierAdapter {
  supplierId: string;
  supplierName: string;
  supplierSlug: string;

  /**
   * Fetch supplier items from authorized feed / catalog data
   */
  fetchProducts(limit?: number): Promise<RawSupplierItem[]>;

  /**
   * Normalize raw supplier item into customer Product & internal SupplierProduct
   */
  normalizeProduct(rawItem: RawSupplierItem): NormalizedCatalogItem;

  /**
   * Check real-time stock availability for an item
   */
  checkStock(externalProductId: string): Promise<{ available: boolean; stock: number }>;

  /**
   * Calculate customer pricing using PricingService
   */
  calculatePrice(supplierCost: number): PricingResult;
}
