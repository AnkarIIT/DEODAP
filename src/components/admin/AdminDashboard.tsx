import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Users,
  Settings,
  Plus,
  RefreshCw,
  Search,
  Upload,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
  ArrowRight,
  QrCode,
  Tag,
  Check,
  Copy,
  Sliders,
  Database,
  FileText,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Order, Product, ReturnRequest, OrderStatus } from '../../types';
import { CatalogAutomation } from './CatalogAutomation';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'upi-verify' | 'supplier-router' | 'products' | 'catalog-automation' | 'import' | 'inventory' | 'suppliers' | 'returns' | 'settings'
  >('overview');

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [pricingRules, setPricingRules] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string>('');

  // Drilldown states
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string>('');
  const [statusChangeNote, setStatusChangeNote] = useState<string>('');
  const [awbCarrier, setAwbCarrier] = useState<string>('Delhivery');
  const [awbTrackingNumber, setAwbTrackingNumber] = useState<string>('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [supplierOrderIdInput, setSupplierOrderIdInput] = useState<{ [orderId: string]: string }>({});
  const [supplierCarrierInput, setSupplierCarrierInput] = useState<{ [orderId: string]: string }>({});
  const [supplierAwbInput, setSupplierAwbInput] = useState<{ [orderId: string]: string }>({});

  // CSV Import State
  const [csvInput, setCsvInput] = useState<string>(`title,category,wholesalePrice,mrp,sku,stock,description,images
Mini USB Rechargeable Fan,electronics-gadgets,140,499,MUSB-FAN-01,75,Ultra compact desk fan with 3 speed settings,https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600
Multi-blade Herb Scissors,kitchen-home,75,299,HERB-SCIS-02,120,5 stainless steel blades for rapid salad preparation,https://images.unsplash.com/photo-1590736969955-71cc94801759?w=600`);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // New Product Modal
  const [showNewProductModal, setShowNewProductModal] = useState<boolean>(false);
  const [newProductData, setNewProductData] = useState<any>({
    title: '',
    categorySlug: 'kitchen-home',
    wholesalePrice: 150,
    sellingPrice: 399,
    mrp: 799,
    stock: 50,
    description: '',
    thumbnail: 'https://images.unsplash.com/photo-1585336261026-7f4153a7b5bb?w=600',
    images: ['https://images.unsplash.com/photo-1585336261026-7f4153a7b5bb?w=600'],
  });

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, ordRes, prodRes, suppRes, invRes, retRes, ruleRes, settRes] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.getOrders(),
        api.admin.getProducts(),
        api.admin.getSuppliers(),
        api.admin.getInventory(),
        api.admin.getReturns(),
        api.admin.getPricingRules(),
        api.admin.getSettings(),
      ]);

      setDashboardData(dashRes);
      setOrders(ordRes.orders);
      setProducts(prodRes.products);
      setSuppliers(suppRes.suppliers);
      setInventory(invRes.inventory);
      setReturns(retRes.returns);
      setPricingRules(ruleRes.rule);
      setStoreSettings(settRes.settings);

      // Neon Database status
      api.admin.getDatabaseStatus().then(setDbStatus).catch(console.error);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  // State Machine Transition
  const handleTransitionOrderStatus = async (orderId: string, toStatus: string, note?: string) => {
    try {
      const res = await api.admin.updateOrderStatus(orderId, toStatus, note);
      showNotification(`Order status updated to ${toStatus}`);
      loadAllAdminData();
      if (selectedOrder && selectedOrder.order.id === orderId) {
        // Refresh drilldown
        const updated = await api.admin.getOrderDetails(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Transition failed');
    }
  };

  // UPI Verification
  const handleVerifyUpiPayment = async (orderId: string, utr?: string) => {
    try {
      await api.admin.verifyPayment(orderId, utr, 'UTR verified against bank statement');
      showNotification('Payment verified! Order marked as PAID and ready for supplier dispatch.');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleRejectUpiPayment = async (orderId: string) => {
    const reason = prompt('Enter payment rejection reason:', 'Invalid UTR reference or amount mismatch');
    if (!reason) return;
    try {
      await api.admin.rejectPayment(orderId, reason);
      showNotification('Payment rejected.');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  // Dispatch to Supplier
  const handleDispatchSupplier = async (orderId: string, supplierId?: string) => {
    try {
      const res = await api.admin.dispatchSupplier(orderId, supplierId);
      showNotification(`Order dispatched to supplier! Supplier Order ID: ${res.dispatchResult?.supplierOrderId}`);
      loadAllAdminData();
      if (selectedOrder && selectedOrder.order.id === orderId) {
        const updated = await api.admin.getOrderDetails(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Supplier dispatch failed');
    }
  };

  // Update AWB Tracking
  const handleUpdateAwb = async (orderId: string) => {
    if (!awbTrackingNumber) {
      alert('Please enter an AWB tracking number');
      return;
    }
    try {
      await api.admin.updateTracking(
        orderId,
        awbCarrier,
        awbTrackingNumber,
        `https://www.delhivery.com/track/package/${awbTrackingNumber}`
      );
      showNotification(`AWB Tracking updated for carrier ${awbCarrier}! Order marked as SHIPPED.`);
      setAwbTrackingNumber('');
      loadAllAdminData();
      if (selectedOrder && selectedOrder.order.id === orderId) {
        const updated = await api.admin.getOrderDetails(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Tracking update failed');
    }
  };

  // View order detail in drilldown modal
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      const details = await api.admin.getOrderDetails(orderId);
      setSelectedOrder(details);
      setActiveTab('orders');
    } catch (err: any) {
      alert(err.message || 'Failed to load order details');
    }
  };

  // Copy structured order details to paste into DeoDap / supplier checkout
  const handleCopyOrderDetailsForSupplier = (order: Order) => {
    const addr = order.shippingAddress as any;
    const streetText = addr.street || addr.addressLine1 || '';
    const landmarkText = addr.landmark || addr.addressLine2 ? ` (Near ${addr.landmark || addr.addressLine2})` : '';

    const text = `=== DROPSHIP FULFILLMENT DETAILS ===
Order ID: #${order.orderNumber}
Recipient: ${order.shippingAddress.fullName}
Mobile Phone: ${order.shippingAddress.phone}
Address: ${streetText}${landmarkText}
City: ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}

=== ITEMS TO ORDER FROM SUPPLIER ===
${order.items.map((it, idx) => `${idx + 1}. ${it.productTitle}\n   Quantity: ${it.quantity}\n   Unit Selling Price: ₹${it.unitPrice}\n   Internal SKU: ${it.productId}`).join('\n\n')}

Total Customer Value: ₹${order.totalAmount}
Order Status: ${order.status}`;

    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    showNotification(`Copied fulfillment details for Order #${order.orderNumber}!`);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Log manual / portal supplier order ID (e.g. DeoDap PO ID)
  const handleManualSupplierOrderSubmit = async (orderId: string) => {
    const soId = supplierOrderIdInput[orderId]?.trim();
    if (!soId) {
      alert('Please enter the Supplier Order ID or PO reference from DeoDap / supplier.');
      return;
    }
    try {
      const res = await api.admin.recordSupplierOrder(orderId, soId, 'DEODAP');
      showNotification(res.message || 'Supplier Order ID logged!');
      setSupplierOrderIdInput((prev) => ({ ...prev, [orderId]: '' }));
      await loadAllAdminData();
      if (selectedOrder && selectedOrder.order.id === orderId) {
        const updated = await api.admin.getOrderDetails(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record supplier order');
    }
  };

  // Save AWB and transition order to SHIPPED
  const handleSaveAwbForOrder = async (orderId: string) => {
    const awb = supplierAwbInput[orderId]?.trim() || awbTrackingNumber.trim();
    const carrier = supplierCarrierInput[orderId] || awbCarrier || 'Delhivery';
    if (!awb) {
      alert('Please enter a valid Courier AWB / Tracking number.');
      return;
    }
    try {
      await api.admin.updateTracking(
        orderId,
        carrier,
        awb,
        `https://www.delhivery.com/track/package/${awb}`
      );
      showNotification(`AWB ${awb} (${carrier}) saved! Order marked as SHIPPED.`);
      setSupplierAwbInput((prev) => ({ ...prev, [orderId]: '' }));
      setAwbTrackingNumber('');
      await loadAllAdminData();
      if (selectedOrder && selectedOrder.order.id === orderId) {
        const updated = await api.admin.getOrderDetails(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Tracking update failed');
    }
  };

  // Test Supplier Connection
  const handleTestSupplier = async (code: string) => {
    try {
      const res = await api.admin.testSupplierConnection(code);
      alert(`Supplier Connection Test (${code}):\nStatus: ${res.connected ? 'SUCCESS (200 OK)' : 'FAILED'}\nMessage: ${res.message}\nLatency: ${res.latencyMs}ms`);
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    }
  };

  // CSV Import Submit
  const handleCsvImport = async () => {
    setIsImporting(true);
    try {
      const res = await api.admin.importCSV(csvInput, 'bulk-upload.csv');
      setImportResult(res.result);
      showNotification(`CSV Import Complete: ${res.result.successfulCount} created, ${res.result.updatedCount} updated.`);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Reseed Database
  const handleReseed = async () => {
    if (!window.confirm('Reset database with clean seed products, suppliers, and orders? This will reload all demo data.')) return;
    setLoading(true);
    try {
      await api.admin.reseedDatabase();
      showNotification('Database reseeded successfully!');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Reseed failed');
    } finally {
      setLoading(false);
    }
  };

  // Process Return Action
  const handleReturnAction = async (returnId: string, action: string) => {
    const note = prompt(`Enter operator note for ${action}:`, 'Customer claim inspected and processed.');
    if (!note) return;
    try {
      await api.admin.processReturnAction(returnId, action, note);
      showNotification(`Return action '${action}' processed.`);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Return action failed');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.updateSettings(storeSettings);
      await api.admin.updatePricingRules(pricingRules);
      showNotification('Store settings & pricing rules saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  // Inventory adjustment
  const handleStockAdjust = async (productId: string, supplierId: string, change: number) => {
    try {
      await api.admin.adjustInventory(productId, supplierId, change);
      showNotification('Inventory adjusted');
      const invRes = await api.admin.getInventory();
      setInventory(invRes.inventory);
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed');
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Connecting to Dropshipping Operations Engine...</p>
      </div>
    );
  }

  const kpis = dashboardData?.stats
    ? {
        totalRevenue: dashboardData.stats.totalRevenue || 0,
        estimatedGrossProfit: dashboardData.stats.totalProfit || 0,
        totalOrders: dashboardData.stats.totalOrders || 0,
        ordersPendingPayment: dashboardData.stats.pendingPaymentsCount || 0,
        ordersPendingSupplier: dashboardData.stats.pendingSupplierOrdersCount || 0,
        ordersInTransit: dashboardData.stats.shippedOrdersCount || 0,
        pendingReturns: dashboardData.stats.returnRequestsCount || 0,
        lowStockCount: dashboardData.stats.lowStockAlerts || 0,
      }
    : dashboardData?.kpis || {
        totalRevenue: 0,
        estimatedGrossProfit: 0,
        totalOrders: 0,
        ordersPendingPayment: 0,
        ordersPendingSupplier: 0,
        ordersInTransit: 0,
        pendingReturns: 0,
        lowStockCount: 0,
      };

  const trendList = dashboardData?.salesChart || dashboardData?.recentTrend || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-slate-700 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Admin Top Navigation & Status Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Operations & Fulfillment Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time Dropshipping Routing • DeoDap / Meesho Adapters • Manual UPI Verification • Order State Machine
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAllAdminData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleReseed}
            className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Reset database to fresh seed state"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue</p>
          <p className="text-lg font-black text-slate-900 mt-1">₹{kpis.totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> Realized
          </p>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Est. Gross Profit</p>
          <p className="text-lg font-black text-emerald-700 mt-1">₹{kpis.estimatedGrossProfit.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
            Margin: {kpis.totalRevenue > 0 ? Math.round((kpis.estimatedGrossProfit / kpis.totalRevenue) * 100) : 0}%
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</p>
          <p className="text-lg font-black text-slate-900 mt-1">{kpis.totalOrders}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Lifetime</p>
        </div>

        {/* Pending UPI Verification */}
        <div
          onClick={() => setActiveTab('upi-verify')}
          className="bg-white p-3.5 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">UPI Review</p>
          <p className="text-lg font-black text-amber-700 mt-1">{kpis.ordersPendingPayment}</p>
          <p className="text-[10px] text-amber-800 font-bold mt-0.5 flex items-center gap-0.5">
            <QrCode className="w-3 h-3" /> Needs Verify
          </p>
        </div>

        {/* Supplier Routing Pending */}
        <div
          onClick={() => setActiveTab('supplier-router')}
          className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-xs cursor-pointer hover:border-indigo-400 transition-all"
        >
          <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Supplier Pending</p>
          <p className="text-lg font-black text-indigo-700 mt-1">{kpis.ordersPendingSupplier}</p>
          <p className="text-[10px] text-indigo-800 font-bold mt-0.5">Ready to Dispatch</p>
        </div>

        {/* In Transit via Courier */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Transit</p>
          <p className="text-lg font-black text-sky-700 mt-1">{kpis.ordersInTransit}</p>
          <p className="text-[10px] text-sky-600 font-semibold mt-0.5 flex items-center gap-0.5">
            <Truck className="w-3 h-3" /> Delhivery/BlueDart
          </p>
        </div>

        {/* Pending Returns */}
        <div
          onClick={() => setActiveTab('returns')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-400"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Returns</p>
          <p className="text-lg font-black text-rose-600 mt-1">{kpis.pendingReturns}</p>
          <p className="text-[10px] text-rose-500 font-medium mt-0.5">7-Day Claims</p>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-400"
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock</p>
          <p className="text-lg font-black text-amber-600 mt-1">{kpis.lowStockCount}</p>
          <p className="text-[10px] text-amber-700 font-medium mt-0.5">&lt; 10 units</p>
        </div>
      </div>

      {/* Tab Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
          { id: 'catalog-automation', label: 'Catalog Automation (DeoDap)', icon: Zap },
          { id: 'orders', label: `Orders (${orders.length})`, icon: Package },
          { id: 'upi-verify', label: `UPI Verification Queue (${kpis.ordersPendingPayment})`, icon: QrCode },
          { id: 'supplier-router', label: `Supplier Dispatch Engine (${kpis.ordersPendingSupplier})`, icon: Building },
          { id: 'products', label: `Catalog & Margins (${products.length})`, icon: ShoppingBag },
          { id: 'import', label: 'CSV Bulk Importer', icon: Upload },
          { id: 'inventory', label: 'Multi-Supplier Stock', icon: Sliders },
          { id: 'suppliers', label: 'Supplier Hub (DeoDap / Meesho)', icon: ShieldCheck },
          { id: 'returns', label: `Returns & Claims (${returns.length})`, icon: RotateCcw },
          { id: 'settings', label: 'Pricing Engine & Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedOrder(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue and Orders 7-Day Trend Visualization */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>7-Day Store Revenue & Orders Volume</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">Real-time dropshipping fulfillment performance</p>

            <div className="h-44 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-slate-100">
              {trendList.map((item: any, idx: number) => {
                const maxRev = Math.max(...trendList.map((t: any) => t.revenue || 0), 1000);
                const heightPct = Math.max(12, Math.round(((item.revenue || 0) / maxRev) * 100));
                const dayLabel = item.day || (item.date ? item.date.slice(5) : `Day ${idx + 1}`);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] font-bold text-slate-700 group-hover:text-amber-600 transition-colors">
                      ₹{item.revenue || 0}
                    </div>
                    <div className="w-full max-w-[36px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-32">
                      <div
                        className="bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-xl transition-all duration-500 group-hover:from-amber-600 group-hover:to-amber-500 shadow-xs"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('catalog-automation')}
              className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 rounded-3xl hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider bg-amber-200/60 px-2 py-0.5 rounded-full">
                  ₹0 Feed Ingestion
                </span>
                <Zap className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-base font-black text-slate-900">Catalog Automation</h4>
              <p className="text-xs text-slate-600 mt-1">
                Zero manual entry. Ingest & score 50,000+ DeoDap products with automated tiered margins.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 mt-3">
                Open Sync Studio <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => setActiveTab('upi-verify')}
              className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-3xl hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Action Required</span>
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-base font-black text-slate-900">Verify Customer UPI UTRs</h4>
              <p className="text-xs text-slate-600 mt-1">
                {kpis.ordersPendingPayment} customer orders waiting for payment confirmation against bank statement.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 mt-3">
                Open Verification Queue <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => setActiveTab('supplier-router')}
              className="p-5 bg-indigo-50/70 border border-indigo-200/80 rounded-3xl hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Fulfillment</span>
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="text-base font-black text-slate-900">Supplier Routing Engine</h4>
              <p className="text-xs text-slate-600 mt-1">
                {kpis.ordersPendingSupplier} paid orders ready for DeoDap / Meesho landed cost dispatch.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-800 mt-3">
                Run Supplier Router <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => setActiveTab('import')}
              className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-3xl hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Catalog Expansion</span>
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-base font-black text-slate-900">CSV Bulk Product Importer</h4>
              <p className="text-xs text-slate-600 mt-1">
                Import CSV catalogs from DeoDap/Wholesale distributors with automatic dynamic retail pricing.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 mt-3">
                Import Wholesale CSV <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Orders & State Machine Transitions */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {selectedOrder ? (
            /* ORDER DRILLDOWN & STATE MACHINE TESTER */
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  ← Back to Orders List
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Order #{selectedOrder.order.orderNumber}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                    {selectedOrder.order.status}
                  </span>
                </div>
              </div>

              {/* State Machine Transition Studio */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Order State Machine Transition Engine
                  </h4>
                  <span className="text-[10px] text-slate-400">Enforces Valid Lifecycle Rules</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Transition To:</span>
                  {[
                    'PENDING_PAYMENT',
                    'PAYMENT_REVIEW',
                    'PAID',
                    'CONFIRMED',
                    'SUPPLIER_SELECTION',
                    'SUPPLIER_ORDERED',
                    'PROCESSING',
                    'SHIPPED',
                    'DELIVERED',
                    'CANCELLED',
                  ].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleTransitionOrderStatus(selectedOrder.order.id, st, 'Transitioned by Admin')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedOrder.order.status === st
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Landed Cost & Supplier Margin Evaluation */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Items & Multi-Supplier Margin Evaluation
                </h4>
                <div className="space-y-3">
                  {selectedOrder.itemEvaluations?.map((itemEval: any) => (
                    <div
                      key={itemEval.orderItemId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                    >
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{itemEval.productTitle} (Qty: {itemEval.quantity})</span>
                      </div>

                      {/* Supplier Landed Cost Comparison Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-1">Supplier</th>
                              <th className="py-1">Wholesale Cost</th>
                              <th className="py-1">Est. Shipping</th>
                              <th className="py-1 font-bold">Landed Cost</th>
                              <th className="py-1">Reliability</th>
                              <th className="py-1">Stock</th>
                              <th className="py-1">Recommendation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemEval.evaluations.map((ev: any) => (
                              <tr
                                key={ev.supplierId}
                                className={`border-b border-slate-100 ${
                                  ev.isRecommended ? 'bg-emerald-50/60 font-semibold' : ''
                                }`}
                              >
                                <td className="py-1.5 text-slate-900">{ev.supplierName}</td>
                                <td className="py-1.5">₹{ev.wholesaleCost}</td>
                                <td className="py-1.5">₹{ev.shippingCost}</td>
                                <td className="py-1.5 font-bold text-slate-900">₹{ev.landedCost}</td>
                                <td className="py-1.5">{ev.reliabilityRating} / 5.0</td>
                                <td className="py-1.5">{ev.inStock ? `${ev.stockLevel} units` : 'Out of Stock'}</td>
                                <td className="py-1.5">
                                  {ev.isRecommended ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                      ★ Recommended ({ev.recommendationReason})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">{ev.recommendationReason}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dropship Fulfillment Chain Matrix */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>End-to-End Dropship Fulfillment Chain</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Status: <strong className="text-indigo-600">{selectedOrder.order.status}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Step 1: Copy & Open Supplier */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                        Step 1: Procurement
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-900">Order from DeoDap</h5>
                    <p className="text-slate-600 text-[11px]">
                      Copy formatted recipient and SKU details to paste into DeoDap checkout.
                    </p>
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => handleCopyOrderDetailsForSupplier(selectedOrder.order)}
                        className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        {copiedOrderId === selectedOrder.order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                            <span>Copy Order Details</span>
                          </>
                        )}
                      </button>
                      <a
                        href="https://deodap.in"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open DeoDap Portal</span>
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Supplier Order ID Input */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        Step 2: Supplier Log
                      </span>
                    </div>
                    <h5 className="font-bold text-indigo-950">Record Supplier PO / Order ID</h5>
                    <p className="text-slate-600 text-[11px]">
                      Enter the order ID returned by DeoDap to mark as ordered.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="e.g. DD-98421 or PO#1203"
                        value={supplierOrderIdInput[selectedOrder.order.id] || ''}
                        onChange={(e) =>
                          setSupplierOrderIdInput((prev) => ({
                            ...prev,
                            [selectedOrder.order.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-hidden focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleManualSupplierOrderSubmit(selectedOrder.order.id)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Mark Supplier Ordered
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Courier Tracking & Mark Shipped */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                        Step 3: Courier Dispatch
                      </span>
                    </div>
                    <h5 className="font-bold text-amber-950">Courier AWB & Mark Shipped</h5>
                    <p className="text-slate-600 text-[11px]">
                      Customer tracking page updates instantly with live AWB.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <select
                          value={awbCarrier}
                          onChange={(e) => setAwbCarrier(e.target.value)}
                          className="px-2 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-medium"
                        >
                          <option value="Delhivery">Delhivery</option>
                          <option value="BlueDart">BlueDart</option>
                          <option value="Shadowfax">Shadowfax</option>
                          <option value="XpressBees">XpressBees</option>
                          <option value="Ekart">Ekart</option>
                        </select>
                        <input
                          type="text"
                          placeholder="AWB Tracking #"
                          value={awbTrackingNumber}
                          onChange={(e) => setAwbTrackingNumber(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateAwb(selectedOrder.order.id)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        Save AWB & Mark Shipped
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ORDERS LIST TABLE */
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">All Marketplace Orders</h3>
                <span className="text-xs text-slate-500">{orders.length} orders total</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-3">Order #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">#{order.orderNumber}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{order.shippingAddress.fullName}</p>
                          <p className="text-[10px] text-slate-400">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-700">{order.items.length} items</span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{order.items[0]?.productTitle}</p>
                        </td>
                        <td className="p-3 font-black text-slate-900">₹{order.totalAmount}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : order.status === 'PAYMENT_REVIEW'
                                ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={async () => {
                              const details = await api.admin.getOrderDetails(order.id);
                              setSelectedOrder(details);
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Manual UPI Verification Queue */}
      {activeTab === 'upi-verify' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                <span>Manual UPI Verification Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                Verify customer-submitted 12-digit UTR numbers against your business bank account statement.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              {orders.filter((o) => o.status === 'PAYMENT_REVIEW').length} Pending UTRs
            </span>
          </div>

          <div className="space-y-3">
            {orders.filter((o) => o.status === 'PAYMENT_REVIEW').length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">All UPI payments verified!</p>
                <p>No customer orders are currently pending UTR verification.</p>
              </div>
            ) : (
              orders
                .filter((o) => o.status === 'PAYMENT_REVIEW')
                .map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-slate-900 text-sm">#{order.orderNumber}</span>
                        <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                          UTR SUBMITTED
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">Customer: {order.shippingAddress.fullName} ({order.shippingAddress.phone})</p>
                      <p className="text-slate-600 mt-1">
                        Submitted UTR / Transaction ID:{' '}
                        <strong className="font-mono text-sm text-slate-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                          {order.paymentDetails?.utrNumber || 'PENDING'}
                        </strong>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Amount to verify: <strong className="text-emerald-700 font-bold">₹{order.totalAmount}</strong></p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyUpiPayment(order.id, order.paymentDetails?.utrNumber)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Mark PAID</span>
                      </button>
                      <button
                        onClick={() => handleRejectUpiPayment(order.id)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold border border-rose-200 transition-all cursor-pointer"
                      >
                        Reject UTR
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Supplier Routing Engine */}
      {activeTab === 'supplier-router' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>Dropship Supplier Routing & Fulfillment Studio</span>
              </h3>
              <p className="text-xs text-slate-500">
                End-to-end chain: Paid Orders → Supplier Procurement (DeoDap) → Log PO# → Courier AWB Dispatch → Customer Tracking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200">
                Primary Supplier: DeoDap Wholesale (API/Feed)
              </span>
            </div>
          </div>

          {/* Architecture Pipeline Visualizer */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                Operational Dropshipping Pipeline
              </span>
              <span className="text-[10px] text-slate-400">Zero-Inventory Architecture</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Step 1</span>
                <span className="font-black text-white">Payment Verified</span>
                <span className="block text-[10px] text-emerald-400 mt-0.5">PAID Status</span>
              </div>
              <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-indigo-800/60">
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Step 2</span>
                <span className="font-black text-white">DeoDap Order</span>
                <span className="block text-[10px] text-indigo-300 mt-0.5">Copy & Place PO</span>
              </div>
              <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-800/60">
                <span className="text-amber-300 block text-[10px] uppercase font-bold">Step 3</span>
                <span className="font-black text-white">Supplier Ordered</span>
                <span className="block text-[10px] text-amber-300 mt-0.5">Log Supplier Ref</span>
              </div>
              <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-800/60">
                <span className="text-emerald-300 block text-[10px] uppercase font-bold">Step 4</span>
                <span className="font-black text-white">Courier AWB</span>
                <span className="block text-[10px] text-emerald-300 mt-0.5">Delhivery / BlueDart</span>
              </div>
            </div>
          </div>

          {/* SECTION 1: Orders Pending Supplier Placement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Orders Pending Supplier Placement ({orders.filter((o) => ['PAID', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING'].includes(o.status)).length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">Ready to procure from DeoDap</span>
            </div>

            {orders.filter((o) => ['PAID', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING'].includes(o.status)).length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700">All paid orders have been placed with suppliers!</p>
              </div>
            ) : (
              orders
                .filter((o) => ['PAID', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING'].includes(o.status))
                .map((order) => (
                  <div
                    key={order.id}
                    className="p-5 bg-indigo-50/40 border border-indigo-200/80 rounded-2xl space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">#{order.orderNumber}</span>
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {order.status}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Customer Total: <strong className="text-slate-900">₹{order.totalAmount}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyOrderDetailsForSupplier(order)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          {copiedOrderId === order.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-600" />
                              <span>Copy Order Details</span>
                            </>
                          )}
                        </button>
                        <a
                          href="https://deodap.in"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open DeoDap</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                          Delivery Recipient
                        </span>
                        <p className="font-bold text-slate-900">{order.shippingAddress.fullName} &bull; {order.shippingAddress.phone}</p>
                        <p className="text-slate-600">{order.shippingAddress.street || (order.shippingAddress as any).addressLine1 || ''}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                          Items to Order ({order.items.length})
                        </span>
                        <div className="space-y-1">
                          {order.items.map((it) => (
                            <div key={it.productId} className="flex justify-between text-slate-700">
                              <span className="font-medium truncate max-w-[280px]">{it.quantity}x {it.productTitle}</span>
                              <span className="font-mono text-slate-500">₹{it.unitPrice * it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 2 Execution Bar */}
                    <div className="p-3 bg-white rounded-xl border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[240px] flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-950 whitespace-nowrap">
                          Supplier PO / Order ID:
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. DD-98421 or PO#1203"
                          value={supplierOrderIdInput[order.id] || ''}
                          onChange={(e) =>
                            setSupplierOrderIdInput((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-hidden focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleManualSupplierOrderSubmit(order.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          Mark Supplier Ordered
                        </button>
                        <button
                          onClick={() => handleDispatchSupplier(order.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer text-[11px]"
                        >
                          Auto-Dispatch Adapter
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* SECTION 2: Orders Awaiting Courier AWB Tracking */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Supplier Ordered & Awaiting Courier AWB ({orders.filter((o) => ['SUPPLIER_ORDERED', 'PROCESSING'].includes(o.status)).length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">DeoDap dispatched &bull; enter courier tracking</span>
            </div>

            {orders.filter((o) => ['SUPPLIER_ORDERED', 'PROCESSING'].includes(o.status)).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="font-medium text-slate-600">No orders waiting for courier AWB tracking numbers.</p>
              </div>
            ) : (
              orders
                .filter((o) => ['SUPPLIER_ORDERED', 'PROCESSING'].includes(o.status))
                .map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-2xl space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">#{order.orderNumber}</span>
                        <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          SUPPLIER ORDERED
                        </span>
                        <span className="text-slate-600">
                          Recipient: {order.shippingAddress.fullName} ({order.shippingAddress.city}, {order.shippingAddress.state})
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewOrderDetail(order.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        View Order Logs &rarr;
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-amber-200 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Courier:</span>
                        <select
                          value={supplierCarrierInput[order.id] || 'Delhivery'}
                          onChange={(e) =>
                            setSupplierCarrierInput((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="Delhivery">Delhivery</option>
                          <option value="BlueDart">BlueDart</option>
                          <option value="Shadowfax">Shadowfax</option>
                          <option value="XpressBees">XpressBees</option>
                          <option value="Ekart">Ekart</option>
                        </select>
                      </div>

                      <div className="flex-1 min-w-[200px] flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter AWB Tracking Number (e.g. 1298491823)"
                          value={supplierAwbInput[order.id] || ''}
                          onChange={(e) =>
                            setSupplierAwbInput((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-hidden focus:bg-white focus:border-amber-500"
                        />
                      </div>

                      <button
                        onClick={() => handleSaveAwbForOrder(order.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Save AWB & Mark Shipped
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Product Catalog & Margins */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900">Product Catalog & Margin Analyzer</h3>
              <p className="text-xs text-slate-500">
                Analyze wholesale buy price, selling price, and profit margins per item.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('catalog-automation')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Auto-Sync DeoDap Feed</span>
              </button>
              <button
                onClick={() => setShowNewProductModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Wholesale Buy</th>
                  <th className="p-3">Retail Sell</th>
                  <th className="p-3">MRP</th>
                  <th className="p-3 font-bold text-emerald-700">Gross Margin</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod: any) => {
                  const wholesaleCost = prod.wholesalePrice || prod.supplierPrice || 0;
                  const grossProfit = prod.sellingPrice - wholesaleCost;
                  const marginPct = prod.sellingPrice > 0 ? Math.round((grossProfit / prod.sellingPrice) * 100) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80">
                      <td className="p-3 flex items-center gap-3">
                        <img src={prod.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">{prod.title}</p>
                            {prod.qualityScore && (
                              <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                QS {prod.qualityScore}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {prod.supplierCode ? `Supplier: ${prod.supplierCode}` : `SKU: ${prod.sku || prod.id}`}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 uppercase text-[10px] font-semibold text-slate-600">{prod.categoryName || prod.categorySlug}</td>
                      <td className="p-3 font-semibold text-slate-700">₹{wholesaleCost}</td>
                      <td className="p-3 font-black text-slate-900">₹{prod.sellingPrice}</td>
                      <td className="p-3 text-slate-400 line-through">₹{prod.mrp}</td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          +₹{grossProfit} ({marginPct}%)
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${prod.stock < 10 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {prod.stock} units
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete product "${prod.title}"?`)) {
                              await api.admin.deleteProduct(prod.id);
                              showNotification('Product deleted');
                              loadAllAdminData();
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CSV Bulk Importer */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>CSV Bulk Product Catalog Importer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Paste or upload CSV product dumps from DeoDap, wholesale distributors, or supplier portals.
              The internal PricingEngine automatically enforces required gross margins and computes retail selling prices!
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">CSV Data Payload</label>
              <button
                onClick={() => {
                  setCsvInput(`title,category,wholesalePrice,mrp,sku,stock,description,images
Mini USB Rechargeable Fan,electronics-gadgets,140,499,MUSB-FAN-01,75,Ultra compact desk fan with 3 speed settings,https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600
Multi-blade Herb Scissors,kitchen-home,75,299,HERB-SCIS-02,120,5 stainless steel blades for rapid salad preparation,https://images.unsplash.com/photo-1590736969955-71cc94801759?w=600
Adjustable Orthopedic Back Brace,health-fitness,210,899,ORTH-BRACE-03,45,Breathable lumbar support belt for posture,https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600`);
                }}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                Insert Sample Wholesale CSV
              </button>
            </div>
            <textarea
              rows={8}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
            />
          </div>

          <button
            onClick={handleCsvImport}
            disabled={isImporting || !csvInput.trim()}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Processing CSV...' : 'Process & Import Catalog'}</span>
          </button>

          {/* Import Result Stats */}
          {importResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
              <h4 className="font-bold text-slate-900">CSV Import Report</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-[10px]">Total Parsed</p>
                  <p className="text-base font-bold text-slate-900">{importResult.totalRows}</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-[10px]">New Products</p>
                  <p className="text-base font-bold text-emerald-600">+{importResult.successfulCount}</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-[10px]">Updated</p>
                  <p className="text-base font-bold text-sky-600">{importResult.updatedCount}</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-[10px]">Errors</p>
                  <p className="text-base font-bold text-rose-600">{importResult.failedCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Multi-Supplier Inventory */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">Multi-Supplier Warehouse Inventory</h3>
            <p className="text-xs text-slate-500">
              Live stock levels across connected dropshipping suppliers. Adjust or replenish counts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">Product Title</th>
                  <th className="p-3">Supplier Source</th>
                  <th className="p-3">Wholesale Buy Cost</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{inv.productTitle}</td>
                    <td className="p-3 font-semibold text-slate-700">{inv.supplierName}</td>
                    <td className="p-3">₹{inv.costPrice}</td>
                    <td className="p-3">
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${inv.stock < 10 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {inv.stock} units
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => handleStockAdjust(inv.productId, inv.supplierId, -5)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleStockAdjust(inv.productId, inv.supplierId, 10)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-bold"
                      >
                        +10
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Connected Suppliers Hub */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">Connected Supplier Adapters</h3>
            <p className="text-xs text-slate-500">
              Modular adapter integration for DeoDap, Meesho, and regional wholesale suppliers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map((supp) => (
              <div key={supp.id} className="p-5 rounded-3xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{supp.name}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {supp.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Code: <strong className="font-mono text-slate-900">{supp.code}</strong></p>
                  <p>Fulfillment Speed: <strong>{supp.avgFulfillmentDays} Days</strong></p>
                  <p>Reliability Score: <strong>{supp.reliabilityRating} / 5.0</strong></p>
                  <p>Base Shipping Rate: <strong>₹{supp.baseShippingRate}</strong></p>
                </div>
                <button
                  onClick={() => handleTestSupplier(supp.code)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ping & Test Adapter Connection
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Returns & Claims */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">Customer Return Requests & Claims</h3>
            <p className="text-xs text-slate-500">Review 7-day replacement and refund requests.</p>
          </div>

          <div className="space-y-3">
            {returns.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs">No return claims submitted.</p>
            ) : (
              returns.map((ret) => (
                <div key={ret.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900">Order #{ret.orderNumber}</span>
                      <p className="text-slate-600 font-medium mt-0.5">Reason: {ret.reason}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{ret.description}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                      {ret.status}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleReturnAction(ret.id, 'APPROVE_REPLACEMENT')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                    >
                      Approve Replacement
                    </button>
                    <button
                      onClick={() => handleReturnAction(ret.id, 'APPROVE_REFUND')}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold"
                    >
                      Approve Refund
                    </button>
                    <button
                      onClick={() => handleReturnAction(ret.id, 'REJECT')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Pricing Rules & Store Settings */}
      {activeTab === 'settings' && storeSettings && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs text-xs">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900">Pricing Engine & Platform Configuration</h3>
            <p className="text-xs text-slate-500">
              Configure profit markup formulas, UPI VPA merchant keys, and shipping thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Merchant UPI VPA *</label>
              <input
                type="text"
                value={storeSettings.upiVpa || ''}
                onChange={(e) => setStoreSettings({ ...storeSettings, upiVpa: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Merchant Display Name</label>
              <input
                type="text"
                value={storeSettings.upiPayeeName || ''}
                onChange={(e) => setStoreSettings({ ...storeSettings, upiPayeeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Free Shipping Order Threshold (₹)</label>
              <input
                type="number"
                value={storeSettings.freeShippingThreshold || 699}
                onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Standard Shipping Fee (₹)</label>
              <input
                type="number"
                value={storeSettings.standardShippingFee || 49}
                onChange={(e) => setStoreSettings({ ...storeSettings, standardShippingFee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Pricing Engine Default Markup (%)</label>
              <input
                type="number"
                value={pricingRules?.defaultMarkupPercent || 40}
                onChange={(e) => setPricingRules({ ...pricingRules, defaultMarkupPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Minimum Absolute Profit Margin (₹)</label>
              <input
                type="number"
                value={pricingRules?.minMarginAmount || 50}
                onChange={(e) => setPricingRules({ ...pricingRules, minMarginAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Save Settings & Pricing Formulas
            </button>
          </div>

          {/* Neon PostgreSQL Live Database Status */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Database Engine & Cloud Sync</h4>
                  <p className="text-xs text-slate-500">Connected to Neon Serverless PostgreSQL instance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const status = await api.admin.getDatabaseStatus();
                    setDbStatus(status);
                    showNotification('Neon PostgreSQL status refreshed!');
                  } catch (err: any) {
                    showNotification('Database check failed: ' + err.message);
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Status
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-bold text-slate-900 text-xs">
                    {dbStatus?.connected ? 'Connected & Synced' : 'Checking Connection...'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  {dbStatus?.database ? `DB: ${dbStatus.database} (${dbStatus.user})` : 'Neon pooler'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">PostgreSQL Version</div>
                <div className="font-bold text-slate-900 text-xs truncate">
                  {dbStatus?.version ? dbStatus.version.split(' on ')[0] : 'PostgreSQL 18.6'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
                  ep-soft-math-ayufw2he-pooler.c-5.us-east-2.aws.neon.tech
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Managed Cloud Tables</div>
                <div className="font-bold text-emerald-700 text-xs">
                  {dbStatus?.tableCount || 6} Active Tables
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  products, categories, orders, users, settings
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: Catalog Automation (DeoDap Feed Ingestion) */}
      {activeTab === 'catalog-automation' && (
        <CatalogAutomation
          onRefreshParent={loadAllAdminData}
          showNotification={showNotification}
        />
      )}

      {/* MODAL: New Product */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">Add New Product</h3>
            <div>
              <label className="block font-semibold mb-1">Product Title</label>
              <input
                type="text"
                required
                value={newProductData.title}
                onChange={(e) => setNewProductData({ ...newProductData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Wholesale Buy Price (₹)</label>
                <input
                  type="number"
                  value={newProductData.wholesalePrice}
                  onChange={(e) => setNewProductData({ ...newProductData, wholesalePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  value={newProductData.sellingPrice}
                  onChange={(e) => setNewProductData({ ...newProductData, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await api.admin.createProduct(newProductData);
                  setShowNewProductModal(false);
                  showNotification('Product created!');
                  loadAllAdminData();
                }}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl"
              >
                Create Product
              </button>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="px-4 py-2.5 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
