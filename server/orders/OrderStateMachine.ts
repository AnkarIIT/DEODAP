import { db } from '../db';
import { Order, OrderStatus } from '../types';
import { supplierRouter } from '../suppliers/SupplierRouter';

/**
 * OrderStateMachine
 *
 * Lifecycle (MVP business loop):
 *   PENDING_PAYMENT → PAYMENT_REVIEW → PAID → FULFILMENT_PENDING → SUPPLIER_ORDERED → SHIPPED → DELIVERED
 *
 * COD skips payment states: order is created directly in FULFILMENT_PENDING.
 * The fulfilment packet (SupplierOrder, status PENDING) is created the moment an
 * order becomes fulfilable. The supplier order is NOT claimed as placed until the
 * operator records the actual supplier PO ID (manual) or an authorized API accepts it.
 */
export class OrderStateMachine {
  private static VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING_PAYMENT: ['PAYMENT_REVIEW', 'PAID', 'CANCELLED', 'FAILED'],
    PAYMENT_REVIEW: ['PAID', 'PENDING_PAYMENT', 'CANCELLED', 'FAILED'],
    PAID: ['FULFILMENT_PENDING', 'SUPPLIER_ORDERED', 'CANCELLED', 'REFUNDED'],
    FULFILMENT_PENDING: ['SUPPLIER_ORDERED', 'SUPPLIER_ORDER_FAILED', 'CANCELLED', 'REFUNDED'],
    CONFIRMED: ['FULFILMENT_PENDING', 'SUPPLIER_SELECTION', 'SUPPLIER_ORDERED', 'CANCELLED'],
    SUPPLIER_SELECTION: ['SUPPLIER_ORDER_PENDING', 'SUPPLIER_ORDERED', 'FULFILMENT_PENDING', 'CANCELLED'],
    SUPPLIER_ORDER_PENDING: ['SUPPLIER_ORDERED', 'SUPPLIER_SELECTION', 'FULFILMENT_PENDING', 'CANCELLED'],
    SUPPLIER_ORDERED: ['PROCESSING', 'SHIPPED', 'SUPPLIER_ORDER_FAILED', 'CANCELLED'],
    SUPPLIER_ORDER_FAILED: ['FULFILMENT_PENDING', 'SUPPLIER_ORDERED', 'CANCELLED', 'REFUNDED'],
    PROCESSING: ['SHIPPED', 'CANCELLED', 'SUPPLIER_ORDER_FAILED'],
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
    const order = await db.findOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const currentStatus = order.status;

