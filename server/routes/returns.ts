import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { OrderStateMachine } from '../orders/OrderStateMachine';
import { ReturnRequest } from '../types';

const router = Router();

// POST /api/returns - Customer requests return/exchange
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId, reason, description, images } = req.body;
    const userId = req.user!.id;

    if (!orderId || !reason) {
      return res.status(400).json({ error: 'Order ID and return reason are required.' });
    }

    const order = db.findOrderByIdOrNumber(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Returns can only be requested for delivered orders.' });
    }

    const firstItem = order.items[0];
    const newReturn: ReturnRequest = {
      id: `ret-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderItemId: firstItem ? firstItem.id : `oi-${order.id}`,
      productTitle: firstItem ? firstItem.productTitle : 'Order Items',
      userId,
      userName: req.user!.name || order.customerName || 'Customer',
      reason,
      description: description || '',
      imageUrl: images && images.length > 0 ? images[0] : undefined,
      status: 'REQUESTED',
      refundAmount: order.totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createReturnRequest(newReturn);

    // Transition state machine
    await OrderStateMachine.transition(order.id, 'RETURN_REQUESTED', `Return requested: ${reason}`, 'CUSTOMER');

    res.status(201).json({
      success: true,
      returnRequest: newReturn,
      message: 'Return request submitted. Our support team will review within 24 hours.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit return request.' });
  }
});

// GET /api/returns - Customer returns list
router.get('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const returns = db.getReturnRequests(req.user!.id);
    res.json({ returns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
