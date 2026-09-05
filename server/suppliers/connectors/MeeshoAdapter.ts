import { SupplierConnector, SupplierFeedFetchOptions, SupplierFeedResult } from './SupplierConnector';

/**
 * Meesho Adapter
 * Strict Compliance Policy:
 * Automated scraping or bypassing bot protections on Meesho is strictly disabled.
 * Only official OAuth partner tokens or authorized vendor feeds can be integrated.
 */
export class MeeshoAdapter implements SupplierConnector {
  public supplierCode = 'MEESHO';
  public supplierName = 'Meesho Reseller Network';
  public isFeedPublic = false;
  public isAuthorizedResale = false;
  public complianceNotice =
    'No public product feed available. In accordance with platform terms and ethical dropshipping practices, automated scraping is strictly disabled. Meesho integration requires an official Supplier/Developer Partner API token.';

  public async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    return {
      ok: false,
      message: 'Meesho Official API Key not configured. Automated scraping is prohibited by policy.',
      latencyMs: 0,
    };
  }

  public async fetchFeed(options?: SupplierFeedFetchOptions): Promise<SupplierFeedResult> {
    return {
      supplierCode: this.supplierCode,
      supplierName: this.supplierName,
      products: [],
      totalFoundOnPage: 0,
      hasMore: false,
    };
  }
}

export const meeshoAdapter = new MeeshoAdapter();
