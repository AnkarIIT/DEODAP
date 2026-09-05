export interface MarkupRule {
  minCost: number;
  maxCost: number | null; // null means unbounded upper limit
  type: 'FIXED' | 'PERCENT';
  value: number;
}

export interface PricingResult {
  supplierCost: number;
  markupAmount: number;
  sellingPrice: number;
  mrp: number;
  discountPercent: number;
  grossMarginPercent: number;
}

export class PricingService {
  private static markupRules: MarkupRule[] = [
    { minCost: 0, maxCost: 200, type: 'FIXED', value: 150 },
    { minCost: 201, maxCost: 500, type: 'FIXED', value: 200 },
    { minCost: 501, maxCost: 1000, type: 'FIXED', value: 300 },
    { minCost: 1001, maxCost: null, type: 'PERCENT', value: 25 },
  ];

  /**
   * Calculate customer selling price, MRP, and discount purely on the backend.
   */
  public static calculatePrice(supplierCost: number): PricingResult {
    const cost = Math.max(0, Number(supplierCost) || 0);

    // Match appropriate rule
    let matchedRule = this.markupRules.find((rule) => {
      if (rule.maxCost === null) {
        return cost >= rule.minCost;
      }
      return cost >= rule.minCost && cost <= rule.maxCost;
    });

    if (!matchedRule) {
      // Fallback: 30% margin
      matchedRule = { minCost: 0, maxCost: null, type: 'PERCENT', value: 30 };
    }

    let markup = 0;
    if (matchedRule.type === 'FIXED') {
      markup = matchedRule.value;
    } else {
      markup = Math.round((cost * matchedRule.value) / 100);
    }

    // Psychology pricing in Indian ecommerce: round to 9 or 99 (e.g. 499, 599)
    let rawSellingPrice = cost + markup;
    let sellingPrice = Math.ceil(rawSellingPrice / 10) * 10 - 1;
    if (sellingPrice < rawSellingPrice) {
      sellingPrice = rawSellingPrice;
    }

    // Standard MRP anchor for perceived value (typically 40% - 60% higher than selling price)
    const mrp = Math.round((sellingPrice * 1.6) / 50) * 50 - 1;
    const discountPercent = Math.max(
      10,
      Math.min(75, Math.round(((mrp - sellingPrice) / mrp) * 100))
    );

    const grossMargin = sellingPrice - cost;
    const grossMarginPercent = sellingPrice > 0 ? Math.round((grossMargin / sellingPrice) * 100) : 0;

    return {
      supplierCost: cost,
      markupAmount: markup,
      sellingPrice,
      mrp,
      discountPercent,
      grossMarginPercent,
    };
  }

  /**
   * Update or configure markup tiers dynamically
   */
  public static setMarkupRules(rules: MarkupRule[]): void {
    this.markupRules = rules;
  }

  public static getMarkupRules(): MarkupRule[] {
    return [...this.markupRules];
  }
}
