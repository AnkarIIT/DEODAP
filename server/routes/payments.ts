import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ManualUPIPaymentProvider } from '../payments/ManualUPIPaymentProvider';
import { MockPaymentProvider } from '../payments/MockPaymentProvider';
import { OrderStateMachine } from '../orders/OrderStateMachine';

const router = Router();
const upiProvider = new ManualUPIPaymentProvider();
const mockProvider = new MockPaymentProvider();

// POST /api/payments/submit-utr - Customer submits 12-digit UPI UTR reference
router.post('/submit-utr', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId, utrNumber } = req.body;
    if (!orderId || !utrNumber) {
      return res.status(400).json({ error: 'Order ID and 12-digit UPI UTR / Reference number are required.' });
    }

    const cleanUtr = String(utrNumber).trim().toUpperCase();
    if (cleanUtr.length < 8) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UPI reference (UTR) number.' });
    }

    const order = db.findOrderByIdOrNumber(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    // Record UTR on payment
    let payment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
    if (!payment) {
      payment = {
        id: `pay-${Date.now()}`,
        orderId: order.id,
        method: 'UPI_MANUAL',
        status: 'PENDING',
        amount: order.totalAmount,
        currency: 'INR',
        createdAt: new Date().toISOString(),
      };
      db.addPayment(order.id, payment);
    }

    payment.transactionRef = cleanUtr;
    payment.status = 'UNDER_REVIEW';
    payment.notes = `Customer submitted UTR: ${cleanUtr}. Waiting for admin bank verification.`;
    db.save();

    // Transition state machine to PAYMENT_REVIEW
    await OrderStateMachine.transition(
      order.id,
      'PAYMENT_REVIEW',
      `Customer submitted UPI UTR ${cleanUtr} - Queued for verification`,
      'CUSTOMER'
    );

    res.json({
      success: true,
      message: 'UTR submitted! Your payment is under review. Our team verifies payments every few minutes.',
      status: 'PAYMENT_REVIEW',
      utr: cleanUtr,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit payment UTR.' });
  }
});

// POST /api/payments/pay-mock - Instant test payment simulation
router.post('/pay-mock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;
    const order = db.findOrderByIdOrNumber(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const result = await mockProvider.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      customerName: order.customerName,
      method: 'MOCK_GATEWAY',
    });

    await OrderStateMachine.transition(order.id, 'PAID', 'Sandbox payment approved', 'SYSTEM');

    res.json({
      success: true,
      result,
      message: 'Payment simulated successfully! Order moved to PAID.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
