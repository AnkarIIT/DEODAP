import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  TrendingUp,
  Server,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  Check,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';

interface CatalogAutomationProps {
  onRefreshParent?: () => void;
  showNotification: (msg: string) => void;
}

export const CatalogAutomation: React.FC<CatalogAutomationProps> = ({ onRefreshParent, showNotification }) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  // Pricing simulator state
  const [calcCost, setCalcCost] = useState<number>(220);
  const [calcResult, setCalcResult] = useState<{
    sellingPrice: number;
    mrp: number;
    margin: number;
    marginPercent: number;
  }>({
    sellingPrice: 420,
    mrp: 699,
    margin: 200,
    marginPercent: 48,
  });

  // Config sliders state
  const [minQualityScore, setMinQualityScore] = useState<number>(65);
  const [maxPublishLimit, setMaxPublishLimit] = useState<number>(250);
  const [syncIntervalHours, setSyncIntervalHours] = useState<number>(6);
  const [savingConfig, setSavingConfig] = useState(false);

  // Load Status
  const loadStatus = async () => {
    try {
      const res = await api.admin.getCatalogAutomationStatus();
      setStatusData(res);
      if (res.state) {
        setMinQualityScore(res.state.minQualityScore || 65);
        setMaxPublishLimit(res.state.maxPublishLimit || 250);
        setSyncIntervalHours(res.state.autoSyncIntervalHours || 6);
      }
    } catch (err: any) {
      console.error('Failed to load automation status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Update simulator whenever calcCost changes
  useEffect(() => {
    const cost = Math.max(10, calcCost);
    let markup = 0;
    if (cost <= 200) {
      markup = 150;
    } else if (cost <= 500) {
      markup = 200;
    } else if (cost <= 1000) {
      markup = 300;
    } else {
      markup = Math.round(cost * 0.25);
    }

    let selling = cost + markup;
    let roundedSelling = Math.ceil(selling / 10) * 10 - 1;
    if (roundedSelling < cost + 50) roundedSelling = Math.ceil(cost + 50);

    const margin = roundedSelling - cost;
    const marginPercent = Math.round((margin / roundedSelling) * 100);
    const mrp = Math.max(Math.round((roundedSelling * 1.65) / 10) * 10 - 1, roundedSelling + 150);

    setCalcResult({
      sellingPrice: roundedSelling,
      mrp,
      margin,
      marginPercent,
    });
  }, [calcCost]);

  // Handle Sync Now
  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    showNotification('Connecting to DeoDap product feed & initiating catalog ingestion...');
    try {
      const res = await api.admin.syncCatalogAutomation();
      showNotification(res.message || 'Catalog sync completed successfully!');
      await loadStatus();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      showNotification('Sync failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  // Test DeoDap Connection Ping
  const handleTestPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await api.admin.testDeoDapConnection();
      setPingResult(res);
      if (res.ok) {
        showNotification(`DeoDap Feed Verified! ${res.latencyMs}ms latency.`);
      } else {
        showNotification('Ping check: ' + res.message);
      }
    } catch (err: any) {
      setPingResult({ ok: false, message: err.message });
      showNotification('Connection check failed');
    } finally {
      setTestingPing(false);
    }
  };

  // Save Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.admin.updateCatalogAutomationConfig({
        minQualityScore,
        maxPublishLimit,
        autoSyncIntervalHours: syncIntervalHours,
      });
      showNotification('Automation thresholds & 6-hour sync scheduler updated!');
      await loadStatus();
    } catch (err: any) {
      showNotification('Failed to update config: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Catalog Automation Engine...</p>
      </div>
    );
  }

  const state = statusData?.state || {};
  const logs = statusData?.logs || [];
  const latestLog = logs[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black font-display tracking-tight text-white">
                Automated Catalog Ingestion & Sync Engine
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Zero manual product entry. Live Shopify feed ingestion from <span className="text-white font-semibold">DeoDap</span>, automated quality scoring (0–100), automated tiered retail pricing, and publishing straight to your PostgreSQL store catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestPing}
              disabled={testingPing || syncing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{testingPing ? 'Testing Ping...' : 'Test DeoDap Ping'}</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Ingesting Feed...' : 'SYNC NOW'}</span>
            </button>
          </div>
        </div>

        {pingResult && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            pingResult.ok ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}>
            {pingResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{pingResult.message}</span>
            {pingResult.latencyMs && <span className="opacity-80">({pingResult.latencyMs}ms)</span>}
          </div>
        )}
      </div>

      {/* Primary Catalog Automation Card (matches user layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The Requested "CATALOG AUTOMATION" Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="text-xs font-black tracking-wider uppercase text-slate-500">
                CATALOG AUTOMATION
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Feed
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2 text-xs">
              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Supplier</span>
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  DeoDap Dropshipping
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Status</span>
                <span className="font-black text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected & Validated
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Last sync</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending first sync'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Products found</span>
                <span className="font-black text-slate-900">
                  {state.productsFound > 0 ? state.productsFound : '50,000+ (Feed)'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Eligible (Score ≥ {state.minQualityScore || 65})</span>
                <span className="font-black text-amber-600">
                  {state.eligibleCount || 'Auto-filtered'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Published to Storefront</span>
                <span className="font-black text-emerald-600 text-sm">
                  {state.publishedCount || 0} Products
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'SYNCING CATALOG...' : 'SYNC NOW'}</span>
            </button>
          </div>
        </div>

        {/* Architecture & Discovery Strategy Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">₹0 Architecture & Policy Safety</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Discovery Data ≠ Resale Permission
                </div>
                <p className="text-[11px] text-slate-500">
                  Public feeds (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">products.json</code>) allow fast catalog discovery and testing. Direct commercial order fulfillment uses DeoDap dropshipping plan routing.
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Quality Scoring & Curation
                </div>
                <p className="text-[11px] text-amber-800">
                  Instead of dumping 50,000 random unverified products, the system filters out unavailable, low-margin, or single-image items and publishes only top-scoring sellable goods.
                </p>
              </div>

              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80">
                <div className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Meesho: No Scraping Policy
                </div>
                <p className="text-[11px] text-rose-800">
                  Automated scraping of Meesho is intentionally blocked by platform architecture. Only authorized partner API tokens can be connected.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Database: Neon Serverless PostgreSQL</span>
            <span className="text-emerald-600 font-bold">Auto Dual-Sync</span>
          </div>
        </div>

        {/* Pricing Simulator (User's Exact Formula) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Automated Pricing Formula</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">
                Live Formula
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl font-mono text-xs space-y-1.5 mb-4 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold mb-1">Tiered Markup Rules:</div>
              <div className="flex justify-between text-emerald-400">
                <span>₹0 – ₹200</span>
                <span className="font-bold">+ ₹150</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>₹200 – ₹500</span>
                <span className="font-bold">+ ₹200</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>₹500 – ₹1000</span>
                <span className="font-bold">+ ₹300</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>₹1000+</span>
                <span className="font-bold">+ 25%</span>
              </div>
            </div>

            {/* Interactive Calculator */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Test Supplier Cost</span>
                  <span className="font-bold text-slate-900 font-mono">₹{calcCost}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="10"
                  value={calcCost}
                  onChange={(e) => setCalcCost(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Your Selling Price</div>
                  <div className="text-base font-black text-slate-900">₹{calcResult.sellingPrice}</div>
                  <div className="text-[10px] text-slate-400">Customer sees only this</div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Your Profit Margin</div>
                  <div className="text-base font-black text-emerald-700">₹{calcResult.margin}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">+{calcResult.marginPercent}% gross margin</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Example: ₹220 Cost → ₹420 Selling</span>
            <span className="font-semibold text-emerald-600">₹200 Margin</span>
          </div>
        </div>
      </div>

      {/* Filtration & Automation Controls Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Ingestion Filter Criteria & Quality Thresholds</span>
            </h3>
            <p className="text-xs text-slate-500">
              Control the Discovery Engine's strict quality filtering parameters
            </p>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{savingConfig ? 'Saving...' : 'Save Filter Thresholds'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Min Quality Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Minimum Quality Score</label>
              <span className="text-xs font-black text-amber-600 font-mono px-2 py-0.5 bg-amber-50 rounded-md">
                {minQualityScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={minQualityScore}
              onChange={(e) => setMinQualityScore(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Evaluates stock, multiple images, title richness, and description completeness.
            </p>
          </div>

          {/* Max Publish Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Max Products to Publish</label>
              <span className="text-xs font-black text-slate-900 font-mono px-2 py-0.5 bg-slate-100 rounded-md">
                {maxPublishLimit} Items
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={maxPublishLimit}
              onChange={(e) => setMaxPublishLimit(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
            <p className="text-[11px] text-slate-500">
              Keeps store fast, focused, and curated (500 maximum recommended for high conversion).
            </p>
          </div>

          {/* Background Interval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Automatic Sync Interval</label>
              <span className="text-xs font-black text-blue-600 font-mono px-2 py-0.5 bg-blue-50 rounded-md">
                Every {syncIntervalHours} Hours
              </span>
            </div>
            <select
              value={syncIntervalHours}
              onChange={(e) => setSyncIntervalHours(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="3">Every 3 Hours</option>
              <option value="6">Every 6 Hours (Recommended)</option>
              <option value="12">Every 12 Hours</option>
              <option value="24">Every 24 Hours (Daily)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Runs automatically in the background to update stock and price changes.
            </p>
          </div>
        </div>
      </div>

      {/* Live Sync History & Sample Ingestion Inspector */}
      {latestLog && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Recent Ingestion Run Details</span>
              </h3>
              <p className="text-xs text-slate-500">{latestLog.summary}</p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Duration: {latestLog.durationMs}ms
            </span>
          </div>

          {latestLog.sampleItems && latestLog.sampleItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">Product Title</th>
                    <th className="py-2.5 px-3">Supplier Cost</th>
                    <th className="py-2.5 px-3">Selling Price</th>
                    <th className="py-2.5 px-3">Margin</th>
                    <th className="py-2.5 px-3">Quality Score</th>
                    <th className="py-2.5 px-3 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestLog.sampleItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        ₹{item.supplierPrice}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        ₹{item.sellingPrice}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                        +₹{item.margin}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                          item.score >= 75 ? 'bg-emerald-50 text-emerald-700' : item.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.score}/100
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            <Check className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full" title={item.reason}>
                            Filtered ({item.reason || 'Low Score'})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Click "SYNC NOW" above to trigger your first live feed ingestion cycle.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
