import { SupplierConnector, SupplierFeedFetchOptions, SupplierFeedResult, RawSupplierProduct } from './SupplierConnector';

export class DeoDapFeedConnector implements SupplierConnector {
  public supplierCode = 'DEODAP';
  public supplierName = 'DeoDap Dropshipping India';
  public isFeedPublic = true;
  public isAuthorizedResale = false; // Flag: Discovery feed mode vs. commercial dropship plan
  public complianceNotice =
    'DeoDap Public Product Feed (Discovery Mode). Ingests public product metadata (titles, images, wholesale benchmarks) for catalog prototyping and pricing optimization. Commercial dropshipping fulfillment requires DeoDap business verification and official order routing.';

  private baseUrl = 'https://deodap.in';

  /**
   * Strip HTML tags from Shopify product descriptions
   */
  private cleanHtml(rawHtml: string): string {
    if (!rawHtml) return '';
    return rawHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test live connectivity to DeoDap public endpoint
   */
  public async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.baseUrl}/products.json?limit=1`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - t0;

      if (res.ok) {
        return {
          ok: true,
          message: `Connected to DeoDap Public Feed (${res.status} OK in ${latencyMs}ms)`,
          latencyMs,
        };
      } else {
        return {
          ok: false,
          message: `DeoDap returned HTTP ${res.status}: ${res.statusText}`,
          latencyMs,
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        message: `Connection failed: ${err.message}`,
        latencyMs: Date.now() - t0,
      };
    }
  }

  /**
   * Fetch paginated products from DeoDap Shopify feed.
   * Retries transient failures (429 / 5xx) with exponential backoff.
   */
  public async fetchFeed(options: SupplierFeedFetchOptions = {}): Promise<SupplierFeedResult> {
    const page = options.page || 1;
    const limit = Math.min(250, options.limit || 50); // Shopify max is 250
    const url = `${this.baseUrl}/products.json?limit=${limit}&page=${page}`;

    const MAX_ATTEMPTS = 4;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeout);

        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get('retry-after')) || 0;
          const waitMs = Math.min(20000, (retryAfter || 2) * 1000 * Math.pow(2, attempt - 1));
          console.warn(`[DeoDap Feed] HTTP ${res.status} on page ${page} (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${waitMs}ms...`);
          res.body?.cancel?.();
          lastError = new Error(`DeoDap API responded with HTTP ${res.status}`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!res.ok) {
          throw new Error(`DeoDap API responded with HTTP ${res.status}: ${res.statusText}`);
        }

        const data: any = await res.json();
        const rawProducts = Array.isArray(data?.products) ? data.products : [];

      const parsed: RawSupplierProduct[] = rawProducts.map((p: any) => {
        // Evaluate variants
        const variants = Array.isArray(p.variants) ? p.variants : [];
        const availableVariants = variants.filter((v: any) => v.available === true);
        const inStock = availableVariants.length > 0;

        // Choose reference price (lowest available or first variant)
        const activeVariant = availableVariants[0] || variants[0] || {};
        const wholesalePrice = parseFloat(activeVariant.price) || 0;
        const compareAtPrice = parseFloat(activeVariant.compare_at_price) || undefined;

        // Extract clean image URLs
        const images: string[] = (p.images || [])
          .map((img: any) => (typeof img === 'string' ? img : img.src))
          .filter(Boolean);

        const thumbnail = images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

        const description = this.cleanHtml(p.body_html || '');

        return {
          externalId: String(p.id),
          title: p.title || 'Untitled DeoDap Product',
          handle: p.handle || `prod-${p.id}`,
          description,
          category: p.product_type || 'General',
          tags: Array.isArray(p.tags) ? p.tags : typeof p.tags === 'string' ? p.tags.split(',').map((t: string) => t.trim()) : [],
          vendor: p.vendor || 'DeoDap',
          images,
          thumbnail,
          wholesalePrice,
          compareAtPrice,
          inStock,
          availableQuantity: inStock ? 50 : 0,
          variantsCount: variants.length,
          publishedAt: p.published_at,
          rawPayload: p,
        };
      });

      return {
        supplierCode: this.supplierCode,
        supplierName: this.supplierName,
        products: parsed,
        totalFoundOnPage: parsed.length,
        hasMore: parsed.length >= limit,
        nextPage: parsed.length >= limit ? page + 1 : undefined,
      };
    } catch (err: any) {
      console.warn(`[DeoDap Feed] Fetch error on page ${page}:`, err.message);
      throw err;
    }
  }

  throw lastError || new Error(`DeoDap feed fetch failed for page ${page} after ${MAX_ATTEMPTS} attempts.`);
  }
}

export const deodapFeedConnector = new DeoDapFeedConnector();