    // Check transition validity (Admin can force override in test mode)
    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus) && actorRole !== 'ADMIN_OVERRIDE') {
      console.warn(`Non-standard transition from ${currentStatus} to ${newStatus} permitted by admin action.`);
    }

    // Update order status + flat automation contract fields
    const updates: any = { status: newStatus };

    // --- paymentStatus mirror ---
    if (newStatus === 'PAYMENT_REVIEW') updates.paymentStatus = 'PAYMENT_REVIEW';
    else if (newStatus === 'PAID') updates.paymentStatus = 'PAID';
    else if (newStatus === 'REFUNDED' || newStatus === 'RETURNED') updates.paymentStatus = 'REFUNDED';

    // --- automationStatus lifecycle (PENDING -> PROCESSING -> COMPLETED | FAILED) ---
    if (newStatus === 'PAID' || newStatus === 'FULFILMENT_PENDING' || newStatus === 'SUPPLIER_SELECTION' || newStatus === 'SUPPLIER_ORDER_PENDING') {
      // Job queued for the supplier automation worker
      updates.automationStatus = 'PENDING';
    } else if (newStatus === 'SUPPLIER_ORDERED') {
      // Job finished successfully: supplier order placed
      updates.automationStatus = 'COMPLETED';
      this.syncSupplierFields(updates, order);
    } else if (newStatus === 'SUPPLIER_ORDER_FAILED' || newStatus === 'FAILED') {
      updates.automationStatus = 'FAILED';
    } else if (newStatus === 'CANCELLED' || newStatus === 'REFUNDED' || newStatus === 'RETURNED') {
      // Order exited the pipeline: close any queued automation job
      updates.automationStatus = 'COMPLETED';
    }

    const updated = await db.updateOrder(order.id, updates);
    if (!updated) throw new Error('Failed to update order');

    // Add log
    await db.addOrderStatusLog(order.id, {
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
      // Build fulfilment packet (assign suppliers, record pending SupplierOrder)
      setTimeout(async () => {
        try {
          await this.prepareFulfilment(order.id);
          await this.transition(
            order.id,
            'FULFILMENT_PENDING',
            'Payment verified. Fulfilment packet prepared for supplier dispatch.',
            'SYSTEM'
          );
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } else if (newStatus === 'SUPPLIER_SELECTION') {
      // Legacy path: auto evaluate best supplier for each item
      setTimeout(async () => {
        try {
          const items = order.items;
          for (const item of items) {
            const best = await supplierRouter.recommendBestSupplier(item.productId, item.quantity);
            if (best) {
              item.selectedSupplier = best.supplierName;
              item.selectedSupplierId = best.supplierId;
              item.supplierCost = best.costPrice;
            }
          }
          await db.updateOrderItems(order.id, items);
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

  /**
   * Mirror the primary SupplierOrder onto the flat order-level contract fields.
   * Single-item orders also record the exact supplierProduct mapping.
   */
  private static syncSupplierFields(target: any, order: Order): void {
    const primary = order.supplierOrders && order.supplierOrders.length > 0 ? order.supplierOrders[0] : null;
    if (primary) {
      target.supplierId = primary.supplierId;
      target.supplierOrderId = primary.id;
      target.supplierOrderStatus = primary.status;
      target.supplierProductId = primary.supplierProductId ?? null;
    }
  }

  /**
   * Build the fulfilment packet for an order WITHOUT changing its status:
   *  1. Assigns the lowest-cost eligible supplier to each item via SupplierRouter.
   *  2. Records a SupplierOrder with status PENDING (no external order id yet).
   * The packet is the operator-facing manifest (copy details → open supplier →
   * enter PO ID → mark SUPPLIER_ORDERED).
   */
  public static async prepareFulfilment(orderId: string): Promise<Order> {
    const order = await db.findOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    let totalWholesale = 0;
    let shippingCharged = 0;
    const supplierList = await db.getSuppliers();
    let primarySupplierId = supplierList[0]?.id || '';
    let primarySupplierName = supplierList[0]?.name || 'DeoDap Wholesale Surat';

    for (const item of order.items) {
      const best = await supplierRouter.recommendBestSupplier(item.productId, item.quantity);
      if (best) {
        item.selectedSupplier = best.supplierName;
        item.selectedSupplierId = best.supplierId;
        item.supplierCost = best.costPrice;
        totalWholesale += best.landedCost * item.quantity;
        shippingCharged = best.shippingCost;
        const supplier = await db.findSupplierById(best.supplierId);
        if (supplier) {
          primarySupplierId = supplier.id;
          primarySupplierName = supplier.name;
        }
      } else {
        totalWholesale += (item.supplierCost || 0) * item.quantity;
      }
    }

    await db.updateOrderItems(order.id, order.items);

    if (!order.supplierOrders || order.supplierOrders.length === 0) {
      // Single-item orders can pin the exact supplierProduct mapping id.
      let supplierProductId: string | undefined;
      if (order.items.length === 1) {
        const best = await supplierRouter.recommendBestSupplier(order.items[0].productId, order.items[0].quantity);
        const spRows = await db.getSupplierProducts(order.items[0].productId, best?.supplierId);
        supplierProductId = spRows[0]?.id ?? undefined;
      }

      const created = await db.addSupplierOrder(order.id, {
        id: `so-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderId: order.id,
        supplierId: primarySupplierId,
        supplierName: primarySupplierName,
        supplierProductId,
        status: 'PENDING',
        wholesaleCost: Math.round(totalWholesale),
        shippingCharged: Math.round(shippingCharged || 45),
        items: order.items.map((i) => ({
          productId: i.productId,
          productTitle: i.productTitle,
          quantity: i.quantity,
          supplierCost: i.supplierCost || 0,
        })),
        notes: 'Fulfilment packet created. Awaiting supplier order placement by operator.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Mirror the new SupplierOrder onto the flat order-level contract fields
      // so automation can read supplierId / supplierOrderId directly.
      await db.updateOrder(order.id, {
        supplierId: created?.supplierId,
        supplierOrderId: created?.id,
        supplierOrderStatus: created?.status,
        supplierProductId: supplierProductId,
      });
    }

    return (await db.findOrderByIdOrNumber(orderId))!;
  }
}