import { deodapFeedConnector } from '../suppliers/connectors/DeoDapFeedConnector';
import { CatalogDiscoveryEngine, EvaluatedProductCandidate } from './CatalogDiscoveryEngine';
import { CatalogSyncState, CatalogSyncLog, CatalogSyncItemResult } from '../types';
import { db } from '../db';

export class CatalogSyncWorker {
  private static instance: CatalogSyncWorker;

  private state: CatalogSyncState = {
    supplier: 'DeoDap',
    status: 'IDLE',
    lastSyncAt: null,
    productsFound: 0,
    eligibleCount: 0,
    publishedCount: 0,
    minQualityScore: 65,
    maxPublishLimit: 250,
    autoSyncIntervalHours: 6,
  };

  private logs: CatalogSyncLog[] = [];
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private constructor() {
    this.initDefaultSyncState();
    this.startScheduler();
  }

  public static getInstance(): CatalogSyncWorker {
    if (!CatalogSyncWorker.instance) {
      CatalogSyncWorker.instance = new CatalogSyncWorker();
    }
    return CatalogSyncWorker.instance;
  }

  private initDefaultSyncState() {
    const settings = db.getSettings();
    const savedState = settings['catalog_sync_state'];
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        this.state = { ...this.state, ...parsed, status: 'IDLE' };
      } catch (_) {}
    }

    const savedLogs = settings['catalog_sync_logs'];
    if (savedLogs) {
      try {
        this.logs = JSON.parse(savedLogs);
      } catch (_) {}
    }
  }

  private persistState() {
    try {
      db.updateSetting('catalog_sync_state', JSON.stringify(this.state));
      db.updateSetting('catalog_sync_logs', JSON.stringify(this.logs.slice(0, 20))); // Keep last 20 logs
      db.save();
    } catch (err) {
      console.warn('[Sync Worker] Failed to persist sync state:', err);
    }
  }

  private startScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    const intervalMs = Math.max(1, this.state.autoSyncIntervalHours) * 60 * 60 * 1000;
    console.log(`[Catalog Sync Worker] Background scheduler active: running every ${this.state.autoSyncIntervalHours} hours`);

    this.intervalTimer = setInterval(() => {
      console.log('[Catalog Sync Worker] Running scheduled 6-hour catalog sync...');
      this.runSync().catch((err) => console.error('[Catalog Sync Worker] Scheduled sync error:', err));
    }, intervalMs);
  }

  public getState(): CatalogSyncState {
    return { ...this.state };
  }

  public getLogs(): CatalogSyncLog[] {
    return [...this.logs];
  }

  public updateConfig(updates: Partial<CatalogSyncState>) {
    if (updates.minQualityScore !== undefined) {
      this.state.minQualityScore = Math.max(30, Math.min(95, updates.minQualityScore));
    }
    if (updates.maxPublishLimit !== undefined) {
      this.state.maxPublishLimit = Math.max(10, Math.min(1000, updates.maxPublishLimit));
    }
    if (updates.autoSyncIntervalHours !== undefined) {
      this.state.autoSyncIntervalHours = Math.max(1, Math.min(72, updates.autoSyncIntervalHours));
      this.startScheduler();
    }
    this.persistState();
    return this.state;
  }

  /**
   * Execute an immediate sync cycle from DeoDap feed
   */
  public async runSync(): Promise<{
    success: boolean;
    productsFetched: number;
    eligibleCount: number;
    publishedCount: number;
    createdCount: number;
    updatedCount: number;
    durationMs: number;
    message: string;
    sampleCandidates: EvaluatedProductCandidate[];
  }> {
    if (this.isRunning) {
      throw new Error('A catalog sync is currently in progress. Please wait.');
    }

    this.isRunning = true;
    this.state.status = 'SYNCING';
    const startTime = Date.now();

    try {
      console.log('[Catalog Sync Worker] Starting ingestion from DeoDap public feed...');

      // 1. Fetch page 1 (50 products)
      const feedPage1 = await deodapFeedConnector.fetchFeed({ limit: 50, page: 1 });
      let allRawProducts = [...feedPage1.products];

      // 2. Fetch page 2 (50 products) if available to enrich catalog depth
      if (feedPage1.hasMore) {
        try {
          const feedPage2 = await deodapFeedConnector.fetchFeed({ limit: 50, page: 2 });
          allRawProducts.push(...feedPage2.products);
        } catch (p2Err: any) {
          console.warn('[Catalog Sync Worker] Page 2 fetch skipped:', p2Err.message);
        }
      }

      console.log(`[Catalog Sync Worker] Fetched ${allRawProducts.length} raw products from DeoDap.`);

      // 3. Evaluate & Filter using Discovery Engine
      const candidates = CatalogDiscoveryEngine.evaluateCandidates(allRawProducts, {
        minQualityScore: this.state.minQualityScore,
        minMargin: 100,
        requireInStock: true,
      });

      const eligibleCandidates = candidates.filter((c) => c.isEligible);
      console.log(`[Catalog Sync Worker] Evaluation complete: ${eligibleCandidates.length}/${candidates.length} products passed quality & margin filters.`);

      // 4. Publish top scored products to catalog
      const { publishedProducts, createdCount, updatedCount } =
        CatalogDiscoveryEngine.publishEligibleCandidates(candidates, this.state.maxPublishLimit);

      const durationMs = Date.now() - startTime;
      this.state.status = 'COMPLETED';
      this.state.lastSyncAt = new Date().toISOString();
      this.state.productsFound = allRawProducts.length;
      this.state.eligibleCount = eligibleCandidates.length;
      this.state.publishedCount = db.getProducts().filter((p) => p.supplierCode === 'DEODAP').length;
      this.state.lastErrorMessage = undefined;

      // 5. Prepare sample candidates log
      const sampleItems: CatalogSyncItemResult[] = candidates.slice(0, 15).map((c) => ({
        title: c.normalizedTitle,
        supplierPrice: c.costPrice,
        sellingPrice: c.sellingPrice,
        margin: c.margin,
        score: c.qualityScore,
        status: c.isEligible ? 'PUBLISHED' : 'FILTERED',
        reason: c.filterReasons.join(', ') || undefined,
      }));

      // 6. Record Log
      const logEntry: CatalogSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        supplier: 'DeoDap',
        productsFetched: allRawProducts.length,
        eligible: eligibleCandidates.length,
        published: publishedProducts.length,
        durationMs,
        status: 'SUCCESS',
        summary: `Synchronized ${allRawProducts.length} items from DeoDap feed (${createdCount} new, ${updatedCount} updated, ${eligibleCandidates.length} eligible).`,
        sampleItems,
      };

      this.logs.unshift(logEntry);
      this.persistState();

      console.log(`[Catalog Sync Worker] Sync completed in ${durationMs}ms. Store now has ${db.getProducts().length} live products.`);

      return {
        success: true,
        productsFetched: allRawProducts.length,
        eligibleCount: eligibleCandidates.length,
        publishedCount: publishedProducts.length,
        createdCount,
        updatedCount,
        durationMs,
        message: `Successfully ingested and synchronized ${allRawProducts.length} products from DeoDap. ${createdCount} created, ${updatedCount} updated.`,
        sampleCandidates: candidates.slice(0, 20),
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.state.status = 'FAILED';
      this.state.lastErrorMessage = err.message;

      const errorLog: CatalogSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        supplier: 'DeoDap',
        productsFetched: 0,
        eligible: 0,
        published: 0,
        durationMs,
        status: 'ERROR',
        summary: `Sync failed: ${err.message}`,
      };
      this.logs.unshift(errorLog);
      this.persistState();

      console.error('[Catalog Sync Worker] Sync failed:', err);
      throw err;
    } finally {
      this.isRunning = false;
    }
  }
}

export const catalogSyncWorker = CatalogSyncWorker.getInstance();
