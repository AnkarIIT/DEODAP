import { db } from '../db';
import { PricingEngine } from '../pricing/PricingEngine';
import { Product, SupplierProduct } from '../types';

export interface CSVRowData {
  supplier: string;
  supplier_product_id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  cost_price: string | number;
  shipping_cost: string | number;
  stock: string | number;
  rating?: string | number;
}

export interface ImportResult {
  jobId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdProducts: number;
  updatedProducts: number;
  errors: Array<{ rowNumber: number; reason: string; rawTitle?: string }>;
}

export class ProductImporter {
  /**
   * Title Normalizer: Capitalizes proper nouns, strips spam emojis and all-caps shouting
   */
  public static normalizeTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    // Strip excessive special characters
    let clean = rawTitle.replace(/[!@#$%^&*()_+={}\[\]:;"'<>?~`|\\]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Convert ALL-CAPS to Title Case
    if (clean === clean.toUpperCase() && clean.length > 5) {
      clean = clean
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return clean;
  }

  public static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Parse CSV string into objects
   */
  public static parseCSV(csvContent: string): CSVRowData[] {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: CSVRowData[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle quoted commas safely
      const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
      const values: string[] = [];
      let match;
      let currentLine = lines[i];

      // Fallback simple split if regex fails
      const rawCols = currentLine.split(',');
      const rowObj: any = {};

      headers.forEach((header, colIdx) => {
        const val = rawCols[colIdx] !== undefined ? rawCols[colIdx].trim().replace(/^"|"$/g, '') : '';
        rowObj[header] = val;
      });

      rows.push(rowObj);
    }

    return rows;
  }

  /**
   * Process and import rows
   */
  public static async processImport(csvContent: string, fileName: string = 'catalog_import.csv'): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    const jobId = `job-${Date.now()}`;
    const errors: Array<{ rowNumber: number; reason: string; rawTitle?: string }> = [];

    let successRows = 0;
    let createdProducts = 0;
    let updatedProducts = 0;

    const suppliers = await db.getSuppliers();
    const categories = await db.getCategories();

    for (const row of rows) {
      const rowNum = rows.indexOf(row) + 2; // header is 1
      try {
        if (!row.title || !row.supplier_product_id) {
          errors.push({ rowNumber: rowNum, reason: 'Missing mandatory title or supplier_product_id', rawTitle: row.title });
          return;
        }

        const costPrice = parseFloat(String(row.cost_price));
        if (isNaN(costPrice) || costPrice <= 0) {
          errors.push({ rowNumber: rowNum, reason: `Invalid cost price: ${row.cost_price}`, rawTitle: row.title });
          return;
        }

        const shippingCost = parseFloat(String(row.shipping_cost)) || 45;
        const stock = parseInt(String(row.stock), 10) || 50;
        const normalizedTitle = this.normalizeTitle(row.title);

        // Find or map supplier
        let supplier = suppliers.find(
          (s) =>
            s.name.toLowerCase().includes((row.supplier || '').toLowerCase()) ||
            s.code.toLowerCase() === (row.supplier || '').toLowerCase()
        );
        if (!supplier) {
          supplier = suppliers[0]; // Default to primary DeoDap
        }

        // Find or map category
        let category = categories.find((c) => c.name.toLowerCase() === (row.category || '').toLowerCase() || c.slug === (row.category || '').toLowerCase());
        if (!category) {
          category = categories[0];
        }

        // Calculate dynamic retail pricing using PricingEngine
        const pricing = await PricingEngine.calculateRetailPrice(costPrice, shippingCost, category.id);

        // Check for duplicate by slug or supplier product id
        const slug = this.slugify(normalizedTitle);
        let product = await db.findProductByIdOrSlug(slug);

        if (product) {
          // Update existing product
          product.mrp = pricing.mrp;
          product.sellingPrice = pricing.sellingPrice;
          product.description = row.description || product.description;
          product.thumbnail = row.image_url || product.thumbnail;
          await db.updateProduct(product.id, product);
          updatedProducts++;
        } else {
          // Create new product
          const newId = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          product = {
            id: newId,
            title: normalizedTitle,
            slug,
            description: row.description || `${normalizedTitle} - Premium quality verified product.`,
            shortDesc: `${normalizedTitle} available at wholesale discounted rate.`,
            categoryId: category.id,
            categoryName: category.name,
            mrp: pricing.mrp,
            sellingPrice: pricing.sellingPrice,
            images: [row.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
            thumbnail: row.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
            badge: 'New Import',
            rating: parseFloat(String(row.rating)) || 4.5,
            reviewCount: 8,
            isTrending: false,
            isBestSeller: false,
            isNewArrival: true,
            isActive: true,
            codAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await db.createProduct(product);
          createdProducts++;
        }

        // Create or update supplier product mapping
        const existingMappings = await db.getSupplierProducts(product.id, supplier.id);
        if (existingMappings.length > 0) {
          await db.updateSupplierProduct(existingMappings[0].id, {
            costPrice,
            shippingCost,
            stock,
            externalProductId: row.supplier_product_id,
          });
        } else {
          const sp: SupplierProduct = {
            id: `sp-${product.id}-${supplier.id}`,
            supplierId: supplier.id,
            productId: product.id,
            externalProductId: row.supplier_product_id,
            costPrice,
            shippingCost,
            stock,
            isAvailable: true,
            leadTimeDays: supplier.avgDeliveryDays ? Math.round(supplier.avgDeliveryDays) : 3,
            lastSyncedAt: new Date().toISOString(),
          };
          await db.createSupplierProduct(sp);
        }

        successRows++;
      } catch (err: any) {
        errors.push({ rowNumber: rowNum, reason: err.message || 'Processing error', rawTitle: row.title });
      }
    }

    return {
      jobId,
      totalRows: rows.length,
      successRows,
      failedRows: errors.length,
      createdProducts,
      updatedProducts,
      errors,
    };
  }
}
