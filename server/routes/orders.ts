import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { PricingEngine } from '../pricing/PricingEngine';
import { ManualUPIPaymentProvider } from '../payments/ManualUPIPaymentProvider';
import { MockPaymentProvider } from '../payments/MockPaymentProvider';
import { OrderStateMachine } from '../orders/OrderStateMachine';
import { Order, OrderItem } from '../types';

const router = Router();
const upiProvider = new ManualUPIPaymentProvider();
const mockProvider = new MockPaymentProvider();

// POST /api/orders - Place a new order
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { items, address, paymentMethod, couponCode, notes } = req.body;
    const userId = req.user!.id;
    const user = await db.findUserById(userId);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    if (!address || !address.fullName || !address.phone || !address.street || !address.pincode) {
      return res.status(400).json({ error: 'Please provide a complete delivery address.' });
    }

    // Calculate totals server-side
    const totals = await PricingEngine.calculateOrderTotals(items, couponCode, paymentMethod);

    const orderNumber = `BC-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderId = `ord-${Date.now()}`;

    // Save address if it doesn't have an ID
    let addressId = address.id;
    if (!addressId) {
      const savedAddr = await db.createAddress({
        id: `addr-${Date.now()}`,
        userId,
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      addressId = savedAddr.id;
    }

    const orderItems: OrderItem[] = totals.items.map((item, idx) => ({
      id: `oi-${Date.now()}-${idx}`,
      orderId,
      productId: item.productId,
      productTitle: item.productTitle,
      productThumbnail: item.productThumbnail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      supplierCost: item.wholesaleCost, // Saved internally for admin profit calculation
    }));

    const initialStatus = paymentMethod === 'COD' ? 'FULFILMENT_PENDING' : 'PENDING_PAYMENT';
    // UPI: payment must be verified before fulfilment. COD: sale confirmed at checkout,
    // so supplier automation may pick the order up immediately.
    const initialPaymentStatus = paymentMethod === 'COD' ? 'PAID' : 'PENDING_PAYMENT';

    const order: Order = {
      id: orderId,
      orderNumber,
      userId,
      customerName: address.fullName || user?.name,
      customerEmail: user?.email,
      customerPhone: address.phone || user?.phone,
      addressId,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      },
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      automationStatus: 'PENDING',
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      discount: totals.discount,
      couponCode: totals.appliedCoupon?.code,
      totalAmount: totals.totalAmount,
      estimatedProfit: totals.estimatedProfit,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: orderItems,
      payments: [],
      shipments: [],
      statusLogs: [
        {
          id: `log-${Date.now()}`,
          orderId,
          toStatus: initialStatus,
          note: `Order created via ${paymentMethod}`,
          actorRole: 'CUSTOMER',
          createdAt: new Date().toISOString(),
        },
      ],
      supplierOrders: [],
    };

    await db.createOrder(order);

    // Initialize payment
    let paymentResult: any = null;
    if (paymentMethod === 'UPI_MANUAL') {
      paymentResult = await upiProvider.createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        customerName: address.fullName,
        customerPhone: address.phone,
        method: 'UPI_MANUAL',
      });
    } else if (paymentMethod === 'MOCK_GATEWAY') {
      paymentResult = await mockProvider.createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        customerName: address.fullName,
        method: 'MOCK_GATEWAY',
      });
      // Move order to PAID state
      await OrderStateMachine.transition(order.id, 'PAID', 'Sandbox payment approved', 'SYSTEM');
    } else if (paymentMethod === 'COD') {
      // Record COD payment intent (status PENDING - collected at doorstep)
      await db.addPayment(order.id, {
        id: `pay-cod-${Date.now()}`,
        orderId: order.id,
        method: 'COD',
        status: 'PENDING',
        amount: order.totalAmount,
        currency: 'INR',
        notes: 'Cash on Delivery - collect at doorstep',
        createdAt: new Date().toISOString(),
      });
      // COD orders are fulfilable immediately: build the fulfilment packet
      await OrderStateMachine.prepareFulfilment(order.id);
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        automationStatus: order.automationStatus,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
      },
      payment: paymentResult,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to place order.' });
  }
});

// GET /api/orders - Customer orders list
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orders = await db.getOrders(req.user!.id);
    // Sanitize customer order views (remove supplier cost and supplier identity)
    const sanitized = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      automationStatus: o.automationStatus,
      subtotal: o.subtotal,
      shippingFee: o.shippingFee,
      discount: o.discount,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productTitle: i.productTitle,
        productThumbnail: i.productThumbnail,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      shipments: o.shipments,
    }));

    res.json({ orders: sanitized });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id - Detailed order tracking view
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const order = await db.findOrderByIdOrNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Ownership check: must be the order owner
    if (order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized access to this order.' });
    }

    // Sanitize for customer view (strip supplier internals)
    const sanitizedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      automationStatus: order.automationStatus,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        productThumbnail: item.productThumbnail,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        status: p.status,
        amount: p.amount,
        transactionRef: p.transactionRef,
        verifiedAt: p.verifiedAt,
      })),
      shipments: order.shipments,
      statusLogs: order.statusLogs.map((l) => ({
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        note: l.note,
        createdAt: l.createdAt,
      })),
    };

    res.json({ order: sanitizedOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch order details.' });
  }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const order = await db.findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    // Can only cancel before dispatch
    const nonCancellable: any[] = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (nonCancellable.includes(order.status)) {
      return res.status(400).json({
        error: `Order cannot be cancelled in status ${order.status}. Please request a return once delivered.`,
      });
    }

    await OrderStateMachine.transition(order.id, 'CANCELLED', 'Order cancelled by customer', 'CUSTOMER');
    res.json({ success: true, message: 'Order has been cancelled.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/orders/:orderNumber/utr - Customer submits UPI Transaction Reference
router.post('/:orderNumber/utr', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { utr } = req.body;
    const orderNumber = req.params.orderNumber;
    if (!utr) {
      return res.status(400).json({
        success: false,
        error: { code: 'UTR_REQUIRED', message: 'UPI UTR / Reference number is required' },
      });
    }

    const cleanUtr = String(utr).trim().toUpperCase();
    if (cleanUtr.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_UTR', message: 'Please enter a valid UPI reference / UTR number' },
      });
    }

    const order = await db.findOrderByIdOrNumber(orderNumber);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: `Order ${orderNumber} not found` },
      });
    }

    if (order.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You are not authorized to update this order' },
      });
    }

    // Attach UTR and move payment status to REVIEW
    let payment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
    if (!payment) {
      payment = {
        id: `pay-${Date.now()}`,
        orderId: order.id,
        method: 'UPI_MANUAL',
        status: 'UNDER_REVIEW',
        amount: order.totalAmount,
        currency: 'INR',
        transactionRef: cleanUtr,
        notes: `Customer submitted UTR: ${cleanUtr}. Pending manual bank reconciliation.`,
        createdAt: new Date().toISOString(),
      };
      await db.addPayment(order.id, payment);
    } else {
      await db.updatePayment(payment.id, {
        transactionRef: cleanUtr,
        status: 'UNDER_REVIEW',
        notes: `Customer submitted UTR: ${cleanUtr}. Pending manual bank reconciliation.`,
      });
    }

    // Important: Transition to PAYMENT_REVIEW (NOT automatically PAID or VERIFIED)
    await OrderStateMachine.transition(
      order.id,
      'PAYMENT_REVIEW',
      `Customer submitted UTR: ${cleanUtr} - Queued for verification`,
      'CUSTOMER'
    );

    res.json({
      success: true,
      message: 'UTR submitted! Payment is under review. Our team will verify and dispatch your order.',
      status: 'PAYMENT_REVIEW',
      paymentStatus: 'REVIEW',
      utr: cleanUtr,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'UTR_SUBMIT_FAILED', message: err.message || 'Failed to submit UTR' },
    });
  }
});

// GET /api/orders/:orderNumber/tracking - Detailed public/customer tracking timeline
router.get('/:orderNumber/tracking', async (req, res) => {
  try {
    const order = await db.findOrderByIdOrNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    const isConfirmed = !['PENDING_PAYMENT', 'CANCELLED', 'FAILED'].includes(order.status);
    const isPaymentReviewed = ['PAYMENT_REVIEW', 'PAID', 'FULFILMENT_PENDING', 'CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'SUPPLIER_ORDER_FAILED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);
    const isProcuring = ['FULFILMENT_PENDING', 'SUPPLIER_ORDERED', 'SUPPLIER_ORDER_FAILED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);
    const isShipped = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);
    const isOut = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);
    const isDelivered = order.status === 'DELIVERED';

    const latestShipment = order.shipments && order.shipments.length > 0 ? order.shipments[order.shipments.length - 1] : null;

    const timeline = [
      {
        stage: 'ORDER_PLACED',
        title: 'Order Placed',
        description: `Order ${order.orderNumber} received`,
        timestamp: order.createdAt,
        completed: true,
      },
      {
        stage: 'PAYMENT_STATUS',
        title: order.paymentMethod === 'COD' ? 'Cash on Delivery Verified' : (isPaymentReviewed ? 'Payment Verified' : 'Awaiting Payment Verification'),
        description: order.paymentMethod === 'COD' ? 'Pay upon delivery' : (isPaymentReviewed ? 'Payment confirmed by accounts' : 'Scan QR & submit UTR'),
        completed: order.paymentMethod === 'COD' || isPaymentReviewed,
      },
      {
        stage: 'PROCESSING',
        title: 'Supplier Fulfillment & Packing',
        description: isProcuring ? 'Order packed at DeoDap fulfillment center' : 'Awaiting supplier allocation',
        completed: isProcuring,
      },
      {
        stage: 'SHIPPED',
        title: isShipped ? `Dispatched via ${latestShipment?.carrier || 'Delhivery Express'}` : 'Courier Dispatch',
        description: isShipped ? `AWB: ${latestShipment?.trackingNumber || 'In transit'}` : 'Handover to logistics partner',
        completed: isShipped,
        carrier: latestShipment?.carrier,
        trackingNumber: latestShipment?.trackingNumber,
        trackingUrl: latestShipment?.trackingUrl,
      },
      {
        stage: 'OUT_FOR_DELIVERY',
        title: 'Out for Delivery',
        description: 'Courier agent will arrive today',
        completed: isOut,
      },
      {
        stage: 'DELIVERED',
        title: 'Delivered',
        description: 'Delivered to your address',
        completed: isDelivered,
      },
    ];

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      shippingAddress: {
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        pincode: order.shippingAddress.pincode,
      },
      carrier: latestShipment?.carrier || null,
      trackingNumber: latestShipment?.trackingNumber || null,
      trackingUrl: latestShipment?.trackingUrl || null,
      timeline,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TRACKING_FAILED', message: err.message || 'Failed to fetch tracking details' },
    });
  }
});

// POST /api/orders/:orderNumber/payment
router.post('/:orderNumber/payment', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { method } = req.body;
    const order = await db.findOrderByIdOrNumber(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      paymentMethod: method || order.paymentMethod,
      status: order.status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_INIT_FAILED', message: err.message },
    });
  }
});

export default router;

