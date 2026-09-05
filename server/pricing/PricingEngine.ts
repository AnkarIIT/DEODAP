import { db } from '../db';
import { Product, CustomerProductDTO } from '../types';

export class PricingEngine {
  /**
   * Calculates dynamic retail price from wholesale cost and category markup rules.
   * Standardizes price to popular Indian ecommerce endings (e.g. ₹99, ₹49, ₹29).
   */
  public static async calculateRetailPrice(
    wholesaleCost: number,
    shippingCost: number = 45,
    categoryId?: string
  ): Promise<{
    landedCost: number;
    sellingPrice: number;
    mrp: number;
    marginAmount: number;
    marginPercent: number;
  }> {
    const rules = await db.getPricingRule();
    const landedCost = wholesaleCost + shippingCost;

    // Determine markup percent
    let markupPercent = rules.defaultMarkupPercent || 38;
    if (categoryId && rules.categoryMarkupPercent && rules.categoryMarkupPercent[categoryId]) {
      markupPercent = rules.categoryMarkupPercent[categoryId];
    }

    // Raw marked up price
    let rawSelling = landedCost * (1 + markupPercent / 100) + (rules.fixedHandlingFee || 20);

    // Enforce minimum gross margin
    if (rawSelling - landedCost < (rules.minMarginAmount || 70)) {
      rawSelling = landedCost + (rules.minMarginAmount || 70);
    }

    // Psychological pricing rounder (e.g. ₹299, ₹349, ₹499, ₹599)
    let roundedSelling = Math.ceil(rawSelling / 10) * 10 - 1; // Ends in 9
    if (roundedSelling < landedCost + 50) {
      roundedSelling = Math.ceil(landedCost + 50);
    }

    // MRP standard calculation (30% to 50% discount display)
    const mrp = Math.round(roundedSelling * 1.85 / 10) * 10 - 1;

    const marginAmount = roundedSelling - landedCost;
    const actualMarginPercent = Math.round((marginAmount / roundedSelling) * 100);

    return {
      landedCost,
      sellingPrice: roundedSelling,
      mrp: Math.max(mrp, roundedSelling + 100),
      marginAmount,
      marginPercent: actualMarginPercent,
    };
  }

  /**
   * Sanitizes product object for customer API responses:
   * STRICT DTO WHITELIST: Supplier cost, margin, and supplier identity never exist in this schema.
   */
  public static sanitizeProductForCustomer(product: Product): CustomerProductDTO {
    // Supplier cost/margin/supplier identity never exist in this schema.
    const categorySlug = product.categorySlug;
    const categoryName = product.categoryName;

    // Construct pure CustomerProductDTO with whitelist
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      shortDesc: product.shortDesc,
      categoryId: product.categoryId,
      categorySlug: categorySlug || 'home-living',
      categoryName: categoryName || 'Home & Living',
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      images: product.images || [],
      thumbnail: product.thumbnail || (product.images && product.images[0]) || '',
      badge: product.badge,
      rating: product.rating || 4.5,
      reviewCount: product.reviewCount || 10,
      isTrending: !!product.isTrending,
      isBestSeller: !!product.isBestSeller,
      isNewArrival: !!product.isNewArrival,
      isActive: product.isActive !== false,
      specifications: product.specifications,
      warrantyInfo: product.warrantyInfo,
      codAvailable: product.codAvailable !== false,
      inventoryCount: product.inventoryCount || 50,
    };
  }

  /**
   * Calculate cart order totals server-side:
   * NEVER trust client prices! Always re-fetch from database!
   */
  public static async calculateOrderTotals(
    items: Array<{ productId: string; quantity: number }>,
    couponCode?: string,
    paymentMethod?: string
  ) {
    const rules = await db.getPricingRule();
    let subtotal = 0;
    const validatedItems: Array<{
      productId: string;
      productTitle: string;
      productThumbnail: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      wholesaleCost: number;
    }> = [];

    let totalWholesaleCost = 0;

    for (const item of items) {
      const product = await db.findProductByIdOrSlug(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }

      const quantity = Math.max(1, Math.min(20, item.quantity));
      const unitPrice = product.sellingPrice;
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      // Find lowest supplier cost for profit estimation
      const sps = await db.getSupplierProducts(product.id);
      const minCost = sps.length > 0 ? Math.min(...sps.map((s) => s.costPrice + s.shippingCost)) : unitPrice * 0.6;
      totalWholesaleCost += minCost * quantity;

      validatedItems.push({
        productId: product.id,
        productTitle: product.title,
        productThumbnail: product.thumbnail,
        quantity,
        unitPrice,
        totalPrice,
        wholesaleCost: minCost,
      });
    }

    // Shipping fee
    let shippingFee = subtotal >= rules.freeShippingThreshold ? 0 : rules.standardShippingFee;

    // COD convenience fee
    if (paymentMethod === 'COD') {
      shippingFee += rules.codConvenienceFee;
    }

    // Coupon discount calculation
    let discount = 0;
    let appliedCoupon: any = null;

    if (couponCode) {
      const coupon = await db.findCoupon(couponCode);
      if (coupon && subtotal >= coupon.minOrderValue) {
        appliedCoupon = coupon;
        if (coupon.discountAmount) {
          discount = coupon.discountAmount;
        } else if (coupon.discountPercent) {
          discount = (subtotal * coupon.discountPercent) / 100;
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        }
      }
    }

    discount = Math.min(discount, subtotal);
    const totalAmount = Math.max(0, subtotal + shippingFee - discount);
    const estimatedProfit = Math.max(0, totalAmount - totalWholesaleCost);

    return {
      items: validatedItems,
      subtotal,
      shippingFee,
      discount,
      appliedCoupon,
      totalAmount,
      estimatedProfit,
    };
  }
}
