import { db } from '../db';
import { Supplier, SupplierProduct } from '../types';
import {
  SupplierAdapter,
  SupplierEvaluationResult,
  SupplierOrderPayload,
  SupplierOrderResponse,
} from './types';
import { MockDeoDapAdapter } from './MockDeoDapAdapter';
import { ManualSupplierAdapter } from './ManualSupplierAdapter';

export class SupplierRouter {
  private adapters: Map<string, SupplierAdapter> = new Map();
  private deodapAdapter = new MockDeoDapAdapter();
  private manualAdapter = new ManualSupplierAdapter();

  constructor() {
    this.adapters.set('DEODAP', this.deodapAdapter);
    this.adapters.set('MEESHO', this.deodapAdapter); // Uses same standardized dropship protocol for MVP
    this.adapters.set('BHARAT_EXPRESS', this.manualAdapter);
  }

  public getAdapter(supplierCode: string): SupplierAdapter {
    return this.adapters.get(supplierCode) || this.manualAdapter;
  }

  /**
   * Evaluate all available suppliers for a given product and quantity.
   * Considers: Landed Cost (cost + shipping), Stock, Delivery Speed, Reliability, and Return Score.
   */
  public async evaluateSuppliersForProduct(
    productId: string,
    quantity: number = 1
  ): Promise<SupplierEvaluationResult[]> {
    const mappings = await db.getSupplierProducts(productId);
    if (!mappings || mappings.length === 0) {
      return [];
    }

    // Find lowest landed cost across all options to establish cost baseline
    const landedCosts = mappings.map((m) => m.costPrice + m.shippingCost);
    const minLandedCost = Math.min(...landedCosts);

    const evaluated: SupplierEvaluationResult[] = [];
    for (const sp of mappings) {
      const supplier = await db.findSupplierById(sp.supplierId);
      const landedCost = sp.costPrice + sp.shippingCost;

      const isStockSufficient = sp.stock >= quantity && sp.isAvailable;
      const isSupplierActive = supplier?.status === 'ACTIVE';
      const isEligible = isStockSufficient && isSupplierActive;

      let ineligibilityReason = '';
      if (!isSupplierActive) ineligibilityReason = 'Supplier inactive or restricted';
      else if (!sp.isAvailable) ineligibilityReason = 'Product temporarily delisted by supplier';
      else if (sp.stock < quantity) ineligibilityReason = `Insufficient stock (Available: ${sp.stock}, Needed: ${quantity})`;

      // Multi-factor Scoring Algorithm (Weighted 0 to 100):
      // 1. Cost Score (35% weight): Ratio relative to cheapest available landed cost
      const costScore = (minLandedCost / landedCost) * 100;

      // 2. Delivery Speed Score (25% weight): 1-2 days = 100, 3-4 days = 85, 5-6 days = 70, 7+ days = 50
      const deliveryScore = Math.max(30, 110 - sp.leadTimeDays * 12);

      // 3. Reliability Score (25% weight): Historic fulfillment accuracy
      const reliabilityScore = supplier?.reliabilityScore || 90;

      // 4. Return Score (15% weight): Quality satisfaction rating
      const returnScore = supplier?.returnScore || 90;

      // Weighted Composite Score
      const compositeScore = Math.round(
        costScore * 0.35 + deliveryScore * 0.25 + reliabilityScore * 0.25 + returnScore * 0.15
      );

      const evaluatedResult: SupplierEvaluationResult = {
        supplierId: sp.supplierId,
        supplierName: supplier?.name || sp.supplierName || 'Unknown Wholesale Vendor',
        supplierCode: supplier?.code || sp.supplierCode || 'SUPPLIER',
        costPrice: sp.costPrice,
        shippingCost: sp.shippingCost,
        landedCost,
        stock: sp.stock,
        leadTimeDays: sp.leadTimeDays,
        reliabilityScore,
        returnScore,
        compositeScore,
        isEligible,
        ineligibilityReason: ineligibilityReason || undefined,
      };
      evaluated.push(evaluatedResult);
    }

    // Sort by composite score descending (highest overall value first)
    return evaluated.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.compositeScore - a.compositeScore;
    });
  }

  /**
   * Recommend the single best eligible supplier for an item
   */
  public async recommendBestSupplier(productId: string, quantity: number = 1): Promise<SupplierEvaluationResult | null> {
    const results = await this.evaluateSuppliersForProduct(productId, quantity);
    const eligible = results.filter((r) => r.isEligible);
    return eligible.length > 0 ? eligible[0] : null;
  }

  /**
   * Dispatches order payload to the chosen supplier adapter
   */
  public async placeSupplierOrder(
    orderId: string,
    supplierId: string,
    itemsToFulfill: Array<{ productId: string; quantity: number }>
  ): Promise<SupplierOrderResponse> {
    const order = await db.findOrderByIdOrNumber(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const supplier = await db.findSupplierById(supplierId);
    if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

    const adapter = this.getAdapter(supplier.code);

    // Map internal product IDs to external supplier product IDs
    const payloadItems: Array<{ externalProductId: string; quantity: number; expectedCost: number }> = [];
    for (const item of itemsToFulfill) {
      const sps = await db.getSupplierProducts(item.productId, supplierId);
      const sp = sps[0];
      payloadItems.push({
        externalProductId: sp ? sp.externalProductId : `EXT-${item.productId}`,
        quantity: item.quantity,
        expectedCost: sp ? sp.costPrice : 200,
      });
    }

    const payload: SupplierOrderPayload = {
      internalOrderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      shippingAddress: order.shippingAddress,
      items: payloadItems,
    };

    const response = await adapter.createOrder(payload);

    // Calculate wholesale costs
    let totalWholesale = 0;
    let totalShipping = 45;
    for (const item of itemsToFulfill) {
      const sps = await db.getSupplierProducts(item.productId, supplierId);
      if (sps.length > 0) {
        totalWholesale += sps[0].costPrice * item.quantity;
        totalShipping = sps[0].shippingCost;
      }
    }

    // Record supplier order in database
    await db.addSupplierOrder(order.id, {
      id: `so-${Date.now()}`,
      orderId: order.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      externalOrderId: response.externalOrderId,
      status: response.status === 'ACCEPTED' ? 'PLACED' : 'PENDING',
      wholesaleCost: totalWholesale,
      shippingCharged: totalShipping,
      trackingNumber: response.trackingNumber,
      carrier: response.carrier,
      errorMessage: response.success ? undefined : response.message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // If tracking number exists, add shipment
    if (response.trackingNumber) {
      await db.addShipment(order.id, {
        id: `shp-${Date.now()}`,
        orderId: order.id,
        carrier: response.carrier || 'Delhivery Express',
        trackingNumber: response.trackingNumber,
        currentStatus: `Fulfilled by ${supplier.name} - Manifest Created`,
        shippedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    return response;
  }
}

export const supplierRouter = new SupplierRouter();
