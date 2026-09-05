import { RawSupplierProduct } from '../suppliers/connectors/SupplierConnector';
import { Product, SupplierProduct, Category } from '../types';
import { db } from '../db';

export interface EvaluatedProductCandidate {
  raw: RawSupplierProduct;
  normalizedTitle: string;
  slug: string;
  category: Category;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  margin: number;
  marginPercent: number;
  qualityScore: number;
  scoreBreakdown: {
    stockScore: number;
    imagesScore: number;
    titleScore: number;
    descScore: number;
    priceScore: number;
  };
  isEligible: boolean;
  filterReasons: string[];
}

export interface DiscoveryEngineFilterOptions {
  minQualityScore?: number; // e.g. 65
  maxPublishLimit?: number; // e.g. 100 - 500
  requireInStock?: boolean; // true
  minMargin?: number; // e.g. 100
  allowedCategoryIds?: string[];
}

export class CatalogDiscoveryEngine {
  /**
   * Title Normalizer: Capitalizes proper nouns, strips spam words and excessive emojis
   */
  public static normalizeTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    let clean = rawTitle
      .replace(/[!@#$%^&*_+={}\[\]:;"'<>?~`|\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Convert ALL-CAPS to Title Case
    if (clean === clean.toUpperCase() && clean.length > 5) {
      clean = clean
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Remove spam prefix/suffixes
    clean = clean.replace(/^(hot sale|best quality|trending|new arrival|wholesale)\s*[:-]\s*/i, '');
    return clean.trim();
  }

  public static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * User Requested Tiered Automated Pricing Rules:
   * ₹0–₹200       → +₹150
   * ₹200–₹500     → +₹200
   * ₹500–₹1000    → +₹300
   * ₹1000+        → +25%
   */
  public static calculateTieredPrice(costPrice: number): {
    sellingPrice: number;
    mrp: number;
    margin: number;
    marginPercent: number;
  } {
    let markup = 0;
    let sellingPrice = 0;

    if (costPrice <= 200) {
      markup = 150;
      sellingPrice = costPrice + markup;
    } else if (costPrice <= 500) {
      markup = 200;
      sellingPrice = costPrice + markup;
    } else if (costPrice <= 1000) {
      markup = 300;
      sellingPrice = costPrice + markup;
    } else {
      // +25%
      markup = Math.round(costPrice * 0.25);
      sellingPrice = costPrice + markup;
    }

    // Psychological rounding to end in 9 (e.g. ₹249, ₹499, ₹699)
    let roundedSelling = Math.ceil(sellingPrice / 10) * 10 - 1;
    if (roundedSelling < costPrice + 50) {
      roundedSelling = Math.ceil(costPrice + 50);
    }

    const margin = roundedSelling - costPrice;
    const marginPercent = Math.round((margin / roundedSelling) * 100);
    const mrp = Math.max(Math.round((roundedSelling * 1.65) / 10) * 10 - 1, roundedSelling + 150);

    return {
      sellingPrice: roundedSelling,
      mrp,
      margin,
      marginPercent,
    };
  }

  /**
   * Quality Scoring Algorithm (0-100 score)
   */
  public static calculateQualityScore(raw: RawSupplierProduct): {
    score: number;
    breakdown: {
      stockScore: number;
      imagesScore: number;
      titleScore: number;
      descScore: number;
      priceScore: number;
    };
  } {
    let stockScore = 0;
    let imagesScore = 0;
    let titleScore = 0;
    let descScore = 0;
    let priceScore = 0;

    // 1. In Stock & availability (up to 25 pts)
    if (raw.inStock && raw.availableQuantity > 0) {
      stockScore = 25;
    } else if (raw.inStock) {
      stockScore = 15;
    }

    // 2. High-resolution product images (up to 25 pts)
    const imgCount = raw.images?.length || 0;
    if (imgCount >= 4) imagesScore = 25;
    else if (imgCount >= 2) imagesScore = 20;
    else if (imgCount === 1) imagesScore = 12;

    // 3. Title quality and length (up to 20 pts)
    const titleLen = raw.title?.trim().length || 0;
    if (titleLen >= 20 && titleLen <= 90) {
      titleScore = 20;
    } else if (titleLen >= 10) {
      titleScore = 14;
    } else {
      titleScore = 5;
    }

    // 4. Description content richness (up to 15 pts)
    const descLen = raw.description?.trim().length || 0;
    if (descLen >= 150) descScore = 15;
    else if (descLen >= 50) descScore = 10;
    else if (descLen > 0) descScore = 5;

    // 5. Price & margin viability (up to 15 pts)
    // Sweet spot for impulse Indian dropshipping: ₹50 - ₹1,500
    if (raw.wholesalePrice >= 60 && raw.wholesalePrice <= 1200) {
      priceScore = 15;
    } else if (raw.wholesalePrice > 0 && raw.wholesalePrice <= 3000) {
      priceScore = 10;
    } else if (raw.wholesalePrice > 0) {
      priceScore = 5;
    }

    const total = stockScore + imagesScore + titleScore + descScore + priceScore;
    return {
      score: Math.min(100, Math.max(0, total)),
      breakdown: { stockScore, imagesScore, titleScore, descScore, priceScore },
    };
  }

  /**
   * Map supplier category/tags to internal store category
   */
  public static mapCategory(raw: RawSupplierProduct, categories: Category[]): Category {
    const text = `${raw.category || ''} ${(raw.tags || []).join(' ')} ${raw.title || ''}`.toLowerCase();

    // 1. Kitchen & Dining
    if (
      text.includes('kitchen') ||
      text.includes('chopper') ||
      text.includes('cooking') ||
      text.includes('dining') ||
      text.includes('utensil') ||
      text.includes('peeler') ||
      text.includes('knife') ||
      text.includes('cutter') ||
      text.includes('juicer') ||
      text.includes('blender') ||
      text.includes('bottle') ||
      text.includes('kettle') ||
      text.includes('lunch box') ||
      text.includes('tiffin') ||
      text.includes('spoon') ||
      text.includes('pan') ||
      text.includes('pot') ||
      text.includes('spice')
    ) {
      return categories.find((c) => c.slug === 'kitchen-dining') || categories[0];
    }

    // 2. Mobile Accessories
    if (
      text.includes('mobile') ||
      text.includes('phone') ||
      text.includes('cover') ||
      text.includes('case') ||
      text.includes('tripod') ||
      text.includes('selfie') ||
      text.includes('charger') ||
      text.includes('cable') ||
      text.includes('type-c') ||
      text.includes('power bank')
    ) {
      return categories.find((c) => c.slug === 'mobile-accessories') || categories[0];
    }

    // 3. Smart Gadgets & Tech
    if (
      text.includes('gadget') ||
      text.includes('tech') ||
      text.includes('console') ||
      text.includes('earbud') ||
      text.includes('headphone') ||
      text.includes('usb') ||
      text.includes('bluetooth') ||
      text.includes('lamp') ||
      text.includes('clock') ||
      text.includes('speaker') ||
      text.includes('led') ||
      text.includes('sensor') ||
      text.includes('electronic')
    ) {
      return categories.find((c) => c.slug === 'smart-gadgets') || categories[0];
    }

    // 4. Beauty & Grooming
    if (
      text.includes('beauty') ||
      text.includes('cosmetic') ||
      text.includes('skin') ||
      text.includes('hair') ||
      text.includes('grooming') ||
      text.includes('massager') ||
      text.includes('trimmer') ||
      text.includes('shaver') ||
      text.includes('facial') ||
      text.includes('makeup') ||
      text.includes('dryer') ||
      text.includes('manicure')
    ) {
      return categories.find((c) => c.slug === 'beauty-grooming') || categories[0];
    }

    // 5. Fitness & Sports
    if (
      text.includes('fitness') ||
      text.includes('workout') ||
      text.includes('gym') ||
      text.includes('yoga') ||
      text.includes('sports') ||
      text.includes('dumbbell') ||
      text.includes('gripper') ||
      text.includes('skipping') ||
      text.includes('resistance band')
    ) {
      return categories.find((c) => c.slug === 'fitness-sports') || categories[0];
    }

    // 6. Kids & Toys
    if (
      text.includes('baby') ||
      text.includes('kids') ||
      text.includes('toy') ||
      text.includes('game') ||
      text.includes('doll') ||
      text.includes('puzzle') ||
      text.includes('educational') ||
      text.includes('drawing')
    ) {
      return categories.find((c) => c.slug === 'kids-toys') || categories[0];
    }

    // 7. Car & Bike Accessories
    if (
      text.includes('car') ||
      text.includes('bike') ||
      text.includes('automobile') ||
      text.includes('vehicle') ||
      text.includes('seat') ||
      text.includes('wiper') ||
      text.includes('tire')
    ) {
      return categories.find((c) => c.slug === 'car-bike') || categories[0];
    }

    // 8. Fashion & Jewelry
    if (
      text.includes('fashion') ||
      text.includes('jewelry') ||
      text.includes('necklace') ||
      text.includes('ring') ||
      text.includes('bracelet') ||
      text.includes('earring') ||
      text.includes('wallet') ||
      text.includes('purse') ||
      text.includes('sunglasses') ||
      text.includes('watch')
    ) {
      return categories.find((c) => c.slug === 'fashion-jewelry') || categories[0];
    }

    // 9. Office & Stationery
    if (
      text.includes('office') ||
      text.includes('stationery') ||
      text.includes('pen') ||
      text.includes('notebook') ||
      text.includes('diary') ||
      text.includes('desk') ||
      text.includes('stapler') ||
      text.includes('paper')
    ) {
      return categories.find((c) => c.slug === 'office-stationery') || categories[0];
    }

    // 10. Default Home & Living
    return categories.find((c) => c.slug === 'home-living') || categories[0];
  }

  /**
   * Filter, score, and rank incoming raw supplier products
   */
  public static evaluateCandidates(
    rawProducts: RawSupplierProduct[],
    options: DiscoveryEngineFilterOptions = {}
  ): EvaluatedProductCandidate[] {
    const minQualityScore = options.minQualityScore ?? 65;
    const requireInStock = options.requireInStock ?? true;
    const minMargin = options.minMargin ?? 100;
    const categories = db.getCategories();

    const candidates: EvaluatedProductCandidate[] = [];

    for (const raw of rawProducts) {
      const filterReasons: string[] = [];

      // 1. Stock filter
      if (requireInStock && !raw.inStock) {
        filterReasons.push('Out of stock / variant unavailable');
      }

      // 2. Price filter
      if (!raw.wholesalePrice || raw.wholesalePrice <= 10) {
        filterReasons.push(`Invalid supplier price (₹${raw.wholesalePrice})`);
      }

      // 3. Image filter
      if (!raw.thumbnail || !raw.images || raw.images.length === 0) {
        filterReasons.push('Missing product image');
      }

      // Calculate quality score
      const { score, breakdown } = this.calculateQualityScore(raw);
      if (score < minQualityScore) {
        filterReasons.push(`Quality score too low (${score} < ${minQualityScore})`);
      }

      // Pricing & Margin calculation
      const pricing = this.calculateTieredPrice(raw.wholesalePrice);
      if (pricing.margin < minMargin) {
        filterReasons.push(`Margin below threshold (₹${pricing.margin} < ₹${minMargin})`);
      }

      const normalizedTitle = this.normalizeTitle(raw.title);
      const slug = this.slugify(normalizedTitle) || `deodap-${raw.externalId}`;
      const category = this.mapCategory(raw, categories);

      const isEligible = filterReasons.length === 0;

      candidates.push({
        raw,
        normalizedTitle,
        slug,
        category,
        costPrice: raw.wholesalePrice,
        sellingPrice: pricing.sellingPrice,
        mrp: pricing.mrp,
        margin: pricing.margin,
        marginPercent: pricing.marginPercent,
        qualityScore: score,
        scoreBreakdown: breakdown,
        isEligible,
        filterReasons,
      });
    }

    return candidates;
  }

  /**
   * Transforms eligible candidates into store Products & SupplierProducts
   */
  public static publishEligibleCandidates(
    candidates: EvaluatedProductCandidate[],
    limit: number = 250
  ): {
    publishedProducts: Product[];
    createdCount: number;
    updatedCount: number;
  } {
    const eligible = candidates.filter((c) => c.isEligible);
    // Sort by Quality Score descending (high quality first)
    eligible.sort((a, b) => b.qualityScore - a.qualityScore);

    const targetList = eligible.slice(0, limit);
    const publishedProducts: Product[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    const deodapSupplier = db.getSuppliers().find((s) => s.code === 'DEODAP') || db.getSuppliers()[0];

    for (const candidate of targetList) {
      const existingProduct =
        db.findProductByIdOrSlug(candidate.slug) ||
        db.getProducts().find((p) => p.supplierProductId === candidate.raw.externalId);

      if (existingProduct) {
        // Update product pricing and stock
        existingProduct.sellingPrice = candidate.sellingPrice;
        existingProduct.mrp = candidate.mrp;
        existingProduct.supplierPrice = candidate.costPrice;
        existingProduct.marginAmount = candidate.margin;
        existingProduct.qualityScore = candidate.qualityScore;
        existingProduct.syncTimestamp = new Date().toISOString();
        existingProduct.updatedAt = new Date().toISOString();
        existingProduct.isActive = true;

        db.updateProduct(existingProduct.id, existingProduct);
        publishedProducts.push(existingProduct);
        updatedCount++;
      } else {
        // Create clean catalog product
        const newProduct: Product = {
          id: `prod-dd-${candidate.raw.externalId}`,
          title: candidate.normalizedTitle,
          slug: candidate.slug,
          description: candidate.raw.description || `${candidate.normalizedTitle} - Premium quality dropshipping essential with doorstep COD and fast delivery across India.`,
          shortDesc: `Wholesale direct ${candidate.category.name} item. 100% verified quality.`,
          categoryId: candidate.category.id,
          categorySlug: candidate.category.slug,
          categoryName: candidate.category.name,
          mrp: candidate.mrp,
          sellingPrice: candidate.sellingPrice,
          supplierPrice: candidate.costPrice,
          marginAmount: candidate.margin,
          qualityScore: candidate.qualityScore,
          supplierCode: 'DEODAP',
          supplierProductId: candidate.raw.externalId,
          supplierHandle: candidate.raw.handle,
          images: candidate.raw.images,
          thumbnail: candidate.raw.thumbnail,
          badge: candidate.qualityScore >= 85 ? 'Top Rated' : 'Trending',
          rating: Number((4.3 + (candidate.qualityScore % 7) * 0.1).toFixed(1)),
          reviewCount: 12 + (candidate.qualityScore % 25),
          isTrending: candidate.qualityScore >= 80,
          isBestSeller: candidate.qualityScore >= 85,
          isNewArrival: true,
          isActive: true,
          codAvailable: true,
          inventoryCount: candidate.raw.availableQuantity,
          syncTimestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.createProduct(newProduct);
        publishedProducts.push(newProduct);
        createdCount++;

        // Add to supplier product mapping
        const sp: SupplierProduct = {
          id: `sp-${newProduct.id}-${deodapSupplier.id}`,
          supplierId: deodapSupplier.id,
          productId: newProduct.id,
          externalProductId: candidate.raw.externalId,
          costPrice: candidate.costPrice,
          shippingCost: 45,
          stock: candidate.raw.availableQuantity,
          isAvailable: true,
          leadTimeDays: deodapSupplier.avgDeliveryDays || 3,
          lastSyncedAt: new Date().toISOString(),
        };
        db.createSupplierProduct(sp);
      }
    }

    return {
      publishedProducts,
      createdCount,
      updatedCount,
    };
  }
}
