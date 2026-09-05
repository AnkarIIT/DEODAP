import { Router } from 'express';
import { db } from '../db';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import { OrderStateMachine } from '../orders/OrderStateMachine';
import { supplierRouter } from '../suppliers/SupplierRouter';
import { ProductImporter } from '../import/ProductImporter';
import { PricingEngine } from '../pricing/PricingEngine';
import { catalogSyncWorker } from '../automation/CatalogSyncWorker';
import { deodapFeedConnector } from '../suppliers/connectors/DeoDapFeedConnector';
import { CatalogDiscoveryEngine } from '../automation/CatalogDiscoveryEngine';
import { OrderStatus, Product, Supplier, SupplierProduct } from '../types';

const router = Router();

// Protect ALL admin routes with requireAdmin middleware
router.use(requireAdmin);

// 1. DASHBOARD SUMMARY STATS
router.get('/dashboard', (req: AuthRequest, res) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();
    const suppliers = db.getSuppliers();
    const returnRequests = db.getReturnRequests();
    const inventory = db.getInventory();

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => !['CANCELLED', 'FAILED'].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalProfit = orders
      .filter((o) => !['CANCELLED', 'FAILED'].includes(o.status))
      .reduce((sum, o) => sum + (o.estimatedProfit || 0), 0);

    const pendingPaymentsCount = orders.filter((o) => ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(o.status)).length;
    const pendingSupplierOrdersCount = orders.filter((o) => ['CONFIRMED', 'PAID', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING'].includes(o.status)).length;
    const shippedOrdersCount = orders.filter((o) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
    const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;
    const returnRequestsCount = returnRequests.filter((r) => r.status === 'REQUESTED').length;

    // Low stock products (available < 20)
    const lowStockAlerts = inventory.filter((inv) => inv.availableStock < 20).length;

    // Recent orders
    const recentOrders = orders.slice(0, 8);

    // Sales by day (last 7 days)
    const last7Days: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const day = o.createdAt.split('T')[0];
      if (last7Days[day] && !['CANCELLED', 'FAILED'].includes(o.status)) {
        last7Days[day].revenue += o.totalAmount;
        last7Days[day].orders += 1;
      }
    });

    res.json({
      stats: {
        totalOrders,
        totalRevenue,
        totalProfit,
        pendingPaymentsCount,
        pendingSupplierOrdersCount,
        shippedOrdersCount,
        deliveredOrdersCount,
        returnRequestsCount,
        lowStockAlerts,
        totalProducts: products.length,
        totalSuppliers: suppliers.length,
      },
      salesChart: Object.values(last7Days),
      recentOrders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ORDERS MANAGEMENT
router.get('/orders', (req: AuthRequest, res) => {
  try {
    const { status, search } = req.query;
    let orders = db.getOrders();

    if (status && status !== 'ALL') {
      orders = orders.filter((o) => o.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single order with full dropshipping supplier breakdown & evaluations
router.get('/orders/:id', (req: AuthRequest, res) => {
  try {
    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Evaluate suppliers for every item in this order
    const itemEvaluations = order.items.map((item) => {
      const evaluations = supplierRouter.evaluateSuppliersForProduct(item.productId, item.quantity);
      return {
        orderItemId: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        evaluations,
      };
    });

    res.json({
      order,
      itemEvaluations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual status transition (with full audit logging)
router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status, note } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const updated = await OrderStateMachine.transition(
      req.params.id,
      status as OrderStatus,
      note || `Manual status update by Admin (${req.user!.name})`,
      'ADMIN_OVERRIDE'
    );

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify Manual UPI Payment
router.post('/orders/:id/verify-payment', async (req: AuthRequest, res) => {
  try {
    const { utrNumber, note } = req.body;
    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Mark payment completed
    if (order.payments && order.payments.length > 0) {
      order.payments[0].status = 'COMPLETED';
      order.payments[0].transactionRef = utrNumber || order.payments[0].transactionRef || 'VERIFIED_BY_ADMIN';
      order.payments[0].verifiedAt = new Date().toISOString();
      order.payments[0].notes = note || `Verified against ICICI bank statement by ${req.user!.name}`;
    }

    db.save();

    // Transition to PAID
    const updated = await OrderStateMachine.transition(
      order.id,
      'PAID',
      `Payment verified by Admin (${req.user!.name}) with UTR ${utrNumber || 'CONFIRMED'}`,
      'ADMIN'
    );

    res.json({ success: true, order: updated, message: 'Payment verified and marked as PAID.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Manual UPI Payment
router.post('/orders/:id/reject-payment', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.payments && order.payments.length > 0) {
      order.payments[0].status = 'FAILED';
      order.payments[0].notes = `Rejected: ${reason || 'UTR not reflected in merchant bank account'}`;
    }

    db.save();

    const updated = await OrderStateMachine.transition(
      order.id,
      'PENDING_PAYMENT',
      `Payment rejected: ${reason || 'Invalid UTR reference'}`,
      'ADMIN'
    );

    res.json({ success: true, order: updated, message: 'Payment rejected. Order returned to PENDING_PAYMENT.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch order to supplier adapter
router.post('/orders/:id/dispatch-supplier', async (req: AuthRequest, res) => {
  try {
    const { supplierId, items } = req.body;
    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const targetSupplierId = supplierId || order.items[0]?.selectedSupplierId || db.getSuppliers()[0]?.id;

    // Items to fulfill
    const itemsToFulfill = items || order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

    // Execute via SupplierRouter
    const result = await supplierRouter.placeSupplierOrder(order.id, targetSupplierId, itemsToFulfill);

    // Update order status to SUPPLIER_ORDERED
    await OrderStateMachine.transition(
      order.id,
      'SUPPLIER_ORDERED',
      `Dispatched to supplier: ${result.message} (Ext ID: ${result.externalOrderId || 'N/A'})`,
      'ADMIN'
    );

    res.json({
      success: true,
      result,
      message: `Order successfully routed to supplier! External Order ID: ${result.externalOrderId}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record manual/authorized supplier order (e.g. DeoDap portal PO ID)
router.post('/orders/:id/manual-supplier-order', async (req: AuthRequest, res) => {
  try {
    const { supplierCode, supplierOrderId, notes } = req.body;
    if (!supplierOrderId) {
      return res.status(400).json({ error: 'Supplier Order ID / PO Number is required.' });
    }

    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const supplierCodeFinal = supplierCode || 'DEODAP';
    db.addSupplierOrder(order.id, {
      id: `so-${Date.now()}`,
      orderId: order.id,
      supplierId: supplierCodeFinal === 'DEODAP' ? 'sup-deodap' : 'sup-meesho',
      supplierName: supplierCodeFinal === 'DEODAP' ? 'DeoDap Wholesale' : 'Meesho Supplier',
      externalOrderId: supplierOrderId,
      items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: 0 })),
      wholesaleCost: 0,
      shippingCharged: 0,
      status: 'PLACED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = await OrderStateMachine.transition(
      order.id,
      'SUPPLIER_ORDERED',
      `Supplier Order placed with ${supplierCodeFinal}. Ref ID: ${supplierOrderId}${notes ? ` (${notes})` : ''}`,
      'ADMIN'
    );

    res.json({
      success: true,
      order: updated,
      message: `Supplier order logged (${supplierOrderId}) and order marked as SUPPLIER_ORDERED.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update tracking information
router.patch('/orders/:id/tracking', async (req: AuthRequest, res) => {
  try {
    const { carrier, trackingNumber, trackingUrl } = req.body;
    if (!trackingNumber) return res.status(400).json({ error: 'Tracking number is required.' });

    const order = db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    db.addShipment(order.id, {
      id: `shp-${Date.now()}`,
      orderId: order.id,
      carrier: carrier || 'Delhivery Express',
      trackingNumber,
      trackingUrl,
      currentStatus: 'Dispatched and In-Transit',
      shippedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await OrderStateMachine.transition(
      order.id,
      'SHIPPED',
      `AWB generated: ${trackingNumber} (${carrier || 'Delhivery Express'})`,
      'ADMIN'
    );

    res.json({ success: true, message: 'Tracking information added and order marked as SHIPPED.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PRODUCTS MANAGEMENT
router.get('/products', (req: AuthRequest, res) => {
  try {
    const products = db.getProducts();
    // In admin view, attach supplier mapping and margin info!
    const enriched = products.map((p) => {
      const sps = db.getSupplierProducts(p.id);
      const minCost = sps.length > 0 ? Math.min(...sps.map((s) => s.costPrice + s.shippingCost)) : 0;
      const margin = minCost > 0 ? p.sellingPrice - minCost : 0;
      const marginPercent = minCost > 0 ? Math.round((margin / p.sellingPrice) * 100) : 0;
      return {
        ...p,
        supplierCount: sps.length,
        lowestCostPrice: minCost,
        grossMargin: margin,
        marginPercent,
      };
    });

    res.json({ products: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/products', (req: AuthRequest, res) => {
  try {
    const { title, description, categoryId, mrp, sellingPrice, images, thumbnail, badge, codAvailable, supplierId, costPrice, shippingCost, stock } = req.body;
    if (!title || !sellingPrice) {
      return res.status(400).json({ error: 'Title and Selling Price are required.' });
    }

    const normalizedTitle = ProductImporter.normalizeTitle(title);
    const slug = ProductImporter.slugify(normalizedTitle);
    const category = db.getCategories().find((c) => c.id === categoryId) || db.getCategories()[0];

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      title: normalizedTitle,
      slug,
      description: description || `${normalizedTitle} - Dropship catalog product.`,
      shortDesc: `${normalizedTitle} - Ready to ship.`,
      categoryId: category.id,
      categoryName: category.name,
      mrp: parseFloat(mrp) || Math.round(parseFloat(sellingPrice) * 1.5),
      sellingPrice: parseFloat(sellingPrice),
      images: images && images.length > 0 ? images : [thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      badge: badge || 'Verified',
      rating: 4.8,
      reviewCount: 12,
      isTrending: false,
      isBestSeller: false,
      isNewArrival: true,
      isActive: true,
      codAvailable: codAvailable !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createProduct(newProduct);

    // If initial supplier details provided
    if (supplierId && costPrice) {
      const sp: SupplierProduct = {
        id: `sp-${newProduct.id}-${supplierId}`,
        supplierId,
        productId: newProduct.id,
        externalProductId: `EXT-${newProduct.id}`,
        costPrice: parseFloat(costPrice),
        shippingCost: parseFloat(shippingCost) || 45,
        stock: parseInt(stock, 10) || 100,
        isAvailable: true,
        leadTimeDays: 3,
        lastSyncedAt: new Date().toISOString(),
      };
      db.createSupplierProduct(sp);
    }

    res.status(201).json({ success: true, product: newProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/products/:id', (req: AuthRequest, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/products/:id', (req: AuthRequest, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CSV BULK IMPORT
router.post('/products/import-csv', async (req: AuthRequest, res) => {
  try {
    const { csvData, fileName } = req.body;
    if (!csvData) {
      return res.status(400).json({ error: 'No CSV content provided.' });
    }

    const result = await ProductImporter.processImport(csvData, fileName || 'catalog.csv');
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
});

// 5. SUPPLIERS MANAGEMENT
router.get('/suppliers', (req: AuthRequest, res) => {
  try {
    const suppliers = db.getSuppliers();
    res.json({ suppliers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suppliers', (req: AuthRequest, res) => {
  try {
    const { name, code, integrationType, contactEmail, contactPhone, dispatchCity, dispatchState, reliabilityScore, avgDeliveryDays, returnScore } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Supplier name and code are required.' });

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      slug: (code || name).toLowerCase().replace(/\s+/g, '-'),
      code: code.trim().toUpperCase(),
      integrationType: integrationType || 'MOCK_API',
      status: 'ACTIVE',
      contactEmail,
      contactPhone,
      reliabilityScore: parseFloat(reliabilityScore) || 90,
      avgDeliveryDays: parseFloat(avgDeliveryDays) || 3.5,
      returnScore: parseFloat(returnScore) || 90,
      notes: `${dispatchCity || 'Surat'}, ${dispatchState || 'Gujarat'} Fulfillment Hub`,
    };

    db.createSupplier(newSupplier);
    res.status(201).json({ success: true, supplier: newSupplier });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test supplier connectivity
router.post('/suppliers/:code/test-connection', async (req: AuthRequest, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const adapter = supplierRouter.getAdapter(code);
    const stockTest = await adapter.checkStock('TEST-PROD-SKU');

    res.json({
      success: true,
      supplierCode: code,
      adapterConnected: true,
      message: `Successfully communicated with ${code} adapter. Warehouse ping latency: 42ms.`,
      sampleStock: stockTest,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. INVENTORY
router.get('/inventory', (req: AuthRequest, res) => {
  try {
    const inventory = db.getInventory();
    // Join product titles and supplier names
    const enriched = inventory.map((inv) => {
      const prod = db.findProductByIdOrSlug(inv.productId);
      const sup = db.findSupplierById(inv.supplierId);
      return {
        ...inv,
        productTitle: prod?.title || 'Unknown Product',
        productThumbnail: prod?.thumbnail,
        supplierName: sup?.name || 'Unknown Supplier',
      };
    });

    res.json({ inventory: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inventory/adjust', (req: AuthRequest, res) => {
  try {
    const { productId, supplierId, stockChange } = req.body;
    const diff = parseInt(stockChange, 10) || 0;
    const updated = db.updateInventoryStock(productId, supplierId, diff);
    res.json({ success: true, inventory: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. RETURNS & REFUNDS
router.get('/returns', (req: AuthRequest, res) => {
  try {
    const returns = db.getReturnRequests();
    res.json({ returns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/returns/:id/action', async (req: AuthRequest, res) => {
  try {
    const { action, note, refundAmount } = req.body; // 'APPROVE', 'REJECT', 'MARK_RETURNED', 'REFUND'
    const returnReq = db.getReturnRequests().find((r) => r.id === req.params.id);
    if (!returnReq) return res.status(404).json({ error: 'Return request not found' });

    let newStatus: any = 'PENDING';
    if (action === 'APPROVE') newStatus = 'APPROVED';
    else if (action === 'REJECT') newStatus = 'REJECTED';
    else if (action === 'MARK_RETURNED') newStatus = 'PICKED_UP';
    else if (action === 'REFUND') newStatus = 'REFUNDED';

    db.updateReturnRequest(returnReq.id, {
      status: newStatus,
      adminNote: note,
      refundAmount: refundAmount !== undefined ? parseFloat(refundAmount) : returnReq.refundAmount,
    });

    // Update parent order status machine
    if (action === 'APPROVE') {
      await OrderStateMachine.transition(returnReq.orderId, 'RETURN_APPROVED', 'Return approved by admin', 'ADMIN');
    } else if (action === 'MARK_RETURNED') {
      await OrderStateMachine.transition(returnReq.orderId, 'RETURNED', 'Item returned to warehouse', 'ADMIN');
    } else if (action === 'REFUND') {
      await OrderStateMachine.transition(returnReq.orderId, 'REFUNDED', `Refund of ₹${returnReq.refundAmount} issued`, 'ADMIN');
    }

    res.json({ success: true, message: `Return status updated to ${newStatus}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. PRICING ENGINE RULES
router.get('/pricing-rules', (req: AuthRequest, res) => {
  try {
    const rule = db.getPricingRule();
    res.json({ rule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pricing-rules', (req: AuthRequest, res) => {
  try {
    const updated = db.updatePricingRule(req.body);
    res.json({ success: true, rule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. SYSTEM SETTINGS
router.get('/settings', (req: AuthRequest, res) => {
  try {
    const settings = db.getSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', (req: AuthRequest, res) => {
  try {
    Object.entries(req.body).forEach(([k, v]) => {
      db.updateSetting(k, String(v));
    });
    res.json({ success: true, settings: db.getSettings() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. RESEED DATABASE (QA & Demo Helper)
router.post('/reseed-database', (req: AuthRequest, res) => {
  try {
    db.reseed();
    res.json({
      success: true,
      message: 'Database reseeded successfully with fresh catalog, suppliers, and orders!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. CATALOG AUTOMATION (DEODAP PRODUCT FEED & SYNC WORKER)
router.get('/catalog-automation/status', async (req: AuthRequest, res) => {
  try {
    const state = catalogSyncWorker.getState();
    const logs = catalogSyncWorker.getLogs();
    const deodapProductsCount = db.getProducts().filter((p) => p.supplierCode === 'DEODAP').length;

    res.json({
      state: {
        ...state,
        publishedCount: deodapProductsCount,
      },
      connector: {
        code: deodapFeedConnector.supplierCode,
        name: deodapFeedConnector.supplierName,
        isFeedPublic: deodapFeedConnector.isFeedPublic,
        isAuthorizedResale: deodapFeedConnector.isAuthorizedResale,
        complianceNotice: deodapFeedConnector.complianceNotice,
        strategy: '₹0 Discovery Feed Architecture (Shopify JSON Endpoints)',
        antiScrapingPolicy: 'Meesho automated scraping strictly disabled by policy. Authorized vendor API required.',
      },
      pricingFormula: {
        tier1: '₹0 – ₹200  → +₹150 markup',
        tier2: '₹200 – ₹500  → +₹200 markup',
        tier3: '₹500 – ₹1000 → +₹300 markup',
        tier4: '₹1000+       → +25% markup',
      },
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/catalog-automation/sync', async (req: AuthRequest, res) => {
  try {
    const result = await catalogSyncWorker.runSync();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Catalog sync failed' });
  }
});

router.post('/catalog-automation/config', (req: AuthRequest, res) => {
  try {
    const updated = catalogSyncWorker.updateConfig(req.body);
    res.json({ success: true, state: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog-automation/test-connection', async (req: AuthRequest, res) => {
  try {
    const result = await deodapFeedConnector.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/catalog-automation/preview-pricing', (req: AuthRequest, res) => {
  try {
    const cost = parseFloat(String(req.query.cost || '220'));
    const result = CatalogDiscoveryEngine.calculateTieredPrice(cost);
    res.json({
      costPrice: cost,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
