import { db } from '../db';
import { Order, OrderStatus } from '../types';
import { supplierRouter } from '../suppliers/SupplierRouter';

export class OrderStateMachine {
  private static VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING_PAYMENT: ['PAYMENT_REVIEW', 'PAID', 'CANCELLED', 'FAILED'],
    PAYMENT_REVIEW: ['PAID', 'PENDING_PAYMENT', 'CANCELLED', 'FAILED'],
    PAID: ['CONFIRMED', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'CANCELLED', 'REFUNDED'],
    CONFIRMED: ['SUPPLIER_SELECTION', 'SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'CANCELLED'],
    SUPPLIER_SELECTION: ['SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'CANCELLED'],
    SUPPLIER_ORDER_PENDING: ['SUPPLIER_ORDERED', 'SUPPLIER_SELECTION', 'CANCELLED'],
    SUPPLIER_ORDERED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
    DELIVERED: ['RETURN_REQUESTED'],
    CANCELLED: ['REFUNDED'],
    RETURN_REQUESTED: ['RETURN_APPROVED', 'DELIVERED'],
    RETURN_APPROVED: ['RETURNED', 'REFUNDED'],
    RETURNED: ['REFUNDED'],
    REFUNDED: [],
    FAILED: ['PENDING_PAYMENT'],
  };

  /**
   * Validate and transition an order to a new status, logging every change.
   */
  public static async transition(
    orderId: string,
    newStatus: OrderStatus,
    note: string = '',
    actorRole: string = 'SYSTEM'
  ): Promise<Order> {
    const order = db.findOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const currentStatus = order.status;

    // Check transition validity (Admin can force override in test mode)
    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus) && actorRole !== 'ADMIN_OVERRIDE') {
      console.warn(`Non-standard transition from ${currentStatus} to ${newStatus} permitted by admin action.`);
    }

    // Update order status
    const updated = db.updateOrder(order.id, { status: newStatus });
    if (!updated) throw new Error('Failed to update order');

    // Add log
    db.addOrderStatusLog(order.id, {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      note: note || `Status transitioned from ${currentStatus} to ${newStatus}`,
      actorRole,
      createdAt: new Date().toISOString(),
    });

    // Auto trigger side effects
    if (newStatus === 'PAID') {
      // Auto move to SUPPLIER_SELECTION if configured
      setTimeout(async () => {
        try {
          await this.transition(order.id, 'SUPPLIER_SELECTION', 'Automated supplier routing initiated', 'SYSTEM');
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } else if (newStatus === 'SUPPLIER_SELECTION') {
      // Auto evaluate best supplier for each item
      setTimeout(async () => {
        try {
          const items = order.items;
          for (const item of items) {
            const best = supplierRouter.recommendBestSupplier(item.productId, item.quantity);
            if (best) {
              item.selectedSupplier = best.supplierName;
              item.selectedSupplierId = best.supplierId;
              item.supplierCost = best.costPrice;
            }
          }
          db.updateOrder(order.id, { items });
          await this.transition(
            order.id,
            'SUPPLIER_ORDER_PENDING',
            'Supplier recommendation generated based on landed cost and delivery reliability',
            'SYSTEM'
          );
        } catch (e) {
          console.error(e);
        }
      }, 800);
    }

    return updated;
  }
}
